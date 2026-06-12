/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { habitService } from '../services/habitService';
import toast from 'react-hot-toast';

export const HabitContext = createContext(null);

export function HabitProvider({ children }) {
  const { user, updateXP } = useContext(AuthContext);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHabits = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await habitService.getHabits(user.userId);
      setHabits(data);
    } catch (e) {
      toast.error(e.message || 'Failed to load habits');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addHabit = async (habitName, description, category, xpReward) => {
    if (!user) return;
    try {
      const newHabit = await habitService.createHabit(user.userId, habitName, description, category, xpReward);
      setHabits((prev) => [...prev, newHabit]);
      toast.success('New habit quest created successfully!');
      return newHabit;
    } catch (e) {
      toast.error(e.message || 'Failed to create habit');
      throw e;
    }
  };

  const editHabit = async (habitId, habitName, description, category, xpReward, status) => {
    if (!user) return;
    try {
      const updated = await habitService.updateHabit(habitId, user.userId, habitName, description, category, xpReward, status);
      setHabits((prev) => prev.map((h) => (h.habitId === habitId ? updated : h)));
      toast.success('Habit quest updated!');
      return updated;
    } catch (e) {
      toast.error(e.message || 'Failed to update habit');
      throw e;
    }
  };

  const removeHabit = async (habitId) => {
    if (!user) return;
    try {
      await habitService.deleteHabit(habitId, user.userId);
      setHabits((prev) => prev.filter((h) => h.habitId !== habitId));
      toast.success('Habit quest deleted forever.');
    } catch (e) {
      toast.error(e.message || 'Failed to delete habit');
      throw e;
    }
  };

  const logHabitCompletion = async (habitId, date, completed) => {
    if (!user) return;
    try {
      const result = await habitService.logHabit(user.userId, habitId, date, completed);
      
      // Update User XP, Level, and Streak in AuthContext
      if (result.success) {
        updateXP(result.xp, result.level, result.streak, result.longestStreak);
        
        // Show celebratory toast if level up occurs
        if (result.level > user.level) {
          toast.success(`🎉 LEVEL UP! You reached Level ${result.level}!`, {
            duration: 5000,
            style: {
              background: '#4f46e5',
              color: '#ffffff',
              fontWeight: 'bold',
              border: '2px solid #818cf8'
            }
          });
        } else {
          if (completed) {
            toast.success(`Quest Complete! +XP awarded.`);
          } else {
            toast.error('Quest unmarked.');
          }
        }
      }
      return result;
    } catch (e) {
      toast.error(e.message || 'Failed to record habit completion');
      throw e;
    }
  };

  return (
    <HabitContext.Provider
      value={{
        habits,
        loading,
        fetchHabits,
        addHabit,
        editHabit,
        removeHabit,
        logHabitCompletion
      }}
    >
      {children}
    </HabitContext.Provider>
  );
}
