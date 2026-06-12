import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { routineService, ROUTINE_TEMPLATES, PRIORITY_FORMULA } from '../../services/routineService';
import { 
  Dumbbell, 
  Briefcase, 
  TrendingUp, 
  Sparkles, 
  Heart, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Zap, 
  Award,
  Info,
  CheckCircle2,
  Coffee,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Routine() {
  const { user, updateXP } = useContext(AuthContext);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [completedActivities, setCompletedActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load logs for the selected date
  const loadRoutineLogs = async (userId, date) => {
    try {
      setLoading(true);
      const logs = await routineService.getRoutineLogs(userId, date);
      setCompletedActivities(logs);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load routine progress.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadRoutineLogs(user.userId, selectedDate);
    }
  }, [user, selectedDate]);

  if (!user) return null;

  // Determine current day-of-week and template to load
  const getDayDetails = (dateStr) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dateObj = new Date(dateStr);
    const dayIndex = dateObj.getDay();
    const dayName = days[dayIndex];
    
    let templateKey = 'weekday';
    if (dayIndex === 0) templateKey = 'sunday';
    else if (dayIndex === 6) templateKey = 'saturday';

    return { dayName, templateKey };
  };

  const { dayName, templateKey } = getDayDetails(selectedDate);
  const currentTemplate = ROUTINE_TEMPLATES[templateKey];

  // Helper to resolve icon by category name
  const getCategoryTheme = (category) => {
    switch (category) {
      case 'Health':
        return { 
          icon: Dumbbell, 
          color: 'text-emerald-400', 
          bg: 'bg-emerald-500/10', 
          border: 'border-emerald-500/30',
          accent: 'emerald'
        };
      case 'Job/Office':
        return { 
          icon: Briefcase, 
          color: 'text-indigo-400', 
          bg: 'bg-indigo-500/10', 
          border: 'border-indigo-500/30',
          accent: 'indigo'
        };
      case 'Mi Lifestyle':
        return { 
          icon: TrendingUp, 
          color: 'text-amber-400', 
          bg: 'bg-amber-500/10', 
          border: 'border-amber-500/30',
          accent: 'amber'
        };
      case 'Training & AI':
        return { 
          icon: Sparkles, 
          color: 'text-purple-400', 
          bg: 'bg-purple-500/10', 
          border: 'border-purple-500/30',
          accent: 'purple'
        };
      case 'Family/Rest':
      default:
        return { 
          icon: Coffee, 
          color: 'text-rose-400', 
          bg: 'bg-rose-500/10', 
          border: 'border-rose-500/30',
          accent: 'rose'
        };
    }
  };

  // Toggle routine item checked status
  const handleToggleActivity = async (activityId, xpReward) => {
    const isCompleted = completedActivities.includes(activityId);
    const nextCompleted = !isCompleted;
    
    // Optimistic UI updates
    setCompletedActivities((prev) => 
      nextCompleted ? [...prev, activityId] : prev.filter(id => id !== activityId)
    );

    try {
      const result = await routineService.toggleRoutineActivity(
        user.userId,
        activityId,
        selectedDate,
        nextCompleted,
        xpReward
      );

      if (result.success) {
        updateXP(result.xp, result.level, result.streak, result.longestStreak);
        
        // Check for level ups
        if (result.level > user.level) {
          toast.success(`🎉 LEVEL UP! You reached Level ${result.level}!`, {
            duration: 5000,
            style: {
              background: '#6366f1',
              color: '#ffffff',
              fontWeight: 'bold',
              border: '2px solid #818cf8'
            }
          });
        } else {
          if (nextCompleted) {
            toast.success(`Routine block completed! +${xpReward} XP`);
          } else {
            toast.error('Block marked incomplete.');
          }
        }
      }
    } catch (err) {
      console.error(err);
      // Revert on error
      setCompletedActivities((prev) => 
        isCompleted ? [...prev, activityId] : prev.filter(id => id !== activityId)
      );
      toast.error('Failed to log routine activity.');
    }
  };

  // Calculate actual hours completed for each Priority Formula category
  const getCategoryProgress = () => {
    const progress = {
      'Health': 0,
      'Job/Office': 0,
      'Mi Lifestyle': 0,
      'Training & AI': 0,
      'Family/Rest': 0
    };

    currentTemplate.forEach(item => {
      if (completedActivities.includes(item.id)) {
        progress[item.category] = (progress[item.category] || 0) + item.duration;
      }
    });

    return progress;
  };

  const categoryProgress = getCategoryProgress();

  // Date switching utilities
  const handlePrevDay = () => {
    const dateObj = new Date(selectedDate);
    dateObj.setDate(dateObj.getDate() - 1);
    setSelectedDate(dateObj.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const dateObj = new Date(selectedDate);
    dateObj.setDate(dateObj.getDate() + 1);
    setSelectedDate(dateObj.toISOString().split('T')[0]);
  };

  const setDateToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Format date readable
  const formatFriendlyDate = (dateStr) => {
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header and Date Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center">
            <Clock className="h-7 w-7 text-brand-primary mr-2.5" />
            Routine & Priority Tracker
          </h1>
          <p className="text-text-secondary text-sm">Follow your structured timeline & check target hours</p>
        </div>

        {/* Date Selector Switcher Widget */}
        <div className="flex items-center space-x-2 bg-bg-card border border-border-dark p-1.5 rounded-xl">
          <button
            onClick={handlePrevDay}
            className="p-2 bg-bg-input hover:text-white rounded-lg border border-border-dark transition-colors cursor-pointer"
            title="Previous Day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <div className="px-4 text-center min-w-[150px]">
            <p className="text-xs font-bold text-brand-primary">{dayName}</p>
            <p className="text-[10px] text-text-secondary font-medium whitespace-nowrap mt-0.5">
              {formatFriendlyDate(selectedDate)}
            </p>
          </div>

          <button
            onClick={handleNextDay}
            className="p-2 bg-bg-input hover:text-white rounded-lg border border-border-dark transition-colors cursor-pointer"
            title="Next Day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          
          {selectedDate !== new Date().toISOString().split('T')[0] && (
            <button
              onClick={setDateToToday}
              className="px-2.5 py-1.5 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-2xs font-extrabold rounded-lg hover:bg-brand-primary hover:text-white transition-all cursor-pointer"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Priority Formula Dynamic Dashboard */}
      <section className="bg-bg-card border border-border-dark rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-5 pointer-events-none w-96 h-96 bg-brand-primary rounded-full blur-3xl" />
        
        <h3 className="text-base font-bold text-white mb-4 tracking-tight flex items-center">
          <Award className="h-5 w-5 text-yellow-400 mr-2" />
          Priority Target Completion - {dayName} Focus Formula
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {PRIORITY_FORMULA.map((formulaItem) => {
            const currentHours = categoryProgress[formulaItem.category] || 0;
            const targetHours = formulaItem.target;
            const percent = Math.min(100, Math.round((currentHours / targetHours) * 100));
            const isCompleted = currentHours >= targetHours;
            const theme = getCategoryTheme(formulaItem.category);
            const IconComponent = theme.icon;

            return (
              <div 
                key={formulaItem.category}
                className={`p-4 bg-bg-dark/40 border rounded-xl flex flex-col justify-between transition-all duration-300 ${
                  isCompleted 
                    ? 'border-emerald-500/30 shadow-lg shadow-emerald-500/5' 
                    : 'border-border-dark hover:border-brand-primary/30'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary">
                      {formulaItem.category}
                    </span>
                    <div className={`p-1.5 rounded-md ${theme.bg} ${theme.color}`}>
                      <IconComponent className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className="text-xl font-black text-white">{currentHours}</span>
                    <span className="text-2xs text-text-secondary">/ {targetHours} {formulaItem.unit}</span>
                  </div>

                  <p className="text-[9px] text-text-secondary leading-normal mt-1.5 min-h-[1.5rem]">
                    {formulaItem.description}
                  </p>
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className={isCompleted ? 'text-emerald-400' : 'text-text-secondary'}>
                      {isCompleted ? 'Target Cleared!' : `${percent}% complete`}
                    </span>
                    {isCompleted && (
                      <span className="text-emerald-400 flex items-center">
                        <CheckCircle2 className="h-3 w-3 fill-emerald-500/20 text-emerald-400" />
                      </span>
                    )}
                  </div>
                  
                  <div className="w-full bg-bg-input h-1.5 rounded-full overflow-hidden border border-border-dark/60">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted 
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                          : 'bg-gradient-to-r from-brand-primary to-purple-400'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Routine Timeline and Weekly Focus columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Timeline Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center">
              <Clock className="h-5 w-5 text-brand-primary mr-2" />
              Timeline blocks ({currentTemplate.length} activities)
            </h3>
            
            <div className="flex items-center space-x-2 text-2xs font-extrabold text-brand-primary bg-brand-primary/10 border border-brand-primary/25 px-2.5 py-1 rounded-lg">
              <Zap className="h-3.5 w-3.5 fill-brand-primary" />
              <span>{completedActivities.length} / {currentTemplate.length} Completed</span>
            </div>
          </div>

          {loading ? (
            <div className="bg-bg-card border border-border-dark rounded-xl divide-y divide-border-dark overflow-hidden animate-pulse">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-5 flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
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
          ) : (
            <div className="bg-bg-card border border-border-dark rounded-xl divide-y divide-border-dark overflow-hidden">
              {currentTemplate.map((item) => {
                const theme = getCategoryTheme(item.category);
                const CategoryIcon = theme.icon;
                const isChecked = completedActivities.includes(item.id);

                return (
                  <div 
                    key={item.id} 
                    className={`p-4 flex items-center justify-between transition-colors duration-200 group ${
                      isChecked 
                        ? 'bg-brand-primary/5 hover:bg-brand-primary/10' 
                        : 'hover:bg-bg-dark/25'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                      {/* Left icon wrapper */}
                      <div className={`h-10 w-10 rounded-lg ${theme.bg} ${theme.border} border flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105`}>
                        <CategoryIcon className={`h-5 w-5 ${theme.color}`} />
                      </div>
                      
                      {/* Title & category details */}
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-semibold truncate transition-all duration-200 ${
                          isChecked ? 'line-through text-text-secondary/70' : 'text-white'
                        }`}>
                          {item.activity}
                        </h4>
                        
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[10px] font-bold text-text-secondary">
                          <span className="flex items-center text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded">
                            <Clock className="h-3 w-3 mr-1" />
                            {item.time} {item.duration > 0 && `(${item.duration}h)`}
                          </span>
                          <span className="bg-bg-input px-1.5 py-0.5 rounded">
                            {item.category}
                          </span>
                          <span className="text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded flex items-center">
                            +{item.xpReward} XP
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Completion Action */}
                    <div className="ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleToggleActivity(item.id, item.xpReward)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                          isChecked 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-500/5' 
                            : 'bg-bg-input border border-border-dark text-text-secondary hover:text-white hover:bg-brand-primary/20 hover:border-brand-primary/30'
                        }`}
                      >
                        {isChecked ? 'Completed' : 'Mark Done'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Weekly Focus Board & Info */}
        <div className="space-y-6">
          
          {/* Weekly Focus Board */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center">
              <Calendar className="h-5 w-5 text-brand-primary mr-2" />
              Weekly focus overview
            </h3>

            <div className="bg-bg-card border border-border-dark rounded-xl p-5 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-5 pointer-events-none w-48 h-48 bg-purple-500 rounded-full blur-2xl" />
              
              {/* Monday - Friday Focus Card */}
              <div className={`p-3.5 rounded-xl border transition-all ${
                templateKey === 'weekday'
                  ? 'bg-brand-primary/10 border-brand-primary/40 shadow-lg' 
                  : 'bg-bg-dark/40 border-border-dark/60 opacity-70'
              }`}>
                <div className="flex justify-between items-center mb-1.5">
                  <h4 className="text-xs font-black text-white">Monday – Friday</h4>
                  {templateKey === 'weekday' && (
                    <span className="text-[9px] font-extrabold text-brand-primary bg-brand-primary/20 border border-brand-primary/30 px-2 py-0.5 rounded-full animate-pulse">
                      Active Today
                    </span>
                  )}
                </div>
                <p className="text-2xs text-text-secondary leading-relaxed">
                  Focus on 🏢 **Office Work** (8 hours), 🚴/🧘 **Health** (2 hours), growing 💼 **Mi Lifestyle** (1 hour), and 🎯 **AI Career Growth** (1-2 hours) daily.
                </p>
              </div>

              {/* Saturday Focus Card */}
              <div className={`p-3.5 rounded-xl border transition-all ${
                templateKey === 'saturday'
                  ? 'bg-brand-primary/10 border-brand-primary/40 shadow-lg' 
                  : 'bg-bg-dark/40 border-border-dark/60 opacity-70'
              }`}>
                <div className="flex justify-between items-center mb-1.5">
                  <h4 className="text-xs font-black text-white">Saturday Focus</h4>
                  {templateKey === 'saturday' && (
                    <span className="text-[9px] font-extrabold text-brand-primary bg-brand-primary/20 border border-brand-primary/30 px-2 py-0.5 rounded-full animate-pulse">
                      Active Today
                    </span>
                  )}
                </div>
                <p className="text-2xs text-text-secondary leading-relaxed">
                  Deep focus on 💼 **Mi Lifestyle field work** (3 hours) & 🎯 **Training Content Creation** (2 hours). Rest of the day is family time.
                </p>
              </div>

              {/* Sunday Focus Card */}
              <div className={`p-3.5 rounded-xl border transition-all ${
                templateKey === 'sunday'
                  ? 'bg-brand-primary/10 border-brand-primary/40 shadow-lg' 
                  : 'bg-bg-dark/40 border-border-dark/60 opacity-70'
              }`}>
                <div className="flex justify-between items-center mb-1.5">
                  <h4 className="text-xs font-black text-white">Sunday Refresh</h4>
                  {templateKey === 'sunday' && (
                    <span className="text-[9px] font-extrabold text-brand-primary bg-brand-primary/20 border border-brand-primary/30 px-2 py-0.5 rounded-full animate-pulse">
                      Active Today
                    </span>
                  )}
                </div>
                <p className="text-2xs text-text-secondary leading-relaxed">
                  Recharge with family and temple visits. Complete weekly planning, record training videos, and post LinkedIn content.
                </p>
              </div>
            </div>
          </div>

          {/* Target Priority Info Guide */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
              Priority Info Guide
            </h3>
            
            <div className="bg-bg-card border border-border-dark rounded-xl p-4 space-y-3">
              <div className="flex items-start space-x-2.5">
                <Info className="h-4.5 w-4.5 text-brand-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h5 className="text-xs font-bold text-white">Why Track Daily Routine?</h5>
                  <p className="text-[10px] text-text-secondary leading-relaxed mt-0.5">
                    Managing structured schedules keeps your health, primary career, and secondary business goals in check. Checking off items helps you visualize resource allocation.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2.5 pt-2 border-t border-border-dark">
                <Zap className="h-4.5 w-4.5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h5 className="text-xs font-bold text-white">Earn Double XP</h5>
                  <p className="text-[10px] text-text-secondary leading-relaxed mt-0.5">
                    Ticking off core milestones like AI consulting training, corporate training content, and Mi meetings awards massive bonus XP to level up your Hero tier fast!
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
