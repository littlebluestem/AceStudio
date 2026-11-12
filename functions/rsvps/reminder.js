/**
 * /rsvps/reminder — day-of reminder (_lib/reminder-email.js) to the
 * CONFIRMED RSVPs of Joe Espinoza's lecture (waitlist skipped). Same
 * mechanism as /rsvps/thank-you, with its own dedupe prefix and no attachment.
 * Same password as /rsvps (_lib/auth.js); same Resend key, From and
 * Reply-To as the RSVP confirmations (_lib/mail.js).
 *
 *   GET                  recipient count, first names, preview, two buttons
 *   POST action=test     one copy to TEST_TO, not recorded
 *   POST action=all      one email per recipient, one Resend call each,
 *                        paced for Resend's rate limit, each with an
 *                        idempotency key. Each sent address is recorded in KV as
 *                        `reminder-sent:<slug>:<email>` and skipped next time,
 *                        so a double click or a retry can't double-send.
 *
 * Recipients are the event's RSVPs, deduped by email (case-insensitive),
 * minus test entries (example.com addresses, or "test" in the name).
 *
 *   RESEND_API_BASE  optional — points local testing at a stub; leave unset
 */

import { checkAuth, unauthorized } from "../_lib/auth.js";
import { escapeHtml, DEFAULT_FROM, DEFAULT_REPLY_TO } from "../_lib/mail.js";
import { reminderEmail, REMINDER_SUBJECT } from "../_lib/reminder-email.js";

const EVENT = "photo-lecture-joe-spinoza";
const SUBJECT = REMINDER_SUBJECT;
const TEST_TO = "javifdz89@gmail.com";
const SENT_PREFIX = `reminder-sent:${EVENT}:`;

const html = (body, status = 200) =>
  new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });

const isTest = (r) => /@example\.com$/i.test(r.email || "") || /\btest\b/i.test(r.name || "");

async function listAll(kv, prefix) {
  const keys = [];
  let cursor;
  do {
    const listed = await kv.list({ prefix, cursor, limit: 1000 });
    keys.push(...listed.keys);
    cursor = listed.list_complete ? undefined : listed.cursor;
  } while (cursor);
  return keys;
}

async function recipients(kv) {
  const byEmail = new Map();
  let waitlist = 0;
  for (const key of await listAll(kv, `rsvp:${EVENT}:`)) {
    const r = key.metadata || (await kv.get(key.name, "json"));
    if (!r || !r.email || isTest(r)) continue;
    if (r.status === "waitlist") { waitlist++; continue; }
    const email = r.email.trim().toLowerCase();
    if (!byEmail.has(email)) byEmail.set(email, { name: (r.name || "").trim(), email });
  }
  const list = [...byEmail.values()].sort((a, b) => a.name.localeCompare(b.name));
  list.waitlist = waitlist;
  return list;
}

async function alreadySent(kv) {
  return new Set((await listAll(kv, SENT_PREFIX)).map((k) => k.name.slice(SENT_PREFIX.length)));
}

function message(env, to, name) {
  const { text, html } = reminderEmail(name);
  return {
    from: env.RSVP_FROM || DEFAULT_FROM,
    reply_to: env.MAIL_TO || DEFAULT_REPLY_TO,
    to: [to],
    subject: SUBJECT,
    text,
    html,
    headers: { "List-Unsubscribe": `<mailto:${DEFAULT_REPLY_TO}?subject=Unsubscribe>` },
  };
}

async function resend(env, path, body, idempotencyKey) {
  const res = await fetch(`${env.RESEND_API_BASE || "https://api.resend.com"}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${data.message || JSON.stringify(data)}`);
  return data;
}

function page({ list, sent, notice }) {
  const pending = list.filter((r) => !sent.has(r.email));
  const names = list.map((r) => `<li${sent.has(r.email) ? ' class="done"' : ""}>${escapeHtml(r.name.split(/\s+/)[0] || "(no name)")}</li>`).join("");
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Reminder email — Ace Studio</title>
<style>
  body{margin:0 auto;max-width:56rem;padding:2.5rem 1.25rem 4rem;background:#FFF8EF;color:#000022;font:14px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;}
  h1{font-size:14px;letter-spacing:.16em;text-transform:uppercase;font-weight:400;margin:0 0 2rem;display:flex;justify-content:space-between;gap:1rem;}
  h1 a{color:#8E1D1A;}
  .notice{border:1px solid #8E1D1A;padding:.8rem 1rem;margin:0 0 1.5rem;white-space:pre-wrap;}
  .meta{color:#4F4B46;margin:.2rem 0 1rem;}
  ul{columns:3 10rem;padding:0;list-style:none;margin:0 0 1.5rem;}
  li.done{color:#A9A29A;text-decoration:line-through;}
  form{display:inline-block;margin:0 .6rem .6rem 0;}
  button{font:inherit;letter-spacing:.12em;text-transform:uppercase;padding:.7rem 1.2rem;border:0;cursor:pointer;background:#000022;color:#FFF8EF;}
  button.all{background:#8E1D1A;}
  button:disabled{opacity:.4;cursor:default;}
  iframe{width:100%;height:80vh;border:1px solid #A9A29A;background:#fff;margin-top:1.5rem;}
</style></head><body>
<h1><span>Reminder · Joe Espinoza's lecture</span><a href="/rsvps">Guest list</a></h1>
${notice ? `<p class="notice">${escapeHtml(notice)}</p>` : ""}
<p><strong>Subject:</strong> ${escapeHtml(SUBJECT)}</p>
<p class="meta">${list.length} confirmed recipient${list.length === 1 ? "" : "s"} after removing duplicates and test entries · ${list.waitlist} on the waitlist (not emailed) · ${list.length - pending.length} already sent · ${pending.length} to go</p>
<ul>${names}</ul>
<form method="post"><input type="hidden" name="action" value="test"><button>Send test to ${escapeHtml(TEST_TO)}</button></form>
<form method="post" onsubmit="if(!confirm('Send the reminder to ${pending.length} people? Each gets their own email.'))return false;this.querySelector('button').disabled=true;">
<input type="hidden" name="action" value="all"><button class="all"${pending.length ? "" : " disabled"}>Send to all ${pending.length} confirmed RSVPs</button></form>
<iframe sandbox title="Email preview" srcdoc="${escapeHtml(reminderEmail(list[0]?.name).html)}"></iframe>
</body></html>`;
}

async function guard(request, env) {
  if (!env.RSVP_PORTAL_PASSWORD) return new Response("The RSVP portal has no password configured.", { status: 503 });
  if (!checkAuth(request, env.RSVP_PORTAL_PASSWORD)) return unauthorized("Ace Studio RSVPs");
  if (!env.RSVPS) return html("The RSVPS KV namespace isn't bound — see README.md.", 503);
  return null;
}

export async function onRequestGet({ request, env }) {
  const denied = await guard(request, env);
  if (denied) return denied;
  const [list, sent] = await Promise.all([recipients(env.RSVPS), alreadySent(env.RSVPS)]);
  return html(page({ list, sent }));
}

export async function onRequestPost({ request, env }) {
  const denied = await guard(request, env);
  if (denied) return denied;
  if (!env.RESEND_API_KEY) return html("No RESEND_API_KEY on this deployment.", 503);

  const action = (await request.formData()).get("action");
  const list = await recipients(env.RSVPS);
  let sent = await alreadySent(env.RSVPS);
  let notice;

  if (action === "test") {
    try {
      const { id } = await resend(env, "/emails", message(env, TEST_TO, "javi"));
      notice = `Test sent to ${TEST_TO}. Resend id: ${id}`;
    } catch (err) {
      notice = `Test failed — ${err.message}`;
    }
  } else if (action === "all") {
    const pending = list.filter((r) => !sent.has(r.email));
    let ok = 0;
    let failed = 0;
    const errors = [];
    // One call per person, paced under Resend's 2-requests-a-second limit.
    for (const [i, r] of pending.entries()) {
      try {
        const { id } = await resend(env, "/emails", message(env, r.email, r.name), `reminder-${EVENT}-${r.email}`);
        await env.RSVPS.put(SENT_PREFIX + r.email, JSON.stringify({ id, at: new Date().toISOString() }));
        ok++;
      } catch (err) {
        failed++;
        errors.push(`${r.name.split(/\s+/)[0] || r.email}: ${err.message}`);
      }
      if (i < pending.length - 1) await new Promise((res) => setTimeout(res, 600));
    }
    notice = `Sent ${ok}, waitlist not emailed ${list.waitlist}, failed ${failed}, skipped ${list.length - pending.length} already sent.` + (errors.length ? `\n${errors.join("\n")}` : "");
    sent = await alreadySent(env.RSVPS);
  } else {
    notice = "Unknown action.";
  }
  return html(page({ list, sent, notice }));
}
