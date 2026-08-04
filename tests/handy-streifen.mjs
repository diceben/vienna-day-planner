import { chromium, devices, richteEin, melde, ADRESSE, SCHUSS } from "./hilfe.mjs";
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  await richteEin(ctx);
const page = await ctx.newPage();
const fehler = [];
page.on("pageerror", (e) => fehler.push("JS: " + e.message));
await page.goto(ADRESSE, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.tap('[data-kategorie="fruehstueck"]'); await page.waitForTimeout(400);

const deckung = () => page.evaluate(() => {
  const s = getComputedStyle(document.querySelector(".kat-zone"), "::before");
  return { klasse: document.body.classList.contains("gescrollt"), deckkraft: s.opacity };
});
console.log("bei scrollY=0:", JSON.stringify(await deckung()));
await page.screenshot({ path: `${SCHUSS}/streifen-oben.png`, clip: { x: 0, y: 0, width: 390, height: 300 } });

await page.evaluate(() => window.scrollTo(0, 600));
await page.waitForTimeout(500);
const unten = await deckung();
console.log("nach 600px:", JSON.stringify(unten));
if (unten.deckkraft !== "1") fehler.push("Streifen erscheint beim Scrollen nicht");
const oben = await page.evaluate(() => ({ o: getComputedStyle(document.querySelector(".kat-zone"), "::before").opacity }));

await page.screenshot({ path: `${SCHUSS}/streifen-unten.png`, clip: { x: 0, y: 0, width: 390, height: 300 } });

// zurück nach oben -> Streifen muss wieder weg
await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(450);
const zurueck = await deckung();
console.log("zurück oben:", JSON.stringify(zurueck));
if (zurueck.deckkraft !== "0") fehler.push("Streifen verschwindet nicht wieder");

// Positionen bleiben
const fest = await page.evaluate(() => {
  window.scrollTo(0, 900);
  return new Promise(r => setTimeout(() => r({
    kopf: Math.round(document.querySelector(".kopf-rechts").getBoundingClientRect().top),
    chips: Math.round(document.querySelector(".kat-leiste").getBoundingClientRect().top) }), 300));
});
console.log("bei 900px: Suchpille y", fest.kopf, "| Chips y", fest.chips);
melde(fehler);
await browser.close();
