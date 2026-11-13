using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace summon.Migrations
{
    /// <inheritdoc />
    public partial class AddRunes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Keystone",
                table: "MatchParticipants",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SecondaryStyle",
                table: "MatchParticipants",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Matches stored before this migration keep their raw JSON, so their runes are filled from it; missing styles stay 0
            migrationBuilder.Sql("""
                UPDATE "MatchParticipants" AS mp
                SET "Keystone" = COALESCE((p->'perks'->'styles'->0->'selections'->0->>'perk')::int, 0),
                    "SecondaryStyle" = COALESCE((p->'perks'->'styles'->1->>'style')::int, 0)
                FROM "Matches" AS m, jsonb_array_elements(m."Data"->'info'->'participants') AS p
                WHERE mp."MatchId" = m."MatchId" AND p->>'puuid' = mp."Puuid";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Keystone",
                table: "MatchParticipants");

            migrationBuilder.DropColumn(
                name: "SecondaryStyle",
                table: "MatchParticipants");
        }
    }
}
