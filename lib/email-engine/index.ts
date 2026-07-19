export * from "@/lib/email-engine/types";
export {
  DEFAULT_EMAIL_PROVIDER,
  DEFAULT_SES_REGION,
  DEFAULT_SMTP_PORT,
  generateWebhookPathSecret,
  generateTrackingSecret,
  generateTrackingToken,
  normalizeEmail,
  isValidEmail,
  maskSecret,
  truncateSummary,
  slugify,
  formatFromAddress,
  hashIp,
  renderTemplateString,
} from "@/lib/email-engine/defaults";
export { migrateEmailEngineSchema } from "@/lib/email-engine/migrate";
export type { EmailSettingsPublic } from "@/lib/email-engine/repository";
export {
  ensureEmailEngineReady,
  ensureWorkspaceEmail,
  getEmailSettings,
  updateEmailSettings,
  toPublicSettings,
  getSettingsByWebhookSecret,
  requireConnectedCredentials,
  listContacts,
  getContactById,
  getContactByEmail,
  upsertContact,
  listTemplates,
  getTemplateById,
  getTemplateBySlug,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  listMessages,
  getMessageById,
  getMessageByTrackingToken,
  getMessageByProviderId,
  createMessage,
  updateMessage,
  listCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  listCampaignRecipients,
  updateCampaignRecipient,
  createEmailLog,
  listEmailLogs,
  createEmailEvent,
  listEmailEvents,
  getEmailOverview,
} from "@/lib/email-engine/repository";
export {
  sendWorkspaceEmail,
  sendTransactionalEmail,
  sendMarketingEmail,
} from "@/lib/email-engine/engine/send";
export { runEmailCampaign } from "@/lib/email-engine/engine/campaigns";
export {
  resolveEmailTemplate,
  renderEmailTemplate,
} from "@/lib/email-engine/engine/templates";
export {
  syncEmailContactToCrm,
  syncAllEmailContactsToCrm,
} from "@/lib/email-engine/engine/crm-sync";
export {
  trackOpen,
  trackClick,
  recordDeliveryEvent,
  injectTracking,
  getTrackingPixelBuffer,
} from "@/lib/email-engine/engine/tracking";
export { processEmailWebhook } from "@/lib/email-engine/engine/webhooks";
export { sendWithProvider } from "@/lib/email-engine/providers";
