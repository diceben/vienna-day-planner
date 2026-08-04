import { chromium, richteEin, melde, ADRESSE } from "./hilfe.mjs";
const browser = await chromium.launch();
const fehler = [];

async function seite(opt) {
  const ctx = await browser.newContext(opt);
  await richteEin(ctx);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fehler.push("JS: " + e.message));
  p.on("console", (m) => { if (m.type() === "error") fehler.push("KONSOLE: " + m.text()); });
  await p.goto(ADRESSE, { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);
  return p;
}

/* Leaflets Karteninstanz steckt in einem IIFE und ist von außen nicht zu
   fassen. Also messen wir die Bewegung dort, wo sie sichtbar wird: an der
   Lage der Kartenebene, Bild für Bild. Eine „Fahrt“ ist ein Abschnitt, in dem
   sie sich bewegt; zwei Fahrten sind zwei solche Abschnitte mit einer Pause
   dazwischen — genau der Ruck, um den es geht. */
async function fahrten(p, tun, name, dauer = 2200) {  // gibt {abschnitte, dauerMs}
  await p.evaluate(() => {
    /* Nicht die Kartenebene messen: `flyTo` animiert über eine eigene
       Hilfsebene, das Nachrücken dagegen über die Kartenebene — nur eines von
       beidem wäre sichtbar. Ein Marker macht jede Bewegung mit, egal welchen
       Weg Leaflet nimmt. */
    const pin = document.querySelector(".leaflet-marker-icon");
    window.__spur = [];
    window.__laeuft = true;
    (function bild() {
      if (!window.__laeuft) return;
      const r = pin.getBoundingClientRect();
      window.__spur.push([performance.now(), Math.round(r.left * 10) / 10, Math.round(r.top * 10) / 10]);
      requestAnimationFrame(bild);
    })();
  });
  await tun();
  await p.waitForTimeout(dauer);
  const spur = await p.evaluate(() => { window.__laeuft = false; return window.__spur; });

  /* Abschnitte zählen: Bewegung, dann mindestens 150 ms Stillstand, dann
     wieder Bewegung ergibt zwei Abschnitte. */
  let abschnitte = 0, inBewegung = false, letzteBewegung = 0, weg = 0, ersterStart = 0, letzterPunkt = 0;
  for (let i = 1; i < spur.length; i++) {
    const dx = Math.abs(spur[i][1] - spur[i - 1][1]);
    const dy = Math.abs(spur[i][2] - spur[i - 1][2]);
    const bewegt = dx + dy > 0.5;
    if (bewegt) {
      weg += dx + dy;
      if (!inBewegung) { abschnitte++; inBewegung = true; if (abschnitte === 1) ersterStart = spur[i][0]; }
      letzteBewegung = spur[i][0];
      letzterPunkt = spur[i][0];
    } else if (inBewegung && spur[i][0] - letzteBewegung > 150) {
      inBewegung = false;
    }
  }
  const dauerMs = abschnitte ? Math.round(letzterPunkt - ersterStart) : 0;
  console.log(`${name}: ${abschnitte} Fahrt(en), ${Math.round(weg)} px Weg in ${dauerMs} ms`);
  return { abschnitte, dauerMs };
}

/* ---------- Desktop ---------- */
const p = await seite({ viewport: { width: 1280, height: 800 } });
await p.click('.kat-chip[data-kategorie="fruehstueck"]');
await p.waitForTimeout(1000);

const a = await fahrten(p, async () => { await p.click(".eintrag:nth-child(3)"); }, "LISTE ");
if (a.abschnitte !== 1) fehler.push(`Klick in der Liste: ${a.abschnitte} Fahrten statt einer`);
/* Der Flug dauert 600 ms. Kam danach noch ein Nachschub, zieht sich die
   Bewegung auf über 900 — so sah es vorher aus, und genau das soll weg.
   Die Pause dazwischen war zu kurz, um sie als zweiten Abschnitt zu zählen;
   die Gesamtdauer verrät sie zuverlässiger. */
if (a.dauerMs > 750) fehler.push(`die Bewegung zieht sich über ${a.dauerMs} ms — da schiebt etwas nach`);

const lage = await p.evaluate(() => {
  const pop = document.querySelector(".leaflet-popup");
  const karte = document.getElementById("karte").getBoundingClientRect();
  const gross = document.querySelector(".leaflet-marker-icon .gross");
  const pin = gross ? gross.closest(".leaflet-marker-icon") : null;
  if (!pop) return null;
  const r = pop.getBoundingClientRect();
  const pr = pin ? pin.getBoundingClientRect() : null;
  return { oben: Math.round(r.top - karte.top), unten: Math.round(r.bottom - karte.top),
           links: Math.round(r.left), rechts: Math.round(r.right),
           karteHoch: Math.round(karte.height),
           pinX: pr ? Math.round(pr.left + pr.width / 2) : null,
           pinY: pr ? Math.round(pr.bottom - karte.top) : null };
});
if (!lage) { fehler.push("kein Popup offen"); }
else {
  console.log(`       Popup y ${lage.oben}–${lage.unten} von ${lage.karteHoch} | x ${lage.links}–${lage.rechts} | Pin ${lage.pinX}/${lage.pinY}`);
  if (lage.oben < 60) fehler.push(`Popup beginnt bei y=${lage.oben}, unter der Chipreihe`);
  if (lage.unten > lage.karteHoch) fehler.push(`Popup endet bei ${lage.unten}, Karte ist ${lage.karteHoch} hoch`);
  if (lage.links < 410) fehler.push(`Popup ragt bis x=${lage.links} hinter die Ergebnisspalte`);
  if (lage.pinX !== null && lage.pinX < 410) fehler.push(`Pin bei x=${lage.pinX} hinter der Spalte`);
}

const b = await fahrten(p, async () => {
  await p.locator(".leaflet-marker-icon").nth(1).dispatchEvent("click");
}, "PIN   ");
if (b.abschnitte > 1) fehler.push(`Klick auf einen Pin: ${b.abschnitte} Fahrten`);

/* ---------- Reduzierte Bewegung: gar keine Fahrt, die Karte steht sofort ---------- */
const pr2 = await seite({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
await pr2.click('.kat-chip[data-kategorie="fruehstueck"]');
await pr2.waitForTimeout(1000);
const c = await fahrten(pr2, async () => { await pr2.click(".eintrag:nth-child(3)"); }, "RUHIG ", 1500);
if (c.abschnitte > 1) fehler.push(`bei reduzierter Bewegung: ${c.abschnitte} Fahrten`);
if (c.dauerMs > 120) fehler.push(`bei reduzierter Bewegung dauert die Bewegung ${c.dauerMs} ms — sie soll springen`);

melde(fehler);
await browser.close();
