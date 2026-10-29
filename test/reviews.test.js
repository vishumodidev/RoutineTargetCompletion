import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for Node.js test environment
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
const {
  getIsoWeekKey,
  getWeekDateRange,
  aggregateWeeklyMetrics,
  DEFERRAL_REASONS
} = await import('../src/utils/reviewAggregator.js');
const { generateDailyBigFive } = await import('../src/utils/dailyPlanner.js');

describe('Phase 4: Daily and Weekly Reviews Tests', () => {
  beforeEach(() => {
    global.localStorage.clear();
    initMockDb();
  });

  const testUserId = 'usr_vishu';
  const testDate = '2026-10-28'; // Wednesday

  describe('Morning Plan Generation with vs without Existing Plan', () => {
    const tasks = [
      { taskId: 't1', title: 'Task 1', incomeImpact: 'High', estimatedDuration: 60, status: 'Not Started' },
      { taskId: 't2', title: 'Task 2', incomeImpact: 'Medium', estimatedDuration: 45, status: 'Not Started' },
      { taskId: 't3', title: 'Task 3', incomeImpact: 'Low', estimatedDuration: 30, status: 'Not Started' }
    ];

    it('generates a fresh morning plan when no previous plan exists', () => {
      const result = generateDailyBigFive(tasks, {
        planDate: testDate,
        existingPlan: null
      });

      assert.equal(result.recommendedTasks.length, 3);
      assert.ok(result.recommendedTasks.every(t => t.isAccepted === true));
      assert.equal(result.plannedMinutes, 135);
    });

    it('preserves existing acceptance states and custom order when an accepted plan exists', () => {
      const existingPlan = {
        planDate: testDate,
        taskOrder: ['t3', 't1', 't2'],
        acceptanceStatuses: {
          t1: true,
          t2: false, // user manually deselected t2
          t3: true
        }
      };

      const result = generateDailyBigFive(tasks, {
        planDate: testDate,
        existingPlan
      });

      assert.equal(result.recommendedTasks[0].taskId, 't3');
      assert.equal(result.recommendedTasks[1].taskId, 't1');
      assert.equal(result.recommendedTasks[2].taskId, 't2');
      assert.equal(result.recommendedTasks[2].isAccepted, false);
    });
  });

  describe('Evening Review & Structured Deferrals', () => {
    it('verifies standardized deferral reasons include all approved categories', () => {
      assert.ok(DEFERRAL_REASONS.includes('Insufficient time'));
      assert.ok(DEFERRAL_REASONS.includes('Unexpected commitment'));
      assert.ok(DEFERRAL_REASONS.includes('Blocked by another task'));
      assert.ok(DEFERRAL_REASONS.includes('Task estimate was inaccurate'));
      assert.ok(DEFERRAL_REASONS.includes('Lower priority than expected'));
      assert.ok(DEFERRAL_REASONS.includes('Personal commitment'));
      assert.ok(DEFERRAL_REASONS.includes('Other'));
    });

    it('saves an evening review with deferrals and optional reflections', () => {
      const eveningPayload = {
        reviewType: 'EVENING',
        periodKey: testDate,
        linkedPlanId: 'plan_2026-10-28_test',
        metrics: {
          tasksPlanned: 5,
          tasksCompleted: 3,
          completionRate: 60
        },
        reflectionText: 'Deep work sprint went well; unexpected client call delayed task 4.',
        deferrals: [
          { taskId: 't4', title: 'Task 4', reasonCategory: 'Unexpected commitment', notes: 'Client call' }
        ],
        nextSteps: ['Task 4 follow-up', 'Prepare weekly deck']
      };

      const res = mockDb.saveReview(testUserId, eveningPayload);
      assert.equal(res.success, true);
      assert.equal(res.review.periodKey, testDate);
      assert.equal(res.review.reviewType, 'EVENING');
      assert.equal(res.review.reflectionText, eveningPayload.reflectionText);
      assert.equal(res.review.deferrals.length, 1);
      assert.equal(res.review.deferrals[0].reasonCategory, 'Unexpected commitment');
    });
  });

  describe('Weekly Aggregations & Date Boundaries', () => {
    it('calculates ISO week key and Monday-to-Sunday date range accurately', () => {
      const weekKey = getIsoWeekKey(new Date('2026-10-28T12:00:00Z'));
      assert.equal(weekKey, '2026-W44');

      const { startDate, endDate } = getWeekDateRange('2026-W44');
      assert.equal(startDate, '2026-10-26'); // Monday
      assert.equal(endDate, '2026-11-01');   // Sunday
    });

    it('safely handles empty review periods without division-by-zero errors', () => {
      const metrics = aggregateWeeklyMetrics({
        tasks: [],
        dailyPlans: [],
        goals: [],
        startDate: '2026-10-26',
        endDate: '2026-11-01'
      });

      assert.equal(metrics.tasksPlannedCount, 0);
      assert.equal(metrics.tasksCompletedCount, 0);
      assert.equal(metrics.completionRate, 0);
      assert.equal(metrics.hasActualDurationData, false);
      assert.equal(metrics.estimationVariancePercent, null);
    });

    it('aggregates tasks planned vs completed and completion rate accurately', () => {
      const tasks = [
        { taskId: 'tk1', title: 'Planned Done', category: 'BUILD', estimatedDuration: 60, status: 'Completed' },
        { taskId: 'tk2', title: 'Planned Incomplete', category: 'JOB/OFFICE', estimatedDuration: 60, status: 'In Progress' },
        { taskId: 'tk3', title: 'Unplanned Done', category: 'LEARN', estimatedDuration: 30, status: 'Completed' }
      ];

      const dailyPlans = [
        {
          planDate: '2026-10-27',
          selectedTaskIds: ['tk1', 'tk2'],
          acceptanceStatuses: { tk1: true, tk2: true },
          deferredTasks: [{ taskId: 'tk9', reason: 'Capacity constraint' }]
        }
      ];

      const metrics = aggregateWeeklyMetrics({
        tasks,
        dailyPlans,
        startDate: '2026-10-26',
        endDate: '2026-11-01',
        todayDateStr: '2026-10-28'
      });

      assert.equal(metrics.tasksPlannedCount, 2);
      assert.equal(metrics.tasksCompletedCount, 1);
      assert.equal(metrics.completionRate, 50);
      assert.equal(metrics.deferredCount, 1);
      assert.equal(metrics.deferralReasonsSummary['Capacity constraint'], 1);
      assert.equal(metrics.categoryWorkload['BUILD'].count, 1);
      assert.equal(metrics.categoryWorkload['BUILD'].completed, 1);
      assert.equal(metrics.categoryWorkload['JOB/OFFICE'].completed, 0);
    });

    it('accurately identifies overdue tasks and current blockers', () => {
      const tasks = [
        { taskId: 'tk1', title: 'Overdue Task', dueDate: '2026-10-20', status: 'Not Started' },
        { taskId: 'tk2', title: 'Blocked Task', status: 'Blocked' },
        { taskId: 'tk3', title: 'Completed Past Due', dueDate: '2026-10-20', status: 'Completed' }
      ];

      const metrics = aggregateWeeklyMetrics({
        tasks,
        dailyPlans: [],
        startDate: '2026-10-26',
        endDate: '2026-11-01',
        todayDateStr: '2026-10-28'
      });

      assert.equal(metrics.overdueCount, 1);
      assert.equal(metrics.overdueTasks[0].taskId, 'tk1');
      assert.equal(metrics.currentBlockers.length, 1);
      assert.equal(metrics.currentBlockers[0].taskId, 'tk2');
    });
  });

  describe('Missing vs Logged Actual-Duration Data', () => {
    it('sets hasActualDurationData to false when no tasks have actual duration', () => {
      const tasks = [
        { taskId: 'tk1', title: 'Task 1', estimatedDuration: 60, status: 'Completed' }
      ];
      const dailyPlans = [{ planDate: '2026-10-28', selectedTaskIds: ['tk1'] }];

      const metrics = aggregateWeeklyMetrics({
        tasks,
        dailyPlans,
        startDate: '2026-10-26',
        endDate: '2026-11-01'
      });

      assert.equal(metrics.hasActualDurationData, false);
      assert.equal(metrics.actualMinutesTotal, 0);
      assert.equal(metrics.estimationVariancePercent, null);
    });

    it('calculates estimation variance accurately when actual duration is present', () => {
      const tasks = [
        { taskId: 'tk1', title: 'Task 1', estimatedDuration: 60, actualDuration: 90, status: 'Completed' }
      ];
      const dailyPlans = [{ planDate: '2026-10-28', selectedTaskIds: ['tk1'] }];

      const metrics = aggregateWeeklyMetrics({
        tasks,
        dailyPlans,
        startDate: '2026-10-26',
        endDate: '2026-11-01'
      });

      assert.equal(metrics.hasActualDurationData, true);
      assert.equal(metrics.estimatedMinutesTotal, 60);
      assert.equal(metrics.actualMinutesTotal, 90);
      // ((90 - 60) / 60) * 100 = +50%
      assert.equal(metrics.estimationVariancePercent, 50);
    });
  });

  describe('Review Persistence & Idempotency', () => {
    it('updates an existing review in place without creating duplicates on repeated submissions', () => {
      const weekKey = '2026-W44';
      const initialPayload = {
        reviewType: 'WEEKLY',
        periodKey: weekKey,
        metrics: { completionRate: 75 },
        reflectionText: 'Initial reflection draft'
      };

      const res1 = mockDb.saveReview(testUserId, initialPayload);
      const firstId = res1.review.reviewId;

      // Resubmit with updated reflection
      const updatedPayload = {
        reviewType: 'WEEKLY',
        periodKey: weekKey,
        metrics: { completionRate: 80 },
        reflectionText: 'Updated reflection final'
      };

      const res2 = mockDb.saveReview(testUserId, updatedPayload);
      assert.equal(res2.review.reviewId, firstId, 'Review ID must remain identical on idempotent update');
      assert.equal(res2.review.reflectionText, 'Updated reflection final');
      assert.equal(res2.review.metrics.completionRate, 80);

      // Verify that getReviewsHistory only contains 1 review for this week
      const history = mockDb.getReviewsHistory(testUserId, 'WEEKLY');
      const matching = history.reviews.filter(r => r.periodKey === weekKey);
      assert.equal(matching.length, 1);
    });

    it('enforces authorization boundary so user A cannot read user B reviews', () => {
      const res = mockDb.getReview('other_user_999', 'WEEKLY', '2026-W44');
      assert.equal(res.review, null);
    });
  });
});
