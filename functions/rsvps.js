/**
 * GET /rsvps — the guest list, grouped by event, behind RSVP_PORTAL_PASSWORD
 * (_lib/auth.js). Add ?format=csv for a spreadsheet of everything.
 *
 * Reads KV list metadata so the whole list is one list() call; a key
 * without metadata falls back to get() so nothing goes missing. Past events
 * fold into a collapsed "Archived" section — nothing is ever deleted. An
 * RSVP for a slug no longer in events.json lands there too.
 */

import { checkAuth, unauthorized } from "./_lib/auth.js";
import { loadEvents, todayInHouston, whenLine } from "./_lib/events.js";
import { escapeHtml } from "./_lib/mail.js";

const html = (body, status = 200) =>
  new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });

async function readAll(kv) {
  const rows = [];
  let cursor;
  do {
    const listed = await kv.list({ prefix: "rsvp:", cursor, limit: 1000 });
    for (const key of listed.keys) {
      const r = key.metadata || (await kv.get(key.name, "json"));
      if (r) rows.push(r);
    }
    cursor = listed.list_complete ? undefined : listed.cursor;
  } while (cursor);
  return rows;
}

function csv(rows, events) {
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [["Event", "Date", "Name", "Email", "Note", "RSVP'd"].map(cell).join(",")];
  for (const r of rows.sort((a, b) => (a.event + a.created).localeCompare(b.event + b.created))) {
    const e = events?.[r.event];
    lines.push([e?.title || r.event, e?.date || "", r.name, r.email, r.note, r.created].map(cell).join(","));
  }
  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ace-rsvps-${todayInHouston()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function section(slug, event, rows) {
  const title = event ? event.title : slug;
  const meta = event ? whenLine(event) : "No longer on the site";
  const body = rows
    .sort((a, b) => (a.created || "").localeCompare(b.created || ""))
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.name || "")}</td><td>${escapeHtml(r.email || "")}</td>` +
        `<td class="note">${escapeHtml(r.note || "")}</td><td>${escapeHtml((r.created || "").slice(0, 10))}</td></tr>`
    )
    .join("");
  const cap = event && event.cap ? ` of ${event.cap}` : "";
  return `<section>
<h2>${escapeHtml(title)} <span class="count">${rows.length}${cap} RSVP${rows.length === 1 ? "" : "s"}</span></h2>
<p class="meta">${escapeHtml(meta)}</p>
<table><thead><tr><th>Name</th><th>Email</th><th>Note</th><th>RSVP'd</th></tr></thead><tbody>${body}</tbody></table>
</section>`;
}

function page(content) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>RSVPs — Ace Studio</title>
<style>
  body{margin:0 auto;max-width:56rem;padding:2.5rem 1.25rem 4rem;background:#FFF8EF;color:#000022;font:14px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;}
  h1{font-size:14px;letter-spacing:.16em;text-transform:uppercase;font-weight:400;margin:0 0 2rem;display:flex;justify-content:space-between;gap:1rem;}
  h1 a{color:#8E1D1A;}
  h2{font-size:14px;letter-spacing:.12em;text-transform:uppercase;font-weight:500;margin:0;}
  section{border-top:1px solid #A9A29A;padding-top:1.1rem;margin-top:2.2rem;}
  .count,.meta{color:#4F4B46;font-weight:400;}
  .meta{margin:.2rem 0 .9rem;}
  table{width:100%;border-collapse:collapse;table-layout:fixed;}
  th,td{text-align:left;padding:.4rem .6rem .4rem 0;border-bottom:1px solid #E6DED4;vertical-align:top;word-break:break-word;}
  th{color:#4F4B46;font-weight:400;font-size:11px;letter-spacing:.14em;text-transform:uppercase;}
  th:nth-child(3),td.note{width:38%;white-space:pre-wrap;}
  details{margin-top:3rem;} summary{cursor:pointer;color:#4F4B46;letter-spacing:.12em;text-transform:uppercase;}
  details section{opacity:.7;}
  .empty{color:#4F4B46;}
</style></head><body>
<h1><span>Ace Studio RSVPs</span><a href="/rsvps?format=csv">Download CSV</a></h1>
${content}
</body></html>`;
}

export async function onRequestGet({ request, env }) {
  if (!env.RSVP_PORTAL_PASSWORD) return new Response("The RSVP portal has no password configured.", { status: 503 });
  if (!checkAuth(request, env.RSVP_PORTAL_PASSWORD)) return unauthorized("Ace Studio RSVPs");
  if (!env.RSVPS) return html(page('<p class="empty">The RSVPS KV namespace isn\'t bound — see README.md.</p>'), 503);

  const [rows, events] = await Promise.all([readAll(env.RSVPS), loadEvents(request, env)]);
  if (new URL(request.url).searchParams.get("format") === "csv") return csv(rows, events);

  const bySlug = new Map();
  for (const r of rows) {
    if (!bySlug.has(r.event)) bySlug.set(r.event, []);
    bySlug.get(r.event).push(r);
  }

  // Open events with RSVPs on show even at zero, so a new event's list is
  // there before anyone signs up. A missing events.json shows everything live.
  const today = todayInHouston();
  const live = [];
  const archived = [];
  for (const e of Object.values(events || {})) {
    if (e.rsvp && !bySlug.has(e.slug)) bySlug.set(e.slug, []);
  }
  for (const [slug, list] of bySlug) {
    const e = events ? events[slug] : undefined;
    const past = events && (!e || (e.date && e.date < today));
    (past ? archived : live).push({ slug, e, list, sort: e?.date || "9999" });
  }
  live.sort((a, b) => a.sort.localeCompare(b.sort));
  archived.sort((a, b) => b.sort.localeCompare(a.sort));

  let content = live.length ? live.map((g) => section(g.slug, g.e, g.list)).join("\n") : '<p class="empty">No upcoming events with RSVPs.</p>';
  if (archived.length) {
    content += `\n<details><summary>Archived · ${archived.length} past event${archived.length === 1 ? "" : "s"}</summary>
${archived.map((g) => section(g.slug, g.e, g.list)).join("\n")}</details>`;
  }
  return html(page(content));
}
