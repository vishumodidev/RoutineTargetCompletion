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

// Import mockDb and taskService
const { mockDb, initMockDb } = await import('../src/utils/mockDb.js');

describe('Phase 1: Task Foundation & Validation Tests', () => {
  beforeEach(() => {
    global.localStorage.clear();
    initMockDb();
  });

  describe('Validation & Defaults', () => {
    it('should reject task creation when title is missing or empty', () => {
      assert.throws(() => {
        mockDb.saveTask('usr_test', { title: '' });
      }, /Task title is required/);

      assert.throws(() => {
        mockDb.saveTask('usr_test', { title: '   ' });
      }, /Task title is required/);

      assert.throws(() => {
        mockDb.saveTask('usr_test', null);
      }, /Task title is required/);
    });

    it('should assign standard defaults to a newly created task', () => {
      const result = mockDb.saveTask('usr_test', {
        title: 'Build Agent Tool Binding'
      });

      assert.equal(result.success, true);
      const task = result.task;
      assert.ok(task.taskId.startsWith('tsk_'));
      assert.equal(task.userId, 'usr_test');
      assert.equal(task.title, 'Build Agent Tool Binding');
      assert.equal(task.priority, 'Medium');
      assert.equal(task.status, 'Inbox');
      assert.equal(task.category, 'General');
      assert.equal(task.deadlineType, 'Flexible');
      assert.equal(task.incomeImpact, 'None');
      assert.equal(task.readiness, 100);
      assert.equal(task.importance, 50);
      assert.equal(task.urgency, 50);
      assert.ok(task.createdAt);
      assert.ok(task.updatedAt);
      assert.equal(task.completedAt, '');
    });
  });

  describe('CRUD Operations & Idempotency', () => {
    it('should create and retrieve tasks for a specific user', () => {
      mockDb.saveTask('usr_alice', { title: 'Alice Task 1', category: 'AI Agent Development' });
      mockDb.saveTask('usr_alice', { title: 'Alice Task 2', category: 'Corporate Training' });
      mockDb.saveTask('usr_bob', { title: 'Bob Task 1', category: 'General' });

      const aliceTasks = mockDb.getTasks('usr_alice').tasks;
      assert.equal(aliceTasks.length, 2);
      assert.equal(aliceTasks.some(t => t.title === 'Alice Task 1'), true);
      assert.equal(aliceTasks.some(t => t.title === 'Alice Task 2'), true);

      const bobTasks = mockDb.getTasks('usr_bob').tasks;
      assert.equal(bobTasks.length, 1);
      assert.equal(bobTasks[0].title === 'Bob Task 1', true);
    });

    it('should update an existing task idempotently without creating duplicates on retry', () => {
      const created = mockDb.saveTask('usr_vishu', {
        title: 'Original Title',
        category: 'Website Development',
        status: 'Planned'
      }).task;

      const taskId = created.taskId;
      const initialCount = mockDb.getTasks('usr_vishu').tasks.length;

      // Simulate a retry/update with the same taskId
      const updated = mockDb.saveTask('usr_vishu', {
        taskId: taskId,
        title: 'Updated Title',
        category: 'Website Development',
        status: 'In Progress'
      }).task;

      const afterCount = mockDb.getTasks('usr_vishu').tasks.length;
      assert.equal(afterCount, initialCount, 'Task count should not increase on idempotent update');
      assert.equal(updated.taskId, taskId);
      assert.equal(updated.title, 'Updated Title');
      assert.equal(updated.status, 'In Progress');
    });

    it('should delete a task safely', () => {
      const task = mockDb.saveTask('usr_vishu', { title: 'Temporary Task' }).task;
      const beforeDelete = mockDb.getTasks('usr_vishu').tasks;
      assert.ok(beforeDelete.some(t => t.taskId === task.taskId));

      const delResult = mockDb.deleteTask('usr_vishu', task.taskId);
      assert.equal(delResult.success, true);

      const afterDelete = mockDb.getTasks('usr_vishu').tasks;
      assert.equal(afterDelete.some(t => t.taskId === task.taskId), false);
    });
  });

  describe('Authorization & Security Checks', () => {
    it('should prevent user A from modifying user B task', () => {
      const bobsTask = mockDb.saveTask('usr_bob', { title: "Bob's Confidential Task" }).task;

      assert.throws(() => {
        mockDb.saveTask('usr_alice', {
          taskId: bobsTask.taskId,
          title: "Alice trying to overwrite Bob's task"
        });
      }, /Unauthorized: cannot modify another user's task/);
    });

    it('should prevent user A from deleting user B task', () => {
      const bobsTask = mockDb.saveTask('usr_bob', { title: "Bob's Task to Delete" }).task;

      assert.throws(() => {
        mockDb.deleteTask('usr_alice', bobsTask.taskId);
      }, /Unauthorized: cannot delete another user's task/);
    });
  });

  describe('Completion Timestamps & Status Transitions', () => {
    it('should record completedAt when status transitions to Completed', () => {
      const task = mockDb.saveTask('usr_vishu', {
        title: 'Task to Complete',
        status: 'In Progress'
      }).task;

      assert.equal(task.completedAt, '');

      const completed = mockDb.saveTask('usr_vishu', {
        ...task,
        status: 'Completed'
      }).task;

      assert.ok(completed.completedAt, 'completedAt should be stamped when completed');

      // Reopening task should clear completedAt
      const reopened = mockDb.saveTask('usr_vishu', {
        ...completed,
        status: 'In Progress'
      }).task;

      assert.equal(reopened.completedAt, '', 'completedAt should be cleared when task is reopened');
    });
  });

  describe('Goal Linkage', () => {
    it('should associate a task with a financial goal or milestone ID', () => {
      const task = mockDb.saveTask('usr_vishu', {
        title: 'Setup Emergency Fund Auto-debit',
        category: 'Personal Finance',
        linkedGoalId: 'goal_emergency'
      }).task;

      assert.equal(task.linkedGoalId, 'goal_emergency');
    });
  });

  describe('Regression Safety: Preserves Existing Habits and Routines', () => {
    it('should leave habits, routines, and user profile data intact', () => {
      const habits = mockDb.getHabits('usr_vishu');
      assert.ok(habits.length > 0, 'Existing habits must remain intact');

      const user = mockDb.login('vishu@tracker.com', 'password');
      assert.equal(user.name, 'Vishu');
      assert.ok(user.xp >= 450);

      const routineLogs = mockDb.getRoutineLogs('usr_vishu', new Date().toISOString().split('T')[0]);
      assert.ok(Array.isArray(routineLogs), 'Routine logs must remain accessible');
    });
  });
});

