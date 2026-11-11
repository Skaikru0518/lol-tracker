using Microsoft.EntityFrameworkCore;

namespace summon.Data
{
    public class SummonDbContext(DbContextOptions<SummonDbContext> options) : DbContext(options)
    {
        public DbSet<Account> Accounts => Set<Account>();
        public DbSet<RankedEntry> RankedEntries => Set<RankedEntry>();
        public DbSet<Match> Matches => Set<Match>();
        public DbSet<MatchParticipant> MatchParticipants => Set<MatchParticipant>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Account>(account =>
            {
                account.HasKey(a => a.Puuid);
                account.HasIndex(a => new { a.GameName, a.TagLine });
            });

            modelBuilder.Entity<RankedEntry>(entry =>
            {
                entry.HasKey(e => new { e.Puuid, e.QueueType });
                entry.HasOne(e => e.Account).WithMany(a => a.RankedEntries).HasForeignKey(e => e.Puuid);
            });

            modelBuilder.Entity<Match>(match =>
            {
                match.HasKey(m => m.MatchId);
                match.Property(m => m.Data).HasColumnType("jsonb");
            });

            modelBuilder.Entity<MatchParticipant>(participant =>
            {
                participant.HasKey(p => new { p.MatchId, p.Puuid });
                participant.HasIndex(p => p.Puuid);
                participant.HasOne(p => p.Match).WithMany(m => m.Participants).HasForeignKey(p => p.MatchId);
            });
        }

    }
}
