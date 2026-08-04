import { chromium, richteEin, melde, ADRESSE, SCHUSS } from "./hilfe.mjs";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await richteEin(ctx);
const page = await ctx.newPage();
const fehler = [];
page.on("pageerror", (e) => fehler.push("JS: " + e.message));
page.on("console", (m) => { if (m.type() === "error") fehler.push("KONSOLE: " + m.text()); });
await page.goto(ADRESSE, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

const m = await page.evaluate(() => {
  const bild = document.querySelectorAll(".bildpin").length;
  const tropfen = document.querySelectorAll(".pin").length;
  const spitzen = document.querySelectorAll(".pin-spitze").length;
  /* Steht die Spitze eines Bildpunkts unten auf der Koordinate? Der Marker
     wird von Leaflet so gesetzt, dass der iconAnchor auf dem Punkt liegt —
     also muss die untere Ecke der Spitze mit der Unterkante des Markers
     zusammenfallen. */
  const wrap = document.querySelector(".bildpin").closest(".leaflet-marker-icon");
  const mr = wrap.getBoundingClientRect();
  const kreis = wrap.querySelector(".bildpin").getBoundingClientRect();
  const sp = wrap.querySelector(".pin-spitze").getBoundingClientRect();
  return { bild, tropfen, spitzen,
    markerHoch: Math.round(mr.height), markerBreit: Math.round(mr.width),
    kreisUnten: Math.round(kreis.bottom - mr.top),
    spitzeUnten: Math.round(sp.bottom - mr.top),
    spitzeMitte: Math.round(sp.left + sp.width / 2 - mr.left) };
});
console.log(`PINS      ${m.bild} Bildpunkte, ${m.tropfen} Tropfen, ${m.spitzen} Spitzen`);
console.log(`MARKER    ${m.markerBreit}×${m.markerHoch}px | Kreis endet bei ${m.kreisUnten}, Spitze bei ${m.spitzeUnten}, Mitte x=${m.spitzeMitte}`);
if (m.spitzen !== m.bild + m.tropfen) fehler.push(`${m.spitzen} Spitzen für ${m.bild + m.tropfen} Pins`);
if (m.spitzeUnten <= m.kreisUnten) fehler.push("die Spitze ragt nicht unter den Kreis");
if (Math.abs(m.spitzeUnten - m.markerHoch) > 2) fehler.push(`Spitze endet bei ${m.spitzeUnten}, Marker ist ${m.markerHoch} hoch — steht nicht auf der Koordinate`);
if (Math.abs(m.spitzeMitte - m.markerBreit / 2) > 2) fehler.push("Spitze nicht mittig");

const box = await page.evaluate(() => {
  const r = document.querySelector(".bildpin").closest(".leaflet-marker-icon").getBoundingClientRect();
  return { x: Math.max(0, Math.round(r.x) - 14), y: Math.max(0, Math.round(r.y) - 14),
           width: Math.round(r.width) + 28, height: Math.round(r.height) + 28 };
});
await page.screenshot({ path: `${SCHUSS}/pin-nah.png`, clip: box });

melde(fehler);
await browser.close();
