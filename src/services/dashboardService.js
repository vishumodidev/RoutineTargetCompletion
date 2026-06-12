import { db, isFirebaseEnabled } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { mockDb } from '../utils/mockDb';
import api from './api';

const isSheetsEnabled = !!import.meta.env.VITE_API_URL;

export const dashboardService = {
  getDashboardData: async (userId) => {
    if (isFirebaseEnabled) {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch user document
        const userDocRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userDocRef);
        if (!userSnap.exists()) throw new Error('User profile not found');
        const userData = userSnap.data();
        
        // Fetch habits for this user
        const habitsQuery = query(
          collection(db, 'habits'), 
          where('userId', '==', userId), 
          where('status', '==', 'Active')
        );
        const habitsSnap = await getDocs(habitsQuery);
        
        // Fetch today's logs for this user
        const logsQuery = query(
          collection(db, 'habitLogs'), 
          where('userId', '==', userId), 
          where('date', '==', today)
        );
        const logsSnap = await getDocs(logsQuery);
        const todayLogs = logsSnap.docs.map(d => d.data());
        
        // Fetch achievements count
        const achievementsQuery = query(
          collection(db, 'achievements'), 
          where('userId', '==', userId)
        );
        const achievementsSnap = await getDocs(achievementsQuery);
        
        // Format payload
        const user = {
          userId,
          name: userData.name,
          email: userData.email,
          joinDate: userData.joinDate,
          xp: Number(userData.xp) || 0,
          level: Number(userData.level) || 1,
          streak: Number(userData.streak) || 0,
          longestStreak: Number(userData.longestStreak) || 0
        };
        
        const todayQuests = habitsSnap.docs.map(d => {
          const h = d.data();
          const log = todayLogs.find(l => l.habitId === h.habitId);
          return {
            habitId: h.habitId,
            habitName: h.habitName,
            description: h.description,
            category: h.category,
            xpReward: Number(h.xpReward) || 5,
            completed: log ? log.completed : false
          };
        });
        
        return {
          success: true,
          user,
          todayQuests,
          achievementsCount: achievementsSnap.size
        };
      } catch (err) {
        throw new Error(err.message || 'Failed to fetch dashboard data');
      }
    } else if (isSheetsEnabled) {
      try {
        const res = await api.get('', { params: { action: 'dashboard', userId } });
        if (!res.data.success) throw new Error(res.data.error || 'Failed to fetch dashboard');
        return res.data;
      } catch (err) {
        throw new Error(err.message || 'Failed to fetch dashboard data');
      }
    } else {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            resolve(mockDb.getDashboard(userId));
          } catch (e) {
            reject(e);
          }
        }, 400);
      });
    }
  }
};
