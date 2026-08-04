import { chromium, devices, richteEin, melde, ADRESSE, SCHUSS } from "./hilfe.mjs";
const browser = await chromium.launch();
// Echtes Touch-Profil: hasTouch + kein Hover -> matchMedia("(hover: hover)") = false
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  await richteEin(ctx);
const page = await ctx.newPage();
const fehler = [];
page.on("pageerror", (e) => fehler.push("JS: " + e.message));
await page.goto(ADRESSE, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

console.log("hover-fähig laut Browser:", await page.evaluate(() => matchMedia("(hover: hover)").matches));

// EIN Tap muss reichen
await page.tap('[data-kategorie="cafe"]');
await page.waitForTimeout(450);
const nach1 = await page.evaluate(() => ({
  gedrueckt: document.querySelector('[data-kategorie="cafe"]').getAttribute("aria-pressed"),
  zaehlerWeg: !document.querySelector(".zaehler-chip"),
  marken: document.querySelectorAll(".eintrag .merkmal-marke").length }));
console.log(`nach 1 Tap: aria-pressed=${nach1.gedrueckt} | Zähler-Chip weg=${nach1.zaehlerWeg} | ${nach1.marken} Marken in der Liste`);
if (!nach1.zaehlerWeg) fehler.push("der Zähler-Chip steht noch in der Reihe");
if (nach1.gedrueckt !== "true") fehler.push("erster Tap wählt die Kategorie nicht");
if (nach1.marken === 0) fehler.push("keine Marken in den Einträgen");

// Nochmal tippen schaltet ab
await page.tap('[data-kategorie="cafe"]'); await page.waitForTimeout(400);
const nach2 = await page.evaluate(() => document.querySelector('[data-kategorie="cafe"]').getAttribute("aria-pressed"));
console.log("nach 2. Tap (soll abschalten): aria-pressed=" + nach2);
if (nach2 !== "false") fehler.push("zweiter Tap schaltet nicht ab");

// Pillengröße
const groesse = await page.evaluate(() => {
  const c = document.querySelector('[data-kategorie="cafe"]').getBoundingClientRect();
  const m = document.querySelector(".kopf-rechts").getBoundingClientRect();
  return { chipHoch: Math.round(c.height), chipBreit: Math.round(c.width), pilleHoch: Math.round(m.height) };
});
console.log(`Chip ${groesse.chipBreit}x${groesse.chipHoch}px, Suchpille ${groesse.pilleHoch}px hoch`);

// Sticky prüfen
await page.tap('[data-kategorie="fruehstueck"]'); await page.waitForTimeout(350);
const vorher = await page.evaluate(() => ({
  kopf: Math.round(document.querySelector(".kopf-rechts").getBoundingClientRect().top),
  chips: Math.round(document.querySelector(".kat-leiste").getBoundingClientRect().top) }));
await page.evaluate(() => window.scrollTo(0, 600));
await page.waitForTimeout(500);
const nachher = await page.evaluate(() => ({
  gescrollt: Math.round(window.scrollY),
  kopf: Math.round(document.querySelector(".kopf-rechts").getBoundingClientRect().top),
  chips: Math.round(document.querySelector(".kat-leiste").getBoundingClientRect().top) }));
console.log(`nach ${nachher.gescrollt}px scrollen: Suchpille y ${vorher.kopf}→${nachher.kopf}, Chips y ${vorher.chips}→${nachher.chips}`);
if (nachher.gescrollt > 50 && (nachher.kopf !== vorher.kopf || nachher.chips !== vorher.chips)) {
  fehler.push("Leiste bleibt beim Scrollen nicht stehen");
}
await page.screenshot({ path: `${SCHUSS}/handy-sticky.png` });
melde(fehler);
await browser.close();
