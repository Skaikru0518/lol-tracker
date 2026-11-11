using Microsoft.EntityFrameworkCore;

namespace summon.Data
{
    public class SummonDbContext(DbContextOptions<SummonDbContext> options) : DbContext(options)
    {
        public DbSet<Account> Accounts => Set<Account>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Account>(account =>
            {
                account.HasKey(a => a.Puuid);
                account.HasIndex(a => new { a.GameName, a.TagLine });
            });
        }
    }
}
