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
    int NeutralMinionsKilled
);