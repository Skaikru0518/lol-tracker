using System.Net.Http.Json;
using Microsoft.Extensions.Caching.Memory;

namespace summon.Riot;

public record DataDragonData(string Version, IReadOnlyDictionary<int, string> SpellImages)
{
    private static readonly Dictionary<string, string> NameFixes = new() { ["FiddleSticks"] = "Fiddlesticks" };
    private static string FileName(string championName) => NameFixes.GetValueOrDefault(championName, championName);
    public string ChampionIcon(string championName) => $"{DataDragon.Cdn}/{Version}/img/champion/{championName}.png";
    public string ChampionSplash(string championName) => $"{DataDragon.Cdn}/{Version}/img/champion/splash/{FileName}_0.jpg";
    public string ItemIcon(int itemId) => $"{DataDragon.Cdn}/{Version}/img/item/{itemId}.png";
    public string? SpellIcon(int spellId) =>
        SpellImages.TryGetValue(spellId, out var image) ? $"{DataDragon.Cdn}/{Version}/img/spell/{image}" : null;
}

public class DataDragon(HttpClient http, IMemoryCache cache)
{
    public const string Cdn = "https://ddragon.leagueoflegends.com/cdn";

    public async Task<DataDragonData> GetAsync(CancellationToken ct = default) =>
        (await cache.GetOrCreateAsync("data-dragon", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(6);
            var versions = await http.GetFromJsonAsync<List<string>>("https://ddragon.leagueoflegends.com/api/versions.json", ct);
            var version = versions![0];
            var summoner = await http.GetFromJsonAsync<SummonerFile>($"{Cdn}/{version}/data/en_US/summoner.json", ct);
            var spells = summoner!.Data.Values.ToDictionary(spell => int.Parse(spell.Key), spell => spell.Image.Full);
            return new DataDragonData(version, spells);
        }))!;

    private record SummonerFile(Dictionary<string, SummonerSpell> Data);

    private record SummonerSpell(string Key, SpellImage Image);

    private record SpellImage(string Full);
}
