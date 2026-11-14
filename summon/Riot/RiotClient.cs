using System.Net;
using System.Net.Http.Json;

namespace summon.Riot;

public class RiotClient(HttpClient http)
{
    private const string Europe = "https://europe.api.riotgames.com";

    public Task<RiotAccount?> GetAccountByRiotIdAsync(string gameName, string tagLine, CancellationToken ct = default) =>
        http.GetFromJsonAsync<RiotAccount>($"{Europe}/riot/account/v1/accounts/by-riot-id/{Uri.EscapeDataString(gameName)}/{Uri.EscapeDataString(tagLine)}", ct);

    public Task<RiotActiveRegion?> GetActiveRegionAsync(string puuid, CancellationToken ct = default) => http.GetFromJsonAsync<RiotActiveRegion>($"{Europe}/riot/account/v1/region/by-game/lol/by-puuid/{Uri.EscapeDataString(puuid)}", ct);

    public Task<List<RiotLeagueEntry>?> GetLeagueEntriesAsync(string platform, string puuid, CancellationToken ct = default) =>
        http.GetFromJsonAsync<List<RiotLeagueEntry>>(
            $"https://{platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/{Uri.EscapeDataString(puuid)}", ct);

    public Task<List<string>?> GetMatchIdsAsync(string puuid, int count, int start = 0, CancellationToken ct = default) =>
        http.GetFromJsonAsync<List<string>>(
            $"{Europe}/lol/match/v5/matches/by-puuid/{Uri.EscapeDataString(puuid)}/ids?start={start}&count={count}", ct);

    /// <summary>The newest match ids in one queue, optionally only those started after a Unix time in seconds.</summary>
    public Task<List<string>?> GetMatchIdsFilteredAsync(string puuid, int count, int queue, long? startTime, CancellationToken ct = default) =>
        http.GetFromJsonAsync<List<string>>(
            $"{Europe}/lol/match/v5/matches/by-puuid/{Uri.EscapeDataString(puuid)}/ids?start=0&count={count}&queue={queue}{(startTime is { } t ? $"&startTime={t}" : "")}", ct);

    public Task<string> GetMatchTimelineJsonAsync(string matchId, CancellationToken ct = default) =>
        http.GetStringAsync($"{Europe}/lol/match/v5/matches/{Uri.EscapeDataString(matchId)}/timeline", ct);

    public Task<string> GetMatchJsonAsync(string matchId, CancellationToken ct = default) =>
        http.GetStringAsync($"{Europe}/lol/match/v5/matches/{Uri.EscapeDataString(matchId)}", ct);

    public Task<RiotSummoner?> GetSummonerAsync(string platform, string puuid, CancellationToken ct = default) => http.GetFromJsonAsync<RiotSummoner>($"https://{platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{Uri.EscapeDataString(puuid)}", ct);

    public Task<List<RiotMastery>?> GetAllMasteriesAsync(string platform, string puuid, CancellationToken ct = default) =>
        http.GetFromJsonAsync<List<RiotMastery>>(
            $"https://{platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/{Uri.EscapeDataString(puuid)}", ct);

    /// <summary>Raw champion-v3 rotation; its shape changed over time, so the caller validates it.</summary>
    public Task<string> GetChampionRotationJsonAsync(string platform, CancellationToken ct = default) =>
        http.GetStringAsync($"https://{platform}.api.riotgames.com/lol/platform/v3/champion-rotations", ct);

    /// <summary>The game the player is in right now; null when they are not in one (Riot answers 404).</summary>
    public async Task<RiotLiveGame?> GetActiveGameAsync(string platform, string puuid, CancellationToken ct = default)
    {
        using var response = await http.GetAsync(
            $"https://{platform}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/{Uri.EscapeDataString(puuid)}", ct);
        if (response.StatusCode == HttpStatusCode.NotFound) return null;
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<RiotLiveGame>(ct);
    }

    public Task<List<RiotMastery>?> GetTopMasteriesAsync(string platform, string puuid, int count, CancellationToken ct = default) =>
        http.GetFromJsonAsync<List<RiotMastery>>(
            $"https://{platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/{Uri.EscapeDataString(puuid)}/top?count={count}", ct);
}