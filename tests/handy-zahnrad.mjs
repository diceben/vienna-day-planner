import { chromium, devices, richteEin, melde, ADRESSE, SCHUSS } from "./hilfe.mjs";
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  await richteEin(ctx);
const page = await ctx.newPage();
const fehler = [];
page.on("pageerror", (e) => fehler.push("JS: " + e.message));
page.on("console", (m) => { if (m.type() === "error") fehler.push("KONSOLE: " + m.text()); });
await page.goto(ADRESSE, { waitUntil: "networkidle" });
await page.waitForTimeout(900);

const box = (s) => page.evaluate((sel) => {
  const e = document.querySelector(sel); if (!e) return null;
  const r = e.getBoundingClientRect();
  return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) };
}, s);

const pille = await box(".kopf-rechts");
const zahnrad = await box(".gear");
const drin = zahnrad.l >= pille.l && zahnrad.r <= pille.r && zahnrad.t >= pille.t && zahnrad.b <= pille.b;
console.log(`Pille   ${pille.l}–${pille.r} × ${pille.t}–${pille.b}`);
console.log(`Zahnrad ${zahnrad.l}–${zahnrad.r} × ${zahnrad.t}–${zahnrad.b} → in der Pille=${drin}`);
if (!drin) fehler.push("Zahnrad sitzt am Handy nicht mehr in der Suchpille");

/* Kategorie antippen: Name ins Feld, ✕ da, beide Reihen sichtbar */
await page.locator('.kat-chip[data-kategorie="cafe"]').tap();
await page.waitForTimeout(600);
const nach = await page.evaluate(() => ({
  feld: document.getElementById("suche").value,
  x: !document.getElementById("zuruecksetzen").hidden,
  kat: document.getElementById("kategorien").getBoundingClientRect().width > 0,
  marken: document.querySelectorAll(".eintrag .merkmal-marke").length,
}));
console.log(`nach Tipp auf „Cafés“: Feld „${nach.feld}“ | ✕=${nach.x} | Kategorien=${nach.kat} | ${nach.marken} Marken`);
if (nach.feld !== "Cafés") fehler.push(`Feld zeigt „${nach.feld}“ statt „Cafés“`);
if (!nach.x) fehler.push("✕ fehlt");
if (!nach.kat) fehler.push("Kategorienreihe verschwindet am Handy");
if (nach.marken === 0) fehler.push("keine Marken in den Einträgen");

/* Popover unter dem Zahnrad, im Fenster */
await page.locator("#einstellungen-knopf").tap();
await page.waitForTimeout(300);
const pop = await box("#einstellungen");
const breite = await page.evaluate(() => innerWidth);
console.log(`Popover ${pop.l}–${pop.r} in ${breite}px Fenster`);
if (pop.l < 0 || pop.r > breite) fehler.push(`Popover ragt aus dem Fenster (${pop.l}–${pop.r})`);

await page.screenshot({ path: `${SCHUSS}/handy-zahnrad.png` });
melde(fehler);
await browser.close();
