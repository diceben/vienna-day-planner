/* Gemeinsamer Unterbau der Testläufe.

   Jeder Lauf ist ein eigenständiges Node-Skript: `node tests/pins.mjs` tut es
   auch allein, wenn nebenher ein Server läuft. `tests/lauf.mjs` ruft sie alle
   nacheinander und startet den Server selbst.

   Zwei Dinge, die überall gleich sind, stehen deshalb hier: woher die Seite
   kommt und wie die Kartenkacheln ersetzt werden. */

import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const HIER = dirname(fileURLToPath(import.meta.url));

/* Die Läufe legen unterwegs Bildschirmfotos ab. Sie sind nicht Teil der
   Prüfung — sie helfen, wenn ein Lauf rot ist und man sehen will, was die
   Seite in dem Moment gezeigt hat. Deshalb gitignored, und in Actions als
   Artefakt eingesammelt. */
export const SCHUSS = join(HIER, "schuss");
mkdirSync(SCHUSS, { recursive: true });

/* Den Port setzt `lauf.mjs`, weil es sich einen freien sucht. Wer einen Lauf
   von Hand startet, bekommt den Vorgabewert und muss den Server selbst
   danebenstellen: python3 -m http.server 8766 */
export const ADRESSE = process.env.KARTE_ADRESSE || "http://127.0.0.1:8766/";

/* Playwright liegt bei uns nicht im Projekt, sondern global im Container
   dieser Sitzung; in GitHub Actions installiert es `npm ci`. Beides findet
   der Import über den Paketnamen — deshalb kein fester Pfad. */
export { chromium, devices } from "playwright";

/* Eine einfarbige Kachel statt der echten von CARTO. Das hält die Läufe
   offline, schnell und über die Zeit gleich — eine echte Kachel sähe nächstes
   Jahr anders aus und brächte den Vergleich durcheinander. Leaflet selbst
   kommt aus dem Projekt und wird ausdrücklich NICHT ersetzt: Die Läufe sollen
   die Seite prüfen, die auch ausgeliefert wird. */
const KACHEL = readFileSync(join(HIER, "kachel.png"));

/* Ruft jeder Lauf für jeden Browser-Kontext auf, den er aufmacht. */
export async function richteEin(ctx) {
  await ctx.route("**cartocdn.com/**", (r) =>
    r.fulfill({ status: 200, contentType: "image/png", body: KACHEL }));

  /* Playwright wartet von Haus aus 30 Sekunden auf ein Element. Hier steht
     eine Seite vom eigenen Rechner: Was nach 8 Sekunden nicht da ist, kommt
     nicht mehr. Ohne diese Kürzung braucht ein kaputter Stand 465 statt 127
     Sekunden — nachgemessen —, und genau dann will man schnell wissen, was
     los ist. */
  ctx.setDefaultTimeout(8000);
}

/* Am Ende jedes Laufs. Der Exit-Code entscheidet, ob `lauf.mjs` und damit der
   Deploy weitergehen. */
export function melde(fehler) {
  if (fehler.length) {
    console.log("\nPROBLEME:\n- " + fehler.join("\n- "));
    process.exitCode = 1;
  } else {
    console.log("\nkeine Probleme");
  }
}
