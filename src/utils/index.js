// System constants
export const APP_NAME = 'Habit Hero';

// XP Level rules
// Level 1 = 0 XP
// Level 2 = 100 XP
// Level 3 = 250 XP
// Level 4 = 500 XP
// Level 5 = 1000 XP
export function getLevelDetails(xp) {
  const points = Number(xp) || 0;
  
  let level;
  let prevLevelXP;
  let nextLevelXP;
  
  if (points >= 1000) {
    level = 5;
    prevLevelXP = 1000;
    nextLevelXP = null;
  } else if (points >= 500) {
    level = 4;
    prevLevelXP = 500;
    nextLevelXP = 1000;
  } else if (points >= 250) {
    level = 3;
    prevLevelXP = 250;
    nextLevelXP = 500;
  } else if (points >= 100) {
    level = 2;
    prevLevelXP = 100;
    nextLevelXP = 250;
  } else {
    level = 1;
    prevLevelXP = 0;
    nextLevelXP = 100;
  }
  
  if (nextLevelXP === null) {
    return {
      level,
      prevLevelXP,
      nextLevelXP,
      xpInCurrentLevel: points - prevLevelXP,
      xpNeededForNextLevel: 0,
      percent: 100,
      xpRemaining: 0
    };
  }
  
  const xpInCurrentLevel = points - prevLevelXP;
  const xpNeededForNextLevel = nextLevelXP - prevLevelXP;
  const percent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));
  const xpRemaining = nextLevelXP - points;
  
  return {
    level,
    prevLevelXP,
    nextLevelXP,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    percent,
    xpRemaining
  };
}

// Format XP for display
export const formatXP = (xp) => `${xp} XP`;

// Calculate Streak statistics based on habit completion logs
export function calculateStreak(logs, userId) {
  const userLogs = logs.filter(l => l.UserID === userId && l.Completed);
  if (userLogs.length === 0) return { currentStreak: 0, longestStreak: 0 };

  // Get sorted list of unique dates (YYYY-MM-DD) descending
  const dates = [...new Set(userLogs.map(l => l.Date.split('T')[0]))].sort(
    (a, b) => new Date(b) - new Date(a)
  );

  let longestStreak = 0;
  let tempStreak;
  const sortedAsc = [...dates].reverse();

  if (sortedAsc.length > 0) {
    tempStreak = 1;
    longestStreak = 1;
    for (let i = 1; i < sortedAsc.length; i++) {
      const d1 = new Date(sortedAsc[i - 1]);
      const d2 = new Date(sortedAsc[i]);
      const diffDays = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
  }

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
    longestStreak: Math.max(longestStreak, currentStreak)
  };
}

// Calculate Habit Completion Success Rate Percentage
export function calculateHabitCompletionPercent(logs, habitId) {
  const habitLogs = logs.filter(l => l.HabitID === habitId);
  if (habitLogs.length === 0) return 0;
  const completedCount = habitLogs.filter(l => l.Completed).length;
  return Math.round((completedCount / habitLogs.length) * 100);
}

