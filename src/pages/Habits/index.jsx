import { useContext, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { HabitContext } from '../../context/HabitContext';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Sparkles, 
  Activity, 
  ToggleLeft, 
  ToggleRight, 
  X, 
  Dumbbell, 
  BookOpen, 
  Code, 
  Heart,
  AlertTriangle
} from 'lucide-react';

export default function Habits() {
  const { habits, loading, fetchHabits, addHabit, editHabit, removeHabit } = useContext(HabitContext);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      habitName: '',
      description: '',
      category: 'General',
      xpReward: 10
    }
  });

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  // Open modal for Create
  const handleCreateOpen = () => {
    setEditingHabit(null);
    reset({
      habitName: '',
      description: '',
      category: 'General',
      xpReward: 10
    });
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleEditOpen = (habit) => {
    setEditingHabit(habit);
    setValue('habitName', habit.habitName);
    setValue('description', habit.description);
    setValue('category', habit.category);
    setValue('xpReward', habit.xpReward);
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingHabit) {
        await editHabit(
          editingHabit.habitId,
          data.habitName,
          data.description,
          data.category,
          data.xpReward,
          editingHabit.status
        );
      } else {
        await addHabit(data.habitName, data.description, data.category, data.xpReward);
      }
      setModalOpen(false);
      reset();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusToggle = async (habit) => {
    const nextStatus = habit.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await editHabit(
        habit.habitId,
        habit.habitName,
        habit.description,
        habit.category,
        habit.xpReward,
        nextStatus
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (habitId) => {
    if (window.confirm('Are you sure you want to delete this habit quest? This will delete all historic completion logs.')) {
      try {
        await removeHabit(habitId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Category Icon Resolver
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

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Active Quests</h1>
          <p className="text-text-secondary text-sm">Configure and manage your daily habits and XP rewards</p>
        </div>
        <button
          onClick={handleCreateOpen}
          className="flex items-center justify-center px-4 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white text-sm font-semibold rounded-lg shadow-lg hover:shadow-brand-primary/20 transition-all duration-200 cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Quest
        </button>
      </div>

      {/* Main Grid Checklist */}
      {loading && habits.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-bg-card border border-border-dark rounded-xl p-5 space-y-4 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-10 w-10 bg-bg-input rounded-lg" />
                <div className="h-6 w-16 bg-bg-input rounded" />
              </div>
              <div className="h-5 bg-bg-input rounded w-3/4" />
              <div className="h-4 bg-bg-input rounded w-1/2" />
              <div className="pt-4 border-t border-border-dark flex justify-between">
                <div className="h-8 w-24 bg-bg-input rounded" />
                <div className="h-8 w-16 bg-bg-input rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : habits.length === 0 ? (
        <div className="text-center py-16 bg-bg-card border border-border-dark rounded-xl p-8 max-w-md mx-auto">
          <Activity className="h-12 w-12 text-brand-primary mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-bold text-white mb-2">No Active Quests</h3>
          <p className="text-text-secondary text-sm mb-6 leading-relaxed">
            You don't have any habit quests registered. Click below to create your very first daily adventure!
          </p>
          <button
            onClick={handleCreateOpen}
            className="inline-flex items-center px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create First Quest
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {habits.map((habit) => {
            const { icon: CatIcon, color, bg, border } = getCategoryIcon(habit.category);
            const isInactive = habit.status === 'Inactive';

            return (
              <div
                key={habit.habitId}
                className={`bg-bg-card border rounded-xl p-5 flex flex-col justify-between hover:shadow-xl transition-all duration-300 ${
                  isInactive 
                    ? 'border-border-dark/50 opacity-60' 
                    : 'border-border-dark hover:border-brand-primary/30'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    {/* Category icon */}
                    <div className={`h-10 w-10 rounded-lg ${bg} ${border} border flex items-center justify-center`}>
                      <CatIcon className={`h-5 w-5 ${color}`} />
                    </div>
                    {/* XP reward block */}
                    <span className="flex items-center text-xs font-extrabold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">
                      <Sparkles className="h-3 w-3 mr-1 fill-yellow-400" />
                      +{habit.xpReward} XP
                    </span>
                  </div>

                  <h3 className={`text-base font-bold truncate ${isInactive ? 'line-through text-text-secondary' : 'text-white'}`}>
                    {habit.habitName}
                  </h3>
                  
                  <p className="text-xs text-text-secondary mt-1.5 line-clamp-2 leading-relaxed min-h-[2rem]">
                    {habit.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-border-dark flex items-center justify-between">
                  {/* Status Toggle Button */}
                  <button
                    onClick={() => handleStatusToggle(habit)}
                    className={`flex items-center text-xs font-bold transition-colors cursor-pointer ${
                      isInactive 
                        ? 'text-text-secondary hover:text-white' 
                        : 'text-brand-primary hover:text-brand-secondary'
                    }`}
                  >
                    {isInactive ? (
                      <>
                        <ToggleLeft className="h-5 w-5 mr-1.5 text-text-secondary" />
                        Inactive
                      </>
                    ) : (
                      <>
                        <ToggleRight className="h-5 w-5 mr-1.5 text-brand-primary" />
                        Active
                      </>
                    )}
                  </button>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditOpen(habit)}
                      className="p-1.5 bg-bg-input text-text-secondary hover:text-white rounded-lg border border-border-dark hover:border-brand-primary/30 transition-colors cursor-pointer"
                      title="Edit Quest"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(habit.habitId)}
                      className="p-1.5 bg-bg-input text-text-secondary hover:text-red-400 rounded-lg border border-border-dark hover:border-red-500/30 transition-colors cursor-pointer"
                      title="Delete Quest"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE & EDIT MODAL OVERLAY */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          
          <div className="bg-bg-card border border-border-dark rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-border-dark">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Sparkles className="h-5 w-5 text-brand-primary mr-2" />
                {editingHabit ? 'Modify Quest' : 'Create New Quest'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-text-secondary hover:text-white p-1 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Quest Name</label>
                <input
                  type="text"
                  placeholder="e.g. Code for 1 hour"
                  {...register('habitName', { required: 'Quest name is required' })}
                  className={`w-full px-4 py-2.5 bg-bg-input border ${
                    errors.habitName ? 'border-red-500/50 focus:border-red-500' : 'border-border-dark focus:border-brand-primary'
                  } rounded-xl text-sm text-white focus:outline-none transition`}
                />
                {errors.habitName && <p className="text-xs text-red-400">{errors.habitName.message}</p>}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Description (Optional)</label>
                <textarea
                  placeholder="What details are involved in this quest?"
                  rows="3"
                  {...register('description')}
                  className="w-full px-4 py-2.5 bg-bg-input border border-border-dark focus:border-brand-primary rounded-xl text-sm text-white focus:outline-none resize-none transition"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Quest Category</label>
                <select
                  {...register('category', { required: 'Category is required' })}
                  className="w-full px-4 py-2.5 bg-bg-input border border-border-dark focus:border-brand-primary rounded-xl text-sm text-white focus:outline-none transition cursor-pointer"
                >
                  <option value="Gym">Gym (Physical Workout - +10 XP)</option>
                  <option value="Reading">Reading (Mental Growth - +5 XP)</option>
                  <option value="Coding">Coding (Skill building - +15 XP)</option>
                  <option value="General">General (+10 XP)</option>
                </select>
              </div>

              {/* XP Reward */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">XP Reward</label>
                  <span className="text-xs font-extrabold text-yellow-400 bg-yellow-400/10 border border-yellow-400/25 px-2 py-0.5 rounded">
                    +XP Configured
                  </span>
                </div>
                <select
                  {...register('xpReward', { valueAsNumber: true })}
                  className="w-full px-4 py-2.5 bg-bg-input border border-border-dark focus:border-brand-primary rounded-xl text-sm text-white focus:outline-none transition cursor-pointer"
                >
                  <option value={5}>5 XP (Easy - Reading, Hydration)</option>
                  <option value={10}>10 XP (Medium - Gym, Chores)</option>
                  <option value={15}>15 XP (Hard - Coding, Deep Work)</option>
                  <option value={25}>25 XP (Legendary - Major Project)</option>
                </select>
                
                {/* Rules warning alert box */}
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-start space-x-2 mt-2">
                  <AlertTriangle className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-text-secondary leading-normal">
                    Tip: Align quests with recommended standards: Gym rewards 10 XP, Reading rewards 5 XP, and Coding rewards 15 XP for uniform progression.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-1/2 py-2.5 bg-bg-input border border-border-dark text-text-secondary hover:text-white font-bold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl text-sm shadow-lg hover:shadow-brand-primary/10 transition-all duration-200 cursor-pointer"
                >
                  {editingHabit ? 'Save Changes' : 'Embark Quest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
