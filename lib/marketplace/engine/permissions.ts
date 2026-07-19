import {
  PLUGIN_PERMISSIONS,
  type PluginPermission,
} from "@/lib/marketplace/types";

export function isPluginPermission(value: string): value is PluginPermission {
  return (PLUGIN_PERMISSIONS as readonly string[]).includes(value);
}

export function normalizePermissions(
  values: unknown,
): PluginPermission[] {
  if (!Array.isArray(values)) return [];
  const unique = new Set<PluginPermission>();
  for (const value of values) {
    if (typeof value === "string" && isPluginPermission(value)) {
      unique.add(value);
    }
  }
  return [...unique];
}

export function hasPermission(
  granted: readonly PluginPermission[],
  required: PluginPermission,
): boolean {
  return granted.includes(required);
}

export function assertPermissions(
  granted: readonly PluginPermission[],
  required: readonly PluginPermission[],
): void {
  const missing = required.filter((permission) => !granted.includes(permission));
  if (missing.length) {
    throw new Error(
      `Plugin permission denied. Missing: ${missing.join(", ")}.`,
    );
  }
}

export function intersectPermissions(
  requested: readonly PluginPermission[],
  available: readonly PluginPermission[],
): PluginPermission[] {
  const allowed = new Set(available);
  return requested.filter((permission) => allowed.has(permission));
}
