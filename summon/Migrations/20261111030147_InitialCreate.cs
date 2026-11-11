using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace summon.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Accounts",
                columns: table => new
                {
                    Puuid = table.Column<string>(type: "text", nullable: false),
                    GameName = table.Column<string>(type: "text", nullable: false),
                    TagLine = table.Column<string>(type: "text", nullable: false),
                    Platform = table.Column<string>(type: "text", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Accounts", x => x.Puuid);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_GameName_TagLine",
                table: "Accounts",
                columns: new[] { "GameName", "TagLine" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Accounts");
        }
    }
}
