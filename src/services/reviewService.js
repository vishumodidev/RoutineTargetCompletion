import api from './api';
import { mockDb } from '../utils/mockDb';

const isSheetsEnabled = typeof import.meta !== 'undefined' && !!import.meta?.env?.VITE_API_URL;

export const reviewService = {
  getReview: async (userId, reviewType, periodKey) => {
    if (!userId || !reviewType || !periodKey) {
      throw new Error('userId, reviewType, and periodKey are required');
    }

    if (isSheetsEnabled) {
      try {
        const res = await api.get('', {
          params: { action: 'review', userId, type: reviewType, periodKey }
        });
        if (res.data && res.data.success) {
          return res.data.review;
        }
        throw new Error(res.data?.error || 'Failed to fetch review');
      } catch (err) {
        console.warn('Sheets API fallback for getReview:', err.message);
      }
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockDb.getReview(userId, reviewType, periodKey).review);
      }, 150);
    });
  },

  getReviewsHistory: async (userId, reviewType) => {
    if (!userId) throw new Error('userId is required');

    if (isSheetsEnabled) {
      try {
        const res = await api.get('', {
          params: { action: 'reviewsHistory', userId, type: reviewType || '' }
        });
        if (res.data && res.data.success) {
          return res.data.reviews || [];
        }
        throw new Error(res.data?.error || 'Failed to fetch reviews history');
      } catch (err) {
        console.warn('Sheets API fallback for getReviewsHistory:', err.message);
      }
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockDb.getReviewsHistory(userId, reviewType).reviews);
      }, 150);
    });
  },

  saveReview: async (userId, reviewData) => {
    if (!userId || !reviewData || !reviewData.reviewType || !reviewData.periodKey) {
      throw new Error('userId, reviewType, and periodKey are required for reviewData');
    }

    if (isSheetsEnabled) {
      try {
        const res = await api.post('', {
          action: 'saveReview',
          userId,
          review: reviewData
        });
        if (res.data && res.data.success) {
          return res.data.review;
        }
        throw new Error(res.data?.error || 'Failed to save review');
      } catch (err) {
        console.warn('Sheets API fallback for saveReview:', err.message);
      }
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockDb.saveReview(userId, reviewData).review);
      }, 150);
    });
  }
};
