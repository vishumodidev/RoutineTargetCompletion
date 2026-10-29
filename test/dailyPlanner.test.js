import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAvailableCapacity,
  generateDailyBigFive,
  DAY_TYPES
} from '../src/utils/dailyPlanner.js';

describe('Phase 3: Daily Big 5 & Daily Planner Tests', () => {
  // 2026-10-28 is a Wednesday
  const wednesdayDate = '2026-10-28';
  // 2026-10-31 is a Saturday
  const saturdayDate = '2026-10-31';
  // 2026-11-01 is a Sunday
  const sundayDate = '2026-11-01';

  describe('Capacity Calculation', () => {
    it('calculates default weekday capacity as 480 minutes (8 hours)', () => {
      const mins = calculateAvailableCapacity(wednesdayDate, 'NORMAL');
      assert.equal(mins, 480);
    });

    it('calculates Saturday capacity as 360 minutes (6 hours)', () => {
      const mins = calculateAvailableCapacity(saturdayDate, 'NORMAL');
      assert.equal(mins, 360);
    });

    it('calculates Sunday capacity as 240 minutes (4 hours)', () => {
      const mins = calculateAvailableCapacity(sundayDate, 'NORMAL');
      assert.equal(mins, 240);
    });

    it('scales available capacity based on day types', () => {
      // Weekday base = 480
      assert.equal(calculateAvailableCapacity(wednesdayDate, 'TRAINING'), Math.round(480 * 0.6)); // 288
      assert.equal(calculateAvailableCapacity(wednesdayDate, 'CLIENT'), Math.round(480 * 0.7));   // 336
      assert.equal(calculateAvailableCapacity(wednesdayDate, 'TRAVEL'), Math.round(480 * 0.4));   // 192
      assert.equal(calculateAvailableCapacity(wednesdayDate, 'RECOVERY'), Math.round(480 * 0.25));// 120
    });

    it('honors custom available minutes overrides', () => {
      assert.equal(calculateAvailableCapacity(wednesdayDate, 'NORMAL', 300), 300);
      assert.equal(calculateAvailableCapacity(wednesdayDate, 'NORMAL', 45), 60); // min 60 mins floor
    });
  });

  describe('Candidate Filtering and Ineligibility', () => {
    it('returns empty structure cleanly when tasks list is empty', () => {
      const result = generateDailyBigFive([], { planDate: wednesdayDate });
      assert.equal(result.recommendedTasks.length, 0);
      assert.equal(result.plannedMinutes, 0);
      assert.equal(result.blockedAlerts.length, 0);
      assert.equal(result.overflowTasks.length, 0);
      assert.ok(result.overallSummary.includes('No tasks available'));
    });

    it('filters out Completed and Cancelled tasks', () => {
      const tasks = [
        { taskId: 't1', title: 'Task 1', status: 'Completed', incomeImpact: 'High' },
        { taskId: 't2', title: 'Task 2', status: 'Cancelled', incomeImpact: 'High' },
        { taskId: 't3', title: 'Task 3', status: 'Not Started', incomeImpact: 'High', estimatedDuration: 60 }
      ];

      const result = generateDailyBigFive(tasks, { planDate: wednesdayDate });
      assert.equal(result.recommendedTasks.length, 1);
      assert.equal(result.recommendedTasks[0].taskId, 't3');
    });

    it('excludes Blocked tasks from recommendations and places them into blockedAlerts', () => {
      const tasks = [
        { taskId: 't1', title: 'Blocked Critical Task', status: 'Blocked', priorityTag: 'Critical', incomeImpact: 'High' },
        { taskId: 't2', title: 'Ready Active Task', status: 'In Progress', priorityTag: 'High', incomeImpact: 'Medium', estimatedDuration: 60 }
      ];

      const result = generateDailyBigFive(tasks, { planDate: wednesdayDate });
      assert.equal(result.recommendedTasks.length, 1);
      assert.equal(result.recommendedTasks[0].taskId, 't2');
      assert.equal(result.blockedAlerts.length, 1);
      assert.equal(result.blockedAlerts[0].taskId, 't1');
      assert.ok(result.overallSummary.includes('blocked'));
    });
  });

  describe('Daily Big 5 Selection & Deterministic Ranking', () => {
    it('selects up to 5 highest scoring tasks', () => {
      const tasks = [
        { taskId: 't1', title: 'Task Low', incomeImpact: 'None', priorityTag: 'Low', estimatedDuration: 30 },
        { taskId: 't2', title: 'Task Medium 1', incomeImpact: 'Medium', priorityTag: 'Medium', estimatedDuration: 30 },
        { taskId: 't3', title: 'Task High 1', incomeImpact: 'High', priorityTag: 'High', dueDate: wednesdayDate, estimatedDuration: 30 },
        { taskId: 't4', title: 'Task High 2', incomeImpact: 'High', priorityTag: 'High', estimatedDuration: 30 },
        { taskId: 't5', title: 'Task Critical', incomeImpact: 'High', priorityTag: 'Critical', dueDate: wednesdayDate, estimatedDuration: 30 },
        { taskId: 't6', title: 'Task Medium 2', incomeImpact: 'Medium', priorityTag: 'Medium', estimatedDuration: 30 },
        { taskId: 't7', title: 'Task Medium 3', incomeImpact: 'Medium', priorityTag: 'Medium', estimatedDuration: 30 }
      ];

      const result = generateDailyBigFive(tasks, { planDate: wednesdayDate });
      assert.equal(result.recommendedTasks.length, 5);
      // Top task should be Task Critical due to overdue/today + High impact
      assert.equal(result.recommendedTasks[0].taskId, 't5');
      // Total overflow tasks should be remaining 2
      assert.equal(result.overflowTasks.length, 2);
    });

    it('applies deterministic tie-breakers when priority scores are identical', () => {
      // 2 tasks with identical category and status but different manual override
      const tasks = [
        { taskId: 't1', title: 'Normal Medium', category: 'BUILD', status: 'Not Started', priorityTag: 'Medium', estimatedDuration: 30, createdAt: '2026-10-25' },
        { taskId: 't2', title: 'Critical Manual Override', category: 'BUILD', status: 'Not Started', priorityTag: 'Critical', estimatedDuration: 30, createdAt: '2026-10-26' }
      ];

      const result = generateDailyBigFive(tasks, { planDate: wednesdayDate });
      assert.equal(result.recommendedTasks[0].taskId, 't2'); // Manual override wins tie-break
    });

    it('tie-breaks by earlier due date if manual override is identical', () => {
      const tasks = [
        { taskId: 't1', title: 'Due Later', category: 'BUILD', status: 'Not Started', dueDate: '2026-11-10', estimatedDuration: 30 },
        { taskId: 't2', title: 'Due Today', category: 'BUILD', status: 'Not Started', dueDate: wednesdayDate, estimatedDuration: 30 }
      ];

      const result = generateDailyBigFive(tasks, { planDate: wednesdayDate });
      assert.equal(result.recommendedTasks[0].taskId, 't2');
    });
  });

  describe('Capacity Fitting & Overflow Deferral', () => {
    it('defers tasks when daily capacity is exceeded and annotates with deferral reason', () => {
      // Set capacity override to 120 minutes
      const tasks = [
        { taskId: 't1', title: 'Task 1', incomeImpact: 'High', estimatedDuration: 60 },
        { taskId: 't2', title: 'Task 2', incomeImpact: 'High', estimatedDuration: 60 },
        { taskId: 't3', title: 'Task 3', incomeImpact: 'High', estimatedDuration: 60 }
      ];

      const result = generateDailyBigFive(tasks, {
        planDate: wednesdayDate,
        customAvailableMinutes: 120
      });

      // t1 (60m) + t2 (60m) = 120m -> reaches capacity
      assert.equal(result.recommendedTasks.length, 2);
      assert.equal(result.plannedMinutes, 120);
      assert.equal(result.overflowTasks.length, 1);
      assert.equal(result.overflowTasks[0].taskId, 't3');
      assert.ok(result.overflowTasks[0].deferralReason.includes('Capacity exceeded'));
    });

    it('provides clear selection rationale for each recommended task', () => {
      const tasks = [
        { taskId: 't1', title: 'Overdue Revenue Task', incomeImpact: 'High', dueDate: '2026-10-20', estimatedDuration: 60 }
      ];

      const result = generateDailyBigFive(tasks, { planDate: wednesdayDate });
      assert.ok(result.recommendedTasks[0].selectionRationale.includes('Ranked #1'));
      assert.ok(result.recommendedTasks[0].selectionRationale.includes('Deadline urgent'));
    });
  });

  describe('Plan Order & Acceptance State Restoration', () => {
    it('restores previous custom ordering and acceptance state if existing plan is provided', () => {
      const tasks = [
        { taskId: 't1', title: 'Task 1', incomeImpact: 'High', estimatedDuration: 30 },
        { taskId: 't2', title: 'Task 2', incomeImpact: 'Medium', estimatedDuration: 30 },
        { taskId: 't3', title: 'Task 3', incomeImpact: 'Low', estimatedDuration: 30 }
      ];

      // User previously moved t3 to #1 and unchecked t2
      const existingPlan = {
        taskOrder: ['t3', 't1', 't2'],
        acceptanceStatuses: {
          t2: false,
          t1: true,
          t3: true
        }
      };

      const result = generateDailyBigFive(tasks, {
        planDate: wednesdayDate,
        existingPlan
      });

      assert.equal(result.recommendedTasks[0].taskId, 't3');
      assert.equal(result.recommendedTasks[1].taskId, 't1');
      assert.equal(result.recommendedTasks[2].taskId, 't2');
      assert.equal(result.recommendedTasks[2].isAccepted, false);
      assert.equal(result.recommendedTasks[0].isAccepted, true);
    });
  });
});

