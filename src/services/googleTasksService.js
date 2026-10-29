/**
 * Google Tasks REST API Service (Read-Only & Controlled Import)
 * for RoutineTargetCompletion
 *
 * Implements:
 * - Listing Google Task lists
 * - Retrieving tasks with due dates and notes
 * - Mapping external tasks to RoutineTargetCompletion Task schema
 * - Stable ExternalID deduplication
 * - Deterministic mock fallback for offline development & tests
 */

import { getAuthState, AUTH_STATUS } from './googleAuthService.js';

const MOCK_TASK_LISTS = [
  { id: '@default', title: 'My Tasks' },
  { id: 'list_corp', title: 'Corporate Work & Deliverables' }
];

const MOCK_TASKS = [
  {
    id: 'gtask_sync_01',
    title: 'Prepare Corporate GenAI Training Outline',
    notes: 'Draft syllabus for 2-day workshop with hands-on labs in LangGraph',
    due: '2026-10-30T00:00:00.000Z',
    status: 'needsAction',
    updated: '2026-10-27T10:00:00.000Z'
  },
  {
    id: 'gtask_sync_02',
    title: 'Submit GST Invoice for October Consultancy',
    notes: 'Attach signed work order and bank payment reference',
    due: '2026-10-31T00:00:00.000Z',
    status: 'needsAction',
    updated: '2026-10-27T11:00:00.000Z'
  },
  {
    id: 'gtask_sync_03',
    title: 'Review React Native UI feedback from staging',
    notes: 'Fix button overflow on small Android screens',
    due: '2026-11-02T00:00:00.000Z',
    status: 'needsAction',
    updated: '2026-10-28T09:00:00.000Z'
  }
];

export const googleTasksService = {
  /**
   * Retrieves task lists for the connected user
   */
  getTaskLists: async () => {
    const auth = getAuthState();

    if (auth.status !== AUTH_STATUS.CONNECTED) {
      return {
        success: false,
        error: auth.status === AUTH_STATUS.EXPIRED ? 'Google token has expired' : 'Not connected to Google Tasks',
        lists: [],
        isMock: false
      };
    }

    if (auth.isMock || !auth.accessToken) {
      return {
        success: true,
        lists: MOCK_TASK_LISTS,
        isMock: true
      };
    }

    try {
      const response = await fetch('https://www.googleapis.com/tasks/v1/users/@me/lists', {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Google Tasks API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        lists: data.items || [],
        isMock: false
      };
    } catch (err) {
      console.warn('Google Tasks getTaskLists error:', err.message);
      return {
        success: false,
        error: err.message,
        lists: [],
        isMock: false
      };
    }
  },

  /**
   * Retrieves tasks from a specific task list
   *
   * @param {string} listId List identifier (defaults to '@default')
   */
  getTasks: async (listId = '@default') => {
    const auth = getAuthState();

    if (auth.status !== AUTH_STATUS.CONNECTED) {
      return {
        success: false,
        error: auth.status === AUTH_STATUS.EXPIRED ? 'Google token has expired' : 'Not connected to Google Tasks',
        tasks: [],
        isMock: false
      };
    }

    if (auth.isMock || !auth.accessToken) {
      return {
        success: true,
        tasks: MOCK_TASKS,
        isMock: true
      };
    }

    try {
      const url = `https://www.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks?showCompleted=false`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Google Tasks API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        tasks: data.items || [],
        isMock: false
      };
    } catch (err) {
      console.warn('Google Tasks getTasks error:', err.message);
      return {
        success: false,
        error: err.message,
        tasks: [],
        isMock: false
      };
    }
  },

  /**
   * Helper to determine if an external task is already present in local tasks backlog
   */
  isAlreadyImported: (externalTaskId, localTasks = []) => {
    if (!externalTaskId || !Array.isArray(localTasks)) return false;
    return localTasks.some(t => t.externalId === externalTaskId || t.ExternalID === externalTaskId);
  },

  /**
   * Normalizes a Google Tasks item into RoutineTargetCompletion task format
   */
  mapGoogleTaskToLocalTask: (gtask, defaultCategory = 'JOB/OFFICE') => {
    if (!gtask) return null;

    let dueDate = '';
    if (gtask.due) {
      dueDate = gtask.due.includes('T') ? gtask.due.split('T')[0] : gtask.due;
    }

    return {
      title: gtask.title || 'Untitled Google Task',
      description: gtask.notes || '',
      category: defaultCategory,
      projectArea: 'Google Tasks Import',
      dueDate,
      deadlineType: dueDate ? 'Soft' : 'Flexible',
      status: 'Not Started',
      estimatedDuration: 45,
      actualDuration: 0,
      incomeImpact: 'Medium',
      importance: 60,
      urgency: dueDate ? 70 : 40,
      readiness: 100,
      nextAction: gtask.title,
      recurrence: 'None',
      source: 'GoogleTasks',
      externalId: gtask.id
    };
  }
};
