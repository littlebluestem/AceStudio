# Ace Studio — site

Marketing site for Ace Studio, a stage and gear rental house in Houston Heights
(603 11th St, est. 2026).

## Status

Mockup. Copy, specs and rates are placeholder and flagged as such on the page.

Outstanding before this is real:

- Photography — hero is a stand-in from the brand guide; the two room panels are
  labelled photo slots.
- Neue Kabel Bold — the brand display face is licensed via Adobe Fonts and is not
  embedded here. Headlines currently fall back to Rethink Sans SemiBold. The logo
  lockups are the real outlined vectors and are correct.
- Real specs and rates.
- Contact address — currently placeholder.

## Build

There isn't one. `index.html` is a single self-contained file: fonts (Rethink Sans,
DM Mono) and the hero image are embedded as data URIs, and the logo is inline SVG.
No external requests, no dependencies, no build step.

Edit the file, commit, done.

## Deployment

Cloudflare Pages. DNS for thisisacestudio.com is on Cloudflare; mail runs on Google
Workspace (MX/SPF/DKIM/DMARC live) and is independent of the web records.
