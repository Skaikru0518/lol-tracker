using Microsoft.EntityFrameworkCore;

namespace summon.Data
{
    public class SummonDbContext(DbContextOptions<SummonDbContext> options) : DbContext(options)
    {
        public DbSet<Account> Accounts => Set<Account>();
        public DbSet<RankedEntry> RankedEntries => Set<RankedEntry>();
        public DbSet<Match> Matches => Set<Match>();
        public DbSet<MatchParticipant> MatchParticipants => Set<MatchParticipant>();
        public DbSet<LpSnapshot> LpSnapshots => Set<LpSnapshot>();

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
                // Baselines read the recent ranked games across all players
                match.HasIndex(m => new { m.QueueId, m.GameCreation });
            });

            modelBuilder.Entity<MatchParticipant>(participant =>
            {
                participant.HasKey(p => new { p.MatchId, p.Puuid });
                participant.HasIndex(p => p.Puuid);
                participant.HasOne(p => p.Match).WithMany(m => m.Participants).HasForeignKey(p => p.MatchId);
            });

            modelBuilder.Entity<LpSnapshot>(snapshot =>
            {
                // CreatedAt last, so the newest snapshots of a queue come straight from the index
                snapshot.HasIndex(s => new { s.Puuid, s.QueueType, s.CreatedAt });
                snapshot.HasOne(s => s.Account).WithMany().HasForeignKey(s => s.Puuid);
            });
        }

    }
}
