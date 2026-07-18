type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Application-owned email delivery for verification, password reset, and invites.
 * Uses Resend when RESEND_API_KEY is set; otherwise logs the message (dev-safe).
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "MABPS <noreply@localhost>";

  if (!apiKey) {
    console.info("[email:dev]", {
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to send email (${response.status}): ${body}`);
  }
}

export async function sendPasswordResetEmail(params: {
  email: string;
  url: string;
  name?: string | null;
}): Promise<void> {
  const greeting = params.name ? `Hi ${params.name},` : "Hi,";
  await sendEmail({
    to: params.email,
    subject: "Reset your MABPS password",
    text: `${greeting}\n\nReset your password using this link:\n${params.url}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>${greeting}</p><p><a href="${params.url}">Reset your password</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });
}

export async function sendVerificationEmail(params: {
  email: string;
  url: string;
  name?: string | null;
}): Promise<void> {
  const greeting = params.name ? `Hi ${params.name},` : "Hi,";
  await sendEmail({
    to: params.email,
    subject: "Verify your MABPS email",
    text: `${greeting}\n\nVerify your email using this link:\n${params.url}`,
    html: `<p>${greeting}</p><p><a href="${params.url}">Verify your email</a></p>`,
  });
}

export async function sendOrganizationInvitationEmail(params: {
  email: string;
  invitedByUsername: string;
  invitedByEmail: string;
  workspaceName: string;
  inviteLink: string;
}): Promise<void> {
  await sendEmail({
    to: params.email,
    subject: `Join ${params.workspaceName} on MABPS`,
    text: `${params.invitedByUsername} (${params.invitedByEmail}) invited you to the workspace "${params.workspaceName}".\n\nAccept the invitation:\n${params.inviteLink}`,
    html: `<p><strong>${params.invitedByUsername}</strong> (${params.invitedByEmail}) invited you to the workspace <strong>${params.workspaceName}</strong>.</p><p><a href="${params.inviteLink}">Accept invitation</a></p>`,
  });
}
