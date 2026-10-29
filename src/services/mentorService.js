/**
 * Provider-Agnostic Personal AI Business Mentor Service (Phase 10)
 * for RoutineTargetCompletion
 *
 * Implements:
 * - Server-side Gemini 2.5 Flash gateway via Google Apps Script (zero client credentials)
 * - Controlled Context Builder with sensitive data redaction & missing-data labeling
 * - Strict JSON Schema validation on untrusted LLM outputs
 * - Deterministic, rule-based fallback for all 6 mentor capabilities (100% operational offline)
 * - Zero revenue conflation guarantee: Confirmed revenue is never mixed with pipeline forecasts
 */

import api from './api.js';
import {
  PROPOSAL_TYPES,
  buildMentorContext,
  wrapUntrusted,
  validateDailyPlanProposal,
  validateOpportunityAdvice,
  validateProposalDraft,
  validateIncomeReview,
  validateEveningReviewDraft,
  validateWeeklyReviewDraft,
  fallbackMentorDailyPlan,
  fallbackOpportunityAdvice,
  fallbackProposalDraft,
  fallbackIncomeReview,
  fallbackMentorEveningReview,
  fallbackMentorWeeklyReview
} from '../utils/mentorEngine.js';

const isSheetsEnabled = typeof import.meta !== 'undefined' && !!import.meta?.env?.VITE_API_URL;

export const mentorService = {
  PROPOSAL_TYPES,

  /**
   * Capability A: Daily Planning Assistant
   * Proposes top 5 feasible actions ranked authoritatively by deterministic Priority Engine
   */
  getDailyPlanProposal: async (userId, rawContext) => {
    const context = buildMentorContext(rawContext);

    if (isSheetsEnabled && userId) {
      try {
        const prompt = `You are a Personal AI Executive Business Mentor.
Review the user's active tasks and calendar capacity for today (${context.todayDateStr}).
Generate a realistic, focused daily plan containing the top feasible actions (maximum 5).
Authoritative ranking baseline is the deterministic Priority Engine scores (${JSON.stringify(context.activeTasks.map(t => ({ id: t.taskId, title: t.title, score: t.priorityScore, band: t.priorityBand, est: t.estimatedDuration })))}).
Do not exceed available capacity (${context.dailyPlan.availableMinutes} minutes).

User Profile: ${JSON.stringify(context.user)}
Scheduled Meetings: ${JSON.stringify(context.calendarEvents)}
Missing Data Flags: ${JSON.stringify(context.missingDataFlags)}

Respond ONLY with valid JSON matching this schema:
{
  "recommendedActions": [
    {
      "taskId": "String",
      "title": "String",
      "estimatedDuration": 45,
      "importanceReason": "String",
      "deadline": "String",
      "dependencies": "String",
      "linkedOpportunityOrGoal": "String"
    }
  ],
  "totalPlannedMinutes": 240,
  "availableMinutes": ${context.dailyPlan.availableMinutes},
  "scheduleFeasibility": "String",
  "strategicFocusTheme": "String"
}`;

        const res = await api.post('', {
          action: 'aiGenerate',
          userId,
          operation: 'mentorDailyPlan',
          prompt
        });

        if (res.data?.success && res.data.data) {
          const validated = validateDailyPlanProposal(res.data.data);
          if (validated) {
            return { success: true, isAi: true, data: validated, context };
          }
        }
      } catch (err) {
        console.warn('Mentor gateway getDailyPlanProposal fallback:', err.message);
      }
    }

    // Deterministic Heuristic Fallback
    const fallback = fallbackMentorDailyPlan(context);
    return { success: true, isAi: false, isFallback: true, data: fallback, context };
  },

  /**
   * Capability B: Business Opportunity Mentor
   * Diagnoses pipeline health, overdue follow-ups, and discovery questions
   */
  getOpportunityAdvice: async (userId, rawContext) => {
    const context = buildMentorContext(rawContext);

    if (isSheetsEnabled && userId) {
      try {
        const prompt = `You are a Commercial Sales & Business Development Mentor.
Analyze this opportunity pipeline and provide actionable guidance.
Strict Zero-Conflation Rule: Never present open or weighted pipeline values as confirmed revenue.

Pipeline Context:
Opportunities: ${wrapUntrusted(JSON.stringify(context.opportunities))}
Revenue Health: ${JSON.stringify(context.incomeSummary)}
Missing Data: ${JSON.stringify(context.missingDataFlags)}

Respond ONLY with valid JSON matching this schema:
{
  "overdueFollowUps": [
    { "id": "String", "title": "String", "stage": "String", "expectedCloseDate": "String", "reason": "String" }
  ],
  "priorityConversations": [
    { "id": "String", "title": "String", "value": 50000, "stage": "String", "nextStep": "String" }
  ],
  "missingNextActions": [
    { "id": "String", "title": "String", "issue": "String" }
  ],
  "suggestedDiscoveryQuestions": ["String"],
  "stalledDealBlockers": ["String"],
  "summary": "String"
}`;

        const res = await api.post('', {
          action: 'aiGenerate',
          userId,
          operation: 'mentorOpportunityAdvice',
          prompt
        });

        if (res.data?.success && res.data.data) {
          const validated = validateOpportunityAdvice(res.data.data);
          if (validated) {
            return { success: true, isAi: true, data: validated, context };
          }
        }
      } catch (err) {
        console.warn('Mentor gateway getOpportunityAdvice fallback:', err.message);
      }
    }

    const fallback = fallbackOpportunityAdvice(context);
    return { success: true, isAi: false, isFallback: true, data: fallback, context };
  },

  /**
   * Capability C: Proposal & Communication Drafting
   * Drafts proposals, follow-up messages, meeting agendas, and discovery diagnostics
   */
  draftProposalOrComms: async (userId, opportunity, draftType = PROPOSAL_TYPES.TRAINING_PROPOSAL) => {
    if (!opportunity) return null;

    if (isSheetsEnabled && userId) {
      try {
        const prompt = `You are an Executive Business Proposal & Communications Specialist.
Draft a professional, ready-to-edit communication draft for this opportunity.
Draft Type: "${draftType}" (Options: training_proposal, software_proposal, followup_email, meeting_agenda, discovery_questionnaire).
Do not fabricate information. Clearly list any assumptions made and missing information needed from the client.

Opportunity Details:
${wrapUntrusted(JSON.stringify({
  title: opportunity.title || opportunity.clientName,
  contactName: opportunity.contactName || '',
  stage: opportunity.stage,
  value: opportunity.value || 0,
  expectedCloseDate: opportunity.expectedCloseDate || '',
  notes: opportunity.notes || ''
}))}

Respond ONLY with valid JSON matching this schema:
{
  "draftType": "${draftType}",
  "draftTitle": "String",
  "targetAudience": "String",
  "draftContent": "String (Markdown formatted draft)",
  "keyPoints": ["String"],
  "statedAssumptions": ["String"],
  "missingInformation": ["String"]
}`;

        const res = await api.post('', {
          action: 'aiGenerate',
          userId,
          operation: 'mentorDraftComms',
          prompt
        });

        if (res.data?.success && res.data.data) {
          const validated = validateProposalDraft(res.data.data);
          if (validated) {
            return { success: true, isAi: true, data: validated };
          }
        }
      } catch (err) {
        console.warn('Mentor gateway draftProposalOrComms fallback:', err.message);
      }
    }

    const fallback = fallbackProposalDraft(opportunity, draftType);
    return { success: true, isAi: false, isFallback: true, data: fallback };
  },

  /**
   * Capability D: Income Goal Review
   * Factual progress summary distinguishing confirmed revenue from open and weighted pipeline
   */
  getIncomeGoalReview: async (userId, rawContext) => {
    const context = buildMentorContext(rawContext);

    if (isSheetsEnabled && userId) {
      try {
        const prompt = `You are an Executive Financial & Commercial Strategy Mentor.
Review progress against monthly revenue targets based strictly on verified records.
Strict Rule: Confirmed revenue, pending payments, open pipeline value, and weighted pipeline forecast must be kept strictly separate.

Context:
Income Summary: ${JSON.stringify(context.incomeSummary)}
Opportunities: ${JSON.stringify(context.opportunities)}
Active Revenue Tasks: ${JSON.stringify(context.activeTasks.filter(t => t.incomeImpact !== 'None'))}

Respond ONLY with valid JSON matching this schema:
{
  "targetIncome": ${context.incomeSummary.monthlyIncomeTarget},
  "actualConfirmedIncome": ${context.incomeSummary.actualConfirmedIncome},
  "openPipelineValue": ${context.incomeSummary.openPipelineTotal},
  "weightedPipelineForecast": ${context.incomeSummary.weightedPipelineForecast},
  "gapToTarget": ${Math.max(0, context.incomeSummary.monthlyIncomeTarget - context.incomeSummary.actualConfirmedIncome)},
  "commercialHealthSummary": "String",
  "topRevenueActions": ["String"]
}`;

        const res = await api.post('', {
          action: 'aiGenerate',
          userId,
          operation: 'mentorIncomeReview',
          prompt
        });

        if (res.data?.success && res.data.data) {
          const validated = validateIncomeReview(res.data.data);
          if (validated) {
            return { success: true, isAi: true, data: validated, context };
          }
        }
      } catch (err) {
        console.warn('Mentor gateway getIncomeGoalReview fallback:', err.message);
      }
    }

    const fallback = fallbackIncomeReview(context);
    return { success: true, isAi: false, isFallback: true, data: fallback, context };
  },

  /**
   * Capability E: Evening Review Preparation
   * Factual reflection on daily execution, obstacles, and tomorrow's priorities
   */
  getEveningReviewAdvice: async (userId, rawContext) => {
    const context = buildMentorContext(rawContext);

    if (isSheetsEnabled && userId) {
      try {
        const prompt = `You are a Reflective Executive Performance Coach.
Prepare an evening review reflection for today (${context.todayDateStr}).
Ground reflections strictly in recorded task statuses. If reasons for incomplete tasks are not recorded, prompt the user for input rather than inventing explanations.

Tasks Context: ${JSON.stringify(context.activeTasks)}
Missing Data: ${JSON.stringify(context.missingDataFlags)}

Respond ONLY with valid JSON matching this schema:
{
  "accomplishmentsSummary": "String",
  "incompleteActions": [
    { "taskId": "String", "title": "String", "priorityBand": "String", "action": "String" }
  ],
  "identifiedObstacles": ["String"],
  "urgentTomorrowPriorities": ["String"],
  "mentorReflectionAdvice": "String"
}`;

        const res = await api.post('', {
          action: 'aiGenerate',
          userId,
          operation: 'mentorEveningReview',
          prompt
        });

        if (res.data?.success && res.data.data) {
          const validated = validateEveningReviewDraft(res.data.data);
          if (validated) {
            return { success: true, isAi: true, data: validated, context };
          }
        }
      } catch (err) {
        console.warn('Mentor gateway getEveningReviewAdvice fallback:', err.message);
      }
    }

    const fallback = fallbackMentorEveningReview(context);
    return { success: true, isAi: false, isFallback: true, data: fallback, context };
  },

  /**
   * Capability F: Weekly Mentor Review
   * Synthesizes weekly progress, pipeline progression, and top 3 priorities for next week
   */
  getWeeklyReviewAdvice: async (userId, rawContext) => {
    const context = buildMentorContext(rawContext);

    if (isSheetsEnabled && userId) {
      try {
        const prompt = `You are a Senior Strategic Business Mentor.
Synthesize the weekly performance review based strictly on actual saved records.
Do not claim to measure unrecorded activities. Propose top 3 actionable priorities for next week.

Context:
Weekly Workload & Plan: ${JSON.stringify(context.dailyPlan)}
Tasks: ${JSON.stringify(context.activeTasks)}
Opportunities: ${JSON.stringify(context.opportunities)}
Income: ${JSON.stringify(context.incomeSummary)}

Respond ONLY with valid JSON matching this schema:
{
  "weeklyAccomplishments": ["String"],
  "pipelineProgressNotes": "String",
  "durationAccuracyAssessment": "String",
  "unresolvedBlockers": ["String"],
  "topThreePrioritiesNextWeek": ["String", "String", "String"],
  "strategicClosingNote": "String"
}`;

        const res = await api.post('', {
          action: 'aiGenerate',
          userId,
          operation: 'mentorWeeklyReview',
          prompt
        });

        if (res.data?.success && res.data.data) {
          const validated = validateWeeklyReviewDraft(res.data.data);
          if (validated) {
            return { success: true, isAi: true, data: validated, context };
          }
        }
      } catch (err) {
        console.warn('Mentor gateway getWeeklyReviewAdvice fallback:', err.message);
      }
    }

    const fallback = fallbackMentorWeeklyReview(context);
    return { success: true, isAi: false, isFallback: true, data: fallback, context };
  }
};

