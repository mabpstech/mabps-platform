import { timingSafeEqual } from "node:crypto";

/** Constant-time string compare for shared secrets. */
export function secretsMatch(
  expected: string,
  provided: string | null | undefined,
): boolean {
  if (!provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
