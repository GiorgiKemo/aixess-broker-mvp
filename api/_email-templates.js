// AiXESS emails: the team notification for every site form and the visitor's confirmation.
// Built for email clients, not browsers: tables, inline styles, 600px wide, images as PNG.
// Brand: day cobalt #2557d6 header, paper #f4f4f1 page, ink #171a1d text, sage #9bb69e panel,
// true-black footer (night theme). Titles use Morganite (Apple Mail / iOS Mail load it from the
// site); Gmail and Outlook fall back to a condensed system face. Body copy is Inter, then system UI.

import { EMAIL_COPY, fill } from "./_email-copy.js";

const C = { cobalt: "#2557d6", paper: "#f4f4f1", card: "#ffffff", ink: "#171a1d", muted: "#4f5152", rule: "#d7d9da", sage: "#9bb69e", black: "#000000", night: "#ecebe6", nightMuted: "#858787" };
const BODY = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const HEAD = "'AiXESS Email Head', 'AiXESS Email Cyrillic', 'Arial Narrow', 'Roboto Condensed', 'sans-serif-condensed', 'Helvetica Neue', Arial, sans-serif";

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const multiline = (value) => escapeHtml(value).replace(/\r?\n/g, "<br>");

function fontFaces(origin) {
  // Morganite is scaled up (size-adjust) so one font-size suits both it and the wider fallbacks.
  return `
    @font-face { font-family: 'AiXESS Email Head'; src: url('${origin}/fonts/morganite/Morganite-Bold.ttf') format('truetype'); font-weight: 700; size-adjust: 150%; }
    @font-face { font-family: 'AiXESS Email Cyrillic'; src: url('${origin}/fonts/v4/aixess-head-cyrillic.woff2') format('woff2'); font-weight: 700; unicode-range: U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; size-adjust: 112%; }
    @font-face { font-family: 'Inter'; src: url('${origin}/fonts/lasha/inter-latin-567244.woff2') format('woff2'); font-weight: 100 900; unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
    @font-face { font-family: 'Inter'; src: url('${origin}/fonts/lasha/inter-latin-ext-395290.woff2') format('woff2'); font-weight: 100 900; unicode-range: U+0100-02AF, U+0304, U+0308, U+0329, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF; }
    @font-face { font-family: 'Inter'; src: url('${origin}/fonts/lasha/inter-cyrillic-4ee8fc.woff2') format('woff2'); font-weight: 100 900; unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }`;
}

function shell({ lang, title, preheader, origin, body }) {
  return `<!DOCTYPE html>
<html lang="${lang}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  ${fontFaces(origin)}
  :root { color-scheme: light; supported-color-schemes: light; }
  body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table { border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; }
  img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  a { text-decoration: none; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
  u + #body a { color: inherit; text-decoration: none; }
  @media (max-width: 620px) {
    .ax-wrap { width: 100% !important; }
    .ax-pad { padding-left: 24px !important; padding-right: 24px !important; }
    .ax-title { font-size: 34px !important; line-height: 36px !important; }
    .ax-row td { display: block !important; width: 100% !important; text-align: left !important; }
    .ax-row .ax-label { padding-bottom: 2px !important; border-bottom: 0 !important; }
    .ax-row .ax-value { padding-top: 0 !important; }
    .ax-hide-sm { display: none !important; }
  }
</style>
<!--[if mso]><style>body, table, td, p, a, span { font-family: Arial, sans-serif !important; } .ax-title { font-family: 'Arial Narrow', Arial, sans-serif !important; }</style><![endif]-->
</head>
<body id="body" style="margin:0;padding:0;background-color:${C.paper};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.paper};opacity:0;">${escapeHtml(preheader)}${"&#8199;&#65279;&#847; ".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.paper}" style="background-color:${C.paper};">
<tr><td align="center" style="padding:32px 12px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="ax-wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
${body}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

function header({ origin, label }) {
  return `<tr><td bgcolor="${C.cobalt}" class="ax-pad" style="background-color:${C.cobalt};padding:30px 40px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="middle"><a href="https://aixess.global" target="_blank" style="text-decoration:none;"><img src="${origin}/email/aixess-logo-white.png" width="120" height="38" alt="AiXESS" style="display:block;width:120px;height:38px;color:#ffffff;font-family:${HEAD};font-size:28px;font-weight:700;"></a></td>
    <td valign="middle" align="right" style="font-family:${BODY};font-size:11px;line-height:16px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#ffffff;">${escapeHtml(label)}</td>
  </tr></table>
</td></tr>`;
}

function eyebrow(text, color = C.cobalt) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="middle" style="font-family:${BODY};font-size:12px;line-height:16px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${color};white-space:nowrap;">${escapeHtml(text)}</td>
    <td valign="middle" style="padding-left:12px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="48" height="1" bgcolor="${color}" style="width:48px;height:1px;font-size:0;line-height:0;background-color:${color};">&nbsp;</td></tr></table></td>
  </tr></table>`;
}

function title(text) {
  return `<h1 class="ax-title" style="margin:18px 0 0;font-family:${HEAD};font-size:44px;line-height:46px;font-weight:700;letter-spacing:0.01em;text-transform:uppercase;color:${C.ink};mso-line-height-rule:exactly;">${escapeHtml(text)}</h1>`;
}

function rows(items) {
  return items.filter(([, value]) => value).map(([label, value, html], index, list) => {
    const last = index === list.length - 1;
    const line = last ? "" : `border-bottom:1px solid ${C.rule};`;
    return `<tr class="ax-row">
      <td class="ax-label" valign="top" width="34%" style="width:34%;padding:13px 16px 13px 0;${line}font-family:${BODY};font-size:12px;line-height:18px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};">${escapeHtml(label)}</td>
      <td class="ax-value" valign="top" style="padding:13px 0;${line}font-family:${BODY};font-size:15px;line-height:22px;font-weight:500;color:${C.ink};word-break:break-word;">${html || multiline(value)}</td>
    </tr>`;
  }).join("");
}

function detailsTable(items) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${C.ink};border-bottom:1px solid ${C.ink};">${rows(items)}</table>`;
}

function button({ href, label, origin }) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td bgcolor="${C.cobalt}" style="background-color:${C.cobalt};">
      <!--[if mso]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" href="${escapeHtml(href)}" style="height:56px;v-text-anchor:middle;width:300px;" stroked="false" fillcolor="${C.cobalt}"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;letter-spacing:1px;">${escapeHtml(label.toUpperCase())} &rarr;</center></v:rect><![endif]-->
      <!--[if !mso]><!--><a href="${escapeHtml(href)}" target="_blank" style="display:block;padding:20px 26px;font-family:${BODY};font-size:14px;line-height:16px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff;text-decoration:none;">
        <span style="color:#ffffff;">${escapeHtml(label)}</span>&nbsp;&nbsp;&nbsp;&nbsp;<img src="${origin}/email/arrow-white.png" width="38" height="8" alt="" style="display:inline-block;width:38px;height:8px;vertical-align:middle;border:0;">
      </a><!--<![endif]-->
    </td>
  </tr></table>`;
}

function footer({ origin, lines }) {
  return `<tr><td bgcolor="${C.black}" class="ax-pad" style="background-color:${C.black};padding:36px 40px 34px;">
  <img src="${origin}/email/aixess-logo-white.png" width="88" height="28" alt="AiXESS" style="display:block;width:88px;height:28px;color:#ffffff;">
  <p style="margin:22px 0 0;font-family:${BODY};font-size:13px;line-height:20px;color:${C.night};">AIXCO International FZ-LLC<br>FDCW1595, Compass Building, Al Shohada Road<br>Al Hamra Industrial Zone-FZ, Ras Al Khaimah, United Arab Emirates</p>
  <p style="margin:14px 0 0;font-family:${BODY};font-size:13px;line-height:20px;"><a href="mailto:info@aixess.global" style="color:#ffffff;text-decoration:none;font-weight:600;">info@aixess.global</a><span style="color:${C.nightMuted};">&nbsp;&nbsp;·&nbsp;&nbsp;</span><a href="https://aixess.global" target="_blank" style="color:#ffffff;text-decoration:none;font-weight:600;">aixess.global</a></p>
  ${lines.map((line) => `<p style="margin:18px 0 0;font-family:${BODY};font-size:12px;line-height:18px;color:${C.nightMuted};">${escapeHtml(line)}</p>`).join("")}
</td></tr>`;
}

const KIND_EN = { materials: "Project materials request", broker: "Broker access request", contact: "Contact form message", enquiry: "Project enquiry" };

// What each request is called: a project request keeps the button's words ("Request availability").
function requestName(lead, lang) {
  if (lead.kind === "enquiry") return lang === "en" ? (lead.requestEn || lead.request || KIND_EN.enquiry) : (lead.request || lead.requestEn);
  return lang === "en" ? KIND_EN[lead.kind] : EMAIL_COPY[lang].kinds[lead.kind];
}

export function buildTeamEmail(lead, { origin }) {
  const name = requestName(lead, "en");
  const heading = lead.project ? `${name} · ${lead.project}` : name;
  const replySubject = `Re: ${lead.project ? `${lead.project} – ` : ""}${lead.requestEn || lead.request || KIND_EN[lead.kind]} (${lead.reference})`;
  const mail = `mailto:${encodeURIComponent(lead.email).replace(/%40/g, "@")}?subject=${encodeURIComponent(replySubject)}`;
  const details = [
    ["Name", lead.name],
    ["Email", lead.email, `<a href="mailto:${escapeHtml(lead.email)}" style="color:${C.cobalt};text-decoration:none;font-weight:600;">${escapeHtml(lead.email)}</a>`],
    ["Phone", lead.phone, lead.phone ? `<a href="tel:${escapeHtml(lead.phone.replace(/[^+\d]/g, ""))}" style="color:${C.ink};text-decoration:none;">${escapeHtml(lead.phone)}</a>` : ""],
    ["Company", lead.company],
    ["Project", lead.project && [lead.project, lead.place].filter(Boolean).join(" · ")],
    ["Request", lead.kind === "enquiry" ? [lead.requestEn, lead.request !== lead.requestEn ? lead.request : ""].filter(Boolean).join(" / ") : ""],
  ];
  const meta = [
    ["Reference", lead.reference],
    ["Form", KIND_EN[lead.kind]],
    ["Language", lead.locale.toUpperCase()],
    ["Page", lead.page, lead.page ? `<a href="${escapeHtml(lead.page)}" style="color:${C.cobalt};text-decoration:none;word-break:break-all;">${escapeHtml(lead.page.replace(/^https?:\/\//, ""))}</a>` : ""],
    ["Received", lead.receivedAt],
  ];
  const message = lead.message ? `<tr><td bgcolor="${C.sage}" class="ax-pad" style="background-color:${C.sage};padding:28px 40px;">
    ${eyebrow("Message", C.ink)}
    <p style="margin:14px 0 0;font-family:${BODY};font-size:16px;line-height:25px;color:${C.ink};word-break:break-word;">${multiline(lead.message)}</p>
  </td></tr>` : "";

  const body = `${header({ origin, label: "New lead" })}
<tr><td bgcolor="${C.card}" class="ax-pad" style="background-color:${C.card};padding:40px 40px 34px;">
  ${eyebrow(KIND_EN[lead.kind])}
  ${title(heading)}
  <p style="margin:16px 0 26px;font-family:${BODY};font-size:16px;line-height:24px;color:${C.muted};">From <strong style="color:${C.ink};">${escapeHtml(lead.name)}</strong>. Reply to this email to answer them directly.</p>
  ${detailsTable(details)}
</td></tr>
${message}
<tr><td bgcolor="${C.card}" class="ax-pad" style="background-color:${C.card};padding:34px 40px 40px;">
  ${button({ href: mail, label: `Reply to ${lead.firstName || lead.name}`, origin })}
  <div style="height:30px;line-height:30px;font-size:0;">&nbsp;</div>
  ${detailsTable(meta)}
</td></tr>
${footer({ origin, lines: ["Sent automatically by the aixess.global site forms."] })}`;

  const text = [
    `AiXESS · New lead · ${heading}`,
    "",
    ...details.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    lead.message ? `\nMessage:\n${lead.message}\n` : "",
    ...meta.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    "",
    "Reply to this email to answer the sender directly.",
  ].join("\n");

  return {
    subject: `[AiXESS] ${heading} – ${lead.name} (${lead.reference})`,
    html: shell({ lang: "en", title: heading, preheader: `${lead.name} · ${lead.email}${lead.phone ? ` · ${lead.phone}` : ""}`, origin, body }),
    text,
  };
}

export function buildConfirmationEmail(lead, { origin }) {
  const lang = EMAIL_COPY[lead.locale] ? lead.locale : "en";
  const copy = EMAIL_COPY[lang];
  const values = { name: lead.firstName || lead.name, project: lead.project, email: lead.email };
  const heading = lead.kind === "enquiry" ? (lead.request || copy.titles.enquiry) : copy.titles[lead.kind];
  const intro = fill(copy.intro[lead.kind], values);
  const projectUrl = lead.route ? `https://aixess.global/#${lead.route}` : "https://aixess.global";
  const cta = lead.project && lead.route ? fill(copy.ctaProject, values) : copy.cta;
  const details = [
    [copy.labels.reference, lead.reference],
    [copy.labels.project, lead.project],
    [copy.labels.request, lead.kind === "enquiry" ? lead.request : copy.kinds[lead.kind]],
    [copy.labels.name, lead.name],
    [copy.labels.email, lead.email],
    [copy.labels.phone, lead.phone],
    [copy.labels.company, lead.company],
    [copy.labels.message, lead.message],
  ];

  const body = `${header({ origin, label: lead.reference })}
<tr><td bgcolor="${C.card}" class="ax-pad" style="background-color:${C.card};padding:44px 40px 36px;">
  ${eyebrow(lead.project || copy.eyebrow)}
  ${title(heading)}
  <p style="margin:22px 0 0;font-family:${BODY};font-size:16px;line-height:25px;color:${C.ink};">${escapeHtml(fill(copy.greeting, values))}</p>
  <p style="margin:12px 0 30px;font-family:${BODY};font-size:16px;line-height:25px;color:${C.ink};">${escapeHtml(intro)}</p>
  <p style="margin:0 0 12px;font-family:${BODY};font-size:12px;line-height:16px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${C.cobalt};">${escapeHtml(copy.summary)}</p>
  ${detailsTable(details)}
</td></tr>
<tr><td bgcolor="${C.sage}" class="ax-pad" style="background-color:${C.sage};padding:30px 40px;">
  ${eyebrow(copy.nextTitle, C.ink)}
  <p style="margin:14px 0 0;font-family:${BODY};font-size:16px;line-height:25px;color:${C.ink};">${escapeHtml(fill(copy.next, values))}</p>
</td></tr>
<tr><td bgcolor="${C.card}" class="ax-pad" style="background-color:${C.card};padding:36px 40px 42px;">
  ${button({ href: projectUrl, label: cta, origin })}
  <p style="margin:34px 0 0;font-family:${HEAD};font-size:26px;line-height:28px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;color:${C.ink};">${escapeHtml(copy.signoff)}</p>
</td></tr>
${footer({ origin, lines: [copy.why] })}`;

  const text = [
    `${heading}${lead.project ? ` · ${lead.project}` : ""}`,
    "",
    fill(copy.greeting, values),
    intro,
    "",
    ...details.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    "",
    `${copy.nextTitle}: ${fill(copy.next, values)}`,
    "",
    copy.signoff,
    "AiXESS · info@aixess.global · aixess.global",
  ].join("\n");

  return {
    subject: `${heading}${lead.project ? ` · ${lead.project}` : ""} | AiXESS (${lead.reference})`,
    html: shell({ lang, title: heading, preheader: intro, origin, body }),
    text,
  };
}
