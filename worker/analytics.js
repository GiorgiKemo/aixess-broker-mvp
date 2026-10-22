const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" };
const EVENTS = new Set(["page_view", "navigation", "portal_login_click", "portal_register_click", "materials_open", "lead_submitted", "floor_open", "residence_open", "plan_open", "filter_change", "filter_reset", "language_change", "contact_click", "resource_click"]);
const PAGES = new Set(["home", "why-aixess", "residences", "broker-access", "insights", "broker-tools", "resources", "calculators", "tresora", "downtown-one"]);
const LOCALES = new Set(["en", "de", "pl", "sl", "ru"]);
const ID = /^[a-f0-9-]{36}$/i;
const STATUSES = new Set(["new", "contacted", "qualified", "closed"]);
const reply = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: JSON_HEADERS });
const dbFor = (env) => { if (!env.DB) throw new Error("Database unavailable"); return env.DB; };

export function adminIdentity(request, env) {
  // Sites supplies verified identity headers; client-provided roles are never accepted.
  if (env.AUTH_PROVIDER !== "sites") return null;
  const id = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  const allowed = (env.ADMIN_EMAILS || "").split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean);
  return id && email && allowed.includes(email) ? { email } : null;
}

async function bodyJson(request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("Invalid request");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Invalid request");
  let size = 0; const chunks = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) { await reader.cancel(); throw new Error("Invalid request"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const parsed = JSON.parse(new TextDecoder().decode(bytes));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid request");
  return parsed;
}

export function normalizeEvent(event, now = Date.now()) {
  if (!event || !ID.test(event.id) || !ID.test(event.session) || !EVENTS.has(event.type) || !PAGES.has(event.page)) return null;
  const detail = {};
  if (Number.isInteger(event.detail?.floor) && event.detail.floor >= 2 && event.detail.floor <= 16) detail.floor = event.detail.floor;
  if (/^\d{3,4}$/.test(String(event.detail?.unit || ""))) detail.unit = String(event.detail.unit);
  if (["floor", "minArea", "maxArea", "bedrooms", "status"].includes(event.detail?.filter)) detail.filter = event.detail.filter;
  if (PAGES.has(event.detail?.destination)) detail.destination = event.detail.destination;
  if (["email", "phone", "aixco", "brochure", "project"].includes(event.detail?.target)) detail.target = event.detail.target;
  return { id: event.id, session: event.session, type: event.type, page: event.page, locale: LOCALES.has(event.locale) ? event.locale : "en", device: ["mobile", "tablet", "desktop"].includes(event.device) ? event.device : "desktop", detail: JSON.stringify(detail), created: now };
}

async function rateLimit(request, env, kind, limit) {
  if (!env.RATE_LIMIT_SALT) throw new Error("Rate limiter unavailable");
  const hour = Math.floor(Date.now() / 3600000);
  const ip = request.headers.get("cf-connecting-ip") || "local";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${env.RATE_LIMIT_SALT}:${hour}:${kind}:${ip}`));
  const key = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const row = await dbFor(env).prepare("INSERT INTO request_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count").bind(key, (hour + 2) * 3600000).first();
  return row.count <= limit;
}

async function prune(env) {
  const now = Date.now(); const db = dbFor(env);
  await db.batch([
    db.prepare("DELETE FROM analytics_events WHERE created_at < ?").bind(now - 90 * 86400000),
    db.prepare("DELETE FROM leads WHERE created_at < ?").bind(now - 365 * 86400000),
    db.prepare("DELETE FROM request_limits WHERE expires_at < ?").bind(now),
  ]);
}

export async function analyticsApi(request, env, ctx = {}) {
  const url = new URL(request.url);
  const isAdmin = url.pathname.startsWith("/api/admin/");
  if (!["/api/events", "/api/leads"].includes(url.pathname) && !isAdmin) return null;
  if (request.method !== "GET" && request.headers.get("origin") !== url.origin) return reply({ error: "Origin not allowed" }, 403);
  try {
    const db = dbFor(env);
    if (url.pathname.startsWith("/api/admin/auth/")) return await adminAuthApi(request, env, { bodyJson, rateLimit, ownerIdentity: adminIdentity });
    const identity = isAdmin ? await sessionAdmin(request, env) : null;
    if (isAdmin && !identity) return reply({ error: "Sign in to your AiXESS admin account." }, 401);
    if (url.pathname === "/api/events" && request.method === "POST") {
      const body = await bodyJson(request);
      if (body.consent !== true || !Array.isArray(body.events) || !body.events.length || body.events.length > 20) return reply({ error: "Invalid events" }, 400);
      const events = body.events.map((event) => normalizeEvent(event));
      if (events.some((event) => !event)) return reply({ error: "Invalid events" }, 400);
      if (!await rateLimit(request, env, "events", 360)) return reply({ error: "Please try later" }, 429);
      await db.batch(events.map((event) => db.prepare("INSERT OR IGNORE INTO analytics_events (id, session_id, type, page, locale, device, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(event.id, event.session, event.type, event.page, event.locale, event.device, event.detail, event.created)));
      if (ctx.waitUntil) ctx.waitUntil(prune(env));
      return reply({ accepted: events.length });
    }
    if (url.pathname === "/api/leads" && request.method === "POST") {
      const body = await bodyJson(request);
      if (body.website) return reply({ error: "Request not accepted" }, 400);
      if (!ID.test(body.id) || typeof body.name !== "string" || !body.name.trim() || body.name.length > 120 || typeof body.email !== "string" || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.privacyAccepted !== true) return reply({ error: "Check your name, email and privacy acknowledgement." }, 400);
      if (!await rateLimit(request, env, "leads", 10)) return reply({ error: "Too many requests. Please try later." }, 429);
      await db.prepare("INSERT OR IGNORE INTO leads (id, name, email, kind, locale, status, created_at, updated_at) VALUES (?, ?, ?, 'materials', ?, 'new', ?, ?)").bind(body.id, body.name.trim(), body.email.trim().toLowerCase(), LOCALES.has(body.locale) ? body.locale : "en", Date.now(), Date.now()).run();
      if (ctx.waitUntil) ctx.waitUntil(prune(env));
      return reply({ saved: true }, 201);
    }
    if (url.pathname === "/api/admin/session" && request.method === "GET") return reply({ ...identity, source: env.LOCAL_PREVIEW ? "Local SQLite (development)" : "Sites D1", retentionDays: 90 });
    if (url.pathname === "/api/admin/overview" && request.method === "GET") {
      const days = [7, 30, 90].includes(Number(url.searchParams.get("days"))) ? Number(url.searchParams.get("days")) : 30;
      const now = Date.now(); const from = new Date(now); from.setUTCHours(0, 0, 0, 0); from.setUTCDate(from.getUTCDate() - days + 1);
      const start = from.getTime();
      const queries = [
        ["SELECT type, COUNT(*) AS count FROM analytics_events WHERE created_at >= ? GROUP BY type ORDER BY count DESC", start],
        ["SELECT COUNT(DISTINCT session_id) AS count FROM analytics_events WHERE created_at >= ?", start],
        ["SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS day, SUM(type = 'page_view') AS views, COUNT(DISTINCT session_id) AS sessions FROM analytics_events WHERE created_at >= ? GROUP BY day ORDER BY day", start],
        ["SELECT page AS label, COUNT(*) AS count FROM analytics_events WHERE created_at >= ? AND type = 'page_view' GROUP BY page ORDER BY count DESC", start],
        ["SELECT device AS label, COUNT(DISTINCT session_id) AS count FROM analytics_events WHERE created_at >= ? GROUP BY device ORDER BY count DESC", start],
        ["SELECT locale AS label, COUNT(*) AS count FROM analytics_events WHERE created_at >= ? AND type = 'page_view' GROUP BY locale ORDER BY count DESC", start],
        ["SELECT json_extract(detail, '$.floor') AS label, COUNT(*) AS count FROM analytics_events WHERE created_at >= ? AND type = 'floor_open' AND json_extract(detail, '$.floor') IS NOT NULL GROUP BY label ORDER BY count DESC LIMIT 15", start],
        ["SELECT json_extract(detail, '$.unit') AS label, COUNT(*) AS count FROM analytics_events WHERE created_at >= ? AND type = 'residence_open' AND json_extract(detail, '$.unit') IS NOT NULL GROUP BY label ORDER BY count DESC LIMIT 10", start],
        ["SELECT COUNT(*) AS count FROM leads WHERE created_at >= ?", start],
        ["SELECT COUNT(DISTINCT session_id) AS count FROM analytics_events WHERE created_at >= ? AND type = 'lead_submitted'", start],
        ["SELECT MIN(created_at) AS first_event FROM analytics_events"],
      ];
      const results = await db.batch(queries.map(([sql, ...params]) => db.prepare(sql).bind(...params)));
      const [events, sessions, trend, pages, devices, locales, floors, units, leads, converted, first] = results.map((result) => result.results);
      return reply({ days, from: start, updatedAt: now, events, sessions: sessions[0].count, trend, pages, devices, locales, floors, units, leads: leads[0].count, convertedSessions: converted[0].count, firstEvent: first[0].first_event });
    }
    if (url.pathname === "/api/admin/leads" && request.method === "GET") {
      const status = STATUSES.has(url.searchParams.get("status")) ? url.searchParams.get("status") : "all";
      const page = Math.max(0, Math.min(10000, Number.parseInt(url.searchParams.get("page"), 10) || 0));
      const where = status === "all" ? "" : " WHERE status = ?";
      const args = status === "all" ? [] : [status];
      const results = await db.batch([
        db.prepare(`SELECT id, name, email, kind, locale, status, created_at FROM leads${where} ORDER BY created_at DESC LIMIT 25 OFFSET ?`).bind(...args, page * 25),
        db.prepare(`SELECT COUNT(*) AS count FROM leads${where}`).bind(...args),
      ]);
      return reply({ rows: results[0].results, total: results[1].results[0].count, page });
    }
    const leadId = url.pathname.match(/^\/api\/admin\/leads\/([a-f0-9-]{36})$/i)?.[1];
    if (leadId && request.method === "PATCH") {
      const body = await bodyJson(request);
      if (!STATUSES.has(body.status)) return reply({ error: "Invalid status" }, 400);
      const result = await db.prepare("UPDATE leads SET status = ?, updated_at = ? WHERE id = ?").bind(body.status, Date.now(), leadId).run();
      return result.meta.changes ? reply({ saved: true }) : reply({ error: "Lead not found" }, 404);
    }
    if (leadId && request.method === "DELETE") {
      const result = await db.prepare("DELETE FROM leads WHERE id = ?").bind(leadId).run();
      return result.meta.changes ? reply({ deleted: true }) : reply({ error: "Lead not found" }, 404);
    }
    return reply({ error: "Not found" }, 404);
  } catch (error) {
    if (error.status === 429) return reply({ error: "Please retry in a moment." }, 429);
    if (error instanceof SyntaxError || error.message === "Invalid request") return reply({ error: "Invalid request" }, 400);
    console.error("Analytics API unavailable");
    return reply({ error: "Service temporarily unavailable. Please try again." }, 503);
  }
}
import { adminAuthApi, sessionAdmin } from "./admin-auth.js";
