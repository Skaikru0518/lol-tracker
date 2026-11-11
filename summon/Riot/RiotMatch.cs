namespace summon.Riot;

public record RiotMatch(RiotMatchInfo Info);
public record RiotMatchInfo(long GameCreation, int GameDuration, int QueueId, List<RiotParticipant> Participants);
public record RiotParticipant(
    string Puuid,
    string ChampionName,
    bool Win,
    int Kills,
    int Deaths,
    int Assists,
    int TotalMinionsKilled,
    int NeutralMinionsKilled,
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
