import { db, isFirebaseEnabled } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  writeBatch 
} from 'firebase/firestore';
import { mockDb } from '../utils/mockDb';
import { getLevelDetails } from '../utils';
import api from './api';

const isSheetsEnabled = !!import.meta.env.VITE_API_URL;

// Helper to calculate streak from logs array
function calculateStreakFromLogs(userLogs) {
  if (userLogs.length === 0) {
    return { currentStreak: 0, longestStreak: 0, completedCount: 0 };
  }

  // Get sorted list of unique dates (YYYY-MM-DD) descending
  const dates = [...new Set(userLogs.map(l => l.date))].sort(
    (a, b) => new Date(b) - new Date(a)
  );
  const completedCount = userLogs.length;

  // Longest streak
  let maxStreak = 0;
  let tempStreak;
  const sortedAsc = [...dates].reverse();

  if (sortedAsc.length > 0) {
    tempStreak = 1;
    maxStreak = 1;
    for (let i = 1; i < sortedAsc.length; i++) {
      const d1 = new Date(sortedAsc[i - 1]);
      const d2 = new Date(sortedAsc[i]);
      const diffDays = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
  }

  // Current streak
  let currentStreak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let startIdx = dates.indexOf(today);
  if (startIdx === -1) {
    startIdx = dates.indexOf(yesterdayStr);
  }

  if (startIdx !== -1) {
    currentStreak = 1;
    for (let j = startIdx; j < dates.length - 1; j++) {
      const dCurr = new Date(dates[j]);
      const dNext = new Date(dates[j + 1]);
      const diff = Math.ceil(Math.abs(dCurr - dNext) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(maxStreak, currentStreak),
    completedCount
  };
}

// Helper to evaluate and unlock achievements in Firestore
async function evaluateAchievements(userId, xp, completedCount, longestStreak) {
  const q = query(collection(db, 'achievements'), where('userId', '==', userId));
  const snap = await getDocs(q);
  const unlocked = snap.docs.map(doc => doc.data().badgeName);
  
  const today = new Date().toISOString().split('T')[0];
  const checks = [
    { badge: "First Habit Completed", condition: completedCount >= 1 },
    { badge: "7 Day Streak", condition: longestStreak >= 7 },
    { badge: "30 Day Streak", condition: longestStreak >= 30 },
    { badge: "100 Tasks Completed", condition: completedCount >= 100 },
    { badge: "1000 XP Earned", condition: xp >= 1000 }
  ];
  
  for (const check of checks) {
    if (check.condition && !unlocked.includes(check.badge)) {
      const achId = doc(collection(db, 'achievements')).id;
      await setDoc(doc(db, 'achievements', achId), {
        achievementId: achId,
        userId,
        badgeName: check.badge,
        unlockedDate: today
      });
    }
  }
}

export const habitService = {
  getHabits: async (userId) => {
    if (isFirebaseEnabled) {
      try {
        const q = query(collection(db, 'habits'), where('userId', '==', userId));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({
          habitId: doc.id,
          ...doc.data()
        }));
      } catch (err) {
        throw new Error(err.message || 'Failed to fetch habits');
      }
    } else if (isSheetsEnabled) {
      try {
        const res = await api.get('', { params: { action: 'habits', userId } });
        if (!res.data.success) throw new Error(res.data.error || 'Failed to fetch habits');
        return res.data.habits;
      } catch (err) {
        throw new Error(err.message || 'Failed to fetch habits');
      }
    } else {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(mockDb.getHabits(userId));
        }, 300);
      });
    }
  },

  createHabit: async (userId, habitName, description, category, xpReward) => {
    if (isFirebaseEnabled) {
      try {
        const habitId = doc(collection(db, 'habits')).id;
        const newHabit = {
          habitId,
          userId,
          habitName,
          description: description || '',
          category,
          xpReward: Number(xpReward) || 5,
          status: 'Active'
        };
        await setDoc(doc(db, 'habits', habitId), newHabit);
        return newHabit;
      } catch (err) {
        throw new Error(err.message || 'Failed to create habit');
      }
    } else if (isSheetsEnabled) {
      try {
        const res = await api.post('', { action: 'createHabit', userId, habitName, description, category, xpReward });
        if (!res.data.success) throw new Error(res.data.error || 'Failed to create habit');
        return res.data.habit;
      } catch (err) {
        throw new Error(err.message || 'Failed to create habit');
      }
    } else {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(mockDb.createHabit(userId, habitName, description, category, xpReward));
        }, 300);
      });
    }
  },

  updateHabit: async (habitId, userId, habitName, description, category, xpReward, status) => {
    if (isFirebaseEnabled) {
      try {
        const docRef = doc(db, 'habits', habitId);
        const updated = {
          habitName,
          description: description || '',
          category,
          xpReward: Number(xpReward),
          status: status || 'Active'
        };
        await updateDoc(docRef, updated);
        return {
          habitId,
          userId,
          ...updated
        };
      } catch (err) {
        throw new Error(err.message || 'Failed to update habit');
      }
    } else if (isSheetsEnabled) {
      try {
        const res = await api.post('', { action: 'updateHabit', habitId, userId, habitName, description, category, xpReward, status });
        if (!res.data.success) throw new Error(res.data.error || 'Failed to update habit');
        return res.data.habit;
      } catch (err) {
        throw new Error(err.message || 'Failed to update habit');
      }
    } else {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(mockDb.updateHabit(habitId, userId, habitName, description, category, xpReward, status));
        }, 300);
      });
    }
  },

  deleteHabit: async (habitId, userId) => {
    if (isFirebaseEnabled) {
      try {
        await deleteDoc(doc(db, 'habits', habitId));
        
        // Cascade delete logs
        const q = query(collection(db, 'habitLogs'), where('habitId', '==', habitId));
        const logsSnap = await getDocs(q);
        const batch = writeBatch(db);
        logsSnap.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        return true;
      } catch (err) {
        throw new Error(err.message || 'Failed to delete habit');
      }
    } else if (isSheetsEnabled) {
      try {
        const res = await api.post('', { action: 'deleteHabit', habitId, userId });
        if (!res.data.success) throw new Error(res.data.error || 'Failed to delete habit');
        return true;
      } catch (err) {
        throw new Error(err.message || 'Failed to delete habit');
      }
    } else {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(mockDb.deleteHabit(habitId, userId));
        }, 300);
      });
    }
  },

  logHabit: async (userId, habitId, date, completed) => {
    if (isFirebaseEnabled) {
      try {
        const logId = `${userId}_${habitId}_${date}`;
        const logRef = doc(db, 'habitLogs', logId);
        const logSnap = await getDoc(logRef);
        
        const wasCompletedBefore = logSnap.exists() ? logSnap.data().completed : false;
        const isCompletedNow = completed === true;
        
        // Save/update the log
        await setDoc(logRef, {
          logId,
          userId,
          habitId,
          date,
          completed: isCompletedNow
        });
        
        // Get reward XP from habit
        const habitSnap = await getDoc(doc(db, 'habits', habitId));
        if (!habitSnap.exists()) throw new Error('Habit not found');
        const xpReward = Number(habitSnap.data().xpReward) || 5;
        
        // Calculate XP delta
        let xpChange = 0;
        if (!wasCompletedBefore && isCompletedNow) {
          xpChange = xpReward;
        } else if (wasCompletedBefore && !isCompletedNow) {
          xpChange = -xpReward;
        }
        
        // Update user stats
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error('User profile not found');
        const userData = userSnap.data();
        
        const newXP = Math.max(0, (Number(userData.xp) || 0) + xpChange);
        const { level } = getLevelDetails(newXP);
        
        // Fetch all completed logs for streak calculation
        const logsQuery = query(
          collection(db, 'habitLogs'), 
          where('userId', '==', userId), 
          where('completed', '==', true)
        );
        const allCompletedLogsSnap = await getDocs(logsQuery);
        const userLogs = allCompletedLogsSnap.docs.map(doc => doc.data());
        
        const streakDetails = calculateStreakFromLogs(userLogs);
        
        const updatedProfile = {
          xp: newXP,
          level,
          streak: streakDetails.currentStreak,
          longestStreak: streakDetails.longestStreak
        };
        
        await updateDoc(userRef, updatedProfile);
        
        // Evaluate achievements
        await evaluateAchievements(userId, newXP, streakDetails.completedCount, streakDetails.longestStreak);
        
        return {
          success: true,
          xp: newXP,
          level,
          streak: streakDetails.currentStreak,
          longestStreak: streakDetails.longestStreak
        };
      } catch (err) {
        throw new Error(err.message || 'Failed to log habit completion');
      }
    } else if (isSheetsEnabled) {
      try {
        const res = await api.post('', { action: 'habitLog', userId, habitId, date, completed });
        if (!res.data.success) throw new Error(res.data.error || 'Failed to log habit completion');
        return res.data;
      } catch (err) {
        throw new Error(err.message || 'Failed to log habit completion');
      }
    } else {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            resolve(mockDb.logHabit(userId, habitId, date, completed));
          } catch (e) {
            reject(e);
          }
        }, 300);
      });
    }
  }
};
