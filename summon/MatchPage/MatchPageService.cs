using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using summon.Data;
using summon.Riot;

namespace summon.MatchPage;

public record PerkInfo(int Id, string Name, string ShortDesc, List<string> EndOfGameStatDescs);

/// <summary>What the match page needs beyond the match: the timeline, rune texts and champion ability icons.</summary>
public class MatchPageService(SummonDbContext db, RiotClient riot, HttpClient http, IMemoryCache cache)
{
    // Timelines are ~300 KB each and only opened for recent games; old ones are fetched again on demand
    private static readonly TimeSpan TimelineKeep = TimeSpan.FromDays(30);
    private const string PerksUrl = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perks.json";

    /// <summary>The match's timeline, stored after the first fetch; null when Riot has none for it.</summary>
    public async Task<RiotTimeline?> TimelineAsync(string matchId, CancellationToken ct = default)
    {
        var json = await db.MatchTimelines.Where(t => t.MatchId == matchId).Select(t => t.Data).FirstOrDefaultAsync(ct);
        if (json is null)
        {
            try
            {
                json = await riot.GetMatchTimelineJsonAsync(matchId, ct);
            }
            catch (HttpRequestException e) when (e.StatusCode == HttpStatusCode.NotFound)
            {
                return null;
            }
            db.MatchTimelines.Add(new MatchTimeline { MatchId = matchId, Data = json, UpdatedAt = DateTime.UtcNow });
            await db.SaveChangesAsync(ct);
            var cutoff = DateTime.UtcNow - TimelineKeep;
            await db.MatchTimelines.Where(t => t.UpdatedAt < cutoff).ExecuteDeleteAsync(ct);
        }
        return JsonSerializer.Deserialize<RiotTimeline>(json, JsonSerializerOptions.Web);
    }

    /// <summary>The page-only stats of each participant, in info.participants order, from the stored match document.</summary>
    public async Task<List<ParticipantDetail>> DetailsAsync(string matchId, CancellationToken ct = default)
    {
        var json = await db.Matches.Where(m => m.MatchId == matchId).Select(m => m.Data).FirstOrDefaultAsync(ct);
        return json is null ? [] : JsonSerializer.Deserialize<RiotMatchDetails>(json, JsonSerializerOptions.Web)?.Info.Participants ?? [];
    }

    private record RawPerk(int Id, string Name, string? ShortDesc, List<string>? EndOfGameStatDescs);

    /// <summary>Every rune and stat shard by id with its short description and end-of-game stat templates (CommunityDragon), kept for a day.</summary>
    public async Task<Dictionary<int, PerkInfo>> PerksAsync(CancellationToken ct = default) =>
        (await cache.GetOrCreateAsync("perks", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(1);
            var raw = await http.GetFromJsonAsync<List<RawPerk>>(PerksUrl, JsonSerializerOptions.Web, ct) ?? [];
            return raw.ToDictionary(p => p.Id, p => new PerkInfo(p.Id, p.Name, p.ShortDesc ?? "", p.EndOfGameStatDescs ?? []));
        }))!;

    private record ChampionFile(Dictionary<string, ChampionEntry> Data);
    private record ChampionEntry(List<ChampionSpell> Spells);
    private record ChampionSpell(SpellImage Image);
    private record SpellImage(string Full);

    /// <summary>Q, W, E and R icon URLs of one champion from Data Dragon; null when Data Dragon has no such file.</summary>
    public async Task<List<string>?> AbilityIconsAsync(DataDragonData dataDragon, string championName, CancellationToken ct = default) =>
        await cache.GetOrCreateAsync($"abilities:{dataDragon.Version}:{championName}", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(1);
            var id = dataDragon.ChampionIcon(championName).Split('/')[^1].Replace(".png", "");
            try
            {
                var file = await http.GetFromJsonAsync<ChampionFile>($"{DataDragon.Cdn}/{dataDragon.Version}/data/en_US/champion/{id}.json", JsonSerializerOptions.Web, ct);
                var champion = file?.Data.GetValueOrDefault(id) ?? file?.Data.Values.FirstOrDefault();
                return champion?.Spells.Select(s => $"{DataDragon.Cdn}/{dataDragon.Version}/img/spell/{s.Image.Full}").ToList();
            }
            catch (HttpRequestException)
            {
                // A static file: a champion Data Dragon does not know answers 403, so retrying never helps
                return null;
            }
        });
}
