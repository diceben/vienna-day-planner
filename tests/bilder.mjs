import { chromium, richteEin, melde, ADRESSE, SCHUSS } from "./hilfe.mjs";
const browser = await chromium.launch();
const fehler = [];

async function lauf(name, opt) {
  const ctx = await browser.newContext(opt);
  await richteEin(ctx);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => fehler.push(name + " JS: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") fehler.push(name + " KONSOLE: " + m.text()); });
  const kaputt = [];
  page.on("response", (r) => {
    if (r.url().includes("/bilder/") && r.status() >= 400) kaputt.push(r.status() + " " + decodeURIComponent(r.url().split("/").pop()));
  });
  await page.goto(ADRESSE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const m = await page.evaluate(async () => {
    const bilder = Array.from(document.querySelectorAll("img"));
    await Promise.all(bilder.map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })));
    return {
      bildpins: document.querySelectorAll(".bildpin").length,
      tropfen: document.querySelectorAll(".pin").length,
      geladen: bilder.filter((i) => i.naturalWidth > 0).length,
      leer: bilder.filter((i) => i.naturalWidth === 0).length,
    };
  });
  console.log(`${name}: ${m.bildpins} Bildpins, ${m.tropfen} Tropfen | Bilder geladen ${m.geladen}, leer ${m.leer}`);
  if (m.leer > 0) fehler.push(`${name}: ${m.leer} Bilder laden nicht`);
  if (kaputt.length) fehler.push(`${name}: HTTP-Fehler ${kaputt.join(", ")}`);
  await page.screenshot({ path: `${SCHUSS}/bilder-${name}.png` });
  await ctx.close();
  return m;
}

const d = await lauf("desktop", { viewport: { width: 1280, height: 800 } });
if (d.bildpins !== 47) fehler.push(`47 Bildpins erwartet, ${d.bildpins} gezählt`);
if (d.bildpins + d.tropfen !== 69) fehler.push(`Pins gesamt ${d.bildpins + d.tropfen}, nicht 69`);

/* Mit Filter, damit die Liste mit den neuen Miniaturen sichtbar wird */
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await richteEin(ctx2);
const p2 = await ctx2.newPage();
await p2.goto(ADRESSE, { waitUntil: "networkidle" });
await p2.waitForTimeout(800);
await p2.click('.kat-chip[data-kategorie="fruehstueck"]');
await p2.waitForTimeout(1200);
const liste = await p2.evaluate(async () => {
  const bilder = Array.from(document.querySelectorAll(".eintrag .miniatur img"));
  await Promise.all(bilder.map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })));
  return {
    eintraege: document.querySelectorAll(".eintrag").length,
    mitBild: bilder.length,
    geladen: bilder.filter((i) => i.naturalWidth > 0).length,
  };
});
console.log(`liste  : ${liste.eintraege} Frühstückseinträge, ${liste.mitBild} mit Miniatur, ${liste.geladen} geladen`);
if (liste.mitBild !== liste.geladen) fehler.push("Miniaturen in der Liste laden nicht alle");
await p2.screenshot({ path: `${SCHUSS}/bilder-liste.png` });

/* ---------- Zwei Größen: klein für Pin, Miniatur und Blatt, Original fürs Popup ----------
   Ein Foto bedient vier Anzeigegrößen von 30 bis 282 Pixeln. Lädt überall das
   Original, sind es 2,6 MB beim ersten Aufruf; nimmt das Popup die kleine
   Fassung, sieht man es. */
await p2.locator(".eintrag").first().click();
await p2.waitForTimeout(1500);
const quellen = await p2.evaluate(() => {
  const bilder = [...document.querySelectorAll(".leaflet-marker-icon img, .miniatur img")];
  const quelle = bilder.map((i) => i.getAttribute("src"));
  const popup = document.querySelector(".popup-bild img");
  return {
    gesamt: bilder.length,
    klein: quelle.filter((s) => s && s.startsWith("bilder/klein/")).length,
    gross: quelle.filter((s) => s && s.startsWith("bilder/") && !s.startsWith("bilder/klein/")).length,
    lazy: bilder.filter((i) => i.getAttribute("loading") === "lazy").length,
    popup: popup ? popup.getAttribute("src") : null,
  };
});
console.log(`größen : ${quellen.klein} von ${quellen.gesamt} Pins/Miniaturen aus bilder/klein/, ${quellen.lazy} mit loading=lazy`);
console.log(`         Popup: ${quellen.popup}`);
if (quellen.gross) fehler.push(`${quellen.gross} Pins/Miniaturen laden das Original statt der kleinen Fassung`);
if (quellen.klein !== quellen.gesamt) fehler.push("nicht alle Pins/Miniaturen nehmen bilder/klein/");
if (quellen.lazy !== quellen.gesamt) fehler.push(`${quellen.gesamt - quellen.lazy} Pins/Miniaturen ohne loading=lazy`);
if (!quellen.popup) fehler.push("das Popup zeigt kein Bild");
else if (quellen.popup.startsWith("bilder/klein/"))
  fehler.push("das Popup nimmt die kleine Fassung — bei 282px Breite sichtbar weich");

/* Zu jedem verlinkten Bild muss es die kleine Fassung geben. Fehlt sie, räumt
   `onerror` das Bild weg und der Ort steht ohne da — ohne jede Meldung. */
const fehlend = await p2.evaluate(async () => {
  const pfade = [...new Set(ORTE.map((o) => o.bild).filter((b) => b && b.indexOf("bilder/") === 0))];
  const weg = [];
  for (const pfad of pfade) {
    const a = await fetch("bilder/klein/" + pfad.slice(7), { method: "HEAD" });
    if (!a.ok) weg.push(pfad);
  }
  return { geprueft: pfade.length, weg };
});
console.log(`         ${fehlend.geprueft} verlinkte Bilder geprüft, ${fehlend.weg.length} ohne kleine Fassung`);
if (fehlend.weg.length) fehler.push(`keine kleine Fassung für: ${fehlend.weg.join(", ")}`);

await ctx2.close();

melde(fehler);
await browser.close();
