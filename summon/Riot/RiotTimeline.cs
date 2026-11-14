namespace summon.Riot;

// Match-v5 timeline: one frame a minute with each player's gold, CS and XP, and the events in between
public record RiotTimeline(RiotTimelineInfo Info);

public record RiotTimelineInfo(int FrameInterval, List<RiotTimelineFrame> Frames);

public record RiotTimelineFrame(long Timestamp, Dictionary<string, RiotParticipantFrame> ParticipantFrames, List<RiotTimelineEvent> Events);

public record RiotParticipantFrame(int ParticipantId, int TotalGold, int Level, int MinionsKilled, int? JungleMinionsKilled, int Xp);

public record RiotTimelineEvent(
    string Type,
    long Timestamp,
    int? KillerId,
    int? VictimId,
    int? KillerTeamId,
    int? TeamId,
    string? MonsterType,
    string? MonsterSubType,
    List<int>? AssistingParticipantIds,
    string? BuildingType,
    string? TowerType,
    string? LaneType,
    int? ParticipantId,
    int? SkillSlot,
    string? LevelUpType,
    RiotPosition? Position,
    int? ItemId);

public record RiotPosition(int X, int Y);
