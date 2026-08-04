import { chromium, devices, richteEin, melde, ADRESSE } from "./hilfe.mjs";
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

const lage = (p, s) => p.evaluate((s) => {
  const e = document.querySelector(s);
  if (!e) return null;
  const b = e.getBoundingClientRect();
  return { l: Math.round(b.left), o: Math.round(b.top), r: Math.round(b.right),
           u: Math.round(b.bottom), br: Math.round(b.width), ho: Math.round(b.height),
           sichtbar: b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== "hidden" };
}, s);

/* ---------- Desktop ---------- */
const p = await seite();
if (await p.locator(".fuss").count()) fehler.push("die Fußleiste steht noch da");

const karte = await lage(p, "#karte");
const fenster = await p.evaluate(() => ({ h: window.innerHeight, w: window.innerWidth,
  scroll: document.documentElement.scrollHeight - window.innerHeight }));
console.log(`KARTE         ${karte.br}x${karte.ho}, Fenster ${fenster.w}x${fenster.h}, Überstand ${fenster.scroll}px`);
if (karte.u !== fenster.h) fehler.push(`Karte endet bei ${karte.u}, Fenster ist ${fenster.h} hoch`);
if (fenster.scroll > 0) fehler.push(`die Seite scrollt um ${fenster.scroll}px`);

const b = await lage(p, "#bearbeiten-schalter");
const st = await lage(p, ".standort-steuerung");
const zoom = await lage(p, ".leaflet-control-zoom");
const attrib = await lage(p, ".leaflet-control-attribution");
const aktionen = await lage(p, ".karten-aktionen");
console.log(`BEARBEITEN    ${b.l},${b.o} ${b.br}x${b.ho}  | Standort ${st.o} | Zoom ${zoom.o}`);
console.log(`NENNUNG       ${attrib.l},${attrib.o} ${attrib.br}x${attrib.ho} — „${(await p.locator(".leaflet-control-attribution").textContent()).trim()}"`);
if (!b || !b.sichtbar) fehler.push("Bearbeiten-Knopf nicht sichtbar");
if (b.u > st.o) fehler.push(`Bearbeiten (${b.o}–${b.u}) überlappt den Standortknopf (ab ${st.o})`);
if (b.l < 0 || b.u > karte.ho) fehler.push(`Bearbeiten liegt außerhalb der Karte (${b.l},${b.u})`);
if (!attrib || !attrib.sichtbar) fehler.push("die Nennung von OpenStreetMap/CARTO fehlt");
if (attrib.o < aktionen.u) fehler.push(`Nennung (ab ${attrib.o}) liegt unter „Mein Tag" (bis ${aktionen.u})`);
if (attrib.u > karte.ho) fehler.push(`Nennung ragt ${attrib.u - karte.ho}px über die Karte`);

/* Klick öffnet den Modus, der Knopf wird dunkel, die Spalte fährt auf. */
await p.click("#bearbeiten-schalter");
await p.waitForTimeout(600);
const an = await p.evaluate(() => ({
  modus: document.body.classList.contains("bearbeiten"),
  text: document.getElementById("bearbeiten-schalter").textContent,
  grund: getComputedStyle(document.querySelector(".bearbeiten-steuerung")).backgroundColor,
  panel: !document.getElementById("bearbeiten-panel").hidden,
  spalte: Math.round(document.querySelector(".liste-spalte").getBoundingClientRect().right),
}));
const bAuf = await lage(p, "#bearbeiten-schalter");
console.log(`MODUS AN      „${an.text}" | Grund ${an.grund} | Spalte ${an.spalte}px | Knopf bei x=${bAuf.l}`);
if (!an.modus) fehler.push("Klick schaltet den Bearbeiten-Modus nicht ein");
if (an.text !== "Bearbeiten beenden") fehler.push(`Beschriftung bleibt „${an.text}"`);
if (an.grund !== "rgb(43, 39, 33)") fehler.push(`Knopf wird nicht dunkel (${an.grund})`);
if (!an.panel) fehler.push("Bearbeiten-Panel fehlt");
/* Mit offener Spalte wandert der ganze Stapel mit — sonst läge der Knopf darunter. */
if (bAuf.l < an.spalte) fehler.push(`Knopf bei x=${bAuf.l} liegt hinter der ${an.spalte}px breiten Spalte`);

await p.click("#bearbeiten-schalter");
await p.waitForTimeout(600);
const aus = await p.evaluate(() => document.body.classList.contains("bearbeiten"));
const bZu = await lage(p, "#bearbeiten-schalter");
console.log(`MODUS AUS     Modus=${aus} | Knopf zurück bei x=${bZu.l}`);
if (aus) fehler.push("der Modus lässt sich nicht wieder ausschalten");
if (bZu.l !== b.l) fehler.push(`Knopf kehrt nicht zurück (${bZu.l} statt ${b.l})`);

/* Ein Doppelklick auf den Knopf darf die Karte nicht zoomen — Leaflet
   zoomt sonst bei jedem Doppelklick hinein. Die Zoomstufe steht in den
   Kachel-Adressen (…/{z}/{x}/{y}.png). */
const stufe = () => p.evaluate(() => {
  const t = document.querySelector(".leaflet-tile");
  const m = t && t.src.match(/light_all\/(\d+)\//);
  return m ? Number(m[1]) : null;
});
const zVor = await stufe();
await p.dblclick("#bearbeiten-schalter");
await p.waitForTimeout(800);
const zNach = await stufe();
console.log(`DOPPELKLICK   Zoomstufe ${zVor} -> ${zNach}`);
if (zVor !== zNach) fehler.push(`Doppelklick auf den Knopf zoomt die Karte (${zVor} -> ${zNach})`);
/* Der Doppelklick hat zweimal umgeschaltet — der Modus ist wieder aus. */
if (await p.evaluate(() => document.body.classList.contains("bearbeiten")))
  fehler.push("nach dem Doppelklick steht der Bearbeiten-Modus noch an");

/* ---------- Handy ---------- */
const h = await seite({ ...devices["iPhone 13"] });
const hb = await lage(h, "#bearbeiten-schalter");
const hk = await lage(h, "#karte");
const hz = await h.evaluate(() => ({
  hoch: window.innerHeight,
  scroll: document.documentElement.scrollHeight - window.innerHeight,
  zoom: !!document.querySelector(".leaflet-control-zoom") &&
        getComputedStyle(document.querySelector(".leaflet-control-zoom")).display,
}));
const ha = await lage(h, ".leaflet-control-attribution");
console.log(`HANDY         Karte ${hk.br}x${hk.ho} von ${hz.hoch} | Bearbeiten ${hb.l},${hb.o} ${hb.br}x${hb.ho} | Zoom ${hz.zoom} | Überstand ${hz.scroll}px`);
if (!hb.sichtbar) fehler.push("Handy: Bearbeiten-Knopf nicht sichtbar");
if (hb.r > hk.br) fehler.push(`Handy: Knopf ragt ${hb.r - hk.br}px über den rechten Kartenrand`);
if (hb.u > hk.ho) fehler.push(`Handy: Knopf ragt ${hb.u - hk.ho}px unter die Karte`);
if (!ha || !ha.sichtbar) fehler.push("Handy: die Nennung fehlt");
if (hz.scroll > 0) fehler.push(`Handy: die Seite scrollt um ${hz.scroll}px`);

/* Blatt offen: Karte füllt den Schirm, nichts scrollt. */
await h.locator(".leaflet-marker-icon").first().dispatchEvent("click");
await h.waitForTimeout(700);
const blatt = await h.evaluate(() => ({
  offen: document.body.classList.contains("ort-offen"),
  scroll: document.documentElement.scrollHeight - window.innerHeight,
  karte: Math.round(document.getElementById("karte").getBoundingClientRect().height),
}));
console.log(`  Blatt offen ${blatt.offen}, Karte ${blatt.karte}px, Überstand ${blatt.scroll}px`);
if (blatt.offen && blatt.scroll > 0) fehler.push(`Handy mit Blatt: die Seite scrollt um ${blatt.scroll}px`);

melde(fehler);
await browser.close();
