/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { achievementService } from '../services/achievementService';
import toast from 'react-hot-toast';

export const AchievementContext = createContext(null);

export function AchievementProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAchievements = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await achievementService.getAchievements(user.userId);
      setUnlockedAchievements(data || []);
    } catch (e) {
      toast.error(e.message || 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  }, [user]);

  return (
    <AchievementContext.Provider
      value={{
        unlockedAchievements,
        loading,
        fetchAchievements
      }}
    >
      {children}
    </AchievementContext.Provider>
  );
}
