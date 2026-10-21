/**
 * POST /api/subscribe — newsletter signup (the footer form, and the Photo
 * Walk's "sign up for updates" form). Same approach as the Volta site.
 *
 * Adds the address to Buttondown through its authenticated API, not the
 * public embed-subscribe endpoint: that one sits behind a Turnstile
 * challenge, which a server-side call can never pass. Buttondown then sends
 * its own confirm-your-subscription email, so nothing is stored here.
 *
 *   BUTTONDOWN_API_KEY  required (Pages secret) — the Ace Studio
 *                       newsletter's key, from Buttondown > Settings > API.
 *                       Without it every signup 503s.
 *
 * Forwards the visitor's IP as `ip_address`. With Buttondown's IP filtering
 * on, leaving it out makes Buttondown judge Cloudflare's shared IP instead,
 * and every new subscriber comes back `subscriber_blocked` (found on Volta).
 */

const BUTTONDOWN_URL = "https://api.buttondown.com/v1/subscribers";
const EMAIL = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }

  // Honeypot, same as the other forms.
  if (data.website) return json({ ok: true });

  const email = String(data.email || "").trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) return json({ error: "That email doesn't look right." }, 400);

  if (!env.BUTTONDOWN_API_KEY) {
    console.error("BUTTONDOWN_API_KEY is not set");
    return json({ error: "not configured" }, 503);
  }

  try {
    const res = await fetch(BUTTONDOWN_URL, {
      method: "POST",
      headers: { Authorization: `Token ${env.BUTTONDOWN_API_KEY}`, "Content-Type": "application/json" },
      // `email_address`, not the `email` Buttondown's older docs show: the
      // live API rejects that as a renamed field.
      body: JSON.stringify({
        email_address: email,
        ip_address: request.headers.get("CF-Connecting-IP") || undefined,
      }),
    });
    if (res.ok) return json({ ok: true });

    // Already on the list comes back as an error; to the visitor it's success.
    const body = await res.json().catch(() => null);
    if (JSON.stringify(body || "").toLowerCase().includes("already")) return json({ ok: true });

    console.error("buttondown subscribe failed", res.status, JSON.stringify(body));
    return json({ error: "Something went wrong. Try again in a minute." }, 502);
  } catch (err) {
    console.error("buttondown subscribe threw", err);
    return json({ error: "Something went wrong. Try again in a minute." }, 502);
  }
}
