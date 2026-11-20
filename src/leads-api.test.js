import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../api/leads.js";

function call(body, env = {}) {
  Object.assign(process.env, env);
  const res = { statusCode: 0, headers: {}, body: null, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; }, end() { return this; } };
  return handler({ method: "POST", body, headers: { host: "aixess.global" } }, res).then(() => res);
}

afterEach(() => { delete process.env.RESEND_API_KEY; vi.restoreAllMocks(); });

describe("/api/leads", () => {
  it("emails the team and a localized confirmation to the sender", async () => {
    const sent = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => { sent.push(JSON.parse(init.body)); return new Response(JSON.stringify({ id: "x" }), { status: 200 }); });
    const res = await call({ kind: "enquiry", firstName: "Анна", surname: "Смирнова", email: "anna@example.com", phone: "+7 900", project: "TRESORA", request: "Запросить наличие", requestEn: "Request availability", route: "tresora", message: "<b>hi</b>", locale: "ru" }, { RESEND_API_KEY: "re_test" });
    expect(res.body).toMatchObject({ saved: true, team: true, confirmation: true });
    const [team, confirmation] = sent;
    expect(team.to).toEqual(["info@aixess.global"]);
    expect(team.reply_to).toBe("anna@example.com");
    expect(team.subject).toContain("Request availability · TRESORA");
    expect(team.html).toContain("&lt;b&gt;hi&lt;/b&gt;");
    expect(team.html).not.toContain("<b>hi</b>");
    expect(confirmation.to).toEqual(["anna@example.com"]);
    expect(confirmation.reply_to).toBe("info@aixess.global");
    expect(confirmation.html).toContain("Здравствуйте, Анна!");
    expect(confirmation.html).toContain("https://aixess.global/email/aixess-logo-white.png");
    expect(confirmation.html).toContain("https://aixess.global/#tresora");
  });

  it("saves without sending when Resend is not configured, and rejects bad input", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect((await call({ kind: "contact", name: "A", email: "a@b.co", message: "Hi" })).body).toMatchObject({ saved: true, team: false, confirmation: false });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect((await call({ kind: "contact", name: "A", email: "a@b.co" })).statusCode).toBe(400);
    expect((await call({ name: "A", email: "not-an-email" })).statusCode).toBe(400);
  });
});
