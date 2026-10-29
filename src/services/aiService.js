/**
 * Provider-Agnostic AI Service Interface
 * for RoutineTargetCompletion
 *
 * Capabilities:
 * - Server-side Gemini 2.5 Flash gateway via Google Apps Script (zero browser keys)
 * - Strict schema validation on untrusted LLM outputs
 * - Deterministic, rule-based fallback when offline or when no API key is configured
 * - Data minimization and sensitive context redaction
 */

import api from './api.js';
import {
  sanitizeContext,
  wrapUntrusted,
  validateTaskBreakdownResponse,
  validatePriorityExplanationResponse,
  validatePlanningAdviceResponse,
  validateReviewInsightsResponse,
  fallbackTaskBreakdown,
  fallbackPriorityExplanation,
  fallbackPlanningAdvice,
  fallbackReviewInsights
} from '../utils/aiPromptBuilders.js';

const isSheetsEnabled = typeof import.meta !== 'undefined' && !!import.meta?.env?.VITE_API_URL;

export const aiService = {
  /**
   * Explains why a task received its deterministic priority score
   */
  explainTaskPriority: async (userId, task, allTasks = [], goals = []) => {
    if (!task) return null;

    // Check if remote AI generation is possible
    if (isSheetsEnabled && userId) {
      try {
        const sanitized = sanitizeContext({ tasks: [task], goals });
        const prompt = `You are a Personal AI Productivity Assistant.
Explain why this task received its deterministic Priority Score (${task.priorityScore || 50}/100, Band: ${task.priorityBand || 'Medium'}).
The deterministic score formula is authoritative and must not be altered:
Score = 0.30*Urgency + 0.25*GoalAlignment + 0.20*IncomeImpact + 0.15*Dependency + 0.10*Readiness.

Task Details:
${wrapUntrusted(JSON.stringify(sanitized.tasks[0]))}

Linked Goals:
${JSON.stringify(sanitized.goals)}

Respond ONLY with valid JSON matching this schema:
{
  "summary": "String",
  "dominantFactors": [{ "factor": "String", "impact": "String" }],
  "comparisonWithTopRanked": "String",
  "goalImpact": "String"
}`;

        const res = await api.post('', {
          action: 'aiGenerate',
          userId,
          operation: 'explainPriority',
          prompt
        });

        if (res.data?.success && res.data.data) {
          const validated = validatePriorityExplanationResponse(res.data.data);
          if (validated) {
            return { success: true, isAi: true, data: validated };
          }
        }
      } catch (err) {
        console.warn('AI gateway explainPriority fallback:', err.message);
      }
    }

    // Deterministic fallback
    const fallback = fallbackPriorityExplanation(task);
    return { success: true, isAi: false, isFallback: true, data: fallback };
  },

  /**
   * Generates actionable subtask breakdown for a selected task
   */
  breakdownTask: async (userId, task) => {
    if (!task) return null;

    if (isSheetsEnabled && userId) {
      try {
        const prompt = `You are an expert Productivity Engineer.
Break down this complex task into 3 to 5 concrete, actionable, non-overlapping subtasks.
Each subtask should take between 15 and 90 minutes. Do not propose redundant tasks.

Parent Task:
${wrapUntrusted(JSON.stringify({
  title: task.title,
  description: task.description || '',
  category: task.category || 'General',
  projectArea: task.projectArea || ''
}))}

Respond ONLY with valid JSON matching this schema:
{
  "subtasks": [
    {
      "title": "String (specific physical next step)",
      "description": "String",
      "nextAction": "String",
      "estimatedDuration": 45,
      "category": "${task.category || 'General'}",
      "dependencies": "String"
    }
  ],
  "reasoning": "String"
}`;

        const res = await api.post('', {
          action: 'aiGenerate',
          userId,
          operation: 'taskBreakdown',
          prompt
        });

        if (res.data?.success && res.data.data) {
          const validated = validateTaskBreakdownResponse(res.data.data);
          if (validated) {
            return { success: true, isAi: true, data: validated };
          }
        }
      } catch (err) {
        console.warn('AI gateway taskBreakdown fallback:', err.message);
      }
    }

    // Deterministic fallback
    const fallback = fallbackTaskBreakdown(task);
    return { success: true, isAi: false, isFallback: true, data: fallback };
  },

  /**
   * Answers planning advice questions (capacity feasibility, what to focus on)
   */
  askPlanningAdvice: async (userId, question, context = {}) => {
    const sanitized = sanitizeContext(context);

    if (isSheetsEnabled && userId) {
      try {
        const prompt = `You are an AI Personal Daily Planner.
Answer this planning question concisely based strictly on the user's actual tasks, daily plan, and commitments:
Question: "${question}"

Current Context:
Daily Plan: ${JSON.stringify(sanitized.dailyPlan || {})}
Focus Tasks: ${JSON.stringify(sanitized.tasks || [])}
Google Calendar Meetings: ${JSON.stringify(sanitized.calendarEvents || [])}

Respond ONLY with valid JSON matching this schema:
{
  "recommendation": "String",
  "capacityAnalysis": "String",
  "recommendedDeferrals": ["String"],
  "keyRisks": ["String"]
}`;

        const res = await api.post('', {
          action: 'aiGenerate',
          userId,
          operation: 'planningAdvice',
          prompt
        });

        if (res.data?.success && res.data.data) {
          const validated = validatePlanningAdviceResponse(res.data.data);
          if (validated) {
            return { success: true, isAi: true, data: validated };
          }
        }
      } catch (err) {
        console.warn('AI gateway askPlanningAdvice fallback:', err.message);
      }
    }

    // Deterministic fallback
    const fallback = fallbackPlanningAdvice(context);
    return { success: true, isAi: false, isFallback: true, data: fallback };
  },

  /**
   * Generates review synthesis and strategic lessons from review metrics
   */
  generateReviewInsights: async (userId, weeklyMetrics = {}) => {
    if (isSheetsEnabled && userId) {
      try {
        const prompt = `You are an Executive Review Analyst.
Generate high-level, objective progress insights based strictly on this week's verified metrics:
${JSON.stringify({
  completionRate: weeklyMetrics.completionRate,
  tasksPlanned: weeklyMetrics.tasksPlannedCount,
  tasksCompleted: weeklyMetrics.tasksCompletedCount,
  overdueCount: weeklyMetrics.overdueCount,
  deferredCount: weeklyMetrics.deferredCount,
  estimationVariance: weeklyMetrics.estimationVariancePercent,
  deferralReasons: weeklyMetrics.deferralReasonsSummary
})}

Respond ONLY with valid JSON matching this schema:
{
  "observedTrends": ["String"],
  "estimationLessons": "String",
  "blockerHighlights": "String",
  "strategicRecommendations": ["String"]
}`;

        const res = await api.post('', {
          action: 'aiGenerate',
          userId,
          operation: 'reviewInsights',
          prompt
        });

        if (res.data?.success && res.data.data) {
          const validated = validateReviewInsightsResponse(res.data.data);
          if (validated) {
            return { success: true, isAi: true, data: validated };
          }
        }
      } catch (err) {
        console.warn('AI gateway reviewInsights fallback:', err.message);
      }
    }

    const fallback = fallbackReviewInsights(weeklyMetrics);
    return { success: true, isAi: false, isFallback: true, data: fallback };
  },

  /**
   * Conversational Assistant chat grounded in user context
   */
  chatWithAssistant: async (userId, userMessage, conversationHistory = [], context = {}) => {
    const sanitized = sanitizeContext(context);

    if (isSheetsEnabled && userId) {
      try {
        const historyText = conversationHistory.slice(-4).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
        const prompt = `You are Antigravity Personal Productivity Assistant.
You are helping the user manage their daily Big 5, task priorities, routines, and strategic goals.

Context:
- Today's Date & Plan: ${JSON.stringify(sanitized.dailyPlan || {})}
- Active Focus Tasks: ${JSON.stringify(sanitized.tasks ? sanitized.tasks.slice(0, 5) : [])}
- Active Goals: ${JSON.stringify(sanitized.goals || [])}

Recent Conversation:
${historyText}

User Query:
${wrapUntrusted(userMessage)}

Provide a direct, helpful, and concise response. Do not hallucinate commitments or numbers outside the context.
If proposing an action (like breaking down a task or deferring), state the proposed action clearly.
Respond with JSON:
{
  "reply": "String",
  "suggestedAction": "String (optional action like 'breakdown_task' or 'defer_task' or empty)",
  "actionPayload": {}
}`;

        const res = await api.post('', {
          action: 'aiGenerate',
          userId,
          operation: 'chat',
          prompt
        });

        if (res.data?.success && res.data.data) {
          return {
            success: true,
            isAi: true,
            reply: res.data.data.reply || 'Here is your productivity recommendation.',
            suggestedAction: res.data.data.suggestedAction || null,
            actionPayload: res.data.data.actionPayload || null
          };
        }
      } catch (err) {
        console.warn('AI gateway chat fallback:', err.message);
      }
    }

    // Deterministic Chat Fallback
    const q = userMessage.toLowerCase();
    let reply = "I am your Personal Productivity Assistant. All your priority scores are calculated deterministically using the 5-factor mathematical formula.";
    if (q.includes('focus') || q.includes('big 5') || q.includes('today')) {
      const topCount = sanitized.tasks?.length || 0;
      reply = `You have ${topCount} candidate focus task(s) queued for today. Focus on Task #1 and #2 during your uninterrupted morning sprint to build momentum.`;
    } else if (q.includes('defer') || q.includes('capacity') || q.includes('time')) {
      reply = "If your schedule fills up or a meeting runs over, defer your lowest-scoring or Flexible deadline tasks to tomorrow so your highest-value goals remain protected.";
    } else if (q.includes('breakdown') || q.includes('subtask')) {
      reply = "To break down a complex task, click the '⚡ Breakdown' button next to any task card to generate 3 actionable subtasks.";
    }

    return {
      success: true,
      isAi: false,
      isFallback: true,
      reply,
      suggestedAction: null,
      actionPayload: null
    };
  }
};
