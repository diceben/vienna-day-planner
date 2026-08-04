import { chromium, devices, richteEin, melde, ADRESSE, SCHUSS } from "./hilfe.mjs";
const browser = await chromium.launch();
const fehler = [];

/* Kein Abfangen von unpkg mehr — Leaflet kommt aus dem Projekt. Nur die
   Kartenkacheln werden ersetzt, damit der Lauf offline und schnell bleibt. */
async function seite(opt = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...opt });
  const fremd = [];
  await richteEin(ctx);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fehler.push("JS: " + e.message));
  p.on("console", (m) => { if (m.type() === "error") fehler.push("KONSOLE: " + m.text()); });
  /* Jede Anfrage mitschreiben, die weder an den eigenen Server noch an die
     Kachelquelle geht. Genau das darf es nicht mehr geben. */
  p.on("request", (r) => {
    const u = r.url();
    if (u.startsWith(ADRESSE)) return;
    if (u.includes("cartocdn.com")) return;
    if (u.startsWith("data:") || u.startsWith("blob:")) return;
    fremd.push(r.resourceType() + " " + u);
  });
  p.on("requestfailed", (r) => {
    if (r.url().startsWith(ADRESSE)) fehler.push("fehlgeschlagen: " + r.url());
  });
  await p.goto(ADRESSE, { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  return { p, fremd };
}

/* ---------- Desktop: Karte läuft ohne CDN ---------- */
const { p, fremd } = await seite();
const stand = await p.evaluate(() => ({
  leaflet: typeof window.L,
  version: window.L && window.L.version,
  karte: !!document.querySelector(".leaflet-container"),
  kacheln: document.querySelectorAll(".leaflet-tile").length,
  pins: document.querySelectorAll(".leaflet-marker-icon").length,
  quelle: [...document.querySelectorAll("script[src], link[rel=stylesheet]")]
    .map((e) => e.getAttribute("src") || e.getAttribute("href")),
}));
console.log(`LEAFLET       ${stand.leaflet} ${stand.version} | Container=${stand.karte} | ${stand.kacheln} Kacheln, ${stand.pins} Pins`);
console.log(`QUELLEN       ${stand.quelle.join("  ")}`);
if (stand.leaflet !== "object") fehler.push("Leaflet ist nicht geladen");
if (stand.version !== "1.9.4") fehler.push(`Leaflet ${stand.version} statt 1.9.4`);
if (!stand.karte) fehler.push("kein Leaflet-Container");
if (!stand.kacheln) fehler.push("keine Kacheln");
if (!stand.pins) fehler.push("keine Pins");
if (stand.quelle.some((q) => /^https?:/.test(q))) fehler.push(`fremde Quelle im Markup: ${stand.quelle.filter((q) => /^https?:/.test(q))}`);

/* ---------- Der Kern: keine fremden Anfragen ---------- */
console.log(`FREMD BEIM LADEN  ${fremd.length ? fremd.join("\n                  ") : "keine"}`);
if (fremd.length) fehler.push(`${fremd.length} fremde Anfrage(n): ${fremd.join(", ")}`);

/* Und auch nicht, wenn man die Seite bedient. */
const vorher = fremd.length;
await p.click('.kat-chip[data-kategorie="museum"]');
await p.waitForTimeout(700);
await p.locator(".eintrag").first().click();
await p.waitForTimeout(900);
await p.click("#route-knopf");
await p.waitForTimeout(400);
await p.click('[data-route-kat="museum"]').catch(() => {});
await p.waitForTimeout(300);
await p.click("#einstellungen-knopf");
await p.waitForTimeout(300);
await p.click("#bearbeiten-schalter");
await p.waitForTimeout(700);
console.log(`FREMD BEIM KLICKEN ${fremd.length - vorher} neue`);
if (fremd.length > vorher) fehler.push(`beim Bedienen ${fremd.length - vorher} fremde Anfragen: ${fremd.slice(vorher).join(", ")}`);

/* ---------- Handy ---------- */
const h = await seite({ ...devices["iPhone 13"] });
const hstand = await h.p.evaluate(() => ({
  version: window.L && window.L.version,
  kacheln: document.querySelectorAll(".leaflet-tile").length,
}));
console.log(`HANDY         Leaflet ${hstand.version}, ${hstand.kacheln} Kacheln | fremd: ${h.fremd.length || "keine"}`);
if (hstand.version !== "1.9.4") fehler.push("Handy: Leaflet fehlt");
if (h.fremd.length) fehler.push(`Handy: ${h.fremd.length} fremde Anfragen: ${h.fremd.join(", ")}`);

/* ---------- Netz gekappt: das Gerüst muss stehen ----------
   Alles blocken, was nicht vom eigenen Server kommt. Genau der Fall, für den
   Leaflet ins Projekt gewandert ist: Vorher wäre hier eine leere Fläche
   geblieben, weil auch die Bibliothek selbst von außen kam. */
const kalt = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await kalt.route("**/*", (r) =>
  r.request().url().startsWith(ADRESSE) ? r.continue() : r.abort());
const kp = await kalt.newPage();
const kfehler = [];
kp.on("pageerror", (e) => kfehler.push(e.message));
await kp.goto(ADRESSE, { waitUntil: "domcontentloaded" });
await kp.waitForTimeout(2500);
const ohneNetz = await kp.evaluate(() => ({
  leaflet: typeof window.L,
  container: !!document.querySelector(".leaflet-container"),
  pins: document.querySelectorAll(".leaflet-marker-icon").length,
  kacheln: document.querySelectorAll(".leaflet-tile-loaded").length,
  zoom: !!document.querySelector(".leaflet-control-zoom"),
  liste: document.querySelectorAll(".eintrag").length,
  bearbeiten: !!document.getElementById("bearbeiten-schalter"),
}));
console.log(`OHNE NETZ     Leaflet=${ohneNetz.leaflet} | Container=${ohneNetz.container} | ${ohneNetz.pins} Pins | ${ohneNetz.kacheln} Kacheln | Zoom=${ohneNetz.zoom} | Bearbeiten=${ohneNetz.bearbeiten}`);
if (ohneNetz.leaflet !== "object") fehler.push("ohne Netz lädt Leaflet nicht — es kommt also doch von außen");
if (!ohneNetz.container) fehler.push("ohne Netz steht kein Kartengerüst");
if (!ohneNetz.pins) fehler.push("ohne Netz keine Pins");
if (!ohneNetz.zoom) fehler.push("ohne Netz keine Zoomknöpfe");
if (!ohneNetz.bearbeiten) fehler.push("ohne Netz kein Bearbeiten-Schalter");
if (ohneNetz.kacheln) fehler.push(`ohne Netz sind ${ohneNetz.kacheln} Kacheln geladen — die Sperre greift nicht, der Test sagt nichts`);
if (kfehler.length) fehler.push("ohne Netz Skriptfehler: " + kfehler.join(" | "));

/* Und bedienbar ist sie auch. */
await kp.click('.kat-chip[data-kategorie="bar"]');
await kp.waitForTimeout(600);
const kaltGefiltert = await kp.evaluate(() => ({
  eintraege: document.querySelectorAll(".eintrag").length,
  spalte: Math.round(document.querySelector(".liste-spalte").getBoundingClientRect().right),
}));
console.log(`              nach Klick auf „Bars“: ${kaltGefiltert.eintraege} Einträge, Spalte ${kaltGefiltert.spalte}px`);
if (!kaltGefiltert.eintraege) fehler.push("ohne Netz filtert die Seite nicht");
if (kaltGefiltert.spalte !== 410) fehler.push("ohne Netz schwenkt die Spalte nicht auf");

melde(fehler);
await browser.close();
