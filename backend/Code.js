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
  ROUTINE_LOGS: { name: "RoutineLogs", headers: ["LogID", "UserID", "Date", "ActivityID", "Completed"] }
};

function getUsersSheet() { return getOrCreateSheet(SHEETS.USERS.name, SHEETS.USERS.headers); }
function getHabitsSheet() { return getOrCreateSheet(SHEETS.HABITS.name, SHEETS.HABITS.headers); }
function getLogsSheet() { return getOrCreateSheet(SHEETS.LOGS.name, SHEETS.LOGS.headers); }
function getAchievementsSheet() { return getOrCreateSheet(SHEETS.ACHIEVEMENTS.name, SHEETS.ACHIEVEMENTS.headers); }
function getRoutineLogsSheet() { return getOrCreateSheet(SHEETS.ROUTINE_LOGS.name, SHEETS.ROUTINE_LOGS.headers); }

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
