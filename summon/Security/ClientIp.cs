namespace summon.Security;

/// <summary>
/// The visitor's IP, read once per request or circuit like the original: Cloudflare's cf-connecting-ip, else the first
/// X-Forwarded-For entry, else the connection's address. Null when none is known.
/// </summary>
public class ClientIp(IHttpContextAccessor accessor)
{
    public string? Value { get; } = Read(accessor.HttpContext);

    private static string? Read(HttpContext? context)
    {
        if (context is null) return null;
        // Behind Cloudflare the first forwarded IP is whatever the client sent; Cloudflare sets cf-connecting-ip itself
        var cloudflare = context.Request.Headers["cf-connecting-ip"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(cloudflare)) return cloudflare;
        var forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim();
        if (!string.IsNullOrWhiteSpace(forwarded)) return forwarded;
        return context.Connection.RemoteIpAddress?.ToString();
    }
}
