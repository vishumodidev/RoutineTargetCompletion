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

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateXP, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
