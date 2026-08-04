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

const stand = () => page.evaluate(() => {
  const liste = document.querySelector(".liste-spalte");
  /* Der Seitenfuß ist weg; der Bearbeiten-Schalter schwebt über der Karte. */
  const bearb = document.getElementById("bearbeiten-schalter");
  const karte = document.getElementById("karte").getBoundingClientRect();
  return {
    listeSichtbar: getComputedStyle(liste).display !== "none",
    bearbSichtbar: !!bearb && bearb.getBoundingClientRect().width > 0,
    bearbUnten: bearb ? Math.round(bearb.getBoundingClientRect().bottom) : null,
    karte: Math.round(karte.height),
    fenster: innerHeight,
    scrollbar: document.documentElement.scrollHeight > innerHeight + 2,
    kacheln: document.querySelectorAll(".leaflet-tile").length,
  };
});

const a = await stand();
console.log(`OHNE FILTER  Liste sichtbar=${a.listeSichtbar} | Karte ${a.karte}px von ${a.fenster}px`);
console.log(`             Bearbeiten sichtbar=${a.bearbSichtbar}, endet bei y=${a.bearbUnten} | Seite scrollbar=${a.scrollbar} | ${a.kacheln} Kacheln`);
if (a.listeSichtbar) fehler.push("die Liste ist ohne Filter zu sehen");
if (a.scrollbar) fehler.push("die Seite lässt sich ohne Filter scrollen");
if (!a.bearbSichtbar) fehler.push("der Bearbeiten-Knopf fehlt");
if (a.bearbUnten > a.karte) fehler.push(`der Bearbeiten-Knopf endet bei y=${a.bearbUnten}, die Karte bei ${a.karte}`);
/* Ohne Seitenfuß füllt die Karte jetzt den ganzen Schirm, nicht nur fast. */
if (a.karte !== a.fenster) fehler.push(`die Karte füllt ${a.karte} von ${a.fenster}px`);
if (a.kacheln === 0) fehler.push("keine Kacheln geladen");
await page.screenshot({ path: `${SCHUSS}/handy-leer.png` });

/* Kategorie tippen: die Liste kommt hervor, die Karte schrumpft sichtbar */
await page.locator('.kat-chip[data-kategorie="bar"]').tap();
await page.waitForTimeout(700);
const b = await stand();
const eintraege = await page.evaluate(() => document.querySelectorAll(".eintrag").length);
const listeOben = await page.evaluate(() =>
  Math.round(document.querySelector(".liste-spalte").getBoundingClientRect().top));
console.log(`MIT FILTER   Liste sichtbar=${b.listeSichtbar} ab y=${listeOben} | ${eintraege} Einträge`);
console.log(`             Karte ${b.karte}px | Seite scrollbar=${b.scrollbar} | ${b.kacheln} Kacheln`);
if (!b.listeSichtbar) fehler.push("die Liste erscheint nicht");
if (!b.scrollbar) fehler.push("die Seite scrollt nicht, obwohl die Liste da ist");
if (b.karte >= a.karte) fehler.push("die Karte schrumpft nicht");
if (listeOben > b.fenster) fehler.push(`die Liste beginnt bei y=${listeOben}, außerhalb des Schirms`);
if (b.kacheln === 0) fehler.push("keine Kacheln nach dem Umschalten");
await page.screenshot({ path: `${SCHUSS}/handy-gefiltert.png` });

/* Zurück über das ✕ */
await page.locator("#zuruecksetzen").tap();
await page.waitForTimeout(700);
const c = await stand();
console.log(`NACH ✕       Liste sichtbar=${c.listeSichtbar} | Karte ${c.karte}px | scrollbar=${c.scrollbar}`);
if (c.listeSichtbar) fehler.push("die Liste bleibt nach dem ✕ stehen");
if (c.karte !== a.karte) fehler.push(`Karte ${c.karte}px statt ${a.karte}px wie am Anfang`);
if (c.scrollbar) fehler.push("die Seite scrollt nach dem ✕ noch");

/* Pin antippen ohne Filter: das Ortsblatt muss weiter funktionieren */
await page.locator(".leaflet-marker-icon").first().dispatchEvent("click");
await page.waitForTimeout(800);
const d = await page.evaluate(() => {
  const b = document.getElementById("ort-blatt");
  const r = b.getBoundingClientRect();
  return { offen: !b.hidden && b.classList.contains("offen"), oben: Math.round(r.top),
           hoch: Math.round(r.height), fenster: innerHeight };
});
console.log(`PIN OHNE FILTER  Blatt offen=${d.offen}, y ab ${d.oben}, ${d.hoch}px von ${d.fenster}px`);
if (!d.offen) fehler.push("das Ortsblatt öffnet nicht mehr");
if (d.oben + d.hoch > d.fenster + 2) fehler.push("das Blatt ragt unten hinaus");

melde(fehler);
await browser.close();
