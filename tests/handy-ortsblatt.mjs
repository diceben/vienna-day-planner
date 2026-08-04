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
  const b = document.getElementById("ort-blatt");
  const r = b.getBoundingClientRect();
  const liste = document.querySelector(".liste-spalte");
  const karte = document.getElementById("karte").getBoundingClientRect();
  return {
    blattOffen: !b.hidden && b.classList.contains("offen"),
    blattOben: Math.round(r.top), blattHoch: Math.round(r.height),
    anteil: Math.round((r.height / innerHeight) * 100),
    listeSichtbar: getComputedStyle(liste).display !== "none",
    karteHoch: Math.round(karte.height), fensterHoch: innerHeight,
    scrollbar: document.documentElement.scrollHeight > innerHeight + 2,
  };
});
console.log("vorher: ", JSON.stringify(await stand()));

/* Mit Filter, denn nur dann gibt es überhaupt eine Liste, die weichen kann. */
await page.locator('.kat-chip[data-kategorie="fruehstueck"]').tap();
await page.waitForTimeout(600);
const mitFilter = await stand();
console.log(`gefiltert: Liste sichtbar=${mitFilter.listeSichtbar} | Karte ${mitFilter.karteHoch}px`);
if (!mitFilter.listeSichtbar) fehler.push("mit Filter erscheint keine Liste");

await (await page.$(".leaflet-marker-icon")).tap();
await page.waitForTimeout(800);
const auf = await stand();
console.log(`offen:   Blatt y ab ${auf.blattOben}, ${auf.blattHoch}px = ${auf.anteil}% des Schirms`);
console.log(`         Liste sichtbar=${auf.listeSichtbar} | Karte ${auf.karteHoch}px von ${auf.fensterHoch}px | Seite scrollbar=${auf.scrollbar}`);
if (auf.listeSichtbar) fehler.push("Liste verschwindet nicht");
if (auf.karteHoch < auf.fensterHoch - 8) fehler.push("Karte füllt den Schirm nicht");
if (auf.anteil > 50 || auf.anteil < 20) fehler.push("Blatt nicht im unteren Drittel (" + auf.anteil + "%)");
if (auf.scrollbar) fehler.push("Seite ist weiterhin scrollbar");

// Pin muss über dem Blatt liegen
const pin = await page.evaluate(() => {
  const m = document.querySelector(".leaflet-marker-icon.aktiv") ||
            document.querySelector(".leaflet-marker-icon");
  const r = m.getBoundingClientRect();
  const b = document.getElementById("ort-blatt").getBoundingClientRect();
  return { unten: Math.round(r.bottom), blattOben: Math.round(b.top) };
});
console.log(`         gewählter Pin endet bei ${pin.unten}, Blatt beginnt bei ${pin.blattOben} → ${pin.unten <= pin.blattOben ? "sichtbar" : ">>> VERDECKT <<<"}`);
await page.screenshot({ path: `${SCHUSS}/blatt-offen.png` });

await page.tap("#ort-blatt [data-tun='schliessen']");
await page.waitForTimeout(800);
const zu = await stand();
console.log(`nach ✕:  Blatt offen=${zu.blattOffen} | Liste sichtbar=${zu.listeSichtbar} | Karte ${zu.karteHoch}px | Seite scrollbar=${zu.scrollbar}`);
if (!zu.listeSichtbar) fehler.push("Liste kommt nach ✕ nicht zurück");
if (!zu.scrollbar) fehler.push("Seite scrollt nach ✕ nicht wieder");
if (zu.blattOffen) fehler.push("Blatt bleibt offen");
if (zu.karteHoch >= zu.fensterHoch - 8) fehler.push("Karte bleibt bildschirmfüllend");
await page.screenshot({ path: `${SCHUSS}/blatt-zu.png` });
melde(fehler);
await browser.close();
