/**
 * Deterministic Review Aggregator & Analytics Utility
 * for RoutineTargetCompletion
 *
 * Implements:
 * - ISO Week date range calculations (Monday to Sunday)
 * - Weekly plan vs completion aggregation
 * - Category workload distribution
 * - Accurate duration tracking (with explicit missing-data safety)
 * - Blockers and structured deferral analytics
 * - Zero LLM dependency
 */

import { calculatePriorityScore } from './priorityEngine.js';

export const DEFERRAL_REASONS = [
  'Insufficient time',
  'Unexpected commitment',
  'Blocked by another task',
  'Task estimate was inaccurate',
  'Lower priority than expected',
  'Personal commitment',
  'Other'
];

/**
 * Returns the ISO week key string (e.g. '2026-W44') for a given date
 */
export function getIsoWeekKey(dateInput = new Date()) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  d.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Returns start date (Monday) and end date (Sunday) in YYYY-MM-DD for an ISO week key
 * Example: '2026-W44' -> { startDate: '2026-10-26', endDate: '2026-11-01' }
 */
export function getWeekDateRange(weekKey = getIsoWeekKey()) {
  if (!weekKey || !weekKey.includes('-W')) {
    const today = new Date();
    const day = today.getDay();
    const diffToMon = today.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(today.setDate(diffToMon));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return {
      startDate: mon.toISOString().split('T')[0],
      endDate: sun.toISOString().split('T')[0]
    };
  }

  const [yearStr, weekStr] = weekKey.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);

  // Jan 4th is always in week 1
  const simple = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = simple.getUTCDay() || 7;
  simple.setUTCDate(simple.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);

  const startDate = simple.toISOString().split('T')[0];
  const endDateObj = new Date(simple);
  endDateObj.setUTCDate(simple.getUTCDate() + 6);
  const endDate = endDateObj.toISOString().split('T')[0];

  return { startDate, endDate };
}

/**
 * Aggregate weekly review metrics based purely on verified stored application data
 */
export function aggregateWeeklyMetrics({
  tasks = [],
  dailyPlans = [],
  goals = [],
  opportunities = [],
  startDate,
  endDate,
  todayDateStr = new Date().toISOString().split('T')[0]
}) {
  // 1. Filter daily plans in this date window
  const weekPlans = (dailyPlans || []).filter(p => p && p.planDate).filter(p => {
    const pDate = p.planDate.split('T')[0];
    return pDate >= startDate && pDate <= endDate;
  });

  // 2. Extract unique planned task IDs
  const plannedTaskIdSet = new Set();
  const deferralReasonsMap = {};
  let deferredCount = 0;

  weekPlans.forEach(plan => {
    // Tasks accepted in plan
    const ids = Array.isArray(plan.selectedTaskIds) ? plan.selectedTaskIds : [];
    ids.forEach(id => {
      if (plan.acceptanceStatuses && plan.acceptanceStatuses[id] === false) return;
      plannedTaskIdSet.add(id);
    });

    // Deferrals recorded in daily plan
    const deferredList = Array.isArray(plan.deferredTasks) ? plan.deferredTasks : [];
    deferredList.forEach(d => {
      deferredCount++;
      const reason = d.reason || 'Capacity constraint';
      deferralReasonsMap[reason] = (deferralReasonsMap[reason] || 0) + 1;
    });
  });

  // 3. Match against task backlog
  const taskMap = new Map();
  tasks.forEach(t => taskMap.set(t.taskId, t));

  const plannedTasks = [];
  plannedTaskIdSet.forEach(id => {
    if (taskMap.has(id)) {
      plannedTasks.push(taskMap.get(id));
    }
  });

  const completedPlannedTasks = plannedTasks.filter(t => t.status === 'Completed');
  const incompletePlannedTasks = plannedTasks.filter(t => t.status !== 'Completed');

  // Overall completion rate
  const tasksPlannedCount = plannedTasks.length;
  const tasksCompletedCount = completedPlannedTasks.length;
  const completionRate = tasksPlannedCount > 0 ? Math.round((tasksCompletedCount / tasksPlannedCount) * 100) : 0;

  // 4. Overdue tasks
  const overdueTasks = tasks.filter(t => {
    if (t.status === 'Completed' || t.status === 'Cancelled') return false;
    if (!t.dueDate) return false;
    return t.dueDate < todayDateStr;
  });

  // 5. Estimated vs Actual Duration Analytics
  let estimatedMinutesTotal = 0;
  let estimatedMinutesForLogged = 0;
  let actualMinutesTotal = 0;
  let tasksWithActualDurationCount = 0;

  plannedTasks.forEach(t => {
    const est = Number(t.estimatedDuration) > 0 ? Number(t.estimatedDuration) : 0;
    const act = Number(t.actualDuration) > 0 ? Number(t.actualDuration) : 0;

    estimatedMinutesTotal += est;
    if (act > 0) {
      actualMinutesTotal += act;
      estimatedMinutesForLogged += est;
      tasksWithActualDurationCount++;
    }
  });

  let estimationVariancePercent = null;
  if (tasksWithActualDurationCount > 0 && estimatedMinutesForLogged > 0) {
    estimationVariancePercent = Math.round(((actualMinutesTotal - estimatedMinutesForLogged) / estimatedMinutesForLogged) * 100);
  }

  // 6. Workload by Category / Project Area
  const categoryWorkload = {};
  plannedTasks.forEach(t => {
    const cat = t.category || 'GENERAL';
    const dur = Number(t.estimatedDuration) > 0 ? Number(t.estimatedDuration) : 45;
    if (!categoryWorkload[cat]) {
      categoryWorkload[cat] = { count: 0, minutes: 0, completed: 0 };
    }
    categoryWorkload[cat].count += 1;
    categoryWorkload[cat].minutes += dur;
    if (t.status === 'Completed') {
      categoryWorkload[cat].completed += 1;
    }
  });

  // 7. Revenue Generating Outcomes
  const highRevenueCompleted = completedPlannedTasks.filter(t => t.incomeImpact === 'High' || t.category === 'MI BUSINESS' || t.category === 'MONEY');
  const confirmedOppRevenue = (opportunities || [])
    .filter(o => o.stage === 'Confirmed')
    .reduce((sum, o) => sum + (Number(o.value) || 0), 0);

  // 8. Blockers Encountered
  const currentBlockers = tasks.filter(t => t.status === 'Blocked');

  // 9. Goals impacted
  const impactedGoalIds = new Set(completedPlannedTasks.map(t => t.linkedGoalId).filter(Boolean));
  const impactedGoals = goals.filter(g => impactedGoalIds.has(g.goalId || g.id));

  // 10. Suggested Next Week Priorities (Top 5 backlog tasks via deterministic scoring)
  const activeBacklog = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled' && t.status !== 'Blocked');
  const scoredBacklog = activeBacklog.map(t => {
    const prio = calculatePriorityScore(t, tasks, goals, new Date(todayDateStr));
    return {
      ...t,
      priorityScore: prio.score,
      priorityBand: prio.band,
      prioritySummary: prio.summary
    };
  });
  scoredBacklog.sort((a, b) => b.priorityScore - a.priorityScore);
  const suggestedNextWeekPriorities = scoredBacklog.slice(0, 5);

  return {
    startDate,
    endDate,
    tasksPlannedCount,
    tasksCompletedCount,
    completionRate,
    incompleteCount: incompletePlannedTasks.length,
    overdueCount: overdueTasks.length,
    overdueTasks: overdueTasks.slice(0, 5),
    deferredCount,
    deferralReasonsSummary: deferralReasonsMap,
    estimatedMinutesTotal,
    actualMinutesTotal,
    tasksWithActualDurationCount,
    estimationVariancePercent,
    hasActualDurationData: tasksWithActualDurationCount > 0,
    categoryWorkload,
    highRevenueCompleted,
    confirmedOppRevenue,
    currentBlockers: currentBlockers.slice(0, 5),
    impactedGoals,
    suggestedNextWeekPriorities
  };
}
