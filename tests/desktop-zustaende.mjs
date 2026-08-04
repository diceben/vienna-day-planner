import { chromium, richteEin, melde, ADRESSE, SCHUSS } from "./hilfe.mjs";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await richteEin(ctx);
const page = await ctx.newPage();
const fehler = [];
page.on("pageerror", (e) => fehler.push("JS: " + e.message));
page.on("console", (m) => { if (m.type() === "error") fehler.push("KONSOLE: " + m.text()); });
await page.goto(ADRESSE, { waitUntil: "networkidle" });
await page.waitForTimeout(900);

const kasten = (sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), b: Math.round(r.width), h: Math.round(r.height),
           sichtbar: r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden" };
}, sel);

const stand = () => page.evaluate(() => ({
  feld: document.getElementById("suche").value,
  /* Die Spalte liegt über der Karte; geschlossen steht sie links daneben.
     Sichtbar ist also ihre rechte Kante, nicht ihre Breite. */
  spalte: Math.round(document.querySelector(".liste-spalte").getBoundingClientRect().right),
  karte: Math.round(document.getElementById("karte").getBoundingClientRect().width),
  eintraege: document.querySelectorAll(".eintrag").length,
  treffer: document.querySelector(".listen-kopf .trefferzahl").textContent,
  katSichtbar: document.getElementById("kategorien").getBoundingClientRect().width > 0,
  marken: document.querySelectorAll(".eintrag .merkmal-marke").length,
  ersteMarken: Array.from(document.querySelectorAll(".eintrag")[0]?.querySelectorAll(".merkmal-marke") || []).map((e) => e.textContent),
  xSichtbar: !document.getElementById("zuruecksetzen").hidden,
  popup: !!document.querySelector(".leaflet-popup"),
}));

/* ---------- 1. Zustand ohne Auswahl ---------- */
const a = await stand();
const pille = await kasten(".kopf-rechts");
const reihe = await kasten("#kategorien");
const rechtsPfeil = await kasten(".kat-scroller .kat-blaettern.rechts");
const linksPfeil = await page.evaluate(() =>
  document.querySelector(".kat-scroller .kat-blaettern.links").hidden);
const zoom = await kasten(".leaflet-control-zoom");
const ort = await kasten(".standort-steuerung");
const zahnrad = await kasten(".gear");
console.log(`OHNE AUSWAHL  Spalte ${a.spalte}px | Karte ${a.karte}px von 1280`);
console.log(`              Pille x=${pille.x} b=${pille.b} | Chipreihe x=${reihe.x}–${reihe.x + reihe.b} y=${reihe.y}`);
console.log(`              › sichtbar=${!!rechtsPfeil?.sichtbar} | ‹ versteckt=${linksPfeil} | ✕ sichtbar=${a.xSichtbar}`);
console.log(`              Zoom y=${zoom?.y} x=${zoom?.x} | Standort y=${ort?.y} x=${ort?.x}`);
console.log(`              Zahnrad x=${zahnrad.x}–${zahnrad.x + zahnrad.b} y=${zahnrad.y} h=${zahnrad.h}`);
if (zahnrad.x + zahnrad.b > 1269) fehler.push(`Zahnrad ragt bis ${zahnrad.x + zahnrad.b}, Fenster ist 1280`);
if (zahnrad.x < 1200) fehler.push(`Zahnrad bei x=${zahnrad.x}, nicht am rechten Rand`);
if (zahnrad.y !== reihe.y) fehler.push(`Zahnrad y=${zahnrad.y}, Chipreihe y=${reihe.y}`);
if (reihe.x + reihe.b > zahnrad.x) fehler.push("Chipreihe läuft unter das Zahnrad");
if (a.feld !== "") fehler.push(`Suchfeld enthält „${a.feld}“ statt leer zu sein`);
if (a.spalte !== 0) fehler.push(`Spalte ragt ${a.spalte}px ins Bild statt 0`);
if (a.karte < 1270) fehler.push(`Karte nur ${a.karte}px breit`);
if (pille.x !== 12) fehler.push(`Pille bei x=${pille.x} statt 12`);
if (reihe.x !== 410) fehler.push(`Chipreihe bei x=${reihe.x} statt 410`);
if (!rechtsPfeil?.sichtbar) fehler.push("rechter Blätterpfeil fehlt");
if (!linksPfeil) fehler.push("linker Blätterpfeil ist zu früh da");
if (a.xSichtbar) fehler.push("✕ ist ohne Filter sichtbar");
if (zoom && zoom.y < 400) fehler.push(`Zoom steht oben (y=${zoom.y})`);
if (ort && ort.y < 400) fehler.push(`Standortknopf steht oben (y=${ort.y})`);
await page.screenshot({ path: `${SCHUSS}/dt-1-leer.png` });

/* ---------- 2. Kategorie wählen ---------- */
await page.click('.kat-chip[data-kategorie="restaurant"]');
await page.waitForTimeout(600);
const b = await stand();
const kreuz = await kasten(".such-x");
const reiheJetzt = await kasten("#kategorien");
console.log(`MIT AUSWAHL   Spalte ${b.spalte}px | ${b.eintraege} Einträge | „${b.treffer}“`);
console.log(`              Suchfeld zeigt „${b.feld}“ | ✕ ${kreuz.b}×${kreuz.h}px bei x=${kreuz.x}`);
console.log(`              Kategorien bleiben=${b.katSichtbar} bei x=${reiheJetzt.x} y=${reiheJetzt.y} | ✕=${b.xSichtbar}`);
console.log(`              Marken: ${b.marken} in der Liste, erster Eintrag „${b.ersteMarken.join(", ")}“`);
if (b.feld !== "Restaurants") fehler.push(`Suchfeld zeigt „${b.feld}“ statt „Restaurants“`);
if (kreuz.b < 32 || kreuz.h < 32) fehler.push(`✕ ist nur ${kreuz.b}×${kreuz.h}px`);
if (b.spalte !== 410) fehler.push(`Spalte reicht bis ${b.spalte}px statt 410`);
if (b.karte !== a.karte) fehler.push(`Karte schrumpft von ${a.karte} auf ${b.karte} — sie soll überdeckt werden, nicht gedrückt`);
if (!b.katSichtbar) fehler.push("Kategorienreihe verschwindet");
if (reiheJetzt.x !== reihe.x || reiheJetzt.y !== reihe.y) fehler.push("Kategorienreihe verrutscht beim Auswählen");
if (await page.$("#merkmal-scroller")) fehler.push("die Merkmal-Filterreihe ist noch da");
if (b.marken === 0) fehler.push("keine Marken in den Einträgen");
if (!b.ersteMarken.length) fehler.push("der erste Eintrag hat keine Marken");
if (!b.xSichtbar) fehler.push("✕ fehlt trotz Filter");
/* Marken sitzen zwischen Adresse und Beschreibung und sind nicht anklickbar. */
const markenSitz = await page.evaluate(() => {
  const e = document.querySelector(".eintrag");
  const kinder = Array.from(e.querySelector(".eintrag-text").children).map((c) => c.className);
  const m = e.querySelector(".merkmal-marke");
  return { reihenfolge: kinder, knopf: m.tagName, zeiger: getComputedStyle(m).cursor };
});
console.log(`              Aufbau: ${markenSitz.reihenfolge.join(" → ")} | <${markenSitz.knopf}>, cursor=${markenSitz.zeiger}`);
const i1 = markenSitz.reihenfolge.indexOf("adresse");
const i2 = markenSitz.reihenfolge.indexOf("merkmal-marken");
const i3 = markenSitz.reihenfolge.indexOf("text");
if (!(i1 < i2 && i2 < i3)) fehler.push(`Marken sitzen falsch: ${markenSitz.reihenfolge.join(", ")}`);
if (markenSitz.knopf === "BUTTON") fehler.push("Marken sind Knöpfe");
if (!b.treffer.startsWith(String(b.eintraege))) fehler.push(`Trefferzahl „${b.treffer}“ passt nicht zu ${b.eintraege} Einträgen`);
await page.screenshot({ path: `${SCHUSS}/dt-2-kategorie.png` });

/* ---------- 3. ✕ ---------- */
await page.click("#zuruecksetzen");
await page.waitForTimeout(600);
const c = await stand();
const felder = await page.evaluate(() => document.getElementById("suche").value);
console.log(`NACH ✕        Spalte ${c.spalte}px | Kategorien sichtbar=${c.katSichtbar} | Suchfeld „${felder}“`);
if (c.spalte !== 0) fehler.push(`Spalte bleibt bei ${c.spalte}px im Bild`);
if (!c.katSichtbar) fehler.push("Kategorien kommen nicht zurück");
if (felder !== "") fehler.push("Suchfeld nicht geleert");

/* ---------- 4. Suchtext allein öffnet ---------- */
await page.fill("#suche", "Kaffee");
await page.waitForTimeout(600);
const d = await stand();
console.log(`NUR SUCHTEXT  Spalte ${d.spalte}px | ${d.eintraege} Einträge | Kategorien sichtbar=${d.katSichtbar}`);
if (d.spalte !== 410) fehler.push("Suchtext öffnet die Spalte nicht");
if (d.karte !== a.karte) fehler.push("Karte schrumpft beim Suchen");
if (!d.katSichtbar) fehler.push("ohne Kategorie sollen die Kategorien bleiben");
await page.fill("#suche", "");
await page.waitForTimeout(500);

/* ---------- 4b. Tippen löst die Kategorie ab ---------- */
await page.click('.kat-chip[data-kategorie="bar"]');
await page.waitForTimeout(400);
const vorTippen = await stand();
await page.click("#suche");
await page.keyboard.press("End");
await page.keyboard.type("x");
await page.waitForTimeout(500);
const nachTippen = await stand();
console.log(`TIPPEN        vorher „${vorTippen.feld}“ (Kategorien aus) → nachher „${nachTippen.feld}“, Kategorien sichtbar=${nachTippen.katSichtbar}`);
if (vorTippen.feld !== "Bars") fehler.push(`nach Klick steht „${vorTippen.feld}“ im Feld`);
if (!nachTippen.katSichtbar) fehler.push("beim Tippen bleibt die Kategorie aktiv");
if (nachTippen.feld !== "Barsx") fehler.push(`beim Tippen wurde das Feld zu „${nachTippen.feld}“`);
await page.click("#zuruecksetzen");
await page.waitForTimeout(500);

/* ---------- 5. Schalter im Zahnrad ---------- */
await page.click("#einstellungen-knopf");
await page.waitForTimeout(200);
const popover = await kasten("#einstellungen");
await page.click("#schalter .chip");
await page.waitForTimeout(600);
const e = await stand();
console.log(`NUR SCHALTER  Spalte ${e.spalte}px | Popover x=${popover.x}–${popover.x + popover.b} y=${popover.y}`);
if (e.spalte !== 410) fehler.push("Schalter öffnet die Spalte nicht");
if (Math.abs(popover.x + popover.b - 1268) > 2) fehler.push(`Popover endet bei ${popover.x + popover.b}, nicht unter dem Zahnrad`);
await page.click("#zuruecksetzen");
await page.waitForTimeout(500);

/* ---------- 6. Karte anklicken: Popup wie bisher ---------- */
await page.locator(".leaflet-marker-icon").first().click({ force: true });
await page.waitForTimeout(500);
const f = await stand();
const blatt = await page.evaluate(() => document.getElementById("ort-blatt").hidden);
console.log(`PIN GEKLICKT  Popup offen=${f.popup} | Ortsblatt versteckt=${blatt}`);
if (!f.popup) fehler.push("kein Popup am Desktop");
if (!blatt) fehler.push("Ortsblatt taucht am Desktop auf");

/* ---------- 7. Tastatur ---------- */
await page.keyboard.press("Escape");
const fokus = await page.evaluate(async () => {
  const chips = [...document.querySelectorAll(".kat-chip")];
  const letzter = chips[chips.length - 1];
  letzter.focus();
  await new Promise((r) => setTimeout(r, 400));
  const r = letzter.getBoundingClientRect();
  return { name: letzter.dataset.kategorie, x: Math.round(r.x), rechts: Math.round(r.right),
           ring: getComputedStyle(letzter, ":focus-visible").outlineWidth };
});
console.log(`TASTATUR      letzter Chip „${fokus.name}“ bei x=${fokus.x}–${fokus.rechts} (Fenster 1280)`);
if (fokus.rechts > 1281 || fokus.x < 0) fehler.push("fokussierter Chip liegt außerhalb");

/* ---------- 8. Breiteres Fenster ---------- */
await page.setViewportSize({ width: 1600, height: 900 });
await page.evaluate(() => { document.getElementById("kategorien").scrollLeft = 0; });
await page.waitForTimeout(600);
const breit = await page.evaluate(() => ({
  rechts: document.querySelector("#kategorie-scroller .kat-blaettern.rechts").hidden,
  links: document.querySelector("#kategorie-scroller .kat-blaettern.links").hidden,
  reihe: Math.round(document.getElementById("kategorien").scrollWidth),
  platz: Math.round(document.getElementById("kategorien").clientWidth),
}));
const passt = breit.reihe <= breit.platz + 1;
console.log(`1600px        Reihe ${breit.reihe}px in ${breit.platz}px Platz | › versteckt=${breit.rechts} | ‹ versteckt=${breit.links}`);
if (passt !== breit.rechts) fehler.push(`› ${breit.rechts ? "fehlt" : "bleibt"}, obwohl die Reihe ${passt ? "passt" : "übersteht"}`);
if (!breit.links) fehler.push("‹ ist am Anfang der Reihe sichtbar");

/* Ganz nach rechts blättern: dann kehrt sich das Bild um. */
/* Ein Klick blättert um 80 % der Breite und reicht hier schon bis ans Ende. */
await page.click("#kategorie-scroller .kat-blaettern.rechts");
await page.waitForTimeout(700);
const ende = await page.evaluate(() => ({
  rechts: document.querySelector("#kategorie-scroller .kat-blaettern.rechts").hidden,
  links: document.querySelector("#kategorie-scroller .kat-blaettern.links").hidden,
  pos: Math.round(document.getElementById("kategorien").scrollLeft),
}));
console.log(`GEBLÄTTERT    scrollLeft=${ende.pos} | › versteckt=${ende.rechts} | ‹ versteckt=${ende.links}`);
if (ende.pos === 0) fehler.push("Blättern bewegt die Reihe nicht");
if (!ende.rechts) fehler.push("› bleibt am Ende der Reihe");
if (ende.links) fehler.push("‹ fehlt, obwohl gescrollt wurde");

melde(fehler);
await browser.close();
