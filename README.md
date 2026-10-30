# Ace Studio — site

Marketing site for Ace Studio: a small-group creative space at
603 W 11th St, Suite 100, Houston, TX 77008 (the Heights). Est. 2026.
Founded by Bethany Ellen Ochs and Javier Fernandez.

## Content

Copy, specs and imagery come from the Ace Studio 2026 deck
(`~/Documents/Ace Studio/01 Deck`) and photography in
`~/Documents/Ace Studio/02 High Res` and `00 Film`.

Nothing on the page is invented. Where the deck is silent — pricing,
in particular — the page asks for an enquiry rather than stating a number.

## Still to resolve

- Pricing. The deck gives none, so the site quotes none.
- Newsletter. Buttondown, same setup as the Volta site. The footer form and
  the Photo Walk's "sign up for the newsletter for updates" form (any event
  with `"newsletter": true` in `events.json`) post to
  `functions/api/subscribe.js`, which adds the address through Buttondown's
  API; Buttondown sends its own confirm-your-subscription email. Needs
  `BUTTONDOWN_API_KEY` (the Ace Studio newsletter's key, Buttondown >
  Settings > API) as an encrypted variable on the Pages project, Production
  and Preview, then a redeploy. Without it, signups say they didn't go
  through.
- Enquiry form. Posts to `functions/api/enquiry.js` (a Cloudflare Pages
  Function), which emails it to info@thisisacestudio.com through Resend with
  the visitor as Reply-To. Needs `RESEND_API_KEY` set as an encrypted variable
  on the Pages project (Settings > Variables and Secrets, Production), and
  thisisacestudio.com verified as a sending domain in Resend (its DNS records
  sit on a `send.` subdomain and don't touch the Google Workspace mail
  records). `MAIL_TO` / `MAIL_FROM` override the defaults. Without the key the
  form says it didn't go through and points people to the email address.
- Neue Kabel Bold (Adobe Fonts) is no longer used or loaded. The page is set in
  DM Mono throughout.

## RSVPs

The Events tab takes RSVPs, ported from the Volta site.

- `events.json` lists the events: `slug`, `title` (used in the email),
  `label` (the form reads "RSVP for <label>"), `date` (`YYYY-MM-DD`, or
  `null` for "Dates TBA"; RSVPs close after it), `when` (optional, replaces
  the date in the email for a multi-day event), `time`, `rsvp` (on/off), an optional `cap`, and an optional `attachment`
  (a file on this site, e.g. `/files/...pdf`, attached to the confirmation email).
  The form is just name and email; the email carries the date, time and
  address. The
  matching `<li>` in the Events list carries the slug as `data-event`. Don't
  rename a slug once people have RSVP'd; it's the key their RSVPs live under.
- The form posts to `functions/api/rsvp.js`, which checks the event against
  `events.json`, stores the RSVP in the `RSVPS` KV namespace
  (`ace-studio-rsvps`, bound on Production and Preview) and emails a
  confirmation through Resend from events@thisisacestudio.com, Reply-To
  info@. A past date closes RSVPs on its own.
- Share links: `thisisacestudio.com/rsvp/<slug>` (see `_redirects`) opens the
  Events tab on that event with the form showing.
- Guest list: `thisisacestudio.com/rsvps`, behind the `RSVP_PORTAL_PASSWORD`
  secret (any username). The password is in the Mac's Keychain as
  "Ace Studio RSVP portal". `/rsvps?format=csv` downloads everything. Past
  events fold into an Archived section; nothing is deleted.
- Waitlist: an event with a `cap` takes that many confirmed RSVPs, then
  keeps taking sign-ups as a waitlist (`status: "waitlist"` on the record).
  Waitlisters get a "you're on the waitlist" email and the form's button
  reads "Join the waitlist" once the event is full. Test entries
  (example.com, or "test" in the name) don't take a seat. RSVPs from
  before waitlists have no status and count as confirmed. Moving someone
  off the waitlist is by hand for now: email them.
- Preview deployments share the same KV namespace, so a test RSVP on a
  preview lands on the real list.

## Build

There isn't one. `index.html` is the whole page: DM Mono is embedded as a data
URI, the logo marks are inline SVG, and photography and flyers live in
`images/` as ordinary files (flyers have a 1600px and a 3000px version, picked
automatically with `srcset`). No dependencies, no build step. No outside
requests, apart from the forms posting to `/api/enquiry` and `/api/rsvp`.

When swapping a photo, export it around 2400px wide (flyers 3000px) and keep
the same filename, or update the `<img>` tag including its `width`/`height`.

Edit, commit, push.

## Deployment

Cloudflare Pages, auto-deploying from `main` — https://ace-studio-mockup.pages.dev

DNS for thisisacestudio.com is on Cloudflare; mail runs on Google Workspace
(MX/SPF/DKIM/DMARC live) and is independent of the web records. The domain now
serves this site.
