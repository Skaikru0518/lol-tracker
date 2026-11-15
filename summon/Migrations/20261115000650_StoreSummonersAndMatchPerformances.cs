using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace summon.Migrations
{
    /// <inheritdoc />
    public partial class StoreSummonersAndMatchPerformances : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MatchPerformances",
                columns: table => new
                {
                    MatchId = table.Column<string>(type: "text", nullable: false),
                    Data = table.Column<string>(type: "jsonb", nullable: false),
                    Summary = table.Column<string>(type: "jsonb", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MatchPerformances", x => x.MatchId);
                });

            migrationBuilder.CreateTable(
                name: "Summoners",
                columns: table => new
                {
                    Puuid = table.Column<string>(type: "text", nullable: false),
                    ProfileIconId = table.Column<int>(type: "integer", nullable: false),
                    SummonerLevel = table.Column<long>(type: "bigint", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Summoners", x => x.Puuid);
                    table.ForeignKey(
                        name: "FK_Summoners_Accounts_Puuid",
                        column: x => x.Puuid,
                        principalTable: "Accounts",
                        principalColumn: "Puuid",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MatchPerformances");

            migrationBuilder.DropTable(
                name: "Summoners");
        }
    }
}
