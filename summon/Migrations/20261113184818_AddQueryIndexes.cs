using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace summon.Migrations
{
    /// <inheritdoc />
    public partial class AddQueryIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LpSnapshots_Puuid_QueueType",
                table: "LpSnapshots");

            migrationBuilder.CreateIndex(
                name: "IX_Matches_QueueId_GameCreation",
                table: "Matches",
                columns: new[] { "QueueId", "GameCreation" });

            migrationBuilder.CreateIndex(
                name: "IX_LpSnapshots_Puuid_QueueType_CreatedAt",
                table: "LpSnapshots",
                columns: new[] { "Puuid", "QueueType", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Matches_QueueId_GameCreation",
                table: "Matches");

            migrationBuilder.DropIndex(
                name: "IX_LpSnapshots_Puuid_QueueType_CreatedAt",
                table: "LpSnapshots");

            migrationBuilder.CreateIndex(
                name: "IX_LpSnapshots_Puuid_QueueType",
                table: "LpSnapshots",
                columns: new[] { "Puuid", "QueueType" });
        }
    }
}
