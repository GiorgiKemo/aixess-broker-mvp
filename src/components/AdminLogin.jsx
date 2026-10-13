import { useEffect, useState } from "react";
import "./admin-login.css";
import { useAdminTranslation } from "../useAdminTranslation.js";
import { localizeFieldValidation, clearFieldValidation } from "../i18n.jsx";
import { AixessLogo } from "./AixessLogo.jsx";

async function authRequest(action, body, setupKey = "") {
  const response = await fetch(`/api/admin/auth/${action}`, {
    method: body ? "POST" : "GET", cache: "no-store", signal: AbortSignal.timeout(30000),
    headers: { "content-type": "application/json", ...(setupKey ? { "x-aixess-setup-key": setupKey } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Admin login is not available on this host.");
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not sign in. Please try again.");
  return result;
}

export default function AdminLogin({ onSignedIn }) {
  const { tr, errorText, t } = useAdminTranslation();
  const [setupKey] = useState(() => new URLSearchParams(window.location.hash.split("?")[1] || "").get("setup") || "");
  const [setup, setSetup] = useState(null);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [savedRecovery, setSavedRecovery] = useState(false);

  useEffect(() => {
    let active = true;
    // Setup credentials stay out of URLs, referrers and analytics after the initial load.
    if (setupKey) window.history.replaceState({}, "", `${window.location.pathname}#admin`);
    authRequest("state", null, setupKey).then((state) => {
      if (!active) return;
      setSetup(state);
      if (state.setupAvailable) { setEmail(state.email); setMode("setup"); }
    }).catch((failure) => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [setupKey]);

  const submit = async (event) => {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget);
    const password = form.get("password");
    if (mode !== "login" && password !== form.get("confirm")) { setError("The passwords do not match."); return; }
    setBusy(true); setError("");
    try {
      const result = await authRequest(mode, { email, password, ...(mode === "recover" ? { recoveryCode: form.get("recoveryCode") } : {}) }, setupKey);
      if (result.recoveryCode) { setRecoveryCode(result.recoveryCode); setSavedRecovery(false); setEmail(result.email); }
      else onSignedIn();
    } catch (failure) { setError(failure.message || tr("Unable to connect. Please try again.")); }
    finally { setBusy(false); }
  };
  const switchMode = (next) => { setMode(next); setError(""); setShowPassword(false); };
  const downloadRecovery = () => {
    const url = URL.createObjectURL(new Blob([tr("Recovery file", { email, code: recoveryCode })], { type: "text/plain" }));
    const link = document.createElement("a"); link.href = url; link.download = "aixess-admin-recovery.txt"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <div className="admin-login-page">
    <header className="admin-login-header"><a href="#home" aria-label={tr("AiXESS home")}><AixessLogo /></a><a href="#home">{tr("Back to website ↗")}</a></header>
    <main className="admin-login-main">
      <div className="admin-login-context"><p>{tr("PRIVATE WORKSPACE")}</p><h1>{tr("The insight")}<br />{tr("behind the")}<br /><span>{tr("opportunity.")}</span></h1><div className="admin-login-rule" /><span>{tr("PROJECT REVERANCE · AIXESS")}</span></div>
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <p className="admin-login-eyebrow">{tr("AIXESS ADMIN")}</p>
        {recoveryCode ? <>
          <h2 id="admin-login-title">{tr("Save your recovery code.")}</h2><p>{tr("This is shown once. Store it in your password manager so you can recover access without email support.")}</p>
          <div className="admin-recovery-code">{recoveryCode}</div><button className="admin-login-secondary" type="button" onClick={downloadRecovery}>{tr("Download recovery code")}</button>
          <label className="admin-recovery-ack"><input type="checkbox" checked={savedRecovery} onChange={(event) => setSavedRecovery(event.target.checked)} /><span>{tr("I have saved this code somewhere safe.")}</span></label>
          <button className="admin-login-submit" type="button" disabled={!savedRecovery} onClick={() => { setRecoveryCode(""); setSetup({ setupAvailable: false }); switchMode("login"); }}>{tr("Continue to login →")}</button>
        </> : <>
          <h2 id="admin-login-title">{mode === "setup" ? tr("Create your admin password.") : mode === "recover" ? tr("Recover your account.") : tr("Welcome back.")}</h2>
          <p>{mode === "setup" ? tr("Your protected setup is ready. Choose a password for your dedicated AiXESS account.") : mode === "recover" ? tr("Use the private recovery code saved when you set up your account. Resetting signs out every existing session.") : tr("Sign in to monitor enquiries, residence interest and website activity.")}</p>
          <form key={mode} onSubmit={submit} onInvalidCapture={(event) => localizeFieldValidation(event, t)} onInputCapture={clearFieldValidation}>
            <label htmlFor="admin-email">{tr("Email address")}</label><input id="admin-email" name="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} readOnly={mode === "setup"} required maxLength={254} />
            {mode === "recover" && <><label htmlFor="admin-recovery">{tr("Recovery code")}</label><input id="admin-recovery" name="recoveryCode" autoComplete="off" required spellCheck="false" /></>}
            <label htmlFor="admin-password">{mode === "login" ? tr("Password") : tr("New password")}</label><div className="admin-password-field"><input id="admin-password" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? 1 : 15} maxLength={128} required aria-describedby={mode !== "login" ? "admin-password-help" : undefined} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? tr("Hide password") : tr("Show password")}>{showPassword ? tr("Hide") : tr("Show")}</button></div>
            {mode !== "login" && <><small id="admin-password-help">{tr("Use a unique passphrase of 15–128 characters.")}</small><label htmlFor="admin-confirm">{tr("Confirm password")}</label><input id="admin-confirm" name="confirm" type="password" autoComplete="new-password" minLength={15} maxLength={128} required /></>}
            {error && <p className="admin-login-error" role="alert">{errorText(error)}</p>}
            <button className="admin-login-submit" type="submit" disabled={busy || !setup}>{busy ? tr("Please wait…") : mode === "setup" ? tr("Create admin account →") : mode === "recover" ? tr("Reset password →") : tr("Sign in →")}</button>
          </form>
          <div className="admin-login-links">{mode === "login" ? <button type="button" onClick={() => switchMode("recover")}>{tr("Forgot password?")}</button> : mode === "recover" ? <button type="button" onClick={() => switchMode("login")}>{tr("Back to login")}</button> : <span>{tr("Owner-only setup · no public registration")}</span>}</div>
          {!setup && error && <button className="admin-login-secondary" type="button" onClick={() => window.location.reload()}>{tr("Retry connection")}</button>}
        </>}
        <p className="admin-login-security">{tr("Restricted to authorised AiXESS administrators.")}</p>
      </section>
    </main>
  </div>;
}
