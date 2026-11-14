using summon.Data;
using summon.Riot;

namespace summon.Live;

public enum LiveView { Loading, Error, Idle, Live }

public record LivePair(RiotLiveParticipant? Blue, RiotLiveParticipant? Red);

public record RankSummary(string Tier, string Rank, int LeaguePoints, int WinRate, int Games);

public static class LiveGames
{
    /// <summary>Blue and red players paired by spectator order; modes with other team ids (Arena) are split into two halves by order.</summary>
    public static (List<LivePair> Rows, List<RiotLiveParticipant> Blue, List<RiotLiveParticipant> Red) SplitTeams(IReadOnlyList<RiotLiveParticipant> participants)
    {
        var twoTeams = participants.All(p => p.TeamId is 100 or 200);
        var half = (participants.Count + 1) / 2;
        var blue = twoTeams ? participants.Where(p => p.TeamId == 100).ToList() : participants.Take(half).ToList();
        var red = twoTeams ? participants.Where(p => p.TeamId == 200).ToList() : participants.Skip(half).ToList();
        var rows = Enumerable.Range(0, Math.Max(blue.Count, red.Count))
            .Select(i => new LivePair(blue.ElementAtOrDefault(i), red.ElementAtOrDefault(i)))
            .ToList();
        return (rows, blue, red);
    }

    /// <summary>The player's rank in the game's queue (solo for queues without their own) with season WR and games; null when unranked.</summary>
    public static RankSummary? PlayerRankSummary(IReadOnlyList<RankedEntry>? entries, int queueId)
    {
        var queueType = Ranks.QueueForQueueId(queueId) ?? "RANKED_SOLO_5x5";
        if (entries?.FirstOrDefault(e => e.QueueType == queueType) is not { } e) return null;
        var games = e.Wins + e.Losses;
        // Math.round from JavaScript, as in the original
        var winRate = games > 0 ? (int)Math.Floor(e.Wins * 100.0 / games + 0.5) : 0;
        return new RankSummary(e.Tier, e.Rank, e.LeaguePoints, winRate, games);
    }

    /// <summary>Average rank of one team in the game's queue; null when none of its players are ranked.</summary>
    public static (string Tier, string Rank)? TeamAvgRank(IEnumerable<RiotLiveParticipant> team, IReadOnlyDictionary<string, List<RankedEntry>>? ranks, int queueId)
    {
        if (ranks is null) return null;
        var own = team.Where(p => ranks.ContainsKey(p.Puuid)).ToDictionary(p => p.Puuid, p => ranks[p.Puuid]);
        return Ranks.Average(own, queueId);
    }

    private static readonly Dictionary<int, string> Maps = new() { [11] = "Summoner's Rift", [12] = "Howling Abyss", [30] = "Rings of Wrath" };

    public static string MapName(int? mapId) => mapId is { } id && Maps.TryGetValue(id, out var name) ? name : "Custom map";

    /// <summary>Seconds since a live game started; uses Riot's gameLength until the start time is known.</summary>
    public static int ElapsedSeconds(long gameStartTime, long gameLength, long nowMs) =>
        gameStartTime > 0 ? (int)Math.Max(0, (nowMs - gameStartTime) / 1000) : (int)Math.Max(0, gameLength);

    /// <summary>What the live page shows; the last known game wins over a failed background refetch.</summary>
    public static LiveView View(RiotLiveGame? game, bool loaded, bool failed) =>
        game is not null ? LiveView.Live
        : !loaded && !failed ? LiveView.Loading
        : failed && !loaded ? LiveView.Error
        : LiveView.Idle;

    /// <summary>Profile slug of a spectator Riot ID ("Name#TAG").</summary>
    public static string Slug(string riotId)
    {
        var separator = riotId.LastIndexOf('#');
        return separator > 0 ? Components.Ui.Format.SummonerSlug(riotId[..separator], riotId[(separator + 1)..]) : Uri.EscapeDataString(riotId);
    }
}
