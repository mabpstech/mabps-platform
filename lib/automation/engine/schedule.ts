/**
 * Minimal cron helpers for five-field expressions:
 * minute hour day-of-month month day-of-week
 * Supports *, ranges (1-5), lists (1,2,3), and steps (* /5).
 */

function parseField(
  field: string,
  min: number,
  max: number,
): Set<number> {
  const values = new Set<number>();
  for (const part of field.split(",")) {
    if (part === "*") {
      for (let i = min; i <= max; i += 1) values.add(i);
      continue;
    }
    if (part.includes("/")) {
      const [range, stepRaw] = part.split("/");
      const step = Number(stepRaw);
      if (!Number.isFinite(step) || step <= 0) continue;
      let start = min;
      let end = max;
      if (range !== "*") {
        if (range.includes("-")) {
          const [a, b] = range.split("-").map(Number);
          start = a;
          end = b;
        } else {
          start = Number(range);
        }
      }
      for (let i = start; i <= end; i += step) values.add(i);
      continue;
    }
    if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number);
      for (let i = a; i <= b; i += 1) values.add(i);
      continue;
    }
    const n = Number(part);
    if (Number.isFinite(n)) values.add(n);
  }
  return values;
}

export function isValidCronExpression(expression: string): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  try {
    parseField(parts[0], 0, 59);
    parseField(parts[1], 0, 23);
    parseField(parts[2], 1, 31);
    parseField(parts[3], 1, 12);
    parseField(parts[4], 0, 6);
    return true;
  } catch {
    return false;
  }
}

function matchesDate(expression: string, date: Date): boolean {
  const [minute, hour, dom, month, dow] = expression.trim().split(/\s+/);
  const minutes = parseField(minute, 0, 59);
  const hours = parseField(hour, 0, 23);
  const days = parseField(dom, 1, 31);
  const months = parseField(month, 1, 12);
  const dows = parseField(dow, 0, 6);

  return (
    minutes.has(date.getUTCMinutes()) &&
    hours.has(date.getUTCHours()) &&
    days.has(date.getUTCDate()) &&
    months.has(date.getUTCMonth() + 1) &&
    dows.has(date.getUTCDay())
  );
}

/** Next matching UTC minute at or after `from` (exclusive of exact second). */
export function getNextCronRunAt(
  expression: string,
  from: Date = new Date(),
): string {
  if (!isValidCronExpression(expression)) {
    throw new Error("Invalid cron expression.");
  }
  const cursor = new Date(from);
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);

  for (let i = 0; i < 60 * 24 * 366; i += 1) {
    if (matchesDate(expression, cursor)) {
      return cursor.toISOString();
    }
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  }
  throw new Error("Unable to compute next cron run.");
}

export function computeDelayMs(config: {
  seconds?: number;
  minutes?: number;
  hours?: number;
}): number {
  const seconds = Number(config.seconds ?? 0);
  const minutes = Number(config.minutes ?? 0);
  const hours = Number(config.hours ?? 0);
  const total =
    Math.max(0, seconds) +
    Math.max(0, minutes) * 60 +
    Math.max(0, hours) * 3600;
  return Math.max(0, Math.floor(total * 1000));
}
