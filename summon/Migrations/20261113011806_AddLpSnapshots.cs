using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace summon.Migrations
{
    /// <inheritdoc />
    public partial class AddLpSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LpSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Puuid = table.Column<string>(type: "text", nullable: false),
                    QueueType = table.Column<string>(type: "text", nullable: false),
                    Tier = table.Column<string>(type: "text", nullable: false),
                    Rank = table.Column<string>(type: "text", nullable: false),
                    Lp = table.Column<int>(type: "integer", nullable: false),
                    Wins = table.Column<int>(type: "integer", nullable: true),
                    Losses = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LpSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LpSnapshots_Accounts_Puuid",
                        column: x => x.Puuid,
                        principalTable: "Accounts",
                        principalColumn: "Puuid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LpSnapshots_Puuid_QueueType",
                table: "LpSnapshots",
                columns: new[] { "Puuid", "QueueType" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LpSnapshots");
        }
    }
}
