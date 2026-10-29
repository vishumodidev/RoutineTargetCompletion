/**
 * Google Calendar REST API Service (Read-Only)
 * for RoutineTargetCompletion
 *
 * Implements:
 * - Querying primary calendar events for specific dates
 * - Expanding single recurring events
 * - Error and token expiry handling
 * - Deterministic mock fallback for development & tests
 */

import { getAuthState, AUTH_STATUS } from './googleAuthService.js';
import { calculateCalendarCommitments } from '../utils/calendarMath.js';

// Realistic sample events for development/offline testing
const MOCK_CALENDAR_EVENTS = [
  {
    id: 'gcal_ev_1',
    summary: 'Team AI Architecture Sync',
    start: { dateTime: '2026-10-28T10:00:00+05:30' },
    end: { dateTime: '2026-10-28T11:00:00+05:30' },
    status: 'confirmed',
    htmlLink: 'https://calendar.google.com'
  },
  {
    id: 'gcal_ev_2',
    summary: 'Client Proposal Review (MERN/FastAPI)',
    start: { dateTime: '2026-10-28T14:30:00+05:30' },
    end: { dateTime: '2026-10-28T15:30:00+05:30' },
    status: 'confirmed',
    htmlLink: 'https://calendar.google.com'
  }
];

export const googleCalendarService = {
  /**
   * Retrieves events for a specific day
   *
   * @param {string} dateStr YYYY-MM-DD
   * @returns {Promise<{ success: boolean, events: Array, busyMinutes: number, conflicts: Array, isMock: boolean }>}
   */
  getEventsForDate: async (dateStr = new Date().toISOString().split('T')[0]) => {
    const auth = getAuthState();

    if (auth.status !== AUTH_STATUS.CONNECTED) {
      return {
        success: false,
        error: auth.status === AUTH_STATUS.EXPIRED ? 'Google token has expired' : 'Not connected to Google Calendar',
        events: [],
        busyMinutes: 0,
        conflicts: [],
        isMock: false
      };
    }

    // Mock mode handling
    if (auth.isMock || !auth.accessToken) {
      // Return mock events mapped to the requested target date
      const adjustedMock = MOCK_CALENDAR_EVENTS.map(ev => ({
        ...ev,
        start: { dateTime: `${dateStr}T${ev.start.dateTime.split('T')[1]}` },
        end: { dateTime: `${dateStr}T${ev.end.dateTime.split('T')[1]}` }
      }));

      const commitments = calculateCalendarCommitments(adjustedMock, dateStr);

      return {
        success: true,
        events: adjustedMock,
        busyMinutes: commitments.busyMinutes,
        conflicts: commitments.conflicts,
        isMock: true
      };
    }

    // Live Google Calendar API v3 Call
    const timeMin = `${dateStr}T00:00:00Z`;
    const timeMax = `${dateStr}T23:59:59Z`;
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Google authorization token expired. Please re-connect.');
        }
        if (response.status === 403) {
          throw new Error('Google Calendar access permission denied or quota exceeded.');
        }
        throw new Error(`Google Calendar API error: ${response.statusText}`);
      }

      const data = await response.json();
      const rawEvents = data.items || [];
      const commitments = calculateCalendarCommitments(rawEvents, dateStr);

      return {
        success: true,
        events: rawEvents,
        busyMinutes: commitments.busyMinutes,
        conflicts: commitments.conflicts,
        isMock: false
      };
    } catch (err) {
      console.warn('Google Calendar fetch error:', err.message);
      return {
        success: false,
        error: err.message,
        events: [],
        busyMinutes: 0,
        conflicts: [],
        isMock: false
      };
    }
  }
};
