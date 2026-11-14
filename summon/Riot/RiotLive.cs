namespace summon.Riot;

// Spectator v5 active game; gameStartTime is 0 while the players are still in champ select
public record RiotLiveGame(
    long GameId,
    string GameMode,
    string GameType,
    long GameLength,
    long GameStartTime,
    int MapId,
    List<RiotLiveParticipant> Participants,
    List<RiotLiveBan> BannedChampions,
    int GameQueueConfigId);

public record RiotLiveParticipant(string Puuid, string RiotId, int ChampionId, int TeamId, int Spell1Id, int Spell2Id, RiotLivePerks Perks);

public record RiotLivePerks(List<int> PerkIds, int PerkStyle, int PerkSubStyle);

public record RiotLiveBan(int ChampionId, int TeamId, int PickTurn);
