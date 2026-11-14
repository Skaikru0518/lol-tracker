namespace summon.Achievements;

public static class Eligibility
{
    /// <summary>Queues that earn achievements and match badges: Ranked Solo, Flex and 5s.</summary>
    public static readonly int[] QueueIds = [420, 440, 710];

    /// <summary>Games shorter than this are remakes and earn nothing.</summary>
    public const int MinGameSeconds = 300;

    public static bool IsEligible(int queueId, int gameDuration) => QueueIds.Contains(queueId) && gameDuration >= MinGameSeconds;
}
