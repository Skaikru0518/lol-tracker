namespace summon.Riot
{
    public record RiotAccount(string Puuid, string GameName, string TagLine);
    public record RiotActiveRegion(string Puuid, string Game, string Region);
    public record RiotLeagueEntry(string QueueType, string Tier, string Rank, int LeaguePoints, int Wins, int Losses);
}
