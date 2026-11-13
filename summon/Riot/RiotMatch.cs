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
    int ChampionId,
    string ChampionName,
    int ProfileIcon,
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
    int Summoner2Id,
    RiotPerks Perks,
    int? PlayerSubteamId,
    int? SubteamPlacement,
    int? Placement
)
{
    // Arena and some modes send fewer rune styles, so missing entries mean "no rune" rather than an error
    public int Keystone => Perks?.Styles?.ElementAtOrDefault(0)?.Selections?.ElementAtOrDefault(0)?.Perk ?? 0;
    public int SecondaryStyle => Perks?.Styles?.ElementAtOrDefault(1)?.Style ?? 0;
}

public record RiotPerks(List<RiotPerkStyle> Styles);
public record RiotPerkStyle(int Style, List<RiotPerkSelection> Selections);
public record RiotPerkSelection(int Perk);
