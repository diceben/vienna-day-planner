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
await ctx2.close();

melde(fehler);
await browser.close();
