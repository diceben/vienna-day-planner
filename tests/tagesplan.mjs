import { chromium, devices, richteEin, melde, ADRESSE, SCHUSS } from "./hilfe.mjs";
const browser = await chromium.launch();
const fehler = [];

async function seite(opt) {
  const ctx = await browser.newContext(opt);
  await richteEin(ctx);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fehler.push("JS: " + e.message));
  p.on("console", (m) => { if (m.type() === "error") fehler.push("KONSOLE: " + m.text()); });
  await p.goto(ADRESSE, { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);
  return [p, ctx];
}

const kasten = (p, sel) => p.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top),
           b: Math.round(r.bottom), br: Math.round(r.width), h: Math.round(r.height),
           sichtbar: getComputedStyle(el).visibility !== "hidden" && r.width > 0 };
}, sel);

/* ---------- Desktop ---------- */
const [p] = await seite({ viewport: { width: 1280, height: 800 } });

/* Vier Orte in den Plan legen */
await p.click('.kat-chip[data-kategorie="fruehstueck"]');
await p.waitForTimeout(700);
await p.evaluate(() => {
  document.querySelectorAll(".eintrag .plan-knopf").forEach((b, i) => { if (i < 4) b.click(); });
});
await p.waitForTimeout(500);

const routeVor = await kasten(p, ".route-knopf");
await p.click("#plan-fab");
await p.waitForTimeout(600);
const panel = await kasten(p, ".plan-overlay");
const routeNach = await kasten(p, ".route-knopf");
const fab = await kasten(p, ".plan-fab");
const fenster = await p.evaluate(() => ({ b: innerWidth, h: innerHeight }));

console.log(`PANEL     ${panel.l}–${panel.r} × ${panel.t}–${panel.b}  (${panel.br}×${panel.h}px, Fenster ${fenster.b}×${fenster.h})`);
console.log(`ROUTE     vorher rechts bei ${routeVor.r}, jetzt ${routeNach.l}–${routeNach.r}`);
console.log(`MEIN TAG  sichtbar=${fab.sichtbar}, Breite ${fab.br}px`);
if (panel.br < 400) fehler.push(`Panel nur ${panel.br}px breit`);
if (panel.h < fenster.h * 0.8) fehler.push(`Panel nur ${panel.h}px hoch von ${fenster.h}`);
if (routeNach.r > panel.l) fehler.push(`Route-Knopf endet bei ${routeNach.r}, Panel beginnt bei ${panel.l} — verdeckt`);
if (routeNach.l < 0) fehler.push(`Route-Knopf ragt links hinaus (${routeNach.l})`);
if (fab.sichtbar) fehler.push("„Mein Tag“ bleibt sichtbar");
if (routeNach.r >= routeVor.r) fehler.push("Route-Knopf ist nicht nach links gerückt");

/* Inhalt: Bilder, Adressen, Summe */
const inhalt = await p.evaluate(() => ({
  eintraege: document.querySelectorAll(".plan-eintrag").length,
  bilder: document.querySelectorAll(".plan-eintrag .plan-bild").length,
  fotos: document.querySelectorAll(".plan-eintrag .plan-bild img").length,
  adressen: document.querySelectorAll(".plan-eintrag .plan-adresse").length,
  summe: document.getElementById("plan-summe").textContent,
  abschnitte: document.querySelectorAll(".plan-abschnitt").length,
}));
console.log(`INHALT    ${inhalt.eintraege} Einträge, ${inhalt.bilder} Bildfelder (${inhalt.fotos} mit Foto), ${inhalt.adressen} Adressen`);
console.log(`          Summe: „${inhalt.summe}“ | ${inhalt.abschnitte} Abschnitte`);
if (inhalt.bilder !== inhalt.eintraege) fehler.push("nicht jeder Eintrag hat ein Bildfeld");
if (inhalt.adressen !== inhalt.eintraege) fehler.push("nicht jeder Eintrag hat eine Adresse");
if (inhalt.abschnitte !== 4) fehler.push(`${inhalt.abschnitte} Abschnitte statt 4`);
if (!/Stopps|Stopp/.test(inhalt.summe)) fehler.push("Summe fehlt");
await p.screenshot({ path: `${SCHUSS}/plan-desktop.png` });

/* Schließen: Knopf kommt zurück */
await p.click("#plan-schliessen");
await p.waitForTimeout(600);
const routeZu = await kasten(p, ".route-knopf");
const fabZu = await kasten(p, ".plan-fab");
console.log(`GESCHLOSSEN Route wieder bei ${routeZu.r} | „Mein Tag“ sichtbar=${fabZu.sichtbar}`);
if (Math.abs(routeZu.r - routeVor.r) > 2) fehler.push("Route-Knopf kehrt nicht an seinen Platz zurück");
if (!fabZu.sichtbar) fehler.push("„Mein Tag“ kommt nicht zurück");

/* ---------- Handy ---------- */
const [ph] = await seite({ ...devices["iPhone 13"] });
await ph.locator('.kat-chip[data-kategorie="fruehstueck"]').tap();
await ph.waitForTimeout(700);
await ph.evaluate(() => {
  document.querySelectorAll(".eintrag .plan-knopf").forEach((b, i) => { if (i < 3) b.click(); });
});
await ph.waitForTimeout(400);
await ph.evaluate(() => window.scrollTo(0, 0));
await ph.locator("#plan-fab").tap();
await ph.waitForTimeout(600);
const hp = await kasten(ph, ".plan-overlay");
const hf = await kasten(ph, ".karten-aktionen");
const hfenster = await ph.evaluate(() => ({ b: innerWidth, h: innerHeight }));
console.log(`HANDY     Panel ${hp.l}–${hp.r} × ${hp.t}–${hp.b} in ${hfenster.b}×${hfenster.h} | Knöpfe sichtbar=${hf.sichtbar}`);
if (hp.l < 0 || hp.r > hfenster.b) fehler.push("Panel ragt am Handy aus dem Fenster");
if (hp.t < 60) fehler.push(`Panel beginnt am Handy bei y=${hp.t}, unter der Chipreihe`);
if (hf.sichtbar) fehler.push("Kartenknöpfe bleiben am Handy sichtbar");
await ph.screenshot({ path: `${SCHUSS}/plan-handy.png` });

melde(fehler);
await browser.close();
