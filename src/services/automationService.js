/**
 * Controlled Automation Service Interface
 * for RoutineTargetCompletion (Phase 8)
 *
 * Implements:
 * - Triggers 4 approved deterministic workflows
 * - Enforces explicit user approval for any persistent writes
 * - Connects to Google Apps Script Web App when configured, falls back to mockDb
 */

import api from './api.js';
import { mockDb } from '../utils/mockDb.js';

const isSheetsEnabled = typeof import.meta !== 'undefined' && !!import.meta?.env?.VITE_API_URL;

export const automationService = {
  /**
   * Retrieves recent automation execution logs
   */
  getAutomationRuns: async (userId, limit = 20) => {
    if (!userId) throw new Error('userId is required');

    if (isSheetsEnabled) {
      try {
        const res = await api.get('', {
          params: { action: 'automationRuns', userId, limit }
        });
        if (res.data && res.data.success) {
          return res.data.runs || [];
        }
        throw new Error(res.data?.error || 'Failed to fetch automation runs');
      } catch (err) {
        console.warn('Sheets API fallback for getAutomationRuns:', err.message);
      }
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockDb.getAutomationRuns(userId, limit).runs);
      }, 100);
    });
  },

  /**
   * Retrieves all proposed actions currently awaiting user approval
   */
  getPendingActions: async (userId) => {
    if (!userId) throw new Error('userId is required');

    if (isSheetsEnabled) {
      try {
        const res = await api.get('', {
          params: { action: 'pendingActions', userId }
        });
        if (res.data && res.data.success) {
          return res.data.pendingActions || [];
        }
        throw new Error(res.data?.error || 'Failed to fetch pending actions');
      } catch (err) {
        console.warn('Sheets API fallback for getPendingActions:', err.message);
      }
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockDb.getPendingActions(userId).pendingActions);
      }, 100);
    });
  },

  /**
   * Executes an approved automation workflow
   */
  executeWorkflow: async (userId, workflowType, triggerType = 'MANUAL', payload = {}) => {
    if (!userId || !workflowType) throw new Error('userId and workflowType are required');

    if (isSheetsEnabled) {
      try {
        const res = await api.post('', {
          action: 'executeAutomation',
          userId,
          workflowType,
          triggerType,
          payload
        });
        if (res.data && res.data.success) {
          return res.data;
        }
        throw new Error(res.data?.error || 'Failed to execute workflow');
      } catch (err) {
        console.warn('Sheets API fallback for executeWorkflow:', err.message);
      }
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockDb.executeAutomation(userId, workflowType, triggerType, payload));
      }, 150);
    });
  },

  /**
   * Approves and executes a specific proposed action
   */
  approveAction: async (userId, runId, actionId, actionType, actionPayload) => {
    if (!userId || !runId || !actionId) throw new Error('Missing approval parameters');

    if (isSheetsEnabled) {
      try {
        const res = await api.post('', {
          action: 'approveAction',
          userId,
          runId,
          actionId,
          actionType,
          actionPayload
        });
        if (res.data && res.data.success) {
          return res.data;
        }
        throw new Error(res.data?.error || 'Failed to approve action');
      } catch (err) {
        console.warn('Sheets API fallback for approveAction:', err.message);
      }
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockDb.approveAction(userId, runId, actionId, actionType, actionPayload));
      }, 150);
    });
  },

  /**
   * Rejects and dismisses a proposed action
   */
  rejectAction: async (userId, runId, actionId) => {
    if (!userId || !runId || !actionId) throw new Error('Missing rejection parameters');

    if (isSheetsEnabled) {
      try {
        const res = await api.post('', {
          action: 'rejectAction',
          userId,
          runId,
          actionId
        });
        if (res.data && res.data.success) {
          return res.data;
        }
        throw new Error(res.data?.error || 'Failed to reject action');
      } catch (err) {
        console.warn('Sheets API fallback for rejectAction:', err.message);
      }
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockDb.rejectAction(userId, runId, actionId));
      }, 150);
    });
  }
};

