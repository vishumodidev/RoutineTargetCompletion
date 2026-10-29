/**
 * Deterministic Priority Engine for RoutineTargetCompletion
 *
 * Formula:
 * Priority Score = (0.30 × Deadline Urgency)
 *                + (0.25 × Goal Alignment)
 *                + (0.20 × Income or Business Impact)
 *                + (0.15 × Dependency Importance)
 *                + (0.10 × Readiness)
 *
 * Each factor is normalized to [0, 100].
 * Final Priority Score is rounded to integer in [0, 100].
 * Pure JavaScript, 100% deterministic, zero LLM dependency.
 */

export const PRIORITY_WEIGHTS = {
  URGENCY: 0.30,
  GOAL_ALIGNMENT: 0.25,
  INCOME_IMPACT: 0.20,
  DEPENDENCY: 0.15,
  READINESS: 0.10
};

export const PRIORITY_BANDS = {
  CRITICAL: { min: 80, max: 100, label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  HIGH:     { min: 60, max: 79,  label: 'High',     color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
  MEDIUM:   { min: 40, max: 59,  label: 'Medium',   color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
  LOW:      { min: 0,  max: 39,  label: 'Low',      color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30' }
};

/**
 * Helper to clamp a number between min and max
 */
export function clamp(val, min = 0, max = 100) {
  const num = Number(val);
  if (isNaN(num)) return min;
  return Math.min(max, Math.max(min, num));
}

/**
 * 1. Calculate Deadline Urgency (0 - 100)
 */
export function calculateDeadlineUrgency(task, referenceDate = new Date()) {
  if (!task) return { score: 20, reason: 'No task provided' };
  
  // Completed or cancelled tasks have zero urgency
  if (task.status === 'Completed' || task.status === 'Cancelled') {
    return { score: 0, reason: `Task is ${task.status}` };
  }

  const deadlineType = task.deadlineType || 'Flexible';

  if (!task.dueDate) {
    if (deadlineType === 'Hard') return { score: 40, reason: 'Hard deadline without due date' };
    if (deadlineType === 'Soft') return { score: 30, reason: 'Soft deadline without due date' };
    return { score: 20, reason: 'No due date set (Flexible)' };
  }

  // Parse reference date (start of day)
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  // Parse task due date (start of day)
  const due = new Date(task.dueDate);
  if (isNaN(due.getTime())) {
    return { score: 20, reason: 'Invalid due date format' };
  }
  due.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - ref.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    if (deadlineType === 'Hard') {
      return { score: 100, reason: `Overdue by ${overdueDays} day(s) (Hard deadline)` };
    }
    if (deadlineType === 'Soft') {
      return { score: 95, reason: `Overdue by ${overdueDays} day(s) (Soft deadline)` };
    }
    return { score: 85, reason: `Overdue by ${overdueDays} day(s) (Flexible)` };
  }

  if (diffDays === 0) {
    if (deadlineType === 'Hard') return { score: 95, reason: 'Due today (Hard deadline)' };
    if (deadlineType === 'Soft') return { score: 90, reason: 'Due today (Soft deadline)' };
    return { score: 80, reason: 'Due today (Flexible)' };
  }

  if (diffDays === 1) {
    if (deadlineType === 'Hard') return { score: 85, reason: 'Due tomorrow (Hard deadline)' };
    if (deadlineType === 'Soft') return { score: 75, reason: 'Due tomorrow (Soft deadline)' };
    return { score: 65, reason: 'Due tomorrow (Flexible)' };
  }

  if (diffDays <= 3) {
    if (deadlineType === 'Hard') return { score: 70, reason: `Due in ${diffDays} days (Hard deadline)` };
    if (deadlineType === 'Soft') return { score: 60, reason: `Due in ${diffDays} days (Soft deadline)` };
    return { score: 50, reason: `Due in ${diffDays} days (Flexible)` };
  }

  if (diffDays <= 7) {
    if (deadlineType === 'Hard') return { score: 55, reason: `Due in ${diffDays} days (within 1 week)` };
    if (deadlineType === 'Soft') return { score: 45, reason: `Due in ${diffDays} days (within 1 week)` };
    return { score: 35, reason: `Due in ${diffDays} days (within 1 week)` };
  }

  if (diffDays <= 14) {
    if (deadlineType === 'Hard') return { score: 40, reason: `Due in ${diffDays} days (within 2 weeks)` };
    if (deadlineType === 'Soft') return { score: 30, reason: `Due in ${diffDays} days (within 2 weeks)` };
    return { score: 20, reason: `Due in ${diffDays} days (within 2 weeks)` };
  }

  if (diffDays <= 30) {
    return { score: 20, reason: `Due in ${diffDays} days (within 1 month)` };
  }

  return { score: 10, reason: `Due in ${diffDays} days (over 1 month away)` };
}

/**
 * 2. Calculate Goal Alignment (0 - 100)
 */
export function calculateGoalAlignment(task, goals = []) {
  if (!task) return { score: 25, reason: 'No task provided' };

  // Explicit user-assigned importance rating overrides baseline
  if (task.importance !== undefined && task.importance !== null && !isNaN(Number(task.importance))) {
    const custom = clamp(task.importance);
    if (custom > 50 || !task.linkedGoalId) {
      return { score: custom, reason: `Explicit importance rating of ${custom}/100` };
    }
  }

  // Check if linked to an active goal
  if (task.linkedGoalId) {
    const linked = Array.isArray(goals) ? goals.find(g => (g.id || g.GoalID) === task.linkedGoalId) : null;
    if (linked) {
      const goalPriority = linked.priority || linked.Priority || 'High';
      const goalName = linked.name || linked.Name || 'Active Goal';
      if (goalPriority === 'Critical') {
        return { score: 100, reason: `Linked to Critical goal: ${goalName}` };
      }
      if (goalPriority === 'High') {
        return { score: 85, reason: `Linked to High-priority goal: ${goalName}` };
      }
      if (goalPriority === 'Medium') {
        return { score: 70, reason: `Linked to Medium-priority goal: ${goalName}` };
      }
      return { score: 50, reason: `Linked to goal: ${goalName}` };
    }
    return { score: 75, reason: 'Linked to active goal milestone' };
  }

  // Strategic category alignment baseline
  const category = task.category || 'General';
  const strategicHigh = ['AI Agent Development', 'Corporate Training', 'MI Lifestyle Sales', 'College Training'];
  const strategicMedium = ['Website Development', 'Career Development', 'Personal Finance', 'Health and Exercise'];

  if (strategicHigh.includes(category)) {
    return { score: 55, reason: `Primary strategic domain: ${category}` };
  }
  if (strategicMedium.includes(category)) {
    return { score: 40, reason: `Supporting growth domain: ${category}` };
  }

  return { score: 25, reason: 'Independent task without linked strategic goal' };
}

/**
 * 3. Calculate Income or Business Impact (0 - 100)
 */
export function calculateIncomeImpact(task) {
  if (!task) return { score: 10, reason: 'No task provided' };

  const impact = task.incomeImpact;

  if (impact === 'High') {
    return { score: 100, reason: 'Direct revenue creation or primary client commitment' };
  }
  if (impact === 'Medium') {
    return { score: 70, reason: 'High-probability sales pipeline or commercial demo' };
  }
  if (impact === 'Low') {
    return { score: 35, reason: 'Indirect business growth or marketing asset' };
  }
  if (impact === 'None') {
    return { score: 10, reason: 'Non-revenue maintenance or routine activity' };
  }

  // Infer from category if not explicitly set
  const category = task.category || '';
  if (['Corporate Training', 'AI Product Sales', 'College Training', 'MI Lifestyle Sales'].includes(category)) {
    return { score: 60, reason: `Commercial business category: ${category}` };
  }

  return { score: 10, reason: 'No direct commercial impact specified' };
}

/**
 * 4. Calculate Dependency Importance (0 - 100)
 */
export function calculateDependency(task, allTasks = []) {
  if (!task) return { score: 50, reason: 'No task provided' };

  // If task is blocked, its execution readiness is impaired
  if (task.status === 'Blocked') {
    return { score: 20, reason: 'Task is currently blocked by an unresolved dependency' };
  }

  const taskId = task.taskId;
  
  // Count how many other tasks depend on this task
  if (taskId && Array.isArray(allTasks) && allTasks.length > 0) {
    const dependentCount = allTasks.filter(t => {
      if (t.taskId === taskId || t.status === 'Completed' || t.status === 'Cancelled') return false;
      const deps = String(t.dependencies || '').split(',').map(s => s.trim());
      return deps.includes(taskId);
    }).length;

    if (dependentCount >= 3) {
      return { score: 100, reason: `Critical blocker: unblocks ${dependentCount} dependent tasks` };
    }
    if (dependentCount === 2) {
      return { score: 85, reason: `Major prerequisite: unblocks 2 dependent tasks` };
    }
    if (dependentCount === 1) {
      return { score: 70, reason: `Prerequisite: unblocks 1 downstream task` };
    }
  }

  // If task itself has dependencies listed
  if (task.dependencies && String(task.dependencies).trim() !== '') {
    const depIds = String(task.dependencies).split(',').map(s => s.trim());
    const unresolved = Array.isArray(allTasks) 
      ? allTasks.filter(t => depIds.includes(t.taskId) && t.status !== 'Completed')
      : [];

    if (unresolved.length > 0) {
      return { score: 30, reason: `Waiting on ${unresolved.length} incomplete prerequisite(s)` };
    }
    return { score: 65, reason: 'All prerequisites are completed' };
  }

  return { score: 50, reason: 'Independent task with no blocking dependencies' };
}

/**
 * 5. Calculate Readiness (0 - 100)
 */
export function calculateReadiness(task) {
  if (!task) return { score: 50, reason: 'No task provided' };

  if (task.status === 'Blocked') {
    return { score: 0, reason: 'Blocked: cannot execute now' };
  }
  if (task.status === 'Deferred') {
    return { score: 15, reason: 'Deferred task' };
  }
  if (task.status === 'Completed' || task.status === 'Cancelled') {
    return { score: 0, reason: `Task is ${task.status}` };
  }

  let score = 40; // Base planned score
  const reasons = [];

  if (task.status === 'In Progress') {
    score += 15;
    reasons.push('Work already in progress');
  } else if (task.status === 'Inbox') {
    score -= 15;
    reasons.push('Unrefined inbox task');
  }

  if (task.nextAction && String(task.nextAction).trim() !== '') {
    score += 25;
    reasons.push('Clear next actionable step defined');
  }

  if (Number(task.estimatedDuration) > 0) {
    score += 10;
    reasons.push('Duration estimated');
  }

  if (task.projectArea && String(task.projectArea).trim() !== '') {
    score += 10;
    reasons.push('Project scope identified');
  }

  // Explicit readiness override if provided
  if (task.readiness !== undefined && task.readiness !== null && !isNaN(Number(task.readiness))) {
    const explicit = clamp(task.readiness);
    return { score: explicit, reason: `Explicit readiness value: ${explicit}/100` };
  }

  const finalScore = clamp(score, 0, 100);
  return { 
    score: finalScore, 
    reason: reasons.length > 0 ? reasons.join(' • ') : 'Standard planned readiness' 
  };
}

/**
 * Main Priority Calculation Engine
 * 
 * @param {Object} task The task object
 * @param {Array} allTasks Contextual list of all tasks for dependency checking
 * @param {Array} goals Contextual list of financial goals for goal alignment
 * @param {Date} referenceDate Evaluation date (defaults to today)
 * @returns {Object} Priority calculation result with score, band, breakdown, and summary
 */
export function calculatePriorityScore(task, allTasks = [], goals = [], referenceDate = new Date()) {
  if (!task) {
    return {
      score: 0,
      band: 'Low',
      breakdown: null,
      summary: 'No task provided for priority scoring.'
    };
  }

  const urgency = calculateDeadlineUrgency(task, referenceDate);
  const goalAlignment = calculateGoalAlignment(task, goals);
  const incomeImpact = calculateIncomeImpact(task);
  const dependency = calculateDependency(task, allTasks);
  const readiness = calculateReadiness(task);

  const weightedScore =
    (urgency.score * PRIORITY_WEIGHTS.URGENCY) +
    (goalAlignment.score * PRIORITY_WEIGHTS.GOAL_ALIGNMENT) +
    (incomeImpact.score * PRIORITY_WEIGHTS.INCOME_IMPACT) +
    (dependency.score * PRIORITY_WEIGHTS.DEPENDENCY) +
    (readiness.score * PRIORITY_WEIGHTS.READINESS);

  const finalScore = Math.round(clamp(weightedScore, 0, 100));

  // Determine Priority Band
  let band = 'Low';
  if (finalScore >= PRIORITY_BANDS.CRITICAL.min) {
    band = 'Critical';
  } else if (finalScore >= PRIORITY_BANDS.HIGH.min) {
    band = 'High';
  } else if (finalScore >= PRIORITY_BANDS.MEDIUM.min) {
    band = 'Medium';
  }

  // Format Top Contributing Factor Reasons
  const topFactors = [
    { name: 'Urgency', contrib: urgency.score * PRIORITY_WEIGHTS.URGENCY, reason: urgency.reason },
    { name: 'Goal Alignment', contrib: goalAlignment.score * PRIORITY_WEIGHTS.GOAL_ALIGNMENT, reason: goalAlignment.reason },
    { name: 'Income Impact', contrib: incomeImpact.score * PRIORITY_WEIGHTS.INCOME_IMPACT, reason: incomeImpact.reason },
    { name: 'Dependency', contrib: dependency.score * PRIORITY_WEIGHTS.DEPENDENCY, reason: dependency.reason },
    { name: 'Readiness', contrib: readiness.score * PRIORITY_WEIGHTS.READINESS, reason: readiness.reason }
  ].sort((a, b) => b.contrib - a.contrib);

  const summary = `${band} priority (${finalScore}/100). Key drivers: ${topFactors[0].reason}; ${topFactors[1].reason}.`;

  // Detect urgent commitment override (e.g. user manually flagged Critical, but score is lower)
  const isCriticalTag = task.priority === 'Critical' || task.priorityTag === 'Critical';
  const isManualOverride = isCriticalTag && finalScore < 80;

  return {
    score: finalScore,
    band,
    isManualOverride,
    breakdown: {
      urgency: {
        raw: urgency.score,
        weight: PRIORITY_WEIGHTS.URGENCY,
        weighted: Math.round(urgency.score * PRIORITY_WEIGHTS.URGENCY * 10) / 10,
        reason: urgency.reason
      },
      goalAlignment: {
        raw: goalAlignment.score,
        weight: PRIORITY_WEIGHTS.GOAL_ALIGNMENT,
        weighted: Math.round(goalAlignment.score * PRIORITY_WEIGHTS.GOAL_ALIGNMENT * 10) / 10,
        reason: goalAlignment.reason
      },
      incomeImpact: {
        raw: incomeImpact.score,
        weight: PRIORITY_WEIGHTS.INCOME_IMPACT,
        weighted: Math.round(incomeImpact.score * PRIORITY_WEIGHTS.INCOME_IMPACT * 10) / 10,
        reason: incomeImpact.reason
      },
      dependency: {
        raw: dependency.score,
        weight: PRIORITY_WEIGHTS.DEPENDENCY,
        weighted: Math.round(dependency.score * PRIORITY_WEIGHTS.DEPENDENCY * 10) / 10,
        reason: dependency.reason
      },
      readiness: {
        raw: readiness.score,
        weight: PRIORITY_WEIGHTS.READINESS,
        weighted: Math.round(readiness.score * PRIORITY_WEIGHTS.READINESS * 10) / 10,
        reason: readiness.reason
      }
    },
    summary
  };
}

