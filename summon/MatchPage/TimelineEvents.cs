using summon.Riot;

namespace summon.MatchPage;

public record ObjectiveEvent(long Timestamp, string Side, string Kind, string Label, string Icon);

public record KillTick(long Timestamp, string Side, int KillerId, int VictimId);

public record FirstTaken(string Side, long Timestamp);

public record SideCount(int Blue, int Red);

public record ObjectiveSummary(FirstTaken? FirstBlood, FirstTaken? FirstTower, FirstTaken? FirstDragon, IReadOnlyDictionary<string, SideCount> Counts);

public record FightEvent(string Id, long Timestamp, string Role, int OtherId, int? X, int? Y);

public record TeamPoint(double Minute, int Blue, int Red);

public record ItemPurchase(int ItemId, long Timestamp);

public record ItemGroup(List<ItemPurchase> Items, long Timestamp);

/// <summary>The original's lib/match/timeline-events: objectives, kills, fights, skills and team series from a timeline.</summary>
public static class TimelineEvents
{
    private static readonly Dictionary<string, string> MonsterKinds = new()
    {
        ["DRAGON"] = "dragon", ["BARON_NASHOR"] = "baron", ["RIFTHERALD"] = "herald", ["HORDE"] = "grubs", ["ATAKHAN"] = "atakhan",
    };

    private static readonly Dictionary<string, string> KindLabels = new()
    {
        ["dragon"] = "Dragon", ["elder"] = "Elder Dragon", ["baron"] = "Baron Nashor", ["herald"] = "Rift Herald",
        ["grubs"] = "Void Grub", ["atakhan"] = "Atakhan", ["tower"] = "Tower", ["inhibitor"] = "Inhibitor",
    };

    private static readonly Dictionary<string, string> DragonNames = new()
    {
        ["FIRE_DRAGON"] = "Infernal", ["WATER_DRAGON"] = "Ocean", ["EARTH_DRAGON"] = "Mountain",
        ["AIR_DRAGON"] = "Cloud", ["HEXTECH_DRAGON"] = "Hextech", ["CHEMTECH_DRAGON"] = "Chemtech",
    };

    private static readonly Dictionary<string, string> Lanes = new() { ["TOP_LANE"] = "Top", ["MID_LANE"] = "Mid", ["BOT_LANE"] = "Bot" };
    private static readonly Dictionary<string, string> Towers = new() { ["OUTER_TURRET"] = "T1", ["INNER_TURRET"] = "T2", ["BASE_TURRET"] = "T3", ["NEXUS_TURRET"] = "Nexus" };

    private static readonly Dictionary<string, string> ObjectiveIcons = new()
    {
        ["DRAGON"] = "dragon", ["ELDER_DRAGON"] = "dragon", ["BARON_NASHOR"] = "baron", ["RIFTHERALD"] = "riftherald", ["HORDE"] = "grub",
    };

    private const string MinimapIcons = "https://raw.communitydragon.org/latest/game/assets/ux/minimap/icons";

    public static string ObjectiveIcon(string monsterType) => $"{MinimapIcons}/{ObjectiveIcons.GetValueOrDefault(monsterType, "dragon")}.png";

    public static string BuildingIcon(string buildingType) => $"{MinimapIcons}/{(buildingType == "INHIBITOR_BUILDING" ? "inhibitor" : "tower")}.png";

    /// <summary>Blue for participants 1-5, red for 6-10.</summary>
    private static string SideOf(int participantId) => participantId <= 5 ? "blue" : "red";

    private static string Enemy(string side) => side == "blue" ? "red" : "blue";

    private static IEnumerable<RiotTimelineEvent> AllEvents(RiotTimeline timeline) => timeline.Info.Frames.SelectMany(f => f.Events);

    /// <summary>Timestamp of the last frame, at least 1 so it can divide.</summary>
    public static long GameEndMs(RiotTimeline timeline) => Math.Max(timeline.Info.Frames.LastOrDefault()?.Timestamp ?? 0, 1);

    /// <summary>Elite monsters and buildings in time order; a building counts for the team that destroyed it.</summary>
    public static List<ObjectiveEvent> ObjectiveEvents(RiotTimeline timeline)
    {
        var events = new List<ObjectiveEvent>();
        foreach (var e in AllEvents(timeline))
        {
            if (e.Type == "ELITE_MONSTER_KILL" && e.MonsterType is { } monster)
            {
                if (!MonsterKinds.TryGetValue(monster, out var kind)) continue;
                if (kind == "dragon" && e.MonsterSubType == "ELDER_DRAGON") kind = "elder";
                var dragonName = kind == "dragon" ? DragonNames.GetValueOrDefault(e.MonsterSubType ?? "") : null;
                events.Add(new ObjectiveEvent(e.Timestamp, e.KillerTeamId == 200 ? "red" : "blue", kind,
                    dragonName is null ? KindLabels[kind] : $"{dragonName} Dragon", ObjectiveIcon(kind == "elder" ? "ELDER_DRAGON" : monster)));
            }
            else if (e.Type == "BUILDING_KILL")
            {
                var inhibitor = e.BuildingType == "INHIBITOR_BUILDING";
                var lane = Lanes.GetValueOrDefault(e.LaneType ?? "", "");
                var name = inhibitor ? "inhibitor" : Towers.GetValueOrDefault(e.TowerType ?? "", "tower");
                events.Add(new ObjectiveEvent(e.Timestamp, e.TeamId == 100 ? "red" : "blue", inhibitor ? "inhibitor" : "tower",
                    $"{lane} {name}".Trim(), BuildingIcon(e.BuildingType ?? "TOWER_BUILDING")));
            }
        }
        return events.OrderBy(o => o.Timestamp).ToList();
    }

    /// <summary>Champion kills by the killer's side; executions (killer 0) count for the victim's enemies.</summary>
    public static List<KillTick> KillTicks(RiotTimeline timeline) =>
        AllEvents(timeline)
            .Where(e => e.Type == "CHAMPION_KILL" && e.VictimId is > 0)
            .Select(e => new KillTick(e.Timestamp, e.KillerId is > 0 ? SideOf(e.KillerId.Value) : Enemy(SideOf(e.VictimId!.Value)), e.KillerId ?? 0, e.VictimId!.Value))
            .ToList();

    /// <summary>First blood, first tower and first dragon, plus dragon, grub, baron and tower counts per side.</summary>
    public static ObjectiveSummary Summary(IReadOnlyList<ObjectiveEvent> objectives, IReadOnlyList<KillTick> kills)
    {
        FirstTaken? First(params string[] kinds) => objectives.FirstOrDefault(o => kinds.Contains(o.Kind)) is { } hit ? new FirstTaken(hit.Side, hit.Timestamp) : null;
        SideCount Count(params string[] kinds) =>
            new(objectives.Count(o => kinds.Contains(o.Kind) && o.Side == "blue"), objectives.Count(o => kinds.Contains(o.Kind) && o.Side == "red"));
        var blood = kills.FirstOrDefault();
        return new ObjectiveSummary(
            blood is null ? null : new FirstTaken(blood.Side, blood.Timestamp),
            First("tower"),
            First("dragon", "elder"),
            new Dictionary<string, SideCount>
            {
                ["dragons"] = Count("dragon", "elder"), ["grubs"] = Count("grubs"), ["barons"] = Count("baron"), ["towers"] = Count("tower"),
            });
    }

    /// <summary>The player's kills, deaths and assists in time order; OtherId is the victim, or the killer for deaths (0 = execution).</summary>
    public static List<FightEvent> PlayerFightEvents(RiotTimeline timeline, int participantId)
    {
        var events = new List<FightEvent>();
        var index = 0;
        foreach (var e in AllEvents(timeline))
        {
            var i = index++;
            if (e.Type != "CHAMPION_KILL" || e.VictimId is not > 0) continue;
            string? role = e.KillerId == participantId ? "kill"
                : e.VictimId == participantId ? "death"
                : e.AssistingParticipantIds?.Contains(participantId) == true ? "assist" : null;
            if (role is null) continue;
            events.Add(new FightEvent($"{e.Timestamp}-{i}", e.Timestamp, role, role == "death" ? e.KillerId ?? 0 : e.VictimId.Value, e.Position?.X, e.Position?.Y));
        }
        return events;
    }

    /// <summary>Skill slot (1 Q, 2 W, 3 E, 4 R) of each point the player spent, in order; evolutions are not points.</summary>
    public static List<int> SkillLevels(RiotTimeline timeline, int participantId) =>
        AllEvents(timeline)
            .Where(e => e.Type == "SKILL_LEVEL_UP" && e.LevelUpType != "EVOLVE" && e.ParticipantId == participantId && e.SkillSlot is > 0 and <= 4)
            .Select(e => e.SkillSlot!.Value)
            .ToList();

    private static readonly int[] BasicSlots = [1, 2, 3];
    private const int MaxPoints = 5;

    /// <summary>R first, then basic skills in the order they hit five points; unfinished ones by points spent.</summary>
    public static List<int> SkillMaxOrder(IReadOnlyList<int> levels)
    {
        var points = new Dictionary<int, int> { [1] = 0, [2] = 0, [3] = 0 };
        var maxed = new List<int>();
        foreach (var slot in levels)
        {
            if (!BasicSlots.Contains(slot)) continue;
            if (++points[slot] == MaxPoints) maxed.Add(slot);
        }
        var rest = BasicSlots.Where(s => !maxed.Contains(s)).OrderByDescending(s => points[s]).ThenBy(s => s);
        return [4, .. maxed, .. rest];
    }

    private const long GrubWaveGapMs = 120_000;

    /// <summary>Void Grubs merged into one icon per wave, owned by the team that took more of it (label "Void Grubs blue–red").</summary>
    public static List<ObjectiveEvent> GrubWaves(IEnumerable<ObjectiveEvent> objectives)
    {
        var result = new List<ObjectiveEvent>();
        var wave = new List<ObjectiveEvent>();
        void Flush()
        {
            if (wave.Count == 0) return;
            var blue = wave.Count(w => w.Side == "blue");
            var red = wave.Count - blue;
            var side = blue == red ? wave[0].Side : blue > red ? "blue" : "red";
            result.Add(wave[^1] with { Side = side, Label = $"Void Grubs {blue}–{red}" });
            wave = [];
        }
        foreach (var o in objectives)
        {
            if (o.Kind != "grubs")
            {
                result.Add(o);
                continue;
            }
            if (wave.Count > 0 && o.Timestamp - wave[^1].Timestamp > GrubWaveGapMs) Flush();
            wave.Add(o);
        }
        Flush();
        return result.OrderBy(o => o.Timestamp).ToList();
    }

    private static double Minute(long ms) => Math.Floor(ms / 60000.0 + 0.5);

    /// <summary>Each side's running kill total at every frame; executions count for the victim's enemies.</summary>
    public static List<TeamPoint> CumulativeKills(RiotTimeline timeline)
    {
        int blue = 0, red = 0;
        return timeline.Info.Frames.Select(frame =>
        {
            foreach (var e in frame.Events.Where(e => e.Type == "CHAMPION_KILL" && e.VictimId is > 0))
            {
                if ((e.KillerId is > 0 ? SideOf(e.KillerId.Value) : Enemy(SideOf(e.VictimId!.Value))) == "blue") blue++;
                else red++;
            }
            return new TeamPoint(Minute(frame.Timestamp), blue, red);
        }).ToList();
    }

    /// <summary>Each side's CS (lane plus jungle) or total gold at every frame.</summary>
    public static List<TeamPoint> TeamSeries(RiotTimeline timeline, string metric) =>
        timeline.Info.Frames.Select(frame =>
        {
            int blue = 0, red = 0;
            foreach (var pf in frame.ParticipantFrames.Values)
            {
                var value = metric == "cs" ? pf.MinionsKilled + (pf.JungleMinionsKilled ?? 0) : pf.TotalGold;
                if (SideOf(pf.ParticipantId) == "blue") blue += value;
                else red += value;
            }
            return new TeamPoint(Minute(frame.Timestamp), blue, red);
        }).ToList();

    /// <summary>Blue minus red team gold at every frame, by exact minute.</summary>
    public static List<(double Minute, int Diff)> GoldDiff(RiotTimeline timeline) =>
        timeline.Info.Frames
            .Select(f => (f.Timestamp / 60000.0, f.ParticipantFrames.Values.Sum(pf => pf.ParticipantId <= 5 ? pf.TotalGold : -pf.TotalGold)))
            .ToList();

    private const long GroupThresholdMs = 30_000;

    /// <summary>The player's item purchases, grouped into one shop visit while each is within 30 s of the visit's first.</summary>
    public static List<ItemGroup> ItemGroups(RiotTimeline timeline, int participantId)
    {
        var purchases = AllEvents(timeline)
            .Where(e => e.Type == "ITEM_PURCHASED" && e.ParticipantId == participantId && e.ItemId is not null)
            .Select(e => new ItemPurchase(e.ItemId!.Value, e.Timestamp))
            .OrderBy(p => p.Timestamp)
            .ToList();
        var groups = new List<ItemGroup>();
        foreach (var purchase in purchases)
        {
            if (groups.Count > 0 && purchase.Timestamp - groups[^1].Timestamp <= GroupThresholdMs) groups[^1].Items.Add(purchase);
            else groups.Add(new ItemGroup([purchase], purchase.Timestamp));
        }
        return groups;
    }
}
