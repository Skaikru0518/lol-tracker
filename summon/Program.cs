using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using summon;
using summon.Data;
using summon.Components;
using summon.Riot;
using summon.Accounts;
using summon.Scoring;
using summon.Achievements;
using summon.Live;
using summon.Home;
using summon.Widget;
using summon.MatchPage;
using summon.Security;
using summon.Jobs;
using summon.Overlay;


var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

// Db Context
builder.Services.AddDbContext<SummonDbContext>(options => options.UseNpgsql(builder.Configuration.GetConnectionString("Summon")));

// Riot
builder.Services.AddOptions<RiotOptions>().BindConfiguration(RiotOptions.Section).Validate(o => !string.IsNullOrWhiteSpace(o.ApiKey), "Riot:ApiKey is missing").ValidateOnStart();
builder.Services.AddHttpClient<RiotClient>((services, http) =>
{
    var riot = services.GetRequiredService<IOptions<RiotOptions>>().Value;
    http.DefaultRequestHeaders.Add("X-Riot-Token", riot.ApiKey);
}).AddHttpMessageHandler<RiotRateLimitHandler>();
builder.Services.AddSingleton<RiotRateLimiter>();
builder.Services.AddTransient<RiotRateLimitHandler>();

// Data Dragon is a public CDN, so it gets its own client without the Riot key
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<DataDragon>();

builder.Services.AddScoped<AccountService>();
builder.Services.AddScoped<RankedService>();
builder.Services.AddScoped<MatchService>();
builder.Services.AddScoped<PerformanceService>();
builder.Services.AddScoped<AchievementService>();
builder.Services.AddScoped<LiveGameService>();
builder.Services.AddHttpClient<HomeService>();
builder.Services.AddScoped<WidgetDataService>();
builder.Services.AddScoped<OverlayService>();
builder.Services.AddHttpClient<MatchPageService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IpRateLimiter>();
// Per request, or per circuit for interactive parts: read from the request that opened it
builder.Services.AddScoped<ClientIp>();
builder.Services.AddHostedService<AchievementJob>();
builder.Services.AddHostedService<RankedJob>();
builder.Services.AddHostedService<BaselineJob>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}
app.UseStatusCodePagesWithReExecute("/not-found", createScopeForStatusCodePages: true);
app.UseHttpsRedirection();

// Blazor routes cannot tell an old champion link from a tab, so these redirect before routing (308, like Next's permanentRedirect)
app.Use(async (context, next) =>
{
    if (LegacyRedirects.ChampionPath(context.Request.Path.Value ?? "") is { } target)
    {
        context.Response.Redirect(target, permanent: true, preserveMethod: true);
        return;
    }
    await next();
});

app.UseAntiforgery();

app.MapStaticAssets();
app.MapGet("/robots.txt", (IConfiguration configuration) => Results.Text(SiteInfo.Robots(SiteInfo.Url(configuration)), "text/plain"));
app.MapGet("/sitemap.xml", (IConfiguration configuration) => Results.Text(SiteInfo.Sitemap(SiteInfo.Url(configuration), DateTime.UtcNow), "application/xml"));
// The original's JSON endpoint for the in-game OBS overlay
app.MapGet("/api/overlay/game", async (string? gameName, string? tagLine, string? platform, string? since,
    OverlayService overlay, IpRateLimiter limiter, ClientIp client, ILogger<OverlayService> logger, CancellationToken ct) =>
{
    if (limiter.Limited("overlay", client)) return Results.Json(new { error = "Too many requests" }, statusCode: 429);
    var server = Platforms.All.FirstOrDefault(p => p.Key == platform);
    if (string.IsNullOrEmpty(gameName) || string.IsNullOrEmpty(tagLine) || server is null || !long.TryParse(since, out var sinceMs) || sinceMs < 0)
        return Results.Json(new { error = "gameName, tagLine, platform and since are required" }, statusCode: 400);
    try
    {
        return await overlay.BuildAsync(gameName, tagLine, server, sinceMs, ct) is { } game ? Results.Json(game) : Results.Json(new { inGame = false });
    }
    catch (HttpRequestException e) when (e.StatusCode is { } status)
    {
        return Results.Json(new { error = e.Message }, statusCode: (int)status);
    }
    catch (Exception e) when (e is not OperationCanceledException)
    {
        logger.LogError(e, "Overlay game failed");
        return Results.Json(new { error = "Internal server error" }, statusCode: 500);
    }
});
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
