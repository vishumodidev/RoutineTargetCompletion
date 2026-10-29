/**
 * Opportunity Service
 * for RoutineTargetCompletion (Step 2: Opportunity Pipeline)
 *
 * Implements:
 * - Data fetching for opportunities with filtering
 * - Save / Update with validation
 * - Delete opportunity
 * - Connects to Google Apps Script Web App when configured, falls back to mockDb
 */

import api from './api.js';
import { mockDb } from '../utils/mockDb.js';

const isSheetsEnabled = typeof import.meta !== 'undefined' && !!import.meta?.env?.VITE_API_URL;

export const OPPORTUNITY_STAGES = [
  'New Leads',
  'Qualified Leads',
  'Meetings',
  'Proposals',
  'Negotiations',
  'Confirmed',
  'Lost'
];

export const STAGE_DEFAULT_PROBABILITIES = {
  'New Leads': 10,
  'Qualified Leads': 30,
  'Meetings': 50,
  'Proposals': 70,
  'Negotiations': 80,
  'Confirmed': 100,
  'Lost': 0
};

export const opportunityService = {
  /**
   * Retrieves opportunities for a given user, with optional filters
   */
  getOpportunities: async (userId, filters = {}) => {
    if (!userId) throw new Error('userId is required');

    if (isSheetsEnabled) {
      try {
        const res = await api.get('', {
          params: { action: 'opportunities', userId, ...filters }
        });
        if (res.data && res.data.success) {
          return res.data.opportunities || [];
        }
        throw new Error(res.data?.error || 'Failed to fetch opportunities');
      } catch (err) {
        console.warn('Sheets API fallback for getOpportunities:', err.message);
      }
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockDb.getOpportunities(userId, filters).opportunities);
      }, 50);
    });
  },

  /**
   * Creates or updates an opportunity record
   */
  saveOpportunity: async (userId, oppData) => {
    if (!userId) throw new Error('userId is required');
    if (!oppData) throw new Error('oppData is required');

    const title = oppData.title || oppData.clientName;
    if (!title || String(title).trim() === '') {
      throw new Error('Opportunity title is required');
    }

    if (isSheetsEnabled) {
      try {
        const res = await api.post('', {
          action: 'saveOpportunity',
          userId,
          oppData
        });
        if (res.data && res.data.success) {
          return res.data.opportunity;
        }
        throw new Error(res.data?.error || 'Failed to save opportunity');
      } catch (err) {
        console.warn('Sheets API fallback for saveOpportunity:', err.message);
      }
    }

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const res = mockDb.saveOpportunity(userId, oppData);
          resolve(res.opportunity);
        } catch (e) {
          reject(e);
        }
      }, 50);
    });
  },

  /**
   * Deletes an opportunity
   */
  deleteOpportunity: async (userId, oppId) => {
    if (!userId || !oppId) throw new Error('userId and oppId are required');

    if (isSheetsEnabled) {
      try {
        const res = await api.post('', {
          action: 'deleteOpportunity',
          userId,
          oppId
        });
        if (res.data && res.data.success) {
          return res.data;
        }
        throw new Error(res.data?.error || 'Failed to delete opportunity');
      } catch (err) {
        console.warn('Sheets API fallback for deleteOpportunity:', err.message);
      }
    }

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const res = mockDb.deleteOpportunity(userId, oppId);
          resolve(res);
        } catch (e) {
          reject(e);
        }
      }, 50);
    });
  }
};

