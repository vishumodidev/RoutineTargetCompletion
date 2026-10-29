/* eslint-disable */
// SPREADSHEET SETUP
// If unbound, set your Spreadsheet ID here: e.g. "1ABC..."
var SPREADSHEET_ID = "1xiJ0F_35G-8YdpRs4sKJ6hTHMWpS95klr19Z27jl9bA";

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

// Auto-initialize sheets and return sheet instance
function getOrCreateSheet(name, headers) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function getFormattedDate(dateVal) {
  if (!dateVal) return "";
  if (dateVal instanceof Date) {
    var year = dateVal.getFullYear();
    var month = ("0" + (dateVal.getMonth() + 1)).slice(-2);
    var day = ("0" + dateVal.getDate()).slice(-2);
    return year + "-" + month + "-" + day;
  }
  var str = String(dateVal);
  if (str.indexOf("T") !== -1) {
    return str.split("T")[0];
  }
  if (str.indexOf(" ") !== -1 && !isNaN(Date.parse(str))) {
    var parsedDate = new Date(str);
    var pYear = parsedDate.getFullYear();
    var pMonth = ("0" + (parsedDate.getMonth() + 1)).slice(-2);
    var pDay = ("0" + parsedDate.getDate()).slice(-2);
    return pYear + "-" + pMonth + "-" + pDay;
  }
  return str;
}

// SHEETS CONSTANTS
var SHEETS = {
  USERS: { name: "Users", headers: ["UserID", "Name", "Email", "Password", "JoinDate", "XP", "Level", "Streak", "LongestStreak"] },
  HABITS: { name: "Habits", headers: ["HabitID", "UserID", "HabitName", "Description", "Category", "XPReward", "Status"] },
  LOGS: { name: "HabitLogs", headers: ["LogID", "HabitID", "UserID", "Date", "Completed"] },
  ACHIEVEMENTS: { name: "Achievements", headers: ["AchievementID", "UserID", "BadgeName", "UnlockedDate"] },
  ROUTINE_LOGS: { name: "RoutineLogs", headers: ["LogID", "UserID", "Date", "ActivityID", "Completed"] },
  INVESTMENT_PROFILE: { name: "InvestmentProfile", headers: ["UserID", "MonthlyIncomeMin", "MonthlyIncomeMax", "BankSavings", "MutualFundHoldings", "EmergencyFundBalance", "HouseFundBalance", "DaughterFundBalance", "MonthlySavingsTarget", "LastUpdated"] },
  INVESTMENT_FUNDS: { name: "InvestmentFunds", headers: ["FundID", "UserID", "Name", "Category", "ReferenceSIP", "ActiveSIP", "ActualThisMonth", "Status", "Instruction"] },
  MONTHLY_BUDGETS: { name: "MonthlyBudgets", headers: ["BudgetID", "UserID", "MonthYear", "SalaryIncome", "TrainingFreelanceIncome", "OtherIncome", "Rent", "Groceries", "ParentsSupport", "Utilities", "Transport", "TermInsuranceMonthly", "HealthInsuranceMonthly", "Healthcare", "OtherExpenses", "ActualInvestments", "EmergencySavings", "HouseSavings", "DaughterSavings", "Notes"] },
  FINANCIAL_GOALS: { name: "FinancialGoals", headers: ["GoalID", "UserID", "Name", "Category", "TargetAmount", "DownPaymentTarget", "RegistrationCosts", "CurrentBalance", "MonthlyTarget", "StartDate", "Deadline", "Priority", "Status", "Notes"] },
  TRANSACTIONS: { name: "ContributionTransactions", headers: ["TransactionID", "UserID", "Date", "Category", "EntityName", "Amount", "Type", "PaymentMode", "Notes"] },
  TASKS: { name: "Tasks", headers: ["TaskID", "UserID", "Title", "Description", "Category", "ProjectArea", "LinkedGoalID", "Priority", "Status", "EstimatedDuration", "ActualDuration", "StartDate", "DueDate", "DeadlineType", "Dependencies", "IncomeImpact", "Importance", "Urgency", "Readiness", "NextAction", "Recurrence", "Source", "ExternalID", "CreatedAt", "UpdatedAt", "CompletedAt"] },
  DAILY_PLANS: { name: "DailyPlans", headers: ["PlanID", "UserID", "PlanDate", "DayType", "AvailableMinutes", "PlannedMinutes", "SelectedTaskIDs", "TaskOrder", "AcceptanceStatuses", "DeferredTasksJSON", "SelectionRationale", "CreatedAt", "UpdatedAt"] },
  REVIEWS: { name: "Reviews", headers: ["ReviewID", "UserID", "ReviewType", "PeriodKey", "LinkedPlanID", "MetricsJSON", "ReflectionText", "DeferralsJSON", "NextStepsJSON", "CreatedAt", "UpdatedAt"] }
};

function getUsersSheet() { return getOrCreateSheet(SHEETS.USERS.name, SHEETS.USERS.headers); }
function getHabitsSheet() { return getOrCreateSheet(SHEETS.HABITS.name, SHEETS.HABITS.headers); }
function getLogsSheet() { return getOrCreateSheet(SHEETS.LOGS.name, SHEETS.LOGS.headers); }
function getAchievementsSheet() { return getOrCreateSheet(SHEETS.ACHIEVEMENTS.name, SHEETS.ACHIEVEMENTS.headers); }
function getRoutineLogsSheet() { return getOrCreateSheet(SHEETS.ROUTINE_LOGS.name, SHEETS.ROUTINE_LOGS.headers); }
function getInvestmentProfileSheet() { return getOrCreateSheet(SHEETS.INVESTMENT_PROFILE.name, SHEETS.INVESTMENT_PROFILE.headers); }
function getInvestmentFundsSheet() { return getOrCreateSheet(SHEETS.INVESTMENT_FUNDS.name, SHEETS.INVESTMENT_FUNDS.headers); }
function getMonthlyBudgetsSheet() { return getOrCreateSheet(SHEETS.MONTHLY_BUDGETS.name, SHEETS.MONTHLY_BUDGETS.headers); }
function getFinancialGoalsSheet() { return getOrCreateSheet(SHEETS.FINANCIAL_GOALS.name, SHEETS.FINANCIAL_GOALS.headers); }
function getTransactionsSheet() { return getOrCreateSheet(SHEETS.TRANSACTIONS.name, SHEETS.TRANSACTIONS.headers); }
function getTasksSheet() { return getOrCreateSheet(SHEETS.TASKS.name, SHEETS.TASKS.headers); }
function getDailyPlansSheet() { return getOrCreateSheet(SHEETS.DAILY_PLANS.name, SHEETS.DAILY_PLANS.headers); }
function getReviewsSheet() { return getOrCreateSheet(SHEETS.REVIEWS.name, SHEETS.REVIEWS.headers); }

// ORM UTILITIES FOR SHEETS
function getSheetRows(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    row._rowNum = i + 1;
    rows.push(row);
  }
  return rows;
}

function insertRow(sheet, data, headers) {
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var key = headers[i];
    row.push(data[key] !== undefined ? data[key] : "");
  }
  sheet.appendRow(row);
}

function updateRowByColumn(sheet, columnName, columnValue, updateData) {
  var rows = getSheetRows(sheet);
  var headers = sheet.getDataRange().getValues()[0];
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][columnName] == columnValue) {
      var rowNum = rows[i]._rowNum;
      for (var key in updateData) {
        var colIndex = headers.indexOf(key);
        if (colIndex !== -1) {
          sheet.getRange(rowNum, colIndex + 1).setValue(updateData[key]);
        }
      }
      return true;
    }
  }
  return false;
}

function deleteRowByColumn(sheet, columnName, columnValue) {
  var rows = getSheetRows(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][columnName] == columnValue) {
      sheet.deleteRow(rows[i]._rowNum);
      // Recurse to delete any other matching rows (in case of log/habit cascades)
      deleteRowByColumn(sheet, columnName, columnValue);
      return true;
    }
  }
  return false;
}

// CORS / RESPONSE UTILITIES
function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function error(message) {
  return response({ success: false, error: message });
}

// XP Rules
function calculateLevel(xp) {
  var points = Number(xp) || 0;
  if (points >= 1000) return 5;
  if (points >= 500) return 4;
  if (points >= 250) return 3;
  if (points >= 100) return 2;
  return 1;
}

// MAIN ENTRYPOINTS
function doGet(e) {
  try {
    var params = e.parameter;
    var action = params.action;
    var userId = params.userId;

    if (!action) return error("Missing action parameter");

    switch (action) {
      case "habits":
        if (!userId) return error("Missing userId parameter");
        return getHabits(userId);
      case "dashboard":
        if (!userId) return error("Missing userId parameter");
        return getDashboard(userId);
      case "analytics":
        if (!userId) return error("Missing userId parameter");
        return getAnalytics(userId);
      case "calendar":
        if (!userId) return error("Missing userId parameter");
        return getCalendarData(userId);
      case "achievements":
        if (!userId) return error("Missing userId parameter");
        return getAchievements(userId);
      case "routineLogs":
        if (!userId) return error("Missing userId parameter");
        var date = params.date;
        if (!date) return error("Missing date parameter");
        return getRoutineLogs(userId, date);
      case "investmentOverview":
        if (!userId) return error("Missing userId parameter");
        return getInvestmentOverview(userId);
      case "monthlyBudget":
        if (!userId) return error("Missing userId parameter");
        return getMonthlyBudget(userId, params.monthYear);
      case "financialGoals":
        if (!userId) return error("Missing userId parameter");
        return getFinancialGoals(userId);
      case "tasks":
        if (!userId) return error("Missing userId parameter");
        return getTasks(userId, params);
      case "dailyPlan":
        if (!userId) return error("Missing userId parameter");
        return getDailyPlan(userId, params.date);
      case "review":
        if (!userId) return error("Missing userId parameter");
        return getReview(userId, params.type, params.periodKey);
      case "reviewsHistory":
        if (!userId) return error("Missing userId parameter");
        return getReviewsHistory(userId, params.type);
      default:
        return error("Invalid action: " + action);
    }
  } catch (err) {
    return error(err.toString());
  }
}

function doPost(e) {
  try {
    var payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      payload = e.parameter;
    }

    var action = payload.action;
    if (!action) return error("Missing action payload");

    switch (action) {
      case "login":
        return login(payload.email, payload.password);
      case "register":
        return register(payload.name, payload.email, payload.password);
      case "createHabit":
        return createHabit(payload.userId, payload.habitName, payload.description, payload.category, payload.xpReward);
      case "updateHabit":
        return updateHabit(payload.habitId, payload.userId, payload.habitName, payload.description, payload.category, payload.xpReward, payload.status);
      case "deleteHabit":
        return deleteHabit(payload.habitId, payload.userId);
      case "habitLog":
        return logHabit(payload.userId, payload.habitId, payload.date, payload.completed);
      case "logRoutine":
        return logRoutineActivity(payload.userId, payload.activityId, payload.date, payload.completed, payload.xpReward);
      case "updateInvestmentProfile":
        return updateInvestmentProfile(payload.userId, payload.profileData);
      case "updateInvestmentFund":
        return updateInvestmentFund(payload.userId, payload.fundId, payload.fundData);
      case "saveMonthlyBudget":
        return saveMonthlyBudget(payload.userId, payload.budgetData);
      case "saveFinancialGoal":
        return saveFinancialGoal(payload.userId, payload.goalData);
      case "deleteFinancialGoal":
        return deleteFinancialGoal(payload.userId, payload.goalId);
      case "addContributionTransaction":
        return addContributionTransaction(payload.userId, payload.txData);
      case "saveTask":
        return saveTask(payload.userId, payload.task);
      case "deleteTask":
        return deleteTask(payload.userId, payload.taskId);
      case "saveDailyPlan":
        return saveDailyPlan(payload.userId, payload.plan);
      case "saveReview":
        return saveReview(payload.userId, payload.review);
      case "aiGenerate":
        return handleAiGenerate(payload.userId, payload);
      default:
        return error("Invalid POST action: " + action);
    }
  } catch (err) {
    return error(err.toString());
  }
}

// API CONTROLLERS

// 1. POST /login
function login(email, password) {
  if (!email || !password) return error("Email and Password are required");

  var sheet = getUsersSheet();
  var users = getSheetRows(sheet);

  for (var i = 0; i < users.length; i++) {
    if (users[i].Email.toLowerCase() === email.toLowerCase()) {
      if (users[i].Password === password) {
        var user = users[i];
        return response({
          success: true,
          user: {
            userId: user.UserID,
            name: user.Name,
            email: user.Email,
            joinDate: user.JoinDate,
            xp: Number(user.XP) || 0,
            level: Number(user.Level) || 1,
            streak: Number(user.Streak) || 0,
            longestStreak: Number(user.LongestStreak) || 0
          }
        });
      } else {
        return error("Invalid password");
      }
    }
  }
  return error("User not found");
}

// 2. POST /register
function register(name, email, password) {
  if (!name || !email || !password) return error("Name, email, and password are required");

  var sheet = getUsersSheet();
  var users = getSheetRows(sheet);

  for (var i = 0; i < users.length; i++) {
    if (users[i].Email.toLowerCase() === email.toLowerCase()) {
      return error("Email already registered");
    }
  }

  var userId = "usr_" + Math.random().toString(36).substr(2, 9);
  var joinDate = new Date().toISOString().split("T")[0];

  var newUser = {
    UserID: userId,
    Name: name,
    Email: email,
    Password: password, // Stored as simple plaintext for Apps Script sheets demo
    JoinDate: joinDate,
    XP: 0,
    Level: 1,
    Streak: 0,
    LongestStreak: 0
  };

  insertRow(sheet, newUser, SHEETS.USERS.headers);

  return response({
    success: true,
    user: {
      userId: userId,
      name: name,
      email: email,
      joinDate: joinDate,
      xp: 0,
      level: 1,
      streak: 0,
      longestStreak: 0
    }
  });
}

// 3. GET /habits
function getHabits(userId) {
  var sheet = getHabitsSheet();
  var habits = getSheetRows(sheet);
  var userHabits = habits.filter(function (h) {
    return h.UserID == userId;
  }).map(function (h) {
    return {
      habitId: h.HabitID,
      userId: h.UserID,
      habitName: h.HabitName,
      description: h.Description,
      category: h.Category,
      xpReward: Number(h.XPReward) || 5,
      status: h.Status || "Active"
    };
  });

  return response({ success: true, habits: userHabits });
}

// 4. POST /habits
function createHabit(userId, habitName, description, category, xpReward) {
  if (!userId || !habitName || !category) return error("Missing required habit details");

  var sheet = getHabitsSheet();
  var habitId = "hab_" + Math.random().toString(36).substr(2, 9);

  var newHabit = {
    HabitID: habitId,
    UserID: userId,
    HabitName: habitName,
    Description: description || "",
    Category: category,
    XPReward: Number(xpReward) || 5,
    Status: "Active"
  };

  insertRow(sheet, newHabit, SHEETS.HABITS.headers);

  return response({
    success: true,
    habit: {
      habitId: habitId,
      userId: userId,
      habitName: habitName,
      description: description || "",
      category: category,
      xpReward: Number(xpReward) || 5,
      status: "Active"
    }
  });
}

// 5. PUT /habits
function updateHabit(habitId, userId, habitName, description, category, xpReward, status) {
  if (!habitId || !userId) return error("Missing habitId or userId");

  var sheet = getHabitsSheet();
  var updateData = {
    HabitName: habitName,
    Description: description || "",
    Category: category,
    XPReward: Number(xpReward) || 5,
    Status: status || "Active"
  };

  var success = updateRowByColumn(sheet, "HabitID", habitId, updateData);

  if (success) {
    return response({
      success: true,
      habit: {
        habitId: habitId,
        userId: userId,
        habitName: habitName,
        description: description,
        category: category,
        xpReward: Number(xpReward),
        status: status
      }
    });
  }
  return error("Habit not found");
}

// 6. DELETE /habits
function deleteHabit(habitId, userId) {
  if (!habitId) return error("Missing habitId");

  var habitSheet = getHabitsSheet();
  var logSheet = getLogsSheet();

  // Delete the habit
  var deletedHabit = deleteRowByColumn(habitSheet, "HabitID", habitId);
  // Cascading delete habit logs
  deleteRowByColumn(logSheet, "HabitID", habitId);

  return response({ success: deletedHabit });
}

// 7. POST /habit-log
function logHabit(userId, habitId, date, completed) {
  if (!userId || !habitId || !date) return error("Missing parameters for logging");

  var logSheet = getLogsSheet();
  var logs = getSheetRows(logSheet);
  var habitsSheet = getHabitsSheet();
  var habits = getSheetRows(habitsSheet);

  var targetHabit = habits.find(function (h) { return h.HabitID == habitId; });
  if (!targetHabit) return error("Habit not found");

  var xpReward = Number(targetHabit.XPReward) || 5;
  var existingLog = logs.find(function (l) {
    return l.HabitID == habitId && l.UserID == userId && getFormattedDate(l.Date) === date;
  });

  var wasCompletedBefore = existingLog ? (existingLog.Completed == "TRUE" || existingLog.Completed === true) : false;
  var isCompletedNow = completed === true || completed === "true";

  if (existingLog) {
    // Update log
    updateRowByColumn(logSheet, "LogID", existingLog.LogID, { Completed: isCompletedNow });
  } else {
    // Create new log
    var logId = "log_" + Math.random().toString(36).substr(2, 9);
    insertRow(logSheet, {
      LogID: logId,
      HabitID: habitId,
      UserID: userId,
      Date: date,
      Completed: isCompletedNow
    }, SHEETS.LOGS.headers);
  }

  // Calculate XP Difference
  var xpChange = 0;
  if (!wasCompletedBefore && isCompletedNow) {
    xpChange = xpReward;
  } else if (wasCompletedBefore && !isCompletedNow) {
    xpChange = -xpReward;
  }

  // Update User XP, Level, and Streak
  var userSheet = getUsersSheet();
  var users = getSheetRows(userSheet);
  var targetUser = users.find(function (u) { return u.UserID == userId; });

  if (targetUser) {
    var currentXP = Math.max(0, (Number(targetUser.XP) || 0) + xpChange);
    var currentLevel = calculateLevel(currentXP);

    // Recalculate streak
    var streakDetails = calculateStreakForUser(userId);

    updateRowByColumn(userSheet, "UserID", userId, {
      XP: currentXP,
      Level: currentLevel,
      Streak: streakDetails.currentStreak,
      LongestStreak: streakDetails.longestStreak
    });

    // Run Achievement Evaluator
    evaluateAchievements(userId, currentXP, streakDetails.completedCount, streakDetails.longestStreak);

    return response({
      success: true,
      xp: currentXP,
      level: currentLevel,
      streak: streakDetails.currentStreak,
      longestStreak: streakDetails.longestStreak
    });
  }

  return error("User record error");
}

// 8. GET /dashboard
function getDashboard(userId) {
  var userSheet = getUsersSheet();
  var users = getSheetRows(userSheet);
  var targetUser = users.find(function (u) { return u.UserID == userId; });

  if (!targetUser) return error("User not found");

  var habitsSheet = getHabitsSheet();
  var habits = getSheetRows(habitsSheet).filter(function (h) { return h.UserID == userId && h.Status == "Active"; });

  var today = new Date().toISOString().split("T")[0];
  var logsSheet = getLogsSheet();
  var logs = getSheetRows(logsSheet).filter(function (l) {
    return l.UserID == userId && getFormattedDate(l.Date) === today;
  });

  var habitsChecklist = habits.map(function (h) {
    var log = logs.find(function (l) { return l.HabitID == h.HabitID; });
    return {
      habitId: h.HabitID,
      habitName: h.HabitName,
      description: h.Description,
      category: h.Category,
      xpReward: Number(h.XPReward) || 5,
      completed: log ? (log.Completed == "TRUE" || log.Completed === true) : false
    };
  });

  var achievementsSheet = getAchievementsSheet();
  var userAchievements = getSheetRows(achievementsSheet).filter(function (a) { return a.UserID == userId; });

  return response({
    success: true,
    user: {
      userId: targetUser.UserID,
      name: targetUser.Name,
      email: targetUser.Email,
      joinDate: targetUser.JoinDate,
      xp: Number(targetUser.XP) || 0,
      level: Number(targetUser.Level) || 1,
      streak: Number(targetUser.Streak) || 0,
      longestStreak: Number(targetUser.LongestStreak) || 0
    },
    todayQuests: habitsChecklist,
    achievementsCount: userAchievements.length
  });
}

// 9. GET /analytics
function getAnalytics(userId) {
  var logsSheet = getLogsSheet();
  var logs = getSheetRows(logsSheet).filter(function (l) { return l.UserID == userId; });

  var habitsSheet = getHabitsSheet();
  var habits = getSheetRows(habitsSheet).filter(function (h) { return h.UserID == userId; });

  // Calculate completion percentage per habit
  var habitStats = habits.map(function (h) {
    var habitLogs = logs.filter(function (l) { return l.HabitID == h.HabitID; });
    var completed = habitLogs.filter(function (l) { return l.Completed == "TRUE" || l.Completed === true; }).length;
    var total = habitLogs.length;
    var rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      habitId: h.HabitID,
      habitName: h.HabitName,
      category: h.Category,
      completed: completed,
      total: total,
      successRate: rate
    };
  });

  // Calculate completion rates over last 7 days (Weekly Report)
  var weeklyReport = [];
  for (var i = 6; i >= 0; i--) {
    var date = new Date();
    date.setDate(date.getDate() - i);
    var dateStr = date.toISOString().split("T")[0];

    var dayLogs = logs.filter(function (l) { return getFormattedDate(l.Date) === dateStr; });
    var comp = dayLogs.filter(function (l) { return l.Completed == "TRUE" || l.Completed === true; }).length;
    var tot = dayLogs.length;

    weeklyReport.push({
      date: dateStr,
      completed: comp,
      total: tot,
      percent: tot > 0 ? Math.round((comp / tot) * 100) : 0
    });
  }

  // Category Breakdown
  var categories = {};
  logs.forEach(function (l) {
    if (l.Completed == "TRUE" || l.Completed === true) {
      var h = habits.find(function (hb) { return hb.HabitID == l.HabitID; });
      if (h) {
        categories[h.Category] = (categories[h.Category] || 0) + 1;
      }
    }
  });

  var categoryBreakdown = Object.keys(categories).map(function (cat) {
    return { category: cat, value: categories[cat] };
  });

  return response({
    success: true,
    habitStats: habitStats,
    weeklyReport: weeklyReport,
    categoryBreakdown: categoryBreakdown
  });
}

// 10. GET /achievements
function getAchievements(userId) {
  var sheet = getAchievementsSheet();
  var achievements = getSheetRows(sheet).filter(function (a) { return a.UserID == userId; });

  var badges = achievements.map(function (a) {
    return {
      badgeName: a.BadgeName,
      unlockedDate: a.UnlockedDate
    };
  });

  return response({
    success: true,
    achievements: badges
  });
}

// STREAK ENGINE HELPER
function calculateStreakForUser(userId) {
  var logsSheet = getLogsSheet();
  var logs = getSheetRows(logsSheet).filter(function (l) {
    return l.UserID == userId && (l.Completed == "TRUE" || l.Completed === true);
  });

  if (logs.length === 0) {
    return { currentStreak: 0, longestStreak: 0, completedCount: 0 };
  }

  // Unique dates of completions sorted descending
  var dates = logs.map(function (l) {
    return getFormattedDate(l.Date);
  }).filter(function (val, index, self) {
    return self.indexOf(val) === index;
  }).sort(function (a, b) {
    return new Date(b) - new Date(a);
  });

  var completedCount = logs.length;

  // Calculate longest streak historically
  var maxStreak = 0;
  var tempStreak = 0;
  var sortedAscDates = dates.slice().reverse();

  if (sortedAscDates.length > 0) {
    tempStreak = 1;
    maxStreak = 1;
    for (var i = 1; i < sortedAscDates.length; i++) {
      var d1 = new Date(sortedAscDates[i - 1]);
      var d2 = new Date(sortedAscDates[i]);
      var diffTime = Math.abs(d2 - d1);
      var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
  }

  // Calculate current streak from today/yesterday backwards
  var currentStreak = 0;
  var today = new Date().toISOString().split("T")[0];
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = yesterday.toISOString().split("T")[0];

  var startIdx = -1;
  if (dates.indexOf(today) !== -1) {
    startIdx = dates.indexOf(today);
  } else if (dates.indexOf(yesterdayStr) !== -1) {
    startIdx = dates.indexOf(yesterdayStr);
  }

  if (startIdx !== -1) {
    currentStreak = 1;
    for (var j = startIdx; j < dates.length - 1; j++) {
      var dCurrent = new Date(dates[j]);
      var dNext = new Date(dates[j + 1]);
      var diff = Math.ceil(Math.abs(dCurrent - dNext) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Guarantee longest streak is at least current streak
  if (currentStreak > maxStreak) {
    maxStreak = currentStreak;
  }

  return {
    currentStreak: currentStreak,
    longestStreak: maxStreak,
    completedCount: completedCount
  };
}

// ACHIEVEMENT CHECKER ENGINE
function evaluateAchievements(userId, xp, completedCount, longestStreak) {
  var sheet = getAchievementsSheet();
  var achievements = getSheetRows(sheet).filter(function (a) { return a.UserID == userId; });
  var unlockedBadges = achievements.map(function (a) { return a.BadgeName; });

  var today = new Date().toISOString().split("T")[0];

  var checks = [
    { badge: "First Habit Completed", condition: completedCount >= 1 },
    { badge: "7 Day Streak", condition: longestStreak >= 7 },
    { badge: "30 Day Streak", condition: longestStreak >= 30 },
    { badge: "100 Tasks Completed", condition: completedCount >= 100 },
    { badge: "1000 XP Earned", condition: xp >= 1000 }
  ];

  checks.forEach(function (check) {
    if (check.condition && unlockedBadges.indexOf(check.badge) === -1) {
      insertRow(sheet, {
        AchievementID: "ach_" + Math.random().toString(36).substr(2, 9),
        UserID: userId,
        BadgeName: check.badge,
        UnlockedDate: today
      }, SHEETS.ACHIEVEMENTS.headers);
    }
  });
}

// 11. GET /calendar
function getCalendarData(userId) {
  var logsSheet = getLogsSheet();
  var logs = getSheetRows(logsSheet).filter(function (l) { return l.UserID == userId; });
  var habitsSheet = getHabitsSheet();
  var habits = getSheetRows(habitsSheet).filter(function (h) { return h.UserID == userId; });

  var calendarLogs = logs.map(function (l) {
    return {
      habitId: l.HabitID,
      date: getFormattedDate(l.Date),
      completed: l.Completed == "TRUE" || l.Completed === true
    };
  });

  var habitMap = habits.map(function (h) {
    return {
      habitId: h.HabitID,
      habitName: h.HabitName
    };
  });

  return response({
    success: true,
    logs: calendarLogs,
    habits: habitMap
  });
}

// 12. GET /routineLogs
function getRoutineLogs(userId, date) {
  if (!userId || !date) return error("Missing userId or date");
  var sheet = getRoutineLogsSheet();
  var logs = getSheetRows(sheet);
  var filtered = logs.filter(function (l) {
    return l.UserID == userId && getFormattedDate(l.Date) === date && (l.Completed == "TRUE" || l.Completed === true);
  }).map(function (l) {
    return l.ActivityID;
  });
  return response({ success: true, logs: filtered });
}

// 13. POST /logRoutine
function logRoutineActivity(userId, activityId, date, completed, xpReward) {
  if (!userId || !activityId || !date) return error("Missing required parameters");

  var sheet = getRoutineLogsSheet();
  var logs = getSheetRows(sheet);

  var existingLog = logs.find(function (l) {
    return l.UserID == userId && l.ActivityID == activityId && getFormattedDate(l.Date) === date;
  });

  var wasCompletedBefore = existingLog ? (existingLog.Completed == "TRUE" || existingLog.Completed === true) : false;
  var isCompletedNow = completed === true || completed === "true";

  if (existingLog) {
    updateRowByColumn(sheet, "LogID", existingLog.LogID, { Completed: isCompletedNow });
  } else {
    var logId = "rl_" + Math.random().toString(36).substr(2, 9);
    insertRow(sheet, {
      LogID: logId,
      UserID: userId,
      Date: date,
      ActivityID: activityId,
      Completed: isCompletedNow
    }, SHEETS.ROUTINE_LOGS.headers);
  }

  var xpChange = 0;
  if (!wasCompletedBefore && isCompletedNow) {
    xpChange = Number(xpReward) || 5;
  } else if (wasCompletedBefore && !isCompletedNow) {
    xpChange = -(Number(xpReward) || 5);
  }

  // Update User XP
  var userSheet = getUsersSheet();
  var users = getSheetRows(userSheet);
  var targetUser = users.find(function (u) { return u.UserID == userId; });

  if (targetUser) {
    var currentXP = Math.max(0, (Number(targetUser.XP) || 0) + xpChange);
    var currentLevel = calculateLevel(currentXP);

    // Recalculate streak
    var streakDetails = calculateStreakForUser(userId);

    updateRowByColumn(userSheet, "UserID", userId, {
      XP: currentXP,
      Level: currentLevel,
      Streak: streakDetails.currentStreak,
      LongestStreak: streakDetails.longestStreak
    });

    // Run Achievement Evaluator
    evaluateAchievements(userId, currentXP, streakDetails.completedCount, streakDetails.longestStreak);

    return response({
      success: true,
      xp: currentXP,
      level: currentLevel,
      streak: streakDetails.currentStreak,
      longestStreak: streakDetails.longestStreak
    });
  }

  return error("User record error");
}

// 14. INVESTMENT CONTROLLERS FOR GOOGLE SHEETS

function getInvestmentOverview(userId) {
  var profileSheet = getInvestmentProfileSheet();
  var fundsSheet = getInvestmentFundsSheet();
  var budgetsSheet = getMonthlyBudgetsSheet();
  var goalsSheet = getFinancialGoalsSheet();
  var txSheet = getTransactionsSheet();

  var profileRows = getSheetRows(profileSheet).filter(function (r) { return r.UserID == userId; });
  var fundsRows = getSheetRows(fundsSheet).filter(function (r) { return r.UserID == userId; });
  var budgetsRows = getSheetRows(budgetsSheet).filter(function (r) { return r.UserID == userId; });
  var goalsRows = getSheetRows(goalsSheet).filter(function (r) { return r.UserID == userId; });
  var txRows = getSheetRows(txSheet).filter(function (r) { return r.UserID == userId; });

  var profile = profileRows.length > 0 ? profileRows[0] : {
    UserID: userId,
    MonthlyIncomeMin: 60000,
    MonthlyIncomeMax: 80000,
    BankSavings: 200000,
    MutualFundHoldings: 170000,
    EmergencyFundBalance: 80000,
    HouseFundBalance: 70000,
    DaughterFundBalance: 50000,
    MonthlySavingsTarget: 20000
  };

  // Seed default 5 reference funds if none exist for user
  if (fundsRows.length === 0) {
    var defaultFunds = [
      { FundID: "fund_nippon_mid", UserID: userId, Name: "Nippon India Mid Cap", Category: "Mid Cap", ReferenceSIP: 6000, ActiveSIP: 0, ActualThisMonth: 0, Status: "On Hold", Instruction: "Do not add for now" },
      { FundID: "fund_dsp_tiger", UserID: userId, Name: "DSP India T.I.G.E.R.", Category: "Thematic / Infrastructure", ReferenceSIP: 5000, ActiveSIP: 0, ActualThisMonth: 0, Status: "On Hold", Instruction: "Do not add for now" },
      { FundID: "fund_nippon_small", UserID: userId, Name: "Nippon India Small Cap", Category: "Small Cap", ReferenceSIP: 4000, ActiveSIP: 0, ActualThisMonth: 0, Status: "On Hold", Instruction: "Do not add for now" },
      { FundID: "fund_dsp_small", UserID: userId, Name: "DSP India Small Cap", Category: "Small Cap", ReferenceSIP: 3000, ActiveSIP: 0, ActualThisMonth: 0, Status: "On Hold", Instruction: "Do not add for now" },
      { FundID: "fund_sbi_small", UserID: userId, Name: "SBI Small Cap", Category: "Small Cap", ReferenceSIP: 2000, ActiveSIP: 3000, ActualThisMonth: 3000, Status: "Active", Instruction: "Continue existing SBI SIP at ₹3,000" }
    ];
    defaultFunds.forEach(function (f) {
      insertRow(fundsSheet, f, SHEETS.INVESTMENT_FUNDS.headers);
    });
    fundsRows = defaultFunds;
  }

  // Seed default goals if none exist
  if (goalsRows.length === 0) {
    var defaultGoals = [
      { GoalID: "goal_emergency", UserID: userId, Name: "Emergency Fund (6 Months Buffer)", Category: "Emergency", TargetAmount: 180000, DownPaymentTarget: 0, RegistrationCosts: 0, CurrentBalance: 80000, MonthlyTarget: 5000, StartDate: "2026-01-01", Deadline: "2027-08-31", Priority: "Critical", Status: "On track", Notes: "3 to 6 months of essential living expenses buffer" },
      { GoalID: "goal_house", UserID: userId, Name: "House Purchase 2033 (₹50 Lakh Target)", Category: "Real Estate", TargetAmount: 5000000, DownPaymentTarget: 1500000, RegistrationCosts: 400000, CurrentBalance: 70000, MonthlyTarget: 15000, StartDate: "2026-01-01", Deadline: "2033-12-31", Priority: "High", Status: "In progress", Notes: "Down payment ₹15L + registry ₹4L prioritized first" },
      { GoalID: "goal_daughter", UserID: userId, Name: "Daughter's Future & Higher Education", Category: "Family / Child Future", TargetAmount: 2500000, DownPaymentTarget: 0, RegistrationCosts: 0, CurrentBalance: 50000, MonthlyTarget: 5000, StartDate: "2026-01-01", Deadline: "2040-06-30", Priority: "High", Status: "On track", Notes: "Dedicated child education compounding corpus" }
    ];
    defaultGoals.forEach(function (g) {
      insertRow(goalsSheet, g, SHEETS.FINANCIAL_GOALS.headers);
    });
    goalsRows = defaultGoals;
  }

  return response({
    success: true,
    profile: {
      userId: profile.UserID,
      monthlyIncomeMin: Number(profile.MonthlyIncomeMin) || 60000,
      monthlyIncomeMax: Number(profile.MonthlyIncomeMax) || 80000,
      bankSavings: Number(profile.BankSavings) || 200000,
      mutualFundHoldings: Number(profile.MutualFundHoldings) || 170000,
      emergencyFundBalance: Number(profile.EmergencyFundBalance) || 80000,
      houseFundBalance: Number(profile.HouseFundBalance) || 70000,
      daughterFundBalance: Number(profile.DaughterFundBalance) || 50000,
      monthlySavingsTarget: Number(profile.MonthlySavingsTarget) || 20000
    },
    funds: fundsRows.map(function (f) {
      return {
        id: f.FundID,
        name: f.Name,
        category: f.Category,
        referenceSIP: Number(f.ReferenceSIP) || 0,
        activeSIP: Number(f.ActiveSIP) || 0,
        actualThisMonth: Number(f.ActualThisMonth) || 0,
        status: f.Status,
        instruction: f.Instruction
      };
    }),
    budgets: budgetsRows,
    goals: goalsRows.map(function (g) {
      return {
        id: g.GoalID,
        name: g.Name,
        category: g.Category,
        targetAmount: Number(g.TargetAmount) || 0,
        downPaymentTarget: Number(g.DownPaymentTarget) || 0,
        registrationCosts: Number(g.RegistrationCosts) || 0,
        currentBalance: Number(g.CurrentBalance) || 0,
        monthlyTarget: Number(g.MonthlyTarget) || 0,
        startDate: getFormattedDate(g.StartDate),
        deadline: getFormattedDate(g.Deadline),
        priority: g.Priority,
        status: g.Status,
        notes: g.Notes
      };
    }),
    transactions: txRows
  });
}

function updateInvestmentProfile(userId, profileData) {
  var sheet = getInvestmentProfileSheet();
  var rows = getSheetRows(sheet);
  var found = rows.find(function (r) { return r.UserID == userId; });

  var payload = {
    UserID: userId,
    MonthlyIncomeMin: profileData.monthlyIncomeMin,
    MonthlyIncomeMax: profileData.monthlyIncomeMax,
    BankSavings: profileData.bankSavings,
    MutualFundHoldings: profileData.mutualFundHoldings,
    EmergencyFundBalance: profileData.emergencyFundBalance,
    HouseFundBalance: profileData.houseFundBalance,
    DaughterFundBalance: profileData.daughterFundBalance,
    MonthlySavingsTarget: profileData.monthlySavingsTarget,
    LastUpdated: new Date().toISOString().split("T")[0]
  };

  if (found) {
    updateRowByColumn(sheet, "UserID", userId, payload);
  } else {
    insertRow(sheet, payload, SHEETS.INVESTMENT_PROFILE.headers);
  }

  return response({ success: true, profile: payload });
}

function updateInvestmentFund(userId, fundId, fundData) {
  var sheet = getInvestmentFundsSheet();
  var success = updateRowByColumn(sheet, "FundID", fundId, fundData);
  return response({ success: success });
}

function getMonthlyBudget(userId, monthYear) {
  var sheet = getMonthlyBudgetsSheet();
  var rows = getSheetRows(sheet).filter(function (r) {
    return r.UserID == userId && r.MonthYear == monthYear;
  });
  return response({ success: true, budget: rows.length > 0 ? rows[0] : null });
}

function saveMonthlyBudget(userId, budgetData) {
  var sheet = getMonthlyBudgetsSheet();
  var rows = getSheetRows(sheet);
  var found = rows.find(function (r) {
    return r.UserID == userId && r.MonthYear == budgetData.monthYear;
  });

  var payload = {
    BudgetID: budgetData.id || ("bgt_" + budgetData.monthYear),
    UserID: userId,
    MonthYear: budgetData.monthYear,
    SalaryIncome: budgetData.salaryIncome,
    TrainingFreelanceIncome: budgetData.trainingFreelanceIncome,
    OtherIncome: budgetData.otherIncome,
    Rent: budgetData.rent,
    Groceries: budgetData.groceries,
    ParentsSupport: budgetData.parentsSupport,
    Utilities: budgetData.utilities,
    Transport: budgetData.transport,
    TermInsuranceMonthly: budgetData.termInsuranceMonthly,
    HealthInsuranceMonthly: budgetData.healthInsuranceMonthly,
    Healthcare: budgetData.healthcare,
    OtherExpenses: budgetData.otherExpenses,
    ActualInvestments: budgetData.actualInvestments,
    EmergencySavings: budgetData.emergencySavings,
    HouseSavings: budgetData.houseSavings,
    DaughterSavings: budgetData.daughterSavings,
    Notes: budgetData.notes || ""
  };

  if (found) {
    updateRowByColumn(sheet, "BudgetID", found.BudgetID, payload);
  } else {
    insertRow(sheet, payload, SHEETS.MONTHLY_BUDGETS.headers);
  }

  return response({ success: true, budget: payload });
}

function getFinancialGoals(userId) {
  var sheet = getFinancialGoalsSheet();
  var goals = getSheetRows(sheet).filter(function (r) { return r.UserID == userId; });
  return response({ success: true, goals: goals });
}

function saveFinancialGoal(userId, goalData) {
  var sheet = getFinancialGoalsSheet();
  var rows = getSheetRows(sheet);
  var goalId = goalData.id || ("goal_" + Math.random().toString(36).substr(2, 9));
  var found = rows.find(function (r) { return r.GoalID == goalId; });

  var payload = {
    GoalID: goalId,
    UserID: userId,
    Name: goalData.name,
    Category: goalData.category,
    TargetAmount: goalData.targetAmount,
    DownPaymentTarget: goalData.downPaymentTarget || 0,
    RegistrationCosts: goalData.registrationCosts || 0,
    CurrentBalance: goalData.currentBalance || 0,
    MonthlyTarget: goalData.monthlyTarget || 0,
    StartDate: goalData.startDate,
    Deadline: goalData.deadline,
    Priority: goalData.priority,
    Status: goalData.status,
    Notes: goalData.notes || ""
  };

  if (found) {
    updateRowByColumn(sheet, "GoalID", goalId, payload);
  } else {
    insertRow(sheet, payload, SHEETS.FINANCIAL_GOALS.headers);
  }

  return response({ success: true, goal: payload });
}

function deleteFinancialGoal(userId, goalId) {
  var sheet = getFinancialGoalsSheet();
  var success = deleteRowByColumn(sheet, "GoalID", goalId);
  return response({ success: success });
}

function addContributionTransaction(userId, txData) {
  var sheet = getTransactionsSheet();
  var txId = "tx_" + Math.random().toString(36).substr(2, 9);
  var payload = {
    TransactionID: txId,
    UserID: userId,
    Date: txData.date || new Date().toISOString().split("T")[0],
    Category: txData.category,
    EntityName: txData.entityName,
    Amount: txData.amount,
    Type: txData.type || "Savings",
    PaymentMode: txData.paymentMode || "Bank Transfer",
    Notes: txData.notes || ""
  };
  insertRow(sheet, payload, SHEETS.TRANSACTIONS.headers);
  return response({ success: true, transaction: payload });
}

// 15. TASK CONTROLLERS FOR GOOGLE SHEETS

function getTasks(userId, filterParams) {
  if (!userId) return error("Missing userId parameter");
  var sheet = getTasksSheet();
  var rows = getSheetRows(sheet);
  var userTasks = rows.filter(function (r) { return r.UserID == userId; });

  if (filterParams && filterParams.status) {
    userTasks = userTasks.filter(function (t) { return t.Status === filterParams.status; });
  }
  if (filterParams && filterParams.category) {
    userTasks = userTasks.filter(function (t) { return t.Category === filterParams.category; });
  }

  var formattedTasks = userTasks.map(function (t) {
    return {
      taskId: t.TaskID,
      userId: t.UserID,
      title: t.Title,
      description: t.Description || "",
      category: t.Category || "General",
      projectArea: t.ProjectArea || "",
      linkedGoalId: t.LinkedGoalID || "",
      priority: t.Priority || "Medium",
      status: t.Status || "Inbox",
      estimatedDuration: Number(t.EstimatedDuration) || 0,
      actualDuration: Number(t.ActualDuration) || 0,
      startDate: getFormattedDate(t.StartDate),
      dueDate: getFormattedDate(t.DueDate),
      deadlineType: t.DeadlineType || "Flexible",
      dependencies: t.Dependencies || "",
      incomeImpact: t.IncomeImpact || "None",
      importance: Number(t.Importance) || 50,
      urgency: Number(t.Urgency) || 50,
      readiness: Number(t.Readiness) || 100,
      nextAction: t.NextAction || "",
      recurrence: t.Recurrence || "None",
      source: t.Source || "Internal",
      externalId: t.ExternalID || "",
      createdAt: t.CreatedAt || "",
      updatedAt: t.UpdatedAt || "",
      completedAt: t.CompletedAt || ""
    };
  });

  return response({ success: true, tasks: formattedTasks });
}

function saveTask(userId, taskData) {
  if (!userId) return error("Missing userId parameter");
  if (!taskData || !taskData.title || String(taskData.title).trim() === "") {
    return error("Task title is required");
  }

  var sheet = getTasksSheet();
  var rows = getSheetRows(sheet);
  var taskId = taskData.taskId || ("tsk_" + Math.random().toString(36).substr(2, 9));
  var existing = rows.find(function (r) { return r.TaskID == taskId; });

  // Authorization check
  if (existing && existing.UserID != userId) {
    return error("Unauthorized: cannot modify another user's task");
  }

  var now = new Date().toISOString();
  var status = taskData.status || (existing ? existing.Status : "Inbox");
  var completedAt = existing ? (existing.CompletedAt || "") : "";
  if (status === "Completed" && !completedAt) {
    completedAt = now;
  } else if (status !== "Completed") {
    completedAt = "";
  }

  var payload = {
    TaskID: taskId,
    UserID: userId,
    Title: String(taskData.title).trim(),
    Description: taskData.description !== undefined ? taskData.description : (existing ? existing.Description : ""),
    Category: taskData.category || (existing ? existing.Category : "General"),
    ProjectArea: taskData.projectArea !== undefined ? taskData.projectArea : (existing ? existing.ProjectArea : ""),
    LinkedGoalID: taskData.linkedGoalId !== undefined ? taskData.linkedGoalId : (existing ? existing.LinkedGoalID : ""),
    Priority: taskData.priority || (existing ? existing.Priority : "Medium"),
    Status: status,
    EstimatedDuration: taskData.estimatedDuration !== undefined ? Number(taskData.estimatedDuration) : (existing ? Number(existing.EstimatedDuration) : 0),
    ActualDuration: taskData.actualDuration !== undefined ? Number(taskData.actualDuration) : (existing ? Number(existing.ActualDuration) : 0),
    StartDate: taskData.startDate !== undefined ? taskData.startDate : (existing ? existing.StartDate : ""),
    DueDate: taskData.dueDate !== undefined ? taskData.dueDate : (existing ? existing.DueDate : ""),
    DeadlineType: taskData.deadlineType || (existing ? existing.DeadlineType : "Flexible"),
    Dependencies: taskData.dependencies !== undefined ? taskData.dependencies : (existing ? existing.Dependencies : ""),
    IncomeImpact: taskData.incomeImpact || (existing ? existing.IncomeImpact : "None"),
    Importance: taskData.importance !== undefined ? Number(taskData.importance) : (existing ? Number(existing.Importance) : 50),
    Urgency: taskData.urgency !== undefined ? Number(taskData.urgency) : (existing ? Number(existing.Urgency) : 50),
    Readiness: taskData.readiness !== undefined ? Number(taskData.readiness) : (existing ? Number(existing.Readiness) : 100),
    NextAction: taskData.nextAction !== undefined ? taskData.nextAction : (existing ? existing.NextAction : ""),
    Recurrence: taskData.recurrence !== undefined ? taskData.recurrence : (existing ? existing.Recurrence : "None"),
    Source: taskData.source || (existing ? existing.Source : "Internal"),
    ExternalID: taskData.externalId !== undefined ? taskData.externalId : (existing ? existing.ExternalID : ""),
    CreatedAt: existing ? (existing.CreatedAt || now) : now,
    UpdatedAt: now,
    CompletedAt: completedAt
  };

  if (existing) {
    updateRowByColumn(sheet, "TaskID", taskId, payload);
  } else {
    insertRow(sheet, payload, SHEETS.TASKS.headers);
  }

  return response({
    success: true,
    task: {
      taskId: payload.TaskID,
      userId: payload.UserID,
      title: payload.Title,
      description: payload.Description,
      category: payload.Category,
      projectArea: payload.ProjectArea,
      linkedGoalId: payload.LinkedGoalID,
      priority: payload.Priority,
      status: payload.Status,
      estimatedDuration: payload.EstimatedDuration,
      actualDuration: payload.ActualDuration,
      startDate: payload.StartDate,
      dueDate: payload.DueDate,
      deadlineType: payload.DeadlineType,
      dependencies: payload.Dependencies,
      incomeImpact: payload.IncomeImpact,
      importance: payload.Importance,
      urgency: payload.Urgency,
      readiness: payload.Readiness,
      nextAction: payload.NextAction,
      recurrence: payload.Recurrence,
      source: payload.Source,
      externalId: payload.ExternalID,
      createdAt: payload.CreatedAt,
      updatedAt: payload.UpdatedAt,
      completedAt: payload.CompletedAt
    }
  });
}

function deleteTask(userId, taskId) {
  if (!userId || !taskId) return error("Missing userId or taskId");

  var sheet = getTasksSheet();
  var rows = getSheetRows(sheet);
  var existing = rows.find(function (r) { return r.TaskID == taskId; });

  if (!existing) {
    return error("Task not found");
  }

  // Authorization check
  if (existing.UserID != userId) {
    return error("Unauthorized: cannot delete another user's task");
  }

  var success = deleteRowByColumn(sheet, "TaskID", taskId);
  return response({ success: success, taskId: taskId });
}

// 16. DAILY PLAN CONTROLLERS FOR GOOGLE SHEETS

function getDailyPlan(userId, planDate) {
  if (!userId || !planDate) return error("Missing userId or planDate parameter");
  var sheet = getDailyPlansSheet();
  var rows = getSheetRows(sheet);
  var targetDate = getFormattedDate(planDate);
  var found = rows.find(function (r) {
    return r.UserID == userId && getFormattedDate(r.PlanDate) === targetDate;
  });

  if (!found) {
    return response({ success: true, plan: null });
  }

  var acceptance = {};
  var deferred = [];
  try { acceptance = found.AcceptanceStatuses ? JSON.parse(found.AcceptanceStatuses) : {}; } catch (e) { acceptance = {}; }
  try { deferred = found.DeferredTasksJSON ? JSON.parse(found.DeferredTasksJSON) : []; } catch (e) { deferred = []; }

  return response({
    success: true,
    plan: {
      planId: found.PlanID,
      userId: found.UserID,
      planDate: getFormattedDate(found.PlanDate),
      dayType: found.DayType || "NORMAL",
      availableMinutes: Number(found.AvailableMinutes) || 480,
      plannedMinutes: Number(found.PlannedMinutes) || 0,
      selectedTaskIds: String(found.SelectedTaskIDs || "").split(",").filter(function(s) { return s.trim().length > 0; }),
      taskOrder: String(found.TaskOrder || "").split(",").filter(function(s) { return s.trim().length > 0; }),
      acceptanceStatuses: acceptance,
      deferredTasks: deferred,
      selectionRationale: found.SelectionRationale || "",
      createdAt: found.CreatedAt,
      updatedAt: found.UpdatedAt
    }
  });
}

function saveDailyPlan(userId, planData) {
  if (!userId || !planData || !planData.planDate) {
    return error("Missing required parameters for daily plan");
  }

  var sheet = getDailyPlansSheet();
  var rows = getSheetRows(sheet);
  var targetDate = getFormattedDate(planData.planDate);
  var found = rows.find(function (r) {
    return r.UserID == userId && getFormattedDate(r.PlanDate) === targetDate;
  });

  var planId = found ? found.PlanID : ("plan_" + targetDate + "_" + Math.random().toString(36).substr(2, 6));
  var now = new Date().toISOString();

  var payload = {
    PlanID: planId,
    UserID: userId,
    PlanDate: targetDate,
    DayType: planData.dayType || "NORMAL",
    AvailableMinutes: Number(planData.availableMinutes) || 480,
    PlannedMinutes: Number(planData.plannedMinutes) || 0,
    SelectedTaskIDs: Array.isArray(planData.selectedTaskIds) ? planData.selectedTaskIds.join(",") : (planData.selectedTaskIds || ""),
    TaskOrder: Array.isArray(planData.taskOrder) ? planData.taskOrder.join(",") : (planData.taskOrder || ""),
    AcceptanceStatuses: typeof planData.acceptanceStatuses === "object" ? JSON.stringify(planData.acceptanceStatuses) : (planData.acceptanceStatuses || "{}"),
    DeferredTasksJSON: Array.isArray(planData.deferredTasks) ? JSON.stringify(planData.deferredTasks) : "[]",
    SelectionRationale: planData.selectionRationale || "",
    CreatedAt: found ? (found.CreatedAt || now) : now,
    UpdatedAt: now
  };

  if (found) {
    updateRowByColumn(sheet, "PlanID", planId, payload);
  } else {
    insertRow(sheet, payload, SHEETS.DAILY_PLANS.headers);
  }

  var resAcceptance = {};
  var resDeferred = [];
  try { resAcceptance = JSON.parse(payload.AcceptanceStatuses); } catch (e) { resAcceptance = {}; }
  try { resDeferred = JSON.parse(payload.DeferredTasksJSON); } catch (e) { resDeferred = []; }

  return response({
    success: true,
    plan: {
      planId: payload.PlanID,
      userId: payload.UserID,
      planDate: payload.PlanDate,
      dayType: payload.DayType,
      availableMinutes: payload.AvailableMinutes,
      plannedMinutes: payload.PlannedMinutes,
      selectedTaskIds: String(payload.SelectedTaskIDs).split(",").filter(function(s) { return s.trim().length > 0; }),
      taskOrder: String(payload.TaskOrder).split(",").filter(function(s) { return s.trim().length > 0; }),
      acceptanceStatuses: resAcceptance,
      deferredTasks: resDeferred,
      selectionRationale: payload.SelectionRationale,
      createdAt: payload.CreatedAt,
      updatedAt: payload.UpdatedAt
    }
  });
}

// 17. REVIEW CONTROLLERS FOR GOOGLE SHEETS

function getReview(userId, reviewType, periodKey) {
  if (!userId || !reviewType || !periodKey) return error("Missing userId, reviewType, or periodKey parameter");
  var sheet = getReviewsSheet();
  var rows = getSheetRows(sheet);
  var targetKey = String(periodKey).trim();
  var found = rows.find(function (r) {
    var rowPeriod = String(r.PeriodKey).trim();
    if (r.PeriodKey instanceof Date) {
      rowPeriod = getFormattedDate(r.PeriodKey);
    }
    return r.UserID == userId && String(r.ReviewType).toUpperCase() === String(reviewType).toUpperCase() && rowPeriod === targetKey;
  });

  if (!found) {
    return response({ success: true, review: null });
  }

  var metrics = {};
  var deferrals = [];
  var nextSteps = [];
  try { metrics = JSON.parse(found.MetricsJSON); } catch (e) { metrics = {}; }
  try { deferrals = JSON.parse(found.DeferralsJSON); } catch (e) { deferrals = []; }
  try { nextSteps = JSON.parse(found.NextStepsJSON); } catch (e) { nextSteps = []; }

  return response({
    success: true,
    review: {
      reviewId: found.ReviewID,
      userId: found.UserID,
      reviewType: found.ReviewType,
      periodKey: targetKey,
      linkedPlanId: found.LinkedPlanID || "",
      metrics: metrics,
      reflectionText: found.ReflectionText || "",
      deferrals: deferrals,
      nextSteps: nextSteps,
      createdAt: found.CreatedAt,
      updatedAt: found.UpdatedAt
    }
  });
}

function getReviewsHistory(userId, reviewType) {
  if (!userId) return error("Missing userId parameter");
  var sheet = getReviewsSheet();
  var rows = getSheetRows(sheet);
  var filtered = rows.filter(function (r) {
    if (r.UserID != userId) return false;
    if (reviewType && String(r.ReviewType).toUpperCase() !== String(reviewType).toUpperCase()) return false;
    return true;
  });

  var reviews = filtered.map(function (found) {
    var metrics = {};
    var deferrals = [];
    var nextSteps = [];
    try { metrics = JSON.parse(found.MetricsJSON); } catch (e) { metrics = {}; }
    try { deferrals = JSON.parse(found.DeferralsJSON); } catch (e) { deferrals = []; }
    try { nextSteps = JSON.parse(found.NextStepsJSON); } catch (e) { nextSteps = []; }

    var rowPeriod = String(found.PeriodKey).trim();
    if (found.PeriodKey instanceof Date) {
      rowPeriod = getFormattedDate(found.PeriodKey);
    }

    return {
      reviewId: found.ReviewID,
      userId: found.UserID,
      reviewType: found.ReviewType,
      periodKey: rowPeriod,
      linkedPlanId: found.LinkedPlanID || "",
      metrics: metrics,
      reflectionText: found.ReflectionText || "",
      deferrals: deferrals,
      nextSteps: nextSteps,
      createdAt: found.CreatedAt,
      updatedAt: found.UpdatedAt
    };
  });

  reviews.sort(function (a, b) {
    return (b.periodKey || "").localeCompare(a.periodKey || "");
  });

  return response({ success: true, reviews: reviews });
}

function saveReview(userId, reviewData) {
  if (!userId || !reviewData || !reviewData.reviewType || !reviewData.periodKey) {
    return error("Missing required parameters: userId, reviewType, periodKey");
  }

  var sheet = getReviewsSheet();
  var rows = getSheetRows(sheet);
  var targetKey = String(reviewData.periodKey).trim();
  var targetType = String(reviewData.reviewType).toUpperCase();

  var found = rows.find(function (r) {
    var rowPeriod = String(r.PeriodKey).trim();
    if (r.PeriodKey instanceof Date) {
      rowPeriod = getFormattedDate(r.PeriodKey);
    }
    return r.UserID == userId && String(r.ReviewType).toUpperCase() === targetType && rowPeriod === targetKey;
  });

  var now = new Date().toISOString();
  var reviewId = found ? found.ReviewID : (reviewData.reviewId || ("rev_" + targetKey + "_" + targetType.toLowerCase() + "_" + Utilities.getUuid().substring(0, 8)));

  var payload = {
    ReviewID: reviewId,
    UserID: userId,
    ReviewType: targetType,
    PeriodKey: targetKey,
    LinkedPlanID: reviewData.linkedPlanId || "",
    MetricsJSON: typeof reviewData.metrics === "object" ? JSON.stringify(reviewData.metrics) : (reviewData.metrics || "{}"),
    ReflectionText: reviewData.reflectionText || "",
    DeferralsJSON: Array.isArray(reviewData.deferrals) ? JSON.stringify(reviewData.deferrals) : (reviewData.deferrals || "[]"),
    NextStepsJSON: Array.isArray(reviewData.nextSteps) ? JSON.stringify(reviewData.nextSteps) : (reviewData.nextSteps || "[]"),
    CreatedAt: found ? (found.CreatedAt || now) : now,
    UpdatedAt: now
  };

  if (found) {
    updateRowByColumn(sheet, "ReviewID", reviewId, payload);
  } else {
    insertRow(sheet, payload, SHEETS.REVIEWS.headers);
  }

  var resMetrics = {};
  var resDeferrals = [];
  var resNextSteps = [];
  try { resMetrics = JSON.parse(payload.MetricsJSON); } catch (e) { resMetrics = {}; }
  try { resDeferrals = JSON.parse(payload.DeferralsJSON); } catch (e) { resDeferrals = []; }
  try { resNextSteps = JSON.parse(payload.NextStepsJSON); } catch (e) { resNextSteps = []; }

  return response({
    success: true,
    review: {
      reviewId: payload.ReviewID,
      userId: payload.UserID,
      reviewType: payload.ReviewType,
      periodKey: payload.PeriodKey,
      linkedPlanId: payload.LinkedPlanID,
      metrics: resMetrics,
      reflectionText: payload.ReflectionText,
      deferrals: resDeferrals,
      nextSteps: resNextSteps,
      createdAt: payload.CreatedAt,
      updatedAt: payload.UpdatedAt
    }
  });
}

// 18. AI GATEWAY CONTROLLER FOR GEMINI (SERVER-SIDE SECURE PROXY)

function handleAiGenerate(userId, payload) {
  if (!userId) return error("Missing userId parameter for AI generation");
  if (!payload || !payload.prompt) return error("Missing prompt parameter");

  var apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) {
    return response({
      success: false,
      fallbackRequired: true,
      message: "GEMINI_API_KEY not configured in Google Apps Script ScriptProperties"
    });
  }

  try {
    var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey);
    var requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: String(payload.prompt) }]
        }
      ],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.2
      }
    };

    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(requestBody),
      muteHttpExceptions: true
    };

    var httpResponse = UrlFetchApp.fetch(url, options);
    var statusCode = httpResponse.getResponseCode();
    var responseText = httpResponse.getContentText();

    if (statusCode < 200 || statusCode >= 300) {
      return response({
        success: false,
        fallbackRequired: true,
        error: "Gemini API error (" + statusCode + "): " + responseText
      });
    }

    var geminiData = JSON.parse(responseText);
    var rawText = "";
    if (geminiData.candidates && geminiData.candidates.length > 0 && geminiData.candidates[0].content && geminiData.candidates[0].content.parts) {
      rawText = geminiData.candidates[0].content.parts[0].text;
    }

    var parsedOutput = JSON.parse(rawText);
    return response({
      success: true,
      data: parsedOutput,
      model: "gemini-2.5-flash"
    });
  } catch (err) {
    return response({
      success: false,
      fallbackRequired: true,
      error: err.toString()
    });
  }
}



