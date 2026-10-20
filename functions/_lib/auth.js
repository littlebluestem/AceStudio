/**
 * The shared-password gate on /rsvps — HTTP Basic Auth against the
 * RSVP_PORTAL_PASSWORD secret. One password, not real accounts: fine for the
 * two of you checking a guest list, not if this ever needs per-person access
 * or an audit trail. Same gate as the Volta site's portal.
 */

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function unauthorized(realm) {
  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${realm}", charset="UTF-8"`,
      "Cache-Control": "no-store",
    },
  });
}

export function checkAuth(request, password) {
  if (!password) return false;
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return false;
  let decoded;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  // Username is ignored on purpose.
  const colon = decoded.indexOf(":");
  const supplied = colon === -1 ? decoded : decoded.slice(colon + 1);
  return timingSafeEqual(supplied, password);
}
