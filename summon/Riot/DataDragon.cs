using System.Net.Http.Json;
using Microsoft.Extensions.Caching.Memory;

namespace summon.Riot;

public record SummonerSpellInfo(string Image, string Name);

public record DataDragonData(
    string Version,
    IReadOnlyDictionary<int, SummonerSpellInfo> Spells,
    IReadOnlyDictionary<int, string> ChampionIds,
    IReadOnlyDictionary<int, string> RuneIcons,
    IReadOnlyDictionary<string, string> ChampionNames,
    IReadOnlyDictionary<int, string> ItemNames)
{
    // Match data spells some champions differently from Data Dragon's file names
    private static readonly Dictionary<string, string> NameFixes = new() { ["FiddleSticks"] = "Fiddlesticks" };

    private static string FileName(string championName) => NameFixes.GetValueOrDefault(championName, championName);

    public string ChampionIcon(string championName) => $"{DataDragon.Cdn}/{Version}/img/champion/{FileName(championName)}.png";

    public static string ChampionSplash(string championName) => $"{DataDragon.Cdn}/img/champion/splash/{FileName(championName)}_0.jpg";

    /// <summary>Display name for a match or Data Dragon champion name, e.g. MonkeyKing to Wukong.</summary>
    public string ChampionName(string championName) => ChampionNames.GetValueOrDefault(FileName(championName), championName);

    public string ProfileIcon(int iconId) => $"{DataDragon.Cdn}/{Version}/img/profileicon/{iconId}.png";

    public string? ItemIcon(int itemId) => itemId == 0 ? null : $"{DataDragon.Cdn}/{Version}/img/item/{itemId}.png";

    public string? SpellIcon(int spellId) =>
        Spells.TryGetValue(spellId, out var spell) ? $"{DataDragon.Cdn}/{Version}/img/spell/{spell.Image}" : null;

    public string? SpellName(int spellId) => Spells.GetValueOrDefault(spellId)?.Name;

    /// <summary>Icon of a rune or a rune tree; both share one id space.</summary>
    public string? RuneIcon(int id) => RuneIcons.TryGetValue(id, out var icon) ? $"{DataDragon.Cdn}/img/{icon}" : null;
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
            var spells = summoner!.Data.Values.ToDictionary(spell => int.Parse(spell.Key), spell => new SummonerSpellInfo(spell.Image.Full, spell.Name));

            var champion = await http.GetFromJsonAsync<ChampionFile>($"{Cdn}/{version}/data/en_US/champion.json", ct);
            var championIds = champion!.Data.Values.ToDictionary(c => int.Parse(c.Key), c => c.Id);
            var championNames = champion.Data.Values.ToDictionary(c => c.Id, c => c.Name);

            var item = await http.GetFromJsonAsync<ItemFile>($"{Cdn}/{version}/data/en_US/item.json", ct);
            var itemNames = item!.Data.ToDictionary(i => int.Parse(i.Key), i => i.Value.Name);

            var trees = await http.GetFromJsonAsync<List<RuneTree>>($"{Cdn}/{version}/data/en_US/runesReforged.json", ct);
            var runeIcons = trees!
                .Select(tree => (tree.Id, tree.Icon))
                .Concat(trees!.SelectMany(tree => tree.Slots).SelectMany(slot => slot.Runes).Select(rune => (rune.Id, rune.Icon)))
                .ToDictionary(r => r.Id, r => r.Icon);

            return new DataDragonData(version, spells, championIds, runeIcons, championNames, itemNames);
        }))!;

    private record SummonerFile(Dictionary<string, SummonerSpell> Data);

    private record SummonerSpell(string Key, string Name, SpellImage Image);

    private record SpellImage(string Full);

    private record ChampionFile(Dictionary<string, ChampionEntry> Data);

    private record ChampionEntry(string Id, string Key, string Name);

    private record ItemFile(Dictionary<string, ItemEntry> Data);

    private record ItemEntry(string Name);

    private record RuneTree(int Id, string Icon, List<RuneSlot> Slots);

    private record RuneSlot(List<RuneEntry> Runes);

    private record RuneEntry(int Id, string Icon);
}