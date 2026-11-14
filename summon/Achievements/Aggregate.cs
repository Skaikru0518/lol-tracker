namespace summon.Achievements;

public static class Aggregate
{
    /// <summary>Killing spree length that counts as Legendary.</summary>
    private const int LegendarySpree = 8;

    /// <summary>Per-champion sums over the games in the range (all games without one), in first-seen order.</summary>
    public static List<ChampionTotals> ChampionTotals(IEnumerable<GameRow> rows, TimeRange? range = null)
    {
        var byChampion = new Dictionary<string, ChampionTotals>();
        var order = new List<ChampionTotals>();
        foreach (var row in rows)
        {
            if (range is not null && !range.Contains(row.GameCreation)) continue;
            if (!byChampion.TryGetValue(row.ChampionName, out var t))
            {
                t = new ChampionTotals(row.ChampionName);
                byChampion[row.ChampionName] = t;
                order.Add(t);
            }
            t.Games += 1;
            t.Wins += row.Win ? 1 : 0;
            t.Pentas += row.Pentas;
            t.Quadras += row.Quadras;
            t.Kills += row.Kills;
            t.Assists += row.Assists;
            t.Vision += row.Vision;
            t.Turrets += row.Turrets;
            t.Epics += row.Epics;
            t.Gold += row.Gold;
            t.Cs += row.Cs;
            t.Damage += row.Damage;
            t.WardsPlaced += row.WardsPlaced;
            t.WardsKilled += row.WardsKilled;
            t.Support += row.Support;
            t.FirstBloods += row.FirstBlood ? 1 : 0;
            t.Deathless += row.Deaths == 0 ? 1 : 0;
            t.Legendary += row.LargestSpree >= LegendarySpree ? 1 : 0;
            t.Seconds += row.GameDuration;
        }
        return order;
    }

    /// <summary>The games in the range, oldest first.</summary>
    public static List<GameRow> SeasonGames(IEnumerable<GameRow> rows, TimeRange range) =>
        rows.Where(r => range.Contains(r.GameCreation)).OrderBy(r => r.GameCreation).ToList();

    /// <summary>Ranked entries refreshed since the season started; older ones belong to an earlier season.</summary>
    public static List<CurrentRank> SeasonRanks(IEnumerable<(CurrentRank Rank, DateTime UpdatedAt)> ranked, DateTime from) =>
        ranked.Where(r => r.UpdatedAt >= from).Select(r => r.Rank).ToList();
}
