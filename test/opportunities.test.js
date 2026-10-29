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
const { calculatePriorityScore, calculateIncomeImpact, calculateDeadlineUrgency } = await import('../src/utils/priorityEngine.js');
const { calculatePipelineForecast } = await import('../src/utils/forecastEngine.js');
const { aggregateWeeklyMetrics } = await import('../src/utils/reviewAggregator.js');

describe('Opportunity Pipeline & Forecasting Tests', () => {
  beforeEach(() => {
    global.localStorage.clear();
    initMockDb();
  });

  describe('Step 2: Opportunity Data Model & CRUD Validation', () => {
    it('should reject opportunity when title and clientName are missing or blank', () => {
      assert.throws(() => {
        mockDb.saveOpportunity('usr_test', { title: '', clientName: '' });
      }, /Opportunity title/);

      assert.throws(() => {
        mockDb.saveOpportunity('usr_test', { title: '   ' });
      }, /Opportunity title/);
    });

    it('should reject negative opportunity values', () => {
      assert.throws(() => {
        mockDb.saveOpportunity('usr_test', { title: 'Invalid Deal', value: -500 });
      }, /Opportunity value must be greater than or equal to 0/);
    });

    it('should successfully create an opportunity with normalized defaults and probabilities', () => {
      const opp = mockDb.saveOpportunity('usr_test', {
        title: 'Enterprise AI Pilot',
        contactName: 'Rajesh Sharma',
        source: 'LinkedIn',
        stage: 'Proposals',
        value: 120000,
        expectedCloseDate: '2026-11-15'
      });

      assert.ok(opp.id.startsWith('opp_'));
      assert.equal(opp.userId, 'usr_test');
      assert.equal(opp.title, 'Enterprise AI Pilot');
      assert.equal(opp.clientName, 'Enterprise AI Pilot');
      assert.equal(opp.stage, 'Proposals');
      assert.equal(opp.value, 120000);
      assert.equal(opp.probability, 70); // Default for Proposals is 70%
      assert.equal(opp.status, 'Open');
      assert.ok(opp.createdAt);
      assert.ok(opp.updatedAt);
    });

    it('should update stage and adjust probability automatically when not manually overridden', () => {
      const created = mockDb.saveOpportunity('usr_test', {
        title: 'Consulting Contract',
        stage: 'Meetings',
        value: 50000
      });

      assert.equal(created.probability, 50);

      const updated = mockDb.saveOpportunity('usr_test', {
        id: created.id,
        stage: 'Confirmed'
      });

      assert.equal(updated.stage, 'Confirmed');
      assert.equal(updated.probability, 100);
      assert.equal(updated.status, 'Won');
    });

    it('should enforce multi-user isolation on read, update, and delete', () => {
      const user1Opp = mockDb.saveOpportunity('usr_1', {
        title: 'User 1 Deal',
        stage: 'Negotiations',
        value: 80000
      });

      // User 2 cannot see User 1's opportunity
      const user2List = mockDb.getOpportunities('usr_2');
      assert.equal(user2List.opportunities.some(o => o.id === user1Opp.id), false);

      // User 2 cannot update User 1's opportunity
      assert.throws(() => {
        mockDb.saveOpportunity('usr_2', {
          id: user1Opp.id,
          title: 'Hacked Deal'
        });
      }, /Unauthorized/);

      // User 2 cannot delete User 1's opportunity
      assert.throws(() => {
        mockDb.deleteOpportunity('usr_2', user1Opp.id);
      }, /Unauthorized/);

      // User 1 can delete their own opportunity
      const deleted = mockDb.deleteOpportunity('usr_1', user1Opp.id);
      assert.equal(deleted.success, true);
    });
  });

  describe('Step 3: Connecting Opportunities to Tasks & Priority Scoring', () => {
    it('should allow creating a task with linkedOpportunityId and persist it', () => {
      const opp = mockDb.saveOpportunity('usr_test', {
        title: 'FinTech Deal',
        stage: 'Proposals',
        value: 95000,
        expectedCloseDate: '2026-11-20'
      });

      const taskRes = mockDb.saveTask('usr_test', {
        title: 'Prepare final pricing deck',
        linkedOpportunityId: opp.id,
        estimatedDuration: 45
      });
      const task = taskRes.task;

      assert.equal(task.linkedOpportunityId, opp.id);

      const retrievedTasks = mockDb.getTasks('usr_test');
      const retrieved = retrievedTasks.tasks.find(t => t.taskId === task.taskId);
      assert.ok(retrieved);
      assert.equal(retrieved.linkedOpportunityId, opp.id);
    });

    it('should elevate income impact for tasks linked to high-value opportunities', () => {
      const highOpp = {
        id: 'opp_high_1',
        title: 'Mega Client',
        stage: 'Negotiations',
        value: 100000
      };

      const midOpp = {
        id: 'opp_mid_1',
        title: 'Mid Client',
        stage: 'Meetings',
        value: 40000
      };

      const taskHigh = {
        taskId: 't_high',
        title: 'Send contract draft',
        linkedOpportunityId: 'opp_high_1',
        incomeImpact: 'None'
      };

      const taskMid = {
        taskId: 't_mid',
        title: 'Follow-up email',
        linkedOpportunityId: 'opp_mid_1',
        incomeImpact: 'None'
      };

      const highImpact = calculateIncomeImpact(taskHigh, [highOpp, midOpp]);
      const midImpact = calculateIncomeImpact(taskMid, [highOpp, midOpp]);

      assert.equal(highImpact.score, 95); // Deal >= 80,000 gets 95
      assert.equal(midImpact.score, 80);  // Deal >= 35,000 gets 80
      assert.match(highImpact.reason, /1,00,000|100,000/);
    });

    it('should award 100 score to task linked to Confirmed/Won opportunity', () => {
      const confirmedOpp = {
        id: 'opp_conf',
        title: 'Signed Deal',
        stage: 'Confirmed',
        value: 50000
      };

      const task = {
        taskId: 't_conf',
        title: 'Onboarding kickoff',
        linkedOpportunityId: 'opp_conf'
      };

      const impact = calculateIncomeImpact(task, [confirmedOpp]);
      assert.equal(impact.score, 100);
      assert.match(impact.reason, /confirmed/i);
    });

    it('should inherit expected close date as deadline urgency when task has no explicit due date', () => {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      const urgentOpp = {
        id: 'opp_urg',
        title: 'Imminent Deal',
        expectedCloseDate: tomorrow
      };

      const taskWithInheritedDate = {
        taskId: 't_urg',
        title: 'Close the agreement',
        linkedOpportunityId: 'opp_urg'
        // dueDate intentionally omitted
      };

      const urgency = calculateDeadlineUrgency(taskWithInheritedDate, [urgentOpp]);
      assert.equal(urgency.isInheritedDeadline, true);
      assert.ok(urgency.score >= 65);
      assert.match(urgency.reason, /deal "Imminent Deal" close date/i);
    });

    it('should elevate overall priority score when linked to an opportunity', () => {
      const opp = {
        id: 'opp_scale',
        title: 'Strategic Account',
        stage: 'Proposals',
        value: 90000,
        expectedCloseDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
      };

      const unlinkedTask = {
        taskId: 't_1',
        title: 'Review proposal presentation',
        category: 'Business Development',
        importance: 50,
        urgency: 50
      };

      const linkedTask = {
        ...unlinkedTask,
        taskId: 't_2',
        linkedOpportunityId: 'opp_scale'
      };

      const unlinkedScore = calculatePriorityScore(unlinkedTask, [unlinkedTask], [], []);
      const linkedScore = calculatePriorityScore(linkedTask, [linkedTask], [], [opp]);

      assert.ok(
        linkedScore.score > unlinkedScore.score,
        `Linked score (${linkedScore.score}) should exceed unlinked score (${unlinkedScore.score})`
      );
      assert.ok(linkedScore.breakdown.incomeImpact.raw >= 95);
    });
  });

  describe('Step 4: Pipeline Forecasts & Zero Conflation with Actual Revenue', () => {
    it('must strictly separate confirmed revenue from open and weighted pipeline values', () => {
      const opportunities = [
        {
          id: '1',
          title: 'Delivered Training',
          stage: 'Confirmed',
          value: 80000,
          probability: 100
        },
        {
          id: '2',
          title: 'Upcoming Workshop',
          stage: 'Confirmed',
          value: 20000,
          probability: 100
        },
        {
          id: '3',
          title: 'Proposal Sent',
          stage: 'Proposals',
          value: 100000,
          probability: 70
        },
        {
          id: '4',
          title: 'Initial Discovery',
          stage: 'New Leads',
          value: 50000,
          probability: 10
        },
        {
          id: '5',
          title: 'Cancelled Opportunity',
          stage: 'Lost',
          value: 60000,
          probability: 0
        }
      ];

      const forecast = calculatePipelineForecast(opportunities, '2026-10-29');

      // 1. Actual revenue is strictly the sum of confirmed deals (80,000 + 20,000 = 100,000)
      assert.equal(forecast.actualRevenue, 100000);

      // 2. Open pipeline total is the sum of open unconfirmed deals (100,000 + 50,000 = 150,000)
      assert.equal(forecast.openPipelineTotal, 150000);

      // 3. Probability-weighted pipeline is (100,000 * 0.70) + (50,000 * 0.10) = 70,000 + 5,000 = 75,000
      assert.equal(forecast.weightedPipelineForecast, 75000);

      // 4. Lost deals must contribute 0 to actual revenue, open pipeline, and weighted forecast
      assert.equal(forecast.lostDealsCount, 1);
      assert.equal(forecast.wonDealsCount, 2);
      assert.equal(forecast.activeDealsCount, 2);

      // 5. Total deals
      assert.equal(forecast.totalDealsCount, 5);

      // 6. Win rate = 2 won / (2 won + 1 lost) = 66.67% -> 67%
      assert.equal(forecast.winRatePercent, 67);
    });

    it('should accurately detect overdue opportunities past expected close date', () => {
      const opportunities = [
        {
          id: 'opp_overdue',
          title: 'Stalled Contract',
          stage: 'Negotiations',
          value: 45000,
          expectedCloseDate: '2026-10-15' // In the past relative to referenceDate 2026-10-29
        },
        {
          id: 'opp_future',
          title: 'Future Contract',
          stage: 'Negotiations',
          value: 60000,
          expectedCloseDate: '2026-11-15'
        },
        {
          id: 'opp_won_past',
          title: 'Already Won',
          stage: 'Confirmed',
          value: 75000,
          expectedCloseDate: '2026-10-10'
        }
      ];

      const forecast = calculatePipelineForecast(opportunities, '2026-10-29');

      assert.equal(forecast.overdueDeals.length, 1);
      assert.equal(forecast.overdueDeals[0].id, 'opp_overdue');
      assert.equal(forecast.overdueDeals[0].daysPast, 14);
    });

    it('should seamlessly integrate opportunity forecast metrics into weekly review aggregator', () => {
      const tasks = [
        {
          taskId: 't1',
          title: 'Sales call',
          status: 'Completed',
          category: 'Business Development',
          estimatedDuration: 60,
          completedAt: '2026-10-28T10:00:00Z'
        }
      ];

      const dailyPlans = [];
      const reviews = [];
      const goals = [];
      const opportunities = [
        {
          id: 'opp_won',
          title: 'Won Deal',
          stage: 'Confirmed',
          value: 50000
        },
        {
          id: 'opp_pipe',
          title: 'Pipeline Lead',
          stage: 'Proposals',
          value: 80000,
          probability: 70
        }
      ];

      const weekly = aggregateWeeklyMetrics(
        tasks,
        dailyPlans,
        reviews,
        goals,
        '2026-10-26',
        '2026-11-01',
        opportunities
      );

      assert.ok(weekly.pipelineForecast);
      assert.equal(weekly.pipelineForecast.actualRevenue, 50000);
      assert.equal(weekly.pipelineForecast.openPipelineTotal, 80000);
      assert.equal(weekly.pipelineForecast.weightedPipelineForecast, 56000); // 80000 * 0.70
    });
  });
});
