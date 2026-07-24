export { renderWelcomeEmail } from "@/lib/email/templates/welcome";
export { renderVerifyEmail } from "@/lib/email/templates/verify";
export { renderPasswordResetEmail } from "@/lib/email/templates/password-reset";
export { renderPaymentSuccessEmail } from "@/lib/email/templates/payment-success";
export { renderPaymentFailedEmail } from "@/lib/email/templates/payment-failed";
export { renderTrialEndingEmail } from "@/lib/email/templates/trial-ending";
export { renderSubscriptionCancelledEmail } from "@/lib/email/templates/subscription-cancelled";
export {
  escapeHtml,
  greetingFor,
  renderEmailLayout,
  renderParagraph,
  renderButton,
  renderLinkFallback,
} from "@/lib/email/templates/layout";
