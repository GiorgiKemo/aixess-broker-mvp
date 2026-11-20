// Vercel serverless function behind every site form (project requests, contact, materials, broker).
// It logs each lead, emails it to the AiXESS team (info@aixess.global) with the sender as Reply-To,
// and sends the sender a confirmation in the site language. Both emails go out through Resend
// and only when RESEND_API_KEY is set; the sending domain (aixess.global) must be verified there.
//
// Environment: RESEND_API_KEY (required to send), LEAD_NOTIFICATION_TO (team inbox, comma-separated,
// default info@aixess.global), LEAD_NOTIFICATION_FROM (default "AiXESS <notifications@aixess.global>"),
// EMAIL_ASSET_ORIGIN (where the emails load logo/fonts from, default this deployment's address).

import { buildConfirmationEmail, buildTeamEmail } from "./_email-templates.js";

const KINDS = new Set(["enquiry", "contact", "materials", "broker"]);
const LOCALES = new Set(["en", "de", "pl", "sl", "ru"]);
const ROUTES = new Set(["tresora", "downtown-one", "residences"]);

const clean = (value, max = 200) => String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);
const oneLine = (value, max = 200) => clean(value, max).replace(/\s+/g, " ");

function assetOrigin(req) {
  const configured = process.env.EMAIL_ASSET_ORIGIN;
  if (configured) return configured.replace(/\/+$/, "");
  const host = String(req.headers?.["x-forwarded-host"] || req.headers?.host || "").split(",")[0].trim();
  if (/^[a-z0-9.-]+(:\d+)?$/i.test(host) && !/^(localhost|127\.|0\.0\.0\.0)/.test(host)) return `https://${host}`;
  return "https://aixess.global";
}

function readLead(body) {
  const firstName = oneLine(body.firstName, 80);
  const surname = oneLine(body.surname, 80);
  const kind = KINDS.has(body.kind) ? body.kind : "broker";
  const page = clean(body.page, 500);
  return {
    kind,
    firstName,
    surname,
    name: oneLine(body.name, 160) || `${firstName} ${surname}`.trim(),
    email: oneLine(body.email, 254),
    phone: oneLine(body.phone, 40),
    company: oneLine(body.company, 160),
    message: clean(body.message, 5000),
    project: oneLine(body.project, 80),
    place: oneLine(body.place, 120),
    request: oneLine(body.request, 120),
    requestEn: oneLine(body.requestEn, 120),
    route: ROUTES.has(body.route) ? body.route : "",
    page: /^https?:\/\//.test(page) ? page : "",
    locale: LOCALES.has(body.locale) ? body.locale : "en",
    privacyAccepted: body.privacyAccepted === true,
  };
}

async function sendEmail(apiKey, message) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) console.warn("[RESEND_FAILED]", message.to.join(", "), response.status, JSON.stringify(data));
  return { ok: response.ok, id: data?.id };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON" }); }
  }
  body = body && typeof body === "object" ? body : {};

  // Bots fill the hidden "website" field; pretend all went well.
  if (body.website) return res.status(200).json({ saved: true });

  const lead = readLead(body);
  if (!lead.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return res.status(400).json({ error: "Name and valid email are required" });
  }
  if (lead.kind === "contact" && !lead.message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const now = new Date();
  lead.reference = `AXS-${now.getUTCFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  lead.receivedAt = `${now.toISOString().slice(0, 16).replace("T", " ")} UTC`;
  console.log("[AIXESS_LEAD_RECEIVED]", JSON.stringify(lead));

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[AIXESS_LEAD] RESEND_API_KEY is not set: the lead is only in these logs.");
    return res.status(200).json({ saved: true, reference: lead.reference, team: false, confirmation: false });
  }

  const configuredFrom = process.env.LEAD_NOTIFICATION_FROM;
  const from = configuredFrom && !/aixco/i.test(configuredFrom) ? configuredFrom : "AiXESS <notifications@aixess.global>";
  const team = (process.env.LEAD_NOTIFICATION_TO || "info@aixess.global").split(",").map((s) => s.trim()).filter(Boolean);
  const origin = assetOrigin(req);
  const teamEmail = buildTeamEmail(lead, { origin });
  const confirmation = buildConfirmationEmail(lead, { origin });

  const [teamResult, confirmationResult] = await Promise.all([
    sendEmail(apiKey, { from, to: team, reply_to: lead.email, subject: teamEmail.subject, html: teamEmail.html, text: teamEmail.text }).catch((error) => { console.error("[RESEND_ERROR]", error); return { ok: false }; }),
    sendEmail(apiKey, { from, to: [lead.email], reply_to: team[0], subject: confirmation.subject, html: confirmation.html, text: confirmation.text }).catch((error) => { console.error("[RESEND_ERROR]", error); return { ok: false }; }),
  ]);

  return res.status(200).json({ saved: true, reference: lead.reference, team: teamResult.ok, confirmation: confirmationResult.ok });
}
