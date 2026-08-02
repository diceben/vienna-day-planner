# Vienna Day Planner

Interaktive Wien-Karte, die aus Kategorien und Zeitbudget eine Tagestour
vorschlägt. Live auf https://diceben.github.io/vienna-day-planner/

**Die Oberfläche ist auf Deutsch.** Bleibt so — Wien-Karte für Wien-Besucher.
Nur README-Randnotizen und die Lizenz sind englisch.

## Aufbau

```
index.html        Seitengerüst
daten.js          alle Orte — die einzige Datei mit Inhalten
assets/app.js     Karte, Filter, Routenvorschlag, Bearbeiten-Modus
assets/style.css  Gestaltung
bilder/           Miniaturbilder + BILDNACHWEIS.md (Pflicht, siehe unten)
```

**Kein Build, keine Abhängigkeiten im Repo.** Leaflet kommt zur Laufzeit vom
CDN. Ansehen: `python3 -m http.server 8765`, dann http://127.0.0.1:8765 —
nicht per Doppelklick, sonst funktioniert die Standortabfrage nicht (`file://`
ist kein sicherer Kontext).

## Orte ergänzen

Zwei Wege, gleiches Ergebnis: der Bearbeiten-Modus auf der Seite (unten rechts
oder `#bearbeiten`) mit anschließendem Export von `daten.js`, oder direkt in
`daten.js`. Alles Weitere steht ausführlich in der README.

## Worauf zu achten ist

- **Speicherschlüssel nicht umbenennen.** `wien-karte-orte` und
  `wien-karte-plan` in `assets/app.js` heißen historisch so. Wer sie ändert,
  löscht bei allen Nutzern den gespeicherten Tagesplan.
- **`bilder/BILDNACHWEIS.md` gehört mitveröffentlicht.** Die Fotos stammen von
  Wikimedia Commons und verlangen Namensnennung.
- **Die `labels`-Werte sind erfunden** (Barrierefrei, Vegan, Reizarm …). Sie
  wurden zum Testen des Filters gestreut. Vor einer echten Empfehlung prüfen
  oder löschen — eine falsche Angabe bei „Barrierefrei" schickt jemanden im
  Rollstuhl vor eine Treppe.
- **Öffnungszeiten kennt die Karte nicht.** Die Tageszeit im Routenvorschlag ist
  aus der Kategorie geschätzt.

## Portfolio

Das Topic `portfolio` auf diesem Repo sorgt dafür, dass das Projekt auf
https://diceben.github.io/ gelistet wird und der dortige Sync Beschreibung,
Tags und Datum automatisch aktuell hält. Topic nicht entfernen, sonst
verschwindet der Eintrag von der Seite.
