namespace summon.Data
{
    public class Account
    {
        public required string Puuid { get; set; }
        public required string GameName { get; set; }
        public required string TagLine { get; set; }
        public string? Platform { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<RankedEntry> RankedEntries { get; set; } = [];

    }
}
