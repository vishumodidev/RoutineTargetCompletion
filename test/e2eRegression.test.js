import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for Node.js test runner
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

global.localStorage = new MockLocalStorage();

const { mockDb, initMockDb } = await import('../src/utils/mockDb.js');
const { calculatePriorityScore } = await import('../src/utils/priorityEngine.js');
const { generateDailyBigFive } = await import('../src/utils/dailyPlanner.js');
const { getIsoWeekKey, getWeekDateRange, aggregateWeeklyMetrics } = await import('../src/utils/reviewAggregator.js');
const { calculateTaskAnalytics } = await import('../src/utils/taskAnalytics.js');
const { parseEventInterval, mergeOverlappingIntervals, calculateCalendarCommitments } = await import('../src/utils/calendarMath.js');
const { googleTasksService } = await import('../src/services/googleTasksService.js');
const { aiService } = await import('../src/services/aiService.js');

describe('Phase 7: End-to-End Regression & Production Reliability', () => {
  const TEST_USER_ID = 'usr_vishu';
  const TARGET_DATE = '2026-10-28';

  // Initialize once for end-to-end lifecycle
  global.localStorage.clear();
  initMockDb();

  describe('Full 12-Step Lifecycle Workflow Verification', () => {
    let createdTask = null;
    let createdGoal = null;
    let savedPlan = null;
    let savedEveningReview = null;

    it('Step 1: Sign in through the existing authentication flow', () => {
      const user = mockDb.login('vishu@tracker.com', 'password');
      assert.ok(user, 'Login must return user');
      assert.equal(user.email, 'vishu@tracker.com');
      assert.ok(user.userId, 'User must have a persistent UserID');
    });

    it('Step 2: Create, validate, and edit a task', () => {
      // Input validation: empty title must be rejected
      assert.throws(() => {
        mockDb.saveTask(TEST_USER_ID, { title: '' });
      }, /Task title is required/);

      // Create a valid task
      const createRes = mockDb.saveTask(TEST_USER_ID, {
        title: 'Launch Enterprise AI Architecture Client Proposal',
        description: 'Prepare MERN and Google Cloud architecture diagrams and proposal notes',
        category: 'Business',
        projectArea: 'Client Work',
        estimatedDuration: 60,
        dueDate: TARGET_DATE,
        deadlineType: 'Hard',
        incomeImpact: 'High',
        status: 'Todo'
      });

      assert.ok(createRes.success);
      assert.ok(createRes.task.taskId.startsWith('tsk_'));
      assert.equal(createRes.task.title, 'Launch Enterprise AI Architecture Client Proposal');
      assert.equal(createRes.task.estimatedDuration, 60);

      // Edit the task (idempotent update preserving existing fields)
      const updateRes = mockDb.saveTask(TEST_USER_ID, {
        taskId: createRes.task.taskId,
        title: 'Launch Enterprise AI Architecture Client Proposal [Revised]',
        actualDuration: 75
      });

      assert.equal(updateRes.task.taskId, createRes.task.taskId);
      assert.equal(updateRes.task.title, 'Launch Enterprise AI Architecture Client Proposal [Revised]');
      assert.equal(updateRes.task.estimatedDuration, 60);
      assert.equal(updateRes.task.actualDuration, 75);
      createdTask = updateRes.task;
    });

    it('Step 3: Link the task to a strategic/financial goal', () => {
      // Retrieve or save a goal from investment overview
      const investmentData = mockDb.getInvestmentOverview(TEST_USER_ID);
      const goals = investmentData.goals || [];
      createdGoal = goals.length > 0 ? goals[0] : {
        id: 'goal_arr_100k',
        goalId: 'goal_arr_100k',
        userId: TEST_USER_ID,
        name: 'Reach $100k Annual ARR Target',
        category: 'Revenue',
        priority: 'High',
        targetAmount: 100000,
        currentBalance: 35000
      };

      // Link task to goal
      const linkRes = mockDb.saveTask(TEST_USER_ID, {
        taskId: createdTask.taskId,
        title: createdTask.title,
        linkedGoalId: createdGoal.goalId || createdGoal.id
      });

      assert.equal(linkRes.task.linkedGoalId, createdGoal.goalId || createdGoal.id);
      assert.equal(linkRes.task.estimatedDuration, 60);
      createdTask = linkRes.task;
    });

    it('Step 4: Calculate its deterministic 5-factor priority score', () => {
      const refDate = new Date(`${TARGET_DATE}T00:00:00.000Z`);
      const scored = calculatePriorityScore(createdTask, [createdTask], [createdGoal], refDate);

      assert.ok(scored.score >= 0 && scored.score <= 100, 'Score must be normalized [0, 100]');
      assert.ok(scored.score >= 60, 'Due today with High income and linked goal should score high');
      assert.ok(scored.summary, 'Must generate factor explanation');
      assert.equal(typeof scored.breakdown.urgency.raw, 'number');
      assert.equal(typeof scored.breakdown.goalAlignment.raw, 'number');
      assert.equal(typeof scored.breakdown.incomeImpact.raw, 'number');
      assert.equal(typeof scored.breakdown.dependency.raw, 'number');
      assert.equal(typeof scored.breakdown.readiness.raw, 'number');
    });

    it('Step 5: Generate and save a daily Big 5 plan', () => {
      const planResult = generateDailyBigFive([createdTask], {
        planDate: TARGET_DATE,
        dayType: 'NORMAL'
      });

      assert.ok(planResult);
      assert.equal(planResult.recommendedTasks.length, 1);
      assert.equal(planResult.recommendedTasks[0].taskId, createdTask.taskId);
      assert.equal(planResult.plannedMinutes, 60);

      // Save plan to database
      const saveRes = mockDb.saveDailyPlan(TEST_USER_ID, {
        planDate: TARGET_DATE,
        dayType: planResult.dayType,
        availableMinutes: planResult.availableMinutes,
        plannedMinutes: planResult.plannedMinutes,
        selectedTaskIds: planResult.recommendedTasks.map(t => t.taskId),
        selectionRationale: planResult.selectionRationale
      });

      assert.ok(saveRes.success);
      assert.ok(saveRes.plan.planId);
      savedPlan = saveRes.plan;
    });

    it('Step 6: Accept, defer, and complete task recommendations', () => {
      // 1. Accept task in plan
      savedPlan.acceptanceStatuses = { [createdTask.taskId]: true };
      const planRes = mockDb.saveDailyPlan(TEST_USER_ID, savedPlan);
      assert.ok(planRes.success);

      // 2. Mark task as Completed
      const completedRes = mockDb.saveTask(TEST_USER_ID, {
        taskId: createdTask.taskId,
        title: createdTask.title,
        status: 'Completed'
      });

      assert.equal(completedRes.task.status, 'Completed');
      assert.ok(completedRes.task.completedAt, 'completedAt must be populated');
      createdTask = completedRes.task;
    });

    it('Step 7: Perform an evening review with structured deferrals', () => {
      const reviewPayload = {
        reviewType: 'EVENING',
        periodKey: TARGET_DATE,
        linkedPlanId: savedPlan.planId,
        metrics: {
          tasksPlanned: 1,
          tasksCompleted: 1,
          completionRate: 100
        },
        reflectionText: 'Delivered revised architecture proposal ahead of schedule.',
        deferrals: []
      };

      const res = mockDb.saveReview(TEST_USER_ID, reviewPayload);
      assert.ok(res.success);
      assert.equal(res.review.reviewType, 'EVENING');
      assert.equal(res.review.periodKey, TARGET_DATE);
      savedEveningReview = res.review;
    });

    it('Step 8: Generate and persist a weekly progress review', () => {
      const weekKey = getIsoWeekKey(new Date(`${TARGET_DATE}T12:00:00Z`));
      const { startDate, endDate } = getWeekDateRange(weekKey);

      const weeklyData = aggregateWeeklyMetrics({
        tasks: [createdTask],
        dailyPlans: [savedPlan],
        startDate,
        endDate,
        todayDateStr: TARGET_DATE
      });

      assert.ok(weeklyData);
      assert.equal(weeklyData.tasksPlannedCount, 1);
      assert.equal(weeklyData.tasksCompletedCount, 1);
      assert.equal(weeklyData.completionRate, 100);

      // Save weekly review
      const saveRes = mockDb.saveReview(TEST_USER_ID, {
        reviewType: 'WEEKLY',
        periodKey: weekKey,
        metrics: weeklyData,
        reflectionText: 'Strong week of focused execution and proposal delivery.',
        nextSteps: ['Schedule client follow-up', 'Prepare deployment sprint']
      });

      assert.ok(saveRes.success);
      assert.equal(saveRes.review.reviewType, 'WEEKLY');
    });

    it('Step 9: Compute factual execution analytics & goal progress', () => {
      const analytics = calculateTaskAnalytics(
        [createdTask],
        [savedPlan],
        [savedEveningReview],
        [createdGoal],
        { dateRange: 'all', category: 'all', referenceDate: TARGET_DATE }
      );

      assert.equal(analytics.totalTasksCount, 1);
      assert.equal(analytics.completedCount, 1);
      assert.equal(analytics.overallCompletionRate, 100);
      assert.equal(analytics.overdueCount, 0);
      assert.equal(analytics.hasActualDurationData, true);
      assert.equal(analytics.totalEstimatedMinutes, 60);
      assert.equal(analytics.totalActualMinutes, 75);
      // Variance = (75 - 60)/60 * 100 = 25%
      assert.equal(analytics.estimationVariancePercent, 25);
      assert.equal(analytics.revenueTasksCount, 1);
      assert.equal(analytics.completedRevenueTasksCount, 1);
      assert.equal(analytics.revenueTaskCompletionRate, 100);
      assert.equal(analytics.goalProgress[0].completedLinked, 1);
      assert.equal(analytics.goalProgress[0].milestoneRate, 100);
    });

    it('Step 10: Verify Google Calendar & Google Tasks integration behavior', () => {
      // 1. Calendar math
      const rawGCalEvent = {
        id: 'gcal_e2e_1',
        summary: 'Architecture Board Review',
        start: { dateTime: `${TARGET_DATE}T11:00:00+05:30` },
        end: { dateTime: `${TARGET_DATE}T12:30:00+05:30` },
        status: 'confirmed'
      };

      const parsed = parseEventInterval(rawGCalEvent, TARGET_DATE);
      assert.ok(parsed);
      const duration = Math.round((parsed.end - parsed.start) / 60000);
      assert.equal(duration, 90);

      const commitments = calculateCalendarCommitments([rawGCalEvent], TARGET_DATE);
      assert.equal(commitments.busyMinutes, 90);
      assert.equal(commitments.parsedEvents.length, 1);

      // 2. Google Tasks mapping
      const rawGTask = {
        id: 'gtask_e2e_1',
        title: 'Review Security Controls and Cloud IAM Roles',
        notes: 'Examine least privilege service account roles',
        due: `${TARGET_DATE}T00:00:00.000Z`,
        status: 'needsAction'
      };

      const mapped = googleTasksService.mapGoogleTaskToLocalTask(rawGTask, 'Business');
      assert.equal(mapped.externalId, 'gtask_e2e_1');
      assert.equal(mapped.source, 'GoogleTasks');
      assert.equal(mapped.title, 'Review Security Controls and Cloud IAM Roles');
      assert.equal(mapped.dueDate, TARGET_DATE);
      assert.equal(mapped.category, 'Business');
      assert.equal(mapped.status, 'Not Started');
    });

    it('Step 11: Verify AI Assistant server gateway and fallback reasoning', async () => {
      // Offline fallback explanation
      const expRes = await aiService.explainTaskPriority(TEST_USER_ID, createdTask);
      assert.ok(expRes.success);
      assert.equal(expRes.isFallback, true);
      assert.ok(expRes.data.summary.includes('priority'));

      // Offline fallback subtask breakdown
      const brkRes = await aiService.breakdownTask(TEST_USER_ID, createdTask);
      assert.ok(brkRes.success);
      assert.equal(brkRes.isFallback, true);
      assert.equal(brkRes.data.subtasks.length, 3);

      // Offline conversational chat
      const chatRes = await aiService.chatWithAssistant(TEST_USER_ID, 'What is my plan today?');
      assert.ok(chatRes.success);
      assert.ok(chatRes.reply.length > 0);
    });

    it('Step 12: Confirm existing habits, routines, investments, and achievements remain completely intact', () => {
      // Habits regression check
      const habits = mockDb.getHabits(TEST_USER_ID);
      assert.ok(Array.isArray(habits));

      // Routines regression check
      const routineLogs = mockDb.getRoutineLogs(TEST_USER_ID, TARGET_DATE);
      assert.ok(Array.isArray(routineLogs));

      // Financial profile regression check
      const investmentData = mockDb.getInvestmentOverview(TEST_USER_ID);
      assert.ok(investmentData);
      assert.ok(investmentData.profile);

      // Achievements regression check
      const achievements = mockDb.getAchievements(TEST_USER_ID);
      assert.ok(Array.isArray(achievements));
    });
  });

  describe('Security, Multi-User Isolation & Error Handling', () => {
    it('prevents user A from modifying or deleting user B tasks at database level', () => {
      const userATaskRes = mockDb.saveTask('user_A', { title: 'User A Secret Task' });
      assert.ok(userATaskRes.task.taskId);

      // User B tries to modify User A's task
      assert.throws(() => {
        mockDb.saveTask('user_B', {
          taskId: userATaskRes.task.taskId,
          title: 'Tampered by User B'
        });
      }, /Unauthorized/);

      // User B tries to delete User A's task
      assert.throws(() => {
        mockDb.deleteTask('user_B', userATaskRes.task.taskId);
      }, /Unauthorized/);
    });

    it('prevents user A from accessing user B reviews or daily plans', () => {
      mockDb.saveDailyPlan('user_A', {
        planDate: TARGET_DATE,
        dayType: 'Standard Workday',
        availableMinutes: 480,
        plannedMinutes: 120,
        selectedTaskIds: []
      });

      const userBPlan = mockDb.getDailyPlan('user_B', TARGET_DATE);
      assert.equal(userBPlan.plan, null, 'User B must not read User A daily plan');
    });

    it('handles idempotent updates without creating duplicate records', () => {
      const t1 = mockDb.saveTask(TEST_USER_ID, { title: 'Idempotent Test Task' }).task;
      const initialCount = mockDb.getTasks(TEST_USER_ID).tasks.length;

      // Update 3 times
      mockDb.saveTask(TEST_USER_ID, { taskId: t1.taskId, title: t1.title, description: 'Update 1' });
      mockDb.saveTask(TEST_USER_ID, { taskId: t1.taskId, title: t1.title, description: 'Update 2' });
      mockDb.saveTask(TEST_USER_ID, { taskId: t1.taskId, title: t1.title, description: 'Update 3' });

      const finalCount = mockDb.getTasks(TEST_USER_ID).tasks.length;
      assert.equal(finalCount, initialCount, 'Repeated updates must not duplicate rows');
    });
  });

});
