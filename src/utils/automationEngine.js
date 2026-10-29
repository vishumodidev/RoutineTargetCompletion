/**
 * Controlled Automation Engine & Permission Guardrails
 * for RoutineTargetCompletion (Phase 8)
 *
 * Implements:
 * - 4 Approved deterministic workflows:
 *   1. auto_morning_plan: Morning planning preparation
 *   2. auto_evening_review: Evening review preparation
 *   3. auto_followup_suggestions: Follow-up task suggestions
 *   4. auto_weekly_review: Weekly progress review preparation
 * - Strict 4-tier Permission Model: READ_ONLY, DRAFT, USER_APPROVED_WRITE, RESTRICTED
 * - Idempotency deduplication & bounded retry protection
 * - Safe recoverable states (zero autonomous destructive writes)
 */

import { generateDailyBigFive } from './dailyPlanner.js';
import { calculatePriorityScore } from './priorityEngine.js';
import { getIsoWeekKey, getWeekDateRange, aggregateWeeklyMetrics } from './reviewAggregator.js';

export const WORKFLOW_TYPES = {
  MORNING_PLAN: 'auto_morning_plan',
  EVENING_REVIEW: 'auto_evening_review',
  FOLLOWUP_SUGGESTIONS: 'auto_followup_suggestions',
  WEEKLY_REVIEW: 'auto_weekly_review'
};

export const PERMISSION_CATEGORIES = {
  READ_ONLY: 'READ_ONLY',
  DRAFT: 'DRAFT',
  USER_APPROVED_WRITE: 'USER_APPROVED_WRITE',
  RESTRICTED: 'RESTRICTED'
};

export const ACTION_STATUSES = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXECUTED: 'EXECUTED',
  EXPIRED: 'EXPIRED'
};

export const WORKFLOW_DEFINITIONS = {
  [WORKFLOW_TYPES.MORNING_PLAN]: {
    id: WORKFLOW_TYPES.MORNING_PLAN,
    name: 'Morning Planning Preparation',
    description: 'Prepares proposed Daily Big 5 and capacity fit based on priorities and calendar commitments.',
    permissionCategory: PERMISSION_CATEGORIES.DRAFT,
    defaultTrigger: 'Manual / On App Open (05:00 - 12:00)',
    retryLimit: 2
  },
  [WORKFLOW_TYPES.EVENING_REVIEW]: {
    id: WORKFLOW_TYPES.EVENING_REVIEW,
    name: 'Evening Review Preparation',
    description: 'Summarizes today\'s execution, prepares standardized deferral notes, and drafts reflection.',
    permissionCategory: PERMISSION_CATEGORIES.DRAFT,
    defaultTrigger: 'Manual / On App Open (17:00 - 23:59)',
    retryLimit: 2
  },
  [WORKFLOW_TYPES.FOLLOWUP_SUGGESTIONS]: {
    id: WORKFLOW_TYPES.FOLLOWUP_SUGGESTIONS,
    name: 'Follow-Up Task Suggestions',
    description: 'Scans for overdue, blocked, or stagnant initiatives and suggests actionable next steps.',
    permissionCategory: PERMISSION_CATEGORIES.USER_APPROVED_WRITE,
    defaultTrigger: 'Manual / Post-Review',
    retryLimit: 2
  },
  [WORKFLOW_TYPES.WEEKLY_REVIEW]: {
    id: WORKFLOW_TYPES.WEEKLY_REVIEW,
    name: 'Weekly Review Preparation',
    description: 'Aggregates ISO weekly metrics, completion rates, duration accuracy, and stalled goals.',
    permissionCategory: PERMISSION_CATEGORIES.DRAFT,
    defaultTrigger: 'Manual / Weekend App Open (Sat - Sun)',
    retryLimit: 2
  }
};

// Permanently blocked actions regardless of caller or model suggestions
export const RESTRICTED_ACTIONS = new Set([
  'delete_task',
  'delete_review',
  'delete_plan',
  'send_email',
  'send_external_message',
  'execute_financial_tx',
  'financial_transaction',
  'modify_external_calendar',
  'delete_external_task',
  'execute_arbitrary_code'
]);

/**
 * Validates whether an action is permitted by policy
 */
export function validateActionPermission(actionType, hasUserApproval = false) {
  if (RESTRICTED_ACTIONS.has(actionType)) {
    throw new Error(`Permanently restricted action '${actionType}' cannot be executed.`);
  }

  // Persistent writes strictly require explicit user approval
  if (['create_task', 'update_task', 'save_daily_plan', 'save_review'].includes(actionType)) {
    if (!hasUserApproval) {
      return {
        allowed: false,
        category: PERMISSION_CATEGORIES.USER_APPROVED_WRITE,
        requiresApproval: true,
        reason: `Persistent write '${actionType}' requires explicit user confirmation.`
      };
    }
    return {
      allowed: true,
      category: PERMISSION_CATEGORIES.USER_APPROVED_WRITE,
      requiresApproval: false
    };
  }

  return {
    allowed: true,
    category: PERMISSION_CATEGORIES.DRAFT,
    requiresApproval: false
  };
}

/**
 * Generates deterministic idempotency key for deduplication
 */
export function generateIdempotencyKey(workflowType, userId, dateKey) {
  const cleanDate = String(dateKey || new Date().toISOString().split('T')[0]).trim();
  return `auto_${workflowType}_${userId}_${cleanDate}`;
}

// =========================================================================
// 1. MORNING PLANNING PREPARATION WORKFLOW
// =========================================================================
export function executeMorningPlanWorkflow({
  userId,
  tasks = [],
  goals = [],
  calendarEvents = [],
  existingPlan = null,
  planDate = null,
  targetDateStr = null,
  dayType = 'NORMAL',
  overwriteAccepted = false
}) {
  const dateStr = planDate || targetDateStr || new Date().toISOString().split('T')[0];
  const hasAcceptedPlan = !!(existingPlan && (existingPlan.planId || existingPlan.isLocked));

  if (hasAcceptedPlan && !overwriteAccepted) {
    return {
      status: 'SKIPPED',
      action: 'PRESERVE_EXISTING',
      workflowType: WORKFLOW_TYPES.MORNING_PLAN,
      userId,
      targetDateStr: dateStr,
      hasAcceptedPlan: true,
      message: 'An accepted daily plan is already active. Retaining existing plan to prevent accidental overwrites.',
      summary: 'Retained existing accepted plan to prevent accidental overwrite.',
      draftPlan: existingPlan,
      draftOutput: {
        statusMessage: 'Retained existing accepted plan',
        existingPlan
      },
      pendingActions: []
    };
  }

  // Generate candidate recommendation
  const candidatePlan = generateDailyBigFive(tasks, {
    planDate: dateStr,
    dayType: existingPlan?.dayType || dayType,
    goals,
    calendarEvents,
    existingPlan: overwriteAccepted ? null : existingPlan
  });

  const summary = `Drafted Big 5 plan with ${candidatePlan.recommendedTasks.length} recommended focus tasks (${candidatePlan.plannedMinutes}/${candidatePlan.availableMinutes}m).`;

  return {
    status: 'SUCCESS',
    action: 'DRAFT_GENERATED',
    workflowType: WORKFLOW_TYPES.MORNING_PLAN,
    userId,
    targetDateStr: dateStr,
    hasAcceptedPlan,
    message: summary,
    summary,
    draftPlan: candidatePlan,
    draftOutput: {
      availableMinutes: candidatePlan.availableMinutes,
      plannedMinutes: candidatePlan.plannedMinutes,
      recommendedTaskIds: candidatePlan.recommendedTasks.map(t => t.taskId || t.id),
      recommendedTasks: candidatePlan.recommendedTasks.map(t => ({
        taskId: t.taskId || t.id,
        title: t.title,
        priorityBand: t.priorityBand,
        priorityScore: t.priorityScore,
        estimatedDuration: t.estimatedDuration || 45
      })),
      overflowCount: candidatePlan.overflowTasks?.length || 0,
      blockedCount: candidatePlan.blockedAlerts?.length || 0,
      selectionRationale: candidatePlan.selectionRationale,
      summary
    },
    // Pure draft: zero persistent write actions generated autonomously
    pendingActions: []
  };
}

// =========================================================================
// 2. EVENING REVIEW PREPARATION WORKFLOW
// =========================================================================
export function executeEveningReviewWorkflow({
  userId,
  tasks = [],
  dailyPlan = null,
  reviewDate = null,
  targetDateStr = null
}) {
  const dateStr = reviewDate || targetDateStr || new Date().toISOString().split('T')[0];
  const plannedIds = Array.isArray(dailyPlan?.selectedTaskIds) ? dailyPlan.selectedTaskIds : [];
  const plannedTasks = tasks.filter(t => plannedIds.includes(t.taskId || t.id));
  
  const completedPlanned = plannedTasks.filter(t => t.status === 'Completed');
  const uncompletedPlanned = plannedTasks.filter(t => t.status !== 'Completed');

  const completionRate = plannedTasks.length > 0
    ? Math.round((completedPlanned.length / plannedTasks.length) * 100)
    : 0;

  // Prepare draft deferrals for uncompleted planned tasks
  const suggestedDeferrals = uncompletedPlanned.map(t => ({
    taskId: t.taskId || t.id,
    title: t.title,
    reasonCategory: 'Insufficient time',
    notes: 'Deferred during evening review preparation.'
  }));

  const draftReflection = plannedTasks.length > 0
    ? `Completed ${completedPlanned.length} of ${plannedTasks.length} planned tasks (${completionRate}% completion rate). ${
        uncompletedPlanned.length > 0 ? `${uncompletedPlanned.length} task(s) recommended for deferral.` : 'All planned tasks completed.'
      }`
    : 'No formal daily plan was recorded for today. Reviewed backlog tasks.';

  const summaryMetrics = {
    tasksPlanned: plannedTasks.length,
    tasksCompleted: completedPlanned.length,
    completionRate
  };

  return {
    status: 'SUCCESS',
    workflowType: WORKFLOW_TYPES.EVENING_REVIEW,
    userId,
    targetDateStr: dateStr,
    message: `Evening review prepared with ${completedPlanned.length}/${plannedTasks.length} tasks completed.`,
    summaryMetrics,
    proposedDeferrals: suggestedDeferrals,
    draftReflection,
    draftOutput: {
      tasksPlanned: plannedTasks.length,
      tasksCompleted: completedPlanned.length,
      completionRate,
      suggestedDeferrals,
      draftReflection,
      summary: `Completed ${completedPlanned.length}/${plannedTasks.length} tasks (${completionRate}%)`
    },
    pendingActions: []
  };
}

// =========================================================================
// 3. FOLLOW-UP TASK SUGGESTIONS WORKFLOW
// =========================================================================
export function executeFollowupSuggestionsWorkflow({
  userId,
  tasks = [],
  goals = [],
  targetDateStr = null,
  referenceDate = null
}) {
  const dateStr = referenceDate || targetDateStr || new Date().toISOString().split('T')[0];
  const suggestions = [];

  // A. Check for tasks overdue by 2 or more days
  const now = new Date(dateStr);
  tasks.forEach(t => {
    if (t.status === 'Completed' || t.status === 'Cancelled' || !t.dueDate) return;
    const due = new Date(t.dueDate);
    const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays >= 2) {
      const payload = {
        title: `Triage & Rescope: ${t.title}`,
        description: `Review obstacles, update estimate, or adjust deadline for: "${t.title}".`,
        category: t.category || 'General',
        projectArea: t.projectArea || '',
        estimatedDuration: 30,
        dueDate: dateStr,
        deadlineType: 'Hard',
        incomeImpact: t.incomeImpact || 'None',
        status: 'Not Started',
        reason: `Task is ${diffDays} days past due date (${t.dueDate}).`
      };
      suggestions.push({
        actionId: `act_fup_overdue_${t.taskId || t.id}`,
        actionType: 'create_task',
        permissionCategory: PERMISSION_CATEGORIES.USER_APPROVED_WRITE,
        status: ACTION_STATUSES.PENDING_APPROVAL,
        reason: `Task is ${diffDays} days past due date (${t.dueDate}).`,
        proposedTask: payload,
        actionPayload: payload
      });
    }
  });

  // B. Check for Blocked tasks or tasks waiting on dependencies
  tasks.forEach(t => {
    if (t.status === 'Completed' || t.status === 'Cancelled') return;
    const isBlocked = t.status === 'Blocked' || (t.dependencies && String(t.dependencies).trim().length > 0);
    if (isBlocked) {
      const payload = {
        title: `Resolve Blocker for: ${t.title}`,
        description: `Identify unblocking dependency or contact collaborator for: "${t.title}".`,
        category: t.category || 'General',
        projectArea: t.projectArea || '',
        estimatedDuration: 30,
        dueDate: dateStr,
        deadlineType: 'Hard',
        incomeImpact: t.incomeImpact || 'None',
        status: 'Not Started',
        reason: `Task is currently blocked or waiting on dependencies (${t.dependencies || 'Blocked'}).`
      };
      suggestions.push({
        actionId: `act_fup_blocked_${t.taskId || t.id}`,
        actionType: 'create_task',
        permissionCategory: PERMISSION_CATEGORIES.USER_APPROVED_WRITE,
        status: ACTION_STATUSES.PENDING_APPROVAL,
        reason: `Task is currently blocked or waiting on dependencies (${t.dependencies || 'Blocked'}).`,
        proposedTask: payload,
        actionPayload: payload
      });
    }
  });

  // C. Check for High/Critical priority goals with 0 linked tasks
  goals.forEach(g => {
    const goalId = g.goalId || g.id;
    const linked = tasks.filter(t => t.linkedGoalId === goalId);
    if ((g.priority === 'High' || g.priority === 'Critical') && linked.length === 0) {
      const payload = {
        title: `Milestone 1: Define initial deliverables for ${g.name}`,
        description: `Break down initial concrete action items for strategic goal: "${g.name}".`,
        category: g.category || 'Business',
        linkedGoalId: goalId,
        estimatedDuration: 45,
        dueDate: dateStr,
        deadlineType: 'Soft',
        incomeImpact: 'High',
        status: 'Not Started',
        reason: `High priority goal "${g.name}" has zero active action tasks linked.`
      };
      suggestions.push({
        actionId: `act_fup_goal_${goalId}`,
        actionType: 'create_task',
        permissionCategory: PERMISSION_CATEGORIES.USER_APPROVED_WRITE,
        status: ACTION_STATUSES.PENDING_APPROVAL,
        reason: `High priority goal "${g.name}" has zero active action tasks linked.`,
        proposedTask: payload,
        actionPayload: payload
      });
    }
  });

  // Cap suggestions at top 4 to prevent overwhelming the user
  const cappedSuggestions = suggestions.slice(0, 4);

  return {
    status: 'SUCCESS',
    workflowType: WORKFLOW_TYPES.FOLLOWUP_SUGGESTIONS,
    userId,
    targetDateStr: dateStr,
    message: `Generated ${cappedSuggestions.length} proposed follow-up action(s) awaiting your explicit approval.`,
    draftOutput: {
      suggestionsCount: cappedSuggestions.length,
      summary: `Proposed ${cappedSuggestions.length} follow-up action(s)`
    },
    pendingActions: cappedSuggestions
  };
}

// =========================================================================
// 4. WEEKLY REVIEW PREPARATION WORKFLOW
// =========================================================================
export function executeWeeklyReviewWorkflow({
  userId,
  tasks = [],
  dailyPlans = [],
  goals = [],
  targetDateStr = null,
  weekKey = null
}) {
  const dateStr = targetDateStr || new Date().toISOString().split('T')[0];
  const effectiveWeekKey = weekKey || getIsoWeekKey(new Date(`${dateStr}T12:00:00Z`));
  const { startDate, endDate } = getWeekDateRange(effectiveWeekKey);

  const metrics = aggregateWeeklyMetrics({
    tasks,
    dailyPlans,
    goals,
    startDate,
    endDate,
    todayDateStr: dateStr
  });

  const draftReflection = `Weekly Progress for ${effectiveWeekKey}: Completed ${metrics.tasksCompletedCount} of ${metrics.tasksPlannedCount} planned tasks (${metrics.completionRate}% completion rate). ${
    metrics.overdueCount > 0 ? `${metrics.overdueCount} task(s) currently past due.` : 'Zero active overdue tasks.'
  }`;

  return {
    status: 'SUCCESS',
    workflowType: WORKFLOW_TYPES.WEEKLY_REVIEW,
    userId,
    targetDateStr: dateStr,
    message: `Weekly review metrics computed for period ${effectiveWeekKey}.`,
    weeklyMetrics: metrics,
    draftWeeklyReview: {
      reflectionText: draftReflection,
      nextWeekSuggestions: metrics.suggestedNextWeekPriorities || []
    },
    draftOutput: {
      weekKey: effectiveWeekKey,
      startDate,
      endDate,
      metrics,
      draftReflection,
      summary: `Weekly Progress: ${metrics.tasksCompletedCount}/${metrics.tasksPlannedCount} completed (${metrics.completionRate}%)`
    },
    pendingActions: []
  };
}
