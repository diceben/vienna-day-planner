/* Was nach der PageSpeed-Analyse zugesichert bleiben soll.

   Googles `target-size`-Prüfung beanstandet 30 Kartenpins. Die Pins sind
   36 × 46 px und damit über dem Mindestmaß von 24 × 24 — beanstandet wird die
   Überlappung, und die entsteht daraus, dass im 1. Bezirk acht Orte auf
   engstem Raum liegen. Ein Pin lässt sich nicht verschieben, ohne über den Ort
   zu lügen.

   Was stattdessen zugesichert wird, prüft dieser Lauf:

   1. Jeder Pin ist per Tastatur erreichbar und trägt seinen Namen. Das ist der
      gleichwertige Weg, den WCAG 2.5.8 ausdrücklich zulässt — und er ist von
      der Überlappung gar nicht betroffen.
   2. Auf dem Handy gibt es einen Ein-Zeiger-Weg zum Herauszoomen. Vorher gab
      es keinen: Doppeltipp zoomte hinein, hinaus kam man nur mit zwei Fingern
      (WCAG 2.5.1, Stufe A).
   3. Die Seite hat ein Icon — sonst 404 bei jedem Aufruf. */

import { chromium, devices, richteEin, melde, ADRESSE } from "./hilfe.mjs";

const browser = await chromium.launch();
const fehler = [];

async function seite(opt = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...opt });
  await richteEin(ctx);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fehler.push("JS: " + e.message));
  await p.goto(ADRESSE, { waitUntil: "networkidle" });
  await p.waitForTimeout(900);
  return p;
}

/* ---------- 1. Jeder Pin per Tastatur, mit Namen ---------- */
const p = await seite();
const pins = await p.evaluate(() => {
  const alle = [...document.querySelectorAll(".leaflet-marker-icon")];
  return {
    anzahl: alle.length,
    fokussierbar: alle.filter((e) => e.getAttribute("tabindex") === "0").length,
    mitRolle: alle.filter((e) => e.getAttribute("role") === "button").length,
    mitNamen: alle.filter((e) => (e.getAttribute("title") || e.getAttribute("aria-label") || "").trim()).length,
    /* Kein Name darf bloß „Marker" o. ä. sein — er soll den Ort nennen. */
    namen: alle.slice(0, 3).map((e) => e.getAttribute("title")),
  };
});
console.log(`PINS          ${pins.anzahl} | fokussierbar ${pins.fokussierbar} | role=button ${pins.mitRolle} | mit Namen ${pins.mitNamen}`);
console.log(`              z. B. ${pins.namen.map((n) => `„${n}“`).join(", ")}`);
if (pins.anzahl < 60) fehler.push(`nur ${pins.anzahl} Pins — stimmt der Datenbestand?`);
if (pins.fokussierbar !== pins.anzahl) fehler.push(`${pins.anzahl - pins.fokussierbar} Pins sind nicht per Tastatur erreichbar`);
if (pins.mitNamen !== pins.anzahl) fehler.push(`${pins.anzahl - pins.mitNamen} Pins tragen keinen Namen`);
if (pins.mitRolle !== pins.anzahl) fehler.push(`${pins.anzahl - pins.mitRolle} Pins haben keine Rolle`);

/* Und der Weg funktioniert wirklich, nicht nur auf dem Papier. */
await p.locator(".leaflet-marker-icon").nth(5).focus();
const name = await p.evaluate(() => document.activeElement.getAttribute("title"));
await p.keyboard.press("Enter");
await p.waitForTimeout(900);
const auf = await p.evaluate(() => {
  const pop = document.querySelector(".leaflet-popup");
  return { offen: !!pop, titel: pop?.querySelector(".popup-titel")?.textContent };
});
console.log(`TASTATUR      Fokus „${name}“ + Enter -> Popup „${auf.titel}“`);
if (!auf.offen) fehler.push("Enter auf einem Pin öffnet nichts");
if (auf.titel !== name) fehler.push(`Enter auf „${name}“ öffnet „${auf.titel}“`);

/* ---------- 2. Handy: Herauszoomen mit einem Zeiger ---------- */
const h = await seite({ ...devices["iPhone 13"] });
const stufe = () => h.evaluate(() =>
  Number((document.querySelector(".leaflet-tile") || {}).src?.match(/light_all\/(\d+)\//)?.[1]));

const knopf = await h.evaluate(() => {
  const z = document.querySelector(".leaflet-control-zoom");
  if (!z) return null;
  const r = z.getBoundingClientRect();
  const raus = z.querySelector(".leaflet-control-zoom-out");
  const rr = raus?.getBoundingClientRect();
  return {
    sichtbar: getComputedStyle(z).display !== "none" && r.width > 0,
    breit: Math.round(r.width), hoch: Math.round(r.height),
    knopf: rr ? `${Math.round(rr.width)}x${Math.round(rr.height)}` : null,
    imBild: r.left >= 0 && r.bottom <= innerHeight + 1,
  };
});
console.log(`HANDY ZOOM    sichtbar=${knopf?.sichtbar} | Leiste ${knopf?.breit}x${knopf?.hoch} | Knopf ${knopf?.knopf} | im Bild=${knopf?.imBild}`);
if (!knopf || !knopf.sichtbar) {
  fehler.push("auf dem Handy fehlt der Zoomknopf — Herauszoomen ginge nur mit zwei Fingern (WCAG 2.5.1, Stufe A)");
} else {
  if (!knopf.imBild) fehler.push("die Zoomknöpfe liegen außerhalb des Schirms");
  /* Berührungsziel: mindestens 24x24, hier soll es reichlich mehr sein. */
  const [bw, bh] = knopf.knopf.split("x").map(Number);
  if (bw < 24 || bh < 24) fehler.push(`Zoomknopf ${knopf.knopf} — unter dem Mindestmaß 24x24`);

  const vor = await stufe();
  await h.locator(".leaflet-control-zoom-out").tap();
  await h.waitForTimeout(1400);
  const nach = await stufe();
  console.log(`              Tipp auf „−“: Zoom ${vor} -> ${nach}`);
  if (!(nach < vor)) fehler.push(`Tipp auf „−“ ändert nichts (${vor} -> ${nach})`);
}

/* Der Weg hinein muss weiter gehen — vorher ging er über Doppeltipp. */
const vorRein = await stufe();
await h.locator(".leaflet-control-zoom-in").tap();
await h.waitForTimeout(1400);
const nachRein = await stufe();
console.log(`              Tipp auf „+“: Zoom ${vorRein} -> ${nachRein}`);
if (!(nachRein > vorRein)) fehler.push(`Tipp auf „+“ ändert nichts (${vorRein} -> ${nachRein})`);

/* Die Knöpfe dürfen nichts verdecken, was schon unten links steht. */
const stapel = await h.evaluate(() => {
  const k = (s) => { const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect();
    return { o: Math.round(r.top), u: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right) }; };
  return { zoom: k(".leaflet-control-zoom"), standort: k(".standort-steuerung"), bearb: k(".bearbeiten-steuerung") };
});
console.log(`STAPEL        Bearbeiten ${stapel.bearb?.o}–${stapel.bearb?.u} | Standort ${stapel.standort?.o}–${stapel.standort?.u} | Zoom ${stapel.zoom?.o}–${stapel.zoom?.u}`);
const paare = [["Bearbeiten", stapel.bearb], ["Standort", stapel.standort], ["Zoom", stapel.zoom]];
for (let i = 0; i < paare.length; i++)
  for (let j = i + 1; j < paare.length; j++) {
    const [an, a] = paare[i], [bn, b] = paare[j];
    if (!a || !b) continue;
    if (a.o < b.u && b.o < a.u && a.l < b.r && b.l < a.r)
      fehler.push(`${an} und ${bn} überlappen sich unten links`);
  }

/* ---------- 3. Ein Icon, damit kein 404 mehr kommt ---------- */
const icon = await p.evaluate(() => {
  const l = document.querySelector('link[rel~="icon"]');
  return l ? { href: l.getAttribute("href"), typ: l.getAttribute("type") } : null;
});
console.log(`ICON          ${icon ? icon.href + " (" + icon.typ + ")" : "fehlt"}`);
if (!icon) fehler.push("kein <link rel=icon> — der Browser holt /favicon.ico und bekommt 404");
else {
  const antwort = await p.request.get(new URL(icon.href, ADRESSE).href);
  console.log(`              HTTP ${antwort.status()}, ${(await antwort.body()).length} Bytes`);
  if (!antwort.ok()) fehler.push(`das Icon antwortet mit ${antwort.status()}`);
}

melde(fehler);
await browser.close();
