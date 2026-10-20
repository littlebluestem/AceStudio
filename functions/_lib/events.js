/**
 * Reads /events.json off the site's own deployed assets — the one place an
 * event's title, date and cap live. The RSVP endpoint and the portal both
 * look events up here rather than trusting what the form posts, so an
 * RSVP can only land on a real event and a cap can't be talked around.
 */

export async function loadEvents(request, env) {
  try {
    const res = await env.ASSETS.fetch(new Request(new URL("/events.json", request.url)));
    if (!res.ok) return null;
    const data = await res.json();
    const bySlug = {};
    for (const e of data.events || []) bySlug[e.slug] = e;
    return bySlug;
  } catch (err) {
    console.error("events.json fetch/parse failed", err);
    return null;
  }
}

// Houston's calendar day, not UTC's — an evening event shouldn't close or
// archive itself at 7pm local because UTC has already rolled over.
export function todayInHouston() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
}

// "Thursday, October 29" — or "Dates TBA" for an event with no date yet.
export function formatDate(event) {
  if (!event.date) return "Dates TBA";
  const [y, m, d] = event.date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function whenLine(event) {
  return [formatDate(event), event.time].filter(Boolean).join(", ");
}
