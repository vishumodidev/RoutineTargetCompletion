import { getLevelDetails } from './index';

// Initialize mock storage if empty
export function initMockDb() {
  if (!localStorage.getItem('mock_users') || JSON.parse(localStorage.getItem('mock_users')).length === 0) {
    const defaultUser = {
      UserID: 'usr_vishu',
      Name: 'Vishu',
      Email: 'vishu@tracker.com',
      Password: 'password',
      JoinDate: '2026-06-01',
      XP: 450,
      Level: 3,
      Streak: 12,
      LongestStreak: 15,
      IncomeReceived: 75000,
      IncomeMilestone: 150000,
      CurrentSkillFocus: 'Agentic AI',
      TodayLearningTarget: 'Tool Calling — 60 min',
      CurrentProjectName: 'AI CRM Agent',
      TodayBuildTaskName: 'Lead Qualification Workflow',
      ProjectProgressPercent: 42,
      ActiveDistributors: 3,
      DistributorsLeft: 3,
      DistributorsRight: 2,
      TodayProspects: 5,
      TodayFollowUps: 3,
      TodayPresentations: 1,
      TodayCoaching: 1,
      TeamActivityCount: 2,
      DayType: 'NORMAL GROWTH DAY'
    };
    localStorage.setItem('mock_users', JSON.stringify([defaultUser]));

    const defaultHabits = [
      { HabitID: 'hab_python', UserID: 'usr_vishu', HabitName: 'Python: Advanced Concepts', Description: 'Decorators, metaclasses, and async programming models', Category: 'Coding', XPReward: 15, Status: 'Active' },
      { HabitID: 'hab_fastapi', UserID: 'usr_vishu', HabitName: 'FastAPI: Backend Architecture', Description: 'Secure endpoints, Alembic migrations, database schemas', Category: 'Coding', XPReward: 15, Status: 'Active' },
      { HabitID: 'hab_rag', UserID: 'usr_vishu', HabitName: 'RAG: Vector DBs & Search', Description: 'Semantic search, embedding indexing (Qdrant), hybrid retriever', Category: 'Coding', XPReward: 15, Status: 'Active' },
      { HabitID: 'hab_langgraph', UserID: 'usr_vishu', HabitName: 'LangGraph & CrewAI Orchestration', Description: 'Multi-agent graph systems, human-in-the-loop validation', Category: 'Coding', XPReward: 25, Status: 'Active' },
      { HabitID: 'hab_devops', UserID: 'usr_vishu', HabitName: 'AWS, Docker & K8s Deployments', Description: 'Containerizing backends, cloud configuration, AWS VPCs', Category: 'Coding', XPReward: 15, Status: 'Active' },
      { HabitID: 'hab_mi_field', UserID: 'usr_vishu', HabitName: 'Mi Lifestyle: Field Outreach & Seminars', Description: 'Connecting with prospects, supporting downline networks', Category: 'General', XPReward: 25, Status: 'Active' },
      { HabitID: 'hab_mi_followup', UserID: 'usr_vishu', HabitName: 'Mi Lifestyle: Customer Follow-ups', Description: 'Managing order responses, inquiries, wellness tips', Category: 'General', XPReward: 10, Status: 'Active' },
      { HabitID: 'hab_cycling', UserID: 'usr_vishu', HabitName: 'Fitness: Cycling & Cardio', Description: 'Cycling 60 mins daily to maintain stamina and health', Category: 'Gym', XPReward: 10, Status: 'Active' },
      { HabitID: 'hab_yoga', UserID: 'usr_vishu', HabitName: 'Fitness: Yoga & Meditation', Description: 'Yoga/stretching and mindfulness meditation 60 mins daily', Category: 'Gym', XPReward: 10, Status: 'Active' },
      { HabitID: 'hab_branding', UserID: 'usr_vishu', HabitName: 'Branding: LinkedIn & GitHub updates', Description: 'Drafting code tutorials, recording lectures, and updating logs', Category: 'Reading', XPReward: 15, Status: 'Active' }
    ];
    localStorage.setItem('mock_habits', JSON.stringify(defaultHabits));

    const defaultLogs = [];
    const defaultAchievements = [
      { AchievementID: 'ach_1', UserID: 'usr_vishu', BadgeName: 'First Habit Completed', UnlockedDate: '2026-06-01' },
      { AchievementID: 'ach_2', UserID: 'usr_vishu', BadgeName: '7 Day Streak', UnlockedDate: '2026-06-08' },
      { AchievementID: 'ach_3', UserID: 'usr_vishu', BadgeName: 'Level 2 Warrior', UnlockedDate: '2026-06-15' }
    ];

    // Generate 10 days of completions
    for (let i = 0; i < 10; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      defaultHabits.forEach((hab, idx) => {
        // 80% completion rate for testing
        const completed = (idx + i) % 5 !== 0; 
        defaultLogs.push({
          LogID: `log_${hab.HabitID}_${i}`,
          HabitID: hab.HabitID,
          UserID: 'usr_vishu',
          Date: dateStr,
          Completed: completed
        });
      });
    }
    localStorage.setItem('mock_logs', JSON.stringify(defaultLogs));
    localStorage.setItem('mock_achievements', JSON.stringify(defaultAchievements));

    const defaultRoutineLogs = [];
    const weekdayActivityIds = [
      'w_wake', 'w_cycling', 'w_yoga', 'w_bath', 'w_breakfast', 
      'w_mi_morning', 'w_prep', 'w_office_1', 'w_office_learn', 
      'w_office_2', 'w_lunch', 'w_office_3', 'w_office_code', 
      'w_office_4', 'w_refresh', 'w_mi_evening', 'w_dinner', 
      'w_ai_dev', 'w_content', 'w_winddown', 'w_sleep'
    ];
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      weekdayActivityIds.forEach((actId, idx) => {
        if (idx % 8 !== 0) {
          defaultRoutineLogs.push({
            LogID: `rl_${actId}_${i}`,
            UserID: 'usr_vishu',
            Date: dateStr,
            ActivityID: actId,
            Completed: true
          });
        }
      });
    }
    localStorage.setItem('mock_routine_logs', JSON.stringify(defaultRoutineLogs));
  } else {
    if (!localStorage.getItem('mock_habits')) {
      localStorage.setItem('mock_habits', JSON.stringify([]));
    }
    if (!localStorage.getItem('mock_logs')) {
      localStorage.setItem('mock_logs', JSON.stringify([]));
    }
    if (!localStorage.getItem('mock_achievements')) {
      localStorage.setItem('mock_achievements', JSON.stringify([]));
    }
    if (!localStorage.getItem('mock_routine_logs')) {
      localStorage.setItem('mock_routine_logs', JSON.stringify([]));
    }
  }

  // Initialize opportunity pipeline
  if (!localStorage.getItem('mock_opportunities')) {
    const defaultOpportunities = [
      { id: 'opp_1', clientName: 'MERN customization', source: 'WhatsApp', stage: 'Qualified Leads', value: 45000 },
      { id: 'opp_2', clientName: 'Corporate GenAI Training', source: 'LinkedIn', stage: 'Negotiations', value: 120000 },
      { id: 'opp_3', clientName: 'React Native enhancement', source: 'Previous Client', stage: 'Confirmed', value: 30000 },
      { id: 'opp_4', clientName: 'College Seminar', source: 'College', stage: 'New Leads', value: 15000 },
      { id: 'opp_5', clientName: 'Agentic AI consulting', source: 'Referral', stage: 'Proposals', value: 45000 }
    ];
    localStorage.setItem('mock_opportunities', JSON.stringify(defaultOpportunities));
  }

  // Initialize Today's Big 5
  if (!localStorage.getItem('mock_big_five')) {
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultBigFive = [
      { id: 'b5_1', category: 'HEALTH', taskName: 'Exercise/Yoga — 120 min', status: 'Done', xpReward: 15, date: todayStr },
      { id: 'b5_2', category: 'MONEY', taskName: 'Follow up 3 high-value training leads', status: 'In Progress', xpReward: 25, date: todayStr },
      { id: 'b5_3', category: 'BUILD', taskName: 'Complete AI CRM lead qualification workflow', status: 'Not Started', xpReward: 25, date: todayStr },
      { id: 'b5_4', category: 'LEARN', taskName: 'Agentic AI tool calling — 60 min', status: 'Not Started', xpReward: 15, date: todayStr },
      { id: 'b5_5', category: 'MI BUSINESS', taskName: '5 prospects + 3 follow-ups + distributor coaching', status: 'Not Started', xpReward: 20, date: todayStr }
    ];
    localStorage.setItem('mock_big_five', JSON.stringify(defaultBigFive));
  }

  // Initialize Time Allocation
  if (!localStorage.getItem('mock_time_allocation')) {
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultTime = [
      { date: todayStr, category: 'Health', hours: 2.0 },
      { date: todayStr, category: 'Paid Training', hours: 4.0 },
      { date: todayStr, category: 'Client Project', hours: 3.0 },
      { date: todayStr, category: 'Learning', hours: 1.5 },
      { date: todayStr, category: 'Portfolio Building', hours: 2.0 },
      { date: todayStr, category: 'Client Acquisition', hours: 1.0 },
      { date: todayStr, category: 'MI Lifestyle', hours: 1.0 }
    ];
    localStorage.setItem('mock_time_allocation', JSON.stringify(defaultTime));
  }
}

// Helpers to get/set tables
const getTable = (key) => {
  initMockDb();
  return JSON.parse(localStorage.getItem(key) || '[]');
};

const saveTable = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// SIMULATOR CONTROLLERS
export const mockDb = {
  login: (email, password) => {
    const users = getTable('mock_users');
    const user = users.find(u => u.Email.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error('User not found');
    if (user.Password !== password) throw new Error('Invalid password');
    return {
      userId: user.UserID,
      name: user.Name,
      email: user.Email,
      joinDate: user.JoinDate,
      xp: user.XP,
      level: user.Level,
      streak: user.Streak,
      longestStreak: user.LongestStreak,
      incomeReceived: user.IncomeReceived || 75000,
      incomeMilestone: user.IncomeMilestone || 150000,
      currentSkillFocus: user.CurrentSkillFocus || 'Agentic AI',
      todayLearningTarget: user.TodayLearningTarget || 'Tool Calling — 60 min',
      currentProjectName: user.CurrentProjectName || 'AI CRM Agent',
      todayBuildTaskName: user.TodayBuildTaskName || 'Lead Qualification Workflow',
      projectProgressPercent: user.ProjectProgressPercent || 42,
      activeDistributors: user.ActiveDistributors || 3,
      distributorsLeft: user.DistributorsLeft || 3,
      distributorsRight: user.DistributorsRight || 2,
      todayProspects: user.TodayProspects || 5,
      todayFollowUps: user.TodayFollowUps || 3,
      todayPresentations: user.TodayPresentations || 1,
      todayCoaching: user.TodayCoaching || 1,
      teamActivityCount: user.TeamActivityCount || 2,
      dayType: user.DayType || 'NORMAL GROWTH DAY'
    };
  },

  register: (name, email, password) => {
    const users = getTable('mock_users');
    const exists = users.some(u => u.Email.toLowerCase() === email.toLowerCase());
    if (exists) throw new Error('Email already registered');

    const userId = 'usr_' + Math.random().toString(36).substr(2, 9);
    const joinDate = new Date().toISOString().split('T')[0];

    const newUser = {
      UserID: userId,
      Name: name,
      Email: email,
      Password: password,
      JoinDate: joinDate,
      XP: 0,
      Level: 1,
      Streak: 0,
      LongestStreak: 0,
      IncomeReceived: 0,
      IncomeMilestone: 150000,
      CurrentSkillFocus: 'Agentic AI',
      TodayLearningTarget: 'Tool Calling — 60 min',
      CurrentProjectName: 'AI CRM Agent',
      TodayBuildTaskName: 'Lead Qualification Workflow',
      ProjectProgressPercent: 0,
      ActiveDistributors: 3,
      DistributorsLeft: 0,
      DistributorsRight: 0,
      TodayProspects: 0,
      TodayFollowUps: 0,
      TodayPresentations: 0,
      TodayCoaching: 0,
      TeamActivityCount: 0,
      DayType: 'NORMAL GROWTH DAY'
    };

    users.push(newUser);
    saveTable('mock_users', users);

    return {
      userId,
      name,
      email,
      joinDate,
      xp: 0,
      level: 1,
      streak: 0,
      longestStreak: 0,
      incomeReceived: 0,
      incomeMilestone: 150000,
      currentSkillFocus: 'Agentic AI',
      todayLearningTarget: 'Tool Calling — 60 min',
      currentProjectName: 'AI CRM Agent',
      todayBuildTaskName: 'Lead Qualification Workflow',
      projectProgressPercent: 0,
      activeDistributors: 3,
      distributorsLeft: 0,
      distributorsRight: 0,
      todayProspects: 0,
      todayFollowUps: 0,
      todayPresentations: 0,
      todayCoaching: 0,
      teamActivityCount: 0,
      dayType: 'NORMAL GROWTH DAY'
    };
  },

  getHabits: (userId) => {
    const habits = getTable('mock_habits');
    return habits.filter(h => h.UserID === userId).map(h => ({
      habitId: h.HabitID,
      userId: h.UserID,
      habitName: h.HabitName,
      description: h.Description,
      category: h.Category,
      xpReward: Number(h.XPReward),
      status: h.Status
    }));
  },

  createHabit: (userId, habitName, description, category, xpReward) => {
    const habits = getTable('mock_habits');
    const habitId = 'hab_' + Math.random().toString(36).substr(2, 9);

    const newHabit = {
      HabitID: habitId,
      UserID: userId,
      HabitName: habitName,
      Description: description || '',
      Category: category,
      XPReward: Number(xpReward) || 5,
      Status: 'Active'
    };

    habits.push(newHabit);
    saveTable('mock_habits', habits);

    return {
      habitId,
      userId,
      habitName,
      description,
      category,
      xpReward: newHabit.XPReward,
      status: 'Active'
    };
  },

  updateHabit: (habitId, userId, habitName, description, category, xpReward, status) => {
    const habits = getTable('mock_habits');
    const idx = habits.findIndex(h => h.HabitID === habitId && h.UserID === userId);
    if (idx === -1) throw new Error('Habit not found');

    habits[idx] = {
      ...habits[idx],
      HabitName: habitName,
      Description: description || '',
      Category: category,
      XPReward: Number(xpReward),
      Status: status || 'Active'
    };

    saveTable('mock_habits', habits);

    return {
      habitId,
      userId,
      habitName,
      description,
      category,
      xpReward: Number(xpReward),
      status: status || 'Active'
    };
  },

  deleteHabit: (habitId, userId) => {
    const habits = getTable('mock_habits');
    const filtered = habits.filter(h => !(h.HabitID === habitId && h.UserID === userId));
    saveTable('mock_habits', filtered);

    // Cascading delete logs
    const logs = getTable('mock_logs');
    const filteredLogs = logs.filter(l => l.HabitID !== habitId);
    saveTable('mock_logs', filteredLogs);

    return true;
  },

  logHabit: (userId, habitId, date, completed) => {
    const logs = getTable('mock_logs');
    const habits = getTable('mock_habits');
    const users = getTable('mock_users');

    const habit = habits.find(h => h.HabitID === habitId);
    if (!habit) throw new Error('Habit not found');

    const xpReward = Number(habit.XPReward) || 5;
    const logIndex = logs.findIndex(l => l.HabitID === habitId && l.UserID === userId && l.Date === date);

    const wasCompletedBefore = logIndex !== -1 ? logs[logIndex].Completed : false;
    const isCompletedNow = completed === true;

    if (logIndex !== -1) {
      logs[logIndex].Completed = isCompletedNow;
    } else {
      logs.push({
        LogID: 'log_' + Math.random().toString(36).substr(2, 9),
        HabitID: habitId,
        UserID: userId,
        Date: date,
        Completed: isCompletedNow
      });
    }
    saveTable('mock_logs', logs);

    // XP calculation
    let xpChange = 0;
    if (!wasCompletedBefore && isCompletedNow) {
      xpChange = xpReward;
    } else if (wasCompletedBefore && !isCompletedNow) {
      xpChange = -xpReward;
    }

    const userIdx = users.findIndex(u => u.UserID === userId);
    if (userIdx !== -1) {
      const user = users[userIdx];
      const newXP = Math.max(0, user.XP + xpChange);
      
      // Calculate level
      const { level } = getLevelDetails(newXP);

      // Recalculate streak
      const streakDetails = mockDb.calculateStreak(userId);

      users[userIdx] = {
        ...user,
        XP: newXP,
        Level: level,
        Streak: streakDetails.currentStreak,
        LongestStreak: streakDetails.longestStreak
      };
      saveTable('mock_users', users);

      // Evaluate achievements
      mockDb.evaluateAchievements(userId, newXP, streakDetails.completedCount, streakDetails.longestStreak);

      return {
        success: true,
        xp: newXP,
        level: level,
        streak: streakDetails.currentStreak,
        longestStreak: streakDetails.longestStreak
      };
    }
    throw new Error('User not found');
  },

  getDashboard: (userId) => {
    const users = getTable('mock_users');
    const habits = getTable('mock_habits');
    const logs = getTable('mock_logs');
    const achievements = getTable('mock_achievements');

    const user = users.find(u => u.UserID === userId);
    if (!user) throw new Error('User not found');

    const activeHabits = habits.filter(h => h.UserID === userId && h.Status === 'Active');
    const today = new Date().toISOString().split('T')[0];

    const todayLogs = logs.filter(l => l.UserID === userId && l.Date === today);

    const habitsChecklist = activeHabits.map(h => {
      const log = todayLogs.find(l => l.HabitID === h.HabitID);
      return {
        habitId: h.HabitID,
        habitName: h.HabitName,
        description: h.Description,
        category: h.Category,
        xpReward: Number(h.XPReward),
        completed: log ? log.Completed : false
      };
    });

    const userAchievements = achievements.filter(a => a.UserID === userId);

    // Initialize/Get Big Five for Today
    const bigFive = getTable('mock_big_five');
    let todayBigFive = bigFive.filter(item => item.date === today);
    if (todayBigFive.length === 0) {
      todayBigFive = [
        { id: 'b5_1_' + today, category: 'HEALTH', taskName: 'Exercise/Yoga — 120 min', status: 'Done', xpReward: 15, date: today },
        { id: 'b5_2_' + today, category: 'MONEY', taskName: 'Follow up 3 high-value training leads', status: 'In Progress', xpReward: 25, date: today },
        { id: 'b5_3_' + today, category: 'BUILD', taskName: 'Complete AI CRM lead qualification workflow', status: 'Not Started', xpReward: 25, date: today },
        { id: 'b5_4_' + today, category: 'LEARN', taskName: 'Agentic AI tool calling — 60 min', status: 'Not Started', xpReward: 15, date: today },
        { id: 'b5_5_' + today, category: 'MI BUSINESS', taskName: '5 prospects + 3 follow-ups + distributor coaching', status: 'Not Started', xpReward: 20, date: today }
      ];
      saveTable('mock_big_five', [...bigFive, ...todayBigFive]);
    }

    // Initialize/Get Time Allocation for Today
    const timeAlloc = getTable('mock_time_allocation');
    let todayTime = timeAlloc.filter(item => item.date === today);
    if (todayTime.length === 0) {
      todayTime = [
        { date: today, category: 'Health', hours: 2.0 },
        { date: today, category: 'Paid Training', hours: 4.0 },
        { date: today, category: 'Client Project', hours: 3.0 },
        { date: today, category: 'Learning', hours: 1.5 },
        { date: today, category: 'Portfolio Building', hours: 2.0 },
        { date: today, category: 'Client Acquisition', hours: 1.0 },
        { date: today, category: 'MI Lifestyle', hours: 1.0 }
      ];
      saveTable('mock_time_allocation', [...timeAlloc, ...todayTime]);
    }

    const opportunities = getTable('mock_opportunities');

    return {
      success: true,
      user: {
        userId: user.UserID,
        name: user.Name,
        email: user.Email,
        joinDate: user.JoinDate,
        xp: user.XP,
        level: user.Level,
        streak: user.Streak,
        longestStreak: user.LongestStreak,
        incomeReceived: user.IncomeReceived || 75000,
        incomeMilestone: user.IncomeMilestone || 150000,
        currentSkillFocus: user.CurrentSkillFocus || 'Agentic AI',
        todayLearningTarget: user.TodayLearningTarget || 'Tool Calling — 60 min',
        currentProjectName: user.CurrentProjectName || 'AI CRM Agent',
        todayBuildTaskName: user.TodayBuildTaskName || 'Lead Qualification Workflow',
        projectProgressPercent: user.ProjectProgressPercent || 42,
        activeDistributors: user.ActiveDistributors || 3,
        distributorsLeft: user.DistributorsLeft || 3,
        distributorsRight: user.DistributorsRight || 2,
        todayProspects: user.TodayProspects || 5,
        todayFollowUps: user.TodayFollowUps || 3,
        todayPresentations: user.TodayPresentations || 1,
        todayCoaching: user.TodayCoaching || 1,
        teamActivityCount: user.TeamActivityCount || 2,
        dayType: user.DayType || 'NORMAL GROWTH DAY'
      },
      todayQuests: habitsChecklist,
      achievementsCount: userAchievements.length,
      todayBigFive,
      opportunities,
      todayTime
    };
  },

  updateUserProperty: (userId, key, value) => {
    const users = getTable('mock_users');
    const idx = users.findIndex(u => u.UserID === userId);
    if (idx !== -1) {
      users[idx][key] = value;
      saveTable('mock_users', users);
      return true;
    }
    return false;
  },

  updateBigFiveStatus: (userId, taskId, status) => {
    const bigFive = getTable('mock_big_five');
    const idx = bigFive.findIndex(item => item.id === taskId);
    if (idx !== -1) {
      const oldStatus = bigFive[idx].status;
      bigFive[idx].status = status;
      saveTable('mock_big_five', bigFive);

      // Award XP when marked 'Done'
      let xpChange = 0;
      const xpReward = Number(bigFive[idx].xpReward) || 10;
      if (oldStatus !== 'Done' && status === 'Done') {
        xpChange = xpReward;
      } else if (oldStatus === 'Done' && status !== 'Done') {
        xpChange = -xpReward;
      }

      if (xpChange !== 0) {
        const users = getTable('mock_users');
        const userIdx = users.findIndex(u => u.UserID === userId);
        if (userIdx !== -1) {
          const user = users[userIdx];
          const newXP = Math.max(0, user.XP + xpChange);
          const { level } = getLevelDetails(newXP);

          users[userIdx] = {
            ...user,
            XP: newXP,
            Level: level
          };
          saveTable('mock_users', users);
          return { success: true, xp: newXP, level };
        }
      }
      return { success: true };
    }
    return { success: false, error: 'Task not found' };
  },

  updateOpportunity: (userId, opp) => {
    const opportunities = getTable('mock_opportunities');
    const idx = opportunities.findIndex(o => o.id === opp.id);
    if (idx !== -1) {
      opportunities[idx] = { ...opportunities[idx], ...opp };
    } else {
      opportunities.push({
        id: opp.id || 'opp_' + Math.random().toString(36).substr(2, 9),
        ...opp
      });
    }
    saveTable('mock_opportunities', opportunities);
    return true;
  },

  deleteOpportunity: (userId, oppId) => {
    const opportunities = getTable('mock_opportunities');
    const filtered = opportunities.filter(o => o.id !== oppId);
    saveTable('mock_opportunities', filtered);
    return true;
  },

  updateTimeAllocation: (userId, date, category, hours) => {
    const timeAlloc = getTable('mock_time_allocation');
    const idx = timeAlloc.findIndex(t => t.date === date && t.category === category);
    if (idx !== -1) {
      timeAlloc[idx].hours = Number(hours);
    } else {
      timeAlloc.push({
        date,
        category,
        hours: Number(hours)
      });
    }
    saveTable('mock_time_allocation', timeAlloc);
    return true;
  },

  getAnalytics: (userId) => {
    const logs = getTable('mock_logs').filter(l => l.UserID === userId);
    const habits = getTable('mock_habits').filter(h => h.UserID === userId);

    // Completion percentage per habit
    const habitStats = habits.map(h => {
      const habitLogs = logs.filter(l => l.HabitID === h.HabitID);
      const completed = habitLogs.filter(l => l.Completed).length;
      const total = habitLogs.length;
      return {
        habitId: h.HabitID,
        habitName: h.HabitName,
        category: h.Category,
        completed,
        total,
        successRate: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    });

    // 7 days weekly report
    const weeklyReport = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayLogs = logs.filter(l => l.Date === dateStr);
      const comp = dayLogs.filter(l => l.Completed).length;
      const tot = dayLogs.length;

      weeklyReport.push({
        date: dateStr,
        completed: comp,
        total: tot,
        percent: tot > 0 ? Math.round((comp / tot) * 100) : 0
      });
    }

    // Category Breakdown
    const categories = {};
    logs.forEach(l => {
      if (l.Completed) {
        const h = habits.find(hb => hb.HabitID === l.HabitID);
        if (h) {
          categories[h.Category] = (categories[h.Category] || 0) + 1;
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
  },

  getAchievements: (userId) => {
    const achievements = getTable('mock_achievements');
    return achievements.filter(a => a.UserID === userId).map(a => ({
      badgeName: a.BadgeName,
      unlockedDate: a.UnlockedDate
    }));
  },

  calculateStreak: (userId) => {
    const logs = getTable('mock_logs').filter(l => l.UserID === userId && l.Completed);
    if (logs.length === 0) return { currentStreak: 0, longestStreak: 0, completedCount: 0 };

    // Unique sorted dates descending
    const dates = [...new Set(logs.map(l => l.Date))].sort((a, b) => new Date(b) - new Date(a));
    const completedCount = logs.length;

    // Longest streak
    let maxStreak = 0;
    let tempStreak;
    const sortedAsc = [...dates].reverse();

    if (sortedAsc.length > 0) {
      tempStreak = 1;
      maxStreak = 1;
      for (let i = 1; i < sortedAsc.length; i++) {
        const d1 = new Date(sortedAsc[i-1]);
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
        const dNext = new Date(dates[j+1]);
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
  },

  evaluateAchievements: (userId, xp, completedCount, longestStreak) => {
    const achievements = getTable('mock_achievements');
    const unlocked = achievements.filter(a => a.UserID === userId).map(a => a.BadgeName);
    const today = new Date().toISOString().split('T')[0];

    const checks = [
      { badge: "First Habit Completed", condition: completedCount >= 1 },
      { badge: "7 Day Streak", condition: longestStreak >= 7 },
      { badge: "30 Day Streak", condition: longestStreak >= 30 },
      { badge: "100 Tasks Completed", condition: completedCount >= 100 },
      { badge: "1000 XP Earned", condition: xp >= 1000 }
    ];

    checks.forEach(check => {
      if (check.condition && !unlocked.includes(check.badge)) {
        achievements.push({
          AchievementID: 'ach_' + Math.random().toString(36).substr(2, 9),
          UserID: userId,
          BadgeName: check.badge,
          UnlockedDate: today
        });
      }
    });

    saveTable('mock_achievements', achievements);
  },

  getCalendar: (userId) => {
    const logs = getTable('mock_logs').filter(l => l.UserID === userId);
    const habits = getTable('mock_habits').filter(h => h.UserID === userId);
    
    return {
      success: true,
      logs: logs.map(l => ({
        habitId: l.HabitID,
        date: l.Date.indexOf('T') !== -1 ? l.Date.split('T')[0] : l.Date,
        completed: l.Completed
      })),
      habits: habits.map(h => ({
        habitId: h.HabitID,
        habitName: h.HabitName
      }))
    };
  },

  getRoutineLogs: (userId, date) => {
    const logs = getTable('mock_routine_logs');
    return logs
      .filter(l => l.UserID === userId && l.Date === date && l.Completed)
      .map(l => l.ActivityID);
  },

  logRoutineActivity: (userId, activityId, date, completed, xpReward) => {
    const logs = getTable('mock_routine_logs');
    const users = getTable('mock_users');

    const logIdx = logs.findIndex(
      l => l.UserID === userId && l.Date === date && l.ActivityID === activityId
    );
    const wasCompleted = logIdx !== -1 ? logs[logIdx].Completed : false;

    if (logIdx !== -1) {
      logs[logIdx].Completed = completed;
    } else {
      logs.push({
        LogID: 'rl_' + Math.random().toString(36).substr(2, 9),
        UserID: userId,
        Date: date,
        ActivityID: activityId,
        Completed: completed
      });
    }
    saveTable('mock_routine_logs', logs);

    let xpChange = 0;
    if (!wasCompleted && completed) {
      xpChange = xpReward;
    } else if (wasCompleted && !completed) {
      xpChange = -xpReward;
    }

    const userIdx = users.findIndex(u => u.UserID === userId);
    if (userIdx !== -1) {
      const user = users[userIdx];
      const newXP = Math.max(0, user.XP + xpChange);
      const { level } = getLevelDetails(newXP);

      users[userIdx] = {
        ...user,
        XP: newXP,
        Level: level
      };
      saveTable('mock_users', users);

      return {
        success: true,
        xp: newXP,
        level: level,
        streak: user.Streak,
        longestStreak: user.LongestStreak
      };
    }
    throw new Error('User not found');
  }
};

