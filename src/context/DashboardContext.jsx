/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { HabitContext } from './HabitContext';
import { dashboardService } from '../services/dashboardService';
import toast from 'react-hot-toast';

export const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const { user } = useContext(AuthContext);
  const { logHabitCompletion } = useContext(HabitContext);
  const [todayQuests, setTodayQuests] = useState([]);
  const [achievementsCount, setAchievementsCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await dashboardService.getDashboardData(user.userId);
      setTodayQuests(data.todayQuests || []);
      setAchievementsCount(data.achievementsCount || 0);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to fetch dashboard statistics');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const toggleQuest = async (habitId, completed) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    // 1. Optimistic Update (Immediate state update for instantaneous responsive feel)
    setTodayQuests((prev) =>
      prev.map((q) => (q.habitId === habitId ? { ...q, completed } : q))
    );

    try {
      // 2. Call service layer (updates XP, Level, and Streak automatically)
      await logHabitCompletion(habitId, today, completed);
      
      // 3. Re-sync achievements count in background
      const data = await dashboardService.getDashboardData(user.userId);
      setAchievementsCount(data.achievementsCount || 0);
      setTodayQuests(data.todayQuests || []);
    } catch (err) {
      console.error(err);
      // 4. Revert state on error
      setTodayQuests((prev) =>
        prev.map((q) => (q.habitId === habitId ? { ...q, completed: !completed } : q))
      );
    }
  };

  return (
    <DashboardContext.Provider
      value={{
        todayQuests,
        achievementsCount,
        loading,
        fetchDashboard,
        toggleQuest
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
