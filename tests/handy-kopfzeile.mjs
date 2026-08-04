import { chromium, richteEin, melde, ADRESSE, SCHUSS } from "./hilfe.mjs";
const browser = await chromium.launch();
const fehler = [];
for (const [w, h, name] of [[390, 844, "iphone"], [420, 800, "breit"], [360, 740, "schmal"]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
  await richteEin(ctx);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => fehler.push(name + " JS: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") fehler.push(name + " KONSOLE: " + m.text()); });
  await page.goto(ADRESSE, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const m = await page.evaluate(() => {
    const q = (s) => { const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) }; };
    const leiste = document.querySelector(".kat-leiste");
    return {
      pille: q(".kopf-rechts"), leiste: q(".kat-leiste"), karte: q("#karte"),
      titelSichtbar: !!document.querySelector(".marke"),
      zoomSichtbar: !!document.querySelector(".leaflet-control-zoom") &&
        getComputedStyle(document.querySelector(".leaflet-control-zoom")).display !== "none",
      standort: q(".standort-steuerung"),
      scrollt: leiste.scrollWidth > leiste.clientWidth,
      scrollBreite: Math.round(leiste.scrollWidth), sichtBreite: Math.round(leiste.clientWidth),
      zaehlerWeg: !document.querySelector(".zaehler-chip"),
      chipNamen: [...document.querySelectorAll(".kat-chip .name")].slice(0, 3)
        .map(e => e.textContent + "=" + Math.round(e.getBoundingClientRect().width) + "px"),
      seitlich: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  console.log(`\n${name} ${w}x${h}`);
  console.log(`  Suchpille  x ${m.pille.l}–${m.pille.r}, y ${m.pille.t}–${m.pille.b}`);
  console.log(`  Chipreihe  y ${m.leiste.t}–${m.leiste.b}, ${m.scrollBreite}px Inhalt in ${m.sichtBreite}px ${m.scrollt ? "(scrollt)" : "(passt)"}`);
  console.log(`  Zähler-Chip weg: ${m.zaehlerWeg} | Namen: ${m.chipNamen.join(", ")}`);
  if (!m.zaehlerWeg) fehler.push(name + ": der Zähler-Chip steht noch in der Reihe");
  console.log(`  Titel aus: ${!m.titelSichtbar} | Zoom aus: ${!m.zoomSichtbar} | Standort y ${m.standort ? m.standort.t : "?"}`);
  if (m.titelSichtbar) fehler.push(name + ": Titel noch sichtbar");
  if (m.zoomSichtbar) fehler.push(name + ": Zoomknöpfe noch da");
  if (m.seitlich) fehler.push(name + ": seitlicher Überlauf");
  if (m.pille.b > m.leiste.t) fehler.push(name + ": Suchpille überlappt die Chipreihe");
  if (!m.chipNamen[0] || m.chipNamen[0].endsWith("=0px")) fehler.push(name + ": Chipnamen unsichtbar");

  // Kategorie tippen -> die Reihe bleibt, die Marken stehen in den Einträgen
  await page.tap('[data-kategorie="fruehstueck"]'); await page.waitForTimeout(450);
  const mk = await page.evaluate(() => {
    const l = document.querySelector(".kat-leiste").getBoundingClientRect();
    const erste = document.querySelector(".eintrag");
    const marken = Array.from(erste.querySelectorAll(".merkmal-marke")).map((e) => e.textContent);
    const kinder = Array.from(erste.querySelector(".eintrag-text").children).map((c) => c.className);
    return { reiheDa: l.width > 0, gedrueckt: document.querySelectorAll('.kat-chip[aria-pressed="true"]').length,
             marken: marken, reihenfolge: kinder,
             filterreihe: !!document.getElementById("merkmale") };
  });
  console.log(`  Kategorienreihe bleibt=${mk.reiheDa}, ${mk.gedrueckt} gewählt | Marken im ersten Eintrag: „${mk.marken.join(", ")}“`);
  if (!mk.reiheDa) fehler.push(name + ": Kategorienreihe verschwindet");
  if (mk.gedrueckt !== 1) fehler.push(name + ": Kategorie nicht als gewählt markiert");
  if (mk.filterreihe) fehler.push(name + ": die Merkmal-Filterreihe ist noch da");
  if (!mk.marken.length) fehler.push(name + ": keine Marken im Eintrag");
  const ia = mk.reihenfolge.indexOf("adresse"), im = mk.reihenfolge.indexOf("merkmal-marken"), it = mk.reihenfolge.indexOf("text");
  if (!(ia < im && im < it)) fehler.push(name + ": Marken sitzen falsch — " + mk.reihenfolge.join(", "));
  await page.screenshot({ path: `${SCHUSS}/handy-${name}.png`, clip: { x: 0, y: 0, width: w, height: Math.min(360, h) } });
  await ctx.close();
}
melde(fehler);
await browser.close();
