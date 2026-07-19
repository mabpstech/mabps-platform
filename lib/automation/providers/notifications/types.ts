export type NotificationProviderSendInput = {
  userId?: string | null;
  title: string;
  body: string;
  href?: string | null;
  category?: string;
  priority?: string;
  channels?: string[];
  templateId?: string | null;
  variables?: Record<string, string>;
  email?: string | null;
  phone?: string | null;
  crmEntityType?: string | null;
  crmEntityId?: string | null;
  metadata?: Record<string, unknown>;
};

export type NotificationProviderSendResult = {
  ok: boolean;
  notificationId?: string;
  error?: string;
  raw?: Record<string, unknown>;
};

export type NotificationAutomationProviderConfig = {
  workspaceId?: string;
};

export type NotificationAutomationProvider = {
  id: string;
  isImplemented: boolean;
  sendNotification(
    config: NotificationAutomationProviderConfig & { workspaceId?: string },
    input: NotificationProviderSendInput,
  ): Promise<NotificationProviderSendResult>;
};
