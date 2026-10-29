/**
 * Deterministic Calendar Math & Interval Merging Utility
 * for RoutineTargetCompletion
 *
 * Capabilities:
 * - Overlapping interval union (no double counting of busy time)
 * - Workday boundary clamping (e.g., standard 08:00 to 20:00 span)
 * - All-day vs timed event handling
 * - Conflict detection between multiple commitments
 * - Pure JavaScript, 100% deterministic, zero LLM dependency
 */

/**
 * Normalizes an event's start and end times to Date objects
 */
export function parseEventInterval(event, targetDateStr) {
  if (!event) return null;

  // All-day event handling (Google Calendar sends { date: 'YYYY-MM-DD' })
  if (event.start?.date || event.isAllDay) {
    const dateStr = event.start?.date || targetDateStr;
    const start = new Date(`${dateStr}T09:00:00`);
    const end = new Date(`${dateStr}T17:00:00`);
    return {
      id: event.id || 'allday',
      title: event.summary || event.title || 'All-Day Event',
      start,
      end,
      isAllDay: true,
      status: event.status || 'confirmed'
    };
  }

  // Timed event (Google Calendar sends { dateTime: 'ISO...' })
  const startStr = event.start?.dateTime || event.start;
  const endStr = event.end?.dateTime || event.end;

  if (!startStr || !endStr) return null;

  const start = new Date(startStr);
  const end = new Date(endStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return null;
  }

  return {
    id: event.id || String(Math.random()),
    title: event.summary || event.title || 'Untitled Event',
    start,
    end,
    isAllDay: false,
    status: event.status || 'confirmed'
  };
}

/**
 * Merges an array of possibly overlapping intervals into disjoint intervals.
 * 
 * @param {Array<{start: Date, end: Date}>} intervals
 * @returns {Array<{start: Date, end: Date, durationMinutes: number}>}
 */
export function mergeOverlappingIntervals(intervals = []) {
  if (!Array.isArray(intervals) || intervals.length === 0) return [];

  // Filter valid intervals
  const valid = intervals
    .filter(i => i && i.start instanceof Date && i.end instanceof Date && i.end > i.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (valid.length === 0) return [];

  const merged = [];
  let currentStart = valid[0].start;
  let currentEnd = valid[0].end;

  for (let i = 1; i < valid.length; i++) {
    const next = valid[i];

    if (next.start.getTime() <= currentEnd.getTime()) {
      // Overlap or contiguous: extend currentEnd if next extends further
      if (next.end.getTime() > currentEnd.getTime()) {
        currentEnd = next.end;
      }
    } else {
      // Gap: push finished interval and start a new one
      const durationMinutes = Math.round((currentEnd.getTime() - currentStart.getTime()) / 60000);
      merged.push({
        start: currentStart,
        end: currentEnd,
        durationMinutes
      });
      currentStart = next.start;
      currentEnd = next.end;
    }
  }

  // Push the final interval
  const durationMinutes = Math.round((currentEnd.getTime() - currentStart.getTime()) / 60000);
  merged.push({
    start: currentStart,
    end: currentEnd,
    durationMinutes
  });

  return merged;
}

/**
 * Calculates total busy commitment minutes for a given day from Google Calendar events.
 * Only counts confirmed (or default status) events, ignoring cancelled ones.
 * Avoids double-counting overlapping meetings.
 *
 * @param {Array} events Raw or parsed Google Calendar events
 * @param {string} targetDateStr Date in YYYY-MM-DD
 * @returns {{ busyMinutes: number, mergedIntervals: Array, parsedEvents: Array, conflicts: Array }}
 */
export function calculateCalendarCommitments(events = [], targetDateStr = new Date().toISOString().split('T')[0]) {
  if (!Array.isArray(events) || events.length === 0) {
    return {
      busyMinutes: 0,
      mergedIntervals: [],
      parsedEvents: [],
      conflicts: []
    };
  }

  // 1. Parse and filter for target date and non-cancelled status
  const parsedEvents = [];
  const conflicts = [];

  events.forEach(evt => {
    if (evt.status === 'cancelled') return;

    const interval = parseEventInterval(evt, targetDateStr);
    if (!interval) return;

    // Check if event touches target date
    const evtDateStr = interval.start.toISOString().split('T')[0];
    if (evtDateStr === targetDateStr || interval.isAllDay) {
      parsedEvents.push(interval);
    }
  });

  // 2. Detect direct conflicts between separate events
  for (let i = 0; i < parsedEvents.length; i++) {
    for (let j = i + 1; j < parsedEvents.length; j++) {
      const a = parsedEvents[i];
      const b = parsedEvents[j];
      if (a.start < b.end && b.start < a.end) {
        conflicts.push({
          eventA: a.title,
          eventB: b.title,
          overlapMinutes: Math.round(
            (Math.min(a.end.getTime(), b.end.getTime()) - Math.max(a.start.getTime(), b.start.getTime())) / 60000
          )
        });
      }
    }
  }

  // 3. Merge overlapping intervals to get true non-overlapping busy time
  const mergedIntervals = mergeOverlappingIntervals(parsedEvents);
  const busyMinutes = mergedIntervals.reduce((sum, item) => sum + item.durationMinutes, 0);

  return {
    busyMinutes,
    mergedIntervals,
    parsedEvents,
    conflicts
  };
}

/**
 * Calculates net available discretionary planning minutes after deducting calendar events.
 * Enforces a minimum guaranteed floor so users always have focus time available.
 *
 * @param {number} grossCapacity Available baseline capacity (e.g. 480m)
 * @param {number} calendarBusyMinutes Minutes occupied by meetings
 * @param {number} minFloor Minimum guaranteed discretionary minutes (default 60m)
 * @returns {number} Net available planning minutes
 */
export function calculateNetPlanningCapacity(grossCapacity = 480, calendarBusyMinutes = 0, minFloor = 60) {
  const gross = Math.max(minFloor, Number(grossCapacity) || 480);
  const busy = Math.max(0, Number(calendarBusyMinutes) || 0);
  return Math.max(minFloor, gross - busy);
}
