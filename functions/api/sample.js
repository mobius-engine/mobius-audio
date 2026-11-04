// POST /api/sample: a free-sample request from the form, emailed to Ashwin through Resend.
// RESEND_API_KEY is a Cloudflare Pages secret, never in the page. The recipients are fixed here,
// so the endpoint cannot be used to mail anyone else; the worst abuse is junk in our own inbox.
const TO = ['ashwin@mobiusservices.me', 'ashwin@mobiusengine.ai'];
const FROM = 'Mobius Audio <audio@mobiusservices.me>';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const AMAZON = /^(https?:\/\/)?([a-z0-9-]+\.)*(amazon\.[a-z.]{2,6}|amzn\.[a-z]{2,4}|a\.co)(\/|$)/i;

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return reply(400, 'bad_request'); }
  if (d.website) return reply(200, 'ok'); // hidden field only bots fill in: say ok, send nothing
  const email = String(d.email || '').trim(), link = String(d.link || '').trim();
  if (email.length > 254 || !EMAIL.test(email)) return reply(400, 'email');
  if (link.length > 2000 || !AMAZON.test(link)) return reply(400, 'link');

  const url = /^https?:\/\//i.test(link) ? link : 'https://' + link;
  const when = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' }) + ' PT';
  const where = request.cf?.country || '';
  const text = `New free sample request\n\nEmail: ${email}\nBook: ${url}\nWhen: ${when}${where ? '\nCountry: ' + where : ''}\n\nReply to this email to answer them.`;
  const row = (k, v) => `<tr><td style="padding:6px 16px 6px 0;color:#666">${k}</td><td style="padding:6px 0">${v}</td></tr>`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;color:#111">
<p style="font-size:17px;margin:0 0 12px"><b>New free sample request</b></p>
<table style="border-collapse:collapse">${row('Email', `<a href="mailto:${esc(email)}">${esc(email)}</a>`)}${row('Book', `<a href="${esc(url)}">${esc(url)}</a>`)}${row('When', esc(when))}${where ? row('Country', esc(where)) : ''}</table>
<p style="color:#666;margin-top:16px">Reply to this email to answer them.</p></div>`;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: env.SAMPLE_TO ? env.SAMPLE_TO.split(',') : TO, reply_to: email,
                           subject: `Free sample request: ${email}`, text, html }),
  });
  if (!r.ok) { console.log('resend failed', r.status, await r.text()); return reply(502, 'send_failed'); }
  return reply(200, 'ok');
}

const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reply = (status, result) => Response.json({ result }, { status });
