using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace summon.Migrations
{
    /// <inheritdoc />
    public partial class AddPlacement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Placement",
                table: "MatchParticipants",
                type: "integer",
                nullable: true);

            // Matches stored before this migration keep their raw JSON, so their Arena placement is filled from it
            migrationBuilder.Sql("""
                UPDATE "MatchParticipants" AS mp
                SET "Placement" = (p->>'placement')::int
                FROM "Matches" AS m, jsonb_array_elements(m."Data"->'info'->'participants') AS p
                WHERE mp."MatchId" = m."MatchId" AND p->>'puuid' = mp."Puuid";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Placement",
                table: "MatchParticipants");
        }
    }
}
