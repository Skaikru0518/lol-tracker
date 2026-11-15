using summon.Data;
using summon.Riot;

namespace summon.Overlay;

public record OverlayRank(string QueueType, string Tier, string Division, int LeaguePoints, int Wins, int Losses);

public record OverlayToday(int Wins, int Losses, bool Partial);

/// <summary>Pure pieces of the original's overlay cards (lib/overlay/cards.ts).</summary>
public static class OverlayCards
{
    private const int FlexQueueId = 440;
    private const int RoleMinGames = 3;
    private const double RoleMinShare = 0.4;
    public static readonly string[] Roles = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
    private static readonly Dictionary<string, string> Tags = new() { ["win-streak"] = "on-fire", ["one-trick"] = "one-trick" };

    public static (string GameName, string TagLine) SplitRiotId(string riotId)
    {
        var separator = riotId.LastIndexOf('#');
        return separator == -1 ? (riotId, "") : (riotId[..separator], riotId[(separator + 1)..]);
    }

    public static OverlayRank? Rank(IEnumerable<RankedEntry> entries, int queueId)
    {
        var queueType = queueId == FlexQueueId ? "RANKED_FLEX_SR" : "RANKED_SOLO_5x5";
        var entry = entries.FirstOrDefault(e => e.QueueType == queueType);
        return entry is null ? null : new OverlayRank(queueType, entry.Tier, entry.Rank, entry.LeaguePoints, entry.Wins, entry.Losses);
    }

    public static (int Wins, int Losses) TodayRecord(IEnumerable<RiotMatch> matches, string puuid, long sinceMs, int queueId)
    {
        var wins = 0;
        var losses = 0;
        foreach (var info in matches.Select(m => m.Info))
        {
            if (info.QueueId != queueId || info.GameCreation < sinceMs || Queues.IsRemake(info.GameDuration)) continue;
            var participant = info.Participants.FirstOrDefault(p => p.Puuid == puuid);
            if (participant is null) continue;
            if (participant.Win) wins++;
            else losses++;
        }
        return (wins, losses);
    }

    // Teammates share today's games, so ids are de-duplicated before the cap is spent round-robin
    public static (List<string> Fetch, List<bool> Partial) AllocateMatchFetches(IReadOnlyList<IReadOnlyList<string>> missing, int cap)
    {
        var chosen = new List<string>();
        var longest = missing.Select(ids => ids.Count).DefaultIfEmpty(0).Max();
        for (var round = 0; round < longest && chosen.Count < cap; round++)
        {
            foreach (var ids in missing)
            {
                if (chosen.Count >= cap) break;
                if (round < ids.Count && !chosen.Contains(ids[round])) chosen.Add(ids[round]);
            }
        }
        return (chosen, missing.Select(ids => ids.Any(id => !chosen.Contains(id))).ToList());
    }

    public static List<string> OverlayTags(IEnumerable<string> achievementIds) =>
        achievementIds.Where(Tags.ContainsKey).Select(id => Tags[id]).ToList();

    public static string? MainRole(IEnumerable<(string Position, int Games)> counts)
    {
        var known = counts.Where(c => Roles.Contains(c.Position)).ToList();
        if (known.Count == 0) return null;
        var total = known.Sum(c => c.Games);
        // The first of equally played roles wins, like the original's reduce
        var top = known.Aggregate((best, c) => c.Games > best.Games ? c : best);
        return top.Games < RoleMinGames || (double)top.Games / total < RoleMinShare ? null : top.Position;
    }
}
