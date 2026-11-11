namespace summon.Data
{
    public class RankedEntry
    {
        public required string Puuid { get; set; }
        public required string QueueType { get; set; }
        public required string Tier { get; set; }
        public required string Rank {  get; set; }
        public int LeaguePoints { get; set; }
        public int Wins { get; set; }
        public int Losses { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Account Account { get; set; } = null!;
    }
}
