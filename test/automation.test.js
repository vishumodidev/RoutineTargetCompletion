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
  WORKFLOW_TYPES,
  PERMISSION_CATEGORIES,
  ACTION_STATUSES,
  WORKFLOW_DEFINITIONS,
  RESTRICTED_ACTIONS,
  validateActionPermission,
  generateIdempotencyKey,
  executeMorningPlanWorkflow,
  executeEveningReviewWorkflow,
  executeFollowupSuggestionsWorkflow,
  executeWeeklyReviewWorkflow
} = await import('../src/utils/automationEngine.js');

describe('Phase 8: Controlled Automation and Personal AI Agent Tests', () => {
  const TEST_USER = 'usr_auto_test_1';
  const OTHER_USER = 'usr_auto_test_2';

  beforeEach(() => {
    global.localStorage.clear();
    initMockDb();
  });

  describe('1. Permission Policy & Restricted Actions Enforcement', () => {
    it('should permanently reject all restricted actions regardless of user or context', () => {
      const forbiddenList = [
        'delete_task',
        'delete_review',
        'delete_plan',
        'send_email',
        'send_external_message',
        'execute_financial_tx',
        'modify_external_calendar',
        'delete_external_task'
      ];

      forbiddenList.forEach(action => {
        assert.ok(RESTRICTED_ACTIONS.has(action), `${action} must be in RESTRICTED_ACTIONS set`);
        assert.throws(() => {
          validateActionPermission(action, true);
        }, /Permanently restricted/);
      });
    });

    it('should strictly allow DRAFT operations without changing state', () => {
      const draftCheck = validateActionPermission('draft_daily_plan', false);
      assert.strictEqual(draftCheck.allowed, true);
      assert.strictEqual(draftCheck.category, PERMISSION_CATEGORIES.DRAFT);
      assert.strictEqual(draftCheck.requiresApproval, false);
    });

    it('should require explicit user approval for USER_APPROVED_WRITE actions', () => {
      // Unapproved write must be flagged as requiring approval
      const unapprovedCheck = validateActionPermission('create_task', false);
      assert.strictEqual(unapprovedCheck.allowed, false);
      assert.strictEqual(unapprovedCheck.category, PERMISSION_CATEGORIES.USER_APPROVED_WRITE);
      assert.strictEqual(unapprovedCheck.requiresApproval, true);

      // Approved write is allowed
      const approvedCheck = validateActionPermission('create_task', true);
      assert.strictEqual(approvedCheck.allowed, true);
      assert.strictEqual(approvedCheck.category, PERMISSION_CATEGORIES.USER_APPROVED_WRITE);
    });

    it('should generate predictable, collision-resistant idempotency keys', () => {
      const key1 = generateIdempotencyKey(WORKFLOW_TYPES.MORNING_PLAN, 'usr_1', '2026-10-29');
      const key2 = generateIdempotencyKey(WORKFLOW_TYPES.MORNING_PLAN, 'usr_1', '2026-10-29');
      const keyDiffUser = generateIdempotencyKey(WORKFLOW_TYPES.MORNING_PLAN, 'usr_2', '2026-10-29');

      assert.strictEqual(key1, key2);
      assert.notStrictEqual(key1, keyDiffUser);
      assert.strictEqual(key1, 'auto_auto_morning_plan_usr_1_2026-10-29');
    });
  });

  describe('2. Approved Workflow: Morning Planning Preparation', () => {
    it('should generate a proposed Big 5 draft without modifying persistent plans', () => {
      const sampleTasks = [
        { taskId: 't1', title: 'Critical Client Bug', priorityScore: 92, status: 'Not Started', estimatedDuration: 60 },
        { taskId: 't2', title: 'Prepare Tax Documents', priorityScore: 85, status: 'Not Started', estimatedDuration: 90 },
        { taskId: 't3', title: 'Team Sync Review', priorityScore: 65, status: 'Not Started', estimatedDuration: 45 }
      ];

      const res = executeMorningPlanWorkflow({
        tasks: sampleTasks,
        planDate: '2026-10-29',
        dayType: 'NORMAL'
      });

      assert.strictEqual(res.status, 'SUCCESS');
      assert.ok(res.draftPlan);
      assert.ok(res.draftPlan.recommendedTasks.length > 0);
      assert.strictEqual(res.draftPlan.recommendedTasks[0].taskId, 't1');
      assert.ok(res.summary.includes('Drafted Big 5 plan'));
    });

    it('should respect existing accepted plans and skip overwrite when unforced', () => {
      const existingPlan = {
        planId: 'plan_existing_123',
        planDate: '2026-10-29',
        isLocked: true,
        selectedTaskIds: ['t1', 't2']
      };

      const res = executeMorningPlanWorkflow({
        tasks: [{ taskId: 't1', title: 'Task 1', priorityScore: 90 }],
        existingPlan,
        overwriteAccepted: false
      });

      assert.strictEqual(res.status, 'SKIPPED');
      assert.strictEqual(res.action, 'PRESERVE_EXISTING');
      assert.strictEqual(res.draftPlan, existingPlan);
    });
  });

  describe('3. Approved Workflow: Evening Review Preparation', () => {
    it('should summarize planned vs completed tasks without fabricating completions', () => {
      const tasks = [
        { taskId: 't1', title: 'Completed Feature', status: 'Completed', estimatedDuration: 60 },
        { taskId: 't2', title: 'Incomplete Bugfix', status: 'In Progress', estimatedDuration: 45 },
        { taskId: 't3', title: 'Unstarted Docs', status: 'Not Started', estimatedDuration: 30 }
      ];

      const res = executeEveningReviewWorkflow({
        tasks,
        dailyPlan: { selectedTaskIds: ['t1', 't2', 't3'] },
        reviewDate: '2026-10-29'
      });

      assert.strictEqual(res.status, 'SUCCESS');
      assert.strictEqual(res.summaryMetrics.tasksPlanned, 3);
      assert.strictEqual(res.summaryMetrics.tasksCompleted, 1);
      assert.strictEqual(res.summaryMetrics.completionRate, 33);
      assert.strictEqual(res.proposedDeferrals.length, 2);
      assert.strictEqual(res.proposedDeferrals[0].taskId, 't2');
      assert.ok(res.draftReflection.includes('Completed 1 of 3'));
    });
  });

  describe('4. Approved Workflow: Follow-up Task Suggestions', () => {
    it('should propose actionable follow-ups for overdue or blocked tasks in PENDING_APPROVAL status', () => {
      const overdueDate = '2026-10-20';
      const tasks = [
        {
          taskId: 't_overdue',
          title: 'Renew Cloud Hosting Contract',
          dueDate: overdueDate,
          status: 'In Progress',
          estimatedDuration: 45
        },
        {
          taskId: 't_blocked',
          title: 'Deploy Production Release',
          status: 'Not Started',
          dependencies: 't_wait_for_qa',
          dueDate: '2026-11-01',
          estimatedDuration: 60
        },
        {
          taskId: 't_normal',
          title: 'Healthy Future Task',
          status: 'Not Started',
          dueDate: '2026-11-15'
        }
      ];

      const res = executeFollowupSuggestionsWorkflow({
        tasks,
        referenceDate: '2026-10-29'
      });

      assert.strictEqual(res.status, 'SUCCESS');
      assert.ok(res.pendingActions.length >= 2, 'Should propose follow-ups for overdue and blocked tasks');

      res.pendingActions.forEach(action => {
        assert.strictEqual(action.status, ACTION_STATUSES.PENDING_APPROVAL);
        assert.strictEqual(action.actionType, 'create_task');
        assert.strictEqual(action.permissionCategory, PERMISSION_CATEGORIES.USER_APPROVED_WRITE);
        assert.ok(action.actionPayload.title);
        assert.ok(action.actionPayload.reason);
      });

      // Verify zero tasks were written automatically
      const currentTasks = mockDb.getTasks(TEST_USER);
      assert.ok(!currentTasks.tasks.some(t => t.title.startsWith('Follow up:')));
    });
  });

  describe('5. Approved Workflow: Weekly Review Preparation', () => {
    it('should synthesize factual weekly metrics and next priorities without hallucination', () => {
      const tasks = [
        { taskId: 't1', title: 'Task A', status: 'Completed', estimatedDuration: 60, actualDuration: 75, updatedAt: '2026-10-28' },
        { taskId: 't2', title: 'Task B', status: 'Not Started', estimatedDuration: 45, dueDate: '2026-10-20', updatedAt: '2026-10-27' }
      ];

      const res = executeWeeklyReviewWorkflow({
        tasks,
        dailyPlans: [
          {
            planDate: '2026-10-28',
            selectedTaskIds: ['t1', 't2']
          }
        ],
        weekKey: '2026-W44',
        targetDateStr: '2026-10-29'
      });

      assert.strictEqual(res.status, 'SUCCESS');
      assert.ok(res.weeklyMetrics);
      assert.strictEqual(res.weeklyMetrics.tasksCompletedCount, 1);
      assert.strictEqual(res.weeklyMetrics.overdueCount, 1);
      assert.ok(res.draftWeeklyReview.reflectionText);
      assert.ok(res.draftWeeklyReview.nextWeekSuggestions.length > 0);
    });
  });

  describe('6. Automation DB Lifecycle, Approval Handling, and Isolation', () => {
    it('should record workflow executions and protect against duplicate execution via idempotencyKey', () => {
      const payload = {
        tasks: [{ taskId: 't1', title: 'Test Task', status: 'Not Started', priorityScore: 80 }],
        planDate: '2026-10-29'
      };

      const run1 = mockDb.executeAutomation(TEST_USER, WORKFLOW_TYPES.MORNING_PLAN, 'MANUAL', payload);
      assert.strictEqual(run1.success, true);
      assert.strictEqual(run1.run.status, 'COMPLETED');
      assert.ok(run1.run.runId);

      // Attempt second execution with same idempotency key
      const run2 = mockDb.executeAutomation(TEST_USER, WORKFLOW_TYPES.MORNING_PLAN, 'MANUAL', payload);
      assert.strictEqual(run2.success, true);
      assert.strictEqual(run2.isDuplicate, true);
      assert.strictEqual(run2.run.runId, run1.run.runId, 'Duplicate run must return existing runId');
    });

    it('should complete the full Human-in-the-Loop lifecycle: propose -> approve -> create task', () => {
      const overdueTask = {
        taskId: 't_exp',
        title: 'Review Expiring License',
        dueDate: '2026-10-20',
        status: 'Not Started',
        estimatedDuration: 30
      };

      // 1. Execute follow-up workflow which generates pending actions
      const runRes = mockDb.executeAutomation(TEST_USER, WORKFLOW_TYPES.FOLLOWUP_SUGGESTIONS, 'MANUAL', {
        tasks: [overdueTask],
        referenceDate: '2026-10-29'
      });

      assert.strictEqual(runRes.success, true);
      assert.strictEqual(runRes.run.status, 'PENDING_APPROVAL');
      assert.ok(runRes.run.pendingActions.length > 0);

      const actionToApprove = runRes.run.pendingActions[0];
      assert.strictEqual(actionToApprove.status, 'PENDING_APPROVAL');

      // 2. Fetch pending actions via getter
      const pendingList = mockDb.getPendingActions(TEST_USER);
      assert.ok(pendingList.pendingActions.some(a => a.actionId === actionToApprove.actionId));

      // 3. Approve action
      const approveRes = mockDb.approveAction(
        TEST_USER,
        runRes.run.runId,
        actionToApprove.actionId,
        actionToApprove.actionType,
        actionToApprove.actionPayload
      );

      assert.strictEqual(approveRes.success, true);
      assert.strictEqual(approveRes.action.status, 'APPROVED');

      // 4. Verify task was created in user backlog
      const userTasks = mockDb.getTasks(TEST_USER);
      const created = userTasks.tasks.find(t => t.title === actionToApprove.actionPayload.title);
      assert.ok(created, 'Approved task must now exist in user task backlog');
      assert.strictEqual(created.status, 'Not Started');
      assert.strictEqual(created.source, 'Controlled Automation');

      // 5. Verify action is no longer in pending list
      const updatedPending = mockDb.getPendingActions(TEST_USER);
      assert.ok(!updatedPending.pendingActions.some(a => a.actionId === actionToApprove.actionId));
    });

    it('should allow rejecting proposed actions without creating persistent tasks', () => {
      const overdueTask = {
        taskId: 't_unwanted',
        title: 'Optional Reading Material',
        dueDate: '2026-10-20',
        status: 'Not Started'
      };

      const runRes = mockDb.executeAutomation(TEST_USER, WORKFLOW_TYPES.FOLLOWUP_SUGGESTIONS, 'MANUAL', {
        tasks: [overdueTask],
        referenceDate: '2026-10-29'
      });

      const actionToReject = runRes.run.pendingActions[0];

      const rejectRes = mockDb.rejectAction(TEST_USER, runRes.run.runId, actionToReject.actionId);
      assert.strictEqual(rejectRes.success, true);
      assert.strictEqual(rejectRes.action.status, 'REJECTED');

      // Verify task was NOT created
      const userTasks = mockDb.getTasks(TEST_USER);
      assert.ok(!userTasks.tasks.some(t => t.title === actionToReject.actionPayload.title));
    });

    it('should enforce user isolation and reject cross-user action approvals', () => {
      const overdueTask = {
        taskId: 't_isolated',
        title: 'Confidential Task User 1',
        dueDate: '2026-10-20',
        status: 'Not Started'
      };

      const runRes = mockDb.executeAutomation(TEST_USER, WORKFLOW_TYPES.FOLLOWUP_SUGGESTIONS, 'MANUAL', {
        tasks: [overdueTask],
        referenceDate: '2026-10-29'
      });

      const action = runRes.run.pendingActions[0];

      // Other user attempts to approve User 1's action
      assert.throws(() => {
        mockDb.approveAction(
          OTHER_USER,
          runRes.run.runId,
          action.actionId,
          action.actionType,
          action.actionPayload
        );
      }, /Action does not belong to user/);
    });
  });
});
