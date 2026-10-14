/**
 * POST /api/enquiry — the Contact tab's form.
 *
 * Emails the enquiry to the studio through Resend (Cloudflare can't send
 * mail itself). Reply-To is the visitor, so hitting Reply in the inbox
 * answers them directly.
 *
 * Configuration, as Cloudflare Pages environment variables (see README):
 *   RESEND_API_KEY  required (encrypted) — without it every enquiry 503s
 *   MAIL_TO         optional — defaults to info@thisisacestudio.com
 *   MAIL_FROM       optional — must be on a domain verified in Resend
 *
 * Unlike a signup, nothing is stored here, so a failed send is reported
 * back to the page rather than swallowed — the visitor is told to email
 * instead of being left thinking it went through.
 */

const DEFAULT_TO = "info@thisisacestudio.com";
const DEFAULT_FROM = "Ace Studio website <website@thisisacestudio.com>";

const FIELDS = [
  ["name", "Name", 200],
  ["email", "Email", 320],
  ["kind", "Planning", 100],
  ["dates", "Dates", 200],
  ["size", "Group size", 100],
  ["hours", "Hours needed", 200],
  ["notes", "Anything else", 1200],
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }

  // Honeypot: a hidden field people never see. Bots fill it; pretend success.
  if (data.website) return json({ ok: true });

  const v = {};
  for (const [key, , max] of FIELDS) {
    v[key] = String(data[key] ?? "").trim().slice(0, max);
  }
  // Header fields must stay on one line.
  v.name = v.name.replace(/[\r\n]+/g, " ");
  v.email = v.email.replace(/[\r\n]+/g, "");

  if (!v.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) {
    return json({ error: "Please add your name and a valid email." }, 400);
  }

  if (!env.RESEND_API_KEY) {
    console.error("no RESEND_API_KEY bound — enquiry not sent");
    return json({ error: "not configured" }, 503);
  }

  const rows = FIELDS.filter(([k]) => k !== "notes");
  const text =
    rows.map(([k, label]) => `${label}: ${v[k]}`).join("\n") +
    `\n\n${v.notes}\n`;
  const html = `<!doctype html><html><body style="font:15px/1.6 -apple-system,Helvetica,Arial,sans-serif;color:#111">
<table cellpadding="4" style="border-collapse:collapse">${rows
    .map(([k, label]) => `<tr><td style="color:#777;padding-right:16px">${label}</td><td>${escapeHtml(v[k])}</td></tr>`)
    .join("")}</table>
<p style="white-space:pre-wrap;margin-top:1.4em">${escapeHtml(v.notes)}</p>
</body></html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.MAIL_FROM || DEFAULT_FROM,
        to: [env.MAIL_TO || DEFAULT_TO],
        reply_to: `${v.name} <${v.email}>`,
        subject: `Enquiry: ${v.kind || "General"} — ${v.name}`,
        text,
        html,
      }),
    });
    if (!res.ok) {
      // Resend explains refusals (unverified domain, bad key) in the body.
      console.error("mail send failed", res.status, await res.text().catch(() => ""));
      return json({ error: "send failed" }, 502);
    }
  } catch (err) {
    console.error("mail send threw", err);
    return json({ error: "send failed" }, 502);
  }

  return json({ ok: true });
}
