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

export const calendarService = {
  getCalendarData: async (userId) => {
    if (isFirebaseEnabled) {
      try {
        // Fetch habits for user
        const habitsQuery = query(collection(db, 'habits'), where('userId', '==', userId));
        const habitsSnap = await getDocs(habitsQuery);
        
        // Fetch logs for user
        const logsQuery = query(collection(db, 'habitLogs'), where('userId', '==', userId));
        const logsSnap = await getDocs(logsQuery);
        
        const logs = logsSnap.docs.map(doc => {
          const l = doc.data();
          return {
            habitId: l.habitId,
            date: l.date.includes('T') ? l.date.split('T')[0] : l.date,
            completed: l.completed
          };
        });
        
        const habits = habitsSnap.docs.map(doc => {
          const h = doc.data();
          return {
            habitId: h.habitId,
            habitName: h.habitName
          };
        });
        
        return {
          success: true,
          logs,
          habits
        };
      } catch (err) {
        throw new Error(err.message || 'Failed to fetch calendar data');
      }
    } else if (isSheetsEnabled) {
      try {
        const res = await api.get('', { params: { action: 'calendar', userId } });
        if (!res.data.success) throw new Error(res.data.error || 'Failed to fetch calendar');
        return res.data;
      } catch (err) {
        throw new Error(err.message || 'Failed to fetch calendar data');
      }
    } else {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            resolve(mockDb.getCalendar(userId));
          } catch (e) {
            reject(e);
          }
        }, 400);
      });
    }
  }
};
