/* eslint-disable react-refresh/only-export-components */
import { createContext, useState } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('habit_hero_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (err) {
        console.error(err);
        localStorage.removeItem('habit_hero_user');
      }
    }
    return null;
  });
  
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const userData = await authService.login(email, password);
      setUser(userData);
      localStorage.setItem('habit_hero_user', JSON.stringify(userData));
      setLoading(false);
      return userData;
    } catch (e) {
      setLoading(false);
      throw e;
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const userData = await authService.register(name, email, password);
      setUser(userData);
      localStorage.setItem('habit_hero_user', JSON.stringify(userData));
      setLoading(false);
      return userData;
    } catch (e) {
      setLoading(false);
      throw e;
    }
  };

  const logout = () => {
    localStorage.removeItem('habit_hero_user');
    setUser(null);
  };

  const updateXP = (newXP, newLevel, newStreak, newLongestStreak) => {
    if (user) {
      const updatedUser = { 
        ...user, 
        xp: newXP, 
        level: newLevel,
        streak: newStreak !== undefined ? newStreak : user.streak,
        longestStreak: newLongestStreak !== undefined ? newLongestStreak : user.longestStreak
      };
      localStorage.setItem('habit_hero_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  const updateUserProfile = (updatedFields) => {
    if (user) {
      const updatedUser = { ...user, ...updatedFields };
      localStorage.setItem('habit_hero_user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      // Persist to underlying mock users table if possible
      try {
        const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
        const idx = users.findIndex(u => u.UserID === user.userId);
        if (idx !== -1) {
          const dbMapping = {
            name: 'Name',
            email: 'Email',
            xp: 'XP',
            level: 'Level',
            streak: 'Streak',
            longestStreak: 'LongestStreak',
            incomeReceived: 'IncomeReceived',
            incomeMilestone: 'IncomeMilestone',
            currentSkillFocus: 'CurrentSkillFocus',
            todayLearningTarget: 'TodayLearningTarget',
            currentProjectName: 'CurrentProjectName',
            todayBuildTaskName: 'TodayBuildTaskName',
            projectProgressPercent: 'ProjectProgressPercent',
            activeDistributors: 'ActiveDistributors',
            distributorsLeft: 'DistributorsLeft',
            distributorsRight: 'DistributorsRight',
            todayProspects: 'TodayProspects',
            todayFollowUps: 'TodayFollowUps',
            todayPresentations: 'TodayPresentations',
            todayCoaching: 'TodayCoaching',
            teamActivityCount: 'TeamActivityCount',
            dayType: 'DayType'
          };
          
          const updatedDbUser = { ...users[idx] };
          Object.keys(updatedFields).forEach(key => {
            const dbKey = dbMapping[key];
            if (dbKey) {
              updatedDbUser[dbKey] = updatedFields[key];
            }
          });
          users[idx] = updatedDbUser;
          localStorage.setItem('mock_users', JSON.stringify(users));
        }
      } catch (e) {
        console.error('Failed to sync mock_users table', e);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateXP, updateUserProfile, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
