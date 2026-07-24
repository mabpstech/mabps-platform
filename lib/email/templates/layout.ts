const BRAND = "MABPS";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function greetingFor(name?: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? `Hi ${trimmed},` : "Hi,";
}

/**
 * Shared transactional email HTML shell.
 */
export function renderEmailLayout(input: {
  title: string;
  preheader?: string;
  bodyHtml: string;
}): string {
  const preheader = input.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
  ${preheader}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:28px 28px 8px;font-size:18px;font-weight:700;letter-spacing:0.04em;">${BRAND}</td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;font-size:15px;line-height:1.6;">
              ${input.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 28px;font-size:12px;line-height:1.5;color:#6b7280;border-top:1px solid #e5e7eb;">
              You received this email from ${BRAND}.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderParagraph(text: string): string {
  return `<p style="margin:0 0 16px;">${escapeHtml(text)}</p>`;
}

export function renderButton(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 20px;font-size:14px;font-weight:600;">${escapeHtml(label)}</a></p>`;
}

export function renderLinkFallback(href: string): string {
  return `<p style="margin:0 0 16px;font-size:13px;color:#6b7280;word-break:break-all;">Or open this link:<br /><a href="${escapeHtml(href)}" style="color:#2563eb;">${escapeHtml(href)}</a></p>`;
}
