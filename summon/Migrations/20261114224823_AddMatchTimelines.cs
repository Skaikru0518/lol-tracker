using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace summon.Migrations
{
    /// <inheritdoc />
    public partial class AddMatchTimelines : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MatchTimelines",
                columns: table => new
                {
                    MatchId = table.Column<string>(type: "text", nullable: false),
                    Data = table.Column<string>(type: "jsonb", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MatchTimelines", x => x.MatchId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MatchTimelines_UpdatedAt",
                table: "MatchTimelines",
                column: "UpdatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MatchTimelines");
        }
    }
}
