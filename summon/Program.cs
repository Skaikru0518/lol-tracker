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
builder.Services.AddHttpClient<MatchPageService>();
builder.Services.AddHostedService<AchievementJob>();

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
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
