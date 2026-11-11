using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace summon.Migrations
{
    /// <inheritdoc />
    public partial class AddItemsAndSpells : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int[]>(
                name: "Items",
                table: "MatchParticipants",
                type: "integer[]",
                nullable: false,
                defaultValue: new int[0]);

            migrationBuilder.AddColumn<int>(
                name: "Spell1",
                table: "MatchParticipants",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Spell2",
                table: "MatchParticipants",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Matches stored before this migration keep their raw JSON, so their items and spells are filled from it
            migrationBuilder.Sql("""
                UPDATE "MatchParticipants" AS mp
                SET "Items" = ARRAY[(p->>'item0')::int, (p->>'item1')::int, (p->>'item2')::int, (p->>'item3')::int,
                                    (p->>'item4')::int, (p->>'item5')::int, (p->>'item6')::int],
                    "Spell1" = (p->>'summoner1Id')::int,
                    "Spell2" = (p->>'summoner2Id')::int
                FROM "Matches" AS m, jsonb_array_elements(m."Data"->'info'->'participants') AS p
                WHERE mp."MatchId" = m."MatchId" AND p->>'puuid' = mp."Puuid";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Items",
                table: "MatchParticipants");

            migrationBuilder.DropColumn(
                name: "Spell1",
                table: "MatchParticipants");

            migrationBuilder.DropColumn(
                name: "Spell2",
                table: "MatchParticipants");
        }
    }
}
