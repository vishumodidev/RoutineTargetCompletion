import api from './api.js';
import { mockDb } from '../utils/mockDb.js';

const isSheetsEnabled = typeof import.meta !== 'undefined' && !!import.meta?.env?.VITE_API_URL;

export const planService = {
  getDailyPlan: async (userId, planDate) => {
    if (!userId || !planDate) throw new Error('userId and planDate are required');

    if (isSheetsEnabled) {
      try {
        const res = await api.get('', { params: { action: 'dailyPlan', userId, date: planDate } });
        if (res.data && res.data.success) {
          return res.data.plan;
        }
        throw new Error(res.data?.error || 'Failed to fetch daily plan');
      } catch (err) {
        console.warn('Sheets API fallback for getDailyPlan:', err.message);
      }
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockDb.getDailyPlan(userId, planDate).plan);
      }, 150);
    });
  },

  saveDailyPlan: async (userId, planData) => {
    if (!userId || !planData || !planData.planDate) {
      throw new Error('userId and planData.planDate are required');
    }

    if (isSheetsEnabled) {
      try {
        const res = await api.post('', { action: 'saveDailyPlan', userId, plan: planData });
        if (res.data && res.data.success) {
          return res.data.plan;
        }
        throw new Error(res.data?.error || 'Failed to save daily plan');
      } catch (err) {
        console.warn('Sheets API fallback for saveDailyPlan:', err.message);
      }
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockDb.saveDailyPlan(userId, planData).plan);
      }, 150);
    });
  }
};

