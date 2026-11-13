using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace summon.Migrations
{
    /// <inheritdoc />
    public partial class AddChampLevel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ChampLevel",
                table: "MatchParticipants",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Matches stored before this migration keep their raw JSON, so their champion level is filled from it
            migrationBuilder.Sql("""
                UPDATE "MatchParticipants" AS mp
                SET "ChampLevel" = (p->>'champLevel')::int
                FROM "Matches" AS m, jsonb_array_elements(m."Data"->'info'->'participants') AS p
                WHERE mp."MatchId" = m."MatchId" AND p->>'puuid' = mp."Puuid";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ChampLevel",
                table: "MatchParticipants");
        }
    }
}
