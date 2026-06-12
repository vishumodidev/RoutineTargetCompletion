import { useContext, useEffect } from 'react';
import { AchievementContext } from '../../context/AchievementContext';
import { AuthContext } from '../../context/AuthContext';
import { 
  Trophy, 
  Lock, 
  CheckCircle
} from 'lucide-react';

export default function Achievements() {
  const { user } = useContext(AuthContext);
  const { unlockedAchievements, loading, fetchAchievements } = useContext(AchievementContext);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  if (!user) return null;

  // Streak/completion calculations
  const longestStreak = user.longestStreak || 0;
  const currentXP = user.xp || 0;

  // Defined static achievement templates
  const achievementsTemplates = [
    {
      id: 'first_habit',
      title: 'First Habit Completed',
      desc: 'Embark on your adventure and log your very first habit completion.',
      badge: '🥇',
      criteria: '1 completion logged',
      getTargetProgress: () => {
        // If they have any XP or any unlocked achievement, they completed a habit
        const unlocked = unlockedAchievements.some(a => a.badgeName === 'First Habit Completed');
        return {
          current: unlocked ? 1 : 0,
          target: 1,
          percent: unlocked ? 100 : 0
        };
      }
    },
    {
      id: 'streak_7',
      title: '7 Day Streak',
      desc: 'Demonstrate dedication by completing habits for 7 consecutive days.',
      badge: '🔥',
      criteria: '7 day longest streak',
      getTargetProgress: () => {
        return {
          current: longestStreak,
          target: 7,
          percent: Math.min(100, Math.round((longestStreak / 7) * 100))
        };
      }
    },
    {
      id: 'streak_30',
      title: '30 Day Streak',
      desc: 'Achieve ultimate consistency by maintaining a 30-day habit streak.',
      badge: '👑',
      criteria: '30 day longest streak',
      getTargetProgress: () => {
        return {
          current: longestStreak,
          target: 30,
          percent: Math.min(100, Math.round((longestStreak / 30) * 100))
        };
      }
    },
    {
      id: 'tasks_100',
      title: '100 Tasks Completed',
      desc: 'Complete 100 habit checklists to solidify your routine.',
      badge: '⚡',
      criteria: '100 total checklist checkins',
      getTargetProgress: () => {
        // Estimate checkins using XP since average XP per habit is ~10
        // (If they unlocked the actual badge, force 100%)
        const unlocked = unlockedAchievements.some(a => a.badgeName === '100 Tasks Completed');
        const estimateCount = Math.round(currentXP / 10);
        return {
          current: unlocked ? 100 : Math.min(99, estimateCount),
          target: 100,
          percent: unlocked ? 100 : Math.min(99, Math.round((estimateCount / 100) * 100))
        };
      }
    },
    {
      id: 'xp_1000',
      title: '1000 XP Earned',
      desc: 'Earn 1000 total experience points to become a legendary hero.',
      badge: '🌟',
      criteria: 'Accumulate 1,000 XP',
      getTargetProgress: () => {
        return {
          current: currentXP,
          target: 1000,
          percent: Math.min(100, Math.round((currentXP / 1000) * 100))
        };
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center">
          <Trophy className="h-7 w-7 text-yellow-400 mr-2.5" />
          Hero Achievements
        </h1>
        <p className="text-text-secondary text-sm">Review your milestones, unlocked badges, and progress towards legendary status</p>
      </div>

      {/* Grid of Badges */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-bg-card border border-border-dark rounded-2xl p-6 flex space-x-4 animate-pulse">
              <div className="h-16 w-16 bg-bg-input rounded-xl" />
              <div className="flex-1 space-y-3">
                <div className="h-5 bg-bg-input rounded w-1/3" />
                <div className="h-4 bg-bg-input rounded w-3/4" />
                <div className="h-2 bg-bg-input rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {achievementsTemplates.map((template) => {
            // Check if user unlocked this badge
            const unlockInfo = unlockedAchievements.find(
              (a) => a.badgeName.toLowerCase() === template.title.toLowerCase()
            );
            const isUnlocked = !!unlockInfo;
            const { current, target, percent } = template.getTargetProgress();

            return (
              <div
                key={template.id}
                className={`bg-bg-card border rounded-2xl p-6 flex items-start space-x-5 transition-all duration-300 relative overflow-hidden group ${
                  isUnlocked 
                    ? 'border-brand-primary/30 hover:border-brand-primary/50 shadow-lg shadow-brand-primary/5' 
                    : 'border-border-dark opacity-75'
                }`}
              >
                {/* Background visual highlight on unlock */}
                {isUnlocked && (
                  <div className="absolute right-0 top-0 w-24 h-24 bg-brand-primary/5 rounded-full blur-2xl group-hover:bg-brand-primary/10 transition-colors pointer-events-none" />
                )}

                {/* Badge Icon Slot */}
                <div className={`h-16 w-16 rounded-2xl border flex items-center justify-center text-3xl select-none flex-shrink-0 transition-transform duration-300 ${
                  isUnlocked 
                    ? 'bg-brand-primary/10 border-brand-primary/30 text-white group-hover:scale-110' 
                    : 'bg-bg-input border-border-dark text-text-secondary grayscale'
                }`}>
                  {template.badge}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-white truncate tracking-wide">
                      {template.title}
                    </h3>
                    
                    {isUnlocked ? (
                      <span className="flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Unlocked
                      </span>
                    ) : (
                      <span className="flex items-center text-[10px] font-bold text-text-secondary bg-bg-input border border-border-dark px-2 py-0.5 rounded-full">
                        <Lock className="h-3 w-3 mr-1" />
                        Locked
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                    {template.desc}
                  </p>

                  <div className="pt-2">
                    {/* Progress Detail */}
                    <div className="flex justify-between items-center text-[10px] font-semibold text-text-secondary mb-1">
                      <span>Requirement: {template.criteria}</span>
                      <span>{current} / {target}</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-bg-input h-1.5 rounded-full overflow-hidden border border-border-dark">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isUnlocked 
                            ? 'bg-gradient-to-r from-brand-primary to-purple-400' 
                            : 'bg-text-secondary/40'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {isUnlocked && unlockInfo.unlockedDate && (
                    <p className="text-[9px] text-brand-primary font-bold pt-1">
                      Achieved on: {unlockInfo.unlockedDate.split('T')[0]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
