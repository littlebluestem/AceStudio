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
- Newsletter. There is no signup yet, so the footer has no newsletter link.
  Add one to `.footer-links` once it exists.
- Enquiry form. It opens the visitor's email app with a pre-filled message to
  info@thisisacestudio.com (a `mailto:` link, no server). It does not work for
  people without a mail app configured. Sending directly from the page would
  need Cloudflare Email Sending (beta, adds SPF/DKIM DNS records) or a form
  service.
- Neue Kabel Bold (Adobe Fonts) is no longer used or loaded. The page is set in
  DM Mono throughout.

## Build

There isn't one. `index.html` is the whole page: DM Mono is embedded as a data
URI, the logo marks are inline SVG, and photography and flyers live in
`images/` as ordinary files (flyers have a 1600px and a 3000px version, picked
automatically with `srcset`). No dependencies, no build step. The only outside
request is the Instagram link.

When swapping a photo, export it around 2400px wide (flyers 3000px) and keep
the same filename, or update the `<img>` tag including its `width`/`height`.

Edit, commit, push.

## Deployment

Cloudflare Pages, auto-deploying from `main` — https://ace-studio-mockup.pages.dev

DNS for thisisacestudio.com is on Cloudflare; mail runs on Google Workspace
(MX/SPF/DKIM/DMARC live) and is independent of the web records. The domain is
not yet pointed at this site.
