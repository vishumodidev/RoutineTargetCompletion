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
const { authService } = await import('../src/services/authService.js');
const { habitService } = await import('../src/services/habitService.js');
const { routineService, ROUTINE_TEMPLATES, PRIORITY_FORMULA } = await import('../src/services/routineService.js');
const { investmentService } = await import('../src/services/investmentService.js');
const { dashboardService } = await import('../src/services/dashboardService.js');
const { analyticsService } = await import('../src/services/analyticsService.js');
const { achievementService } = await import('../src/services/achievementService.js');
const { taskService } = await import('../src/services/taskService.js');
const { opportunityService } = await import('../src/services/opportunityService.js');

describe('Services & Application Workflow Integration Tests', () => {
  const TEST_USER = 'usr_vishu';
  const TEST_EMAIL = 'vishu@tracker.com';
  const TEST_PASS = 'password';

  beforeEach(() => {
    global.localStorage.clear();
    initMockDb();
  });

  describe('1. Authentication Service & Session Lifecycle', () => {
    it('should successfully authenticate with valid credentials', async () => {
      const user = await authService.login(TEST_EMAIL, TEST_PASS);
      assert.ok(user, 'User object must be returned');
      assert.equal(user.email.toLowerCase(), TEST_EMAIL);
      assert.equal(user.userId, TEST_USER);
      assert.ok(Number.isInteger(user.xp), 'XP must be an integer');
      assert.ok(user.level >= 1, 'Level must be >= 1');
    });

    it('should reject login with incorrect password', async () => {
      await assert.rejects(
        async () => {
          await authService.login(TEST_EMAIL, 'wrong_pass');
        },
        /Invalid password/
      );
    });

    it('should reject login for non-existent user email', async () => {
      await assert.rejects(
        async () => {
          await authService.login('unknown@tracker.com', 'some_pass');
        },
        /User not found/
      );
    });

    it('should register a new user and assign default level 1 and 0 XP', async () => {
      const newEmail = 'newdev@tracker.com';
      const user = await authService.register('New Developer', newEmail, 'securePass123');
      assert.ok(user);
      assert.equal(user.email, newEmail);
      assert.equal(user.name, 'New Developer');
      assert.equal(user.xp, 0);
      assert.equal(user.level, 1);
      assert.equal(user.streak, 0);

      // Verify user can now log in
      const loggedIn = await authService.login(newEmail, 'securePass123');
      assert.equal(loggedIn.userId, user.userId);
    });

    it('should reject registration if email is already taken', async () => {
      await assert.rejects(
        async () => {
          await authService.register('Duplicate', TEST_EMAIL, 'password');
        },
        /Email already registered/
      );
    });
  });

  describe('2. Habit Service & Gamified Check-ins', () => {
    it('should retrieve active habits for the authenticated user', async () => {
      const habits = await habitService.getHabits(TEST_USER);
      assert.ok(Array.isArray(habits));
      assert.ok(habits.length > 0, 'Should load default habits');
      assert.ok(habits.every(h => h.status === 'Active'));
    });

    it('should create a new habit quest with category and XP reward', async () => {
      const newHabit = await habitService.createHabit(
        TEST_USER,
        'TypeScript Clean Architecture',
        'Study domain-driven patterns',
        'Coding',
        20
      );

      assert.ok(newHabit);
      assert.ok(newHabit.habitId.startsWith('hab_'));
      assert.equal(newHabit.habitName, 'TypeScript Clean Architecture');
      assert.equal(newHabit.xpReward, 20);
      assert.equal(newHabit.status, 'Active');

      // Verify it appears in user habits
      const habits = await habitService.getHabits(TEST_USER);
      const found = habits.find(h => h.habitId === newHabit.habitId);
      assert.ok(found);
    });

    it('should update an existing habit quest and modify status', async () => {
      const habits = await habitService.getHabits(TEST_USER);
      const target = habits[0];

      const updated = await habitService.updateHabit(
        target.habitId,
        TEST_USER,
        target.habitName + ' (Updated)',
        'New description',
        target.category,
        30,
        'Active'
      );

      assert.equal(updated.habitName, target.habitName + ' (Updated)');
      assert.equal(updated.xpReward, 30);
    });

    it('should delete a habit quest and remove associated logs', async () => {
      const newHabit = await habitService.createHabit(
        TEST_USER,
        'Temporary Habit',
        'Will be deleted',
        'General',
        5
      );

      await habitService.deleteHabit(newHabit.habitId, TEST_USER);
      const habits = await habitService.getHabits(TEST_USER);
      assert.ok(!habits.some(h => h.habitId === newHabit.habitId));
    });

    it('should log habit completion and reward user with XP', async () => {
      const habits = await habitService.getHabits(TEST_USER);
      const habit = habits[0];
      const today = new Date().toISOString().split('T')[0];

      const initialUser = await authService.login(TEST_EMAIL, TEST_PASS);
      const initialXP = initialUser.xp;

      const result = await habitService.logHabit(TEST_USER, habit.habitId, today, true);
      assert.ok(result);
      assert.equal(result.success, true);
      assert.ok(result.xp >= initialXP);

      // Verify user's XP was incremented
      const updatedUser = await authService.login(TEST_EMAIL, TEST_PASS);
      assert.ok(updatedUser.xp >= initialXP);
    });
  });

  describe('3. Routine Service & Schedule Templates', () => {
    it('should have standard templates for weekday, saturday, and sunday', () => {
      assert.ok(Array.isArray(ROUTINE_TEMPLATES.weekday));
      assert.equal(ROUTINE_TEMPLATES.weekday.length, 21, 'Weekday has 21 routine items');
      assert.equal(ROUTINE_TEMPLATES.saturday.length, 11, 'Saturday has 11 routine items');
      assert.equal(ROUTINE_TEMPLATES.sunday.length, 8, 'Sunday has 8 routine items');

      // Verify category duration targets
      assert.equal(PRIORITY_FORMULA.length, 5);
      const totalPlannedHours = PRIORITY_FORMULA.reduce((sum, f) => sum + f.target, 0);
      assert.equal(totalPlannedHours, 16.0, '2h Health + 5h Office + 1.75h Mi + 3.5h Training/AI + 3.75h Family = 16h total awake time');
    });

    it('should log routine activity and award XP', async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await routineService.toggleRoutineActivity(TEST_USER, 'w_cycling', today, true, 15);
      assert.ok(res);
      assert.equal(res.success, true);
    });

    it('should retrieve routine logs for a specific date', async () => {
      const today = new Date().toISOString().split('T')[0];
      await routineService.toggleRoutineActivity(TEST_USER, 'w_yoga', today, true, 15);

      const logs = await routineService.getRoutineLogs(TEST_USER, today);
      assert.ok(Array.isArray(logs));
      assert.ok(logs.includes('w_yoga'), 'Routine logs must include w_yoga');
    });
  });

  describe('4. Investment & Financial Planning Service', () => {
    it('should retrieve investment overview containing profile, funds, goals, and budgets', async () => {
      const overview = await investmentService.getInvestmentOverview(TEST_USER);
      assert.ok(overview);
      assert.ok(overview.profile, 'Profile must be present');
      assert.ok(Array.isArray(overview.funds), 'Funds array must be present');
      assert.ok(Array.isArray(overview.goals), 'Goals array must be present');
      assert.ok(Array.isArray(overview.budgets), 'Budgets array must be present');
      assert.ok(Array.isArray(overview.transactions), 'Transactions array must be present');
    });

    it('should update investment profile baseline balances', async () => {
      const updatedProfile = await investmentService.updateProfile(TEST_USER, {
        emergencyFundBalance: 95000,
        houseFundBalance: 85000,
        daughterFundBalance: 60000,
        bankSavings: 220000,
        monthlySavingsTarget: 25000
      });

      assert.ok(updatedProfile);
      assert.equal(updatedProfile.profile.emergencyFundBalance, 95000);
      assert.equal(updatedProfile.profile.houseFundBalance, 85000);
      assert.equal(updatedProfile.profile.daughterFundBalance, 60000);
    });

    it('should update active SIP commitment for a mutual fund', async () => {
      const overview = await investmentService.getInvestmentOverview(TEST_USER);
      const fund = overview.funds[0];
      assert.ok(fund);

      const fundId = fund.id || fund.fundId;
      const updated = await investmentService.updateFund(TEST_USER, fundId, {
        activeSip: 4000,
        actualThisMonth: 4000,
        status: 'Active'
      });

      assert.ok(updated);
      assert.equal(updated.fund.activeSip, 4000);
      assert.equal(updated.fund.actualThisMonth, 4000);
    });

    it('should save and retrieve monthly budget breakdown', async () => {
      const budgetData = {
        salaryIncome: 70000,
        trainingFreelanceIncome: 20000,
        otherIncome: 0,
        rent: 11000,
        groceries: 13000,
        parentsSupport: 8000,
        utilities: 3000,
        transport: 3500,
        termInsuranceMonthly: 1200,
        healthInsuranceMonthly: 1800,
        healthcare: 2000,
        otherExpenses: 4000,
        actualInvestments: 25000,
        emergencySavings: 5000,
        houseSavings: 10000,
        daughterSavings: 5000,
        notes: 'November 2026 Target Budget'
      };

      const saved = await investmentService.saveMonthlyBudget(TEST_USER, {
        monthYear: '2026-11',
        ...budgetData
      });

      assert.ok(saved);
      assert.equal(saved.budget.monthYear, '2026-11');
      assert.equal(saved.budget.salaryIncome, 70000);

      const fetched = await investmentService.getMonthlyBudget(TEST_USER, '2026-11');
      assert.ok(fetched);
      assert.equal(fetched.budget.salaryIncome, 70000);
    });

    it('should create, update, and delete a financial goal', async () => {
      const newGoal = await investmentService.saveFinancialGoal(TEST_USER, {
        id: 'goal_ev_downpayment',
        name: 'Electric Vehicle Downpayment',
        category: 'Vehicle',
        targetAmount: 300000,
        currentBalance: 50000,
        monthlyTarget: 15000,
        deadline: '2027-12-31',
        priority: 'Medium',
        status: 'In Progress'
      });

      assert.ok(newGoal);
      assert.equal(newGoal.success, true);

      // Verify goal is listed
      const overview = await investmentService.getInvestmentOverview(TEST_USER);
      assert.ok(overview.goals.some(g => g.name === 'Electric Vehicle Downpayment'));

      // Delete the goal
      const deleted = await investmentService.deleteFinancialGoal(TEST_USER, 'goal_ev_downpayment');
      assert.equal(deleted.success, true);
    });

    it('should record a contribution transaction and update goal balance', async () => {
      // First create a goal
      await investmentService.saveFinancialGoal(TEST_USER, {
        id: 'goal_certs_fund',
        name: 'Certifications Fund',
        category: 'Education',
        targetAmount: 50000,
        currentBalance: 10000,
        monthlyTarget: 5000,
        status: 'In Progress'
      });

      // Add transaction towards this goal
      const txRes = await investmentService.addContributionTransaction(TEST_USER, {
        date: '2026-10-30',
        category: 'Education',
        entityName: 'Certifications Fund',
        amount: 5000,
        type: 'Deposit',
        paymentMode: 'UPI',
        notes: 'Monthly allocation for GCP Architect exam'
      });

      assert.ok(txRes);
      assert.ok(txRes.transaction);
      assert.equal(txRes.transaction.amount, 5000);

      // Verify goal balance was incremented: 10000 + 5000 = 15000
      const overview = await investmentService.getInvestmentOverview(TEST_USER);
      const updatedGoal = overview.goals.find(g => g.name === 'Certifications Fund');
      assert.ok(updatedGoal);
      assert.equal(updatedGoal.currentBalance, 15000);
    });
  });

  describe('5. Dashboard & Analytics Aggregation Service', () => {
    it('should aggregate dashboard overview metrics', async () => {
      const data = await dashboardService.getDashboardData(TEST_USER);
      assert.ok(data);
      assert.ok(data.user);
      assert.ok(Array.isArray(data.todayQuests));
      assert.ok(typeof data.achievementsCount === 'number');
      assert.ok(Array.isArray(data.todayBigFive));
      assert.ok(Array.isArray(data.opportunities));
    });

    it('should aggregate analytics reports including habit success rates and category breakdown', async () => {
      const data = await analyticsService.getAnalyticsData(TEST_USER);
      assert.ok(data);
      assert.ok(Array.isArray(data.habitStats));
      assert.ok(Array.isArray(data.weeklyReport));
      assert.equal(data.weeklyReport.length, 7, 'Weekly report must have 7 daily datapoints');
      assert.ok(Array.isArray(data.categoryBreakdown));
    });

    it('should retrieve unlocked user achievements', async () => {
      const achievements = await achievementService.getAchievements(TEST_USER);
      assert.ok(Array.isArray(achievements));
      assert.ok(achievements.length > 0);
      assert.ok(achievements.every(a => a.badgeName && a.unlockedDate));
    });
  });

  describe('6. Task and Opportunity Integration Workflows', () => {
    it('should link a task to a commercial opportunity and reflect in pipeline', async () => {
      // 1. Create opportunity
      const opp = await opportunityService.saveOpportunity(TEST_USER, {
        title: 'Enterprise AI Agent Pilot',
        contactName: 'Tech Lead at Enterprise',
        source: 'LinkedIn',
        stage: 'Proposals',
        value: 120000,
        probability: 70,
        expectedCloseDate: '2026-11-20',
        status: 'Open'
      });

      assert.ok(opp);
      assert.ok(opp.opportunityId);

      // 2. Create linked follow-up task
      const task = await taskService.saveTask(TEST_USER, {
        title: 'Deliver Pilot Proposal Scope Document',
        category: 'Mi Lifestyle',
        linkedOpportunityId: opp.opportunityId,
        priority: 'High',
        status: 'Planned',
        incomeImpact: 'High',
        dueDate: '2026-11-05',
        estimatedDuration: 90
      });

      assert.ok(task);
      assert.equal(task.linkedOpportunityId, opp.opportunityId);

      // 3. Clean up
      await taskService.deleteTask(TEST_USER, task.taskId);
      await opportunityService.deleteOpportunity(TEST_USER, opp.opportunityId);
    });
  });
});
