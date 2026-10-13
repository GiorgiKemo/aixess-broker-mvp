import { useCallback, useEffect, useState } from "react";
import "./admin.css";
import AdminLogin from "./AdminLogin.jsx";
import { useAdminTranslation } from "../useAdminTranslation.js";
import { PRIVACY_COPY } from "../privacy-copy.js";
import { AixessLogo } from "./AixessLogo.jsx";

const labels = { page_view: "Page views", navigation: "Navigation clicks", portal_login_click: "Workwise login clicks", portal_register_click: "Workwise registration clicks", materials_open: "Materials form opens", lead_submitted: "Consented lead submissions", floor_open: "Floor opens", residence_open: "Residence selections", plan_open: "Plan enlargements", filter_change: "Filter changes", filter_reset: "Filter resets", language_change: "Language changes", contact_click: "Contact clicks", resource_click: "Resource clicks" };
async function api(path, options) {
  const response = await fetch(path, { cache: "no-store", signal: AbortSignal.timeout(15000), ...options });
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("The analytics server is not available on this host.");
  const body = await response.json();
  if (!response.ok) { const error = new Error(body.error || "Request failed"); error.status = response.status; throw error; }
  return body;
}

function Breakdown({ title, rows, prefix = "", note }) {
  const { tr, format } = useAdminTranslation();
  const max = Math.max(1, ...rows.map((row) => row.count));
  return <section className="admin-panel"><h2>{title}</h2>{note && <p className="admin-muted">{note}</p>}{rows.length ? <ol className="admin-breakdown">{rows.map((row) => <li key={row.label}><div><span>{prefix}{row.label}</span><strong>{format(row.count)}</strong></div><span className="admin-bar" style={{ width: `${row.count / max * 100}%` }} /></li>)}</ol> : <p className="admin-empty">{tr("No activity recorded in this period.")}</p>}</section>;
}

function Trend({ overview }) {
  const { tr, locale } = useAdminTranslation();
  const points = Array.from({ length: overview.days }, (_, i) => {
    const day = new Date(overview.from + i * 86400000).toISOString().slice(0, 10);
    return overview.trend.find((entry) => entry.day === day) || { day, views: 0, sessions: 0 };
  });
  const max = Math.max(1, ...points.map((point) => point.views));
  return <section className="admin-panel admin-trend"><div className="admin-panel-heading"><h2>{tr("Audience over time")}</h2><span className="admin-muted">{tr("Page views · UTC")}</span></div><div className="admin-trend-bars" role="img" aria-label={tr("Daily page views over {{days}} days. Exact values are available in the table below.", { days: overview.days })}>{points.map((point) => <div key={point.day} title={tr("{{date}}: {{views}} views, {{sessions}} sessions", { date: point.day, views: point.views, sessions: point.sessions })}><span style={{ height: `${point.views / max * 100}%` }} /></div>)}</div><div className="admin-axis"><span>{points[0].day}</span><span>{points.at(-1).day}</span></div><details><summary>{tr("View daily numbers")}</summary><div className="admin-table-wrap"><table><thead><tr><th>{tr("Date (UTC)")}</th><th>{tr("Page views")}</th><th>{tr("Sessions")}</th></tr></thead><tbody>{points.map((point) => <tr key={point.day}><td>{point.day}</td><td>{point.views}</td><td>{point.sessions}</td></tr>)}</tbody></table></div></details></section>;
}

export default function AdminDashboard() {
  const { tr, locale, format, errorText, t } = useAdminTranslation();
  const [identity, setIdentity] = useState(null);
  const [overview, setOverview] = useState(null);
  const [leads, setLeads] = useState({ rows: [], total: 0 });
  const [days, setDays] = useState(30);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyLead, setBusyLead] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    let current = true;
    let authorised = true;
    setLoading(true);
    async function load() {
      if (!current || !authorised) return;
      try {
        const session = await api("/api/admin/session");
        const [metrics, contacts] = await Promise.all([api(`/api/admin/overview?days=${days}`), api(`/api/admin/leads?status=${status}&page=${page}`)]);
        if (current) { setIdentity(session); setOverview(metrics); setLeads(contacts); setError(null); }
      } catch (failure) { if (current) { setError(failure); if (failure.status === 401 || failure.status === 403) { authorised = false; setIdentity(null); setOverview(null); setLeads({ rows: [], total: 0 }); } } }
      finally { if (current) setLoading(false); }
    }
    load();
    const interval = setInterval(() => { if (document.visibilityState === "visible") load(); }, 30000);
    return () => { current = false; clearInterval(interval); };
  }, [days, status, page, refreshKey]);

  const updateLead = useCallback(async (id, nextStatus, remove = false) => {
    setBusyLead(id);
    try {
      await api(`/api/admin/leads/${id}`, { method: remove ? "DELETE" : "PATCH", headers: { "content-type": "application/json" }, ...(!remove ? { body: JSON.stringify({ status: nextStatus }) } : {}) });
      setDeleteId(null); setRefreshKey((value) => value + 1);
    } catch (failure) { setError(failure); if (failure.status === 401 || failure.status === 403) { setIdentity(null); setOverview(null); setLeads({ rows: [], total: 0 }); setRefreshKey((value) => value + 1); } }
    finally { setBusyLead(null); }
  }, []);

  const counts = Object.fromEntries((overview?.events || []).map((event) => [event.type, event.count]));
  const signOut = async () => {
    try { await api("/api/admin/auth/logout", { method: "POST" }); setIdentity(null); setOverview(null); setLeads({ rows: [], total: 0 }); setError(Object.assign(new Error("Sign in to continue."), { status: 401 })); setRefreshKey((value) => value + 1); }
    catch (failure) { setError(failure); }
  };
  if (!identity && (error?.status === 401 || error?.status === 403)) return <AdminLogin onSignedIn={() => { setError(null); setLoading(true); setRefreshKey((value) => value + 1); }} />;
  return <div className="admin-app">
    <header className="admin-header"><a href="#home" className="admin-logo"><AixessLogo /></a><span>{tr("INTELLIGENCE / ADMIN")}</span><a href="#home">{tr("Back to website ↗")}</a>{identity && <button type="button" onClick={signOut}>{tr("Log out")}</button>}</header>
    <div className="admin-content">
      <div className="admin-title-row"><div><p className="admin-eyebrow">{tr("PROJECT REVERANCE")}</p><h1>{tr("From interest")}<br /><span>{tr("to opportunity.")}</span></h1><p className="admin-muted">{tr("Website activity, residence demand and your enquiry pipeline.")}</p></div>{identity && <div className="admin-period"><label htmlFor="admin-period">{tr("Reporting window")}</label><select id="admin-period" value={days} onChange={(event) => setDays(Number(event.target.value))}>{[7, 30, 90].map((value) => <option key={value} value={value}>{tr("Last {{days}} days", { days: value })}</option>)}</select><button onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}>{loading ? tr("Refreshing…") : tr("Refresh data ↻")}</button></div>}</div>
      {error && <div className="admin-message" role="alert"><strong>{tr("Could not refresh data")}</strong><p>{errorText(error.message)}</p><button onClick={() => setRefreshKey((value) => value + 1)}>{tr("Try again")}</button></div>}
      {loading && !overview && !error && <p role="status">{tr("Checking secure access…")}</p>}
      {overview && identity && <>
        <div className="admin-freshness"><span className="admin-live-dot" />{error ? tr("Showing last successful data") : tr("Connected to the site database")} · {tr("Updated {{time}} UTC", { time: new Date(overview.updatedAt).toLocaleTimeString(locale, { timeZone: "UTC" }) })}<span>{identity.email}</span></div>
        <section className="admin-metrics" aria-label={tr("Key metrics")}>{[
          [tr("Observed sessions"), overview.sessions, tr("Consented sessions, not unique people")],
          [tr("Page views"), counts.page_view || 0, tr("Visits across public website pages")],
          [tr("Saved enquiries"), overview.leads, tr("All materials requests, with or without analytics")],
          [tr("Portal departures"), (counts.portal_login_click || 0) + (counts.portal_register_click || 0), tr("Clicks to Workwise; not successful logins")],
        ].map(([label, value, note]) => <article key={label}><span>{label}</span><strong>{format(value)}</strong><p>{note}</p></article>)}</section>
        <div className="admin-grid admin-overview-grid"><Trend overview={overview} /><section className="admin-panel"><p className="admin-eyebrow">{tr("CONVERSION SIGNALS")}</p><h2>{tr("Where intent goes next")}</h2><div className="admin-signal"><span>{tr("Login button clicks")}</span><strong>{format(counts.portal_login_click)}</strong></div><div className="admin-signal"><span>{tr("Registration button clicks")}</span><strong>{format(counts.portal_register_click)}</strong></div><div className="admin-signal"><span>{tr("Observed lead conversion")}</span><strong>{overview.sessions ? `${(overview.convertedSessions / overview.sessions * 100).toLocaleString(locale, { maximumFractionDigits: 1 })}%` : "—"}</strong></div><p className="admin-muted">{tr("{{converted}} consented sessions submitted an enquiry / {{sessions}} observed sessions.", { converted: format(overview.convertedSessions), sessions: format(overview.sessions) })}</p><div className="admin-callout"><strong>{tr("Completed Workwise logins: not connected")}</strong><p>{tr("A verified Workwise API or webhook is needed for actual login and registration outcomes. Outbound clicks are not a substitute.")}</p></div></section></div>
        <div className="admin-grid admin-three"><Breakdown title={tr("Most viewed pages")} rows={overview.pages.map(row=>({...row,label:row.label==="privacy" ? PRIVACY_COPY[locale].policy : t(({home:"project",residences:"residences","why-aixess":"aixessAdvantage","broker-access":"brokerAccess",insights:"insights","broker-tools":"brokerTools",resources:"resources",calculators:"brokerTools"})[row.label] || "project")}))} /><Breakdown title={tr("Floor interest")} rows={overview.floors} prefix={tr("Floor ")} note={tr("Floor plans opened, not hovers")} /><Breakdown title={tr("Residence interest")} rows={overview.units} prefix="#" note={tr("Apartment selections")} /></div>
        <div className="admin-grid admin-three"><Breakdown title={tr("Devices")} rows={overview.devices.map(row=>({...row,label:tr(row.label)}))} note={tr("Observed sessions by screen-size category")} /><Breakdown title={tr("Languages")} rows={overview.locales} note={tr("Page views by selected language")} /><Breakdown title={tr("Key actions")} rows={overview.events.filter((event) => event.type !== "page_view").map((event) => ({ label: tr(labels[event.type] || "Key actions"), count: event.count }))} /></div>
        <section className="admin-panel admin-leads"><div className="admin-panel-heading"><div><p className="admin-eyebrow">{tr("ENQUIRY PIPELINE")}</p><h2>{tr("People to follow up with")}<span className="admin-count">{leads.total}</span></h2><p className="admin-muted">{tr("Materials requests · all retained dates · not filtered by the reporting window above")}</p></div><label>{tr("Follow-up status")}<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}>{["all", "new", "contacted", "qualified", "closed"].map((value) => <option key={value} value={value}>{tr(value)}</option>)}</select></label></div>
          {!leads.rows.length ? <p className="admin-empty">{tr("No enquiries yet for this status. Submitted materials requests will appear here.")}</p> : <div className="admin-table-wrap"><table><thead><tr><th>{tr("Contact")}</th><th>{tr("Received (UTC)")}</th><th>{tr("Language")}</th><th>{tr("Follow-up")}</th><th>{tr("Privacy")}</th></tr></thead><tbody>{leads.rows.map((lead) => <tr key={lead.id}><td><strong>{lead.name}</strong><a href={`mailto:${lead.email}`}>{lead.email}</a></td><td>{new Date(lead.created_at).toLocaleString(locale, { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })}</td><td>{lead.locale.toUpperCase()}</td><td><select aria-label={tr("Status for {{name}}", { name: lead.name })} value={lead.status} disabled={busyLead === lead.id} onChange={(event) => updateLead(lead.id, event.target.value)}>{["new", "contacted", "qualified", "closed"].map((value) => <option key={value} value={value}>{tr(value)}</option>)}</select></td><td>{deleteId === lead.id ? <div className="admin-delete-confirm"><span>{tr("Permanently delete?")}</span><button disabled={busyLead === lead.id} onClick={() => updateLead(lead.id, null, true)}>{tr("Yes, delete")}</button><button onClick={() => setDeleteId(null)}>{tr("Cancel")}</button></div> : <button onClick={() => setDeleteId(lead.id)}>{tr("Delete record")}</button>}</td></tr>)}</tbody></table></div>}
          <div className="admin-pagination"><button disabled={!page} onClick={() => setPage((value) => value - 1)}>{tr("← Previous")}</button><span>{tr("Page {{page}} of {{total}}", { page: page + 1, total: Math.max(1, Math.ceil(leads.total / 25)) })}</span><button disabled={(page + 1) * 25 >= leads.total} onClick={() => setPage((value) => value + 1)}>{tr("Next →")}</button></div>
        </section>
        <section className="admin-methodology"><h2>{tr("Read the numbers correctly")}</h2><p>{tr("Source: this site’s first-party event and enquiry database. Analytics begin after launch and only include visitors who opt in. Declined consent, blocking software and interrupted connections cause undercounting. Sessions expire after 30 minutes of inactivity; they are not unique people. Screens can change category during a session, so device counts may overlap.")}</p><p>{tr("Event history: 90 days. Enquiries: 365 days or earlier deletion. Refresh: every 30 seconds while this tab is visible. No backfilled or sample data.")}{overview.firstEvent ? tr("Earliest retained event: {{date}}.", { date: new Date(overview.firstEvent).toLocaleDateString(locale, { timeZone: "UTC" }) }) : tr("Waiting for the first consented event.")}</p></section>
      </>}
    </div>
  </div>;
}
