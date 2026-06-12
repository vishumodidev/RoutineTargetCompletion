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

export const achievementService = {
  getAchievements: async (userId) => {
    if (isFirebaseEnabled) {
      try {
        const q = query(collection(db, 'achievements'), where('userId', '==', userId));
        const snap = await getDocs(q);
        return snap.docs.map(doc => {
          const data = doc.data();
          return {
            badgeName: data.badgeName,
            unlockedDate: data.unlockedDate
          };
        });
      } catch (err) {
        throw new Error(err.message || 'Failed to fetch achievements');
      }
    } else if (isSheetsEnabled) {
      try {
        const res = await api.get('', { params: { action: 'achievements', userId } });
        if (!res.data.success) throw new Error(res.data.error || 'Failed to fetch achievements');
        return res.data.achievements;
      } catch (err) {
        throw new Error(err.message || 'Failed to fetch achievements');
      }
    } else {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(mockDb.getAchievements(userId));
        }, 300);
      });
    }
  }
};
