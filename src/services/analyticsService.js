import { db, isFirebaseEnabled } from './firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { mockDb } from '../utils/mockDb';
import api from './api';

const isSheetsEnabled = !!import.meta.env.VITE_API_URL;

export const analyticsService = {
  getAnalyticsData: async (userId) => {
    if (isFirebaseEnabled) {
      try {
        // Fetch all habits for user
        const habitsQuery = query(collection(db, 'habits'), where('userId', '==', userId));
        const habitsSnap = await getDocs(habitsQuery);
        const habits = habitsSnap.docs.map(doc => doc.data());
        
        // Fetch all logs for user
        const logsQuery = query(collection(db, 'habitLogs'), where('userId', '==', userId));
        const logsSnap = await getDocs(logsQuery);
        const logs = logsSnap.docs.map(doc => doc.data());
        
        // 1. Calculate completion stats per habit
        const habitStats = habits.map(h => {
          const habitLogs = logs.filter(l => l.habitId === h.habitId);
          const completed = habitLogs.filter(l => l.completed).length;
          const total = habitLogs.length;
          return {
            habitId: h.habitId,
            habitName: h.habitName,
            category: h.category,
            completed,
            total,
            successRate: total > 0 ? Math.round((completed / total) * 100) : 0
          };
        });
        
        // 2. Generate 7-day weekly report
        const weeklyReport = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayLogs = logs.filter(l => l.date === dateStr);
          const comp = dayLogs.filter(l => l.completed).length;
          const tot = dayLogs.length;
          
          weeklyReport.push({
            date: dateStr,
            completed: comp,
            total: tot,
            percent: tot > 0 ? Math.round((comp / tot) * 100) : 0
          });
        }
        
        // 3. Generate Category Breakdown
        const categories = {};
        logs.forEach(l => {
          if (l.completed) {
            const h = habits.find(hb => hb.habitId === l.habitId);
            if (h) {
              categories[h.category] = (categories[h.category] || 0) + 1;
            }
          }
        });
        
        const categoryBreakdown = Object.keys(categories).map(cat => ({
          category: cat,
          value: categories[cat]
        }));
        
        return {
          success: true,
          habitStats,
          weeklyReport,
          categoryBreakdown
        };
      } catch (err) {
        throw new Error(err.message || 'Failed to fetch analytics data');
      }
    } else if (isSheetsEnabled) {
      try {
        const res = await api.get('', { params: { action: 'analytics', userId } });
        if (!res.data.success) throw new Error(res.data.error || 'Failed to fetch analytics');
        return res.data;
      } catch (err) {
        throw new Error(err.message || 'Failed to fetch analytics data');
      }
    } else {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            resolve(mockDb.getAnalytics(userId));
          } catch (e) {
            reject(e);
          }
        }, 400);
      });
    }
  }
};
