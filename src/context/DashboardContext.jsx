/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { HabitContext } from './HabitContext';
import { dashboardService } from '../services/dashboardService';
import toast from 'react-hot-toast';

export const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const { user, updateXP } = useContext(AuthContext);
  const { logHabitCompletion } = useContext(HabitContext);
  const [todayQuests, setTodayQuests] = useState([]);
  const [achievementsCount, setAchievementsCount] = useState(0);
  const [todayBigFive, setTodayBigFive] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [todayTime, setTodayTime] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await dashboardService.getDashboardData(user.userId);
      setTodayQuests(data.todayQuests || []);
      setAchievementsCount(data.achievementsCount || 0);
      setTodayBigFive(data.todayBigFive || []);
      setOpportunities(data.opportunities || []);
      setTodayTime(data.todayTime || []);
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

    setTodayQuests((prev) =>
      prev.map((q) => (q.habitId === habitId ? { ...q, completed } : q))
    );

    try {
      await logHabitCompletion(habitId, today, completed);
      const data = await dashboardService.getDashboardData(user.userId);
      setAchievementsCount(data.achievementsCount || 0);
      setTodayQuests(data.todayQuests || []);
    } catch (err) {
      console.error(err);
      setTodayQuests((prev) =>
        prev.map((q) => (q.habitId === habitId ? { ...q, completed: !completed } : q))
      );
    }
  };

  const updateBigFiveStatus = async (taskId, status) => {
    if (!user) return;
    // Optimistic Update
    let oldItem;
    setTodayBigFive((prev) =>
      prev.map((item) => {
        if (item.id === taskId) {
          oldItem = item;
          return { ...item, status };
        }
        return item;
      })
    );

    try {
      const res = await dashboardService.updateBigFiveStatus(user.userId, taskId, status);
      if (res.success && res.xp !== undefined) {
        updateXP(res.xp, res.level);
      }
      
      // Sync dashboard data
      const data = await dashboardService.getDashboardData(user.userId);
      setTodayBigFive(data.todayBigFive || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update quest status');
      if (oldItem) {
        setTodayBigFive((prev) =>
          prev.map((item) => (item.id === taskId ? oldItem : item))
        );
      }
    }
  };

  const updateOpportunity = async (opp) => {
    if (!user) return;
    try {
      await dashboardService.updateOpportunity(user.userId, opp);
      await fetchDashboard();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save opportunity');
    }
  };

  const deleteOpportunity = async (oppId) => {
    if (!user) return;
    try {
      await dashboardService.deleteOpportunity(user.userId, oppId);
      await fetchDashboard();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete opportunity');
    }
  };

  const updateTimeAllocation = async (date, category, hours) => {
    if (!user) return;
    try {
      await dashboardService.updateTimeAllocation(user.userId, date, category, hours);
      await fetchDashboard();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update time allocation');
    }
  };

  return (
    <DashboardContext.Provider
      value={{
        todayQuests,
        achievementsCount,
        todayBigFive,
        opportunities,
        todayTime,
        loading,
        fetchDashboard,
        toggleQuest,
        updateBigFiveStatus,
        updateOpportunity,
        deleteOpportunity,
        updateTimeAllocation
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
