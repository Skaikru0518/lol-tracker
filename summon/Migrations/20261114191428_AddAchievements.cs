using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace summon.Migrations
{
    /// <inheritdoc />
    public partial class AddAchievements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Matches",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()");

            migrationBuilder.CreateTable(
                name: "AchievementProgress",
                columns: table => new
                {
                    Puuid = table.Column<string>(type: "text", nullable: false),
                    AchievementId = table.Column<string>(type: "text", nullable: false),
                    Scope = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<int>(type: "integer", nullable: false),
                    Tier = table.Column<int>(type: "integer", nullable: false),
                    ReachedAt = table.Column<DateTime[]>(type: "timestamp with time zone[]", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AchievementProgress", x => new { x.Puuid, x.AchievementId, x.Scope });
                });

            migrationBuilder.CreateTable(
                name: "AppSettings",
                columns: table => new
                {
                    Key = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppSettings", x => x.Key);
                });

            migrationBuilder.CreateTable(
                name: "ChampionMasteries",
                columns: table => new
                {
                    Puuid = table.Column<string>(type: "text", nullable: false),
                    ChampionId = table.Column<int>(type: "integer", nullable: false),
                    ChampionLevel = table.Column<int>(type: "integer", nullable: false),
                    ChampionPoints = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChampionMasteries", x => new { x.Puuid, x.ChampionId });
                });

            migrationBuilder.CreateTable(
                name: "MatchBadges",
                columns: table => new
                {
                    MatchId = table.Column<string>(type: "text", nullable: false),
                    Puuid = table.Column<string>(type: "text", nullable: false),
                    BadgeId = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MatchBadges", x => new { x.MatchId, x.Puuid, x.BadgeId });
                });

            migrationBuilder.CreateTable(
                name: "PlayerAchievements",
                columns: table => new
                {
                    Puuid = table.Column<string>(type: "text", nullable: false),
                    AchievementId = table.Column<string>(type: "text", nullable: false),
                    EarnedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlayerAchievements", x => new { x.Puuid, x.AchievementId });
                });

            migrationBuilder.CreateIndex(
                name: "IX_Matches_CreatedAt",
                table: "Matches",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AchievementProgress_AchievementId_Scope_Tier",
                table: "AchievementProgress",
                columns: new[] { "AchievementId", "Scope", "Tier" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AchievementProgress");

            migrationBuilder.DropTable(
                name: "AppSettings");

            migrationBuilder.DropTable(
                name: "ChampionMasteries");

            migrationBuilder.DropTable(
                name: "MatchBadges");

            migrationBuilder.DropTable(
                name: "PlayerAchievements");

            migrationBuilder.DropIndex(
                name: "IX_Matches_CreatedAt",
                table: "Matches");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Matches");
        }
    }
}
