using summon.Riot;

namespace summon.Achievements;

public record MatchBadgeDef(string Id, string Name, string Description, string Color);

public record BadgeAssignment(string Puuid, string BadgeId);

public static class MatchBadges
{
    public static readonly MatchBadgeDef[] All =
    [
        new("mvp", "MVP", "Most kills + assists on the winning team (5+)", "#f1c40f"),
        new("damage-king", "Damage King", "Most damage dealt to champions in the match", "#e67e22"),
        new("tank-god", "Tank God", "Most damage taken in the match", "#7f8c8d"),
        new("vision-king", "Vision King", "Highest vision score in the match", "#3498db"),
        new("cs-king", "CS King", "Most CS in the match", "#2ecc71"),
        new("first-blood", "First Blood", "Got the first kill of the match", "#c0392b"),
        new("pentakill", "Pentakill", "Got a pentakill", "#e74c3c"),
        new("unkillable", "Unkillable", "0 deaths with 3+ kills or assists", "#f1c40f"),
        new("gold-lead", "Gold Lead", "Most gold earned in the match", "#f39c12"),
        new("cc-machine", "CC Machine", "Most crowd control time in the match", "#9b59b6"),
        new("quadrakill", "Quadrakill", "Got a quadrakill", "#e67e22"),
        new("solo-carry", "Solo Carry", "Most kills (5+) and fewest deaths on the team", "#f1c40f"),
        new("healer", "Healer", "Most healing on teammates (10k+)", "#2ecc71"),
        new("tower-destroyer", "Tower Destroyer", "Most turret kills in the match (2+)", "#e74c3c"),
        new("bad-luck", "Bad Luck", "Most kills + assists on the losing team while dying the least (5+ kills)", "#8e44ad"),
        new("powerspike", "Powerspike", "Yasuo with 10+ deaths — the 0/10 powerspike is real", "#e74c3c"),
        new("honorable", "Honorable", "Most kills + assists on the losing team (5+)", "#3498db"),
        new("soulless", "Soulless", "Picked Teemo — you monster", "#95a5a6"),
        new("glass-cannon", "Glass Cannon", "Most damage dealt and most deaths (5+) in the match", "#e74c3c"),
        new("afk-farmer", "AFK Farmer", "200+ CS but 0 kills and 0 assists", "#27ae60"),
    ];

    public static MatchBadgeDef? Get(string id) => All.FirstOrDefault(b => b.Id == id);

    private const int Yasuo = 157;
    private const int Teemo = 17;

    /// <summary>The one player with the highest value of at least min (above zero by default); null on a tie or when nobody reaches it.</summary>
    private static RiotParticipant? SoleLeader(List<RiotParticipant> players, Func<RiotParticipant, int> value, double min = double.Epsilon)
    {
        if (players.Count == 0) return null;
        var best = players.Max(value);
        var leaders = players.Where(p => value(p) == best).ToList();
        return leaders.Count == 1 && best >= min ? leaders[0] : null;
    }

    private static int KillsAndAssists(RiotParticipant p) => p.Kills + p.Assists;
    private static int Cs(RiotParticipant p) => p.TotalMinionsKilled + p.NeutralMinionsKilled;

    /// <summary>Badges for every player of a ranked game; other queues and remakes get none.</summary>
    public static List<BadgeAssignment> Detect(RiotMatchInfo info)
    {
        var participants = info.Participants;
        var badges = new List<BadgeAssignment>();
        if (participants.Count == 0 || !Eligibility.IsEligible(info.QueueId, info.GameDuration)) return badges;

        void Award(RiotParticipant? player, string badgeId)
        {
            if (player is not null) badges.Add(new BadgeAssignment(player.Puuid, badgeId));
        }
        var winners = participants.Where(p => p.Win).ToList();
        var losers = participants.Where(p => !p.Win).ToList();

        // --- Best in the match ---
        Award(SoleLeader(winners, KillsAndAssists, 5), "mvp");
        Award(SoleLeader(participants, p => p.TotalDamageDealtToChampions), "damage-king");
        Award(SoleLeader(participants, p => p.TotalDamageTaken), "tank-god");
        Award(SoleLeader(participants, p => p.VisionScore), "vision-king");
        Award(SoleLeader(participants, Cs), "cs-king");
        Award(SoleLeader(participants, p => p.GoldEarned), "gold-lead");
        Award(SoleLeader(participants, p => p.TimeCCingOthers), "cc-machine");
        Award(SoleLeader(participants, p => p.TotalHealsOnTeammates, 10000), "healer");
        Award(SoleLeader(participants, p => p.TurretKills, 2), "tower-destroyer");

        var mostDamage = SoleLeader(participants, p => p.TotalDamageDealtToChampions);
        var mostDeaths = SoleLeader(participants, p => p.Deaths, 5);
        if (mostDamage is not null && ReferenceEquals(mostDamage, mostDeaths)) Award(mostDamage, "glass-cannon");

        // --- Per player ---
        foreach (var p in participants)
        {
            if (p.FirstBloodKill) Award(p, "first-blood");
            if (p.PentaKills > 0) Award(p, "pentakill");
            else if (p.QuadraKills > 0) Award(p, "quadrakill");
            if (p.Deaths == 0 && KillsAndAssists(p) >= 3) Award(p, "unkillable");
            if (p.ChampionId == Yasuo && p.Deaths >= 10) Award(p, "powerspike");
            if (p.ChampionId == Teemo) Award(p, "soulless");
            if (Cs(p) >= 200 && p.Kills == 0 && p.Assists == 0) Award(p, "afk-farmer");
        }

        // --- Within a team ---
        foreach (var teamId in new[] { 100, 200 })
        {
            var team = participants.Where(p => p.TeamId == teamId).ToList();
            var leader = SoleLeader(team, p => p.Kills, 5);
            if (leader is not null && leader.Deaths == team.Min(p => p.Deaths)) Award(leader, "solo-carry");
        }

        // The losing side's best K+A gets Bad Luck when they also died the least, Honorable otherwise
        var bestLoser = SoleLeader(losers, KillsAndAssists, 5);
        if (bestLoser is not null)
        {
            var diedLeast = bestLoser.Deaths == losers.Min(p => p.Deaths);
            Award(bestLoser, diedLeast && bestLoser.Kills >= 5 ? "bad-luck" : "honorable");
        }

        return badges;
    }

    private const int Slots = 3;

    /// <summary>Badges for a three-row column: all of them when they fit, else the first two plus the rest behind a +N chip.</summary>
    public static (List<string> Shown, List<string> Overflow) Column(IReadOnlyList<string> badgeIds) =>
        badgeIds.Count <= Slots ? (badgeIds.ToList(), []) : (badgeIds.Take(Slots - 1).ToList(), badgeIds.Skip(Slots - 1).ToList());
}
