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
  await p.waitForTimeout(800);
  return p;
}

/* Popup auf, Ganztag, alle Kategorien, rechnen. Ganztag verlangt Frühstück
   und Restaurant — beide sind dabei, also fragt nichts nach. */
async function routeOeffnen(p, nur) {
  await p.click("#route-knopf");
  await p.waitForTimeout(300);
  const kats = await p.locator("[data-route-kat]").count();
  for (let i = 0; i < kats; i++) {
    const b = p.locator("[data-route-kat]").nth(i);
    const soll = !nur || nur.indexOf(await b.getAttribute("data-route-kat")) !== -1;
    if (((await b.getAttribute("aria-pressed")) === "true") !== soll) await b.click();
  }
  await p.click('[data-route-fenster="ganztag"]');
  await p.click("#route-berechnen");
  await p.waitForTimeout(300);
}

/* Was im Ergebnis steht: Name, Abschnitt (aus der Überschrift darüber),
   Punkte und der Zustand des Schlosses. */
async function stopps(p) {
  return p.evaluate(() => {
    const raus = [];
    let abschnitt = "";
    document.querySelectorAll("#route-ergebnis .route-liste > li").forEach((li) => {
      if (li.classList.contains("route-abschnitt")) { abschnitt = li.textContent.trim(); return; }
      const kat = li.querySelector(".route-stopp-kat").textContent;
      raus.push({
        name: li.querySelector("b").textContent,
        abschnitt,
        punkte: parseInt(kat.match(/·\s*(\d+)/)[1], 10),
        zu: li.querySelector(".route-schloss").getAttribute("aria-pressed") === "true",
        klasse: li.classList.contains("gesperrt"),
        kategorie: kat.split("·")[0].trim(),
      });
    });
    return raus;
  });
}

const summe = (s) => s.reduce((a, c) => a + c.punkte, 0);

/* ---------- Der Kern: gesperrter Stopp überlebt fünf Würfe ---------- */
const p = await seite();
await routeOeffnen(p);
let liste = await stopps(p);
if (liste.length < 3) fehler.push(`nur ${liste.length} Stopps — zu wenig zum Prüfen`);
console.log(`ERSTER WURF   ${liste.length} Stopps, ${summe(liste)} Punkte`);

const ziel = liste[1];
await p.locator("#route-ergebnis .route-schloss").nth(1).click();
await p.waitForTimeout(150);

const nachKlick = await stopps(p);
const jetztZu = nachKlick.filter((s) => s.zu);
console.log(`SPERREN       „${ziel.name}“ (${ziel.abschnitt}) — ${jetztZu.length} gesperrt`);
if (jetztZu.length !== 1 || jetztZu[0].name !== ziel.name)
  fehler.push(`nach dem Klick sind ${jetztZu.length} Stopps gesperrt: ${jetztZu.map((s) => s.name)}`);
if (!jetztZu.every((s) => s.klasse)) fehler.push("gesperrte Zeile ohne Klasse .gesperrt");
if (await p.locator("#route-ergebnis").isHidden()) fehler.push("Popup schließt beim Klick aufs Schloss");
const summeText = await p.locator(".route-summe").textContent();
if (!/1 gesperrt/.test(summeText)) fehler.push(`Zusammenfassung ohne Sperrzahl: „${summeText}“`);

/* Fünfmal würfeln. Der gesperrte Ort muss jedes Mal dabei sein, im selben
   Abschnitt. Und mindestens ein anderer muss sich ändern — sonst bewiese
   der Test nichts, weil ein kaputtes Sperren genauso „bestanden“ hätte. */
const laeufe = [];
for (let i = 0; i < 5; i++) {
  await p.click('#route-ergebnis [data-tun="wuerfeln"]');
  await p.waitForTimeout(250);
  const l = await stopps(p);
  laeufe.push(l);
  const drin = l.filter((s) => s.name === ziel.name)[0];
  if (!drin) fehler.push(`Wurf ${i + 1}: „${ziel.name}“ fehlt`);
  else if (drin.abschnitt !== ziel.abschnitt)
    fehler.push(`Wurf ${i + 1}: „${ziel.name}“ steht in „${drin.abschnitt}“ statt „${ziel.abschnitt}“`);
  else if (!drin.zu) fehler.push(`Wurf ${i + 1}: „${ziel.name}“ zeigt ein offenes Schloss`);
  if (summe(l) > 8) fehler.push(`Wurf ${i + 1}: ${summe(l)} Punkte, Budget ist 8`);
  /* Zwei Restaurants dürfen nie im selben Abschnitt landen. */
  ["Mittags", "Abends"].forEach((a) => {
    const rs = l.filter((s) => s.kategorie === "Restaurants" && s.abschnitt === a);
    if (rs.length > 1) fehler.push(`Wurf ${i + 1}: ${rs.length} Restaurants in „${a}“`);
  });
  console.log(`  Wurf ${i + 1}       ${l.map((s) => (s.zu ? "*" : "") + s.name).join(", ")} (${summe(l)}P)`);
}
const andere = new Set(laeufe.map((l) => l.filter((s) => s.name !== ziel.name).map((s) => s.name).sort().join("|")));
console.log(`GEGENPROBE    ${andere.size} verschiedene Zusammenstellungen drumherum`);
if (andere.size < 2) fehler.push("die ungesperrten Stopps ändern sich über fünf Würfe nie — der Test prüft nichts");

/* ---------- Alles sperren: der Wurf ändert nichts, der Hinweis steht da ---------- */
const vorAllen = await stopps(p);
const zahl = await p.locator("#route-ergebnis .route-schloss").count();
for (let i = 0; i < zahl; i++) {
  const b = p.locator("#route-ergebnis .route-schloss").nth(i);
  if ((await b.getAttribute("aria-pressed")) !== "true") { await b.click(); await p.waitForTimeout(80); }
}
const hinweis = await p.locator(".route-knapp").textContent().catch(() => "");
console.log(`ALLE ZU       Hinweis: „${(hinweis || "").trim()}“`);
if (!/Alle Stopps sind gesperrt/.test(hinweis || ""))
  fehler.push("bei allen gesperrten Stopps fehlt der Hinweis");
await p.click('#route-ergebnis [data-tun="wuerfeln"]');
await p.waitForTimeout(250);
const nachAllen = await stopps(p);
const gleich = vorAllen.map((s) => s.name).sort().join("|") === nachAllen.map((s) => s.name).sort().join("|");
console.log(`              nach dem Wurf gleich: ${gleich}`);
if (!gleich) fehler.push(`alles gesperrt, trotzdem andere Liste: ${nachAllen.map((s) => s.name)}`);
if (!nachAllen.every((s) => s.zu)) fehler.push("nach dem Wurf ist nicht mehr alles gesperrt");

/* ---------- „Verwerfen“ lässt die Schlösser fallen ---------- */
await p.click('#route-ergebnis [data-tun="zurueck"]');
await p.waitForTimeout(200);
if (await p.locator("#route-eingabe").isHidden()) fehler.push("„Verwerfen“ führt nicht zu den Vorgaben zurück");
await p.click("#route-berechnen");
await p.waitForTimeout(300);
const neu = await stopps(p);
const nochZu = neu.filter((s) => s.zu);
console.log(`VERWERFEN     danach ${nochZu.length} gesperrt (soll 0)`);
if (nochZu.length) fehler.push(`nach „Verwerfen“ sind noch ${nochZu.length} Stopps gesperrt`);
if (/gesperrt/.test(await p.locator(".route-summe").textContent()))
  fehler.push("Zusammenfassung nennt nach „Verwerfen“ noch Sperren");

/* ---------- Aussehen: Kante links, Zeilen bleiben bündig ---------- */
await p.locator("#route-ergebnis .route-schloss").nth(1).click();
await p.waitForTimeout(150);
const optik = await p.evaluate(() => {
  const zeilen = [...document.querySelectorAll(".route-stopp")];
  const zu = zeilen.filter((l) => l.classList.contains("gesperrt"))[0];
  const offen = zeilen.filter((l) => !l.classList.contains("gesperrt"))[0];
  const s = getComputedStyle(zu);
  const nr = (li) => Math.round(li.querySelector(".route-nr").getBoundingClientRect().left);
  const knopf = zu.querySelector(".route-schloss").getBoundingClientRect();
  const box = zu.getBoundingClientRect();
  return {
    kante: s.borderLeftColor, grund: s.backgroundColor,
    nrZu: nr(zu), nrOffen: nr(offen),
    knopfRechts: Math.round(box.right - knopf.right),
    ueberlauf: Math.round(knopf.right - box.right),
  };
});
console.log(`OPTIK         Kante ${optik.kante} | Grund ${optik.grund} | Nummern ${optik.nrOffen}/${optik.nrZu}`);
if (optik.kante === "rgba(0, 0, 0, 0)") fehler.push("gesperrte Zeile ohne Kante");
if (optik.grund === "rgba(0, 0, 0, 0)") fehler.push("gesperrte Zeile ohne Grund");
if (Math.abs(optik.nrZu - optik.nrOffen) > 1)
  fehler.push(`Nummern verrutschen um ${optik.nrZu - optik.nrOffen}px, wenn eine Zeile gesperrt ist`);
if (optik.ueberlauf > 0) fehler.push(`Schloss ragt ${optik.ueberlauf}px über die Zeile hinaus`);

/* ---------- Tastatur: Fokusring und Umschalten mit Enter ----------
   Mit `focus()` allein greift `:focus-visible` nicht — Chromium zeigt den
   Ring nur, wenn die letzte Eingabe von der Tastatur kam. Also wirklich
   tabben, bis ein Schloss dran ist. */
await p.locator("#route-ergebnis .route-summe").evaluate((e) => { e.tabIndex = -1; e.focus(); });
for (let i = 0; i < 12; i++) {
  await p.keyboard.press("Tab");
  if (await p.evaluate(() => document.activeElement.classList.contains("route-schloss"))) break;
}
const ring = await p.evaluate(() => {
  const s = getComputedStyle(document.activeElement);
  return { breite: s.outlineWidth, stil: s.outlineStyle, was: document.activeElement.className };
});
console.log(`TASTATUR      Fokus auf .${ring.was}, Ring ${ring.breite} ${ring.stil}`);
if (ring.was !== "route-schloss") fehler.push("Schloss nimmt keinen Tastaturfokus");
if (ring.stil === "none" || parseFloat(ring.breite) < 1) fehler.push("kein sichtbarer Fokusring am Schloss");
const vorEnter = await p.evaluate(() => document.activeElement.getAttribute("aria-pressed"));
await p.keyboard.press("Enter");
await p.waitForTimeout(150);
const zuNachEnter = (await stopps(p)).filter((s) => s.zu).length;
const soll = vorEnter === "true" ? 0 : 2;
console.log(`              Enter: ${vorEnter} -> ${zuNachEnter} gesperrt`);
if (zuNachEnter !== soll) fehler.push(`nach Enter sind ${zuNachEnter} Stopps gesperrt statt ${soll}`);

/* ---------- Der Sonderfall: ein gesperrtes Restaurant ----------
   Die Verteilung setzt genau ein Restaurant auf „Mittags“. Wird das gesperrte
   in der Sortierung zum zweiten, stünden ohne den Nachlauf zwei am Mittag.
   Also gezielt eines sperren und so lange würfeln, bis ein zweites dazukommt. */
/* Frühstück, Restaurants, Sehenswürdigkeiten: Ein zweites Restaurant lässt
   `hatZwischenstopp()` nur zu, wenn etwas zum Anschauen dazwischen liegt, und
   1 + 2 + 2 + 2 passt genau ins Ganztagsbudget von 8. Über alle Kategorien
   hinweg käme der Fall nur zufällig zustande. */
const r = await seite();
await routeOeffnen(r, ["fruehstueck", "restaurant", "sehenswuerdigkeit"]);
let restZiel = null;
for (let versuch = 0; versuch < 15 && !restZiel; versuch++) {
  const l = await stopps(r);
  const rs = l.filter((s) => s.kategorie === "Restaurants");
  if (rs.length) {
    restZiel = rs[0];
    const i = l.indexOf(restZiel);
    await r.locator("#route-ergebnis .route-schloss").nth(i).click();
    await r.waitForTimeout(120);
  } else {
    await r.click('#route-ergebnis [data-tun="wuerfeln"]');
    await r.waitForTimeout(200);
  }
}
if (!restZiel) fehler.push("in 15 Würfen kein Restaurant in der Route — Sonderfall ungeprüft");
else {
  let zweiGesehen = 0;
  for (let i = 0; i < 8; i++) {
    await r.click('#route-ergebnis [data-tun="wuerfeln"]');
    await r.waitForTimeout(200);
    const l = await stopps(r);
    const rs = l.filter((s) => s.kategorie === "Restaurants");
    const drin = rs.filter((s) => s.name === restZiel.name)[0];
    if (!drin) { fehler.push(`Restaurant-Wurf ${i + 1}: „${restZiel.name}“ fehlt`); continue; }
    if (drin.abschnitt !== restZiel.abschnitt)
      fehler.push(`Restaurant-Wurf ${i + 1}: „${restZiel.name}“ in „${drin.abschnitt}“ statt „${restZiel.abschnitt}“`);
    if (rs.length > 1) {
      zweiGesehen++;
      const abschnitte = new Set(rs.map((s) => s.abschnitt));
      if (abschnitte.size !== rs.length)
        fehler.push(`Restaurant-Wurf ${i + 1}: ${rs.length} Restaurants in ${abschnitte.size} Abschnitt(en) — ${rs.map((s) => s.name + "/" + s.abschnitt).join(", ")}`);
    }
  }
  console.log(`RESTAURANT    „${restZiel.name}“ gesperrt (${restZiel.abschnitt}), in ${zweiGesehen} von 8 Würfen kam ein zweites dazu`);
  if (!zweiGesehen) fehler.push("nie zwei Restaurants gleichzeitig — der Sonderfall blieb ungeprüft");
}

/* ---------- Handy: die Zeile passt in die 380 Pixel ---------- */
const h = await seite({ ...devices["iPhone 13"] });
await h.click("#route-knopf");
await h.waitForTimeout(300);
const katsH = await h.locator("[data-route-kat]").count();
for (let i = 0; i < katsH; i++) {
  const b = h.locator("[data-route-kat]").nth(i);
  if ((await b.getAttribute("aria-pressed")) !== "true") await b.tap();
}
await h.locator('[data-route-fenster="ganztag"]').tap();
await h.locator("#route-berechnen").tap();
await h.waitForTimeout(400);
await h.locator("#route-ergebnis .route-schloss").nth(1).tap();
await h.waitForTimeout(200);
const handy = await h.evaluate(() => {
  const zeile = document.querySelector(".route-stopp.gesperrt");
  const liste = document.querySelector(".route-liste");
  const knopf = zeile.querySelector(".route-schloss").getBoundingClientRect();
  const text = zeile.querySelector(".route-stopp-text").getBoundingClientRect();
  const popup = document.getElementById("route-popup").getBoundingClientRect();
  return {
    popupBreit: Math.round(popup.width),
    ueber: Math.round(knopf.right - liste.getBoundingClientRect().right),
    ueberlappt: Math.round(text.right - knopf.left),
    knopfHoch: Math.round(knopf.height), knopfBreit: Math.round(knopf.width),
    scroll: Math.round(liste.scrollWidth - liste.clientWidth),
  };
});
console.log(`HANDY         Popup ${handy.popupBreit}px | Schloss ${handy.knopfBreit}×${handy.knopfHoch} | Querlauf ${handy.scroll}px`);
if (handy.ueber > 0) fehler.push(`Handy: Schloss ragt ${handy.ueber}px über die Liste`);
if (handy.ueberlappt > 0) fehler.push(`Handy: Text läuft ${handy.ueberlappt}px unter das Schloss`);
if (handy.scroll > 0) fehler.push(`Handy: die Liste scrollt ${handy.scroll}px in die Breite`);

melde(fehler);
await browser.close();
