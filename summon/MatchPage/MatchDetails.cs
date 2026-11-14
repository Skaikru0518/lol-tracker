namespace summon.MatchPage;

// The match-v5 fields only the match page reads; kept out of RiotParticipant, whose fields every match query projects
public record RiotMatchDetails(RiotDetailsInfo Info);

public record RiotDetailsInfo(List<ParticipantDetail> Participants);

public record ParticipantDetail(
    string Puuid,
    int PhysicalDamageDealtToChampions,
    int MagicDamageDealtToChampions,
    int TrueDamageDealtToChampions,
    int DamageSelfMitigated,
    int TotalHeal,
    int TotalDamageShieldedOnTeammates,
    int LargestKillingSpree,
    int DoubleKills,
    int TripleKills,
    int TotalTimeSpentDead,
    bool FirstTowerKill,
    DetailPerks? Perks);

public record DetailPerks(DetailStatPerks? StatPerks, List<DetailStyle>? Styles);

public record DetailStatPerks(int Offense, int Flex, int Defense);

public record DetailStyle(string Description, int Style, List<DetailSelection> Selections);

public record DetailSelection(int Perk, int Var1, int Var2, int Var3);
