namespace summon.Riot;

public static class Queues
{
    public static string Name(int queueId) => queueId switch
    {
        420 => "Ranked Solo",
        440 => "Ranked Flex",
        400 => "Normal Draft",
        490 => "Quickplay",
        450 => "ARAM",
        1700 => "Arena",
        _ => "Other"
    };
}
