using summon.Riot;

namespace summon.Achievements;

public record AchievementDef(string Id, string Name, string Description, string Icon, string Color, string Category);

/// <summary>Current form: rolling achievements judged on the last ranked games; they come and go.</summary>
public static class FormAchievements
{
    public static readonly AchievementDef[] All =
    [
        // Combat
        new("perfect-kda", "Untouchable", "A game with 0 deaths and 3+ kills and assists in your last 5 ranked matches", "perfect-kda", "#f1c40f", "combat"),
        new("kda-god", "KDA God", "Average KDA of 5+ over your last 10 ranked matches (5+ games)", "kda-god", "#9b59b6", "combat"),
        new("first-blood-hunter", "First Blood Hunter", "Got first blood in 5+ of your last 10 ranked matches", "first-blood-hunter", "#c0392b", "combat"),
        new("feeder", "Feeder", "Averaging 10+ deaths per game over your last 10 ranked matches (5+ games)", "feeder", "#95a5a6", "combat"),
        // Mastery
        new("cs-machine", "CS Machine", "Average 8+ CS/min over your 25+ minute games in the last 10 ranked matches (5+ games)", "cs-machine", "#2ecc71", "mastery"),
        new("vision-pro", "Vision Pro", "Average 60+ vision score over your last 10 ranked matches (5+ games)", "vision-pro", "#3498db", "mastery"),
        new("damage-dealer", "Damage Dealer", "Average 40k+ damage to champions over your last 10 ranked matches (5+ games)", "damage-dealer", "#e67e22", "mastery"),
        new("carry", "Carry", "Dealt 50%+ of your team's damage to champions in one of your last 10 ranked matches", "carry", "#f39c12", "mastery"),
        new("meatshield", "Meatshield", "Took 50k+ damage in a single game in your last 10 ranked matches", "tank", "#7f8c8d", "mastery"),
        new("objective-hunter", "Objective Hunter", "Average 1.5+ dragon and baron kills over your last 10 ranked matches (5+ games)", "objective-hunter", "#8e44ad", "mastery"),
        // Playstyle
        new("one-trick", "One Trick", "70%+ of your last 20 ranked matches on one champion (10+ games)", "one-trick", "#e91e63", "playstyle"),
        new("diverse-player", "Diverse Player", "5+ different champions in your last 10 ranked matches", "diverse-player", "#1abc9c", "playstyle"),
        new("win-streak", "On Fire", "Won all of your last 5 ranked matches", "win-streak", "#e74c3c", "playstyle"),
        new("lose-streak", "Tilted", "Lost all of your last 5 ranked matches", "lose-streak", "#3498db", "playstyle"),
        // Role
        new("top-main", "Top Main", "Most played role is Top (30%+ of your last 50 ranked matches)", "top-main", "#e67e22", "playstyle"),
        new("jungle-main", "Jungle Main", "Most played role is Jungle (30%+ of your last 50 ranked matches)", "jungle-main", "#27ae60", "playstyle"),
        new("mid-main", "Mid Main", "Most played role is Mid (30%+ of your last 50 ranked matches)", "mid-main", "#8e44ad", "playstyle"),
        new("adc-main", "ADC Main", "Most played role is ADC (30%+ of your last 50 ranked matches)", "adc-main", "#e74c3c", "playstyle"),
        new("support-main", "Support Main", "Most played role is Support (30%+ of your last 50 ranked matches)", "support-main", "#2ecc71", "playstyle"),
        // Queue Enjoyer
        new("soloq-enjoyer", "Solo/Duo Enjoyer", "13+ Solo/Duo games in your last 25 ranked matches", "soloq-enjoyer", "#f39c12", "playstyle"),
        new("flex-enjoyer", "Flex Enjoyer", "13+ Flex games in your last 25 ranked matches", "flex-enjoyer", "#3498db", "playstyle"),
        new("premade-enjoyer", "5s Enjoyer", "13+ Ranked 5s games in your last 25 ranked matches", "premade-enjoyer", "#9b59b6", "playstyle"),
    ];

    /// <summary>How many of the player's most recent ranked matches detection looks at.</summary>
    public const int MatchWindow = 50;

    private const int Window = 10;
    /// <summary>Fewest games an average-based achievement is judged on.</summary>
    private const int MinGames = 5;

    private static readonly Dictionary<string, string> RoleAchievements = new()
    {
        ["TOP"] = "top-main",
        ["JUNGLE"] = "jungle-main",
        ["MIDDLE"] = "mid-main",
        ["BOTTOM"] = "adc-main",
        ["UTILITY"] = "support-main",
    };

    /// <summary>Saved achievements that still exist in the definitions (renamed or removed ones are not counted).</summary>
    public static int EarnedCount(IEnumerable<string> savedIds) => savedIds.Where(id => All.Any(a => a.Id == id)).Distinct().Count();

    /// <summary>The Current form achievement ids a player has earned from their ranked games (newest first; remakes excluded).</summary>
    public static List<string> Detect(IReadOnlyList<RiotMatch> matches, string puuid)
    {
        var allMatches = matches.Where(m => Eligibility.IsEligible(m.Info.QueueId, m.Info.GameDuration)).ToList();
        var earned = new List<string>();

        var allRecent = allMatches
            .Select(m => (Match: m, Player: m.Info.Participants.FirstOrDefault(p => p.Puuid == puuid)))
            .Where(e => e.Player is not null)
            .Select(e => (e.Match, Player: e.Player!))
            .ToList();
        var recent = allRecent.Take(Window).ToList();
        var players = recent.Select(e => e.Player).ToList();
        if (players.Count == 0) return earned;

        // --- Combat ---
        if (players.Take(5).Any(p => p.Deaths == 0 && p.Kills + p.Assists >= 3)) earned.Add("perfect-kda");

        if (players.Count >= MinGames)
        {
            var kills = players.Sum(p => p.Kills);
            var deaths = players.Sum(p => p.Deaths);
            var assists = players.Sum(p => p.Assists);
            var kda = deaths == 0 ? kills + assists : (kills + assists) / (double)deaths;
            if (kda >= 5) earned.Add("kda-god");
        }

        if (players.Count(p => p.FirstBloodKill) >= 5) earned.Add("first-blood-hunter");

        if (players.Count >= MinGames && players.Average(p => p.Deaths) >= 10) earned.Add("feeder");

        // --- Mastery ---
        var csPerMin = recent
            .Where(e => e.Match.Info.GameDuration / 60.0 >= 25)
            .Select(e => (e.Player.TotalMinionsKilled + e.Player.NeutralMinionsKilled) / (e.Match.Info.GameDuration / 60.0))
            .ToList();
        if (csPerMin.Count >= MinGames && csPerMin.Average() >= 8) earned.Add("cs-machine");

        if (players.Count >= MinGames)
        {
            if (players.Average(p => p.VisionScore) >= 60) earned.Add("vision-pro");
            if (players.Average(p => p.TotalDamageDealtToChampions) >= 40000) earned.Add("damage-dealer");
            if (players.Average(p => p.DragonKills + p.BaronKills) >= 1.5) earned.Add("objective-hunter");
        }

        var carried = recent.Any(e =>
        {
            var teamDamage = e.Match.Info.Participants.Where(p => p.TeamId == e.Player.TeamId).Sum(p => (long)p.TotalDamageDealtToChampions);
            return teamDamage > 0 && e.Player.TotalDamageDealtToChampions / (double)teamDamage >= 0.5;
        });
        if (carried) earned.Add("carry");

        if (players.Any(p => p.TotalDamageTaken >= 50000)) earned.Add("meatshield");

        // --- Playstyle ---
        var last20 = allRecent.Take(20).Select(e => e.Player).ToList();
        if (last20.Count >= 10 && last20.GroupBy(p => p.ChampionName).Max(g => g.Count()) / (double)last20.Count >= 0.7) earned.Add("one-trick");

        if (players.Select(p => p.ChampionName).Distinct().Count() >= 5) earned.Add("diverse-player");

        var last5 = players.Take(5).ToList();
        if (last5.Count == 5 && last5.All(p => p.Win)) earned.Add("win-streak");
        if (last5.Count == 5 && last5.All(p => !p.Win)) earned.Add("lose-streak");

        // Role main looks at the whole loaded window, not just the last 10
        var roles = allRecent
            .Where(e => !string.IsNullOrEmpty(e.Player.TeamPosition))
            .GroupBy(e => e.Player.TeamPosition)
            .Select(g => (Role: g.Key, Count: g.Count()))
            .OrderByDescending(r => r.Count)
            .ToList();
        if (roles.Count > 0 && RoleAchievements.TryGetValue(roles[0].Role, out var roleAchievement)
            && (roles.Count == 1 || roles[0].Count != roles[1].Count) && roles[0].Count / (double)allRecent.Count >= 0.3)
            earned.Add(roleAchievement);

        // --- Queue Enjoyer (last 25) ---
        var last25 = allMatches.Take(25).ToList();
        int QueueCount(int queueId) => last25.Count(m => m.Info.QueueId == queueId);
        if (QueueCount(420) >= 13) earned.Add("soloq-enjoyer");
        if (QueueCount(440) >= 13) earned.Add("flex-enjoyer");
        if (QueueCount(710) >= 13) earned.Add("premade-enjoyer");

        return earned;
    }
}
