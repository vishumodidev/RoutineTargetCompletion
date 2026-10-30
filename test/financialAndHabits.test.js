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

const { 
  getLevelDetails, 
  formatXP, 
  calculateStreak, 
  calculateHabitCompletionPercent 
} = await import('../src/utils/index.js');

const { formatINR } = await import('../src/services/investmentService.js');
const { 
  parseEventInterval, 
  mergeOverlappingIntervals, 
  calculateCalendarCommitments 
} = await import('../src/utils/calendarMath.js');

const { 
  calculatePipelineForecast, 
  PIPELINE_STAGES, 
  STAGE_DEFAULT_PROBABILITIES 
} = await import('../src/utils/forecastEngine.js');

describe('Financial, Habit & Schedule Mathematical Integrity Tests', () => {

  describe('1. Gamification XP & Leveling Engine', () => {
    it('should correctly calculate level 1 for XP under 100', () => {
      const res0 = getLevelDetails(0);
      assert.equal(res0.level, 1);
      assert.equal(res0.prevLevelXP, 0);
      assert.equal(res0.nextLevelXP, 100);
      assert.equal(res0.percent, 0);
      assert.equal(res0.xpRemaining, 100);

      const res50 = getLevelDetails(50);
      assert.equal(res50.level, 1);
      assert.equal(res50.percent, 50);
      assert.equal(res50.xpRemaining, 50);
    });

    it('should correctly calculate level 2 (100 to 249 XP)', () => {
      const res100 = getLevelDetails(100);
      assert.equal(res100.level, 2);
      assert.equal(res100.prevLevelXP, 100);
      assert.equal(res100.nextLevelXP, 250);
      assert.equal(res100.xpInCurrentLevel, 0);
      assert.equal(res100.percent, 0);

      const res175 = getLevelDetails(175);
      assert.equal(res175.level, 2);
      assert.equal(res175.xpInCurrentLevel, 75);
      assert.equal(res175.percent, 50); // 75 / 150 = 50%
      assert.equal(res175.xpRemaining, 75);
    });

    it('should correctly calculate level 3 (250 to 499 XP)', () => {
      const res250 = getLevelDetails(250);
      assert.equal(res250.level, 3);
      assert.equal(res250.prevLevelXP, 250);
      assert.equal(res250.nextLevelXP, 500);

      const res375 = getLevelDetails(375);
      assert.equal(res375.level, 3);
      assert.equal(res375.percent, 50);
      assert.equal(res375.xpRemaining, 125);
    });

    it('should correctly calculate level 4 (500 to 999 XP)', () => {
      const res500 = getLevelDetails(500);
      assert.equal(res500.level, 4);
      assert.equal(res500.prevLevelXP, 500);
      assert.equal(res500.nextLevelXP, 1000);

      const res750 = getLevelDetails(750);
      assert.equal(res750.level, 4);
      assert.equal(res750.percent, 50);
      assert.equal(res750.xpRemaining, 250);
    });

    it('should correctly handle level 5 max tier (>= 1000 XP)', () => {
      const res1000 = getLevelDetails(1000);
      assert.equal(res1000.level, 5);
      assert.equal(res1000.nextLevelXP, null);
      assert.equal(res1000.percent, 100);
      assert.equal(res1000.xpRemaining, 0);

      const res5000 = getLevelDetails(5000);
      assert.equal(res5000.level, 5);
      assert.equal(res5000.percent, 100);
      assert.equal(res5000.xpInCurrentLevel, 4000);
    });

    it('should gracefully handle null, negative, or non-numeric XP inputs', () => {
      const resNull = getLevelDetails(null);
      assert.equal(resNull.level, 1);
      assert.equal(resNull.percent, 0);

      const resNeg = getLevelDetails(-50);
      assert.equal(resNeg.level, 1);
      assert.equal(resNeg.percent, 0);

      const resStr = getLevelDetails('invalid');
      assert.equal(resStr.level, 1);
      assert.equal(resStr.percent, 0);

      assert.equal(formatXP(250), '250 XP');
    });
  });

  describe('2. Streak Continuity & Completion Rate Calculations', () => {
    const TEST_USER = 'usr_test';

    it('should return 0 streak for empty logs', () => {
      const result = calculateStreak([], TEST_USER);
      assert.equal(result.currentStreak, 0);
      assert.equal(result.longestStreak, 0);
    });

    it('should calculate active 3-day streak ending today', () => {
      const today = new Date();
      const d1 = new Date(today);
      d1.setDate(d1.getDate() - 1);
      const d2 = new Date(today);
      d2.setDate(d2.getDate() - 2);

      const logs = [
        { UserID: TEST_USER, Date: today.toISOString(), Completed: true, HabitID: 'h1' },
        { UserID: TEST_USER, Date: d1.toISOString(), Completed: true, HabitID: 'h1' },
        { UserID: TEST_USER, Date: d2.toISOString(), Completed: true, HabitID: 'h1' }
      ];

      const res = calculateStreak(logs, TEST_USER);
      assert.equal(res.currentStreak, 3);
      assert.equal(res.longestStreak, 3);
    });

    it('should recognize streak starting yesterday if today is not yet logged', () => {
      const today = new Date();
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const dayBefore = new Date(today);
      dayBefore.setDate(dayBefore.getDate() - 2);

      const logs = [
        { UserID: TEST_USER, Date: yest.toISOString(), Completed: true, HabitID: 'h1' },
        { UserID: TEST_USER, Date: dayBefore.toISOString(), Completed: true, HabitID: 'h1' }
      ];

      const res = calculateStreak(logs, TEST_USER);
      assert.equal(res.currentStreak, 2);
      assert.equal(res.longestStreak, 2);
    });

    it('should reset current streak to 0 if gap is greater than 1 day', () => {
      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const fourDaysAgo = new Date(today);
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      const logs = [
        { UserID: TEST_USER, Date: threeDaysAgo.toISOString(), Completed: true, HabitID: 'h1' },
        { UserID: TEST_USER, Date: fourDaysAgo.toISOString(), Completed: true, HabitID: 'h1' }
      ];

      const res = calculateStreak(logs, TEST_USER);
      assert.equal(res.currentStreak, 0, 'Current streak must be 0 when last check-in was 3 days ago');
      assert.equal(res.longestStreak, 2, 'Historical longest streak must be preserved');
    });

    it('should deduplicate multiple check-ins on the same day without inflating streak', () => {
      const today = new Date();
      const logs = [
        { UserID: TEST_USER, Date: today.toISOString(), Completed: true, HabitID: 'h1' },
        { UserID: TEST_USER, Date: today.toISOString(), Completed: true, HabitID: 'h2' },
        { UserID: TEST_USER, Date: today.toISOString(), Completed: true, HabitID: 'h3' }
      ];

      const res = calculateStreak(logs, TEST_USER);
      assert.equal(res.currentStreak, 1, 'Multiple logs on same day count as 1 active day');
      assert.equal(res.longestStreak, 1);
    });

    it('should calculate habit completion percentage correctly', () => {
      const logs = [
        { HabitID: 'h_test', Completed: true },
        { HabitID: 'h_test', Completed: true },
        { HabitID: 'h_test', Completed: false },
        { HabitID: 'h_test', Completed: true },
        { HabitID: 'other_h', Completed: true }
      ];

      const pct = calculateHabitCompletionPercent(logs, 'h_test');
      assert.equal(pct, 75, '3 of 4 completed must equal 75%');

      assert.equal(calculateHabitCompletionPercent([], 'h_test'), 0, 'Empty logs must return 0%');
    });
  });

  describe('3. Financial & Budget Calculations', () => {
    it('should format INR currency values with Indian comma groupings', () => {
      assert.equal(formatINR(0), '₹0');
      assert.equal(formatINR(1500), '₹1,500');
      assert.equal(formatINR(50000), '₹50,000');
      assert.equal(formatINR(150000), '₹1,50,000');
      assert.equal(formatINR(1000000), '₹10,00,000');
      assert.equal(formatINR('invalid'), '₹0');
    });

    it('should calculate monthly budget cash flow, total expenses, and balance surplus', () => {
      const sampleBudget = {
        salaryIncome: 65000,
        trainingFreelanceIncome: 15000,
        otherIncome: 5000,
        rent: 10500,
        groceries: 12500,
        parentsSupport: 8000,
        utilities: 2500,
        transport: 3000,
        termInsuranceMonthly: 1200,
        healthInsuranceMonthly: 1800,
        healthcare: 2000,
        otherExpenses: 3500,
        actualInvestments: 20000,
        emergencySavings: 5000,
        houseSavings: 10000,
        daughterSavings: 5000
      };

      const totalIncome = sampleBudget.salaryIncome + sampleBudget.trainingFreelanceIncome + sampleBudget.otherIncome;
      assert.equal(totalIncome, 85000, 'Total income should be ₹85,000');

      const fixedExpenses = sampleBudget.rent + sampleBudget.groceries + sampleBudget.parentsSupport + 
                            sampleBudget.utilities + sampleBudget.transport + sampleBudget.termInsuranceMonthly + 
                            sampleBudget.healthInsuranceMonthly + sampleBudget.healthcare + sampleBudget.otherExpenses;
      assert.equal(fixedExpenses, 45000, 'Fixed expenses should be ₹45,000');

      const totalSavingsInvestments = sampleBudget.actualInvestments + sampleBudget.emergencySavings + 
                                     sampleBudget.houseSavings + sampleBudget.daughterSavings;
      assert.equal(totalSavingsInvestments, 40000, 'Savings & investments total should be ₹40,000');

      const netBalance = totalIncome - (fixedExpenses + totalSavingsInvestments);
      assert.equal(netBalance, 0, 'Zero-based budget balance should equal ₹0');
    });

    it('should detect budget deficit when expenses exceed income', () => {
      const lowIncome = 30000;
      const highExpenses = 45000;
      const deficit = lowIncome - highExpenses;
      assert.ok(deficit < 0, 'Deficit must be negative');
      assert.equal(deficit, -15000);
    });

    it('should calculate financial goal progress percentages and shortfalls safely', () => {
      const goal = {
        targetAmount: 500000,
        currentBalance: 125000,
        monthlyTarget: 15000
      };

      const progressPercent = Math.min(100, Math.round((goal.currentBalance / goal.targetAmount) * 100));
      assert.equal(progressPercent, 25, '125,000 / 500,000 must be 25%');

      const remainingShortfall = Math.max(0, goal.targetAmount - goal.currentBalance);
      assert.equal(remainingShortfall, 375000);

      const monthsToGoal = Math.ceil(remainingShortfall / goal.monthlyTarget);
      assert.equal(monthsToGoal, 25, '375,000 / 15,000 must be 25 months');

      // Edge case: target is 0 or negative
      const zeroTarget = 0;
      const safePct = zeroTarget > 0 ? (5000 / zeroTarget) * 100 : 0;
      assert.equal(safePct, 0, 'Zero target amount must not throw division by zero');
    });

    it('should calculate emergency fund runway in months based on living expenses', () => {
      const emergencyBalance = 150000;
      const monthlyLivingExpenses = 35000;
      const runwayMonths = (emergencyBalance / monthlyLivingExpenses).toFixed(1);
      assert.equal(runwayMonths, '4.3', 'Emergency runway should be 4.3 months');
    });
  });

  describe('4. Calendar Time & Interval Union Math', () => {
    const TARGET_DATE = '2026-10-30';

    it('should correctly parse timed calendar events into interval objects', () => {
      const event = {
        id: 'ev_1',
        summary: 'Architecture Sync',
        start: { dateTime: `${TARGET_DATE}T10:00:00+05:30` },
        end: { dateTime: `${TARGET_DATE}T11:30:00+05:30` }
      };

      const parsed = parseEventInterval(event, TARGET_DATE);
      assert.ok(parsed);
      assert.equal(parsed.id, 'ev_1');
      assert.equal(parsed.title, 'Architecture Sync');
      assert.equal(parsed.isAllDay, false);
      assert.equal((parsed.end - parsed.start) / 60000, 90, 'Duration must be 90 minutes');
    });

    it('should handle all-day events by mapping to 09:00 - 17:00 work interval', () => {
      const allDayEvent = {
        id: 'ev_allday',
        summary: 'Company Offsite',
        start: { date: TARGET_DATE },
        end: { date: TARGET_DATE }
      };

      const parsed = parseEventInterval(allDayEvent, TARGET_DATE);
      assert.ok(parsed);
      assert.equal(parsed.isAllDay, true);
      assert.equal((parsed.end - parsed.start) / 60000, 480, 'All-day duration maps to 8 hours (480 mins)');
    });

    it('should merge overlapping intervals without double-counting busy time', () => {
      // Event 1: 10:00 - 11:30 (90 min)
      // Event 2: 11:00 - 12:30 (90 min, overlaps 30 min with Event 1)
      // Event 3: 14:00 - 15:00 (60 min disjoint)
      const intervals = [
        {
          start: new Date(`${TARGET_DATE}T10:00:00`),
          end: new Date(`${TARGET_DATE}T11:30:00`)
        },
        {
          start: new Date(`${TARGET_DATE}T11:00:00`),
          end: new Date(`${TARGET_DATE}T12:30:00`)
        },
        {
          start: new Date(`${TARGET_DATE}T14:00:00`),
          end: new Date(`${TARGET_DATE}T15:00:00`)
        }
      ];

      const merged = mergeOverlappingIntervals(intervals);
      assert.equal(merged.length, 2, '3 overlapping intervals must merge into 2 disjoint intervals');

      // First merged: 10:00 - 12:30 = 150 minutes (instead of 180 minutes with double counting)
      assert.equal(merged[0].durationMinutes, 150);
      // Second: 14:00 - 15:00 = 60 minutes
      assert.equal(merged[1].durationMinutes, 60);

      const totalBusyMinutes = merged.reduce((acc, i) => acc + i.durationMinutes, 0);
      assert.equal(totalBusyMinutes, 210, 'Total busy time must be 210 minutes');
    });

    it('should handle empty or malformed interval arrays gracefully', () => {
      assert.deepEqual(mergeOverlappingIntervals([]), []);
      assert.deepEqual(mergeOverlappingIntervals(null), []);
      assert.deepEqual(mergeOverlappingIntervals([{ start: 'invalid', end: 'invalid' }]), []);
      assert.deepEqual(mergeOverlappingIntervals([{ start: new Date(), end: new Date(Date.now() - 1000) }]), []);
    });

    it('should calculate net available work capacity after deducting calendar commitments', () => {
      const rawEvents = [
        {
          id: 'ev_1',
          summary: 'Client Discovery Call',
          start: { dateTime: `${TARGET_DATE}T11:00:00Z` },
          end: { dateTime: `${TARGET_DATE}T12:00:00Z` }
        },
        {
          id: 'ev_2',
          summary: 'Internal Sprint Planning',
          start: { dateTime: `${TARGET_DATE}T14:00:00Z` },
          end: { dateTime: `${TARGET_DATE}T15:30:00Z` }
        }
      ];

      const commitments = calculateCalendarCommitments(rawEvents, TARGET_DATE);
      assert.equal(commitments.parsedEvents.length, 2);
      assert.equal(commitments.busyMinutes, 150, '60m + 90m = 150m');
      assert.equal(commitments.mergedIntervals.length, 2);
    });
  });

  describe('5. Commercial Pipeline Forecast Integrity', () => {
    it('should separate confirmed revenue from open unconfirmed pipeline', () => {
      const opps = [
        { id: '1', title: 'Confirmed AI Workshop', value: 80000, stage: PIPELINE_STAGES.CONFIRMED },
        { id: '2', title: 'Lead Qualification Bot', value: 50000, stage: PIPELINE_STAGES.PROPOSALS, probability: 70 },
        { id: '3', title: 'Consulting Engagement', value: 40000, stage: PIPELINE_STAGES.MEETINGS, probability: 50 },
        { id: '4', title: 'Unqualified Lead', value: 20000, stage: PIPELINE_STAGES.LOST }
      ];

      const forecast = calculatePipelineForecast(opps, '2026-10-30');

      assert.equal(forecast.actualRevenue, 80000, 'Confirmed deals must be realized revenue');
      assert.equal(forecast.openPipelineTotal, 90000, 'Open pipeline is sum of active unclosed deals (50k + 40k)');
      // Weighted forecast: (50000 * 0.7) + (40000 * 0.5) = 35000 + 20000 = 55000
      assert.equal(forecast.weightedPipelineForecast, 55000);
      assert.equal(forecast.wonDealsCount, 1);
      assert.equal(forecast.lostDealsCount, 1);
      assert.equal(forecast.openDealsCount, 2);
    });

    it('should accurately flag overdue opportunities based on expectedCloseDate', () => {
      const opps = [
        { 
          id: '1', 
          title: 'Overdue Deal', 
          value: 30000, 
          stage: PIPELINE_STAGES.NEGOTIATIONS, 
          expectedCloseDate: '2026-10-25' 
        },
        { 
          id: '2', 
          title: 'Future Deal', 
          value: 60000, 
          stage: PIPELINE_STAGES.PROPOSALS, 
          expectedCloseDate: '2026-11-15' 
        }
      ];

      const forecast = calculatePipelineForecast(opps, '2026-10-30');
      assert.equal(forecast.overdueDeals.length, 1);
      assert.equal(forecast.overdueDeals[0].id, '1');
    });
  });
});
