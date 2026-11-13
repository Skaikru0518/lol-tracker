namespace summon.Riot;

public record RiotMatch(RiotMatchInfo Info);
public record RiotMatchInfo(long GameCreation, int GameDuration, int QueueId, string GameMode, List<RiotParticipant> Participants, List<RiotTeam> Teams);
public record RiotTeam(int TeamId, bool Win,List<RiotBan> Bans ,Dictionary<string, RiotObjective> Objectives);
public record RiotBan(int ChampionId);
public record RiotObjective(int Kills);
public record RiotParticipant(
    string Puuid,
    string? RiotIdGameName,
    string? RiotIdTagline,
    int TeamId,
    string TeamPosition,
    string ChampionName,
    int ChampLevel,
    bool Win,
    int Kills,
    int Deaths,
    int Assists,
    int TotalMinionsKilled,
    int NeutralMinionsKilled,
    int GoldEarned,
    int TotalDamageDealtToChampions,
    int VisionScore,
    int Item0,
    int Item1,
    int Item2,
    int Item3,
    int Item4,
    int Item5,
    int Item6,
    int Summoner1Id,
    int Summoner2Id
);
