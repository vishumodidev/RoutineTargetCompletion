import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseEventInterval,
  mergeOverlappingIntervals,
  calculateCalendarCommitments,
  calculateNetPlanningCapacity
} from '../src/utils/calendarMath.js';
import { googleTasksService } from '../src/services/googleTasksService.js';
import { generateDailyBigFive } from '../src/utils/dailyPlanner.js';

describe('Phase 5: Google Calendar & Tasks Integration Tests', () => {
  const targetDateStr = '2026-10-28';

  describe('Calendar Math & Interval Merging', () => {
    it('parses timed events and calculates start/end correctly', () => {
      const rawEvent = {
        id: 'ev_1',
        summary: 'Sprint Review',
        start: { dateTime: '2026-10-28T10:00:00+05:30' },
        end: { dateTime: '2026-10-28T11:00:00+05:30' },
        status: 'confirmed'
      };

      const parsed = parseEventInterval(rawEvent, targetDateStr);
      assert.ok(parsed);
      assert.equal(parsed.title, 'Sprint Review');
      assert.equal(parsed.isAllDay, false);
      assert.equal(parsed.status, 'confirmed');
    });

    it('parses all-day events correctly with daytime window', () => {
      const rawEvent = {
        id: 'ev_allday',
        summary: 'Company Offsite',
        start: { date: '2026-10-28' },
        end: { date: '2026-10-28' },
        status: 'confirmed'
      };

      const parsed = parseEventInterval(rawEvent, targetDateStr);
      assert.ok(parsed);
      assert.equal(parsed.isAllDay, true);
    });

    it('returns null for invalid or corrupted event timestamps', () => {
      const invalid = {
        id: 'bad',
        start: { dateTime: 'invalid-date' },
        end: { dateTime: 'invalid-date' }
      };
      assert.equal(parseEventInterval(invalid, targetDateStr), null);
    });

    it('merges overlapping event intervals so busy time is not double counted', () => {
      // Event A: 10:00 to 11:30 (90 mins)
      // Event B: 11:00 to 12:00 (60 mins)
      // True combined union interval = 10:00 to 12:00 (120 mins, NOT 150 mins)
      const intervals = [
        { start: new Date('2026-10-28T10:00:00Z'), end: new Date('2026-10-28T11:30:00Z') },
        { start: new Date('2026-10-28T11:00:00Z'), end: new Date('2026-10-28T12:00:00Z') }
      ];

      const merged = mergeOverlappingIntervals(intervals);
      assert.equal(merged.length, 1);
      assert.equal(merged[0].durationMinutes, 120);
    });

    it('handles nested events where event B is completely inside event A', () => {
      // Event A: 09:00 to 12:00 (180 mins)
      // Event B: 10:00 to 11:00 (60 mins, nested inside A)
      const intervals = [
        { start: new Date('2026-10-28T09:00:00Z'), end: new Date('2026-10-28T12:00:00Z') },
        { start: new Date('2026-10-28T10:00:00Z'), end: new Date('2026-10-28T11:00:00Z') }
      ];

      const merged = mergeOverlappingIntervals(intervals);
      assert.equal(merged.length, 1);
      assert.equal(merged[0].durationMinutes, 180);
    });

    it('keeps disjoint separate events distinct', () => {
      // Morning meeting (60 mins) + Afternoon meeting (60 mins)
      const intervals = [
        { start: new Date('2026-10-28T10:00:00Z'), end: new Date('2026-10-28T11:00:00Z') },
        { start: new Date('2026-10-28T14:00:00Z'), end: new Date('2026-10-28T15:00:00Z') }
      ];

      const merged = mergeOverlappingIntervals(intervals);
      assert.equal(merged.length, 2);
      assert.equal(merged[0].durationMinutes, 60);
      assert.equal(merged[1].durationMinutes, 60);
    });

    it('ignores cancelled events and detects direct overlapping conflicts', () => {
      const events = [
        {
          id: 'ev1',
          summary: 'Meeting 1',
          start: { dateTime: '2026-10-28T10:00:00Z' },
          end: { dateTime: '2026-10-28T11:30:00Z' },
          status: 'confirmed'
        },
        {
          id: 'ev2',
          summary: 'Meeting 2 (Overlaps)',
          start: { dateTime: '2026-10-28T11:00:00Z' },
          end: { dateTime: '2026-10-28T12:00:00Z' },
          status: 'confirmed'
        },
        {
          id: 'ev3',
          summary: 'Cancelled Meeting',
          start: { dateTime: '2026-10-28T13:00:00Z' },
          end: { dateTime: '2026-10-28T14:00:00Z' },
          status: 'cancelled'
        }
      ];

      const res = calculateCalendarCommitments(events, targetDateStr);
      assert.equal(res.parsedEvents.length, 2); // Cancelled ignored
      assert.equal(res.busyMinutes, 120);       // Merged [10:00 - 12:00]
      assert.equal(res.conflicts.length, 1);     // Conflict detected
      assert.equal(res.conflicts[0].overlapMinutes, 30);
    });
  });

  describe('Capacity Deduction & Minimum Floor', () => {
    it('deducts calendar busy minutes from gross capacity', () => {
      // Gross 480m - 120m meetings = 360m available
      assert.equal(calculateNetPlanningCapacity(480, 120), 360);
    });

    it('enforces guaranteed minimum capacity floor (default 60 mins) on heavy meeting days', () => {
      // Gross 480m - 460m meetings = would be 20m, but clamped to floor 60m
      assert.equal(calculateNetPlanningCapacity(480, 460, 60), 60);
    });
  });

  describe('Daily Big 5 Planner Integration with Calendar', () => {
    const tasks = [
      { taskId: 'tk1', title: 'Task 1', incomeImpact: 'High', estimatedDuration: 60, status: 'Not Started' },
      { taskId: 'tk2', title: 'Task 2', incomeImpact: 'High', estimatedDuration: 60, status: 'Not Started' },
      { taskId: 'tk3', title: 'Task 3', incomeImpact: 'High', estimatedDuration: 60, status: 'Not Started' }
    ];

    it('deducts calendar commitments and flags calendar sync in planning results', () => {
      const calendarEvents = [
        {
          id: 'ev1',
          summary: 'Client Delivery Call',
          start: { dateTime: '2026-10-28T10:00:00Z' },
          end: { dateTime: '2026-10-28T12:00:00Z' }, // 120 mins
          status: 'confirmed'
        }
      ];

      const result = generateDailyBigFive(tasks, {
        planDate: targetDateStr,
        dayType: 'NORMAL', // 480 base
        calendarEvents
      });

      assert.equal(result.isExternalCalendarSynced, true);
      assert.equal(result.grossAvailableMinutes, 480);
      assert.equal(result.calendarBusyMinutes, 120);
      assert.equal(result.availableMinutes, 360); // 480 - 120
      assert.ok(result.overallSummary.includes('Google Calendar'));
    });

    it('maintains normal capacity when calendar is not connected', () => {
      const result = generateDailyBigFive(tasks, {
        planDate: targetDateStr,
        dayType: 'NORMAL',
        calendarEvents: []
      });

      assert.equal(result.isExternalCalendarSynced, false);
      assert.equal(result.calendarBusyMinutes, 0);
      assert.equal(result.availableMinutes, 480);
    });
  });

  describe('Google Tasks Schema Mapping & Deduplication', () => {
    it('correctly maps a Google Tasks API object to RoutineTargetCompletion Task schema', () => {
      const gtask = {
        id: 'gtask_123',
        title: 'Review Quarterly Taxes',
        notes: 'Check advance tax payment receipt',
        due: '2026-10-31T00:00:00.000Z',
        status: 'needsAction'
      };

      const mapped = googleTasksService.mapGoogleTaskToLocalTask(gtask, 'FINANCIAL');
      assert.equal(mapped.title, 'Review Quarterly Taxes');
      assert.equal(mapped.description, 'Check advance tax payment receipt');
      assert.equal(mapped.dueDate, '2026-10-31');
      assert.equal(mapped.source, 'GoogleTasks');
      assert.equal(mapped.externalId, 'gtask_123');
      assert.equal(mapped.category, 'FINANCIAL');
      assert.equal(mapped.status, 'Not Started');
    });

    it('detects already imported tasks to prevent duplicate creation', () => {
      const localTasks = [
        { taskId: 't1', title: 'Local Task 1', source: 'Internal' },
        { taskId: 't2', title: 'Imported Task', source: 'GoogleTasks', externalId: 'gtask_existing_99' }
      ];

      assert.equal(googleTasksService.isAlreadyImported('gtask_existing_99', localTasks), true);
      assert.equal(googleTasksService.isAlreadyImported('gtask_new_100', localTasks), false);
    });
  });
});
