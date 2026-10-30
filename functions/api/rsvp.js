/**
 * POST /api/rsvp — the Events tab's RSVP form. Ported from the Volta site.
 *
 * Stores each RSVP in the RSVPS KV namespace under `rsvp:<slug>:<email>`,
 * one per person per event, so re-submitting updates the record rather
 * than adding a duplicate. Then emails a confirmation (_lib/mail.js).
 *
 * The client only sends a slug. Title, date and cap come from /events.json
 * (_lib/events.js), so a made-up slug, a closed event or a past date are
 * all turned away here rather than trusted from the form.
 *
 * The record is written twice — as the value and as KV list metadata — so
 * the portal (functions/rsvps.js) can read the whole guest list in one
 * list() call. Metadata is capped at 1KB, which is why `note` is short.
 *
 * An event with a `cap` takes that many confirmed RSVPs; everyone after
 * that is stored with `status: "waitlist"` and gets a waitlist email
 * instead of a confirmation. Records without a status (every RSVP from
 * before waitlists existed) count as confirmed. A re-RSVP keeps whatever
 * status the person already had. GET /api/rsvp?event=<slug> tells the form
 * whether the event is full, so the button can say "Join the waitlist".
 *
 * Configuration (Pages > Settings > Variables and Secrets, and Bindings):
 *   RSVPS           KV namespace binding — without it every RSVP 503s
 *   RESEND_API_KEY  already set for the enquiry form; no new secret needed
 */

import { loadEvents, todayInHouston, whenLine } from "../_lib/events.js";
import { sendRsvpConfirmation } from "../_lib/mail.js";

const EMAIL = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export async function onRequestPost({ request, env, waitUntil }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }

  // Honeypot, same as the enquiry form.
  if (data.website) return json({ ok: true });

  const name = String(data.name || "").replace(/[\r\n]+/g, " ").trim().slice(0, 200);
  const email = String(data.email || "").trim().toLowerCase();
  const note = String(data.note || "").trim().slice(0, 400);
  const slug = String(data.event || "").trim().slice(0, 120);

  if (!name) return json({ error: "Please add your name." }, 400);
  if (!EMAIL.test(email) || email.length > 254) return json({ error: "That email doesn't look right." }, 400);

  const events = await loadEvents(request, env);
  const event = events && events[slug];
  if (!event || !event.rsvp) return json({ error: "RSVPs for this event aren't open." }, 404);
  if (event.date && event.date < todayInHouston()) return json({ error: "This event has already happened." }, 410);

  if (!env.RSVPS) {
    console.error("RSVPS KV namespace is not bound");
    return json({ error: "not configured" }, 503);
  }

  const key = `rsvp:${slug}:${email}`;

  // Re-RSVPing never takes a new seat — the person keeps their status and
  // their place in line. Racy at the very last seat on purpose; nothing here
  // runs at a volume where two people hitting submit in the same instant is
  // worth a lock.
  let existing = null;
  try {
    existing = await env.RSVPS.get(key, "json");
  } catch {}
  let status = existing ? existing.status || "confirmed" : "confirmed";
  if (!existing && capOf(event) && (await confirmedCount(env.RSVPS, slug, capOf(event))) >= capOf(event)) {
    status = "waitlist";
  }

  const record = {
    name, email, note, event: slug, status,
    created: (existing && existing.created) || new Date().toISOString(),
  };
  try {
    await env.RSVPS.put(key, JSON.stringify(record), { metadata: record });
  } catch (err) {
    console.error("rsvp store failed", err);
    return json({ error: "Something went wrong. Try again in a minute." }, 500);
  }

  // Confirm every submission, re-RSVPs included, without making the visitor
  // wait on the mail API.
  const sending = sendRsvpConfirmation(
    {
      name, email, title: event.title, when: whenLine(event), dated: Boolean(event.date),
      waitlist: status === "waitlist", cap: capOf(event),
      // `attachment` in events.json: a file on this site to attach, e.g. a details flyer.
      attachment: event.attachment ? new URL(event.attachment, request.url).href : null,
    },
    env
  );
  if (typeof waitUntil === "function") waitUntil(sending);
  else await sending;

  return json({ ok: true, waitlist: status === "waitlist" });
}

// GET /api/rsvp?event=<slug> — { full } for the form's button. Only says
// whether the confirmed list is full, never who's on it.
export async function onRequestGet({ request, env }) {
  const slug = new URL(request.url).searchParams.get("event") || "";
  const events = await loadEvents(request, env);
  const event = events && events[slug];
  if (!event || !event.rsvp || !env.RSVPS) return json({ full: false });
  const cap = capOf(event);
  const full = Boolean(cap) && (await confirmedCount(env.RSVPS, slug, cap)) >= cap;
  return json({ full });
}

const isTest = (r) => /@example\.com$/i.test(r.email || "") || /\btest\b/i.test(r.name || "");

function capOf(event) {
  return Number.isInteger(event.cap) && event.cap > 0 ? event.cap : null;
}

// Confirmed RSVPs for an event, counting up to `stop`. Waitlisted records
// don't hold a seat; records with no status are pre-waitlist RSVPs, so
// they're confirmed. Test entries (an example.com address, or "test" in the
// name — same rule as /rsvps/thank-you) don't take a seat either.
async function confirmedCount(kv, slug, stop) {
  let count = 0;
  let cursor;
  do {
    const listed = await kv.list({ prefix: `rsvp:${slug}:`, cursor, limit: 1000 });
    for (const k of listed.keys) {
      const r = k.metadata || (await kv.get(k.name, "json"));
      if (r && r.status !== "waitlist" && !isTest(r)) count++;
    }
    cursor = listed.list_complete ? undefined : listed.cursor;
  } while (cursor && count < stop);
  return count;
}
