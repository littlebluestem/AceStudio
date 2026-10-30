// The post-lecture thank-you email, styled like the RSVP confirmation
// (_lib/mail.js): cream page, monospace, plain paragraphs, no images or
// buttons, plus a plain-text version. Sent from /rsvps/thank-you.

import { escapeHtml } from "./mail.js";

const LINK = 'style="color:#8E1D1A"';

// Each paragraph as [plain text, html]. Links are written out in the text version.
const BODY = [
  [
    "Thank you for sharing your evening with us for our first lecture with Raquel. It was such a wonderful experience, and we can't wait for the next one. It really was exactly what we envisioned when we moved into this space. So once again, thank you for making that a reality.",
  ],
  [
    "A special shout-out to Raquel for an amazing lecture. You can keep up with her work at https://www.raquelnatalicchio.com and on Instagram at @raquelnatalicchio.",
    `A special shout-out to Raquel for an amazing lecture. You can keep up with her work at <a href="https://www.raquelnatalicchio.com" ${LINK}>raquelnatalicchio.com</a> and on Instagram at <a href="https://www.instagram.com/raquelnatalicchio/" ${LINK}>@raquelnatalicchio</a>.`,
  ],
  [
    "Our lecture series is brand new, and we want it to be yours too. Hit reply and tell us what worked, what didn't, and who you'd love to hear from next.",
  ],
  [
    "Seats go fast, so if you'd like to hear about the next lecture, workshop or studio event first, join our newsletter here:\nhttps://thisisacestudio.com/newsletter",
    `Seats go fast, so if you'd like to hear about the next lecture, workshop or studio event first, join our newsletter here: <a href="https://thisisacestudio.com/newsletter" ${LINK}>thisisacestudio.com/newsletter</a>`,
  ],
];

const FOOTER = "Ace Studio, 603 W 11th St, Suite 100, Houston, TX 77008\nYou're getting this because you RSVP'd to a lecture at Ace Studio. To stop getting these, reply with \"unsubscribe\".";

export function thankYouEmail(name) {
  const first = (name || "").trim().split(/\s+/)[0] || "there";
  const text = `Hi ${first},\n\n${BODY.map(([t]) => t).join("\n\n")}\n\nSee you at the studio,\nThe Ace Studio team\n\n--\n${FOOTER}\n`;
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Thanks for coming out</title></head>
<body style="margin:0;padding:32px;background:#FFF8EF;color:#000022;font:15px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace">
<p style="margin:0 0 1.2em">Hi ${escapeHtml(first)},</p>
${BODY.map(([t, h]) => `<p style="margin:0 0 1.2em">${h || escapeHtml(t)}</p>`).join("\n")}
<p style="margin:2em 0 0">See you at the studio,<br>Ace Studio<br><a href="https://thisisacestudio.com" ${LINK}>thisisacestudio.com</a></p>
<p style="margin:2em 0 0;font-size:12px;color:#4F4B46">${escapeHtml(FOOTER).replace("\n", "<br>")}</p>
</body></html>`;
  return { text, html };
}
