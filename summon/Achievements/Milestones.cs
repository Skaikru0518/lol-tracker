namespace summon.Achievements;

/// <summary>All-time, tiered achievements over stored ranked games; they never go down.</summary>
public static class Milestones
{
    /// <summary>Emerald, Diamond, Master, Grandmaster+ as rank tier ordinals.</summary>
    public static readonly int[] RankThresholds = [5, 6, 7, 8];

    private const ProgressDisplay Points = ProgressDisplay.Points;

    public static readonly ProgressDef[] All =
    [
        new("veteran", "Veteran", "Ranked games played", "veteran", "#95a5a6", [100, 500, 1500, 3000]),
        new("winner", "Winner", "Ranked games won", "winner", "#2ecc71", [50, 250, 750, 1500]),
        new("time-served", "Time Served", "Hours spent in ranked games", "time-served", "#7f8c8d", [100, 400, 1000, 2000]),
        new("pentakiller", "Pentakiller", "Pentakills in ranked games", "pentakiller", "#e74c3c", [1, 5, 20, 50]),
        new("multikiller", "Multikiller", "Quadrakills in ranked games", "multikiller", "#e67e22", [5, 25, 100, 250]),
        new("legendary", "Legendary", "Ranked games with a killing spree of 8 or more", "legendary", "#f39c12", [1, 10, 30, 75]),
        new("slayer", "Slayer", "Kills in ranked games", "slayer", "#c0392b", [1000, 5000, 15000, 30000]),
        new("wingman", "Wingman", "Assists in ranked games", "wingman", "#1abc9c", [2000, 10000, 25000, 50000]),
        new("first-strike", "First Strike", "First bloods in ranked games", "first-strike", "#c0392b", [25, 100, 300, 600]),
        new("deathless", "Deathless", "Ranked games without dying", "deathless", "#f1c40f", [5, 25, 75, 150]),
        new("artillery", "Artillery", "Damage dealt to champions in ranked games", "artillery", "#e67e22", [2_000_000, 10_000_000, 30_000_000, 60_000_000], Points),
        new("guardian", "Guardian", "Healing and shielding on teammates in ranked games", "guardian", "#2ecc71", [500_000, 2_500_000, 7_500_000, 15_000_000], Points),
        new("gold-digger", "Gold Digger", "Gold earned in ranked games", "gold-digger", "#f1c40f", [1_000_000, 5_000_000, 15_000_000, 30_000_000], Points),
        new("farmer", "Farmer", "Minions and monsters killed in ranked games", "farmer", "#27ae60", [25_000, 100_000, 300_000, 600_000], Points),
        new("visionary", "Visionary", "Total vision score in ranked games", "visionary", "#3498db", [10_000, 50_000, 150_000, 300_000]),
        new("ward-keeper", "Ward Keeper", "Wards placed in ranked games", "ward-keeper", "#3498db", [1000, 5000, 15000, 30000]),
        new("ward-hunter", "Ward Hunter", "Wards destroyed in ranked games", "ward-hunter", "#9b59b6", [250, 1000, 3000, 6000]),
        new("demolisher", "Demolisher", "Turrets destroyed in ranked games", "demolisher", "#e74c3c", [50, 250, 750, 1500]),
        new("epic-hunter", "Epic Hunter", "Dragons and barons slain in ranked games", "epic-hunter", "#8e44ad", [50, 250, 750, 1500]),
        new("champion-pool", "Champion Pool", "Different champions with a ranked win", "champion-pool", "#16a085", [15, 35, 60, 100]),
        new("one-champ-army", "One Champ Army", "Ranked wins on your best champion", "one-champ-army", "#e91e63", [50, 150, 400, 800]),
        new("mastery-collector", "Mastery Collector", "Champions at mastery level 10 or higher", "mastery-collector", "#9b59b6", [3, 10, 25, 50]),
        new("devotion", "Devotion", "Mastery points on your most played champion", "devotion", "#f39c12", [250_000, 1_000_000, 2_500_000, 5_000_000], Points),
        new("peak-rank", "Peak Rank", "Highest tier reached in any ranked queue", "peak-rank", "#5b8bf5", RankThresholds, ProgressDisplay.Rank),
    ];

    public static ProgressDef? Get(string id) => All.FirstOrDefault(m => m.Id == id);

    /// <summary>One all-time result per milestone, in definition order.</summary>
    public static List<ProgressResult> Evaluate(MilestoneInputs inputs)
    {
        var (champions, snapshots, ranked, masteries) = inputs;
        int Sum(Func<ChampionTotals, int> field) => champions.Sum(field);
        var values = new Dictionary<string, int>
        {
            ["veteran"] = Sum(c => c.Games),
            ["winner"] = Sum(c => c.Wins),
            ["pentakiller"] = Sum(c => c.Pentas),
            ["multikiller"] = Sum(c => c.Quadras),
            ["slayer"] = Sum(c => c.Kills),
            ["wingman"] = Sum(c => c.Assists),
            ["visionary"] = Sum(c => c.Vision),
            ["demolisher"] = Sum(c => c.Turrets),
            ["epic-hunter"] = Sum(c => c.Epics),
            ["time-served"] = (int)(champions.Sum(c => c.Seconds) / 3600),
            ["legendary"] = Sum(c => c.Legendary),
            ["first-strike"] = Sum(c => c.FirstBloods),
            ["deathless"] = Sum(c => c.Deathless),
            ["artillery"] = Sum(c => c.Damage),
            ["guardian"] = Sum(c => c.Support),
            ["gold-digger"] = Sum(c => c.Gold),
            ["farmer"] = Sum(c => c.Cs),
            ["ward-keeper"] = Sum(c => c.WardsPlaced),
            ["ward-hunter"] = Sum(c => c.WardsKilled),
            ["champion-pool"] = champions.Count(c => c.Wins > 0),
            ["one-champ-army"] = champions.Select(c => c.Wins).Append(0).Max(),
            ["mastery-collector"] = masteries.Count(m => m.ChampionLevel >= 10),
            ["devotion"] = masteries.Select(m => m.ChampionPoints).Append(0).Max(),
            ["peak-rank"] = Tiers.HighestTierOrdinal(snapshots.Select(s => s.Tier).Concat(ranked.Select(r => r.Tier))),
        };
        return All.Select(def => new ProgressResult(def.Id, Scopes.AllTime, values[def.Id], Tiers.TierFor(values[def.Id], def.Thresholds))).ToList();
    }
}
