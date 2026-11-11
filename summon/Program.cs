using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using summon.Data;
using summon.Components;
using summon.Riot;
using summon.Accounts;


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
});

builder.Services.AddScoped<AccountService>();
builder.Services.AddScoped<RankedService>();

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

app.UseAntiforgery();

app.MapStaticAssets();
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
