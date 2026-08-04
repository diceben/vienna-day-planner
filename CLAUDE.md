# Vienna Day Planner

Interaktive Wien-Karte, die aus Kategorien und Zeitbudget eine Tagestour
vorschlägt. Live auf https://diceben.github.io/vienna-day-planner/

**Die Oberfläche ist auf Deutsch.** Bleibt so — Wien-Karte für Wien-Besucher.
Nur README-Randnotizen und die Lizenz sind englisch.

## Aufbau

```
index.html         Seitengerüst
daten.js           alle Orte — die einzige Datei mit Inhalten
assets/app.js      Karte, Filter, Routenvorschlag, Bearbeiten-Modus
assets/style.css   Gestaltung
assets/leaflet/    Leaflet 1.9.4, unverändert übernommen — nicht bearbeiten
bilder/            Miniaturbilder + BILDNACHWEIS.md (Pflicht, siehe unten)
tests/             16 Playwright-Läufe, ~2 Minuten
```

## Nach jeder Änderung: `npm test`

Sechzehn Läufe, rund zwei Minuten. Beim ersten Mal `npm install` und
`npx playwright install chromium`.

```bash
npm test                  # alles
npm test -- pins route    # nur passende Läufe
```

**Der Deploy hängt daran.** `.github/workflows/deploy.yml` testet erst und
veröffentlicht nur bei Grün. Ist ein Lauf rot, bleibt die zuletzt erfolgreiche
Fassung stehen — der Fehlerfall ist „veraltet", nicht „kaputt". Vorher lieferte
Pages den Branch aus, jeder Push war ungeprüft eine Minute später live.

Die Läufe messen echte Geometrie: Pixelmaße, Farben, Bewegungsdauern. Das
heißt, eine **gewollte** Gestaltungsänderung macht sie zu Recht rot — dann
gehört der Lauf mitgezogen, nicht die Änderung zurückgenommen. Andersherum
gilt: Wer eine Zusicherung streicht, weil sie stört, nimmt das Netz weg. Im
Zweifel Ben fragen.

Ein neuer Lauf sollte einmal **gegengeprobt** werden: die Änderung ausbauen,
schauen ob er anschlägt, wieder einbauen. Ein Test, der das nicht tut, prüft
nichts.

**Kein Build, kein Paketmanager für die Seite selbst.** Playwright ist die
einzige Abhängigkeit und wird nie ausgeliefert — was im Browser landet, ist
weiterhin abhängigkeitsfrei. Leaflet liegt seit August 2026 in
`assets/leaflet/` statt auf einem CDN — sonst wäre die Seite eine leere Fläche,
wenn unpkg nicht erreichbar ist. Damit gehen **keine Anfragen mehr an fremde
Rechner außer den Kartenkacheln**; das bitte so lassen und keine Schrift, kein
Skript und keine Zählpixel von außen einbauen.

Ansehen: `python3 -m http.server 8765`, dann http://127.0.0.1:8765 — nicht per
Doppelklick, sonst funktioniert die Standortabfrage nicht (`file://` ist kein
sicherer Kontext).

## Der Kuratierungsmaßstab — wichtiger als alles andere hier

Ben hat im August 2026 zwanzig Orte bewusst gelöscht, darunter Café Landtmann,
Griechenbeisl, Naschmarkt und Vollpension. Begründung: **„Die Leute wollen keine
0815-Karte, sondern wirklich coole oder schöne Orte."** Landtmann etwa flog raus,
weil überteuert und beliebig.

Daraus folgt für jede Ergänzung: Ein Ort kommt nicht auf die Karte, weil er
bekannt ist oder gut bewertet, sondern weil er etwas taugt. Bekanntheit ist eher
ein Gegenargument. Im Zweifel Ben fragen, nicht hilfsbereit auffüllen.

Die früher dokumentierte Regel „Google-Bewertung ab 4,4 Sternen" beschreibt nur,
wie der erste Bestand entstanden ist. Sie ist kein Aufnahmekriterium.

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
- **Zu jedem Foto gehört eine kleine Fassung in `bilder/klein/`** (180 px kurze
  Seite). Pin, Miniatur und Ortsblatt nehmen sie, nur das Popup das Original —
  das spart 77 % beim ersten Laden. Fehlt sie, verschwindet das Bild still.
  Der Befehl zum Erzeugen steht in der README; `tests/bilder.mjs` prüft es.
- **Die `labels`-Werte sind gelöscht**, samt der Filtergruppe „Eigenschaften"
  im Zahnrad-Popover. Sie waren zum Testen gestreut, nicht recherchiert, und
  eine falsche Angabe bei „Barrierefrei" schickt jemanden im Rollstuhl vor eine
  Treppe. Das Feld steht leer bei jedem Ort; was von Hand hineingeschrieben
  wird, reicht der Bearbeiten-Modus beim Speichern durch. **Nichts dort
  eintragen, was nicht geprüft ist.** Kommen geprüfte Werte, gehört die
  Filtergruppe wieder dazu — sonst liegen die Daten brach. Was dafür nötig ist,
  steht im Kommentar an der Stelle von `LABELS` in `assets/app.js`.
- **Öffnungszeiten kennt die Karte nicht.** Die Tageszeit im Routenvorschlag ist
  aus der Kategorie geschätzt.
- **Die Zoomknöpfe auf dem Handy nicht wieder ausblenden.** Sie waren einmal
  weg, weil man ja mit zwei Fingern zoomt. Hinein kommt man damit auch mit
  einem (Doppeltipp), hinaus aber nur mit zweien — das ist WCAG 2.5.1,
  Stufe A, und wer versehentlich doppeltippt, sitzt fest. `erreichbarkeit.mjs`
  hält das fest.
- **Die 36 × 46 px großen Pins nicht verkleinern und ihre Trefferfläche nicht
  beschneiden.** Google beanstandet 30 Pins wegen Überlappung; die Ecken des
  Kastens fangen aber Klicks *für den eigenen Pin* mit. Nachgemessen macht das
  Beschneiden es schlechter. Näheres in der README unter „Berührungsziele".

## Portfolio

Das Topic `portfolio` auf diesem Repo sorgt dafür, dass das Projekt auf
https://diceben.github.io/ gelistet wird und der dortige Sync Beschreibung,
Tags und Datum automatisch aktuell hält. Topic nicht entfernen, sonst
verschwindet der Eintrag von der Seite.
