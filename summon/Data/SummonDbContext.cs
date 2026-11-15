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
        public DbSet<PlayerAchievement> PlayerAchievements => Set<PlayerAchievement>();
        public DbSet<AchievementProgress> AchievementProgress => Set<AchievementProgress>();
        public DbSet<MatchBadge> MatchBadges => Set<MatchBadge>();
        public DbSet<AppSetting> AppSettings => Set<AppSetting>();
        public DbSet<MatchTimeline> MatchTimelines => Set<MatchTimeline>();
        public DbSet<Summoner> Summoners => Set<Summoner>();
        public DbSet<MatchPerformance> MatchPerformances => Set<MatchPerformance>();
        public DbSet<PerformanceBaseline> PerformanceBaselines => Set<PerformanceBaseline>();
        public DbSet<ChampionMastery> ChampionMasteries => Set<ChampionMastery>();

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
                // The achievement job looks for players with games stored since its last run
                match.Property(m => m.CreatedAt).HasDefaultValueSql("now()");
                match.HasIndex(m => m.CreatedAt);
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

            modelBuilder.Entity<PlayerAchievement>().HasKey(a => new { a.Puuid, a.AchievementId });

            modelBuilder.Entity<AchievementProgress>(progress =>
            {
                progress.HasKey(p => new { p.Puuid, p.AchievementId, p.Scope });
                // Rarity counts the rows of each achievement, scope and tier
                progress.HasIndex(p => new { p.AchievementId, p.Scope, p.Tier });
            });

            modelBuilder.Entity<MatchBadge>().HasKey(b => new { b.MatchId, b.Puuid, b.BadgeId });
            modelBuilder.Entity<AppSetting>().HasKey(s => s.Key);
            modelBuilder.Entity<Summoner>(summoner =>
            {
                summoner.HasKey(s => s.Puuid);
                summoner.HasOne(s => s.Account).WithOne().HasForeignKey<Summoner>(s => s.Puuid);
            });
            modelBuilder.Entity<MatchPerformance>(performance =>
            {
                performance.HasKey(p => p.MatchId);
                performance.Property(p => p.Data).HasColumnType("jsonb");
                performance.Property(p => p.Summary).HasColumnType("jsonb");
                performance.Property(p => p.CreatedAt).HasDefaultValueSql("now()");
            });
            modelBuilder.Entity<PerformanceBaseline>(baseline =>
            {
                baseline.Property(b => b.Data).HasColumnType("jsonb");
                baseline.Property(b => b.ComputedAt).HasDefaultValueSql("now()");
                baseline.HasIndex(b => b.ComputedAt);
            });
            modelBuilder.Entity<MatchTimeline>(timeline =>
            {
                timeline.HasKey(t => t.MatchId);
                timeline.Property(t => t.Data).HasColumnType("jsonb");
                timeline.HasIndex(t => t.UpdatedAt);
            });
            modelBuilder.Entity<ChampionMastery>().HasKey(m => new { m.Puuid, m.ChampionId });
        }

    }
}
