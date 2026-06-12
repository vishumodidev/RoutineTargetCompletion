import { useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { HabitContext } from '../../context/HabitContext';
import { AchievementContext } from '../../context/AchievementContext';
import { getLevelDetails } from '../../utils';
import { 
  User as UserIcon, 
  Mail, 
  Calendar as CalendarIcon, 
  Trophy, 
  Flame, 
  CheckSquare,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user } = useContext(AuthContext);
  const { habits, fetchHabits } = useContext(HabitContext);
  const { unlockedAchievements, fetchAchievements } = useContext(AchievementContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHabits();
    fetchAchievements();
  }, [fetchHabits, fetchAchievements]);

  if (!user) return null;

  const { level, percent, xpRemaining, nextLevelXP } = getLevelDetails(user.xp);

  // Grouped user profile rows
  const profileDetails = [
    { label: 'Character Name', value: user.name, icon: UserIcon, color: 'text-brand-primary' },
    { label: 'Email Address', value: user.email, icon: Mail, color: 'text-cyan-400' },
    { label: 'Join Date', value: user.joinDate || 'N/A', icon: CalendarIcon, color: 'text-emerald-400' },
  ];

  const profileStats = [
    { 
      label: 'Longest Streak', 
      value: `${user.longestStreak || 0} Days`, 
      icon: Flame, 
      color: 'text-orange-400', 
      bg: 'bg-orange-500/10',
      action: () => navigate('/calendar')
    },
    { 
      label: 'Total Quests (Habits)', 
      value: `${habits.length} Habits`, 
      icon: CheckSquare, 
      color: 'text-brand-primary', 
      bg: 'bg-brand-primary/10',
      action: () => navigate('/habits')
    },
    { 
      label: 'Milestones Unlocked', 
      value: `${unlockedAchievements.length} Badges`, 
      icon: Trophy, 
      color: 'text-yellow-400', 
      bg: 'bg-yellow-500/10',
      action: () => navigate('/achievements')
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center">
          <UserIcon className="h-7 w-7 text-brand-primary mr-2.5" />
          Hero Profile
        </h1>
        <p className="text-text-secondary text-sm">Review your character sheets, statistics totals, and streaks</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Avatar & Character Specs */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-bg-card border border-border-dark rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-brand-primary via-purple-500 to-cyan-400" />
            
            {/* Avatar block */}
            <div className="h-24 w-24 rounded-2xl bg-brand-primary/15 border border-brand-primary/30 flex items-center justify-center text-4xl mt-4 select-none">
              👤
            </div>

            <h2 className="text-lg font-black text-white mt-4 tracking-wide">{user.name}</h2>
            <span className="flex items-center text-[10px] font-extrabold tracking-wider bg-brand-primary/20 border border-brand-primary/30 text-brand-primary px-3 py-1 rounded-full uppercase mt-1.5">
              LVL {level} Warrior
            </span>

            {/* XP progress bar */}
            <div className="w-full mt-6 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-text-secondary">
                <span>{user.xp} XP Earned</span>
                <span>{nextLevelXP ? `${nextLevelXP} XP` : 'MAX'}</span>
              </div>
              
              <div className="w-full bg-bg-input h-2 rounded-full overflow-hidden border border-border-dark">
                <div 
                  className="bg-gradient-to-r from-brand-primary to-purple-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${percent}%` }}
                />
              </div>
              
              {nextLevelXP && (
                <p className="text-[10px] text-text-secondary">
                  Earn {xpRemaining} more XP to reach Level {level + 1}!
                </p>
              )}
            </div>
          </div>

          {/* Profile details details card */}
          <div className="bg-bg-card border border-border-dark rounded-2xl p-6 divide-y divide-border-dark">
            {profileDetails.map((detail, i) => {
              const IconComponent = detail.icon;
              return (
                <div key={i} className="py-4 first:pt-0 last:pb-0 flex items-center space-x-3.5">
                  <div className={`p-2 bg-bg-input border border-border-dark rounded-xl ${detail.color}`}>
                    <IconComponent className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">
                      {detail.label}
                    </span>
                    <span className="text-sm font-semibold text-white truncate block mt-0.5">
                      {detail.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Hero Metrics Sheet */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
            Gamification Stats Sheet
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {profileStats.map((stat, i) => {
              const IconComponent = stat.icon;
              return (
                <button
                  key={i}
                  onClick={stat.action}
                  className="bg-bg-card border border-border-dark hover:border-brand-primary/30 rounded-2xl p-6 text-left transition-all duration-200 group flex flex-col justify-between aspect-[4/3] cursor-pointer"
                >
                  <div className="flex justify-between items-start w-full">
                    <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  <div className="mt-4">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">
                      {stat.label}
                    </span>
                    <h4 className="text-xl font-extrabold text-white mt-1">
                      {stat.value}
                    </h4>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Life Gamification rules block info */}
          <div className="bg-bg-card border border-border-dark rounded-2xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center">
              <Sparkles className="h-4.5 w-4.5 text-yellow-400 mr-2" />
              Hero Progression Guide
            </h4>
            
            <p className="text-xs text-text-secondary leading-relaxed">
              Quest XP is automatically added to your character sheet whenever today's quest list checkins are logged. Cross experience benchmarks to trigger Level Up events:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              {[
                { lvl: 1, xp: '0 XP' },
                { lvl: 2, xp: '100 XP' },
                { lvl: 3, xp: '250 XP' },
                { lvl: 4, xp: '500 XP' },
                { lvl: 5, xp: '1000 XP' }
              ].map((tier) => (
                <div 
                  key={tier.lvl}
                  className={`p-3 rounded-xl border text-center ${
                    level === tier.lvl 
                      ? 'bg-brand-primary/10 border-brand-primary text-brand-primary font-bold' 
                      : 'bg-bg-input/50 border-border-dark text-text-secondary text-xs'
                  }`}
                >
                  <div className="font-extrabold">Lvl {tier.lvl}</div>
                  <div className="text-[10px] mt-0.5">{tier.xp}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
