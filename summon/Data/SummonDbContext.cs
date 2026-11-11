using Microsoft.EntityFrameworkCore;

namespace summon.Data
{
    public class SummonDbContext(DbContextOptions<SummonDbContext> options) : DbContext(options)
    {
        public DbSet<Account> Accounts => Set<Account>();
        public DbSet<RankedEntry> RankedEntries => Set<RankedEntry>();

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
        }

    }
}
