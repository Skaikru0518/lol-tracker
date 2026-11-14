using System.Globalization;
using System.Text;

namespace summon.MatchPage;

/// <summary>The bits of recharts the match charts use: nice axis ticks and the monotone curve (d3's curveMonotoneX).</summary>
public static class ChartMath
{
    private static readonly double[] NiceSteps = [1, 2, 2.5, 5, 10];

    /// <summary>A round step at least as large as rough: 1, 2, 2.5 or 5 times a power of ten.</summary>
    public static double NiceStep(double rough)
    {
        if (rough <= 0) return 1;
        var magnitude = Math.Pow(10, Math.Floor(Math.Log10(rough)));
        return NiceSteps.First(s => s * magnitude >= rough * (1 - 1e-9)) * magnitude;
    }

    /// <summary>About count evenly spaced round ticks inside [min, max].</summary>
    public static List<double> Ticks(double min, double max, int count = 5)
    {
        if (max <= min) return [min];
        var step = NiceStep((max - min) / (count - 1));
        var ticks = new List<double>();
        for (var t = Math.Ceiling(min / step - 1e-9) * step; t <= max + step * 1e-9; t += step) ticks.Add(Math.Round(t, 6) + 0.0); // + 0.0 turns -0 into 0
        return ticks;
    }

    /// <summary>A round upper bound for data from 0 to max, like an auto domain: the last tick at or above max.</summary>
    public static double NiceMax(double max, int count = 5) => max <= 0 ? 1 : Math.Ceiling(max / NiceStep(max / (count - 1)) - 1e-9) * NiceStep(max / (count - 1));

    private static string N(double v) => v.ToString("0.###", CultureInfo.InvariantCulture);

    private static double Slope3(double x0, double y0, double x1, double y1, double x2, double y2)
    {
        double h0 = x1 - x0, h1 = x2 - x1;
        double s0 = h0 != 0 ? (y1 - y0) / h0 : 0, s1 = h1 != 0 ? (y2 - y1) / h1 : 0;
        var p = (s0 * h1 + s1 * h0) / (h0 + h1);
        var slope = (Math.Sign(s0) + Math.Sign(s1)) * Math.Min(Math.Min(Math.Abs(s0), Math.Abs(s1)), 0.5 * Math.Abs(p));
        return double.IsFinite(slope) ? slope : 0;
    }

    private static double Slope2(double x0, double y0, double x1, double y1, double t) => x1 - x0 is var h && h != 0 ? (3 * (y1 - y0) / h - t) / 2 : t;

    /// <summary>SVG path through the points with monotone cubic segments, so the line never overshoots between frames.</summary>
    public static string MonotonePath(IReadOnlyList<(double X, double Y)> points)
    {
        if (points.Count == 0) return "";
        var path = new StringBuilder($"M{N(points[0].X)},{N(points[0].Y)}");
        if (points.Count == 1) return path.ToString();
        if (points.Count == 2) return path.Append($"L{N(points[1].X)},{N(points[1].Y)}").ToString();

        var tangents = new double[points.Count];
        for (var i = 1; i < points.Count - 1; i++)
            tangents[i] = Slope3(points[i - 1].X, points[i - 1].Y, points[i].X, points[i].Y, points[i + 1].X, points[i + 1].Y);
        tangents[0] = Slope2(points[0].X, points[0].Y, points[1].X, points[1].Y, tangents[1]);
        tangents[^1] = Slope2(points[^2].X, points[^2].Y, points[^1].X, points[^1].Y, tangents[^2]);

        for (var i = 0; i < points.Count - 1; i++)
        {
            var (x0, y0) = points[i];
            var (x1, y1) = points[i + 1];
            var dx = (x1 - x0) / 3;
            path.Append($"C{N(x0 + dx)},{N(y0 + dx * tangents[i])},{N(x1 - dx)},{N(y1 - dx * tangents[i + 1])},{N(x1)},{N(y1)}");
        }
        return path.ToString();
    }

    /// <summary>The area under a monotone line down to baseY.</summary>
    public static string MonotoneArea(IReadOnlyList<(double X, double Y)> points, double baseY) =>
        points.Count == 0 ? "" : $"{MonotonePath(points)}L{N(points[^1].X)},{N(baseY)}L{N(points[0].X)},{N(baseY)}Z";
}
