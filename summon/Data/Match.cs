namespace summon.Data
{
    public class Match
    {
        public required string MatchId { get; set; }
        public int QueueId { get; set; }
        public long GameCreation {  get; set; }
        public int GameDuration { get; set; }
        public required string Data { get; set; }

        public List<MatchParticipant> Participants { get; set; } = [];
    }
}
