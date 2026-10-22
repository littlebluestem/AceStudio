/**
 * The RSVP confirmation email, sent through Resend with the same
 * RESEND_API_KEY the enquiry form uses.
 *
 * Fails soft, unlike the enquiry form: the RSVP is already stored by the
 * time this runs, so a mail hiccup is logged, never shown as the RSVP
 * failing. Someone stored but not emailed is still on the guest list.
 *
 *   RSVP_FROM      optional — defaults to DEFAULT_FROM below
 *   MAIL_TO        optional — the Reply-To, same default as the enquiry form
 */

const DEFAULT_FROM = "Ace Studio <events@thisisacestudio.com>";
const DEFAULT_REPLY_TO = "info@thisisacestudio.com";
const ADDRESS = "603 W 11th St, Suite 100, Houston, TX 77008";

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendRsvpConfirmation({ name, email, title, when, dated, attachment }, env) {
  if (!env.RESEND_API_KEY) {
    console.log("no RESEND_API_KEY bound — RSVP confirmation not sent to", email);
    return false;
  }

  const first = name.split(/\s+/)[0];
  const lines = dated
    ? [`You're on the list for ${title}.`, `${when}`, `Ace Studio, ${ADDRESS}`, "Nothing else to do — see you there. If your plans change, just reply and let us know."]
    : [`You're on the list for ${title}.`, "Dates aren't set yet — we'll email you as soon as they are.", "If you change your mind, just reply and let us know."];

  const text = `Hi ${first},\n\n${lines.join("\n\n")}\n\nAce Studio\nthisisacestudio.com\n`;
  const html = `<!doctype html>
<html><body style="margin:0;padding:32px;background:#FFF8EF;color:#000022;font:15px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace">
<p style="margin:0 0 1.2em">Hi ${escapeHtml(first)},</p>
${lines.map((l, i) => `<p style="margin:0 0 1.2em">${i === 0 ? `You're on the list for <strong>${escapeHtml(title)}</strong>.` : escapeHtml(l)}</p>`).join("\n")}
<p style="margin:2em 0 0">Ace Studio<br><a href="https://thisisacestudio.com" style="color:#8E1D1A">thisisacestudio.com</a></p>
</body></html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.RSVP_FROM || DEFAULT_FROM,
        to: [email],
        reply_to: env.MAIL_TO || DEFAULT_REPLY_TO,
        subject: `You're on the list — ${title}`,
        text,
        html,
        // Resend fetches the file from the site itself.
        ...(attachment ? { attachments: [{ path: attachment, filename: attachment.split("/").pop() }] } : {}),
      }),
    });
    if (!res.ok) {
      console.error("RSVP mail send failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("RSVP mail send threw", err);
    return false;
  }
}
