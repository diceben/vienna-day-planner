# Wien entdecken — interaktive Karte

Statische Website mit 69 handverlesenen Orten in Wien. Läuft ohne Server-Software, ohne Build-Schritt und ohne Abhängigkeit von Claude.

Die Auswahl ist bewusst kuratiert: keine austauschbaren Touristenadressen, sondern Orte, die etwas taugen. Wer etwas ergänzt, hält diesen Maßstab.

## Kategorien

| Schlüssel | Anzeige | Inhalt |
|---|---|---|
| `fruehstueck` | Frühstückscafés | Kaffeehäuser und Lokale, in denen man frühstückt |
| `cafe` | Cafés | Kaffee und höchstens ein Stück Kuchen — kein Essengehen |
| `restaurant` | Restaurants | Wirtshaus, Würstelstand, Heuriger, dazu Küchen von italienisch bis indisch und ein Haubenlokal |
| `bar` | Bars | Lokale für den Abend, Getränke im Vordergrund |
| `sehenswuerdigkeit` | Sehenswürdigkeiten | Bauten und Orte wie Stephansdom, Theseustempel, Zentralfriedhof |
| `museum` | Museen & Ausstellungen | Häuser mit Sammlung oder Ausstellungsbetrieb |
| `musik` | Musik | Konzerthaus, Jazzclub, Musikbar, Konzertsaal |
| `event` | Events | Oper, Musical, Theater, Kabarett |
| `aktivitaet` | Aktivitäten | Escape Room, Bogenschießen, Kart, Wasserski und Ähnliches |

Farbe und Symbol jeder Kategorie stehen in `assets/app.js` ganz oben unter `KATEGORIEN`, die passenden Farbvariablen in `assets/style.css`. Wer eine Kategorie umbenennt, ändert nur den `titel` dort; der Schlüssel in `daten.js` bleibt, wie er ist.

### Orte in mehreren Kategorien

Manches passt in zwei Schubladen. Das Feld `kategorie` bestimmt Farbe und Symbol des Pins, das Feld `weitere` nimmt zusätzliche Kategorien auf. Ein Ort erscheint dann unter jedem dieser Filter. Im Formular sitzt dafür unter der Kategorieauswahl die Zeile „Zusätzlich in“. Beispiele im Bestand sind das Cafe Merkur, in dem man frühstückt und zu Abend isst, und das Riesenrad als Aktivität wie als Sehenswürdigkeit.

## Aufbau

```
index.html        Seitengerüst
daten.js          alle Orte, die einzige Datei mit Inhalten
assets/style.css  Gestaltung
assets/app.js     Karte, Filter, Bearbeiten-Modus
bilder/           Miniaturbilder der Orte, siehe bilder/LIESMICH.md
```

## Ortsübersicht

Die Liste ist 410 Pixel breit und zeigt pro Ort rund 108 Pixel: das Bild links, daneben der Name mit den Aktionen auf gleicher Höhe, darunter die Adresse und eine auf zwei Zeilen geklemmte Beschreibung. Damit sind etwa sieben Orte gleichzeitig sichtbar.

Die Aktionen sind zwei knappe Icons für Website und Route, dazu der Knopf „+ Zum Tag“ — bewusst mit Text, weil er die eigentliche Handlung ist. Liegt der Ort im Plan, steht dort „✓ Im Tag“ in der Kategoriefarbe.

Namen, die nicht in eine Zeile passen, brechen auf eine zweite um statt abgeschnitten zu werden; das betrifft rund ein Sechstel der Orte. Ein Klick auf den Eintrag wählt den Ort, zeigt ihn auf der Karte und klappt eine längere Beschreibung ganz auf. Ein weiterer Klick hebt die Auswahl wieder auf. Die Aktionen funktionieren ohne vorheriges Anklicken.

## Miniaturbilder

Jeder Ort kann ein Bild tragen, eingetragen im Feld `bild` als Pfad wie `bilder/wiener-riesenrad.jpg` oder als vollständige URL. Gezeigt wird es an drei Stellen: als runder Punkt auf der Karte, als Quadrat links in der Liste und als Streifen oben im Popup.

Ohne Bild bleibt es beim farbigen Tropfen mit dem Symbol der Kategorie. Dasselbe passiert, wenn der Pfad ins Leere zeigt — die Seite fällt still auf das Symbol zurück, statt ein kaputtes Bild anzuzeigen. Details in [bilder/LIESMICH.md](bilder/LIESMICH.md).

28 der 69 Orte haben derzeit ein Foto, alle von Wikimedia Commons unter freier Lizenz. Urheber und Lizenz stehen je Bild in [bilder/BILDNACHWEIS.md](bilder/BILDNACHWEIS.md). Diese Datei gehört mit veröffentlicht, weil die Lizenzen eine Nennung verlangen. Für Cafés, Clubs und die meisten Aktivitäten gibt es auf Commons nichts Brauchbares, dort hilft nur ein eigenes Foto.

Die Karte läuft mit [Leaflet](https://leafletjs.com) und Kacheln von CARTO auf OpenStreetMap-Basis. Beides wird zur Laufzeit von einem CDN geladen, die Seite braucht daher eine Internetverbindung.

## Lokal ansehen

`index.html` doppelklicken reicht. Wenn der Browser dabei zickt, tut es ein lokaler Server:

```bash
cd vienna-day-planner && python3 -m http.server 8765
```

Danach im Browser `http://127.0.0.1:8765` öffnen.

## Tagesplan

Unten rechts auf der Karte schwebt der Knopf „Mein Tag“ mit einem Zähler. Ein Klick öffnet ein halbtransparentes Overlay in der Kartenecke, durch das die Karte leicht durchscheint.

In der Liste sitzt der Knopf als farbiges Dreieck in der rechten oberen Ecke jedes Eintrags: ein Plus in der Kategoriefarbe, im Plan wechselt es auf Dunkel und zeigt einen Haken. Im Karten-Popup steht stattdessen der beschriftete Knopf „+ Zum Tag“.

Das Overlay gliedert den Tag in **Vormittags, Mittags, Nachmittags und Abends**. Alle vier Überschriften bleiben stehen, auch wenn nichts darunter liegt — der Tag ist ein Gerüst, in das man einsortiert. Ein Eintrag lässt sich auf eine Überschrift ziehen und landet dann in diesem Abschnitt, auch entgegen der üblichen Zuordnung.

Ohne eigenes Zutun leitet sich der Abschnitt aus Kategorie und Reihenfolge ab: Frühstück am Vormittag, das erste Restaurant zu Mittag, ein zweites am Abend, Konzerte abends. Was zwischen Mittagessen und Abend liegt, zählt als Nachmittag. Die Liste lässt sich weiterhin frei per Ziehen umordnen. Auf der Karte tragen die geplanten Pins dieselbe Nummer und sind durch eine gestrichelte Linie in der Reihenfolge des Plans verbunden. Sobald etwas im Plan liegt, treten alle übrigen Pins zurück — blass und entfärbt, damit der eigene Tag hervorsticht. Fährt man mit der Maus über einen davon, kommt er kurz zurück und legt sich nach vorn.

Das Overlay schließt über das ✕, einen Klick daneben oder die Escape-Taste. „Als Route in Google Maps“ öffnet alle Stopps als eine Route, dort entsteht die echte Wegführung. „Plan leeren“ setzt zurück.

Der Plan lebt im Browser, getrennt von den Orten, unter dem Speicher-Schlüssel `wien-karte-plan` — je Eintrag die `id` und der festgesetzte Abschnitt, sofern einer gezogen wurde. Er ist an dieses Gerät gebunden und geht niemanden sonst etwas an — ein Teilen-Link ist bewusst noch nicht gebaut. Wird ein Ort gelöscht, der im Plan steht, fällt er beim nächsten Laden still heraus.

## Route vorschlagen

Der Knopf am unteren Kartenrand, links neben „Mein Tag", öffnet ein Popup, das aus drei Angaben einen fertigen Tag baut: worauf man Lust hat (Kategorien, mehrfach wählbar), wie viel Zeit man hat, und ob nur im Umkreis von drei Kilometern um den eigenen Standort gesucht werden soll.

Jede Kategorie trägt einen Zeitwert in Punkten, jedes Zeitfenster ein Budget:

| Kategorie | Punkte |
|---|---|
| Frühstückscafé · Café | 1 |
| Restaurant · Bar · Sehenswürdigkeit · Aktivität | 2 |
| Museum · Musik · Event | 3 |

**Ganztag 8 Punkte · Morgens bis mittags 4 · Nur Abend 5.** Höchstens ein Frühstück, ein Café, zwei Museen, zwei Restaurants, eine Bar, ein Konzert. Cafés liegen tagsüber, Bars am Abend — eine Bar landet immer im Abschnitt „Abends", auch wenn sonst nichts dort steht. Ein Ganztag enthält mindestens ein Frühstückscafé und ein Restaurant — gemeint ist die Kategorie `fruehstueck`, nicht die neue Kategorie `cafe`. Fehlt eine der beiden in der Auswahl, fragt die Seite vor dem Rechnen nach.

Die Route bevorzugt Orte, die nah beieinanderliegen, wählt aber unter den nächstgelegenen zufällig und füllt zuerst noch fehlende Kategorien auf. „Neu würfeln" ergibt deshalb bei gleicher Eingabe einen anderen Tag. Sortiert wird nach Tagesabschnitt: Frühstück, dann Museum oder Sehenswürdigkeit, dann Essen, zuletzt Konzert oder Theater.

Das Ergebnis erscheint als nummerierte Liste im Popup. Erst mit „In den Tagesplan" wird es übernommen; liegt dort schon etwas, stehen „Plan ersetzen" und „Anhängen" nebeneinander.

> **Die Tageszeit ist geschätzt.** Die Orte führen keine Öffnungszeiten, deshalb leitet die Route sie aus der Kategorie ab — Frühstückscafés am Morgen, Musik und Events am Abend, Museen tagsüber. Aktivitäten zählen abends nur mit, wenn sie drinnen stattfinden. Ein Museum mit Montagsruhe erkennt die Route nicht.

Der Umkreis braucht einen aktiven Standort und wirkt je nach Lage sehr unterschiedlich: Vom Stephansdom aus liegen 56 der 69 Orte in drei Kilometern, von Penzing aus sieben. Reicht es nicht für die Pflichtkategorien, sagt die Seite das und schlägt vor, den Umkreis wegzulassen.

## Eigener Standort

Der Knopf oben links auf der Karte (◉) zeigt den eigenen Standort als roten Punkt mit einem Kreis für die Ungenauigkeit. Ein zweiter Klick blendet ihn wieder aus. Der Punkt wandert mit, solange die Anzeige an ist.

Das nutzt die Standortabfrage des Browsers und funktioniert nur in einem sicheren Kontext — auf GitHub Pages (`https`) oder lokal über `http://127.0.0.1`, **nicht** beim Doppelklick auf die Datei (`file://`). Beim ersten Klick fragt der Browser um Erlaubnis; wird sie abgelehnt, erscheint ein Hinweis und der Knopf springt zurück.

## Orte pflegen

Es gibt zwei Wege, und sie führen zum selben Ergebnis.

**Über die Seite.** Unten rechts auf „Bearbeiten“ klicken oder die Adresse mit `#bearbeiten` aufrufen. Im Bearbeiten-Modus bekommt jeder Listeneintrag ein Stift- und ein Kreuz-Symbol, dazu erscheint oben „Neuen Ort anlegen“. Mit Koordinaten hat man im Formular nichts zu tun: Adresse eintippen, auf „Position aus Adresse holen“ klicken, fertig. Alternativ „Auf Karte setzen“ drücken und die Stelle direkt anklicken. Eine Zeile über den beiden Knöpfen zeigt an, ob die Position schon steht, und ein Ring auf der Karte markiert sie.

Änderungen liegen zunächst nur im Speicher des Browsers. Ein dunkler Balken über der Liste weist darauf hin, solange das der Fall ist. Über „daten.js exportieren“ lädt man die fertige Datei herunter und ersetzt damit `daten.js` im Projektordner. Danach ist der Stand dauerhaft und für alle sichtbar. „Änderungen verwerfen“ setzt auf den Inhalt der Datei zurück.

Beim nächsten Neuladen vergleicht die Seite den lokalen Stand mit `daten.js`. Stimmen beide überein, wirft sie die Kopie weg und der Balken verschwindet von selbst. Bleibt er stehen, weicht der Browser-Speicher noch von der Datei ab. Enthält der gespeicherte Stand noch Kategorien aus einer früheren Fassung, wird er ohne Rückfrage verworfen — sonst würden diese Orte aus jedem Filter fallen.

**Direkt in der Datei.** `daten.js` ist eine schlichte Liste von Objekten. Jeder Ort trägt intern die Felder `lat` und `lng`, die Leaflet zum Setzen des Pins braucht. Wer sie von Hand füllt, holt sie auf [openstreetmap.org](https://www.openstreetmap.org) per Rechtsklick über „Adresse anzeigen“. Bequemer ist der Weg über das Formular, das die Position selbst nachschlägt.

## Filter

**Kategorien.** Neun Symbole, schwebend in der oberen rechten Kartenecke. Eingeklappt zeigt jedes nur sein Zeichen; beim Überfahren oder bei Tastaturfokus rollt der Name nach links auf, und die Nachbarn weichen zur Seite. Das gewählte Symbol bleibt aufgeklappt und in seiner Kategoriefarbe gefüllt, damit man ohne Nachsehen weiß, was gerade filtert.

Es gilt nur eine Kategorie zur Zeit — ein Klick auf eine andere löst die vorige ab, ein Klick auf die aktive schaltet sie wieder ab. Ohne Auswahl sind alle Orte sichtbar.

Beschriftete Knöpfe in der Kopfzeile waren das vorher, sie brauchten aber 1112 Pixel und begannen schon unter rund 1490 Pixel Fensterbreite seitlich zu scrollen — Kategorien verschwanden also aus dem Blick. Als Symbolleiste sind es rund 435 Pixel, und alle neun passen bis hinunter aufs Handy in eine Zeile.

**Merkmale.** Unter der Symbolleiste erscheinen die Merkmale der Kategorie — bei Restaurants die Küche, bei Musik das Genre und die Größe, bei Aktivitäten Indoor/Outdoor und den Typ. Sie stehen untereinander und rechtsbündig am Kartenrand, immer an derselben Stelle, unabhängig davon, welches Symbol gerade gemeint ist. Kein Kasten darum: Jeder Chip trägt seinen eigenen Hintergrund und hebt sich über einen Schatten von den Kartenkacheln ab.

Sie klappen **schon beim Überfahren** auf, nicht erst nach dem Klick — man kann die Kategorien also durchsehen, ohne den laufenden Filter zu verlieren. Solange nur angesehen wird, sind die Chips gestrichelt umrandet.

Klickt man in dieser Vorschau ein Merkmal an, springt die zugehörige Kategorie mit an — sonst würde das Merkmal ins Leere greifen. Verlässt der Zeiger den Bereich, kehren die Chips zur gewählten Kategorie zurück oder verschwinden.

Auf dem Handy sieht das anders aus, siehe unten.

Die Logik: innerhalb einer Dimension gilt oder (Italienisch + Griechisch zeigt beide), über Dimensionen hinweg und (Italienisch + Fancy zeigt nur das teure italienische Lokal). Ein Merkmal wertet nur Orte seiner eigenen Kategorie.

Die Merkmale je Kategorie stehen in `assets/app.js` unter `MERKMALE`. Die meisten hängen an einem Eintrag im Feld `tags` (z. B. `kueche-italienisch`, `genre-jazz`, `thema-kunst`) und lassen sich im Bearbeiten-Formular anhaken. Ein paar werden aus anderen Feldern abgeleitet und tragen keinen Tag: Kostenlos/Mit Eintritt aus `preis`, Indoor/Outdoor aus `indoor`, Gruppe/Duo aus `allein`.

**Zahnrad.** Ganz rechts in der Kopfzeile öffnet ein Rädchen zwei Gruppen von Schaltern, die für alle Kategorien gelten. Eine Ziffer am Rädchen zeigt, wie viele davon aktiv sind.

Oben die sechs universellen Schalter (Tabelle unten), darunter die Eigenschaften aus dem Feld `labels`: Barrierefrei, LGBTQ+-freundlich, Hunde willkommen, Reizarm & ruhig, Vegan & vegetarisch, Geheimtipp. Mehrere Eigenschaften werden mit und verknüpft — wer barrierefrei und vegan wählt, sieht nur Orte, auf die beides zutrifft.

> **Die Label-Werte sind derzeit erfunden.** Sie wurden gestreut, um den Filter zu testen, und sagen nichts über die echten Orte aus. Vor einer Veröffentlichung gehören sie geprüft oder gelöscht — eine falsche Angabe bei „Barrierefrei“ schickt jemanden im Rollstuhl vor eine Treppe. Ein Hinweis darauf steht auch im Popover selbst und im Kopf von `daten.js`.

| Schalter | zeigt nur Orte, die … |
|---|---|
| Bei Regen | drinnen stattfinden (`indoor: true`) |
| Wenig Andrang | erfahrungsgemäß ruhig sind (`andrang: "ruhig"`) |
| Allein machbar | ohne Begleitung funktionieren (`allein: true`) |
| Für Gruppen | in der Gruppe funktionieren (`gruppe: true`) |
| Gratis / günstig | nichts oder wenig kosten (`preis: "kostenlos"` oder `"guenstig"`) |
| Wenig gehen | kaum Fußweg verlangen (`gehen: "wenig"`) |

Das Suchfeld greift auf Name, Adresse und Beschreibung zu.

## Kopfzeile

Die Leiste ganz oben hat keinen eigenen Hintergrund und keine Unterkante — sie ist kein Balken, sondern ein Titel links und schwebende Bedienelemente rechts: Trefferzahl, Zurücksetzen, die Suchpille mit Lupe und das Zahnrad. Deren rechte Kante liegt auf derselben Linie wie die Kategoriensymbole über der Karte; beide sitzen 12 Pixel vom Rand (auf schmalen Fenstern 10).

Die Mitte bleibt bewusst leer. Der Platz ist für später vorgesehen.

## Auf dem Handy

Unter 900 Pixel Fensterbreite ordnet sich die Bedienung um und folgt dem, was man von Kartendiensten kennt:

- Die **Suchleiste** schwebt über der Karte, über die volle Breite, mit der Lupe links und dem Zahnrad rechts darin. Der Titel entfällt.
- Darunter die **Kategorien als beschriftete Chips** in einer waagrecht scrollbaren Reihe, Symbol vorn, Name dahinter. Der Scrollbalken ist ausgeblendet, gescrollt wird trotzdem. Erster Chip ist die Trefferzahl.
- Ist eine Kategorie gewählt, erscheint darunter eine **zweite scrollbare Reihe** mit ihren Merkmalen.
- **Leaflets Zoomknöpfe sind ausgeblendet** — auf dem Handy wird mit zwei Fingern gezoomt, und die Knöpfe stünden genau unter der Suchleiste im Weg. Der Standortknopf (◉) rutscht nach unten links.
- Suchleiste und Chips **bleiben beim Scrollen stehen**. Sobald die Ortsliste unter ihnen hochwandert, legt sich ein papierfarbener Streifen dahinter, der nach unten weich ausläuft — sonst läse man zwischen den Pillen hindurch Textfetzen. Über der Karte, also ganz oben, bleibt alles durchsichtig.
- **Kein Überfahren:** Auf einem Touchscreen gibt es keine Merkmal-Vorschau, der erste Tipper wählt direkt aus. Das ist kein Schönheitsentscheid — ein Touchgerät schickt vor dem Klick ein erfundenes `mouseenter`, und wenn das den Inhalt verändert, verschluckt Safari den darauffolgenden Klick. Man müsste zweimal tippen. Die Weiche dafür ist `kannSchweben` in `assets/app.js`, gestützt auf `matchMedia("(hover: hover)")`; die passenden CSS-Regeln liegen in `@media (hover: hover)`.

Am großen Schirm bleibt es beim Gegenteil: Dort sind die Kategorien reine Symbole, die beim Überfahren aufrollen, und die Merkmale stehen untereinander am rechten Rand.

## Auf GitHub Pages veröffentlichen

Das Repository liegt auf [github.com/diceben/vienna-day-planner](https://github.com/diceben/vienna-day-planner), `index.html` im Wurzelverzeichnis — genau dort, wo Pages sie erwartet.

1. Im Repository unter *Settings → Pages* als Quelle „Deploy from a branch“ wählen, Branch `main` und Ordner `/ (root)`.
2. Nach ein bis zwei Minuten ist die Seite unter <https://diceben.github.io/vienna-day-planner/> erreichbar.

Ein späteres Update besteht aus einem einzigen Schritt: die exportierte `daten.js` committen und pushen.

## Auswahl der Orte

Die Orte wurden im Juli 2026 recherchiert. Grundlage war eine Google-Maps-Bewertung ab 4,4 Sternen, verifiziert direkt in Google Maps. Drei Ausnahmen stehen trotzdem drin: der Naschmarkt, der als Areal geführt wird und keine eigene Bewertung hat, The Loft mit 3,8 als ausdrücklicher Wunsch, und Meissl & Schadn mit 4,2 als Beispiel für die Facette „Fancy“.

Nicht geprüft ist alles, was später über den Bearbeiten-Modus dazukommt. Wer den Maßstab halten will, schaut die Bewertung vor dem Anlegen kurz nach.

Bewertungen wandern mit der Zeit. Die Auswahl ist ein Stand, kein Dauerzustand.
