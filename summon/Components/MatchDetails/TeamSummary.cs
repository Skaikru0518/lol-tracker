using summon.Riot;

namespace summon.Components.MatchDetails;

public record TeamSummary(bool Win, int Kills, int Deaths, int Assists, int Towers, int Dragons, int Barons, int Heralds, int Grubs)
{
    private static readonly string[] PositionOrder = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

    /// <summary>A team's players with lane opponents in the same order: top, jungle, mid, bot, support, then unknown positions.</summary>
    public static List<RiotParticipant> Players(RiotMatch match, int teamId) =>
        match.Info.Participants
            .Where(p => p.TeamId == teamId)
            .OrderBy(p => Array.IndexOf(PositionOrder, p.TeamPosition) is var i and >= 0 ? i : PositionOrder.Length)
            .ToList();

    public static TeamSummary Of(RiotMatch match, int teamId, List<RiotParticipant> players)
    {
        var team = match.Info.Teams?.FirstOrDefault(t => t.TeamId == teamId);
        int Objective(string key) => team?.Objectives?.GetValueOrDefault(key)?.Kills ?? 0;

        return new TeamSummary(
            team?.Win ?? players.FirstOrDefault()?.Win ?? false,
            players.Sum(p => p.Kills),
            players.Sum(p => p.Deaths),
            players.Sum(p => p.Assists),
            Objective("tower"),
            Objective("dragon"),
            Objective("baron"),
            Objective("riftHerald"),
            Objective("horde"));
    }
}
