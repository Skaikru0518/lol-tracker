using System.Globalization;

namespace summon.Components.Ui;

public static class Css
{
    /// <summary>Pixel size as rem, so icons scale with the root font size like the rest of the page.</summary>
    public static string Rem(int px) => (px / 16.0).ToString(CultureInfo.InvariantCulture) + "rem";

    public static string Square(int px) => $"width: {Rem(px)}; height: {Rem(px)}";
}
