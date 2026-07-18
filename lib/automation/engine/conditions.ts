import { getByPath } from "@/lib/automation/engine/templates";
import type {
  ConditionGroup,
  ConditionOperator,
  ConditionRule,
  TemplateContext,
} from "@/lib/automation/types";

function coerceComparable(value: unknown): unknown {
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    const asNum = Number(value);
    if (String(asNum) === value.trim()) return asNum;
  }
  return value;
}

function evaluateRule(rule: ConditionRule, context: TemplateContext): boolean {
  const left = getByPath(context, rule.path);
  const right = rule.value;
  const op: ConditionOperator = rule.operator;

  switch (op) {
    case "exists":
      return left !== undefined && left !== null && left !== "";
    case "not_exists":
      return left === undefined || left === null || left === "";
    case "eq":
      return left === right || String(left) === String(right);
    case "neq":
      return left !== right && String(left) !== String(right);
    case "contains":
      return String(left ?? "").includes(String(right ?? ""));
    case "not_contains":
      return !String(left ?? "").includes(String(right ?? ""));
    case "gt":
      return Number(coerceComparable(left)) > Number(coerceComparable(right));
    case "gte":
      return Number(coerceComparable(left)) >= Number(coerceComparable(right));
    case "lt":
      return Number(coerceComparable(left)) < Number(coerceComparable(right));
    case "lte":
      return Number(coerceComparable(left)) <= Number(coerceComparable(right));
    case "in": {
      const list = Array.isArray(right)
        ? right
        : String(right ?? "")
            .split(",")
            .map((item) => item.trim());
      return list.map(String).includes(String(left));
    }
    case "not_in": {
      const list = Array.isArray(right)
        ? right
        : String(right ?? "")
            .split(",")
            .map((item) => item.trim());
      return !list.map(String).includes(String(left));
    }
    default:
      return false;
  }
}

export function evaluateConditionGroup(
  group: ConditionGroup | undefined,
  context: TemplateContext,
): boolean {
  if (!group || !group.rules?.length) return true;
  const logic = group.logic === "or" ? "or" : "and";
  if (logic === "or") {
    return group.rules.some((rule) => evaluateRule(rule, context));
  }
  return group.rules.every((rule) => evaluateRule(rule, context));
}
