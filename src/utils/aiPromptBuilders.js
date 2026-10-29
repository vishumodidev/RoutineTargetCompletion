/**
 * AI Prompt Builders, Schema Validators, and Deterministic Fallback Engine
 * for RoutineTargetCompletion
 *
 * Implements:
 * - Data sanitization & credential redaction
 * - Untrusted content delimiter isolation (prompt injection protection)
 * - Strict JSON schema validation for model outputs
 * - Deterministic heuristic fallback generators (zero LLM dependency required)
 */

/**
 * Sanitizes and redacts sensitive data from context before model ingestion
 */
export function sanitizeContext(context = {}) {
  const sanitized = {};

  // Tasks: include only functional fields, omit any raw tokens or personal info
  if (Array.isArray(context.tasks)) {
    sanitized.tasks = context.tasks.slice(0, 15).map(t => ({
      taskId: t.taskId || t.id,
      title: String(t.title || '').substring(0, 120),
      description: String(t.description || '').substring(0, 250),
      category: t.category || 'General',
      priorityScore: t.priorityScore,
      priorityBand: t.priorityBand,
      dueDate: t.dueDate,
      incomeImpact: t.incomeImpact,
      status: t.status,
      estimatedDuration: t.estimatedDuration || 45
    }));
  }

  // Goals: summarize milestone names, omit detailed bank accounts or private balances
  if (Array.isArray(context.goals)) {
    sanitized.goals = context.goals.slice(0, 5).map(g => ({
      goalId: g.goalId || g.id,
      name: String(g.name || '').substring(0, 100),
      category: g.category,
      priority: g.priority,
      status: g.status
    }));
  }

  // Plan Summary: high-level capacity & count
  if (context.dailyPlan) {
    sanitized.dailyPlan = {
      planDate: context.dailyPlan.planDate,
      dayType: context.dailyPlan.dayType,
      availableMinutes: context.dailyPlan.availableMinutes,
      plannedMinutes: context.dailyPlan.plannedMinutes,
      taskCount: Array.isArray(context.dailyPlan.selectedTaskIds) ? context.dailyPlan.selectedTaskIds.length : 0
    };
  }

  // Calendar: include meeting titles and durations only
  if (Array.isArray(context.calendarEvents)) {
    sanitized.calendarEvents = context.calendarEvents.slice(0, 8).map(e => ({
      summary: String(e.summary || e.title || 'Meeting').substring(0, 100),
      durationMinutes: e.durationMinutes || 60,
      isAllDay: !!e.isAllDay
    }));
  }

  return sanitized;
}

/**
 * Delimits untrusted user text inside XML tags to prevent prompt injection
 */
export function wrapUntrusted(text) {
  const clean = String(text || '').replace(/<\/?untrusted_content>/gi, '');
  return `<untrusted_content>\n${clean}\n</untrusted_content>`;
}

// =========================================================================
// SCHEMA VALIDATORS
// =========================================================================

export function validateTaskBreakdownResponse(data) {
  if (!data || typeof data !== 'object') return null;
  if (!Array.isArray(data.subtasks) || data.subtasks.length === 0) return null;

  const validSubtasks = [];
  data.subtasks.forEach(s => {
    if (!s || typeof s !== 'object' || !s.title) return;
    const duration = Number(s.estimatedDuration);
    validSubtasks.push({
      title: String(s.title).trim(),
      description: String(s.description || '').trim(),
      nextAction: String(s.nextAction || s.title).trim(),
      estimatedDuration: !isNaN(duration) && duration >= 15 && duration <= 240 ? duration : 45,
      category: String(s.category || 'General').trim(),
      dependencies: String(s.dependencies || '').trim()
    });
  });

  if (validSubtasks.length === 0) return null;
  return {
    subtasks: validSubtasks,
    reasoning: String(data.reasoning || 'Actionable task decomposition.')
  };
}

export function validatePriorityExplanationResponse(data) {
  if (!data || typeof data !== 'object') return null;
  return {
    summary: String(data.summary || 'Priority analysis calculated.'),
    dominantFactors: Array.isArray(data.dominantFactors) ? data.dominantFactors : [],
    comparisonWithTopRanked: String(data.comparisonWithTopRanked || ''),
    goalImpact: String(data.goalImpact || '')
  };
}

export function validatePlanningAdviceResponse(data) {
  if (!data || typeof data !== 'object') return null;
  return {
    recommendation: String(data.recommendation || 'Focus on your confirmed priorities.'),
    capacityAnalysis: String(data.capacityAnalysis || ''),
    recommendedDeferrals: Array.isArray(data.recommendedDeferrals) ? data.recommendedDeferrals : [],
    keyRisks: Array.isArray(data.keyRisks) ? data.keyRisks : []
  };
}

export function validateReviewInsightsResponse(data) {
  if (!data || typeof data !== 'object') return null;
  return {
    observedTrends: Array.isArray(data.observedTrends) ? data.observedTrends : [],
    estimationLessons: String(data.estimationLessons || ''),
    blockerHighlights: String(data.blockerHighlights || ''),
    strategicRecommendations: Array.isArray(data.strategicRecommendations) ? data.strategicRecommendations : []
  };
}

// =========================================================================
// DETERMINISTIC HEURISTIC FALLBACKS (NO EXTERNAL LLM REQUIRED)
// =========================================================================

export function fallbackTaskBreakdown(task) {
  const title = task?.title || 'Complex Task';
  const category = task?.category || 'General';

  return {
    subtasks: [
      {
        title: `1. Define specifications & scope for: ${title}`,
        description: 'Outline requirements, input criteria, and expected outcomes.',
        nextAction: 'Draft bullet points in notes',
        estimatedDuration: 30,
        category,
        dependencies: ''
      },
      {
        title: `2. Execute core implementation sprint for: ${title}`,
        description: 'Focus work on primary deliverable without multitasking.',
        nextAction: 'Begin hands-on execution block',
        estimatedDuration: 60,
        category,
        dependencies: `1. Define specifications for: ${title}`
      },
      {
        title: `3. Validate, test, and review: ${title}`,
        description: 'Verify outputs against standards and mark completed.',
        nextAction: 'Run verification tests and review checklist',
        estimatedDuration: 30,
        category,
        dependencies: `2. Execute core implementation for: ${title}`
      }
    ],
    reasoning: 'Deterministic 3-phase execution breakdown (Specification -> Implementation -> Verification).'
  };
}

export function fallbackPriorityExplanation(task) {
  const score = task?.priorityScore || 50;
  const band = task?.priorityBand || 'Medium';
  const income = task?.incomeImpact || 'None';
  const due = task?.dueDate || 'None';

  return {
    summary: `${band} priority (${score}/100) calculated deterministically via the 5-factor mathematical engine.`,
    dominantFactors: [
      { factor: 'Income Impact', impact: income === 'High' ? 'High direct revenue contributor' : `${income} impact` },
      { factor: 'Deadline Urgency', impact: due !== 'None' ? `Target due date: ${due}` : 'Flexible deadline' }
    ],
    comparisonWithTopRanked: score >= 80 
      ? 'Ranks in the top Critical tier due to aligned deadline and strategic importance.' 
      : 'Ranks below higher-scoring tasks that possess stricter deadlines or greater revenue impact.',
    goalImpact: task?.linkedGoalId ? 'Directly advances linked financial/business milestone.' : 'Operational backlog task.'
  };
}

export function fallbackPlanningAdvice(context = {}) {
  const planned = context.dailyPlan?.plannedMinutes || 0;
  const available = context.dailyPlan?.availableMinutes || 480;
  const utilization = Math.round((planned / available) * 100);

  return {
    recommendation: utilization > 100
      ? 'Your planned workload exceeds capacity. Defer lower-priority tasks to tomorrow.'
      : 'Your daily plan fits within available capacity. Execute top 3 items first during morning deep focus.',
    capacityAnalysis: `Planned: ${planned}m (${(planned/60).toFixed(1)}h) of ${available}m (${(available/60).toFixed(1)}h) available capacity (${utilization}% utilization).`,
    recommendedDeferrals: utilization > 100 ? ['Defer Task #5 or tasks with Flexible deadlines to prevent overrun.'] : [],
    keyRisks: utilization > 85 ? ['High schedule density. Guard against meeting overrun.'] : ['Healthy buffer available for unplanned interruptions.']
  };
}

export function fallbackReviewInsights(weeklyMetrics = {}) {
  const rate = weeklyMetrics.completionRate || 0;
  const planned = weeklyMetrics.tasksPlannedCount || 0;
  const done = weeklyMetrics.tasksCompletedCount || 0;

  return {
    observedTrends: [
      `Completed ${done} of ${planned} planned tasks (${rate}% completion rate).`,
      weeklyMetrics.overdueCount > 0 ? `Alert: ${weeklyMetrics.overdueCount} task(s) currently past due date.` : 'No active overdue tasks.'
    ],
    estimationLessons: weeklyMetrics.hasActualDurationData
      ? `Estimation variance was ${weeklyMetrics.estimationVariancePercent > 0 ? '+' : ''}${weeklyMetrics.estimationVariancePercent}%.`
      : 'Log actual task duration to unlock estimation calibration insights.',
    blockerHighlights: weeklyMetrics.currentBlockers?.length > 0
      ? `${weeklyMetrics.currentBlockers.length} task(s) are blocked by dependencies.`
      : 'Zero active blockers logged this week.',
    strategicRecommendations: [
      'Maintain protected morning routine blocks for maximum energy.',
      'Schedule high-impact business tasks earlier in the week.'
    ]
  };
}

