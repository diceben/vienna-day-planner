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

Die Liste ist 410 Pixel breit und zeigt pro Ort im Mittel 128 Pixel: das Bild links, daneben der Name mit den Aktionen auf gleicher Höhe, darunter die Adresse, die Merkmale als kleine Marken und eine auf zwei Zeilen geklemmte Beschreibung. Damit sind rund fünf Orte gleichzeitig sichtbar. Die Marken kosten etwa 20 Pixel je Eintrag und damit zwei sichtbare Orte — dafür weiß man beim Durchsehen, was ein Ort ist. Jeder der 69 Orte trägt mindestens eine, höchstens vier, es bleibt also immer bei einer Zeile.

Die Aktionen sind zwei knappe Icons für Website und Route, dazu der Knopf „+ Zum Tag“ — bewusst mit Text, weil er die eigentliche Handlung ist. Liegt der Ort im Plan, steht dort „✓ Im Tag“ in der Kategoriefarbe.

Namen, die nicht in eine Zeile passen, brechen auf eine zweite um statt abgeschnitten zu werden; das betrifft rund ein Sechstel der Orte. Ein Klick auf den Eintrag wählt den Ort, zeigt ihn auf der Karte und klappt eine längere Beschreibung ganz auf. Ein weiterer Klick hebt die Auswahl wieder auf. Die Aktionen funktionieren ohne vorheriges Anklicken.

**Die Karte fährt in einem Zug dorthin.** Wohin genau, steht vor dem Losfliegen fest: `zielPunkt()` in `assets/app.js` rechnet aus, wo die Mitte liegen muss, damit Pin und Popup zusammen mittig im *sichtbaren* Teil stehen — bei offener Ergebnisspalte also um deren halbe Breite nach rechts versetzt, weil die Spalte die linken 410 Pixel verdeckt. Die Popuphöhe wird nach dem Öffnen gemessen; sie ist verlässlich, weil das Bild darin eine feste Höhe hat.

Vorher waren es zwei Bewegungen: Erst flog die Karte auf den Pin, dann schob Leaflet nach, damit das hohe Popup samt Bild nicht oben abgeschnitten blieb. Der Ruck dazwischen war deutlich zu sehen — 916 statt 669 Millisekunden. Leaflets Nachrücken (`autoPan`) ist für diesen Weg deshalb abgeschaltet; beim Klick auf einen Pin bleibt es an, dort ist es die einzige Bewegung.

## Miniaturbilder

Jeder Ort kann ein Bild tragen, eingetragen im Feld `bild` als Pfad wie `bilder/wiener-riesenrad.jpg` oder als vollständige URL. Gezeigt wird es an vier Stellen: im Pin auf der Karte, als Quadrat links in der Liste, klein im Tagesplan und als Streifen oben im Popup.

Ohne Bild bleibt es beim farbigen Tropfen mit dem Symbol der Kategorie. Dasselbe passiert, wenn der Pfad ins Leere zeigt — die Seite fällt still auf das Symbol zurück, statt ein kaputtes Bild anzuzeigen. Details in [bilder/LIESMICH.md](bilder/LIESMICH.md).

**Alle Pins haben dieselbe Form**, mit Foto wie ohne: ein Kreis mit Ring in der Kategoriefarbe, weißer Linie außen herum und einer Spitze darunter, die auf der Koordinate steht. Der einzige Unterschied ist der Inhalt — Foto oder Kategoriesymbol. Die Spitze ist ein um 45° gedrehtes Quadrat hinter dem Kreis; der Kreis selbst beschneidet sein Inneres mit `overflow: hidden`, damit das Foto rund bleibt, und könnte nichts hinauslassen.

Früher war der Pin ohne Bild ein gedrehter Tropfen und der mit Bild ein Kreis. Solange drei von vier Orten kein Foto hatten, fiel das kaum auf; seit es umgekehrt ist, sah die Karte nach zwei Kartenwerken aus.

47 der 69 Orte haben derzeit ein Foto, alle von Wikimedia Commons unter freier Lizenz. Urheber und Lizenz stehen je Bild in [bilder/BILDNACHWEIS.md](bilder/BILDNACHWEIS.md). Diese Datei gehört mit veröffentlicht, weil die Lizenzen eine Nennung verlangen.

Die übrigen 22 stehen mit Adresse in [bilder/FEHLENDE.md](bilder/FEHLENDE.md). Zu ihnen gibt es weder auf Commons noch über Openverse etwas — es sind kleine Cafés, Bars, Clubs und Freizeitbetriebe, die niemand unter freier Lizenz fotografiert hat. Dort hilft nur ein eigenes Foto oder die Zusage des Lokals. Bilder aus der Google-Suche gehen nicht: Sie gehören den Lokalen, Fotografen oder Presseagenturen.

Sechs der neuen Bilder zeigen das Haus an der Adresse, nicht das Lokal selbst — Café Aera, neue bar, Café Propeller, ZWE, KLYO und GOTA Coffee. Bei ZWE und GOTA ist das Schild im Bild, bei den anderen die richtige Hausnummer.

## Leaflet liegt im Projekt

Die Karte läuft mit [Leaflet](https://leafletjs.com) 1.9.4. Die Bibliothek liegt in `assets/leaflet/` — 159 KB für `leaflet.js` und `leaflet.css`, dazu 6 KB für die fünf PNGs, auf die das CSS zeigt; zusammen 165 KB. Vorher kam sie von unpkg. Der Grund für den Umzug: Ist das CDN nicht erreichbar, wäre die Seite eine leere Fläche, denn einen Rückfall gibt es nicht.

Damit geht **keine einzige Anfrage mehr an einen fremden Rechner**, außer den Kartenkacheln von CARTO. Nachgemessen mit gekapptem Netz: Leaflet lädt, das Kartengerüst steht, alle 69 Pins sitzen, Zoom- und Bearbeiten-Knöpfe sind da, und ein Klick auf eine Kategorie filtert und schwenkt die Spalte auf — nur die Kartenbilder fehlen. Die Prüfsummen (`integrity`) sind entfallen; sie sicherten gegen ein fremdes CDN, und gegen die eigenen Dateien sichert Git.

Die fünf PNGs (`marker-icon`, `marker-shadow`, `layers` …) fragt die Seite derzeit nie an: Alle Pins sind divIcons, und eine Ebenen-Steuerung gibt es nicht. Sie liegen trotzdem dabei, damit die Kopie vollständig ist und niemand später über ein 404 stolpert.

**Beim Aktualisieren:** Dateien von `https://unpkg.com/leaflet@<version>/dist/` holen und gegen die dort angegebenen SRI-Hashes rechnen, bevor sie ins Projekt wandern:

```bash
openssl dgst -sha256 -binary leaflet.js | openssl base64 -A
```

Für 1.9.4 muss dabei `20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=` herauskommen, für `leaflet.css` `p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=`. Die jetzt eingecheckten Dateien sind so geprüft.

Die Kacheln kommen weiter von CARTO auf OpenStreetMap-Basis — die Seite braucht dafür eine Internetverbindung. Ohne sie steht das Gerüst samt Pins, nur die Kartenbilder fehlen.

## Lokal ansehen

`index.html` doppelklicken reicht. Wenn der Browser dabei zickt, tut es ein lokaler Server:

```bash
cd vienna-day-planner && python3 -m http.server 8765
```

Danach im Browser `http://127.0.0.1:8765` öffnen.

## Tests

Sechzehn Läufe in `tests/`, rund zwei Minuten. Sie steuern einen echten Browser über [Playwright](https://playwright.dev) und messen, was auf dem Schirm passiert — Pixelmaße, Farben, Bewegungsdauern, welche Anfragen hinausgehen.

```bash
npm install                     # einmalig
npx playwright install chromium # einmalig
npm test                        # alle sechzehn
npm test -- pins route          # nur passende
```

`tests/lauf.mjs` sucht sich einen freien Port, stellt den Server selbst daneben und ruft die Läufe nacheinander — nicht gleichzeitig, weil ein ausgelasteter Rechner bei Animationen andere Zahlen liefert. Jeder Lauf ist auch allein startbar (`node tests/pins.mjs`), dann muss ein Server auf Port 8766 stehen.

**Der Deploy hängt daran.** `.github/workflows/deploy.yml` testet erst und veröffentlicht nur bei Grün; ist ein Lauf rot, bleibt die zuletzt erfolgreiche Fassung stehen. Der Fehlerfall ist damit „veraltet" statt „kaputt". Vorher lieferte GitHub Pages den Branch aus — jeder Push war ungeprüft eine Minute später live, und ein Testlauf danach hätte nur gemeldet, was schon draußen ist.

Nur die Kartenkacheln werden durch ein einfarbiges Bild ersetzt, damit die Läufe offline und über die Zeit vergleichbar bleiben. Leaflet kommt ausdrücklich aus dem Projekt: Die Läufe sollen die Seite prüfen, die auch ausgeliefert wird.

### Wozu der Aufwand

Was die Läufe allein beim Bauen dieser Fassung gefangen haben — jedes Mal etwas, das im Diff unsichtbar war:

| Fund | warum unsichtbar |
|---|---|
| 8 px Versatz einer Chipreihe | Der geleerte Wrapper steuerte weiter das `gap` der Zone bei |
| Handyseite auf 410 px geschrumpft | `body.liste-offen .buehne` schlug `.buehne` in der Spezifität |
| Fotos als senkrechter Streifen im Pin | Leaflets eigenes Stylesheet schlug die App-Regel |
| Zahnrad klebte in der Suchpille | `backdrop-filter` macht das Element zum Bezugsrahmen für `position: fixed` |
| Zwei Restaurants gleichzeitig mittags | Nur in ein paar von acht Würfen, nie beim Draufschauen |
| Zweistufige Bewegung zur Karte | 916 statt 669 ms — messbar, nicht lesbar |

Die Kehrseite: Weil echte Maße geprüft werden, macht eine **gewollte** Gestaltungsänderung die Läufe zu Recht rot. Dann gehört der Lauf mitgezogen. Ein neuer Lauf sollte einmal gegengeprobt werden — Änderung ausbauen, schauen ob er anschlägt, wieder einbauen. Sonst prüft er nichts.

## Tagesplan

Unten rechts auf der Karte schwebt der Knopf „Mein Tag“ mit einem Zähler. Ein Klick öffnet am rechten Rand ein Panel, 420 Pixel breit und fast so hoch wie das Fenster — der Tagesplan ist die Stelle, an der man mehrere Orte nebeneinander abwägt, dafür braucht er Höhe. Neben der Überschrift steht, wie viele Stopps in wie vielen der vier Tageszeiten liegen.

Der Knopf selbst schrumpft dabei auf null zusammen, und **„Route vorschlagen“ rutscht nach links** aus dem Weg, statt sich unter dem Panel zu verstecken. Beides läuft über dieselbe Viertelsekunde. Am Handy ist daneben kein Platz — dort treten beide Knöpfe ab und das Panel hängt fest am Fenster, unterhalb der Chipreihe.

In der Liste sitzt der Knopf als farbiges Dreieck in der rechten oberen Ecke jedes Eintrags: ein Plus in der Kategoriefarbe, im Plan wechselt es auf Dunkel und zeigt einen Haken. Im Karten-Popup steht stattdessen der beschriftete Knopf „+ Zum Tag“.

Das Panel gliedert den Tag in **Vormittags, Mittags, Nachmittags und Abends**; eine feine Linie zieht sich hinter jeder Überschrift durch. Alle vier bleiben stehen, auch wenn nichts darunter liegt — der Tag ist ein Gerüst, in das man einsortiert. Jeder Stopp zeigt seine Nummer in der Kategoriefarbe, das Miniaturbild, Namen und Adresse. Ein Eintrag lässt sich auf eine Überschrift ziehen und landet dann in diesem Abschnitt, auch entgegen der üblichen Zuordnung.

Ohne eigenes Zutun leitet sich der Abschnitt aus Kategorie und Reihenfolge ab: Frühstück am Vormittag, das erste Restaurant zu Mittag, ein zweites am Abend, Konzerte abends. Was zwischen Mittagessen und Abend liegt, zählt als Nachmittag. Die Liste lässt sich weiterhin frei per Ziehen umordnen. Auf der Karte tragen die geplanten Pins dieselbe Nummer und sind durch eine gestrichelte Linie in der Reihenfolge des Plans verbunden. Sobald etwas im Plan liegt, treten alle übrigen Pins zurück — blass und entfärbt, damit der eigene Tag hervorsticht. Fährt man mit der Maus über einen davon, kommt er kurz zurück und legt sich nach vorn.

Das Panel schließt über das ✕, einen Klick daneben oder die Escape-Taste. Am unteren Rand kleben „Als Route in Google Maps“ — öffnet alle Stopps als eine Route, dort entsteht die echte Wegführung — und „Plan leeren“. Sie stehen außerhalb des scrollenden Bereichs und bleiben deshalb sichtbar, auch wenn die Liste kurz ist.

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

**Einzelne Stopps sperren.** Rechts an jeder Zeile hängt ein Schloss. Ein Klick schließt es (🔒), und dieser Stopp bleibt beim nächsten „Neu würfeln" stehen — mit seinem Ort **und** seinem Platz im Tag. Man kann also drei gute Treffer festhalten und nur den Rest neu ziehen, statt so lange zu würfeln, bis zufällig alles gleichzeitig passt. Ein zweiter Klick gibt den Stopp wieder frei; der Klick rechnet nichts, wirksam wird die Sperre erst beim nächsten Wurf. Die Zusammenfassung zählt mit („5 Stopps · 6 von 8 Punkten · 2 gesperrt"), und sind alle gesperrt, sagt eine Zeile darunter, dass Würfeln nichts mehr ändert.

Die Punkte gesperrter Stopps zählen aufs Budget wie alle anderen: Wer viel festhält, hat für den Rest weniger übrig. Auch die Höchstmengen gelten weiter — ein gesperrtes Restaurant besetzt einen der beiden Plätze. Die Schlösser fallen, sobald man über „Verwerfen" zu den Vorgaben zurückgeht; dort ändert man meist Kategorien oder Zeitfenster, und damit ist die Grundlage eine andere.

> **Die Tageszeit ist geschätzt.** Die Orte führen keine Öffnungszeiten, deshalb leitet die Route sie aus der Kategorie ab — Frühstückscafés am Morgen, Musik und Events am Abend, Museen tagsüber. Aktivitäten zählen abends nur mit, wenn sie drinnen stattfinden. Ein Museum mit Montagsruhe erkennt die Route nicht.

Der Umkreis braucht einen aktiven Standort und wirkt je nach Lage sehr unterschiedlich: Vom Stephansdom aus liegen 56 der 69 Orte in drei Kilometern, von Penzing aus sieben. Reicht es nicht für die Pflichtkategorien, sagt die Seite das und schlägt vor, den Umkreis wegzulassen.

## Eigener Standort

Der Knopf oben links auf der Karte (◉) zeigt den eigenen Standort als roten Punkt mit einem Kreis für die Ungenauigkeit. Ein zweiter Klick blendet ihn wieder aus. Der Punkt wandert mit, solange die Anzeige an ist.

Das nutzt die Standortabfrage des Browsers und funktioniert nur in einem sicheren Kontext — auf GitHub Pages (`https`) oder lokal über `http://127.0.0.1`, **nicht** beim Doppelklick auf die Datei (`file://`). Beim ersten Klick fragt der Browser um Erlaubnis; wird sie abgelehnt, erscheint ein Hinweis und der Knopf springt zurück.

## Orte pflegen

Es gibt zwei Wege, und sie führen zum selben Ergebnis.

**Über die Seite.** Unten links auf der Karte auf „Bearbeiten“ klicken oder die Adresse mit `#bearbeiten` aufrufen. Im Bearbeiten-Modus bekommt jeder Listeneintrag ein Stift- und ein Kreuz-Symbol, dazu erscheint oben „Neuen Ort anlegen“. Mit Koordinaten hat man im Formular nichts zu tun: Adresse eintippen, auf „Position aus Adresse holen“ klicken, fertig. Alternativ „Auf Karte setzen“ drücken und die Stelle direkt anklicken. Eine Zeile über den beiden Knöpfen zeigt an, ob die Position schon steht, und ein Ring auf der Karte markiert sie.

Änderungen liegen zunächst nur im Speicher des Browsers. Ein dunkler Balken über der Liste weist darauf hin, solange das der Fall ist. Über „daten.js exportieren“ lädt man die fertige Datei herunter und ersetzt damit `daten.js` im Projektordner. Danach ist der Stand dauerhaft und für alle sichtbar. „Änderungen verwerfen“ setzt auf den Inhalt der Datei zurück.

Beim nächsten Neuladen vergleicht die Seite den lokalen Stand mit `daten.js`. Stimmen beide überein, wirft sie die Kopie weg und der Balken verschwindet von selbst. Bleibt er stehen, weicht der Browser-Speicher noch von der Datei ab. Enthält der gespeicherte Stand noch Kategorien aus einer früheren Fassung, wird er ohne Rückfrage verworfen — sonst würden diese Orte aus jedem Filter fallen.

**Direkt in der Datei.** `daten.js` ist eine schlichte Liste von Objekten. Jeder Ort trägt intern die Felder `lat` und `lng`, die Leaflet zum Setzen des Pins braucht. Wer sie von Hand füllt, holt sie auf [openstreetmap.org](https://www.openstreetmap.org) per Rechtsklick über „Adresse anzeigen“. Bequemer ist der Weg über das Formular, das die Position selbst nachschlägt.

## Filter

**Kategorien.** Neun beschriftete Pillen, schwebend über der Karte, rechts neben der Suche. Symbol vorn, Name dahinter. Passen sie nicht in eine Zeile — und das tun sie bis etwa 1750 Pixel Fensterbreite nicht —, blättert ein Pfeil am Ende der Reihe weiter; am Handy wischt man stattdessen. Der Scrollbalken ist ausgeblendet.

Es gilt nur eine Kategorie zur Zeit — ein Klick auf eine andere löst die vorige ab, ein Klick auf die aktive schaltet sie wieder ab. Ohne Auswahl sind alle Orte sichtbar.

Damit man die Wahl auch dort sieht, wo die Reihe gerade weggescrollt ist, **steht der Name der Kategorie im Suchfeld** — nach einem Klick auf „Restaurants“ liest man dort „Restaurants“. Ein Suchbegriff ist er nicht: `suchtext` bleibt leer, und `spiegleSuchfeld()` in `assets/app.js` schreibt den Namen nur zur Anzeige hinein. Wer im Feld zu tippen beginnt, sucht etwas Neues; die Kategorie tritt dann ab, sonst stünde ein Filter in Kraft, den das Feld nicht mehr benennt.

**Merkmale.** Sie sind da, um gelesen zu werden, nicht um angeklickt zu werden. Jeder Listeneintrag trägt sie als kleine Marken zwischen Adresse und Beschreibung: bei Restaurants die Küche, bei Musik Genre und Größe, bei Aktivitäten Indoor/Outdoor und den Typ. Man sieht beim Durchsehen, was ein Ort ist, ohne ihn anzutippen. Im Ortsblatt am Handy stehen sie an derselben Stelle.

Gehört ein Ort mehreren Kategorien an, stehen die Merkmale aller seiner Kategorien da — das Cafe Merkur ist auch ein Restaurant und trägt trotzdem „Klassisch“ und „bis Mittag“ aus dem Frühstück. Die Marken beschreiben den Ort, nicht den laufenden Filter. Doppelte fallen weg: „Draußensitzen“ gibt es bei Frühstück, Café und Bar, es erscheint aber nur einmal.

Filtern lässt sich damit nicht. Das war einmal anders — die Merkmale standen als anklickbare Chips über der Karte —, aber es hat den Kopfbereich vollgestellt für einen Filter, den man selten braucht. Wer nur die italienischen Lokale sucht, tippt „italienisch“ ins Suchfeld; die Suche greift auf Name, Adresse und Beschreibung zu.

Welche Merkmale es je Kategorie gibt, steht in `assets/app.js` unter `MERKMALE`. Die meisten hängen an einem Eintrag im Feld `tags` (z. B. `kueche-italienisch`, `genre-jazz`, `thema-kunst`) und lassen sich im Bearbeiten-Formular anhaken. Ein paar werden aus anderen Feldern abgeleitet und tragen keinen Tag: Kostenlos/Mit Eintritt aus `preis`, Indoor/Outdoor aus `indoor`, Gruppe/Duo aus `allein`. Jedes trägt eine `test`-Funktion, und `merkmaleVon(ort)` fragt sie der Reihe nach ab.

**Zahnrad.** Am großen Schirm steht es ganz rechts oben, am anderen Ende der Chipreihe; am Handy sitzt es im rechten Ende der Suchpille. Es öffnet die sechs universellen Schalter (Tabelle unten), die für alle Kategorien gelten. Eine Ziffer am Rädchen zeigt, wie viele davon aktiv sind.

> **Die Eigenschaften-Filter sind entfernt worden.** Barrierefrei, LGBTQ+-freundlich, Hunde willkommen, Reizarm & ruhig, Vegan & vegetarisch und Geheimtipp standen früher als zweite Gruppe im Popover. Ihre Werte waren gestreut, um den Filter zu testen — nicht recherchiert. Der Filter ließ sie trotzdem wie Tatsachen aussehen, und der Warnhinweis stand nur im Popover, sichtbar bloß für den, der es aufklappte. Bei „Barrierefrei“ schickt das jemanden im Rollstuhl vor eine Treppe.
>
> Das Feld `labels` steht weiterhin leer bei jedem Ort. Kommen echte, geprüfte Werte, ist das Zurückholen ein kleiner Schritt: die Tabelle `LABELS` in `assets/app.js` (der Kommentar an ihrer Stelle sagt, was dazugehört), die Gruppe im Popover und die Kästchen im Formular. Wer `labels` von Hand in `daten.js` pflegt, verliert die Werte nicht — der Bearbeiten-Modus reicht durch, was er nicht anzeigen kann.

| Schalter | zeigt nur Orte, die … |
|---|---|
| Bei Regen | drinnen stattfinden (`indoor: true`) |
| Wenig Andrang | erfahrungsgemäß ruhig sind (`andrang: "ruhig"`) |
| Allein machbar | ohne Begleitung funktionieren (`allein: true`) |
| Für Gruppen | in der Gruppe funktionieren (`gruppe: true`) |
| Gratis / günstig | nichts oder wenig kosten (`preis: "kostenlos"` oder `"guenstig"`) |
| Wenig gehen | kaum Fußweg verlangen (`gehen: "wenig"`) |

Das Suchfeld greift auf Name, Adresse und Beschreibung zu.

## Zwei Zustände

Die Seite hat zwei Zustände, so wie man es von Kartendiensten kennt — an beiden Breiten, nur mit unterschiedlicher Bewegung.

**Ohne Filter** füllt die Karte das Fenster. Oben links schwebt die Suchpille aus Lupe und Eingabefeld, rechts daneben die Kategorien, ganz rechts das Zahnrad. Sonst nichts. Man sieht die Orte, nicht die Maschinerie.

**Sobald etwas filtert**, schiebt sich am großen Schirm von links die Ergebnisspalte über die Karte, 410 Pixel breit. Sie legt sich **darüber**, drückt die Karte also nicht zur Seite: Der Ausschnitt bleibt stehen, die Pins wandern nicht, und man verliert beim Filtern nicht die Orientierung. Ihre weiße Fläche reicht bis an den oberen Fensterrand, sodass die Suchpille darin zu liegen kommt; sie selbst bewegt sich dabei nicht, sie steht fest am Fenster. Leaflets Zoom- und Standortknöpfe rücken um die Spaltenbreite nach rechts, damit sie nicht darunter verschwinden. Im Kopf der Spalte steht die Trefferzahl, darunter die Liste. Über der Karte bleibt die Kategorienreihe, wie sie ist — die gewählte in ihrer Farbe gefüllt. Ein Klick auf eine andere wechselt direkt hinüber.

Was „filtert“ heißt, steht an einer Stelle in `assets/app.js`, in `filterAktiv()`: eine gewählte Kategorie, ein Suchbegriff oder ein Schalter aus dem Zahnrad. Auch der Bearbeiten-Modus hält die Spalte offen — sein Panel steht darin und wäre sonst nicht zu erreichen. Das ✕ in der Suchpille räumt alles weg und führt zurück in den ersten Zustand; es ist der einzige Weg dorthin und trägt deshalb volle Tintenfarbe und eine Trennlinie, statt sich als graues Zeichen zu verstecken.

Der Titel steht nur noch im Browsertab. Auf der Seite selbst wäre oben links kein Platz mehr für ihn, und Kartendienste haben dort auch keinen.

**Am Handy** dasselbe Prinzip, andere Richtung: Ohne Filter füllt die Karte den Schirm, die Liste ist nicht da und es gibt nichts zu scrollen. Filtert etwas, schrumpft die Karte auf 58 Prozent der Fensterhöhe und die Liste schaut von unten herein — das Schrumpfen ist zugleich die sichtbare Antwort auf den Tipp.

**Unten links** stapeln sich der Bearbeiten-Schalter, der Standortknopf und die Zoomknöpfe: Oben liegt in beiden Zuständen die Chipreihe, und unten rechts stehen „Route vorschlagen“ und „Mein Tag“. Alle drei sind Leaflet-Steuerungen im selben Stapel, deshalb rücken sie gemeinsam um die Spaltenbreite nach rechts, sobald die Ergebnisspalte aufschwenkt.

Einen Seitenfuß gibt es nicht mehr — die Karte reicht bis an den unteren Fensterrand. Die Nennung von OpenStreetMap und CARTO stand dort doppelt: Leaflet setzt sie ohnehin unten rechts auf die Karte.

## Auf dem Handy

Unter 900 Pixel Fensterbreite ordnet sich die Bedienung um und folgt dem, was man von Kartendiensten kennt:

- Die **Suchleiste** schwebt über der Karte, hier über die volle Breite statt nur über der Spalte, mit der Lupe links und dem Zahnrad rechts darin. Am großen Schirm steht das Zahnrad stattdessen frei am rechten Rand — auf 390 Pixeln wäre daneben kein Platz, und die Chipreihe braucht die volle Breite zum Wischen.
- Darunter die **Kategorien als beschriftete Chips** in einer waagrecht scrollbaren Reihe, Symbol vorn, Name dahinter. Der Scrollbalken ist ausgeblendet, gescrollt wird trotzdem. Die Trefferzahl stand hier einmal als erster Chip — sie hat nur Platz gekostet und ist raus.
- **Leaflets Zoomknöpfe sind ausgeblendet** — auf dem Handy wird mit zwei Fingern gezoomt, und die Knöpfe wären nur im Weg. Der Standortknopf (◉) bleibt und steht wie am großen Schirm unten links.
- Suchleiste und Chips **bleiben beim Scrollen stehen**. Sobald die Ortsliste unter ihnen hochwandert, legt sich ein papierfarbener Streifen dahinter, der nach unten weich ausläuft — sonst läse man zwischen den Pillen hindurch Textfetzen. Über der Karte, also ganz oben, bleibt alles durchsichtig.
- **Ein Pin öffnet ein Ortsblatt**, das von unten hereinfährt: Bild, Name, Adresse, Beschreibung, dazu Website, Route und „+ Zum Tag". Solange es offen ist, **tritt die Liste ganz ab**: Die Karte füllt den Schirm, das Blatt liegt im unteren Drittel, und die Seite lässt sich nicht scrollen — es gibt nichts mehr, wohin. Die Karte rückt den Pin über die Blattoberkante. Das ✕ schließt das Blatt und stellt den Stand davor wieder her — mit Filter also samt Liste, ohne Filter die nackte Karte. Vorher sprang die Seite hinunter zum Listeneintrag, und die Karte war weg — damit verlor man genau den Zusammenhang, den man gesucht hatte. Auf dem Handy wird deshalb auch kein Leaflet-Popup mehr gebunden; das Blatt tritt an seine Stelle.
- Ein Tipp auf einen **Listeneintrag** bleibt dagegen in der Liste: Der Eintrag klappt auf, die Seite springt nicht, kein Blatt. Liste zum Stöbern, Karte zum Verorten.

Früher stand hier ein Absatz darüber, dass es am Handy keine Merkmal-Vorschau beim Überfahren gibt: Ein Touchgerät schickt vor dem Klick ein erfundenes `mouseenter`, und wenn das den Inhalt verändert, verschluckt Safari den darauffolgenden Klick — man musste zweimal tippen. Die Vorschau gibt es nicht mehr, und die Merkmalchips selbst auch nicht. Beim Überfahren ändert sich nichts mehr, also kann der Fehler auch nicht wiederkommen.

## Auf GitHub Pages veröffentlichen

Das Repository liegt auf [github.com/diceben/vienna-day-planner](https://github.com/diceben/vienna-day-planner), `index.html` im Wurzelverzeichnis — genau dort, wo Pages sie erwartet.

1. Im Repository unter *Settings → Pages* als Quelle „Deploy from a branch“ wählen, Branch `main` und Ordner `/ (root)`.
2. Nach ein bis zwei Minuten ist die Seite unter <https://diceben.github.io/vienna-day-planner/> erreichbar.

Ein späteres Update besteht aus einem einzigen Schritt: die exportierte `daten.js` committen und pushen.

## Auswahl der Orte

Die Orte wurden im Juli 2026 recherchiert. Grundlage war eine Google-Maps-Bewertung ab 4,4 Sternen, verifiziert direkt in Google Maps. Drei Ausnahmen stehen trotzdem drin: der Naschmarkt, der als Areal geführt wird und keine eigene Bewertung hat, The Loft mit 3,8 als ausdrücklicher Wunsch, und Meissl & Schadn mit 4,2 als Beispiel für die Facette „Fancy“.

Nicht geprüft ist alles, was später über den Bearbeiten-Modus dazukommt. Wer den Maßstab halten will, schaut die Bewertung vor dem Anlegen kurz nach.

Bewertungen wandern mit der Zeit. Die Auswahl ist ein Stand, kein Dauerzustand.
