/**
 * Deterministic Daily Big 5 Recommendation & Scheduling Engine
 * for RoutineTargetCompletion
 *
 * Uses:
 * - Phase 2 Priority Engine
 * - Routine day types (NORMAL, TRAINING, CLIENT, TRAVEL, RECOVERY)
 * - Available-time capacity checks
 * - Strict non-duplication and zero-LLM reliance
 */

import { calculatePriorityScore } from './priorityEngine.js';
import { calculateCalendarCommitments, calculateNetPlanningCapacity } from './calendarMath.js';

export const DAY_TYPES = {
  NORMAL:   { label: 'Normal Growth Day', capacityFactor: 1.0, description: 'Balanced execution across core business, learning, and projects.' },
  TRAINING: { label: 'Paid Training Day',  capacityFactor: 0.6, description: 'Paid corporate/college training delivery takes priority.' },
  CLIENT:   { label: 'Client Delivery Day', capacityFactor: 0.7, description: 'Contract deliverables and client sprints take priority.' },
  TRAVEL:   { label: 'Travel Day',         capacityFactor: 0.4, description: 'Reduced capacity; focus on 1-2 essential mobile tasks.' },
  RECOVERY: { label: 'Health & Recovery',  capacityFactor: 0.25, description: 'Protected rest and wellness; minimum critical maintenance only.' }
};

/**
 * Calculate available work capacity in minutes
 */
export function calculateAvailableCapacity(dateStr, dayType = 'NORMAL', customAvailableMinutes = null) {
  if (customAvailableMinutes !== null && !isNaN(Number(customAvailableMinutes))) {
    return Math.max(60, Number(customAvailableMinutes));
  }

  const date = new Date(dateStr);
  const dayIndex = isNaN(date.getDay()) ? 1 : date.getDay(); // 0 = Sun, 6 = Sat

  let baseMinutes = 480; // Weekday 8 hours (excluding 3.25h morning health routine & sleep)
  if (dayIndex === 6) {
    baseMinutes = 360; // Saturday 6 hours (excluding field work and family)
  } else if (dayIndex === 0) {
    baseMinutes = 240; // Sunday 4 hours (excluding temple and family time)
  }

  const factor = DAY_TYPES[dayType]?.capacityFactor || 1.0;
  return Math.round(baseMinutes * factor);
}

/**
 * Deterministically select up to 5 recommendations for today
 *
 * @param {Array} tasks List of all tasks for the user
 * @param {Object} options Configuration options
 * @returns {Object} Structured daily recommendation result
 */
export function generateDailyBigFive(tasks = [], options = {}) {
  const {
    planDate = new Date().toISOString().split('T')[0],
    dayType = 'NORMAL',
    customAvailableMinutes = null,
    goals = [],
    existingPlan = null,
    calendarEvents = []
  } = options;

  const grossAvailableMinutes = calculateAvailableCapacity(planDate, dayType, customAvailableMinutes);
  const calendarAnalysis = calculateCalendarCommitments(calendarEvents, planDate);
  const calendarBusyMinutes = calendarAnalysis.busyMinutes;
  const availableMinutes = calculateNetPlanningCapacity(grossAvailableMinutes, calendarBusyMinutes, 60);
  const isExternalCalendarSynced = Array.isArray(calendarEvents) && calendarEvents.length > 0;

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return {
      planDate,
      dayType,
      grossAvailableMinutes,
      calendarBusyMinutes,
      availableMinutes,
      plannedMinutes: 0,
      recommendedTasks: [],
      blockedAlerts: [],
      overflowTasks: [],
      overallSummary: 'No tasks available in your backlog. Create a task to generate your daily plan.',
      isExternalCalendarSynced,
      calendarConflicts: calendarAnalysis.conflicts
    };
  }

  // 1. Filter out ineligible tasks
  const eligibleCandidates = [];
  const blockedTasks = [];
  const completedTasks = [];

  tasks.forEach(task => {
    if (task.status === 'Completed' || task.status === 'Cancelled') {
      completedTasks.push(task);
      return;
    }

    // Enrich with Phase 2 Priority Score
    const priorityInfo = calculatePriorityScore(task, tasks, goals, new Date(planDate));
    const enriched = {
      ...task,
      priorityScore: priorityInfo.score,
      priorityBand: priorityInfo.band,
      isManualOverride: priorityInfo.isManualOverride,
      scoreBreakdown: priorityInfo.breakdown,
      scoreSummary: priorityInfo.summary
    };

    if (task.status === 'Blocked') {
      blockedTasks.push(enriched);
    } else {
      eligibleCandidates.push(enriched);
    }
  });

  // 2. Deterministic Sorting with tie-breakers
  eligibleCandidates.sort((a, b) => {
    // Primary: Score descending
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }

    // Tie-breaker 1: Urgent Manual Override
    if (a.isManualOverride && !b.isManualOverride) return -1;
    if (!a.isManualOverride && b.isManualOverride) return 1;

    // Tie-breaker 2: Due Date proximity (earliest first)
    if (a.dueDate && b.dueDate) {
      const cmp = a.dueDate.localeCompare(b.dueDate);
      if (cmp !== 0) return cmp;
    } else if (a.dueDate && !b.dueDate) {
      return -1;
    } else if (!a.dueDate && b.dueDate) {
      return 1;
    }

    // Tie-breaker 3: Income Impact (High > Medium > Low > None)
    const impactRank = { High: 4, Medium: 3, Low: 2, None: 1 };
    const aImpact = impactRank[a.incomeImpact] || 1;
    const bImpact = impactRank[b.incomeImpact] || 1;
    if (bImpact !== aImpact) {
      return bImpact - aImpact;
    }

    // Tie-breaker 4: CreatedAt timestamp (oldest first)
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });

  // 3. Selection & Capacity Fitting
  const recommendedTasks = [];
  const overflowTasks = [];
  let runningPlannedMinutes = 0;

  for (const candidate of eligibleCandidates) {
    const duration = Number(candidate.estimatedDuration) > 0 ? Number(candidate.estimatedDuration) : 45;

    // Build specific selection rationale
    let rationale = `Ranked #${recommendedTasks.length + 1} with Priority Score ${candidate.priorityScore}/100.`;
    if (candidate.isManualOverride) {
      rationale += ' Prioritized as urgent manual commitment.';
    } else if (candidate.dueDate && candidate.dueDate <= planDate) {
      rationale += ` Deadline urgent (${candidate.dueDate}).`;
    } else if (candidate.incomeImpact === 'High') {
      rationale += ' High direct revenue impact.';
    }

    if (recommendedTasks.length < 5) {
      if (runningPlannedMinutes + duration <= availableMinutes || recommendedTasks.length < 2) {
        // Fits in capacity (or first 2 essential items)
        runningPlannedMinutes += duration;
        recommendedTasks.push({
          ...candidate,
          duration,
          selectionRationale: rationale,
          isAccepted: existingPlan?.acceptanceStatuses?.[candidate.taskId] !== undefined
            ? existingPlan.acceptanceStatuses[candidate.taskId]
            : true
        });
      } else {
        // Over capacity
        overflowTasks.push({
          ...candidate,
          deferralReason: `Capacity exceeded: task requires ${duration}m but only ${Math.max(0, availableMinutes - runningPlannedMinutes)}m remain.`
        });
      }
    } else {
      overflowTasks.push({
        ...candidate,
        deferralReason: 'Beyond daily top 5 limit; deferred to next planning cycle.'
      });
    }
  }

  // 4. Preserve existing task order if user previously rearranged them
  if (existingPlan && Array.isArray(existingPlan.taskOrder) && existingPlan.taskOrder.length > 0) {
    recommendedTasks.sort((a, b) => {
      const idxA = existingPlan.taskOrder.indexOf(a.taskId);
      const idxB = existingPlan.taskOrder.indexOf(b.taskId);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });
  }

  // 5. Synthesis Summary
  const count = recommendedTasks.length;
  let overallSummary = `Planned ${count} focus task${count === 1 ? '' : 's'} totaling ${runningPlannedMinutes}m (${(runningPlannedMinutes / 60).toFixed(1)}h) of ${availableMinutes}m capacity.`;
  if (calendarBusyMinutes > 0) {
    overallSummary += ` (${calendarBusyMinutes}m allocated to Google Calendar events).`;
  }
  if (blockedTasks.length > 0) {
    overallSummary += ` ⚠️ ${blockedTasks.length} high-priority task(s) currently blocked.`;
  }
  if (overflowTasks.length > 0) {
    overallSummary += ` (${overflowTasks.length} task(s) deferred for capacity).`;
  }

  return {
    planDate,
    dayType,
    grossAvailableMinutes,
    calendarBusyMinutes,
    availableMinutes,
    plannedMinutes: runningPlannedMinutes,
    recommendedTasks,
    blockedAlerts: blockedTasks.slice(0, 3), // Surface top 3 blocked items
    overflowTasks,
    overallSummary,
    isExternalCalendarSynced,
    calendarConflicts: calendarAnalysis.conflicts
  };
}

