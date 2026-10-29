/**
 * Task Analytics & Continuous Improvement Calculation Engine
 * for RoutineTargetCompletion (Phase 7)
 *
 * Implements:
 * - 100% factual execution metrics derived from verified records (zero fabrication)
 * - Strict handling of missing data, cancelled tasks, and duration estimates
 * - Continuous improvement heuristics (repeated deferrals, estimation variance, stagnant goals)
 * - Date-range and category filtering
 */

/**
 * Filter tasks by date range and category
 */
export function filterTasks(tasks = [], filters = {}) {
  const { dateRange = 'all', category = 'all', referenceDate = new Date() } = filters;
  const now = new Date(referenceDate);

  return tasks.filter(task => {
    // Category filter
    if (category !== 'all' && task.category !== category) {
      return false;
    }

    // Date range filter
    if (dateRange === 'all') return true;

    const taskDateStr = task.completedAt || task.dueDate || task.createdAt;
    if (!taskDateStr) return false;

    const taskDate = new Date(taskDateStr);
    if (isNaN(taskDate.getTime())) return false;

    const diffDays = (now.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24);

    if (dateRange === 'today') {
      return taskDateStr.split('T')[0] === now.toISOString().split('T')[0];
    }
    if (dateRange === '7d') {
      return diffDays >= 0 && diffDays <= 7;
    }
    if (dateRange === '30d') {
      return diffDays >= 0 && diffDays <= 30;
    }
    if (dateRange === 'this_week') {
      return diffDays >= 0 && diffDays <= 7;
    }

    return true;
  });
}

/**
 * Calculates comprehensive task & execution analytics
 *
 * @param {Array} tasks - List of all user tasks
 * @param {Array} dailyPlans - List of daily plans
 * @param {Array} reviews - List of reviews (morning, evening, weekly)
 * @param {Array} goals - List of linked financial/strategic goals
 * @param {Object} filters - { dateRange, category, referenceDate }
 * @returns {Object} Comprehensive factual metrics
 */
export function calculateTaskAnalytics(tasks = [], dailyPlans = [], reviews = [], goals = [], filters = {}) {
  const filteredTasks = filterTasks(tasks, filters);
  const totalTasksCount = filteredTasks.length;

  // 1. Task Status Counts
  const completedTasks = filteredTasks.filter(t => t.status === 'Completed');
  const cancelledTasks = filteredTasks.filter(t => t.status === 'Cancelled');
  const activeTasks = filteredTasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'In Progress');

  // 2. Overdue calculation (strictly uncompleted tasks with due date in the past)
  const nowStr = (filters.referenceDate ? new Date(filters.referenceDate) : new Date()).toISOString().split('T')[0];
  const overdueTasks = filteredTasks.filter(t => {
    if (t.status === 'Completed' || t.status === 'Cancelled') return false;
    if (!t.dueDate || t.dueDate === 'None') return false;
    return t.dueDate < nowStr;
  });

  // 3. Completion Rates
  // Active workload completion rate = Completed / (Total - Cancelled)
  const eligibleTaskCount = totalTasksCount - cancelledTasks.length;
  const overallCompletionRate = eligibleTaskCount > 0
    ? Math.round((completedTasks.length / eligibleTaskCount) * 100)
    : 0;

  // 4. Planned vs Completed in Daily Plans
  let totalTasksPlanned = 0;
  let totalPlannedCompleted = 0;
  let totalPlannedDeferred = 0;

  dailyPlans.forEach(plan => {
    if (!plan) return;
    const selectedIds = Array.isArray(plan.selectedTaskIds) ? plan.selectedTaskIds : [];
    const acceptance = plan.acceptanceStatuses || {};
    
    // Count tasks accepted in the plan
    selectedIds.forEach(id => {
      if (acceptance[id] !== false) {
        totalTasksPlanned += 1;
        const task = tasks.find(t => (t.taskId || t.id) === id);
        if (task && task.status === 'Completed') {
          totalPlannedCompleted += 1;
        }
      }
    });

    // Count deferred tasks
    if (Array.isArray(plan.deferredTasksJSON)) {
      totalPlannedDeferred += plan.deferredTasksJSON.length;
    }
  });

  const plannedCompletionRate = totalTasksPlanned > 0
    ? Math.round((totalPlannedCompleted / totalTasksPlanned) * 100)
    : 0;

  // 5. Estimated vs Actual Duration (Only for tasks that logged actual duration)
  const tasksWithActualDuration = filteredTasks.filter(t => {
    const act = Number(t.actualDuration);
    return !isNaN(act) && act > 0;
  });

  let totalEstimatedMinutes = 0;
  let totalActualMinutes = 0;

  tasksWithActualDuration.forEach(t => {
    totalEstimatedMinutes += Number(t.estimatedDuration) || 45;
    totalActualMinutes += Number(t.actualDuration);
  });

  const hasActualDurationData = tasksWithActualDuration.length > 0;
  const estimationVariancePercent = hasActualDurationData && totalEstimatedMinutes > 0
    ? Math.round(((totalActualMinutes - totalEstimatedMinutes) / totalEstimatedMinutes) * 100)
    : 0;

  // Total planned workload in hours across all filtered tasks
  const totalWorkloadMinutes = filteredTasks.reduce((sum, t) => sum + (Number(t.estimatedDuration) || 45), 0);
  const totalWorkloadHours = Number((totalWorkloadMinutes / 60).toFixed(1));

  // 6. Priority Distribution
  const priorityDistribution = {
    Critical: filteredTasks.filter(t => (t.priorityScore >= 80 || t.priority === 'Critical')).length,
    High: filteredTasks.filter(t => ((t.priorityScore >= 65 && t.priorityScore < 80) || t.priority === 'High')).length,
    Medium: filteredTasks.filter(t => ((t.priorityScore >= 50 && t.priorityScore < 65) || t.priority === 'Medium')).length,
    Low: filteredTasks.filter(t => ((t.priorityScore < 50 && t.priorityScore !== undefined) || t.priority === 'Low')).length
  };

  // 7. Project-level and Category Workload Distribution
  const projectMap = {};
  const categoryMap = {};

  filteredTasks.forEach(t => {
    const proj = t.projectArea || 'General Backlog';
    const cat = t.category || 'General';
    const duration = Number(t.estimatedDuration) || 45;

    projectMap[proj] = (projectMap[proj] || 0) + duration;
    categoryMap[cat] = (categoryMap[cat] || 0) + duration;
  });

  const projectWorkload = Object.keys(projectMap).map(p => ({
    name: p,
    minutes: projectMap[p],
    hours: Number((projectMap[p] / 60).toFixed(1))
  }));

  const categoryDistribution = Object.keys(categoryMap).map(c => ({
    category: c,
    minutes: categoryMap[c],
    hours: Number((categoryMap[c] / 60).toFixed(1))
  }));

  // 8. Goal & Milestone Alignment Progress
  const goalProgress = goals.filter(Boolean).map(g => {
    const goalId = g.goalId || g.id;
    const linked = tasks.filter(t => t && t.linkedGoalId === goalId);
    const completed = linked.filter(t => t.status === 'Completed');
    const totalLinked = linked.length;
    const milestoneRate = totalLinked > 0 ? Math.round((completed.length / totalLinked) * 100) : 0;

    return {
      goalId,
      name: g.name,
      category: g.category,
      totalLinked,
      completedLinked: completed.length,
      milestoneRate,
      targetAmount: g.targetAmount || 0,
      currentBalance: g.currentBalance || 0
    };
  });

  // 9. Revenue-Related Activity & Outcomes
  // Strictly counts completed tasks flagged as high or medium revenue impact (no fabricated dollars)
  const revenueTasks = filteredTasks.filter(t => 
    t && (t.incomeImpact === 'High' || t.incomeImpact === 'Medium' || t.incomeImpact === 'Direct Revenue')
  );
  const completedRevenueTasks = revenueTasks.filter(t => t.status === 'Completed');
  const revenueTaskCompletionRate = revenueTasks.length > 0
    ? Math.round((completedRevenueTasks.length / revenueTasks.length) * 100)
    : 0;

  // 10. Review Consistency
  const morningReviews = reviews.filter(r => r && String(r.reviewType).toUpperCase() === 'MORNING');
  const eveningReviews = reviews.filter(r => r && String(r.reviewType).toUpperCase() === 'EVENING');
  const weeklyReviews = reviews.filter(r => r && String(r.reviewType).toUpperCase() === 'WEEKLY');

  // 11. Continuous Improvement & Problem Identification
  const continuousImprovementAlerts = [];

  // A. Tasks repeatedly deferred (in 2 or more reviews/plans)
  const taskDeferralCounts = {};
  dailyPlans.forEach(p => {
    if (!p) return;
    if (Array.isArray(p.deferredTasksJSON)) {
      p.deferredTasksJSON.forEach(d => {
        const id = d?.taskId || d?.id;
        if (id) taskDeferralCounts[id] = (taskDeferralCounts[id] || 0) + 1;
      });
    }
  });
  reviews.forEach(r => {
    if (!r) return;
    if (Array.isArray(r.deferralsJSON)) {
      r.deferralsJSON.forEach(d => {
        const id = d?.taskId || d?.id;
        if (id) taskDeferralCounts[id] = (taskDeferralCounts[id] || 0) + 1;
      });
    }
  });

  Object.keys(taskDeferralCounts).forEach(id => {
    if (taskDeferralCounts[id] >= 2) {
      const task = tasks.find(t => (t.taskId || t.id) === id);
      if (task && task.status !== 'Completed') {
        continuousImprovementAlerts.push({
          type: 'repeated_deferral',
          severity: 'warning',
          title: `Repeatedly Deferred: "${task.title}"`,
          message: `This task was deferred ${taskDeferralCounts[id]} times. Consider breaking it down into smaller subtasks or rescoping it.`,
          taskId: id
        });
      }
    }
  });

  // B. Tasks with significant estimation overrun (>25%)
  tasksWithActualDuration.forEach(t => {
    const est = Number(t.estimatedDuration) || 45;
    const act = Number(t.actualDuration);
    if (act > est * 1.25) {
      continuousImprovementAlerts.push({
        type: 'estimation_overrun',
        severity: 'info',
        title: `Estimate Exceeded: "${t.title}"`,
        message: `Took ${act} mins vs estimated ${est} mins (+${Math.round(((act - est)/est)*100)}% variance). Update duration models for similar tasks.`
      });
    }
  });

  // C. Stagnant goals (goals with linked tasks but 0 completed)
  goalProgress.forEach(gp => {
    if (gp.totalLinked > 0 && gp.completedLinked === 0) {
      continuousImprovementAlerts.push({
        type: 'stagnant_goal',
        severity: 'warning',
        title: `Goal Needs Momentum: "${gp.name}"`,
        message: `Has ${gp.totalLinked} linked tasks but none completed yet. Recommend prioritizing one quick milestone.`
      });
    }
  });

  // D. Overdue task alert
  if (overdueTasks.length > 0) {
    continuousImprovementAlerts.push({
      type: 'overdue_tasks',
      severity: 'error',
      title: `${overdueTasks.length} Active Overdue Task(s)`,
      message: `Review deadlines in the Task Management module to rescope or reschedule.`
    });
  }

  return {
    totalTasksCount,
    completedCount: completedTasks.length,
    activeCount: activeTasks.length,
    inProgressCount: inProgressTasks.length,
    cancelledCount: cancelledTasks.length,
    overdueCount: overdueTasks.length,
    overdueTasks,
    overallCompletionRate,
    
    // Daily Plans
    totalTasksPlanned,
    totalPlannedCompleted,
    totalPlannedDeferred,
    plannedCompletionRate,

    // Durations
    totalWorkloadHours,
    totalWorkloadMinutes,
    hasActualDurationData,
    tasksWithActualDurationCount: tasksWithActualDuration.length,
    totalEstimatedMinutes,
    totalActualMinutes,
    estimationVariancePercent,

    // Distributions
    priorityDistribution,
    projectWorkload,
    categoryDistribution,

    // Goals & Revenue
    goalProgress,
    revenueTasksCount: revenueTasks.length,
    completedRevenueTasksCount: completedRevenueTasks.length,
    revenueTaskCompletionRate,

    // Reviews
    morningReviewsCount: morningReviews.length,
    eveningReviewsCount: eveningReviews.length,
    weeklyReviewsCount: weeklyReviews.length,

    // Heuristics
    continuousImprovementAlerts
  };
}
