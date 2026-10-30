import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

/**
 * Isolated Google Apps Script Mock Environment
 * Emulates SpreadsheetApp, ContentService, Utilities, PropertiesService & UrlFetchApp
 * to test backend/Code.js business logic, validation, and data integrity with 100% safety.
 */
class MockSheet {
  constructor(name) {
    this.name = name;
    this.data = []; // Clean empty sheet before getOrCreateSheet appends headers
  }

  getName() {
    return this.name;
  }

  getDataRange() {
    return {
      getValues: () => this.data.map(row => [...row])
    };
  }

  appendRow(rowArray) {
    this.data.push([...rowArray]);
  }

  getRange(rowNum, colNum) {
    return {
      setValue: (val) => {
        if (this.data[rowNum - 1]) {
          this.data[rowNum - 1][colNum - 1] = val;
        }
      }
    };
  }

  deleteRow(rowNum) {
    if (rowNum >= 1 && rowNum <= this.data.length) {
      this.data.splice(rowNum - 1, 1);
    }
  }
}

class MockSpreadsheet {
  constructor() {
    this.sheets = {};
  }

  getSheetByName(name) {
    return this.sheets[name] || null;
  }

  insertSheet(name) {
    const sheet = new MockSheet(name);
    this.sheets[name] = sheet;
    return sheet;
  }
}

function createAppsScriptSandbox() {
  const mockSs = new MockSpreadsheet();

  const sandbox = {
    SPREADSHEET_ID: 'mock_spreadsheet_test_id',
    SpreadsheetApp: {
      openById: () => mockSs,
      getActiveSpreadsheet: () => mockSs
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => ({
        setMimeType: () => ({
          _raw: text,
          getContent: () => text
        }),
        _raw: text,
        getContent: () => text
      })
    },
    Utilities: {
      getUuid: () => 'uuid_' + Math.random().toString(36).substr(2, 9)
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: () => 'mock_gemini_key'
      })
    },
    UrlFetchApp: {
      fetch: () => ({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"analysis":"Mock AI"}' }] } }]
        })
      })
    },
    console: {
      log: () => {},
      warn: () => {},
      error: () => {}
    },
    Date: Date,
    JSON: JSON,
    Math: Math,
    String: String,
    Number: Number,
    Array: Array,
    Object: Object
  };

  const codePath = path.resolve(process.cwd(), 'backend/Code.js');
  const codeContent = fs.readFileSync(codePath, 'utf8');

  const context = vm.createContext(sandbox);
  vm.runInContext(codeContent, context);

  return { context, mockSs };
}

function parseOutput(res) {
  assert.ok(res, 'Response must not be null');
  const raw = res._raw || (typeof res.getContent === 'function' ? res.getContent() : String(res));
  return JSON.parse(raw);
}

describe('Phase F: Backend (Code.js) and Data Integrity Tests', () => {
  let ctx, mockSs;

  beforeEach(() => {
    const sandbox = createAppsScriptSandbox();
    ctx = sandbox.context;
    mockSs = sandbox.mockSs;
  });

  describe('1. Schema Alignment and Sheet Headers Verification', () => {
    it('should initialize all 15 sheets with schemas matching documentation', () => {
      const sheets = ctx.SHEETS;
      assert.ok(sheets.USERS);
      assert.ok(sheets.HABITS);
      assert.ok(sheets.LOGS);
      assert.ok(sheets.ACHIEVEMENTS);
      assert.ok(sheets.ROUTINE_LOGS);
      assert.ok(sheets.INVESTMENT_PROFILE);
      assert.ok(sheets.INVESTMENT_FUNDS);
      assert.ok(sheets.MONTHLY_BUDGETS);
      assert.ok(sheets.FINANCIAL_GOALS);
      assert.ok(sheets.TRANSACTIONS);
      assert.ok(sheets.TASKS);
      assert.ok(sheets.DAILY_PLANS);
      assert.ok(sheets.REVIEWS);
      assert.ok(sheets.AUTOMATION_RUNS);
      assert.ok(sheets.OPPORTUNITIES);

      // Verify task headers match Task schema
      const taskHeaders = Array.from(sheets.TASKS.headers);
      assert.deepEqual(taskHeaders, [
        "TaskID", "UserID", "Title", "Description", "Category", "ProjectArea", 
        "LinkedGoalID", "LinkedOpportunityID", "Priority", "Status", 
        "EstimatedDuration", "ActualDuration", "StartDate", "DueDate", 
        "DeadlineType", "Dependencies", "IncomeImpact", "Importance", 
        "Urgency", "Readiness", "NextAction", "Recurrence", "Source", 
        "ExternalID", "CreatedAt", "UpdatedAt", "CompletedAt"
      ]);

      // Verify daily plan headers match Daily Plan schema
      const dailyPlanHeaders = Array.from(sheets.DAILY_PLANS.headers);
      assert.deepEqual(dailyPlanHeaders, [
        "PlanID", "UserID", "PlanDate", "DayType", "AvailableMinutes", 
        "PlannedMinutes", "SelectedTaskIDs", "TaskOrder", "AcceptanceStatuses", 
        "DeferredTasksJSON", "SelectionRationale", "CreatedAt", "UpdatedAt"
      ]);

      // Verify review headers
      const reviewHeaders = Array.from(sheets.REVIEWS.headers);
      assert.deepEqual(reviewHeaders, [
        "ReviewID", "UserID", "ReviewType", "PeriodKey", "LinkedPlanID", 
        "MetricsJSON", "ReflectionText", "DeferralsJSON", "NextStepsJSON", 
        "CreatedAt", "UpdatedAt"
      ]);
    });
  });

  describe('2. Request Dispatching and Input Validation (doGet & doPost)', () => {
    it('doGet should reject requests missing the action parameter', () => {
      const res = parseOutput(ctx.doGet({ parameter: {} }));
      assert.equal(res.success, false);
      assert.match(res.error, /Missing action parameter/);
    });

    it('doGet should reject invalid or unknown actions', () => {
      const res = parseOutput(ctx.doGet({ parameter: { action: 'unknownAction', userId: 'u1' } }));
      assert.equal(res.success, false);
      assert.match(res.error, /Invalid action/);
    });

    it('doGet should enforce required userId parameter', () => {
      const res = parseOutput(ctx.doGet({ parameter: { action: 'tasks' } }));
      assert.equal(res.success, false);
      assert.match(res.error, /Missing userId parameter/);
    });

    it('doPost should reject requests missing the action payload', () => {
      const res = parseOutput(ctx.doPost({ postData: { contents: JSON.stringify({}) } }));
      assert.equal(res.success, false);
      assert.match(res.error, /Missing action payload/);
    });

    it('doPost should reject unknown POST actions', () => {
      const res = parseOutput(ctx.doPost({ postData: { contents: JSON.stringify({ action: 'evilCommand' }) } }));
      assert.equal(res.success, false);
      assert.match(res.error, /Invalid POST action/);
    });
  });

  describe('3. User Authentication & Authorization Controllers', () => {
    it('register should create a user and reject duplicate email registrations', () => {
      // 1. Register user
      const regRes = parseOutput(ctx.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'register',
            name: 'Backend Dev',
            email: 'backend@test.com',
            password: 'secretPassword'
          })
        }
      }));

      assert.equal(regRes.success, true);
      assert.ok(regRes.user.userId);
      assert.equal(regRes.user.email, 'backend@test.com');
      assert.equal(regRes.user.xp, 0);
      assert.equal(regRes.user.level, 1);

      // 2. Register same email should be rejected
      const dupRes = parseOutput(ctx.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'register',
            name: 'Duplicate',
            email: 'backend@test.com',
            password: 'anotherPassword'
          })
        }
      }));

      assert.equal(dupRes.success, false);
      assert.match(dupRes.error, /Email already registered/);
    });

    it('login should authenticate with correct credentials and reject wrong password', () => {
      // Register first
      ctx.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'register',
            name: 'Auth User',
            email: 'auth@test.com',
            password: 'correctPass'
          })
        }
      });

      // Login success
      const successLogin = parseOutput(ctx.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'login',
            email: 'auth@test.com',
            password: 'correctPass'
          })
        }
      }));
      assert.equal(successLogin.success, true);
      assert.equal(successLogin.user.name, 'Auth User');

      // Login failure: wrong password
      const failLogin = parseOutput(ctx.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'login',
            email: 'auth@test.com',
            password: 'wrongPassword'
          })
        }
      }));
      assert.equal(failLogin.success, false);
      assert.match(failLogin.error, /Invalid password/);
    });
  });

  describe('4. Task CRUD, Status Transitions & Validation', () => {
    const TEST_USER = 'usr_backend_test';

    it('saveTask should require task title and persist to Tasks sheet', () => {
      // Empty title rejection
      const emptyRes = parseOutput(ctx.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'saveTask',
            userId: TEST_USER,
            task: { title: '' }
          })
        }
      }));
      assert.equal(emptyRes.success, false);
      assert.match(emptyRes.error, /Task title is required/);

      // Successful task creation
      const saveRes = parseOutput(ctx.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'saveTask',
            userId: TEST_USER,
            task: {
              title: 'Build Apps Script Integration Tests',
              category: 'Coding',
              priority: 'High',
              status: 'Backlog',
              incomeImpact: 'High',
              estimatedDuration: 60
            }
          })
        }
      }));

      assert.equal(saveRes.success, true);
      assert.ok(saveRes.task.taskId.startsWith('tsk_'));
      assert.equal(saveRes.task.title, 'Build Apps Script Integration Tests');

      // Verify retrieval via doGet
      const getRes = parseOutput(ctx.doGet({
        parameter: {
          action: 'tasks',
          userId: TEST_USER
        }
      }));

      assert.equal(getRes.success, true);
      assert.equal(getRes.tasks.length, 1);
      assert.equal(getRes.tasks[0].title, 'Build Apps Script Integration Tests');
    });

    it('saveTask should update existing task and record CompletedAt on completion', () => {
      // Create task
      const createRes = parseOutput(ctx.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'saveTask',
            userId: TEST_USER,
            task: { title: 'Complete Task', status: 'In Progress' }
          })
        }
      }));
      const taskId = createRes.task.taskId;

      // Update to completed
      const updateRes = parseOutput(ctx.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'saveTask',
            userId: TEST_USER,
            task: { taskId, title: 'Complete Task', status: 'Completed' }
          })
        }
      }));

      assert.equal(updateRes.success, true);
      assert.equal(updateRes.task.status, 'Completed');
      assert.ok(updateRes.task.completedAt, 'completedAt must be populated');

      // Delete task
      const delRes = parseOutput(ctx.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'deleteTask',
            userId: TEST_USER,
            taskId
          })
        }
      }));
      assert.equal(delRes.success, true);

      // Verify deleted
      const checkRes = parseOutput(ctx.doGet({
        parameter: { action: 'tasks', userId: TEST_USER }
      }));
      assert.equal(checkRes.tasks.length, 0);
    });
  });

  describe('5. Daily Plans and Review Persistence', () => {
    const TEST_USER = 'usr_backend_plan';
    const PLAN_DATE = '2026-10-30';

    it('saveDailyPlan and getDailyPlan should persist and retrieve daily plan state', () => {
      const planRes = parseOutput(ctx.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'saveDailyPlan',
            userId: TEST_USER,
            plan: {
              planDate: PLAN_DATE,
              dayType: 'INTENSIVE FOCUS DAY',
              availableMinutes: 540,
              plannedMinutes: 360,
              selectedTaskIds: ['tsk_1', 'tsk_2'],
              taskOrder: ['tsk_1', 'tsk_2'],
              acceptanceStatuses: { tsk_1: true, tsk_2: true },
              selectionRationale: 'Deterministic Priority Algorithm'
            }
          })
        }
      }));

      assert.equal(planRes.success, true);
      assert.equal(planRes.plan.planDate, PLAN_DATE);

      // Retrieve plan
      const getPlan = parseOutput(ctx.doGet({
        parameter: {
          action: 'dailyPlan',
          userId: TEST_USER,
          date: PLAN_DATE
        }
      }));

      assert.equal(getPlan.success, true);
      assert.ok(getPlan.plan);
      assert.equal(getPlan.plan.dayType, 'INTENSIVE FOCUS DAY');
      assert.deepEqual(getPlan.plan.selectedTaskIds, ['tsk_1', 'tsk_2']);
    });

    it('saveReview and getReview should persist and retrieve structured reviews', () => {
      const revRes = parseOutput(ctx.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'saveReview',
            userId: TEST_USER,
            review: {
              reviewType: 'EVENING',
              periodKey: PLAN_DATE,
              metrics: { planned: 2, completed: 2, completionRate: 100 },
              reflectionText: 'Great focus day, accomplished key deliverables.',
              deferrals: []
            }
          })
        }
      }));

      assert.equal(revRes.success, true);
      assert.equal(revRes.review.periodKey, PLAN_DATE);

      const getRev = parseOutput(ctx.doGet({
        parameter: {
          action: 'review',
          userId: TEST_USER,
          type: 'EVENING',
          periodKey: PLAN_DATE
        }
      }));

      assert.equal(getRev.success, true);
      assert.ok(getRev.review);
      assert.equal(getRev.review.reflectionText, 'Great focus day, accomplished key deliverables.');
      assert.equal(getRev.review.metrics.completionRate, 100);
    });
  });

  describe('6. Automation Runs & Human-in-the-Loop Approval', () => {
    const TEST_USER = 'usr_auto_test';

    it('approveAction should categorically reject RESTRICTED actions', () => {
      const res = parseOutput(ctx.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'approveAction',
            userId: TEST_USER,
            runId: 'run_123',
            actionId: 'act_123',
            actionType: 'financial_transaction',
            actionPayload: { amount: 1000 }
          })
        }
      }));

      assert.equal(res.success, false);
      assert.match(res.error, /is categorically RESTRICTED by policy/);

      const emailRes = parseOutput(ctx.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'approveAction',
            userId: TEST_USER,
            runId: 'run_123',
            actionId: 'act_123',
            actionType: 'send_email',
            actionPayload: { to: 'victim@example.com' }
          })
        }
      }));

      assert.equal(emailRes.success, false);
      assert.match(emailRes.error, /is categorically RESTRICTED by policy/);
    });

    it('approveAction should enforce user ownership and execute approved actions', () => {
      // 1. Simulate an automation run with a pending USER_APPROVED_WRITE action
      const autoSheet = ctx.getAutomationRunsSheet();
      const runId = 'run_test_123';
      const actionId = 'act_create_followup';
      const pendingActions = [
        {
          actionId,
          type: 'create_task',
          status: 'PENDING_APPROVAL',
          proposedTask: { title: 'Approved Follow-up Task', category: 'General' }
        }
      ];

      ctx.insertRow(
        autoSheet,
        {
          RunID: runId,
          UserID: TEST_USER,
          AutomationID: 'auto_followup',
          WorkflowType: 'FOLLOW_UP_SUGGESTIONS',
          TriggerType: 'MANUAL',
          Status: 'PENDING_APPROVAL',
          IdempotencyKey: 'key_123',
          DraftOutputJSON: '{}',
          PendingActionsJSON: JSON.stringify(pendingActions),
          ExecutedActionsJSON: '[]',
          ErrorMessage: '',
          StartedAt: new Date().toISOString(),
          CompletedAt: ''
        },
        ctx.SHEETS.AUTOMATION_RUNS.headers
      );

      // 2. Reject cross-user approval attempt by User B
      const unauthorizedRes = parseOutput(ctx.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'approveAction',
            userId: 'usr_malicious_attacker',
            runId,
            actionId,
            actionType: 'create_task',
            actionPayload: { title: 'Hacked Task' }
          })
        }
      }));
      assert.equal(unauthorizedRes.success, false);
      assert.match(unauthorizedRes.error, /Unauthorized: cannot approve another user's action/);

      // 3. Non-existent run rejection
      const notFoundRes = parseOutput(ctx.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'approveAction',
            userId: TEST_USER,
            runId: 'non_existent_run_id',
            actionId,
            actionType: 'create_task'
          })
        }
      }));
      assert.equal(notFoundRes.success, false);
      assert.match(notFoundRes.error, /Automation run not found/);

      // 4. Authorized approval by TEST_USER succeeds
      const approveRes = parseOutput(ctx.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'approveAction',
            userId: TEST_USER,
            runId,
            actionId,
            actionType: 'create_task',
            actionPayload: { title: 'Approved Follow-up Task', category: 'General' }
          })
        }
      }));

      assert.equal(approveRes.success, true);
      assert.equal(approveRes.status, 'EXECUTED');

      // 5. Verify task was created in Tasks sheet
      const tasksRes = parseOutput(ctx.doGet({
        parameter: { action: 'tasks', userId: TEST_USER }
      }));
      assert.equal(tasksRes.tasks.length, 1);
      assert.equal(tasksRes.tasks[0].title, 'Approved Follow-up Task');
    });
  });

  describe('7. Cross-Tenant Data Isolation in Backend', () => {
    it('User A must NEVER see or modify User B records across all endpoints', () => {
      const USER_A = 'usr_alice';
      const USER_B = 'usr_bob';

      // 1. Alice creates a habit and an opportunity
      ctx.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'createHabit',
            userId: USER_A,
            habitName: 'Alice Secret Habit',
            category: 'Personal',
            xpReward: 10
          })
        }
      });

      ctx.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'saveOpportunity',
            userId: USER_A,
            oppData: { title: 'Alice Multi-Million Deal', value: 5000000 }
          })
        }
      });

      // 2. Bob queries habits and opportunities
      const bobHabits = parseOutput(ctx.doGet({
        parameter: { action: 'habits', userId: USER_B }
      }));
      assert.equal(bobHabits.habits.length, 0, 'Bob must see 0 habits');

      const bobOpps = parseOutput(ctx.doGet({
        parameter: { action: 'opportunities', userId: USER_B }
      }));
      assert.equal(bobOpps.opportunities.length, 0, 'Bob must see 0 opportunities');

      // 3. Bob attempts to delete Alice opportunity
      const aliceOpps = parseOutput(ctx.doGet({
        parameter: { action: 'opportunities', userId: USER_A }
      }));
      assert.equal(aliceOpps.opportunities.length, 1);
      const aliceOppId = aliceOpps.opportunities[0].opportunityId;

      ctx.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'deleteOpportunity',
            userId: USER_B,
            oppId: aliceOppId
          })
        }
      });

      // Alice opportunity must remain untouched
      const aliceOppsAfter = parseOutput(ctx.doGet({
        parameter: { action: 'opportunities', userId: USER_A }
      }));
      assert.equal(aliceOppsAfter.opportunities.length, 1, 'Alice opportunity must not be deleted by Bob');
    });
  });
});
