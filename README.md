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
- Neue Kabel Bold. The brand display face is licensed via Adobe Fonts and is
  not embedded here; headlines fall back to Rethink Sans SemiBold. The logo
  lockups are the real outlined vectors and are correct.
- The enquiry form is not wired to anything.

## Build

There isn't one. `index.html` is a single self-contained file: fonts (Rethink
Sans, DM Mono) and all photography are embedded as data URIs, and the logo is
inline SVG. No external requests, no dependencies, no build step.

Edit the file, commit, push.

## Deployment

Cloudflare Pages, auto-deploying from `main` — https://ace-studio-mockup.pages.dev

DNS for thisisacestudio.com is on Cloudflare; mail runs on Google Workspace
(MX/SPF/DKIM/DMARC live) and is independent of the web records. The domain is
not yet pointed at this site.
