import { config } from './config.js';

const FRIDAY = 5; // ISO weekday index we map to below

function zonedParts(date, timezone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value])
  );
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    weekday: weekdays[parts.weekday],
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/**
 * Fun Friday window status, computed in the office timezone.
 * Window: Friday 17:00 - 17:30 (config.funFriday).
 *
 * Countdowns are computed with wall-clock arithmetic in the office
 * timezone. This is exact for fixed-offset zones (e.g. Asia/Kolkata).
 */
export function getFunFridayStatus(now = new Date()) {
  const { timezone, startHour, startMinute, endHour, endMinute, alwaysOpen } =
    config.funFriday;

  const z = zonedParts(now, timezone);
  const secondsOfDay = z.hour * 3600 + z.minute * 60 + z.second;
  const startSec = startHour * 3600 + startMinute * 60;
  const endSec = endHour * 3600 + endMinute * 60;

  const isWindow = z.weekday === FRIDAY && secondsOfDay >= startSec && secondsOfDay < endSec;
  const active = alwaysOpen || isWindow;

  let secondsToStart = 0;
  let secondsToEnd = 0;

  if (isWindow) {
    secondsToEnd = endSec - secondsOfDay;
  } else {
    let daysAhead = (FRIDAY - z.weekday + 7) % 7;
    if (daysAhead === 0 && secondsOfDay >= endSec) daysAhead = 7;
    secondsToStart = daysAhead * 86400 + startSec - secondsOfDay;
    if (secondsToStart < 0) secondsToStart += 7 * 86400;
  }

  return {
    active,
    isWindow,
    alwaysOpen,
    timezone,
    window: { day: 'Friday', start: '17:00', end: '17:30' },
    secondsToStart,
    secondsToEnd,
    nextStartAt: isWindow
      ? null
      : new Date(now.getTime() + secondsToStart * 1000).toISOString(),
    endsAt: isWindow
      ? new Date(now.getTime() + secondsToEnd * 1000).toISOString()
      : null,
    serverTime: now.toISOString(),
  };
}
