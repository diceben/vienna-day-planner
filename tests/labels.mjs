import { chromium, richteEin, melde, ADRESSE, SCHUSS } from "./hilfe.mjs";
const browser = await chromium.launch();
const fehler = [];

async function seite(opt = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...opt });
  await richteEin(ctx);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fehler.push("JS: " + e.message));
  p.on("console", (m) => { if (m.type() === "error") fehler.push("KONSOLE: " + m.text()); });
  await p.goto(ADRESSE, { waitUntil: "networkidle" });
  await p.waitForTimeout(900);
  return p;
}

const p = await seite();

/* ---------- Die Daten tragen keine erfundenen Werte mehr ---------- */
const daten = await p.evaluate(() => ({
  orte: ORTE.length,
  mitLabels: ORTE.filter((o) => (o.labels || []).length).length,
  feldDa: ORTE.filter((o) => Array.isArray(o.labels)).length,
  mitTags: ORTE.filter((o) => (o.tags || []).length).length,
}));
console.log(`DATEN         ${daten.orte} Orte | labels-Feld bei ${daten.feldDa} | mit Werten ${daten.mitLabels} | mit Tags ${daten.mitTags}`);
if (daten.mitLabels) fehler.push(`${daten.mitLabels} Orte tragen noch Label-Werte`);
if (daten.feldDa !== daten.orte) fehler.push(`das Feld labels fehlt bei ${daten.orte - daten.feldDa} Orten`);
if (daten.mitTags < 50) fehler.push(`nur ${daten.mitTags} Orte mit Tags — da ist zu viel gelöscht worden`);

/* ---------- Die Gruppe „Eigenschaften“ ist weg, die übrigen Filter stehen ---------- */
await p.click("#einstellungen-knopf");
await p.waitForTimeout(300);
const popover = await p.evaluate(() => {
  const e = document.getElementById("einstellungen");
  return {
    offen: !e.hidden,
    text: e.textContent.replace(/\s+/g, " ").trim(),
    schalter: [...e.querySelectorAll("[data-schalter]")].map((b) => b.textContent.trim()),
    labelKnoepfe: e.querySelectorAll("[data-label]").length,
    labelbox: !!document.getElementById("label-schalter"),
    hoehe: Math.round(e.getBoundingClientRect().height),
  };
});
console.log(`POPOVER       ${popover.schalter.length} Schalter, ${popover.hoehe}px hoch: ${popover.schalter.join(", ")}`);
if (!popover.offen) fehler.push("das Popover öffnet nicht");
if (popover.labelKnoepfe) fehler.push(`${popover.labelKnoepfe} Label-Knöpfe stehen noch da`);
if (popover.labelbox) fehler.push("#label-schalter steht noch im Markup");
if (popover.schalter.length !== 6) fehler.push(`${popover.schalter.length} Schalter statt 6`);
for (const wort of ["Barrierefrei", "LGBTQ", "Hunde", "Reizarm", "Vegan", "Geheimtipp", "erfunden", "Testwert"]) {
  if (popover.text.includes(wort)) fehler.push(`„${wort}“ steht noch im Popover`);
}

/* ---------- Die übrigen Schalter filtern weiter ---------- */
const vorher = await p.evaluate(() => document.querySelectorAll(".eintrag").length);
await p.click('[data-schalter="regen"]');
await p.waitForTimeout(500);
const nachher = await p.evaluate(() => ({
  eintraege: document.querySelectorAll(".eintrag").length,
  zahl: document.getElementById("gear-zahl").textContent,
  zahlSichtbar: !document.getElementById("gear-zahl").hidden,
  spalte: Math.round(document.querySelector(".liste-spalte").getBoundingClientRect().right),
}));
console.log(`SCHALTER      „Bei Regen“: ${vorher} -> ${nachher.eintraege} Einträge | Zahl am Zahnrad „${nachher.zahl}“ | Spalte ${nachher.spalte}px`);
if (nachher.eintraege === 0) fehler.push("„Bei Regen“ filtert alles weg");
if (nachher.eintraege >= vorher) fehler.push(`„Bei Regen“ filtert nicht (${vorher} -> ${nachher.eintraege})`);
if (nachher.zahl !== "1") fehler.push(`die Zahl am Zahnrad zeigt „${nachher.zahl}“ statt 1`);
if (!nachher.zahlSichtbar) fehler.push("die Zahl am Zahnrad bleibt versteckt");
if (nachher.spalte !== 410) fehler.push(`filterAktiv() greift nicht — Spalte ${nachher.spalte}px`);

/* Zurücksetzen räumt auch den Schalter weg. */
await p.click("#zuruecksetzen");
await p.waitForTimeout(500);
const zurueck = await p.evaluate(() => ({
  gedrueckt: document.querySelectorAll('[data-schalter][aria-pressed="true"]').length,
  spalte: Math.round(document.querySelector(".liste-spalte").getBoundingClientRect().right),
  zahl: document.getElementById("gear-zahl").hidden,
}));
console.log(`ZURÜCKSETZEN  ${zurueck.gedrueckt} Schalter aktiv | Spalte ${zurueck.spalte}px | Zahl versteckt=${zurueck.zahl}`);
if (zurueck.gedrueckt) fehler.push(`nach ✕ sind noch ${zurueck.gedrueckt} Schalter aktiv`);
if (zurueck.spalte !== 0) fehler.push(`nach ✕ steht die Spalte bei ${zurueck.spalte}px`);
if (!zurueck.zahl) fehler.push("die Zahl am Zahnrad bleibt nach ✕ stehen");

/* ---------- Die Merkmal-Marken im Eintrag sind unberührt ---------- */
await p.click('.kat-chip[data-kategorie="restaurant"]');
await p.waitForTimeout(600);
const marken = await p.evaluate(() => {
  const alle = [...document.querySelectorAll(".eintrag")];
  const mit = alle.filter((e) => e.querySelector(".merkmal-marke"));
  return {
    eintraege: alle.length,
    mitMarken: mit.length,
    beispiel: mit[0] ? [...mit[0].querySelectorAll(".merkmal-marke")].map((m) => m.textContent.trim()) : [],
  };
});
console.log(`MARKEN        ${marken.mitMarken} von ${marken.eintraege} Einträgen, Beispiel: ${marken.beispiel.join(", ")}`);
if (!marken.mitMarken) fehler.push("kein Eintrag trägt noch Merkmal-Marken — da ist zu viel weg");

/* ---------- Bearbeiten-Formular: keine Label-Kästchen, Rest steht ----------
   Vorher einem Ort von Hand ein Label geben, wie es jemand in daten.js täte.
   Das Formular kann es nicht mehr anzeigen — wegspeichern darf es das aber
   auch nicht. */
await p.evaluate(() => {
  const kopie = JSON.parse(JSON.stringify(ORTE));
  kopie[0].labels = ["barrierefrei"];
  window.localStorage.setItem("wien-karte-orte", JSON.stringify(kopie));
});
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(900);
const merkName = await p.evaluate(() => ORTE[0].name);

await p.click("#bearbeiten-schalter");
await p.waitForTimeout(600);
await p.fill("#suche", merkName);
await p.waitForTimeout(500);
await p.locator('.eintrag [data-tun="bearbeiten"]').first().click();
await p.waitForTimeout(500);
const formular = await p.evaluate(() => {
  const f = document.querySelector("#bearbeiten-panel form");
  if (!f) return null;
  return {
    labelKaestchen: f.querySelectorAll('input[name="label"]').length,
    tagKaestchen: f.querySelectorAll('input[name="tag"]').length,
    weitere: f.querySelectorAll('input[name="weitere"]').length,
    felder: [...f.querySelectorAll(".feld > span")].map((s) => s.textContent.trim()),
  };
});
if (!formular) { fehler.push("das Bearbeiten-Formular öffnet nicht"); }
else {
  console.log(`FORMULAR      ${formular.labelKaestchen} Label-Kästchen | ${formular.tagKaestchen} Tags | ${formular.weitere} Zweitkategorien`);
  if (formular.labelKaestchen) fehler.push(`${formular.labelKaestchen} Label-Kästchen stehen noch im Formular`);
  if (!formular.weitere) fehler.push("die Zweitkategorien sind mit verschwunden");
  if (formular.felder.some((f) => /Farbbänder|Labels/.test(f)))
    fehler.push("die Beschriftung „Labels — erscheinen als Farbbänder“ steht noch da");
}

/* Jetzt speichern — das von Hand gesetzte Label muss überleben. */
await p.locator('#bearbeiten-panel button[type="submit"]').click();
await p.waitForTimeout(700);
const bewahrt = await p.evaluate((name) => {
  const gespeichert = JSON.parse(window.localStorage.getItem("wien-karte-orte") || "[]");
  const o = gespeichert.filter((x) => x.name === name)[0];
  return o ? { name: o.name, labels: o.labels, tags: (o.tags || []).length } : null;
}, merkName);
console.log(`BEWAHREN      „${merkName}“ nach dem Speichern: labels=${JSON.stringify(bewahrt && bewahrt.labels)}`);
if (!bewahrt) fehler.push(`„${merkName}“ ist nach dem Speichern nicht mehr im Speicher`);
else if (JSON.stringify(bewahrt.labels) !== '["barrierefrei"]')
  fehler.push(`Speichern hat das von Hand gesetzte Label weggeräumt: ${JSON.stringify(bewahrt.labels)}`);

melde(fehler);
await browser.close();
