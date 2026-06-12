import { db, isFirebaseEnabled } from './firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { mockDb } from '../utils/mockDb';

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
    } else {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(mockDb.getAchievements(userId));
        }, 300);
      });
    }
  }
};
