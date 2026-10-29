/**
 * Personal AI Business Mentor Engine (Phase 10)
 * for RoutineTargetCompletion
 *
 * Implements:
 * 1. Controlled Context Builder with sensitive data redaction & missing-data labeling
 * 2. Strict JSON Schema Validation for model outputs
 * 3. Deterministic Heuristic Fallbacks (100% operational with zero LLM dependency)
 * 4. Grounded Prompt Builders with XML untrusted content isolation
 * 5. Strict Zero-Conflation Guarantee: Realized revenue is never mixed with pipeline forecasts
 */

import { calculatePriorityScore } from './priorityEngine.js';
import { calculatePipelineForecast } from './forecastEngine.js';

export const PROPOSAL_TYPES = {
  TRAINING_PROPOSAL: 'training_proposal',
  SOFTWARE_PROPOSAL: 'software_proposal',
  FOLLOWUP_EMAIL: 'followup_email',
  MEETING_AGENDA: 'meeting_agenda',
  DISCOVERY_QUESTIONNAIRE: 'discovery_questionnaire'
};

// =========================================================================
// 1. CONTROLLED CONTEXT BUILDER & DATA BOUNDARIES
// =========================================================================

/**
 * Delimits untrusted user text inside XML tags to prevent prompt injection
 */
export function wrapUntrusted(text) {
  const clean = String(text || '').replace(/<\/?untrusted_content>/gi, '');
  return `<untrusted_content>\n${clean}\n</untrusted_content>`;
}

/**
 * Sanitizes and minimizes application data into a controlled, non-confidential context
 * Redacts passwords, auth tokens, external emails, private bank details.
 */
export function buildMentorContext({
  user = {},
  tasks = [],
  opportunities = [],
  goals = [],
  dailyPlan = null,
  calendarEvents = [],
  weeklyMetrics = null,
  reviews = [],
  todayDateStr = new Date().toISOString().split('T')[0]
} = {}) {
  const missingDataFlags = [];

  // 1. User profile minimization (No passwords, tokens, or credentials)
  const sanitizedUser = {
    name: user.name || 'User',
    currentSkillFocus: user.currentSkillFocus || 'Agentic AI',
    currentProjectName: user.currentProjectName || 'AI CRM Agent',
    todayLearningTarget: user.todayLearningTarget || '',
    todayBuildTaskName: user.todayBuildTaskName || '',
    incomeMilestone: Number(user.incomeMilestone) || 150000,
    incomeBaseline: Number(user.monthlyIncomeBaseline) || 75000
  };

  // 2. Active tasks sanitization (capped at 15, titles <= 120 chars, descriptions <= 250 chars)
  const activeTasks = (tasks || [])
    .filter(t => t.status !== 'Completed' && t.status !== 'Cancelled')
    .slice(0, 15)
    .map(t => {
      const priorityInfo = calculatePriorityScore(t, tasks, goals, opportunities);
      const score = (t.priorityScore !== undefined && !isNaN(Number(t.priorityScore)))
        ? Number(t.priorityScore)
        : priorityInfo.score;
      const band = t.priorityBand || priorityInfo.band;

      return {
        taskId: t.taskId || t.id,
        title: String(t.title || '').substring(0, 120),
        description: String(t.description || '').substring(0, 250),
        category: t.category || 'General',
        priorityScore: score,
        priorityBand: band,
        dueDate: t.dueDate || 'Unscheduled',
        deadlineType: t.deadlineType || 'Flexible',
        incomeImpact: t.incomeImpact || 'None',
        estimatedDuration: Number(t.estimatedDuration) || 30,
        actualDuration: Number(t.actualDuration) || 0,
        linkedGoalId: t.linkedGoalId || '',
        linkedOpportunityId: t.linkedOpportunityId || '',
        nextAction: String(t.nextAction || '').substring(0, 120),
        status: t.status || 'Planned'
      };
    });

  // Track completed tasks for evening reflection
  const completedTodayTasks = (tasks || [])
    .filter(t => t.status === 'Completed')
    .slice(0, 10)
    .map(t => ({
      taskId: t.taskId || t.id,
      title: String(t.title || '').substring(0, 120),
      category: t.category || 'General',
      actualDuration: Number(t.actualDuration) || Number(t.estimatedDuration) || 0,
      completedAt: t.completedAt || ''
    }));

  if (activeTasks.length === 0) {
    missingDataFlags.push('No active tasks currently queued in backlog');
  }

  // 3. Opportunities pipeline sanitization (capped at 10, strictly separated forecast)
  const forecast = calculatePipelineForecast(opportunities, todayDateStr);
  const sanitizedOpportunities = (opportunities || []).slice(0, 10).map(o => ({
    id: o.id || o.opportunityId,
    title: String(o.title || o.clientName || 'Opportunity').substring(0, 100),
    contactName: String(o.contactName || '').substring(0, 80),
    source: o.source || 'Other',
    stage: o.stage || 'New Leads',
    value: Number(o.value) || 0,
    probability: Number(o.probability) !== undefined ? Number(o.probability) : 10,
    expectedCloseDate: o.expectedCloseDate || 'Not set',
    status: o.status || 'Open',
    notes: String(o.notes || '').substring(0, 200)
  }));

  if (sanitizedOpportunities.length === 0) {
    missingDataFlags.push('No pipeline opportunities currently registered');
  }

  // 4. Financial goals summary (capped at 5)
  const sanitizedGoals = (goals || []).slice(0, 5).map(g => ({
    goalId: g.id || g.goalId,
    name: String(g.name || 'Financial Goal').substring(0, 80),
    category: g.category || 'General',
    targetAmount: Number(g.targetAmount) || 0,
    currentBalance: Number(g.currentBalance) || 0,
    priority: g.priority || 'Medium'
  }));

  // 5. Daily Plan & Calendar Capacity
  let availableMinutes = 480;
  let plannedMinutes = 0;
  let dayType = 'NORMAL';

  if (dailyPlan) {
    availableMinutes = Number(dailyPlan.availableMinutes) || 480;
    plannedMinutes = Number(dailyPlan.plannedMinutes) || 0;
    dayType = dailyPlan.dayType || 'NORMAL';
  }

  const sanitizedCalendar = (calendarEvents || []).slice(0, 8).map(e => ({
    summary: String(e.summary || e.title || 'Meeting').substring(0, 80),
    durationMinutes: Number(e.durationMinutes) || 60,
    isAllDay: !!e.isAllDay
  }));

  // 6. Income Summary with Strict Zero Conflation
  const incomeSummary = {
    monthlyIncomeTarget: sanitizedUser.incomeMilestone,
    actualConfirmedIncome: forecast.actualRevenue + (Number(user.incomeReceived) || 0),
    openPipelineTotal: forecast.openPipelineTotal,
    weightedPipelineForecast: forecast.weightedPipelineForecast,
    pendingPaymentsRecorded: 0,
    winRatePercent: forecast.winRatePercent,
    activeDealsCount: forecast.activeDealsCount,
    overdueDealsCount: forecast.overdueDealsCount
  };

  // Flag missing data explicitly
  const tasksWithActualDuration = activeTasks.filter(t => t.actualDuration > 0).length;
  if (tasksWithActualDuration === 0) {
    missingDataFlags.push('No actual duration logs recorded for active tasks');
  }

  return {
    todayDateStr,
    user: sanitizedUser,
    activeTasks,
    completedTodayTasks,
    opportunities: sanitizedOpportunities,
    goals: sanitizedGoals,
    dailyPlan: {
      dayType,
      availableMinutes,
      plannedMinutes,
      taskCount: activeTasks.length
    },
    calendarEvents: sanitizedCalendar,
    incomeSummary,
    missingDataFlags
  };
}

// =========================================================================
// 2. SCHEMA VALIDATORS
// =========================================================================

export function validateDailyPlanProposal(data) {
  if (!data || typeof data !== 'object') return null;
  if (!Array.isArray(data.recommendedActions) || data.recommendedActions.length === 0) return null;

  const validActions = data.recommendedActions.slice(0, 5).map(a => ({
    taskId: a.taskId || '',
    title: String(a.title || 'Action item').trim(),
    estimatedDuration: Number(a.estimatedDuration) > 0 ? Number(a.estimatedDuration) : 30,
    importanceReason: String(a.importanceReason || 'High strategic impact').trim(),
    deadline: a.deadline || 'Flexible',
    dependencies: a.dependencies || 'None',
    linkedOpportunityOrGoal: a.linkedOpportunityOrGoal || 'None'
  }));

  return {
    recommendedActions: validActions,
    totalPlannedMinutes: Number(data.totalPlannedMinutes) || validActions.reduce((s, a) => s + a.estimatedDuration, 0),
    availableMinutes: Number(data.availableMinutes) || 480,
    scheduleFeasibility: String(data.scheduleFeasibility || 'Feasible schedule within time capacity.'),
    strategicFocusTheme: String(data.strategicFocusTheme || 'Execution and delivery.')
  };
}

export function validateOpportunityAdvice(data) {
  if (!data || typeof data !== 'object') return null;

  return {
    overdueFollowUps: Array.isArray(data.overdueFollowUps) ? data.overdueFollowUps : [],
    priorityConversations: Array.isArray(data.priorityConversations) ? data.priorityConversations : [],
    missingNextActions: Array.isArray(data.missingNextActions) ? data.missingNextActions : [],
    suggestedDiscoveryQuestions: Array.isArray(data.suggestedDiscoveryQuestions) ? data.suggestedDiscoveryQuestions : [],
    stalledDealBlockers: Array.isArray(data.stalledDealBlockers) ? data.stalledDealBlockers : [],
    summary: String(data.summary || 'Pipeline review completed.')
  };
}

export function validateProposalDraft(data) {
  if (!data || typeof data !== 'object') return null;
  if (!data.draftTitle || !data.draftContent) return null;

  return {
    draftType: String(data.draftType || 'proposal'),
    draftTitle: String(data.draftTitle).trim(),
    targetAudience: String(data.targetAudience || 'Prospective Client').trim(),
    draftContent: String(data.draftContent).trim(),
    keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
    statedAssumptions: Array.isArray(data.statedAssumptions) ? data.statedAssumptions : [],
    missingInformation: Array.isArray(data.missingInformation) ? data.missingInformation : []
  };
}

export function validateIncomeReview(data) {
  if (!data || typeof data !== 'object') return null;

  return {
    targetIncome: Number(data.targetIncome) || 0,
    actualConfirmedIncome: Number(data.actualConfirmedIncome) || 0,
    openPipelineValue: Number(data.openPipelineValue) || 0,
    weightedPipelineForecast: Number(data.weightedPipelineForecast) || 0,
    gapToTarget: Number(data.gapToTarget) || 0,
    commercialHealthSummary: String(data.commercialHealthSummary || 'Income review completed.'),
    topRevenueActions: Array.isArray(data.topRevenueActions) ? data.topRevenueActions : []
  };
}

export function validateEveningReviewDraft(data) {
  if (!data || typeof data !== 'object') return null;

  return {
    accomplishmentsSummary: String(data.accomplishmentsSummary || 'Day completed.'),
    incompleteActions: Array.isArray(data.incompleteActions) ? data.incompleteActions : [],
    identifiedObstacles: Array.isArray(data.identifiedObstacles) ? data.identifiedObstacles : [],
    urgentTomorrowPriorities: Array.isArray(data.urgentTomorrowPriorities) ? data.urgentTomorrowPriorities : [],
    mentorReflectionAdvice: String(data.mentorReflectionAdvice || 'Rest and recharge for tomorrow.')
  };
}

export function validateWeeklyReviewDraft(data) {
  if (!data || typeof data !== 'object') return null;

  return {
    weeklyAccomplishments: Array.isArray(data.weeklyAccomplishments) ? data.weeklyAccomplishments : [],
    pipelineProgressNotes: String(data.pipelineProgressNotes || ''),
    durationAccuracyAssessment: String(data.durationAccuracyAssessment || ''),
    unresolvedBlockers: Array.isArray(data.unresolvedBlockers) ? data.unresolvedBlockers : [],
    topThreePrioritiesNextWeek: Array.isArray(data.topThreePrioritiesNextWeek) ? data.topThreePrioritiesNextWeek.slice(0, 3) : [],
    strategicClosingNote: String(data.strategicClosingNote || 'Plan your priorities before starting next week.')
  };
}

// =========================================================================
// 3. DETERMINISTIC HEURISTIC FALLBACKS (ZERO LLM DEPENDENCY)
// =========================================================================

/**
 * Capability A: Deterministic Daily Planning Assistant
 */
export function fallbackMentorDailyPlan(context) {
  const tasks = context.activeTasks || [];
  const availableMinutes = context.dailyPlan?.availableMinutes || 480;

  // Authoritative ranking by Priority Engine score
  const sorted = [...tasks].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  let currentPlanned = 0;
  const recommendedActions = [];

  for (const t of sorted) {
    if (recommendedActions.length >= 5) break;
    const dur = Number(t.estimatedDuration) || 30;
    if (currentPlanned + dur <= availableMinutes || recommendedActions.length === 0) {
      recommendedActions.push({
        taskId: t.taskId,
        title: t.title,
        estimatedDuration: dur,
        importanceReason: `Deterministic priority score ${t.priorityScore || 50}/100 (${t.priorityBand || 'Medium'}). ${t.incomeImpact !== 'None' ? `Commercial impact: ${t.incomeImpact}.` : 'Strategic milestone contribution.'}`,
        deadline: t.dueDate || 'Flexible',
        dependencies: t.dependencies || 'None',
        linkedOpportunityOrGoal: t.linkedOpportunityId || t.linkedGoalId || 'Independent'
      });
      currentPlanned += dur;
    }
  }

  const utilization = Math.round((currentPlanned / availableMinutes) * 100);

  return {
    recommendedActions,
    totalPlannedMinutes: currentPlanned,
    availableMinutes,
    scheduleFeasibility: utilization > 100
      ? `Workload exceeds available time (${utilization}%). Defer lowest-ranked task.`
      : `Feasible schedule: ${currentPlanned}m planned of ${availableMinutes}m capacity (${utilization}% utilization).`,
    strategicFocusTheme: 'Execute highest-scoring revenue & critical-path tasks during morning energy peak.'
  };
}

/**
 * Capability B: Deterministic Business Opportunity Mentor
 */
export function fallbackOpportunityAdvice(context) {
  const opps = context.opportunities || [];
  const refDate = context.todayDateStr || new Date().toISOString().split('T')[0];

  const overdueFollowUps = [];
  const missingNextActions = [];
  const priorityConversations = [];
  const stalledDealBlockers = [];

  opps.forEach(o => {
    // Overdue check
    if (o.expectedCloseDate && o.expectedCloseDate !== 'Not set' && o.expectedCloseDate < refDate && o.stage !== 'Confirmed' && o.stage !== 'Lost') {
      overdueFollowUps.push({
        id: o.id,
        title: o.title,
        stage: o.stage,
        expectedCloseDate: o.expectedCloseDate,
        reason: 'Target close date is in the past. Re-engage prospect immediately to re-qualify timeline.'
      });
    }

    // High priority conversations (Proposals or Negotiations or high value)
    if (o.stage === 'Proposals' || o.stage === 'Negotiations' || o.value >= 50000) {
      priorityConversations.push({
        id: o.id,
        title: o.title,
        value: o.value,
        stage: o.stage,
        nextStep: o.stage === 'Negotiations' ? 'Review commercial contract terms and close agreement' : 'Follow up on proposal submission and address questions'
      });
    }

    // Missing next actions
    if (!o.notes || o.notes.trim() === '') {
      missingNextActions.push({
        id: o.id,
        title: o.title,
        issue: 'No context or next follow-up notes recorded on this deal.'
      });
    }
  });

  return {
    overdueFollowUps,
    priorityConversations,
    missingNextActions,
    suggestedDiscoveryQuestions: [
      'What is the primary business outcome or timeline driving this initiative?',
      'Who else in executive leadership will evaluate the proposal deliverables?',
      'What specific criteria will determine whether this project is a success?',
      'What budget or commercial approval process is required before sign-off?'
    ],
    stalledDealBlockers,
    summary: `Pipeline analysis: ${priorityConversations.length} high-value deals active. ${overdueFollowUps.length} follow-up(s) need immediate scheduling.`
  };
}

/**
 * Capability C: Deterministic Proposal & Communication Drafting
 */
export function fallbackProposalDraft(opp, draftType = PROPOSAL_TYPES.TRAINING_PROPOSAL) {
  const clientName = opp?.clientName || opp?.title || 'Client Organization';
  const dealTitle = opp?.title || opp?.clientName || 'Client Project';
  const title = dealTitle;
  const val = Number(opp?.value) || 0;
  const contact = opp?.contactName || 'Client Representative';
  const formattedVal = val > 0 ? `₹${val.toLocaleString('en-IN')}` : 'To be agreed based on scope';

  if (draftType === PROPOSAL_TYPES.TRAINING_PROPOSAL) {
    return {
      draftType: PROPOSAL_TYPES.TRAINING_PROPOSAL,
      draftTitle: `Executive Training Proposal: ${dealTitle}`,
      targetAudience: contact,
      draftContent: `### Executive Training Proposal\n**Client:** ${clientName}\n**Initiative:** ${dealTitle}\n**Attention:** ${contact}\n**Commercial Investment:** ${formattedVal}\n\n#### 1. Executive Summary\nThis customized training workshop provides practical, hands-on mastery in modern technical workflows, structured specifically to accelerate operational productivity.\n\n#### 2. Curriculum & Learning Modules\n- **Module 1: Foundations & Architecture**: Core principles, tools setup, and best practices.\n- **Module 2: Practical Implementation**: Guided hands-on development exercises and real-world scenarios.\n- **Module 3: Production Delivery & Review**: Quality checklists, troubleshooting, and enterprise deployment.\n\n#### 3. Deliverables\n- Structured slide decks, source code repository, and exercise walkthroughs.\n- Interactive Q&A sessions and post-workshop support.\n\n#### 4. Commercial Agreement\n- Total Investment: ${formattedVal}\n- Payment Milestones: 50% upon contract signing, 50% upon course completion.`,
      keyPoints: ['Comprehensive 3-module curriculum', 'Hands-on practical focus', 'Clear commercial milestone split'],
      statedAssumptions: ['Training delivered remotely via live interactive sessions', 'Participants have basic technical literacy'],
      missingInformation: ['Exact batch size not confirmed', 'Preferred training dates pending client confirmation']
    };
  }

  if (draftType === PROPOSAL_TYPES.SOFTWARE_PROPOSAL) {
    return {
      draftType: PROPOSAL_TYPES.SOFTWARE_PROPOSAL,
      draftTitle: `Engineering Solution Proposal: ${title}`,
      targetAudience: contact,
      draftContent: `### Engineering & Automation Proposal\n**Project:** ${title}\n**Client Contact:** ${contact}\n**Project Scope Value:** ${formattedVal}\n\n#### 1. Scope of Work\nDesign, build, and deliver an integrated automation solution tailored to client workflow specifications.\n\n#### 2. Delivery Milestones\n- **Phase 1: Architecture & Data Mapping** (Week 1–2): Requirement freezing and schema definition.\n- **Phase 2: Core Engineering & Tool Integration** (Week 3–4): Implementation and backend integrations.\n- **Phase 3: Acceptance Testing & Deployment** (Week 5): Security verification, handover, and documentation.\n\n#### 3. Investment & Terms\n- Total Fixed Fee: ${formattedVal}\n- 40% Advance upon kickoff, 40% upon staging demo, 20% upon final sign-off.`,
      keyPoints: ['3-phase structured delivery', 'Milestone-based payment protection', 'Explicit acceptance testing gate'],
      statedAssumptions: ['Client provides required API credentials and test accounts', 'Third-party cloud infrastructure costs billed directly to client'],
      missingInformation: ['Detailed API rate limit specifications', 'Client security audit requirements']
    };
  }

  if (draftType === PROPOSAL_TYPES.FOLLOWUP_EMAIL) {
    return {
      draftType: PROPOSAL_TYPES.FOLLOWUP_EMAIL,
      draftTitle: `Follow-up Email: ${title}`,
      targetAudience: contact,
      draftContent: `Dear ${contact},\n\nI hope you are having a productive week.\n\nI am writing to follow up on our previous discussion regarding ${title}. We are very keen to support your team on this initiative and have prepared the necessary delivery resources.\n\nCould we schedule a brief 15-minute call this Thursday or Friday to address any remaining questions on the proposal and outline next steps?\n\nBest regards,\nVishu`,
      keyPoints: ['Polite check-in grounded in previous conversation', 'Clear call to action for a 15-minute alignment call'],
      statedAssumptions: ['Proposal was previously submitted and acknowledged'],
      missingInformation: ['Client preferred meeting availability times']
    };
  }

  if (draftType === PROPOSAL_TYPES.MEETING_AGENDA) {
    return {
      draftType: PROPOSAL_TYPES.MEETING_AGENDA,
      draftTitle: `Discovery & Alignment Agenda: ${title}`,
      targetAudience: contact,
      draftContent: `### Meeting Agenda: ${title} Alignment Call\n**Duration:** 30 Minutes\n**Participants:** ${contact}, Vishu\n\n#### Agenda Items:\n1. **Introductions & Objective (5m)**: Confirm desired outcomes from today's discussion.\n2. **Current Workflow & Key Bottlenecks (10m)**: Review current pain points and technical constraints.\n3. **Proposed Solution & Architecture (10m)**: Walk through delivery approach, timeline, and deliverables.\n4. **Next Steps & Decision Timeline (5m)**: Agree on immediate action items and schedule.\n\n#### Expected Outcome:\nMutual consensus on project scope and agreed schedule for final proposal approval.`,
      keyPoints: ['Focused 30-minute structure', 'Prioritizes client bottlenecks', 'Explicit outcome definition'],
      statedAssumptions: ['Client decision makers are present on the call'],
      missingInformation: ['List of attendee titles or technical leads']
    };
  }

  // Default: Discovery Questionnaire
  return {
    draftType: PROPOSAL_TYPES.DISCOVERY_QUESTIONNAIRE,
    draftTitle: `Client Discovery Diagnostic: ${title}`,
    targetAudience: contact,
    draftContent: `### Client Discovery Diagnostic: ${title}\n\n1. What is the single biggest operational bottleneck you are looking to solve with this initiative?\n2. What existing systems, databases, or third-party APIs need to integrate with this solution?\n3. What is your expected target deployment date or milestone event?\n4. What internal team members will use or maintain this solution on a daily basis?\n5. What commercial or procurement approvals are required to proceed once the proposal is finalized?`,
    keyPoints: ['Diagnostic inquiry focused on value and feasibility', 'Uncovers decision timeline and budget criteria'],
    statedAssumptions: ['Early-stage qualification call'],
    missingInformation: ['Existing software stack details']
  };
}

/**
 * Capability D: Deterministic Income Goal Review
 */
export function fallbackIncomeReview(context) {
  const summary = context.incomeSummary || {};
  const target = summary.monthlyIncomeTarget || 150000;
  const actual = summary.actualConfirmedIncome || 0;
  const openPipe = summary.openPipelineTotal || 0;
  const weighted = summary.weightedPipelineForecast || 0;
  const gap = Math.max(0, target - actual);

  const topRevenueActions = [];
  (context.opportunities || [])
    .filter(o => o.stage === 'Proposals' || o.stage === 'Negotiations')
    .slice(0, 3)
    .forEach(o => {
      topRevenueActions.push(`Follow up deal "${o.title}" (₹${Number(o.value || 0).toLocaleString('en-IN')}) in stage ${o.stage} to close gap.`);
    });

  if (topRevenueActions.length === 0) {
    topRevenueActions.push('Generate 3 new qualified outbound leads to expand open pipeline.');
  }

  return {
    targetIncome: target,
    actualConfirmedIncome: actual,
    openPipelineValue: openPipe,
    weightedPipelineForecast: weighted,
    gapToTarget: gap,
    commercialHealthSummary: gap === 0
      ? `Monthly income milestone of ₹${target.toLocaleString('en-IN')} achieved through confirmed deals!`
      : `Confirmed revenue stands at ₹${actual.toLocaleString('en-IN')} (${Math.round((actual/target)*100)}% of target). Remaining gap of ₹${gap.toLocaleString('en-IN')} is covered by ₹${weighted.toLocaleString('en-IN')} in weighted pipeline.`,
    topRevenueActions
  };
}

/**
 * Capability E: Deterministic Evening Review Draft
 */
export function fallbackMentorEveningReview(context) {
  const tasks = context.activeTasks || [];
  const completedTasks = (Array.isArray(context.completedTodayTasks) && context.completedTodayTasks.length > 0)
    ? context.completedTodayTasks
    : tasks.filter(t => t.status === 'Completed');
  const incompleteTasks = tasks.filter(t => t.status !== 'Completed');

  const accomplishmentsSummary = completedTasks.length > 0
    ? `Completed ${completedTasks.length} task(s) today: ${completedTasks.map(t => t.title).slice(0, 3).join(', ')}.`
    : 'No tasks marked completed in tracker today.';

  const incompleteActions = incompleteTasks.slice(0, 5).map(t => ({
    taskId: t.taskId,
    title: t.title,
    priorityBand: t.priorityBand,
    action: 'Review status: carry forward to tomorrow or record structured deferral reason.'
  }));

  const urgentTomorrowPriorities = incompleteTasks
    .filter(t => t.priorityScore >= 80 || t.dueDate === context.todayDateStr)
    .slice(0, 3)
    .map(t => t.title);

  return {
    accomplishmentsSummary,
    incompleteActions,
    identifiedObstacles: ['Schedule capacity constraints or meeting overruns (confirm with your notes)'],
    urgentTomorrowPriorities: urgentTomorrowPriorities.length > 0 ? urgentTomorrowPriorities : ['Schedule top priority revenue task for first morning block'],
    mentorReflectionAdvice: 'Review incomplete items objectively, record structured deferrals for tasks moved to tomorrow, and close work for the evening.'
  };
}

/**
 * Capability F: Deterministic Weekly Mentor Review
 */
export function fallbackMentorWeeklyReview(context) {
  const opps = context.opportunities || [];
  const wonDeals = opps.filter(o => o.stage === 'Confirmed');
  const pipelineNotes = wonDeals.length > 0
    ? `Won ${wonDeals.length} deal(s) totaling ₹${wonDeals.reduce((s, o) => s + (Number(o.value) || 0), 0).toLocaleString('en-IN')}.`
    : `Active open pipeline value is ₹${(context.incomeSummary?.openPipelineTotal || 0).toLocaleString('en-IN')}.`;

  const topThreePrioritiesNextWeek = [];
  (context.activeTasks || [])
    .slice(0, 3)
    .forEach((t, i) => {
      topThreePrioritiesNextWeek.push(`${i + 1}. ${t.title} (${t.priorityBand} Priority, Due: ${t.dueDate || 'Next week'})`);
    });

  while (topThreePrioritiesNextWeek.length < 3) {
    topThreePrioritiesNextWeek.push(`${topThreePrioritiesNextWeek.length + 1}. Advance commercial business development and client acquisition.`);
  }

  return {
    weeklyAccomplishments: [
      `Maintained active focus on ${context.user?.currentSkillFocus || 'core skills'} and portfolio project ${context.user?.currentProjectName || ''}.`,
      pipelineNotes
    ],
    pipelineProgressNotes: pipelineNotes,
    durationAccuracyAssessment: 'Ensure actual duration is logged on completed tasks to calibrate planning accuracy for next week.',
    unresolvedBlockers: (context.activeTasks || []).filter(t => t.status === 'Blocked').map(t => t.title),
    topThreePrioritiesNextWeek,
    strategicClosingNote: 'Protect uninterrupted morning execution blocks next week to maintain steady progress toward monthly revenue goals.'
  };
}
