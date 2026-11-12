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

    public Task<List<string>?> GetMatchIdsAsync(string puuid, int count, CancellationToken ct = default) =>
        http.GetFromJsonAsync<List<string>>(
            $"{Europe}/lol/match/v5/matches/by-puuid/{Uri.EscapeDataString(puuid)}/ids?count={count}", ct);

    public Task<string> GetMatchJsonAsync(string matchId, CancellationToken ct = default) =>
        http.GetStringAsync($"{Europe}/lol/match/v5/matches/{Uri.EscapeDataString(matchId)}", ct);

    public Task<RiotSummoner?> GetSummonerAsync(string platform, string puuid, CancellationToken ct = default) => http.GetFromJsonAsync<RiotSummoner>($"https://{platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{Uri.EscapeDataString(puuid)}", ct);
}