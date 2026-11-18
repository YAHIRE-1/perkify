const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });

type NotificationTemplate = {
  heading: string;
  body: string;
  action: { label: string; href: string };
  code?: string;
  footnote: string;
  preferencesHref?: string;
};

export function renderNotificationEmail({ heading, body, action, code, footnote, preferencesHref }: NotificationTemplate) {
  const text = [
    heading,
    body,
    code && `Verification code: ${code}`,
    `${action.label}: ${action.href}`,
    footnote,
    preferencesHref && `Manage email notifications: ${preferencesHref}`,
  ].filter(Boolean).join("\n\n");

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;background:#F5F8F4;font-family:Arial,Helvetica,sans-serif;color:#0B0F0D;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5F8F4" style="background:#F5F8F4;">
    <tr><td align="center" style="padding:36px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="max-width:520px;background:#FFFFFF;border:1px solid #D5E0D8;border-radius:20px;">
        <tr><td align="center" style="padding:32px 24px 0;">
          <span aria-label="Perkify" style="color:#0B0F0D;font-size:30px;font-weight:800;letter-spacing:-1.5px;">Prky<span style="color:#3F7000;">.</span></span>
        </td></tr>
        <tr><td align="center" style="padding:24px 24px 32px;">
          <h1 style="margin:0 0 12px;color:#0B0F0D;font-size:27px;line-height:1.2;letter-spacing:-0.5px;">${escapeHtml(heading)}</h1>
          <p style="margin:0 0 24px;color:#4F6156;font-size:15px;line-height:1.65;overflow-wrap:anywhere;">${escapeHtml(body)}</p>
          ${code ? `<table role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" bgcolor="#EFF7E6" style="max-width:320px;background:#EFF7E6;border:1px solid #D3E6C5;border-radius:14px;">
            <tr><td align="center" style="padding:18px 12px 20px;">
              <div style="color:#3F7000;font-size:13px;font-weight:700;line-height:1.4;">Verification code</div>
              <strong style="display:block;margin-top:6px;color:#163B0D;font-family:Consolas,monospace;font-size:40px;letter-spacing:6px;line-height:1.2;">${escapeHtml(code)}</strong>
            </td></tr>
          </table>
          <div style="height:24px;line-height:24px;font-size:1px;">&nbsp;</div>` : ""}
          <table role="presentation" align="center" cellpadding="0" cellspacing="0">
            <tr><td align="center" bgcolor="#A7F432" style="background:#A7F432;border-radius:10px;">
              <a href="${escapeHtml(action.href)}" style="display:inline-block;padding:14px 22px;color:#0B0F0D;font-weight:700;font-size:14px;line-height:18px;text-decoration:none;">${escapeHtml(action.label)}</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:18px 24px 22px;border-top:1px solid #E6EDE4;color:#4F6156;font-size:13px;line-height:1.6;">
          ${escapeHtml(footnote)}
          ${preferencesHref ? `<br><a href="${escapeHtml(preferencesHref)}" style="color:#3F7000;">Manage email notifications</a>` : ""}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { text, html };
}
