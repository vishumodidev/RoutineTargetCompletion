import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { DashboardContext } from '../../context/DashboardContext';
import { 
  Trophy, 
  Zap, 
  Plus, 
  ArrowRight, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  Award, 
  Sparkles,
  BookOpen,
  Dumbbell,
  Code,
  Heart,
  Smile
} from 'lucide-react';
import { getLevelDetails } from '../../utils';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const { todayQuests, achievementsCount, loading, fetchDashboard, toggleQuest } = useContext(DashboardContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (!user) return null;

  const { level, xpRemaining } = getLevelDetails(user.xp);

  // Dynamic statistics calculations
  const completedCount = todayQuests.filter(q => q.completed).length;
  const totalCount = todayQuests.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const stats = [
    { label: 'Level', value: `Level ${level}`, detail: `Unlock next tier at ${level * 250} XP`, icon: Award, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Current Streak', value: `${user.streak || 0} Days`, detail: 'Earn badge multipliers!', icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Total Experience', value: `${user.xp} XP`, detail: `${xpRemaining} XP to next Level`, icon: Sparkles, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Quest Completion', value: `${completionRate}%`, detail: `${completedCount} of ${totalCount} completed`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  // Helper to resolve icon by category name
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Gym':
        return { icon: Dumbbell, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
      case 'Reading':
        return { icon: BookOpen, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
      case 'Coding':
        return { icon: Code, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' };
      default:
        return { icon: Heart, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' };
    }
  };

  // Static badge showcases based on unlocked achievements count
  const getAchievementsShowcase = () => {
    const list = [];
    if (achievementsCount >= 1) {
      list.push({ title: 'First Quest Cleared', badge: '🥇', desc: 'Completed your first daily habit check!' });
    }
    if (user.longestStreak >= 7) {
      list.push({ title: 'Streak Apprentice', badge: '🔥', desc: 'Achieved a legendary 7-day streak.' });
    }
    if (user.xp >= 100) {
      list.push({ title: 'Level 2 Warrior', badge: '🛡️', desc: 'Crossed the threshold of 100 total XP.' });
    }

    if (list.length === 0) {
      return (
        <div className="p-4 bg-bg-dark/20 border border-border-dark/50 rounded-xl text-center">
          <Trophy className="h-8 w-8 text-text-secondary mx-auto mb-2 opacity-30" />
          <p className="text-xs text-text-secondary">No achievements unlocked yet. Complete quests to earn badges!</p>
        </div>
      );
    }

    return list.map((ach, i) => (
      <div key={i} className="flex space-x-3">
        <div className="text-2xl p-2.5 rounded-lg bg-bg-input border border-border-dark h-12 w-12 flex items-center justify-center flex-shrink-0 select-none">
          {ach.badge}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-white">{ach.title}</h4>
          <p className="text-[10px] text-text-secondary truncate mt-0.5">{ach.desc}</p>
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-primary/20 via-purple-600/10 to-transparent border border-brand-primary/20 p-6 md:p-8">
        <div className="relative z-10 max-w-xl">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2">
            Welcome Back, Hero {user.name}!
          </h1>
          <p className="text-text-secondary text-sm md:text-base mb-6 leading-relaxed">
            Your quests are waiting for you. Level up your life by completing your habits and unlocking legendary achievements.
          </p>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => navigate('/habits')}
              className="flex items-center px-4 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white text-sm font-semibold rounded-lg shadow-lg shadow-brand-primary/10 transition-all duration-200 cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Quest
            </button>
            <button 
              onClick={() => navigate('/analytics')}
              className="flex items-center px-4 py-2.5 bg-bg-input hover:bg-bg-input/80 text-text-primary text-sm font-semibold rounded-lg transition-all duration-200 border border-border-dark cursor-pointer"
            >
              View Analytics
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 top-0 opacity-15 pointer-events-none hidden md:block w-96 bg-gradient-radial from-brand-primary/40 to-transparent" />
      </div>

      {/* Statistics Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const IconComp = stat.icon;
          return (
            <div 
              key={idx} 
              className="p-5 bg-bg-card border border-border-dark rounded-xl flex items-center space-x-4 hover:shadow-xl hover:border-brand-primary/30 transition-all duration-300"
            >
              <div className={`p-3 rounded-lg ${stat.bg} ${stat.color} flex-shrink-0`}>
                <IconComp className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-secondary font-medium tracking-wide uppercase">{stat.label}</p>
                <h4 className="text-lg font-bold text-white mt-1">{stat.value}</h4>
                <p className="text-[11px] text-text-secondary truncate mt-0.5">{stat.detail}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* Quests & Achievements Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Today's Quest Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center">
              <CalendarIcon className="h-5 w-5 text-brand-primary mr-2" />
              Today's Quests
            </h3>
            <span className="text-xs text-brand-primary font-bold cursor-pointer hover:underline" onClick={() => navigate('/habits')}>
              Manage Quests
            </span>
          </div>

          {loading && todayQuests.length === 0 ? (
            <div className="bg-bg-card border border-border-dark rounded-xl divide-y divide-border-dark overflow-hidden animate-pulse">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-5 flex items-center justify-between">
                  <div className="flex items-center space-x-3.5 flex-1">
                    <div className="h-10 w-10 bg-bg-input rounded-lg" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-bg-input rounded w-1/3" />
                      <div className="h-3 bg-bg-input rounded w-1/4" />
                    </div>
                  </div>
                  <div className="h-8 w-20 bg-bg-input rounded" />
                </div>
              ))}
            </div>
          ) : todayQuests.length === 0 ? (
            <div className="text-center py-12 bg-bg-card border border-border-dark rounded-xl p-8">
              <Smile className="h-10 w-10 text-brand-primary mx-auto mb-3 opacity-40 animate-bounce" />
              <h4 className="text-sm font-bold text-white mb-1">No Quests Scheduled for Today</h4>
              <p className="text-xs text-text-secondary max-w-xs mx-auto mb-4">
                Configure habits inside the manager to start earning experience points today.
              </p>
              <button
                onClick={() => navigate('/habits')}
                className="px-3 py-1.5 bg-brand-primary hover:bg-brand-secondary text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Go to Quest Manager
              </button>
            </div>
          ) : (
            <div className="bg-bg-card border border-border-dark rounded-xl divide-y divide-border-dark overflow-hidden">
              {todayQuests.map((habit) => {
                const { icon: HabitIcon, color, bg, border } = getCategoryIcon(habit.category);
                return (
                  <div key={habit.habitId} className="p-4 flex items-center justify-between hover:bg-bg-dark/25 transition-colors group">
                    <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                      <div className={`h-10 w-10 rounded-lg ${bg} ${border} border flex items-center justify-center`}>
                        <HabitIcon className={`h-5 w-5 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-semibold truncate ${habit.completed ? 'line-through text-text-secondary' : 'text-white'}`}>
                          {habit.habitName}
                        </h4>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-bg-input text-text-secondary mt-1">
                          {habit.category} • +{habit.xpReward} XP
                        </span>
                      </div>
                    </div>

                    {/* Complete Button */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleQuest(habit.habitId, !habit.completed)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                          habit.completed 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-bg-input border border-border-dark text-text-secondary hover:text-white hover:bg-brand-primary/20 hover:border-brand-primary/30'
                        }`}
                      >
                        {habit.completed ? 'Completed' : 'Mark Done'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Achievements & Fast Actions */}
        <div className="space-y-6">
          {/* Achievements Card */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center">
              <Trophy className="h-5 w-5 text-yellow-400 mr-2" />
              Achievements
            </h3>

            <div className="bg-bg-card border border-border-dark rounded-xl p-5 space-y-4">
              {getAchievementsShowcase()}
              
              <button 
                onClick={() => navigate('/achievements')}
                className="w-full text-center text-xs font-bold text-brand-primary hover:text-brand-secondary transition-colors pt-2 border-t border-border-dark block cursor-pointer"
              >
                View All Badges ({achievementsCount} Unlocked)
              </button>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => navigate('/habits')}
                className="p-4 bg-bg-card hover:bg-bg-input border border-border-dark hover:border-brand-primary/30 rounded-xl text-center transition-all duration-200 group cursor-pointer"
              >
                <div className="h-8 w-8 bg-brand-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2 text-brand-primary group-hover:scale-110 transition-transform">
                  <Plus className="h-4.5 w-4.5" />
                </div>
                <span className="text-xs font-bold text-white">New Quest</span>
              </button>
              <button 
                onClick={() => navigate('/calendar')}
                className="p-4 bg-bg-card hover:bg-bg-input border border-border-dark hover:border-brand-primary/30 rounded-xl text-center transition-all duration-200 group cursor-pointer"
              >
                <div className="h-8 w-8 bg-purple-500/10 rounded-lg flex items-center justify-center mx-auto mb-2 text-purple-400 group-hover:scale-110 transition-transform">
                  <CalendarIcon className="h-4.5 w-4.5" />
                </div>
                <span className="text-xs font-bold text-white">Calendar</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
