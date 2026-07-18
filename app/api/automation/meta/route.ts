import { NextResponse } from "next/server";
import { requireAutomationMemberApi } from "@/lib/automation/access";
import { listActionTypes } from "@/lib/automation/actions";
import { TRIGGER_LABELS } from "@/lib/automation/defaults";
import { automationErrorResponse } from "@/lib/automation/http";
import {
  ACTION_TYPES,
  CONDITION_OPERATORS,
  NODE_KINDS,
  TRIGGER_TYPES,
  WORKFLOW_STATUSES,
} from "@/lib/automation/types";

export async function GET() {
  try {
    await requireAutomationMemberApi();
    return NextResponse.json({
      triggerTypes: TRIGGER_TYPES,
      triggerLabels: TRIGGER_LABELS,
      actionTypes: listActionTypes(),
      allActionTypes: ACTION_TYPES,
      nodeKinds: NODE_KINDS,
      conditionOperators: CONDITION_OPERATORS,
      workflowStatuses: WORKFLOW_STATUSES,
    });
  } catch (error) {
    return automationErrorResponse(error);
  }
}
