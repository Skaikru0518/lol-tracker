using System.Globalization;
using System.Text;

namespace summon;

/// <summary>What search engines and link previews read: the site URL, robots.txt, sitemap.xml and the default description.</summary>
public static class SiteInfo
{
    // The original's SITE_URL; set SiteUrl in configuration where the C# version runs elsewhere
    public const string DefaultUrl = "https://summon.vandslab.com";

    public const string Title = "Summon.gg — League of Legends Summoner Tracker";

    public const string Description =
        "Track any League of Legends summoner — ranked stats, LP history, match history, champion mastery, live game detection, achievement badges, and detailed match breakdowns. Free and open alternative to op.gg.";

    public static string Url(IConfiguration configuration) => (configuration["SiteUrl"] ?? DefaultUrl).TrimEnd('/');

    /// <summary>Everything allowed except the API, and where the sitemap is; the same text Next writes for the original.</summary>
    public static string Robots(string siteUrl) => $"User-Agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: {siteUrl}/sitemap.xml\n";

    private static readonly (string Path, string ChangeFrequency, string Priority)[] Pages =
        [("", "daily", "1"), ("/changelog", "weekly", "0.5"), ("/policy", "monthly", "0.3")];

    /// <summary>The home page, the changelog and the policy, last modified now, like the original's sitemap.</summary>
    public static string Sitemap(string siteUrl, DateTime now)
    {
        var lastModified = now.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture);
        var xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        foreach (var (path, frequency, priority) in Pages)
            xml.Append($"<url>\n<loc>{siteUrl}{path}</loc>\n<lastmod>{lastModified}</lastmod>\n<changefreq>{frequency}</changefreq>\n<priority>{priority}</priority>\n</url>\n");
        return xml.Append("</urlset>\n").ToString();
    }
}
