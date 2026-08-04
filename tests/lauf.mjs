/* Startet einen Webserver für das Projektverzeichnis, ruft alle Läufe
   nacheinander und endet mit Exit-Code 1, sobald einer meckert.

       npm test                  alles
       npm test -- pins route    nur Läufe, deren Name das enthält

   Nacheinander und nicht gleichzeitig: Die Läufe messen Geometrie, und ein
   Rechner, der vier Browser gleichzeitig bedient, liefert bei Animationen
   andere Zahlen. Die ganze Reihe dauert rund zwei Minuten — das ist die
   Wartezeit wert. */

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { HIER } from "./hilfe.mjs";

const WURZEL = join(HIER, "..");

const TYPEN = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};

/* Kein Verzeichnis-Listing, kein Ausbruch nach oben — der Server steht nur
   für die Läufe, aber ein `../../etc/passwd` soll er trotzdem nicht liefern. */
function server() {
  return createServer(async (anfrage, antwort) => {
    let pfad = decodeURIComponent(new URL(anfrage.url, "http://x").pathname);
    if (pfad.endsWith("/")) { pfad += "index.html"; }
    const datei = join(WURZEL, normalize(pfad).replace(/^(\.\.[/\\])+/, ""));
    if (!datei.startsWith(WURZEL)) { antwort.writeHead(403).end(); return; }
    try {
      const inhalt = await readFile(datei);
      antwort.writeHead(200, { "Content-Type": TYPEN[extname(datei)] || "application/octet-stream" });
      antwort.end(inhalt);
    } catch {
      antwort.writeHead(404).end("nicht da: " + pfad);
    }
  });
}

/* Port 0 heißt: Das Betriebssystem sucht einen freien. So stolpert der Lauf
   nicht über einen Server, der noch von einem früheren Versuch läuft. */
function starte() {
  return new Promise((fertig) => {
    const s = server();
    s.listen(0, "127.0.0.1", () => fertig({ s, port: s.address().port }));
  });
}

function rufe(datei, adresse) {
  return new Promise((fertig) => {
    const kind = spawn(process.execPath, [join(HIER, datei)], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, KARTE_ADRESSE: adresse },
    });
    let ausgabe = "";
    kind.stdout.on("data", (d) => { ausgabe += d; });
    kind.stderr.on("data", (d) => { ausgabe += d; });
    kind.on("close", (code) => fertig({ code, ausgabe }));
  });
}

const filter = process.argv.slice(2);
const alle = (await readdir(HIER))
  .filter((f) => f.endsWith(".mjs") && f !== "hilfe.mjs" && f !== "lauf.mjs")
  .sort();
const laeufe = filter.length
  ? alle.filter((f) => filter.some((w) => f.includes(w)))
  : alle;

if (!laeufe.length) {
  console.error(`Kein Lauf passt zu ${filter.join(", ")}.\nVorhanden:\n  ` + alle.join("\n  "));
  process.exit(2);
}

const { s, port } = await starte();
const adresse = `http://127.0.0.1:${port}/`;
console.log(`${laeufe.length} Läufe gegen ${adresse}\n`);

const begonnen = Date.now();
const rot = [];

for (const datei of laeufe) {
  const start = Date.now();
  const { code, ausgabe } = await rufe(datei, adresse);
  const sek = ((Date.now() - start) / 1000).toFixed(0);
  const name = datei.replace(/\.mjs$/, "");
  if (code === 0) {
    console.log(`  ok    ${name.padEnd(30)} ${sek}s`);
  } else {
    rot.push(name);
    console.log(`  ROT   ${name.padEnd(30)} ${sek}s`);
    /* Bei Rot die ganze Ausgabe zeigen — sonst müsste man den Lauf von Hand
       nachstellen, um zu erfahren, was schiefging. */
    console.log(ausgabe.split("\n").map((z) => "        " + z).join("\n"));
  }
}

s.close();
const dauer = ((Date.now() - begonnen) / 1000).toFixed(0);
console.log(
  rot.length
    ? `\n${rot.length} von ${laeufe.length} rot nach ${dauer}s: ${rot.join(", ")}`
    : `\nalle ${laeufe.length} grün nach ${dauer}s`
);
process.exit(rot.length ? 1 : 0);
