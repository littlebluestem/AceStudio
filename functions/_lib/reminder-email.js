// Day-of reminder for Joe Espinoza's photo lecture, styled like the RSVP
// confirmation (_lib/mail.js). Sent from /rsvps/reminder.

import { escapeHtml } from "./mail.js";

export const REMINDER_SUBJECT = "Reminder: Joe Espinoza photo lecture, tonight at 6:30";

const BODY = [
  "Quick reminder: you're on the list for tonight's photo lecture with Joe Espinoza at Ace Studio. We can't wait to see you.",
  "WHEN: Today, Thursday, Nov 12, 6:30–8:00 PM\nWHERE: Ace Studio, 603 W 11th St, Suite 100, Houston, TX 77008\nPARKING: On-site and street parking",
  "Can't make it? Please reply to this email and let us know. We have folks on the waitlist, and we'd love to pass your seat along.",
];

const FOOTER = "Ace Studio, 603 W 11th St, Suite 100, Houston, TX 77008\nYou're getting this because you RSVP'd to a lecture at Ace Studio.";

export function reminderEmail(name) {
  const first = (name || "").trim().split(/\s+/)[0] || "there";
  const text = `Hi ${first},\n\n${BODY.join("\n\n")}\n\nSee you tonight,\nThe Ace Studio team\n\n--\n${FOOTER}\n`;
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(REMINDER_SUBJECT)}</title></head>
<body style="margin:0;padding:32px;background:#FFF8EF;color:#000022;font:15px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace">
<p style="margin:0 0 1.2em">Hi ${escapeHtml(first)},</p>
${BODY.map((t) => `<p style="margin:0 0 1.2em">${escapeHtml(t).replace(/\n/g, "<br>")}</p>`).join("\n")}
<p style="margin:2em 0 0">See you tonight,<br>The Ace Studio team</p>
<p style="margin:2em 0 0;font-size:12px;color:#4F4B46">${escapeHtml(FOOTER).replace("\n", "<br>")}</p>
</body></html>`;
  return { text, html };
}
