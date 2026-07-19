import type {
  TriggerType,
  WorkflowDefinition,
  WorkflowNode,
} from "@/lib/automation/types";

export function defaultTriggerNode(triggerType: TriggerType): WorkflowNode {
  return {
    id: "trigger_1",
    name: "Trigger",
    kind: "trigger",
    type: triggerType,
    config: {},
  };
}

export function defaultWorkflowDefinition(
  triggerType: TriggerType = "manual",
): WorkflowDefinition {
  return [
    defaultTriggerNode(triggerType),
    {
      id: "condition_1",
      name: "Condition",
      kind: "condition",
      type: "condition",
      config: {
        logic: "and",
        rules: [],
      },
    },
    {
      id: "action_1",
      name: "Send email",
      kind: "action",
      type: "email.send",
      config: {
        to: "{{trigger.email}}",
        subject: "Hello from {{workflow.name}}",
        text: "Triggered automation for {{trigger.firstName}}.",
        html: "<p>Triggered automation for {{trigger.firstName}}.</p>",
      },
    },
  ];
}

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  manual: "Manual",
  schedule: "Schedule",
  webhook: "Webhook",
  api: "API",
  "website.form_submitted": "Website form submitted",
  "website.page_published": "Website page published",
  "crm.lead_created": "CRM lead created",
  "crm.lead_updated": "CRM lead updated",
  "crm.deal_stage_changed": "CRM deal stage changed",
  "crm.contact_created": "CRM contact created",
  "crm.task_created": "CRM task created",
  "chatbot.conversation_started": "Chatbot conversation started",
  "chatbot.message_received": "Chatbot message received",
  "chatbot.handoff_requested": "Chatbot handoff requested",
  "chatbot.lead_captured": "Chatbot lead captured",
  "whatsapp.conversation_started": "WhatsApp conversation started",
  "whatsapp.message_received": "WhatsApp message received",
};
