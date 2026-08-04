import { chromium, richteEin, melde, ADRESSE } from "./hilfe.mjs";
const browser = await chromium.launch();
const fehler = [];

async function seite(opt = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...opt });
  await richteEin(ctx);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fehler.push("JS: " + e.message));
  p.on("console", (m) => { if (m.type() === "error") fehler.push("KONSOLE: " + m.text()); });
  return p;
}

/* ---------- Bearbeiten-Modus hält die Spalte offen ---------- */
const a = await seite();
await a.goto(ADRESSE, { waitUntil: "networkidle" });
await a.waitForTimeout(800);
await a.click("#bearbeiten-schalter");
await a.waitForTimeout(700);
const bearb = await a.evaluate(() => ({
  spalte: Math.round(document.querySelector(".liste-spalte").getBoundingClientRect().right),
  panel: !document.getElementById("bearbeiten-panel").hidden,
  filter: !!document.querySelector('.kat-chip[aria-pressed="true"]'),
}));
console.log(`BEARBEITEN    Spalte ${bearb.spalte}px | Panel offen=${bearb.panel} | Filter aktiv=${bearb.filter}`);
if (bearb.spalte !== 410) fehler.push(`Bearbeiten-Modus: Spalte ${bearb.spalte}px statt 410`);
if (!bearb.panel) fehler.push("Bearbeiten-Panel fehlt");
await a.click("#bearbeiten-schalter");
await a.waitForTimeout(700);
const zu = await a.evaluate(() =>
  Math.round(document.querySelector(".liste-spalte").getBoundingClientRect().right));
console.log(`  beendet     Spalte ${zu}px`);
if (zu !== 0) fehler.push(`nach Bearbeiten bleibt die Spalte bei ${zu}px`);

/* ---------- Reduzierte Bewegung: kein Fahren ---------- */
const b = await seite({ reducedMotion: "reduce" });
await b.goto(ADRESSE, { waitUntil: "networkidle" });
await b.waitForTimeout(800);
await b.click('.kat-chip[data-kategorie="bar"]');
/* Ohne Übergang steht die Spalte sofort. Nach 60 ms wäre eine 220-ms-Fahrt
   erst bei rund einem Viertel. */
await b.waitForTimeout(60);
const sofort = await b.evaluate(() =>
  Math.round(document.querySelector(".liste-spalte").getBoundingClientRect().right));
const uebergang = await b.evaluate(() =>
  getComputedStyle(document.querySelector(".liste-spalte")).transitionDuration);
console.log(`OHNE BEWEGUNG Spalte nach 60ms: ${sofort}px | transition-duration=${uebergang}`);
if (sofort !== 410) fehler.push(`bei reduzierter Bewegung fährt die Spalte noch (${sofort}px nach 60 ms)`);

/* Und die Karte weiß von ihrer neuen Breite. */
await b.waitForTimeout(600);
const karte = await b.evaluate(() => ({
  breit: Math.round(document.getElementById("karte").getBoundingClientRect().width),
  kacheln: document.querySelectorAll(".leaflet-tile").length,
}));
console.log(`              Karte ${karte.breit}px, ${karte.kacheln} Kacheln geladen`);
if (karte.breit !== 1280) fehler.push(`Karte ${karte.breit}px statt 1280 — sie soll nicht gedrückt werden`);
if (karte.kacheln === 0) fehler.push("keine Kacheln nach dem Umschalten");

melde(fehler);
await browser.close();
