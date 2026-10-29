import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePriorityScore,
  calculateDeadlineUrgency,
  calculateGoalAlignment,
  calculateIncomeImpact,
  calculateDependency,
  calculateReadiness,
  PRIORITY_WEIGHTS,
  clamp
} from '../src/utils/priorityEngine.js';

describe('Phase 2: Deterministic Priority Engine Tests', () => {
  const refDate = new Date('2026-10-28T00:00:00.000Z');

  describe('Mathematical Properties & Normalization', () => {
    it('weights must sum exactly to 1.00', () => {
      const sum =
        PRIORITY_WEIGHTS.URGENCY +
        PRIORITY_WEIGHTS.GOAL_ALIGNMENT +
        PRIORITY_WEIGHTS.INCOME_IMPACT +
        PRIORITY_WEIGHTS.DEPENDENCY +
        PRIORITY_WEIGHTS.READINESS;
      assert.equal(Math.round(sum * 100) / 100, 1.00);
    });

    it('clamp function enforces strictly [min, max] boundaries', () => {
      assert.equal(clamp(-50, 0, 100), 0);
      assert.equal(clamp(150, 0, 100), 100);
      assert.equal(clamp(42, 0, 100), 42);
      assert.equal(clamp('invalid', 0, 100), 0);
    });

    it('score must always fall strictly within [0, 100]', () => {
      // Minimal task
      const minTask = {
        title: 'Minimal Task',
        status: 'Completed'
      };
      const minResult = calculatePriorityScore(minTask, [], [], refDate);
      assert.ok(minResult.score >= 0 && minResult.score <= 100);

      // Maximal task
      const maxTask = {
        title: 'Critical Overdue Revenue Task',
        status: 'In Progress',
        dueDate: '2026-10-25', // Overdue
        deadlineType: 'Hard',
        linkedGoalId: 'goal_crit',
        incomeImpact: 'High',
        nextAction: 'Finalize and close contract',
        estimatedDuration: 60,
        projectArea: 'Corporate Workshops'
      };
      const goals = [{ id: 'goal_crit', priority: 'Critical', name: 'Annual Revenue' }];
      const allTasks = [
        maxTask,
        { taskId: 't2', dependencies: maxTask.taskId, status: 'Planned' },
        { taskId: 't3', dependencies: maxTask.taskId, status: 'Planned' },
        { taskId: 't4', dependencies: maxTask.taskId, status: 'Planned' }
      ];
      maxTask.taskId = 't1';

      const maxResult = calculatePriorityScore(maxTask, allTasks, goals, refDate);
      assert.ok(maxResult.score >= 80 && maxResult.score <= 100);
      assert.equal(maxResult.band, 'Critical');
    });
  });

  describe('Factor 1: Deadline Urgency', () => {
    it('handles overdue tasks with Hard vs Soft vs Flexible deadlines', () => {
      const hardOverdue = { dueDate: '2026-10-25', deadlineType: 'Hard', status: 'In Progress' };
      const softOverdue = { dueDate: '2026-10-25', deadlineType: 'Soft', status: 'In Progress' };
      const flexOverdue = { dueDate: '2026-10-25', deadlineType: 'Flexible', status: 'In Progress' };

      assert.equal(calculateDeadlineUrgency(hardOverdue, refDate).score, 100);
      assert.equal(calculateDeadlineUrgency(softOverdue, refDate).score, 95);
      assert.equal(calculateDeadlineUrgency(flexOverdue, refDate).score, 85);
    });

    it('handles due today vs tomorrow vs next week', () => {
      const dueToday = { dueDate: '2026-10-28', deadlineType: 'Hard', status: 'Planned' };
      const dueTomorrow = { dueDate: '2026-10-29', deadlineType: 'Hard', status: 'Planned' };
      const dueIn3Days = { dueDate: '2026-10-31', deadlineType: 'Hard', status: 'Planned' };
      const dueIn2Months = { dueDate: '2026-12-31', deadlineType: 'Hard', status: 'Planned' };

      assert.equal(calculateDeadlineUrgency(dueToday, refDate).score, 95);
      assert.equal(calculateDeadlineUrgency(dueTomorrow, refDate).score, 85);
      assert.equal(calculateDeadlineUrgency(dueIn3Days, refDate).score, 70);
      assert.equal(calculateDeadlineUrgency(dueIn2Months, refDate).score, 10);
    });

    it('does NOT inflate missing due date scores', () => {
      const missingFlex = { deadlineType: 'Flexible', status: 'Planned' };
      const missingHard = { deadlineType: 'Hard', status: 'Planned' };

      assert.equal(calculateDeadlineUrgency(missingFlex, refDate).score, 20);
      assert.equal(calculateDeadlineUrgency(missingHard, refDate).score, 40);
    });

    it('assigns 0 urgency to completed tasks', () => {
      const completedOverdue = { dueDate: '2026-10-20', status: 'Completed', deadlineType: 'Hard' };
      assert.equal(calculateDeadlineUrgency(completedOverdue, refDate).score, 0);
    });
  });

  describe('Factor 2: Goal Alignment', () => {
    it('scales alignment according to linked goal priority', () => {
      const goals = [
        { id: 'g_crit', priority: 'Critical', name: 'Critical Goal' },
        { id: 'g_high', priority: 'High', name: 'High Goal' },
        { id: 'g_med', priority: 'Medium', name: 'Med Goal' },
        { id: 'g_low', priority: 'Low', name: 'Low Goal' }
      ];

      assert.equal(calculateGoalAlignment({ linkedGoalId: 'g_crit' }, goals).score, 100);
      assert.equal(calculateGoalAlignment({ linkedGoalId: 'g_high' }, goals).score, 85);
      assert.equal(calculateGoalAlignment({ linkedGoalId: 'g_med' }, goals).score, 70);
      assert.equal(calculateGoalAlignment({ linkedGoalId: 'g_low' }, goals).score, 50);
    });

    it('provides strategic category baseline when unlinked', () => {
      const aiTask = { category: 'AI Agent Development' };
      const generalTask = { category: 'General' };

      assert.equal(calculateGoalAlignment(aiTask, []).score, 55);
      assert.equal(calculateGoalAlignment(generalTask, []).score, 25);
    });
  });

  describe('Factor 3: Income or Business Impact', () => {
    it('maps impact bands deterministically', () => {
      assert.equal(calculateIncomeImpact({ incomeImpact: 'High' }).score, 100);
      assert.equal(calculateIncomeImpact({ incomeImpact: 'Medium' }).score, 70);
      assert.equal(calculateIncomeImpact({ incomeImpact: 'Low' }).score, 35);
      assert.equal(calculateIncomeImpact({ incomeImpact: 'None' }).score, 10);
      assert.equal(calculateIncomeImpact({}).score, 10);
    });

    it('infers baseline commercial impact from revenue categories if unspecified', () => {
      assert.equal(calculateIncomeImpact({ category: 'Corporate Training' }).score, 60);
      assert.equal(calculateIncomeImpact({ category: 'MI Lifestyle Sales' }).score, 60);
    });
  });

  describe('Factor 4: Dependency Importance', () => {
    it('heavily weights tasks that unblock multiple downstream tasks', () => {
      const blockingTask = { taskId: 'tsk_core', status: 'In Progress' };
      const allTasks = [
        blockingTask,
        { taskId: 't1', dependencies: 'tsk_core', status: 'Planned' },
        { taskId: 't2', dependencies: 'tsk_core', status: 'Planned' },
        { taskId: 't3', dependencies: 'tsk_core', status: 'Planned' }
      ];

      const depResult = calculateDependency(blockingTask, allTasks);
      assert.equal(depResult.score, 100);
      assert.match(depResult.reason, /unblocks 3 dependent tasks/);
    });

    it('penalizes blocked tasks so they do not claim top execution slots', () => {
      const blockedTask = { taskId: 'tsk_blocked', status: 'Blocked' };
      assert.equal(calculateDependency(blockedTask, []).score, 20);
    });

    it('independent tasks receive neutral 50 score', () => {
      const independent = { taskId: 'tsk_solo', status: 'Planned' };
      assert.equal(calculateDependency(independent, []).score, 50);
    });
  });

  describe('Factor 5: Readiness', () => {
    it('readiness is 0 for blocked or completed tasks', () => {
      assert.equal(calculateReadiness({ status: 'Blocked' }).score, 0);
      assert.equal(calculateReadiness({ status: 'Completed' }).score, 0);
    });

    it('boosts readiness when task has clear next action and estimated duration', () => {
      const rawTask = { status: 'Planned' };
      const preparedTask = {
        status: 'Planned',
        nextAction: 'Write unit tests in vitest',
        estimatedDuration: 45,
        projectArea: 'AI Agent Dev'
      };

      const rawReadiness = calculateReadiness(rawTask).score;
      const preparedReadiness = calculateReadiness(preparedTask).score;
      assert.ok(preparedReadiness > rawReadiness, 'Prepared task must have higher readiness');
      assert.equal(preparedReadiness, 85);
    });
  });

  describe('Score Explanation & Manual Override', () => {
    it('generates complete factor breakdown and human-readable explanation', () => {
      const task = {
        taskId: 't_demo',
        title: 'Conduct Corporate Training Seminar',
        category: 'Corporate Training',
        status: 'Planned',
        dueDate: '2026-10-28',
        deadlineType: 'Hard',
        incomeImpact: 'High',
        nextAction: 'Review presentation slides',
        estimatedDuration: 120
      };

      const result = calculatePriorityScore(task, [task], [], refDate);
      assert.ok(result.score > 70);
      assert.ok(result.breakdown.urgency.weighted > 0);
      assert.ok(result.breakdown.incomeImpact.weighted > 0);
      assert.ok(result.breakdown.readiness.weighted > 0);
      assert.ok(result.summary.length > 20);
    });

    it('flags manual override when user flags Critical but calculated score is lower', () => {
      const task = {
        taskId: 't_override',
        title: 'Low urgency personal task flagged critical by user',
        priority: 'Critical',
        deadlineType: 'Flexible',
        incomeImpact: 'None',
        status: 'Planned'
      };

      const result = calculatePriorityScore(task, [], [], refDate);
      assert.ok(result.score < 80);
      assert.equal(result.isManualOverride, true);
    });
  });
});

