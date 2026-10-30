import api from './api.js';
import { mockDb } from '../utils/mockDb.js';

const isSheetsEnabled = typeof import.meta !== 'undefined' && !!import.meta?.env?.VITE_API_URL;

export const taskService = {
  getTasks: async (userId, filterParams = {}) => {
    if (isSheetsEnabled) {
      try {
        const res = await api.get('', { params: { action: 'tasks', userId, ...filterParams } });
        if (res.data && res.data.success) {
          return res.data.tasks || [];
        }
        throw new Error(res.data?.error || 'Failed to fetch tasks from server');
      } catch (err) {
        console.warn('Sheets API fallback for getTasks:', err.message);
      }
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockDb.getTasks(userId, filterParams).tasks);
      }, 200);
    });
  },

  saveTask: async (userId, taskData) => {
    if (!taskData || !taskData.title || String(taskData.title).trim() === '') {
      throw new Error('Task title is required');
    }

    if (isSheetsEnabled) {
      try {
        const res = await api.post('', { action: 'saveTask', userId, task: taskData });
        if (res.data && res.data.success) {
          return res.data.task;
        }
        throw new Error(res.data?.error || 'Failed to save task');
      } catch (err) {
        console.warn('Sheets API fallback for saveTask:', err.message);
      }
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockDb.saveTask(userId, taskData).task);
      }, 200);
    });
  },

  deleteTask: async (userId, taskId) => {
    if (!taskId) throw new Error('Task ID is required for deletion');

    if (isSheetsEnabled) {
      try {
        const res = await api.post('', { action: 'deleteTask', userId, taskId });
        if (res.data && res.data.success) {
          return true;
        }
        throw new Error(res.data?.error || 'Failed to delete task');
      } catch (err) {
        console.warn('Sheets API fallback for deleteTask:', err.message);
      }
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        mockDb.deleteTask(userId, taskId);
        resolve(true);
      }, 200);
    });
  }
};

