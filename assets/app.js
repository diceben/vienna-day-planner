/* Wien-Karte — Anwendungslogik
   Daten kommen aus daten.js (globale Konstante ORTE).
   Bearbeitete Stände liegen im localStorage und lassen sich als neue
   daten.js exportieren. */

(function () {
  "use strict";

  /* ------------------------------------------------------------------
     Konfiguration
     ------------------------------------------------------------------ */

  var KATEGORIEN = {
    fruehstueck:       { titel: "Frühstückscafés",        farbe: "#c08a2e", zeichen: "🥐" },
    cafe:              { titel: "Cafés",                  farbe: "#8a6a3c", zeichen: "☕" },
    restaurant:        { titel: "Restaurants",            farbe: "#b23a2a", zeichen: "🍽️" },
    bar:               { titel: "Bars",                   farbe: "#6b3f6e", zeichen: "🍸" },
    sehenswuerdigkeit: { titel: "Sehenswürdigkeiten",     farbe: "#1b7fa8", zeichen: "🏰" },
    museum:            { titel: "Museen & Ausstellungen", farbe: "#7a3f86", zeichen: "🏛️" },
    musik:             { titel: "Musik",                  farbe: "#3b4a8c", zeichen: "🎵" },
    event:             { titel: "Events",                 farbe: "#a8336a", zeichen: "🎭" },
    aktivitaet:        { titel: "Aktivitäten",            farbe: "#2f7355", zeichen: "🎯" }
  };

  /* Hier stand einmal LABELS: Barrierefrei, LGBTQ+-freundlich, Hunde
     willkommen, Reizarm, Vegan, Geheimtipp — schaltbar im Zahnrad-Popover.
     Die Werte in daten.js waren zum Testen des Filters gestreut, nicht
     recherchiert, und der Filter ließ sie wie Tatsachen aussehen. Bei
     „Barrierefrei“ schickt das jemanden im Rollstuhl vor eine Treppe.

     Das Feld `labels` steht weiterhin leer in jedem Ort. Kommen echte,
     geprüfte Werte, ist das Zurückholen ein kleiner Schritt: diese Tabelle,
     die Gruppe im Popover, `aktiveLabels` und die Kästchen im Formular. */

  /* ------------------------------------------------------------------
     Routenvorschlag
     ------------------------------------------------------------------
     Jede Kategorie trägt einen Zeitwert in Punkten, jedes Zeitfenster ein
     Budget. Weil die Orte keine Öffnungszeiten führen, leitet sich die
     Tageszeit aus der Kategorie ab — eine Faustregel, kein Fahrplan. */
  var ROUTE = {
    punkte: {
      fruehstueck: 1,
      cafe: 1,
      restaurant: 2,
      bar: 2,
      sehenswuerdigkeit: 2,
      aktivitaet: 2,
      museum: 3,
      musik: 3,
      event: 3
    },

    /* In welchen Tagesabschnitten eine Kategorie infrage kommt. */
    phasen: {
      fruehstueck: ["morgens"],
      museum: ["tagsueber"],
      sehenswuerdigkeit: ["tagsueber"],
      aktivitaet: ["tagsueber"],
      cafe: ["tagsueber"],
      restaurant: ["tagsueber", "abends"],
      bar: ["abends"],
      musik: ["abends"],
      event: ["abends"]
    },

    /* Reihenfolge im fertigen Tag. */
    rang: {
      fruehstueck: 1,
      sehenswuerdigkeit: 2,
      museum: 2,
      aktivitaet: 3,
      cafe: 3,
      restaurant: 4,
      musik: 5,
      event: 5,
      bar: 6
    },

    /* Der Tag wird in vier Abschnitte gegliedert. */
    abschnitte: [
      { id: "vormittag",  titel: "Vormittags" },
      { id: "mittag",     titel: "Mittags" },
      { id: "nachmittag", titel: "Nachmittags" },
      { id: "abend",      titel: "Abends" }
    ],

    fenster: {
      ganztag:    { titel: "Ganztag",             budget: 8, phasen: ["morgens", "tagsueber", "abends"], mindestens: ["fruehstueck", "restaurant"] },
      vormittag:  { titel: "Morgens bis mittags", budget: 4, phasen: ["morgens", "tagsueber"],           mindestens: ["fruehstueck"] },
      abend:      { titel: "Nur Abend",           budget: 5, phasen: ["abends"],                         mindestens: ["restaurant"] }
    },

    /* Höchstzahl je Kategorie in einer Route. Man frühstückt einmal und
       geht an einem Abend in ein Konzert, nicht in zwei. */
    hoechstens: {
      fruehstueck: 1,
      cafe: 1,
      museum: 2,
      restaurant: 2,
      bar: 1,
      musik: 1,
      event: 1
    },

    umkreisMeter: 3000,
    /* Fällt der Standort aus, wird ab hier gerechnet. */
    ersatzStart: [48.2082, 16.3730]
  };

  /* Aktivitäten im Trockenen laufen auch abends, ein Bogenparcours nicht. */
  function phasenVon(ort, kategorie) {
    var p = (ROUTE.phasen[kategorie] || []).slice();
    if (kategorie === "aktivitaet" && ort.indoor === true && p.indexOf("abends") === -1) {
      p.push("abends");
    }
    return p;
  }

  /* Schlüssel aus früheren Fassungen. Ein lokal gespeicherter Stand mit
     diesen Werten ist überholt und wird beim Laden verworfen. */
  var ALTE_SCHLUESSEL = ["kulinarik", "kultur", "vorfuehrung", "lokale"];

  /* Primäre Kategorie plus die Zweitkategorien aus `weitere`. */
  function kategorienVon(ort) {
    var liste = [ort.kategorie];
    (ort.weitere || []).forEach(function (k) {
      if (liste.indexOf(k) === -1) { liste.push(k); }
    });
    return liste.filter(function (k) { return !!KATEGORIEN[k]; });
  }

  /* Universelle Schalter — liegen hinter dem Zahnrad, gelten für alle Kategorien. */
  var SCHALTER = [
    { id: "regen",     titel: "Bei Regen",        pruef: function (o) { return o.indoor === true; } },
    { id: "ruhig",     titel: "Wenig Andrang",    pruef: function (o) { return o.andrang === "ruhig"; } },
    { id: "allein",    titel: "Allein machbar",   pruef: function (o) { return o.allein === true; } },
    { id: "gruppe",    titel: "Für Gruppen",      pruef: function (o) { return o.gruppe === true; } },
    { id: "guenstig",  titel: "Gratis / günstig", pruef: function (o) { return o.preis === "kostenlos" || o.preis === "guenstig"; } },
    { id: "wenigGehen", titel: "Wenig gehen",     pruef: function (o) { return o.gehen === "wenig"; } }
  ];

  function hatTag(t) { return function (o) { return (o.tags || []).indexOf(t) !== -1; }; }

  /* Kategoriespezifische Merkmale. Chips mit `tag` filtern über die Tag-Liste
     und sind im Formular anhakbar; Chips mit `test` werten andere Felder aus
     (Preis, indoor, allein) und werden nur gefiltert, nicht gepflegt. */
  var MERKMALE = {
    fruehstueck: [
      { id: "sitzen", chips: [ { label: "Draußensitzen", tag: "draussen" } ] },
      { id: "stil", chips: [ { label: "Klassisch", tag: "fr-klassisch" }, { label: "Fancy", tag: "fr-fancy" } ] },
      { id: "ende", chips: [ { label: "bis Mittag", tag: "fr-mittag" }, { label: "bis Nachmittag", tag: "fr-nachmittag" } ] }
    ],
    cafe: [
      { id: "sitzen", chips: [ { label: "Draußensitzen", tag: "draussen" } ] },
      { id: "stil", chips: [ { label: "Kaffeehaus", tag: "cafe-kaffeehaus" }, { label: "Spezialitätenkaffee", tag: "cafe-spezialitaet" } ] },
      { id: "suess", chips: [ { label: "Kuchen & Patisserie", tag: "cafe-kuchen" } ] }
    ],
    bar: [
      { id: "sitzen", chips: [ { label: "Draußensitzen", tag: "draussen" } ] },
      { id: "trinken", chips: [
        { label: "Cocktails", tag: "bar-cocktails" },
        { label: "Wein", tag: "bar-wein" },
        { label: "Bier", tag: "bar-bier" }
      ] },
      { id: "kueche", chips: [ { label: "Auch Essen", tag: "bar-essen" } ] }
    ],
    restaurant: [
      { id: "kueche", chips: [
        { label: "Traditionell", tag: "kueche-traditionell" },
        { label: "Italienisch", tag: "kueche-italienisch" },
        { label: "Asiatisch", tag: "kueche-asiatisch" },
        { label: "Griechisch", tag: "kueche-griechisch" },
        { label: "Indisch", tag: "kueche-indisch" },
        { label: "Fast Food", tag: "kueche-fastfood" },
        { label: "Steak & Burger", tag: "kueche-steakburger" }
      ] },
      { id: "stil", chips: [ { label: "Fancy", tag: "fancy" } ] }
    ],
    sehenswuerdigkeit: [
      { id: "preis", chips: [
        { label: "Kostenlos", test: function (o) { return o.preis === "kostenlos"; } },
        { label: "Mit Eintritt", test: function (o) { return o.preis !== "kostenlos"; } }
      ] }
    ],
    museum: [
      { id: "thema", chips: [
        { label: "Kunst", tag: "thema-kunst" },
        { label: "Natur", tag: "thema-natur" },
        { label: "Geschichte", tag: "thema-geschichte" },
        { label: "Technik", tag: "thema-technik" },
        { label: "Musik", tag: "thema-musik" },
        { label: "Angewandte Kunst", tag: "thema-angewandt" }
      ] }
    ],
    musik: [
      { id: "genre", chips: [
        { label: "Klassik", tag: "genre-klassik" },
        { label: "Jazz", tag: "genre-jazz" },
        { label: "Pop/Rock", tag: "genre-poprock" },
        { label: "Metal", tag: "genre-metal" }
      ] },
      { id: "groesse", chips: [
        { label: "Kleine Location", tag: "loc-klein" },
        { label: "Große Location", tag: "loc-gross" }
      ] },
      { id: "wetter", chips: [
        { label: "Indoor", test: function (o) { return o.indoor === true; } },
        { label: "Outdoor", test: function (o) { return o.indoor === false; } }
      ] }
    ],
    event: [
      { id: "art", chips: [
        { label: "Theater", tag: "event-theater" },
        { label: "Oper", tag: "event-oper" },
        { label: "Ballett", tag: "event-ballett" },
        { label: "Kabarett", tag: "event-kabarett" },
        { label: "Musical", tag: "event-musical" }
      ] }
    ],
    aktivitaet: [
      { id: "wetter", chips: [
        { label: "Indoor", test: function (o) { return o.indoor === true; } },
        { label: "Outdoor", test: function (o) { return o.indoor === false; } }
      ] },
      { id: "typ", chips: [
        { label: "Sport", tag: "akt-sport" },
        { label: "Logik & Rätsel", tag: "akt-logik" }
      ] },
      { id: "sozial", chips: [
        { label: "Gruppe", test: function (o) { return o.allein === false; } },
        { label: "Duo / allein", test: function (o) { return o.allein === true; } }
      ] }
    ]
  };

  /* Jedem Chip eine einheitliche test-Funktion geben: Die einen hängen an
     einem Eintrag in `tags`, die anderen leiten sich aus Feldern wie `preis`
     oder `indoor` ab. Danach lässt sich für jeden Ort gleich fragen, welche
     Merkmale auf ihn zutreffen. */
  Object.keys(MERKMALE).forEach(function (kat) {
    MERKMALE[kat].forEach(function (dim) {
      dim.chips.forEach(function (chip) {
        if (!chip.test) { chip.test = hatTag(chip.tag); }
      });
    });
  });

  var SPEICHER = "wien-karte-orte";
  var PLAN_SPEICHER = "wien-karte-plan";

  /* ------------------------------------------------------------------
     Zustand
     ------------------------------------------------------------------ */

  var orte = ladeOrte();
  var plan = ladePlan();
  var planLinie = null;
  var ziehIndex = null;
  var aktiveKategorien = new Set();
  var aktiveSchalter = new Set();
  var suchtext = "";
  var markerNach = {};
  var gewaehlt = null;
  /* Ort, der trotz Tagesplan-Filter farbig bleibt, weil er gerade
     angeklickt wurde. Wird beim Herausnehmen aus dem Plan gelöscht. */
  var hervorgehoben = null;
  var bearbeiten = false;
  var formularId = null;
  var wartetAufKlick = false;
  var markerVorschau = null;

  function ladeOrte() {
    try {
      var roh = window.localStorage.getItem(SPEICHER);
      if (roh) {
        var geparst = JSON.parse(roh);
        /* Überholt, wenn ein Eintrag noch alte Kategorien trägt oder das
           Feld `tags` fehlt (Stand von vor den Merkmalen). Dann verwerfen,
           damit der Datenbestand aus daten.js greift. */
        var veraltet = Array.isArray(geparst) && geparst.some(function (o) {
          return ALTE_SCHLUESSEL.indexOf(o.kategorie) !== -1 || !("tags" in o);
        });
        if (veraltet) { window.localStorage.removeItem(SPEICHER); }
        else if (Array.isArray(geparst) && geparst.length) { return geparst; }
      }
    } catch (e) { /* localStorage gesperrt oder Inhalt kaputt */ }
    return JSON.parse(JSON.stringify(ORTE));
  }

  function hatEigenenStand() {
    try { return !!window.localStorage.getItem(SPEICHER); } catch (e) { return false; }
  }

  function speichere() {
    try { window.localStorage.setItem(SPEICHER, JSON.stringify(orte)); }
    catch (e) { window.alert("Der Browser lässt das Speichern nicht zu. Exportiere die Datei, sonst gehen die Änderungen beim Neuladen verloren."); }
    zeigeMerker();
  }

  /* ------------------------------------------------------------------
     Tagesplan
     ------------------------------------------------------------------
     Der Plan ist eine Liste von Einträgen { id, abschnitt } in einem
     eigenen Speicher, getrennt von den Orten. `abschnitt` ist null,
     solange die Zuordnung aus Kategorie und Position abgeleitet wird;
     zieht man einen Eintrag auf eine Überschrift, wird sie festgesetzt.
     Der Plan lebt nur in diesem Browser. */

  function ladePlan() {
    try {
      var roh = window.localStorage.getItem(PLAN_SPEICHER);
      if (roh) {
        var geparst = JSON.parse(roh);
        if (Array.isArray(geparst)) {
          /* Frühere Fassungen speicherten bloße ids. */
          return geparst.map(function (x) {
            if (typeof x === "string") { return { id: x, abschnitt: null }; }
            if (x && typeof x.id === "string") { return { id: x.id, abschnitt: x.abschnitt || null }; }
            return null;
          }).filter(Boolean);
        }
      }
    } catch (e) { /* egal */ }
    return [];
  }

  /* Einträge ohne passenden Ort fallen still heraus, etwa nach dem Löschen. */
  function bereinigePlan() {
    plan = plan.filter(function (e) {
      return orte.some(function (o) { return o.id === e.id; });
    });
  }

  function speicherePlan() {
    try { window.localStorage.setItem(PLAN_SPEICHER, JSON.stringify(plan)); }
    catch (e) { /* Speicher gesperrt: Plan bleibt für diese Sitzung im Arbeitsspeicher */ }
  }

  function planPosition(id) {
    for (var i = 0; i < plan.length; i += 1) {
      if (plan[i].id === id) { return i; }
    }
    return -1;
  }

  function imPlan(id) { return planPosition(id) !== -1; }

  function planUmschalten(id) {
    var i = planPosition(id);
    if (i === -1) {
      plan.push({ id: id, abschnitt: null });
    } else {
      plan.splice(i, 1);
      /* Herausgenommen heißt: der Ort soll sofort zurücktreten. */
      if (hervorgehoben === id) { hervorgehoben = null; }
    }
    speicherePlan();
    zeichnePlan();
    aktualisiere();
    aktualisiereMarkerIcons();
    zeichneLinie();

    /* Das Ortsblatt hängt an keinem der obigen Neuzeichner — sein Knopf muss
       von Hand nachgezogen werden, sonst steht dort weiter „+ Zum Tag“. */
    var blatt = document.getElementById("ort-blatt");
    var knopf = blatt && !blatt.hidden ? blatt.querySelector(".plan-knopf") : null;
    if (knopf) {
      var drin = imPlan(knopf.dataset.id);
      knopf.classList.toggle("drin", drin);
      knopf.setAttribute("aria-pressed", drin ? "true" : "false");
      knopf.textContent = drin ? "✓ Im Tag" : "+ Zum Tag";
    }
  }

  function planEntfernen(id) {
    var i = planPosition(id);
    if (i === -1) { return; }
    plan.splice(i, 1);
    if (hervorgehoben === id) { hervorgehoben = null; }
    speicherePlan();
    zeichnePlan();
    aktualisiere();
    aktualisiereMarkerIcons();
    zeichneLinie();
  }

  function planLeeren() {
    if (!plan.length) { return; }
    if (!window.confirm("Den ganzen Tagesplan leeren?")) { return; }
    plan = [];
    speicherePlan();
    zeichnePlan();
    aktualisiere();
    aktualisiereMarkerIcons();
    zeichneLinie();
  }

  function planOrte() {
    return plan.map(function (e) {
      return orte.find(function (o) { return o.id === e.id; });
    }).filter(Boolean);
  }

  function zeichnePlan() {
    var ol = document.getElementById("plan-liste");
    var leer = document.getElementById("plan-leer");
    var fuss = document.getElementById("plan-fuss");
    var zahl = document.getElementById("plan-zahl");
    if (!ol) { return; }

    ol.innerHTML = "";
    var liste = planOrte();
    zahl.textContent = liste.length;
    zahl.hidden = liste.length === 0;
    leer.hidden = liste.length > 0;
    fuss.hidden = liste.length === 0;

    /* Alle vier Abschnitte bleiben stehen, auch leere — der Tag ist ein
       Gerüst, in das man einsortiert. */
    var abschnitte = abschnitteFuer(liste);

    /* Neben der Überschrift: wie viele Stopps und welche Tageszeiten schon
       belegt sind. Beantwortet die Frage „reicht das für einen Tag?“, ohne
       dass man die Liste durchzählt. */
    var summe = document.getElementById("plan-summe");
    if (summe) {
      var belegt = ROUTE.abschnitte.filter(function (a) {
        return abschnitte.indexOf(a.id) !== -1;
      }).length;
      summe.textContent = liste.length === 1
        ? "1 Stopp"
        : liste.length + " Stopps in " + belegt + " von 4 Tageszeiten";
      summe.hidden = liste.length === 0;
    }

    var ausgegeben = 0;
    ROUTE.abschnitte.forEach(function (abschnitt) {
      var drin = [];
      liste.forEach(function (ort, i) {
        if (abschnitte[i] === abschnitt.id) { drin.push({ ort: ort, index: i }); }
      });

      var kopf = document.createElement("li");
      kopf.className = "plan-abschnitt" + (drin.length ? "" : " leer");
      kopf.textContent = abschnitt.titel;

      /* Ein Eintrag lässt sich auf die Überschrift ziehen und landet dann
         am Anfang dieses Abschnitts — auch wenn er noch leer ist. */
      var einfuegePos = ausgegeben;
      kopf.addEventListener("dragover", function (e) {
        if (ziehIndex === null) { return; }
        e.preventDefault();
        if (e.dataTransfer) { e.dataTransfer.dropEffect = "move"; }
        kopf.classList.add("ueber");
      });
      kopf.addEventListener("dragleave", function () { kopf.classList.remove("ueber"); });
      kopf.addEventListener("drop", function (e) {
        e.preventDefault();
        kopf.classList.remove("ueber");
        if (ziehIndex === null) { return; }
        var ziel = ziehIndex < einfuegePos ? einfuegePos - 1 : einfuegePos;
        var bewegt = plan.splice(ziehIndex, 1)[0];
        /* Der Abschnitt wird hier ausdrücklich gesetzt und bleibt dann
           auch dann bestehen, wenn die Kategorie etwas anderes nahelegt. */
        bewegt.abschnitt = abschnitt.id;
        plan.splice(ziel, 0, bewegt);
        speicherePlan();
        zeichnePlan();
        aktualisiereMarkerIcons();
        zeichneLinie();
      });

      ol.appendChild(kopf);
      drin.forEach(function (eintrag) {
        ol.appendChild(planEintrag(eintrag.ort, eintrag.index, abschnitt.id));
      });
      ausgegeben += drin.length;
    });

    var route = document.getElementById("plan-route");
    if (route) {
      if (liste.length) {
        var stopps = liste.map(function (o) { return encodeURIComponent(o.name + ", " + o.adresse); });
        route.href = "https://www.google.com/maps/dir/" + stopps.join("/");
      } else {
        route.removeAttribute("href");
      }
    }
  }

  /* Ein Eintrag der Tagesplan-Liste. `i` ist die Position im Plan und
     bleibt maßgeblich fürs Umsortieren, `abschnittId` der Abschnitt, in
     dem der Eintrag gerade steht. */
  function planEintrag(ort, i, abschnittId) {
    var k = KATEGORIEN[ort.kategorie] || KATEGORIEN.aktivitaet;
    var li = document.createElement("li");
    li.className = "plan-eintrag";
    li.draggable = true;
    li.dataset.id = ort.id;
    li.dataset.index = i;
    li.dataset.abschnitt = abschnittId;
    li.innerHTML =
      '<span class="plan-griff" aria-hidden="true">⠿</span>' +
      '<span class="plan-nr" style="background:' + k.farbe + '">' + (i + 1) + "</span>" +
      miniatur(ort, "plan-bild") +
      '<span class="plan-text"><span class="plan-name">' + entschaerfe(ort.name) + "</span>" +
      '<span class="plan-adresse">' + entschaerfe(ort.adresse) + "</span></span>" +
      '<button type="button" class="plan-weg" title="Aus dem Plan nehmen" aria-label="Aus dem Plan nehmen">✕</button>';

    li.querySelector(".plan-weg").addEventListener("click", function (e) {
      e.stopPropagation();
      planEntfernen(ort.id);
    });
    li.addEventListener("click", function (e) {
      if (e.target.closest(".plan-weg")) { return; }
      waehle(ort.id, true);
    });

    /* Ohne dataTransfer.setData startet Firefox den Ziehvorgang gar nicht. */
    li.addEventListener("dragstart", function (e) {
      ziehIndex = i;
      li.classList.add("zieht");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", ort.id); } catch (fehler) { /* ältere Browser */ }
      }
    });
    li.addEventListener("dragend", function () { li.classList.remove("zieht"); ziehIndex = null; });
    li.addEventListener("dragover", function (e) {
      e.preventDefault();
      if (e.dataTransfer) { e.dataTransfer.dropEffect = "move"; }
      li.classList.add("ueber");
    });
    li.addEventListener("dragleave", function () { li.classList.remove("ueber"); });
    li.addEventListener("drop", function (e) {
      e.preventDefault();
      li.classList.remove("ueber");
      if (ziehIndex === null || ziehIndex === i) { return; }
      /* Beim Ablegen auf einem Eintrag zählt der Abschnitt, in dem er
         gerade steht — nicht der gespeicherte, der oft leer ist. */
      var zielAbschnitt = li.dataset.abschnitt || null;
      var bewegt = plan.splice(ziehIndex, 1)[0];
      bewegt.abschnitt = zielAbschnitt;
      plan.splice(i, 0, bewegt);
      speicherePlan();
      zeichnePlan();
      aktualisiereMarkerIcons();
      zeichneLinie();
    });

    return li;
  }

  /* ------------------------------------------------------------------
     Eigener Standort
     ------------------------------------------------------------------
     Roter Punkt plus Genauigkeitskreis über die Standortabfrage des
     Browsers. Läuft nur über https (GitHub Pages), nicht per file://. */

  var standortMarker = null;
  var standortKreis = null;
  var standortWatch = null;

  function standortUmschalten(knopf) {
    if (standortWatch !== null) { standortAus(knopf); return; }
    if (!navigator.geolocation) {
      window.alert("Dein Browser kann den Standort nicht bestimmen.");
      return;
    }
    knopf.classList.add("laedt");
    standortWatch = navigator.geolocation.watchPosition(
      function (pos) { standortGesetzt(pos, knopf); },
      function (fehler) { standortFehler(fehler, knopf); },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
  }

  function standortGesetzt(pos, knopf) {
    knopf.classList.remove("laedt");
    knopf.classList.add("aktiv");
    var ll = [pos.coords.latitude, pos.coords.longitude];
    var erst = standortMarker === null;

    if (erst) {
      standortMarker = L.marker(ll, {
        icon: L.divIcon({ className: "", html: '<div class="standort-punkt"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }),
        zIndexOffset: 2000,
        interactive: false,
        keyboard: false
      }).addTo(karte);
      standortKreis = L.circle(ll, {
        radius: pos.coords.accuracy, color: "#e03131", weight: 1,
        fillColor: "#e03131", fillOpacity: 0.12, interactive: false
      }).addTo(karte);
      karte.flyTo(ll, Math.max(karte.getZoom(), 15), { duration: 0.6 });
    } else {
      standortMarker.setLatLng(ll);
      standortKreis.setLatLng(ll).setRadius(pos.coords.accuracy);
    }
  }

  function standortFehler(fehler, knopf) {
    standortAus(knopf);
    var text = "Der Standort ließ sich nicht bestimmen.";
    if (fehler && fehler.code === 1) { text = "Der Zugriff auf den Standort wurde abgelehnt. In den Browser-Einstellungen lässt er sich wieder erlauben."; }
    else if (fehler && fehler.code === 3) { text = "Die Standortbestimmung hat zu lange gebraucht. Versuch es noch einmal."; }
    window.alert(text);
  }

  function standortAus(knopf) {
    if (standortWatch !== null) { navigator.geolocation.clearWatch(standortWatch); standortWatch = null; }
    if (standortMarker) { karte.removeLayer(standortMarker); standortMarker = null; }
    if (standortKreis) { karte.removeLayer(standortKreis); standortKreis = null; }
    if (knopf) { knopf.classList.remove("laedt", "aktiv"); }
  }

  var StandortSteuerung = L.Control.extend({
    options: { position: "bottomleft" },
    onAdd: function () {
      var c = L.DomUtil.create("div", "leaflet-bar standort-steuerung");
      var a = L.DomUtil.create("a", "", c);
      a.href = "#";
      a.setAttribute("role", "button");
      a.setAttribute("aria-label", "Meinen Standort zeigen");
      a.title = "Meinen Standort zeigen";
      a.innerHTML = "◉";
      L.DomEvent.on(a, "click", function (e) {
        L.DomEvent.preventDefault(e);
        L.DomEvent.stopPropagation(e);
        standortUmschalten(a);
      });
      return c;
    }
  });

  /* Der Bearbeiten-Schalter saß früher in einem Streifen unter der Karte.
     Der Streifen ist weg — der Schalter schwebt jetzt als Leaflet-Steuerung
     unten links über der Karte. Als Steuerung und nicht als abgesetzter Kasten,
     damit Leaflet ihn über Standort und Zoom stapelt und er beim Aufschwenken
     der Ergebnisspalte von selbst mitwandert. Zuletzt hinzugefügt heißt bei
     den unteren Ecken: ganz oben im Stapel. */
  var BearbeitenSteuerung = L.Control.extend({
    options: { position: "bottomleft" },
    onAdd: function () {
      var c = L.DomUtil.create("div", "leaflet-bar bearbeiten-steuerung");
      var b = L.DomUtil.create("button", "", c);
      b.type = "button";
      b.id = "bearbeiten-schalter";
      b.textContent = "Bearbeiten";
      /* Sonst zöge ein Klick die Karte mit oder zoomte beim Doppelklick. */
      L.DomEvent.disableClickPropagation(c);
      L.DomEvent.on(b, "click", function (e) {
        L.DomEvent.preventDefault(e);
        schalteBearbeiten(!bearbeiten);
      });
      return c;
    }
  });

  /* Linie über die Karte in der Reihenfolge des Plans. */
  function zeichneLinie() {
    if (planLinie) { karte.removeLayer(planLinie); planLinie = null; }
    var liste = planOrte();
    if (liste.length < 2) { return; }
    var punkte = liste.map(function (o) { return [o.lat, o.lng]; });
    planLinie = L.polyline(punkte, {
      color: "#1d1a16", weight: 2, opacity: 0.6, dashArray: "5,7"
    }).addTo(karte);
  }

  /* ------------------------------------------------------------------
     Route berechnen
     ------------------------------------------------------------------ */

  /* Gerechnet wird ab dem eigenen Standort, sonst ab der Innenstadt. */
  function routeStart() {
    if (standortMarker) {
      var ll = standortMarker.getLatLng();
      return [ll.lat, ll.lng];
    }
    return ROUTE.ersatzStart;
  }

  function meter(a, b) {
    return L.latLng(a[0], a[1]).distanceTo(L.latLng(b[0], b[1]));
  }

  /* Orte, die zu Kategorieauswahl, Zeitfenster und Umkreis passen.
     Deckt ein Ort mehrere gewählte Kategorien ab, zählt die früheste. */
  function routeKandidaten(vorgaben) {
    var fenster = ROUTE.fenster[vorgaben.fenster];
    var start = routeStart();
    var treffer = [];

    orte.forEach(function (ort) {
      var passende = kategorienVon(ort).filter(function (k) {
        if (vorgaben.kategorien.indexOf(k) === -1) { return false; }
        return phasenVon(ort, k).some(function (p) {
          return fenster.phasen.indexOf(p) !== -1;
        });
      });
      if (!passende.length) { return; }

      passende.sort(function (a, b) {
        return (ROUTE.rang[a] || 9) - (ROUTE.rang[b] || 9);
      });
      var kat = passende[0];
      var d = meter(start, [ort.lat, ort.lng]);
      if (vorgaben.umkreis && d > ROUTE.umkreisMeter) { return; }

      treffer.push({
        ort: ort, kategorie: kat,
        punkte: ROUTE.punkte[kat] || 2,
        abStart: d
      });
    });

    return treffer;
  }

  /* Baut einen Tagesvorschlag. Rückgabe entweder { fehler, … } oder
     { stopps, summe, budget }.

     `gesperrt` ordnet Ort-ids einen Tagesabschnitt zu. Diese Stopps werden
     nicht gewürfelt, sondern vorbelegt: Sie stehen fest, verbrauchen ihre
     Punkte vom Budget und belegen ihre Kategorie. Gewürfelt wird nur noch,
     was danach übrig ist. */
  function routeBerechnen(vorgaben, gesperrt) {
    gesperrt = gesperrt || {};
    var fenster = ROUTE.fenster[vorgaben.fenster];
    var kandidaten = routeKandidaten(vorgaben);

    if (!kandidaten.length) {
      return { fehler: "leer", umkreis: vorgaben.umkreis };
    }

    /* Pflichtkategorien, die gewählt sind, aber keinen Kandidaten haben. */
    var unerfuellbar = fenster.mindestens.filter(function (k) {
      if (vorgaben.kategorien.indexOf(k) === -1) { return false; }
      return !kandidaten.some(function (c) { return c.kategorie === k; });
    });
    if (unerfuellbar.length) {
      return { fehler: "pflicht", fehlend: unerfuellbar, umkreis: vorgaben.umkreis };
    }

    var gewaehlt = [];
    var summe = 0;
    var proKategorie = {};
    var letzter = routeStart();

    /* Zwischen zwei Restaurants muss etwas liegen — sonst stünden Mittag-
       und Abendessen unmittelbar hintereinander. */
    function hatZwischenstopp() {
      return gewaehlt.some(function (g) {
        return ["museum", "sehenswuerdigkeit", "aktivitaet"].indexOf(g.kategorie) !== -1;
      });
    }

    function frei(c) {
      if (gewaehlt.indexOf(c) !== -1) { return false; }
      if (summe + c.punkte > fenster.budget) { return false; }
      var max = ROUTE.hoechstens[c.kategorie];
      if (max && (proKategorie[c.kategorie] || 0) >= max) { return false; }
      if (c.kategorie === "restaurant" && (proKategorie.restaurant || 0) >= 1 && !hatZwischenstopp()) {
        return false;
      }
      return true;
    }

    /* Unter den drei nächstgelegenen einen zufällig — hält die Wege kurz
       und macht „Neu würfeln“ sinnvoll. */
    function nimmNahen(liste) {
      var nah = liste.slice().sort(function (a, b) {
        return meter(letzter, [a.ort.lat, a.ort.lng]) - meter(letzter, [b.ort.lat, b.ort.lng]);
      }).slice(0, 3);
      var c = nah[Math.floor(Math.random() * nah.length)];
      gewaehlt.push(c);
      summe += c.punkte;
      proKategorie[c.kategorie] = (proKategorie[c.kategorie] || 0) + 1;
      letzter = [c.ort.lat, c.ort.lng];
    }

    /* Die gesperrten zuerst — vor allem anderen. Die Kandidatenobjekte sind
       bei jedem Lauf neue, verbunden werden sie über die Ort-id. Danach
       greifen alle Regeln von selbst: `frei()` lässt keinen zweiten Ort
       derselben Höchstmenge zu, und aufgefüllt wird von hier aus. */
    Object.keys(gesperrt).forEach(function (id) {
      var c = kandidaten.filter(function (x) { return x.ort.id === id; })[0];
      if (!c || gewaehlt.indexOf(c) !== -1) { return; }
      gewaehlt.push(c);
      summe += c.punkte;
      proKategorie[c.kategorie] = (proKategorie[c.kategorie] || 0) + 1;
      letzter = [c.ort.lat, c.ort.lng];
    });

    fenster.mindestens.forEach(function (k) {
      if (vorgaben.kategorien.indexOf(k) === -1) { return; }
      var moegliche = kandidaten.filter(function (c) { return c.kategorie === k && frei(c); });
      if (moegliche.length) { nimmNahen(moegliche); }
    });

    /* Abwechslung geht vor: erst Kategorien, die noch fehlen. Sonst
       gewinnen die Restaurants, weil es von ihnen am meisten gibt. */
    var schutz = 0;
    while (summe < fenster.budget && schutz < 40) {
      schutz += 1;
      var moegliche = kandidaten.filter(frei);
      if (!moegliche.length) { break; }
      var neue = moegliche.filter(function (c) { return !proKategorie[c.kategorie]; });
      nimmNahen(neue.length ? neue : moegliche);
    }

    /* Grobe Reihenfolge, danach die Verteilung auf die Tagesabschnitte. */
    gewaehlt.sort(function (a, b) {
      var r = (ROUTE.rang[a.kategorie] || 9) - (ROUTE.rang[b.kategorie] || 9);
      return r !== 0 ? r : a.abStart - b.abStart;
    });
    verteileAbschnitte(gewaehlt, vorgaben.fenster);

    /* Das Schloss hält auch den Platz im Tag. Die Verteilung hat gerade allen
       einen Abschnitt neu zugewiesen; die gesperrten bekommen ihren gemerkten
       zurück. */
    gewaehlt.forEach(function (c) {
      if (gesperrt[c.ort.id]) { c.abschnitt = gesperrt[c.ort.id]; }
    });

    /* Ein Nachlauf für den einen Fall, in dem das kollidiert: Die Verteilung
       setzt genau ein Restaurant auf „Mittags“ und weitere auf „Abends“. Ist
       das gesperrte in der Sortierung das zweite, stünden danach zwei am
       Mittag. Das ungesperrte weicht dann aus. */
    ["mittag", "abend"].forEach(function (a) {
      var drin = gewaehlt.filter(function (c) {
        return c.kategorie === "restaurant" && c.abschnitt === a;
      });
      if (drin.length < 2) { return; }
      drin.forEach(function (c) {
        if (Object.prototype.hasOwnProperty.call(gesperrt, c.ort.id)) { return; }
        c.abschnitt = a === "mittag" ? "abend" : "mittag";
      });
    });

    /* Innerhalb eines Abschnitts zählt erst die Tageslogik — das Frühstück
       kommt vor der Sehenswürdigkeit —, danach die Nähe. */
    var folge = ROUTE.abschnitte.map(function (a) { return a.id; });
    gewaehlt.sort(function (a, b) {
      var r = folge.indexOf(a.abschnitt) - folge.indexOf(b.abschnitt);
      if (r !== 0) { return r; }
      var rang = (ROUTE.rang[a.kategorie] || 9) - (ROUTE.rang[b.kategorie] || 9);
      return rang !== 0 ? rang : a.abStart - b.abStart;
    });

    return {
      stopps: gewaehlt,
      summe: summe,
      budget: fenster.budget,
      kandidaten: kandidaten.length
    };
  }

  /* Abschnitte für den Tagesplan. Festgesetzte Werte gewinnen; die
     übrigen werden aus Kategorie und Lage zum Mittagessen abgeleitet
     und dürfen dabei nie hinter einen festgesetzten zurückfallen. */
  function abschnitteFuer(orteListe) {
    var stopps = orteListe.map(function (o) {
      return { ort: o, kategorie: o.kategorie };
    });
    verteileAbschnitte(stopps, "ganztag", true);

    var folge = ROUTE.abschnitte.map(function (a) { return a.id; });
    var mindestens = 0;
    return stopps.map(function (s, i) {
      var gesetzt = plan[i] && plan[i].abschnitt;
      var abschnitt = gesetzt && folge.indexOf(gesetzt) !== -1 ? gesetzt : s.abschnitt;
      var idx = folge.indexOf(abschnitt);
      if (idx < mindestens) { abschnitt = folge[mindestens]; }
      else { mindestens = idx; }
      return abschnitt;
    });
  }

  function abschnittTitel(id) {
    var a = ROUTE.abschnitte.filter(function (x) { return x.id === id; })[0];
    return a ? a.titel : "";
  }

  /* Weist jedem Stopp einen Tagesabschnitt zu. Das erste Restaurant wird
     zum Mittagessen, ein zweites zum Abendessen; Museen und Ähnliches
     verteilen sich auf Vormittag und Nachmittag. */
  function verteileAbschnitte(stopps, fensterId, nachPosition) {
    var restaurants = 0;
    var tagsueber = 0;
    var mittagVergeben = false;

    stopps.forEach(function (c) {
      var k = c.kategorie;

      if (fensterId === "abend") { c.abschnitt = "abend"; return; }

      if (k === "fruehstueck") { c.abschnitt = "vormittag"; return; }
      if (k === "musik" || k === "event" || k === "bar") { c.abschnitt = "abend"; return; }

      if (k === "restaurant") {
        restaurants += 1;
        if (restaurants === 1) { c.abschnitt = "mittag"; mittagVergeben = true; }
        else { c.abschnitt = "abend"; }
        return;
      }

      /* Museum, Sehenswürdigkeit, Aktivität. Bei einer vorgegebenen
         Reihenfolge (Tagesplan) entscheidet die Lage zum Mittagessen,
         beim frisch gebauten Vorschlag die Verteilung auf beide Hälften. */
      if (fensterId === "vormittag") { c.abschnitt = "vormittag"; return; }
      if (nachPosition) {
        c.abschnitt = mittagVergeben ? "nachmittag" : "vormittag";
      } else {
        tagsueber += 1;
        c.abschnitt = tagsueber === 1 ? "vormittag" : "nachmittag";
      }
    });
  }

  /* ------------------------------------------------------------------
     Karte
     ------------------------------------------------------------------ */

  /* Zoom unten links statt oben links: Oben liegt in beiden Zuständen die
     Chipreihe. Rechts unten ist auch belegt — dort stehen „Route vorschlagen“
     und „Mein Tag“. */
  var karte = L.map("karte", { zoomControl: false, scrollWheelZoom: true })
    .setView([48.2082, 16.3730], 13);

  L.control.zoom({ position: "bottomleft" }).addTo(karte);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(karte);

  karte.on("click", function (e) {
    if (wartetAufKlick) {
      setzeFormularfeld("lat", e.latlng.lat.toFixed(7));
      setzeFormularfeld("lng", e.latlng.lng.toFixed(7));
      wartetAufKlick = false;
      document.body.classList.remove("setzt-position");
    }
  });

  function symbol(ort, gross) {
    var k = KATEGORIEN[ort.kategorie] || KATEGORIEN.aktivitaet;
    var pos = planPosition(ort.id);
    var geplant = pos !== -1 ? " geplant" : "";
    var nummer = pos !== -1 ? '<b class="pin-nr">' + (pos + 1) + "</b>" : "";

    /* Sobald etwas im Plan liegt, treten alle übrigen Orte zurück.
       Ausnahme ist der gerade angeklickte Ort — nimmt man ihn aber aus
       dem Plan, verfällt diese Ausnahme und er graut sofort aus. */
    if (plan.length && pos === -1 && ort.id !== hervorgehoben) { geplant = " gedimmt"; }

    /* Ein Bauplan für beide: Kreis in der Kategoriefarbe mit einer Spitze
       darunter, die auf der Koordinate steht. Die Spitze ist ein gedrehtes
       Quadrat hinter dem Kreis — der Kreis selbst beschneidet sein Inneres
       (`overflow: hidden`, damit das Foto rund bleibt) und könnte nichts
       hinauslassen. Die Nummer sitzt aus demselben Grund im Wrapper.
       Der einzige Unterschied ist, ob ein Foto darüberliegt. */
    var d = gross ? 44 : 36;
    var spitze = gross ? 12 : 10;
    var klasse = ort.bild ? "bildpin" : "pin";
    var foto = ort.bild
      ? '<img src="' + entschaerfe(ort.bild) + '" alt="" onerror="this.remove()">'
      : "";

    return L.divIcon({
      className: "",
      html: '<div class="pinwrap">' +
        '<i class="pin-spitze' + (gross ? " gross" : "") + '" style="background:' + k.farbe + '"></i>' +
        '<div class="' + klasse + (gross ? " gross" : "") + geplant +
        '" style="border-color:' + k.farbe + ";background:" + k.farbe + '">' +
        "<span>" + k.zeichen + "</span>" + foto + "</div>" +
        nummer + "</div>",
      iconSize: [d, d + spitze],
      iconAnchor: [d / 2, d + spitze],
      popupAnchor: [0, -(d + spitze)]
    });
  }

  /* Icons neu setzen, wenn sich der Plan ändert (Nummer und Hervorhebung). */
  function aktualisiereMarkerIcons() {
    Object.keys(markerNach).forEach(function (id) {
      var o = orte.find(function (x) { return x.id === id; });
      if (!o) { return; }
      markerNach[id].setIcon(symbol(o, id === gewaehlt));
      markerNach[id].setPopupContent(popupInhalt(o));
      /* Geplante Orte nach vorn, damit sie nicht verdeckt werden. */
      markerNach[id].setZIndexOffset(imPlan(id) ? 500 : 0);
    });
  }

  /* Miniatur für Liste und Popup: Foto, sonst farbiges Feld mit Symbol. */
  function miniatur(ort, klasse) {
    var k = KATEGORIEN[ort.kategorie] || KATEGORIEN.aktivitaet;
    return '<div class="' + klasse + '" style="background:' + k.farbe + '">' +
      "<span>" + k.zeichen + "</span>" +
      (ort.bild ? '<img src="' + entschaerfe(ort.bild) + '" alt="" onerror="this.remove()">' : "") +
      "</div>";
  }

  /* Plus-/Haken-Knopf zum Ein- und Auslegen in den Tagesplan. */
  function planKnopf(id) {
    var drin = imPlan(id);
    var titel = drin ? "Aus dem Tagesplan nehmen" : "Zum Tagesplan hinzufügen";
    return '<button type="button" class="plan-knopf' + (drin ? " drin" : "") +
      '" data-id="' + id + '"' +
      ' aria-pressed="' + (drin ? "true" : "false") + '"' +
      ' title="' + titel + '" aria-label="' + titel + '">' +
      (drin ? "✓ Im Tag" : "+ Zum Tag") + "</button>";
  }

  function routenLink(ort) {
    return "https://www.google.com/maps/dir/?api=1&destination=" +
      encodeURIComponent(ort.name + ", " + ort.adresse);
  }

  function popupInhalt(ort) {
    var k = KATEGORIEN[ort.kategorie] || KATEGORIEN.aktivitaet;
    var teile = [];
    if (ort.bild) {
      teile.push('<span class="popup-bild"><img src="' + entschaerfe(ort.bild) +
        '" alt="" onerror="this.parentNode.remove()"></span>');
    }
    teile.push('<span class="popup-titel">' + entschaerfe(ort.name) + "</span>");
    teile.push('<span class="popup-adresse">' + entschaerfe(ort.adresse) + "</span>");
    teile.push("<span>" + entschaerfe(ort.beschreibung) + "</span>");
    var links = [];
    if (ort.website) {
      links.push('<a href="' + entschaerfe(ort.website) + '" target="_blank" rel="noopener" style="color:' + k.farbe + '">Website</a>');
    }
    links.push('<a href="' + routenLink(ort) + '" target="_blank" rel="noopener" style="color:' + k.farbe + '">Route</a>');
    teile.push('<span class="popup-links">' + links.join("") + "</span>");
    teile.push('<span class="popup-plan">' + planKnopf(ort.id) + "</span>");
    return teile.join("");
  }

  function baueMarker() {
    Object.keys(markerNach).forEach(function (id) { karte.removeLayer(markerNach[id]); });
    markerNach = {};
    orte.forEach(function (ort) {
      var m = L.marker([ort.lat, ort.lng], {
        icon: symbol(ort, false), title: ort.name, riseOnHover: true
      });
      /* Auf dem Handy tritt das Ortsblatt an die Stelle des Popups. Es gar
         nicht erst zu binden ist der einzige saubere Weg — Leaflet öffnet ein
         gebundenes Popup beim Klick von sich aus, noch bevor unser eigener
         Zuhörer an die Reihe kommt.
         Reichlich Rand oben, damit das hohe Popup samt Bild hineinpasst. */
      if (!istHandy()) {
        m.bindPopup(popupInhalt(ort), { autoPanPadding: L.point(24, 90) });
      }
      m.on("click", function () { waehle(ort.id, false, "karte"); });
      markerNach[ort.id] = m;
    });
  }

  /* ------------------------------------------------------------------
     Filter
     ------------------------------------------------------------------ */

  function sichtbare() {
    var suche = suchtext.trim().toLowerCase();
    return orte.filter(function (ort) {
      if (aktiveKategorien.size) {
        var trifft = kategorienVon(ort).some(function (k) { return aktiveKategorien.has(k); });
        if (!trifft) { return false; }
      }
      var alleSchalter = SCHALTER.every(function (s) {
        return !aktiveSchalter.has(s.id) || s.pruef(ort);
      });
      if (!alleSchalter) { return false; }
      if (suche) {
        var heuhaufen = (ort.name + " " + ort.adresse + " " + ort.beschreibung).toLowerCase();
        if (heuhaufen.indexOf(suche) === -1) { return false; }
      }
      return true;
    });
  }

  /* Welche Merkmale auf einen Ort zutreffen. Sie sind hier nicht mehr zum
     Anklicken da, sondern zum Lesen: Sie stehen als kleine Marken im
     Listeneintrag und sagen, was der Ort ist — italienisch, Jazz, draußen.
     Ein Ort kann mehreren Kategorien angehören; „Draußensitzen“ steht bei
     Frühstück, Café und Bar, soll aber nur einmal erscheinen. */
  function merkmaleVon(ort) {
    var labels = [];
    kategorienVon(ort).forEach(function (kat) {
      (MERKMALE[kat] || []).forEach(function (dim) {
        dim.chips.forEach(function (chip) {
          if (chip.test(ort) && labels.indexOf(chip.label) === -1) {
            labels.push(chip.label);
          }
        });
      });
    });
    return labels;
  }

  function merkmalMarken(ort) {
    var labels = merkmaleVon(ort);
    if (!labels.length) { return ""; }
    return '<p class="merkmal-marken">' + labels.map(function (l) {
      return '<span class="merkmal-marke">' + entschaerfe(l) + "</span>";
    }).join("") + "</p>";
  }

  /* ------------------------------------------------------------------
     Waagrecht scrollbare Chipreihen
     ------------------------------------------------------------------
     Am Handy wischt man, am großen Schirm gibt es dafür keine Geste — dort
     blättern zwei Pfeile, und sie zeigen sich nur, solange es in ihre
     Richtung noch etwas zu sehen gibt. */

  var ruhigerModus = window.matchMedia("(prefers-reduced-motion: reduce)");

  function verdrahteScroller(huelle) {
    var reihe = huelle.querySelector(".kat-leiste");
    var links = huelle.querySelector(".kat-blaettern.links");
    var rechts = huelle.querySelector(".kat-blaettern.rechts");
    if (!reihe || !links || !rechts) { return; }

    function pruefe() {
      /* Ein Rest von einem Pixel entsteht durch gebrochene Breiten und wäre
         sonst ein Pfeil, der ins Leere blättert. */
      var mehrRechts = reihe.scrollLeft + reihe.clientWidth < reihe.scrollWidth - 1;
      links.hidden = reihe.scrollLeft <= 0;
      rechts.hidden = !mehrRechts;
    }

    function blaettere(richtung) {
      reihe.scrollBy({
        left: richtung * reihe.clientWidth * 0.8,
        behavior: ruhigerModus.matches ? "auto" : "smooth"
      });
    }

    links.addEventListener("click", function () { blaettere(-1); });
    rechts.addEventListener("click", function () { blaettere(1); });
    reihe.addEventListener("scroll", pruefe, { passive: true });
    window.addEventListener("resize", pruefe);

    /* Der Fokusring wandert über die Tastatur sonst aus dem Bild. */
    reihe.addEventListener("focusin", function (e) {
      if (e.target.scrollIntoView) {
        e.target.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    });

    huelle.pruefeScroller = pruefe;
    pruefe();
  }

  /* Nach jedem Neuzeichnen einer Reihe stimmen die Pfeile wieder. */
  function pruefeScroller() {
    document.querySelectorAll(".kat-scroller").forEach(function (h) {
      if (h.pruefeScroller) { h.pruefeScroller(); }
    });
  }

  function zeichneFilter() {
    var behaelter = document.getElementById("kategorien");
    behaelter.innerHTML = "";

    Object.keys(KATEGORIEN).forEach(function (schluessel) {
      var k = KATEGORIEN[schluessel];
      var b = document.createElement("button");
      b.type = "button";
      b.className = "kat-chip";
      b.style.setProperty("--ton", k.farbe);
      b.setAttribute("aria-pressed", "false");
      b.title = k.titel;
      b.dataset.kategorie = schluessel;
      b.innerHTML = '<span class="name">' + k.titel + "</span>" +
        '<span class="sym" aria-hidden="true">' + k.zeichen + "</span>";
      b.addEventListener("click", function () {
        /* Nur eine Kategorie zur Zeit: erneut klicken schaltet ab. */
        if (aktiveKategorien.has(schluessel)) { aktiveKategorien.clear(); }
        else { aktiveKategorien.clear(); aktiveKategorien.add(schluessel); }
        aktualisiere();
      });

      behaelter.appendChild(b);
    });

    var schalterbox = document.getElementById("schalter");
    schalterbox.innerHTML = "";
    SCHALTER.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip schalt";
      b.setAttribute("aria-pressed", "false");
      b.dataset.schalter = s.id;
      b.textContent = s.titel;
      b.addEventListener("click", function () {
        if (aktiveSchalter.has(s.id)) { aktiveSchalter.delete(s.id); }
        else { aktiveSchalter.add(s.id); }
        aktualisiere();
      });
      schalterbox.appendChild(b);
    });
  }

  function spiegleFilterZustand() {
    document.querySelectorAll("[data-kategorie]").forEach(function (b) {
      b.setAttribute("aria-pressed", aktiveKategorien.has(b.dataset.kategorie) ? "true" : "false");
    });
    document.querySelectorAll("[data-schalter]").forEach(function (b) {
      b.setAttribute("aria-pressed", aktiveSchalter.has(b.dataset.schalter) ? "true" : "false");
    });
  }

  function aktualisiereGearZahl() {
    var span = document.getElementById("gear-zahl");
    if (!span) { return; }
    var summe = aktiveSchalter.size;
    span.textContent = summe ? String(summe) : "";
    span.hidden = summe === 0;
  }

  /* ------------------------------------------------------------------
     Liste
     ------------------------------------------------------------------ */

  function zeichneListe(liste) {
    var ul = document.getElementById("liste");
    ul.innerHTML = "";
    liste.forEach(function (ort) {
      var k = KATEGORIEN[ort.kategorie] || KATEGORIEN.aktivitaet;
      var li = document.createElement("li");
      li.className = "eintrag" + (gewaehlt === ort.id ? " aktiv" : "");
      li.style.setProperty("--ton", k.farbe);
      li.dataset.id = ort.id;

      /* Aktionen rechts in der Kopfzeile: Website, Route, dann Tagesplan. */
      var aktionen = "";
      if (ort.website) {
        aktionen += '<a class="aktion-icon" href="' + entschaerfe(ort.website) + '" target="_blank" rel="noopener" title="Website" aria-label="Website">🌐</a>';
      }
      aktionen += '<a class="aktion-icon" href="' + routenLink(ort) + '" target="_blank" rel="noopener" title="Route in Google Maps" aria-label="Route in Google Maps">🧭</a>';
      aktionen += planKnopf(ort.id);

      li.innerHTML = miniatur(ort, "miniatur") +
        '<div class="eintrag-text">' +
        '<div class="eintrag-kopf"><h3>' + entschaerfe(ort.name) + "</h3>" +
        '<div class="eintrag-aktionen">' + aktionen + "</div></div>" +
        '<p class="adresse">' + entschaerfe(ort.adresse) + "</p>" +
        merkmalMarken(ort) +
        '<p class="text">' + entschaerfe(ort.beschreibung) + "</p></div>" +
        '<div class="eintrag-werkzeug">' +
        '<button type="button" data-tun="bearbeiten" title="Bearbeiten">✎</button>' +
        '<button type="button" data-tun="loeschen" title="Löschen">✕</button></div>';

      li.addEventListener("click", function (e) {
        if (e.target.closest("a")) { return; }
        if (e.target.closest(".plan-knopf")) { planUmschalten(ort.id); return; }
        var tun = e.target.dataset ? e.target.dataset.tun : null;
        if (tun === "bearbeiten") { oeffneFormular(ort.id); return; }
        if (tun === "loeschen") { loesche(ort.id); return; }
        /* Erneuter Klick auf den offenen Eintrag klappt ihn wieder zu. */
        if (gewaehlt === ort.id) { abwaehlen(); return; }
        waehle(ort.id, true, "liste");
      });

      ul.appendChild(li);
    });

    document.getElementById("leer").hidden = liste.length > 0;
  }

  /* Eine Frage der Breite, nicht des Zeigers: Auch ein Tablet mit Maus zeigt
     die Liste unter der Karte und soll deshalb das Ortsblatt bekommen. */
  function istHandy() {
    return window.matchMedia("(max-width: 900px)").matches;
  }

  /* Das Blatt, das auf dem Handy statt des Popups von unten hereinfährt.
     Baut aus denselben Teilen wie der Listeneintrag. */
  function zeichneOrtBlatt(ort) {
    var blatt = document.getElementById("ort-blatt");
    if (!blatt) { return; }
    var k = KATEGORIEN[ort.kategorie] || KATEGORIEN.aktivitaet;
    blatt.style.setProperty("--ton", k.farbe);

    var aktionen = "";
    if (ort.website) {
      aktionen += '<a class="blatt-knopf" href="' + entschaerfe(ort.website) +
        '" target="_blank" rel="noopener">🌐 Website</a>';
    }
    aktionen += '<a class="blatt-knopf" href="' + routenLink(ort) +
      '" target="_blank" rel="noopener">🧭 Route</a>';
    aktionen += planKnopf(ort.id);

    blatt.innerHTML =
      '<button type="button" class="blatt-schliessen" data-tun="schliessen" aria-label="Schließen">✕</button>' +
      '<div class="blatt-kopf">' + miniatur(ort, "blatt-bild") +
      '<div><h3>' + entschaerfe(ort.name) + "</h3>" +
      '<p class="adresse">' + entschaerfe(ort.adresse) + "</p></div></div>" +
      merkmalMarken(ort) +
      '<p class="blatt-text">' + entschaerfe(ort.beschreibung) + "</p>" +
      '<div class="blatt-aktionen">' + aktionen + "</div>";

    blatt.hidden = false;
    /* Die Liste weicht dem Blatt, die Karte füllt den Schirm. Erst danach
       weiß Leaflet von seiner neuen Größe. */
    document.body.classList.add("ort-offen");
    window.scrollTo(0, 0);
    karte.invalidateSize();
    /* Erst im nächsten Bild einblenden, sonst gibt es keinen Übergang. */
    window.requestAnimationFrame(function () { blatt.classList.add("offen"); });
  }

  function schliesseOrtBlatt() {
    var blatt = document.getElementById("ort-blatt");
    if (!blatt) { return; }
    var war = !blatt.hidden;
    blatt.classList.remove("offen");
    blatt.hidden = true;
    document.body.classList.remove("ort-offen");
    /* Die Liste ist zurück, die Karte wieder kleiner. */
    if (war) { karte.invalidateSize(); }
  }

  /* Breite der Ergebnisspalte, wie sie in :root steht — sie liegt über der
     Karte und nimmt links Sicht weg. */
  function spaltenBreite() {
    var wert = getComputedStyle(document.documentElement).getPropertyValue("--spalte");
    return parseFloat(wert) || 0;
  }

  /* Wohin die Karte muss, damit ein Ort samt dem, was über oder unter ihm
     hängt, im sichtbaren Teil steht. Das lässt sich vorher ausrechnen — die
     Karte fährt dann in einem Zug dorthin, statt erst zu zentrieren und
     danach noch einmal nachzurücken.

     `versatzY` ist der Abstand, um den der Pin von der Mitte weg soll:
     negativ schiebt ihn nach unten (Platz fürs Popup darüber), positiv nach
     oben (Platz fürs Ortsblatt darunter). */
  function zielPunkt(ort, z, versatzY, spalteBeachten) {
    var punkt = karte.project([ort.lat, ort.lng], z);
    punkt.y += versatzY;
    if (spalteBeachten && document.body.classList.contains("liste-offen")) {
      punkt.x -= spaltenBreite() / 2;
    }
    return karte.unproject(punkt, z);
  }

  /* Der Pin soll über dem Blatt sichtbar bleiben, nicht darunter liegen. */
  function zeigePinUeberBlatt(ort) {
    var blatt = document.getElementById("ort-blatt");
    var hoehe = blatt && !blatt.hidden ? blatt.getBoundingClientRect().height : 0;
    var z = Math.max(karte.getZoom(), 15);
    var ziel = zielPunkt(ort, z, hoehe / 2, false);
    if (ruhigerModus.matches) { karte.setView(ziel, z, { animate: false }); }
    else { karte.flyTo(ziel, z, { duration: 0.4 }); }
  }

  /* `quelle` unterscheidet Pin von Listeneintrag. Auf dem Handy soll ein Tipp
     in der Liste dort bleiben — der Eintrag klappt auf, sonst passiert nichts.
     Das Ortsblatt kommt nur aus der Karte. */
  function waehle(id, karteBewegen, quelle) {
    gewaehlt = id;
    hervorgehoben = id;
    var ort = orte.find(function (o) { return o.id === id; });
    if (!ort) { return; }
    var handy = istHandy();

    Object.keys(markerNach).forEach(function (mid) {
      var o = orte.find(function (x) { return x.id === mid; });
      if (o) { markerNach[mid].setIcon(symbol(o, mid === id)); }
    });

    function markiereEintrag() {
      document.querySelectorAll(".eintrag").forEach(function (li) {
        li.classList.toggle("aktiv", li.dataset.id === id);
      });
    }

    /* Karte angetippt: Das Blatt fährt herein, die Seite bleibt stehen —
       vorher sprang sie hinunter zur Liste und die Karte war weg. */
    if (handy && quelle !== "liste") {
      zeichneOrtBlatt(ort);
      zeigePinUeberBlatt(ort);
      markiereEintrag();
      return;
    }

    if (handy) { markiereEintrag(); return; }

    var marker = markerNach[id];
    if (marker) {
      /* Kommt der Klick aus der Liste, rechnen wir das Ziel selbst aus und
         fahren einmal dorthin. Leaflets eigenes Nachrücken muss dafür weg:
         Zwei Stellen, die dieselbe Karte verschieben, ergeben genau den Ruck
         — erst zentrieren, dann nachschieben. Beim Klick auf einen Pin bleibt
         es an, dort ist es die einzige Bewegung und damit die richtige. */
      var popup = marker.getPopup();
      if (popup) { popup.options.autoPan = !karteBewegen; }
      marker.openPopup();

      if (karteBewegen) {
        var z = Math.max(karte.getZoom(), 15);
        /* Popup und Pin sollen zusammen mittig stehen. Die Popuphöhe steht
           erst nach dem Öffnen fest, ist dann aber verlässlich: Das Bild
           darin hat eine feste Höhe, sie hängt nicht am Laden der Datei.
           Die Pinhöhe kommt aus dem Symbol, damit die Zahl nur an einer
           Stelle gepflegt wird. */
        var el = popup && popup.getElement();
        var hoch = el ? el.offsetHeight : 0;
        var pin = marker.options.icon.options.iconSize[1];
        var ziel = zielPunkt(ort, z, -(hoch + pin) / 2, true);
        if (ruhigerModus.matches) { karte.setView(ziel, z, { animate: false }); }
        else { karte.flyTo(ziel, z, { duration: 0.6 }); }
      }
    }

    markiereEintrag();
    var aktiv = document.querySelector('.eintrag[data-id="' + id + '"]');
    if (aktiv) { aktiv.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
  }

  /* Auswahl aufheben: Eintrag klappt zu, der Marker wird wieder klein. */
  function abwaehlen() {
    var vorher = gewaehlt;
    gewaehlt = null;
    hervorgehoben = null;
    if (vorher && markerNach[vorher]) {
      var o = orte.find(function (x) { return x.id === vorher; });
      if (o) { markerNach[vorher].setIcon(symbol(o, false)); }
      markerNach[vorher].closePopup();
    }
    document.querySelectorAll(".eintrag.aktiv").forEach(function (li) {
      li.classList.remove("aktiv");
    });
    schliesseOrtBlatt();
  }

  /* Klicks im Ortsblatt laufen wie in der Liste über Delegation. */
  (function verdrahteOrtBlatt() {
    var blatt = document.getElementById("ort-blatt");
    if (!blatt) { return; }
    blatt.addEventListener("click", function (e) {
      if (e.target.closest("a")) { return; }
      if (e.target.closest("[data-tun='schliessen']")) { abwaehlen(); return; }
      var knopf = e.target.closest(".plan-knopf");
      if (knopf) { planUmschalten(knopf.dataset.id); }
    });
  })();

  /* ------------------------------------------------------------------
     Neu zeichnen
     ------------------------------------------------------------------ */

  function aktualisiere() {
    var liste = sichtbare();
    spiegleFilterZustand();
    aktualisiereGearZahl();
    zeichneListe(liste);

    var sichtbareIds = {};
    liste.forEach(function (o) { sichtbareIds[o.id] = true; });
    Object.keys(markerNach).forEach(function (id) {
      var m = markerNach[id];
      if (sichtbareIds[id]) { if (!karte.hasLayer(m)) { m.addTo(karte); } }
      else if (karte.hasLayer(m)) { karte.removeLayer(m); }
    });

    var text = liste.length === orte.length
      ? orte.length + " Orte"
      : liste.length + " von " + orte.length + " Orten";
    /* Steht im Kopf der Ergebnisspalte. Am Handy ist der ausgeblendet: Dort
       hat die Zahl als Chip in der Kategorienreihe nur Platz gekostet. */
    document.querySelectorAll(".trefferzahl").forEach(function (el) {
      el.textContent = text;
    });

    zeigeZustand();
    pruefeScroller();
  }

  /* Filtert gerade irgendetwas? Daran hängt am großen Schirm die ganze
     Ansicht: ohne Filter nur die Karte, mit Filter die Ergebnisspalte
     daneben. Der Bearbeiten-Modus zählt mit — sein Panel steht in der
     Spalte und wäre sonst nicht zu erreichen. */
  function filterAktiv() {
    return aktiveKategorien.size > 0 ||
      aktiveSchalter.size > 0 ||
      suchtext.trim() !== "";
  }

  /* Was im Suchfeld steht: der getippte Text, sonst der Name der gewählten
     Kategorie. Die Kategorienreihe weicht am großen Schirm den Merkmalen —
     ohne diesen Namen wüsste man dort nicht mehr, wonach gerade gefiltert
     wird. Ein Suchbegriff ist er nicht; siehe den input-Handler. */
  function spiegleSuchfeld() {
    var feld = document.getElementById("suche");
    if (!feld) { return; }
    var kat = Array.from(aktiveKategorien)[0];
    var soll = suchtext !== "" || !kat ? suchtext : KATEGORIEN[kat].titel;
    /* Nur bei echter Abweichung schreiben — eine Zuweisung setzt sonst in
       manchen Browsern den Cursor ans Ende, mitten im Tippen. */
    if (feld.value !== soll) { feld.value = soll; }
  }

  function zeigeZustand() {
    var offen = filterAktiv() || document.body.classList.contains("bearbeiten");
    var warOffen = document.body.classList.contains("liste-offen");
    document.body.classList.toggle("liste-offen", offen);
    spiegleSuchfeld();
    var x = document.getElementById("zuruecksetzen");
    if (x) { x.hidden = !filterAktiv(); }
    /* Die Spalte fährt herein, die Karte wird schmäler — Leaflet muss das
       erfahren, sonst rechnet es mit der alten Breite weiter. */
    if (offen !== warOffen) { warteAufSpalte(); }
  }

  /* Am großen Schirm legt sich die Ergebnisspalte über die Karte, ohne sie
     schmäler zu machen — dort ändert sich nichts nachzumessen. Am Handy
     schrumpft die Karte dagegen von schirmfüllend auf 58 vh, und davon muss
     Leaflet erfahren. Ein Zähler genügt: Der Übergang ist dort abgeschaltet,
     ein transitionend käme also gar nicht. */
  var spaltenZaehler = null;
  function warteAufSpalte() {
    clearTimeout(spaltenZaehler);
    spaltenZaehler = setTimeout(function () { karte.invalidateSize(); }, 260);
  }

  /* ------------------------------------------------------------------
     Bearbeiten
     ------------------------------------------------------------------ */

  function schalteBearbeiten(an) {
    bearbeiten = an;
    document.body.classList.toggle("bearbeiten", an);
    document.getElementById("bearbeiten-schalter").textContent = an ? "Bearbeiten beenden" : "Bearbeiten";
    var panel = document.getElementById("bearbeiten-panel");
    if (an) { zeichneWerkzeugleiste(); panel.hidden = false; }
    else { panel.hidden = true; formularId = null; loescheVorschau(); }
    if (an && window.location.hash !== "#bearbeiten") { window.location.hash = "bearbeiten"; }
    if (!an && window.location.hash === "#bearbeiten") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    aktualisiere();
  }

  function zeichneWerkzeugleiste() {
    loescheVorschau();
    var panel = document.getElementById("bearbeiten-panel");
    panel.innerHTML =
      "<h2>Bearbeiten-Modus</h2>" +
      '<p class="hinweis">Änderungen liegen zunächst nur in diesem Browser. Exportiere daten.js und ersetze damit die Datei im Projektordner.</p>' +
      '<div class="knopfreihe">' +
      '<button type="button" class="knopf" id="neu">Neuen Ort anlegen</button>' +
      '<button type="button" class="knopf leise" id="export">daten.js exportieren</button>' +
      '<button type="button" class="knopf leise" id="verwerfen">Änderungen verwerfen</button>' +
      "</div>";
    document.getElementById("neu").addEventListener("click", function () { oeffneFormular(null); });
    document.getElementById("export").addEventListener("click", exportiere);
    document.getElementById("verwerfen").addEventListener("click", verwirf);
  }

  function feld(name, beschriftung, wert, typ) {
    return '<label class="feld"><span>' + beschriftung + "</span>" +
      '<input type="' + (typ || "text") + '" name="' + name + '" value="' + entschaerfe(wert == null ? "" : String(wert)) + '"></label>';
  }

  function auswahl(name, beschriftung, wert, optionen) {
    var html = '<label class="feld"><span>' + beschriftung + "</span><select name=\"" + name + '">';
    optionen.forEach(function (paar) {
      html += '<option value="' + paar[0] + '"' + (String(wert) === paar[0] ? " selected" : "") + ">" + paar[1] + "</option>";
    });
    return html + "</select></label>";
  }

  /* Merkmal-Kästchen für die anhakbaren Tags der gewählten Kategorie.
     Nur Chips mit `tag` (nicht die abgeleiteten wie Preis oder Indoor). */
  function merkmalfeld(kategorie, gewaehlteTags) {
    var dims = MERKMALE[kategorie] || [];
    var kaestchen = [];
    dims.forEach(function (dim) {
      dim.chips.forEach(function (chip) {
        if (!chip.tag) { return; }
        var an = gewaehlteTags.indexOf(chip.tag) !== -1;
        kaestchen.push('<label class="kaestchen"><input type="checkbox" name="tag" value="' +
          chip.tag + '"' + (an ? " checked" : "") + "> " + chip.label + "</label>");
      });
    });
    var inhalt = kaestchen.length
      ? '<div class="mehrfach">' + kaestchen.join("") + "</div>"
      : '<p class="hinweis" style="margin:0">Diese Kategorie hat keine anhakbaren Merkmale; sie ergeben sich aus Preis, Regen und den Ja/Nein-Feldern unten.</p>';
    return '<div class="feld" id="merkmalfeld"><span>Merkmale</span>' + inhalt + "</div>";
  }

  /* Zweitkategorien: ein Ort kann in mehreren Filtern auftauchen,
     die Farbe des Pins richtet sich weiter nach der ersten. */
  function mehrfachfeld(gewaehlteWeitere) {
    var kaestchen = Object.keys(KATEGORIEN).map(function (s) {
      var an = gewaehlteWeitere.indexOf(s) !== -1;
      return '<label class="kaestchen"><input type="checkbox" name="weitere" value="' + s + '"' +
        (an ? " checked" : "") + "> " + KATEGORIEN[s].titel + "</label>";
    }).join("");
    return '<div class="feld"><span>Zusätzlich in (optional)</span>' +
      '<div class="mehrfach">' + kaestchen + "</div></div>";
  }

  function oeffneFormular(id) {
    formularId = id;
    var ort = id ? orte.find(function (o) { return o.id === id; }) : null;
    var o = ort || {
      name: "", kategorie: "fruehstueck", weitere: [], tags: [], labels: [],
      adresse: "", beschreibung: "", website: "", bild: "",
      lat: "", lng: "", indoor: true, andrang: "ruhig", allein: true, gruppe: true,
      preis: "mittel", gehen: "wenig"
    };

    var kategorieOptionen = Object.keys(KATEGORIEN).map(function (k) {
      return [k, KATEGORIEN[k].titel];
    });

    var panel = document.getElementById("bearbeiten-panel");
    panel.innerHTML =
      "<h2>" + (ort ? "Ort bearbeiten" : "Neuer Ort") + "</h2>" +
      '<p class="hinweis">Adresse eintragen und die Position daraus holen, oder sie direkt auf der Karte anklicken.</p>' +
      '<form id="ort-formular">' +
      feld("name", "Name", o.name) +
      auswahl("kategorie", "Kategorie", o.kategorie, kategorieOptionen) +
      mehrfachfeld(o.weitere || []) +
      merkmalfeld(o.kategorie, o.tags || []) +
      feld("adresse", "Adresse", o.adresse) +
      '<label class="feld"><span>Beschreibung</span><textarea name="beschreibung">' + entschaerfe(o.beschreibung) + "</textarea></label>" +
      feld("website", "Website", o.website, "url") +
      feld("bild", "Miniaturbild — Pfad wie bilder/riesenrad.jpg oder URL, leer lassen ist erlaubt", o.bild) +
      '<input type="hidden" name="lat" value="' + entschaerfe(o.lat) + '">' +
      '<input type="hidden" name="lng" value="' + entschaerfe(o.lng) + '">' +
      '<div class="position"><span id="position-stand"></span></div>' +
      '<div class="knopfreihe">' +
      '<button type="button" class="knopf leise" id="geocode">Position aus Adresse holen</button>' +
      '<button type="button" class="knopf leise" id="aufkarte">Auf Karte setzen</button>' +
      "</div>" +
      '<div class="feld-paar">' +
      auswahl("indoor", "Bei Regen", String(o.indoor), [["true", "drinnen"], ["false", "im Freien"]]) +
      auswahl("andrang", "Andrang", o.andrang, [["ruhig", "eher ruhig"], ["belebt", "gut besucht"]]) +
      "</div>" +
      '<div class="feld-paar">' +
      auswahl("allein", "Allein machbar", String(o.allein), [["true", "ja"], ["false", "nein"]]) +
      auswahl("gruppe", "Für Gruppen", String(o.gruppe), [["true", "ja"], ["false", "nein"]]) +
      "</div>" +
      '<div class="feld-paar">' +
      auswahl("preis", "Preis", o.preis, [["kostenlos", "kostenlos"], ["guenstig", "günstig"], ["mittel", "mittel"], ["hoch", "teurer"]]) +
      auswahl("gehen", "Weg", o.gehen, [["wenig", "wenig gehen"], ["viel", "viel gehen"]]) +
      "</div>" +
      '<div class="knopfreihe">' +
      '<button type="submit" class="knopf">Speichern</button>' +
      '<button type="button" class="knopf leise" id="abbrechen">Abbrechen</button>' +
      "</div></form>";

    document.getElementById("abbrechen").addEventListener("click", function () {
      wartetAufKlick = false;
      document.body.classList.remove("setzt-position");
      zeichneWerkzeugleiste();
    });
    document.getElementById("aufkarte").addEventListener("click", function () {
      wartetAufKlick = true;
      document.body.classList.add("setzt-position");
    });
    document.getElementById("geocode").addEventListener("click", sucheKoordinaten);
    document.getElementById("ort-formular").addEventListener("submit", speichereFormular);

    /* Wechselt die Kategorie, passen sich die Merkmal-Kästchen an. */
    document.querySelector('#ort-formular [name="kategorie"]').addEventListener("change", function (e) {
      var neu = merkmalfeld(e.target.value, []);
      var alt = document.getElementById("merkmalfeld");
      var huelle = document.createElement("div");
      huelle.innerHTML = neu;
      alt.replaceWith(huelle.firstChild);
    });

    zeigePositionsstand();
    panel.scrollIntoView({ block: "nearest" });
  }

  function setzeFormularfeld(name, wert) {
    var f = document.querySelector('#ort-formular [name="' + name + '"]');
    if (f) { f.value = wert; }
    zeigePositionsstand();
  }

  function zeigePositionsstand() {
    var anzeige = document.getElementById("position-stand");
    if (!anzeige) { return; }
    var lat = parseFloat((document.querySelector('#ort-formular [name="lat"]') || {}).value);
    var lng = parseFloat((document.querySelector('#ort-formular [name="lng"]') || {}).value);
    if (isNaN(lat) || isNaN(lng)) {
      anzeige.textContent = "Position noch nicht gesetzt.";
      anzeige.className = "offen";
    } else {
      anzeige.textContent = "Position gesetzt.";
      anzeige.className = "";
      if (markerVorschau) { karte.removeLayer(markerVorschau); }
      markerVorschau = L.circleMarker([lat, lng], {
        radius: 9, color: "#1d1a16", weight: 2, fillColor: "#f7f4ee", fillOpacity: 1
      }).addTo(karte);
    }
  }

  function loescheVorschau() {
    if (markerVorschau) { karte.removeLayer(markerVorschau); markerVorschau = null; }
  }

  function sucheKoordinaten() {
    var adresse = (document.querySelector('#ort-formular [name="adresse"]') || {}).value || "";
    if (!adresse.trim()) { window.alert("Bitte zuerst eine Adresse eintragen."); return; }
    var knopf = document.getElementById("geocode");
    knopf.textContent = "Suche läuft …";
    knopf.disabled = true;
    fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=at&q=" + encodeURIComponent(adresse))
      .then(function (a) { return a.json(); })
      .then(function (treffer) {
        if (treffer && treffer.length) {
          setzeFormularfeld("lat", Number(treffer[0].lat).toFixed(7));
          setzeFormularfeld("lng", Number(treffer[0].lon).toFixed(7));
          karte.setView([Number(treffer[0].lat), Number(treffer[0].lon)], 16);
        } else {
          window.alert("Zu dieser Adresse wurde nichts gefunden. Setz die Position auf der Karte.");
        }
      })
      .catch(function () {
        window.alert("Die Adresssuche ist nicht erreichbar. Setz die Position auf der Karte.");
      })
      .then(function () {
        knopf.textContent = "Position aus Adresse holen";
        knopf.disabled = false;
      });
  }

  function speichereFormular(e) {
    e.preventDefault();
    var f = e.target;
    var lat = parseFloat(f.lat.value);
    var lng = parseFloat(f.lng.value);
    if (!f.name.value.trim()) { window.alert("Der Ort braucht einen Namen."); return; }
    if (isNaN(lat) || isNaN(lng)) { window.alert("Der Ort hat noch keine Position. Hol sie aus der Adresse oder klick sie auf der Karte an."); return; }

    var weitere = Array.prototype.slice.call(f.querySelectorAll('input[name="weitere"]:checked'))
      .map(function (e) { return e.value; })
      .filter(function (k) { return k !== f.kategorie.value; });

    var tags = Array.prototype.slice.call(f.querySelectorAll('input[name="tag"]:checked'))
      .map(function (e) { return e.value; });

    /* `labels` ist im Formular nicht mehr zu pflegen, seit die erfundenen
       Werte draußen sind. Was von Hand in daten.js steht, bleibt trotzdem
       stehen — sonst löschte ein Speichern es unbemerkt weg. */
    var bisher = orte.filter(function (o) { return o.id === formularId; })[0];

    var neuerOrt = {
      id: formularId || eindeutigeId(f.name.value),
      name: f.name.value.trim(),
      kategorie: f.kategorie.value,
      weitere: weitere,
      tags: tags,
      labels: (bisher && bisher.labels) || [],
      adresse: f.adresse.value.trim(),
      beschreibung: f.beschreibung.value.trim(),
      website: f.website.value.trim(),
      bild: f.bild.value.trim(),
      lat: lat,
      lng: lng,
      indoor: f.indoor.value === "true",
      andrang: f.andrang.value,
      allein: f.allein.value === "true",
      gruppe: f.gruppe.value === "true",
      preis: f.preis.value,
      gehen: f.gehen.value
    };

    if (formularId) {
      var i = orte.findIndex(function (o) { return o.id === formularId; });
      orte[i] = neuerOrt;
    } else {
      orte.push(neuerOrt);
    }

    speichere();
    baueMarker();
    zeichneWerkzeugleiste();
    aktualisiere();
    waehle(neuerOrt.id, true);
  }

  function loesche(id) {
    var ort = orte.find(function (o) { return o.id === id; });
    if (!ort) { return; }
    if (!window.confirm("„" + ort.name + "“ wirklich aus der Liste nehmen?")) { return; }
    orte = orte.filter(function (o) { return o.id !== id; });
    bereinigePlan();
    speichere();
    speicherePlan();
    baueMarker();
    aktualisiere();
    zeichnePlan();
    zeichneLinie();
  }

  function eindeutigeId(name) {
    var basis = name.toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "ort";
    var id = basis;
    var n = 2;
    while (orte.some(function (o) { return o.id === id; })) { id = basis + "-" + n; n += 1; }
    return id;
  }

  function exportiere() {
    var kopf = [
      "/* ---------------------------------------------------------------",
      "   Wien-Karte — Datenbestand",
      "   ---------------------------------------------------------------",
      "   Exportiert aus dem Bearbeiten-Modus der Seite.",
      "   Diese Datei ersetzt daten.js im Projektordner.",
      "",
      "   Felder je Ort:",
      "     id           eindeutige Kennung, wird beim Anlegen vergeben",
      "     name         Anzeigename",
      "     kategorie    fruehstueck | restaurant | sehenswuerdigkeit | museum",
      "                  | musik | event | aktivitaet — bestimmt Farbe und Symbol",
      "     weitere      Liste weiterer Kategorien, meist leer",
      "     tags         Merkmale für die kategoriespezifischen Filter",
      "     labels       derzeit überall leer — die früheren Werte waren",
      "                  erfunden und sind entfernt worden",
      "     bild         Miniaturbild: Pfad wie bilder/riesenrad.jpg oder URL",
      "     adresse      Straße, PLZ und Wien",
      "     beschreibung ein bis zwei Sätze",
      "     website      vollständige URL oder leerer String",
      "     lat, lng     Koordinaten in Dezimalgrad, setzt das Formular selbst",
      "     indoor       true, wenn der Ort bei Regen funktioniert",
      "     andrang      ruhig | belebt",
      "     allein       true, wenn man allein hingehen kann",
      "     gruppe       true, wenn es in der Gruppe funktioniert",
      "     preis        kostenlos | guenstig | mittel | hoch",
      "     gehen        wenig | viel",
      "   --------------------------------------------------------------- */",
      "",
      "const ORTE = "
    ].join("\n");
    var inhalt = kopf + JSON.stringify(orte, null, 2) + ";\n";
    var blob = new Blob([inhalt], { type: "text/javascript;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "daten.js";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  function verwirf() {
    if (!window.confirm("Alle lokalen Änderungen verwerfen und wieder den Stand aus daten.js verwenden?")) { return; }
    try { window.localStorage.removeItem(SPEICHER); } catch (e) { /* egal */ }
    orte = JSON.parse(JSON.stringify(ORTE));
    baueMarker();
    zeichneWerkzeugleiste();
    aktualisiere();
    zeigeMerker();
  }

  function zeigeMerker() {
    var alt = document.querySelector(".merker");
    if (alt) { alt.remove(); }
    if (!hatEigenenStand()) { return; }

    /* Deckt sich der lokale Stand mit daten.js, ist die Kopie überflüssig.
       Das passiert, sobald die exportierte Datei im Ordner liegt. */
    if (normalisiere(orte) === normalisiere(ORTE)) {
      try { window.localStorage.removeItem(SPEICHER); } catch (e) { /* egal */ }
      return;
    }

    var leiste = document.createElement("div");
    leiste.className = "merker";
    leiste.innerHTML = "<span>Du siehst einen lokal gespeicherten Stand, nicht den Inhalt von daten.js.</span>" +
      '<span class="merker-knoepfe">' +
      '<button type="button" data-tun="export">Exportieren</button>' +
      '<button type="button" data-tun="verwerfen">Verwerfen</button></span>';
    leiste.querySelector('[data-tun="export"]').addEventListener("click", exportiere);
    leiste.querySelector('[data-tun="verwerfen"]').addEventListener("click", verwirf);
    document.querySelector(".liste-spalte").prepend(leiste);
  }

  /* Vergleichsform: Reihenfolge der Orte und der Felder darf abweichen. */
  function normalisiere(liste) {
    var kopie = liste.map(function (o) {
      var sortiert = {};
      Object.keys(o).sort().forEach(function (s) { sortiert[s] = o[s]; });
      return sortiert;
    });
    kopie.sort(function (a, b) { return String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0; });
    return JSON.stringify(kopie);
  }

  /* ------------------------------------------------------------------
     Routen-Popup
     ------------------------------------------------------------------ */

  var routeKategorien = new Set(["fruehstueck", "sehenswuerdigkeit", "restaurant"]);
  var routeFenster = "ganztag";
  var routeUmkreis = false;
  var routeVorgaben = null;
  var routeErgebnis = null;

  /* Gesperrte Stopps: Ort-id -> Tagesabschnitt. Beides gehört zusammen, das
     Schloss hält den Ort in der Route und an seiner Stelle im Tag. Leert sich
     beim Weg zurück zu den Vorgaben — dort ändert man meist Kategorien oder
     Zeitfenster, und damit ist die Grundlage eine andere. */
  var routeGesperrt = {};

  /* Nicht auf den Wert prüfen, sondern auf den Eintrag: Der Abschnitt darf
     leer sein, gesperrt ist der Stopp trotzdem. */
  function istGesperrt(id) {
    return Object.prototype.hasOwnProperty.call(routeGesperrt, id);
  }

  function zeichneRouteEingabe() {
    var katbox = document.getElementById("route-kategorien");
    katbox.innerHTML = "";
    Object.keys(KATEGORIEN).forEach(function (schluessel) {
      var k = KATEGORIEN[schluessel];
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.style.setProperty("--ton", k.farbe);
      b.dataset.routeKat = schluessel;
      b.innerHTML = '<span class="punkt"></span>' + k.titel +
        ' <span class="route-punktwert">' + (ROUTE.punkte[schluessel] || 2) + "</span>";
      b.addEventListener("click", function () {
        if (routeKategorien.has(schluessel)) { routeKategorien.delete(schluessel); }
        else { routeKategorien.add(schluessel); }
        spiegleRouteEingabe();
      });
      katbox.appendChild(b);
    });

    var fensterbox = document.getElementById("route-fenster");
    fensterbox.innerHTML = "";
    Object.keys(ROUTE.fenster).forEach(function (schluessel) {
      var f = ROUTE.fenster[schluessel];
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip schalt";
      b.dataset.routeFenster = schluessel;
      b.innerHTML = f.titel + ' <span class="route-punktwert">' + f.budget + "</span>";
      b.addEventListener("click", function () {
        routeFenster = schluessel;
        spiegleRouteEingabe();
      });
      fensterbox.appendChild(b);
    });

    document.getElementById("route-umkreis").addEventListener("click", function () {
      routeUmkreis = !routeUmkreis;
      spiegleRouteEingabe();
    });

    spiegleRouteEingabe();
  }

  function spiegleRouteEingabe() {
    document.querySelectorAll("[data-route-kat]").forEach(function (b) {
      b.setAttribute("aria-pressed", routeKategorien.has(b.dataset.routeKat) ? "true" : "false");
    });
    document.querySelectorAll("[data-route-fenster]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.routeFenster === routeFenster ? "true" : "false");
    });
    var u = document.getElementById("route-umkreis");
    u.setAttribute("aria-pressed", routeUmkreis ? "true" : "false");
    document.getElementById("route-berechnen").disabled = routeKategorien.size === 0;
  }

  /* Prüft vor dem Rechnen, ob dem Zeitfenster eine Pflichtkategorie fehlt. */
  function routeStarten() {
    var fenster = ROUTE.fenster[routeFenster];
    var kategorien = Array.from(routeKategorien);

    /* Ohne bekannten Standort gäbe es keinen Bezugspunkt für die 3 km. */
    if (routeUmkreis && !standortMarker) {
      /* Ohne Ortsangabe: Der Knopf sitzt am Desktop oben links, auf dem Handy
         unten links. */
      window.alert("Für den Umkreis fehlt dein Standort. Schalt ihn auf der Karte über ◉ ein, dann noch einmal berechnen.");
      return;
    }

    var fehlend = fenster.mindestens.filter(function (k) {
      return kategorien.indexOf(k) === -1;
    });
    if (fehlend.length) {
      var namen = fehlend.map(function (k) { return KATEGORIEN[k].titel; }).join(" und ");
      var frage = "Zeitfenster „" + fenster.titel + "“ ohne " + namen + "?\n\n" +
        "OK: dazunehmen.\nAbbrechen: so lassen, wie ausgewählt.";
      if (window.confirm(frage)) {
        fehlend.forEach(function (k) { routeKategorien.add(k); });
        kategorien = Array.from(routeKategorien);
        spiegleRouteEingabe();
      }
    }

    routeVorgaben = { kategorien: kategorien, fenster: routeFenster, umkreis: routeUmkreis };
    routeWuerfeln();
  }

  function routeWuerfeln() {
    routeErgebnis = routeBerechnen(routeVorgaben, routeGesperrt);
    zeigeRouteErgebnis();
  }

  /* Knöpfe im Ergebnisbereich müssen die Ausbreitung stoppen: „Neu würfeln“
     ersetzt den Inhalt, danach fände der globale Schließen-Handler den
     geklickten Knopf nicht mehr im Popup und würde es zumachen. */
  function ergebnisKnopf(box, tun, fn) {
    var b = box.querySelector('[data-tun="' + tun + '"]');
    if (!b) { return; }
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      fn();
    });
  }

  function zeigeRouteErgebnis() {
    var box = document.getElementById("route-ergebnis");
    var eingabe = document.getElementById("route-eingabe");
    var e = routeErgebnis;

    if (e.fehler) {
      var text = e.fehler === "leer"
        ? "Zu dieser Auswahl gibt es keinen einzigen Ort."
        : "Für " + e.fehlend.map(function (k) { return KATEGORIEN[k].titel; }).join(" und ") +
          " findet sich hier nichts.";
      if (e.umkreis) { text += " Der Umkreis von 3 km ist eng — ohne ihn sieht es besser aus."; }
      else { text += " Nimm eine Kategorie dazu oder wechsle das Zeitfenster."; }
      box.innerHTML = '<p class="route-fehler">' + entschaerfe(text) + "</p>" +
        '<div class="knopfreihe"><button type="button" class="knopf leise" data-tun="zurueck">Zurück</button></div>';
      box.hidden = false;
      eingabe.hidden = true;
      ergebnisKnopf(box, "zurueck", routeZurueck);
      return;
    }

    /* Nach Tagesabschnitt gruppiert, die Nummerierung läuft durch. */
    var nummer = 0;
    var zeilen = ROUTE.abschnitte.map(function (abschnitt) {
      var drin = e.stopps.filter(function (c) { return c.abschnitt === abschnitt.id; });
      if (!drin.length) { return ""; }
      var punkte = drin.map(function (c) {
        var k = KATEGORIEN[c.kategorie];
        var zu = istGesperrt(c.ort.id);
        nummer += 1;
        return '<li class="route-stopp' + (zu ? " gesperrt" : "") + '">' +
          '<span class="route-nr" style="background:' + k.farbe + '">' + nummer + "</span>" +
          '<span class="route-stopp-text"><b>' + entschaerfe(c.ort.name) + "</b>" +
          '<span class="route-stopp-kat">' + k.titel + " · " + c.punkte +
          (c.punkte === 1 ? " Punkt" : " Punkte") + "</span></span>" +
          '<button type="button" class="route-schloss" data-ort="' + entschaerfe(c.ort.id) +
          '" aria-pressed="' + (zu ? "true" : "false") +
          '" title="' + (zu ? "Freigeben" : "Sperren, damit „Neu würfeln“ diesen Stopp stehen lässt") +
          '" aria-label="' + entschaerfe(c.ort.name) + (zu ? " freigeben" : " sperren") + '">' +
          (zu ? "🔒" : "🔓") + "</button></li>";
      }).join("");
      return '<li class="route-abschnitt">' + abschnitt.titel + "</li>" + punkte;
    }).join("");

    var zahlGesperrt = e.stopps.filter(function (c) { return istGesperrt(c.ort.id); }).length;
    var alleZu = zahlGesperrt > 0 && zahlGesperrt === e.stopps.length;

    var knapp = e.summe < e.budget && !alleZu
      ? '<p class="route-knapp">Mehr war mit dieser Auswahl nicht drin — ' +
        e.summe + " von " + e.budget + " Punkten.</p>"
      : "";
    if (alleZu) {
      knapp = '<p class="route-knapp">Alle Stopps sind gesperrt — „Neu würfeln“ ändert nichts.</p>';
    }

    var knoepfe = plan.length
      ? '<button type="button" class="knopf" data-tun="ersetzen">Plan ersetzen</button>' +
        '<button type="button" class="knopf leise" data-tun="anhaengen">Anhängen</button>'
      : '<button type="button" class="knopf" data-tun="ersetzen">In den Tagesplan</button>';

    box.innerHTML =
      '<div class="route-summe">' + e.stopps.length + " Stopps · " + e.summe + " von " + e.budget + " Punkten" +
      (zahlGesperrt ? " · " + zahlGesperrt + " gesperrt" : "") + "</div>" +
      '<ol class="route-liste">' + zeilen + "</ol>" + knapp +
      '<div class="knopfreihe">' + knoepfe +
      '<button type="button" class="knopf leise" data-tun="wuerfeln">Neu würfeln</button>' +
      '<button type="button" class="textknopf" data-tun="zurueck">Verwerfen</button></div>';
    box.hidden = false;
    eingabe.hidden = true;

    ergebnisKnopf(box, "ersetzen", function () { routeUebernehmen("ersetzen"); });
    ergebnisKnopf(box, "anhaengen", function () { routeUebernehmen("anhaengen"); });
    ergebnisKnopf(box, "wuerfeln", routeWuerfeln);
    ergebnisKnopf(box, "zurueck", routeZurueck);

    /* Ein Klick aufs Schloss rechnet nichts — er merkt sich den Stopp samt
       seinem Abschnitt und zeichnet neu. Wirksam wird die Sperre erst beim
       nächsten Würfeln. `stopPropagation` wie bei den übrigen Knöpfen: Sonst
       fände der globale Schließen-Handler das eben ersetzte Element nicht
       mehr im Popup und machte es zu. */
    box.querySelectorAll(".route-schloss").forEach(function (b) {
      b.addEventListener("click", function (klick) {
        klick.stopPropagation();
        var id = b.dataset.ort;
        if (istGesperrt(id)) { delete routeGesperrt[id]; }
        else {
          var stopp = e.stopps.filter(function (c) { return c.ort.id === id; })[0];
          routeGesperrt[id] = (stopp && stopp.abschnitt) || null;
        }
        zeigeRouteErgebnis();
      });
    });
  }

  function routeZurueck() {
    document.getElementById("route-ergebnis").hidden = true;
    document.getElementById("route-eingabe").hidden = false;
    routeErgebnis = null;
    routeGesperrt = {};
  }

  function routeUebernehmen(modus) {
    if (!routeErgebnis || routeErgebnis.fehler) { return; }
    /* Die Route kennt ihre Tagesabschnitte schon — sie wandern mit. */
    var neu = routeErgebnis.stopps.map(function (c) {
      return { id: c.ort.id, abschnitt: c.abschnitt || null };
    });

    if (modus === "ersetzen") {
      plan = neu;
    } else {
      neu.forEach(function (e) { if (!imPlan(e.id)) { plan.push(e); } });
    }

    hervorgehoben = null;
    speicherePlan();
    zeichnePlan();
    aktualisiere();
    aktualisiereMarkerIcons();
    zeichneLinie();

    routeZurueck();
    routePopupZeigen(false);

    /* Den fertigen Tag gleich zeigen und die Stopps ins Bild rücken. */
    planOverlayZeigen(true);
    var punkte = planOrte().map(function (o) { return [o.lat, o.lng]; });
    if (punkte.length > 1) { karte.fitBounds(L.latLngBounds(punkte), { padding: [60, 60] }); }
  }

  /* ------------------------------------------------------------------
     Hilfsmittel
     ------------------------------------------------------------------ */

  function entschaerfe(text) {
    return String(text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* ------------------------------------------------------------------
     Start
     ------------------------------------------------------------------ */

  document.getElementById("suche").addEventListener("input", function (e) {
    suchtext = e.target.value;
    /* Im Feld stand womöglich der Name der gewählten Kategorie. Das war eine
       Anzeige, kein Suchbegriff — wer hier tippt, sucht etwas Neues, und die
       Kategorie tritt ab. Sonst stünde ein Filter in Kraft, den das Feld
       nicht mehr benennt. */
    aktiveKategorien.clear();
    aktualisiere();
  });

  document.getElementById("zuruecksetzen").addEventListener("click", function () {
    aktiveKategorien.clear();
    aktiveSchalter.clear();
    suchtext = "";
    document.getElementById("suche").value = "";
    aktualisiere();
    karte.flyTo([48.2082, 16.3730], 13, { duration: 0.6 });
  });

  var einstellungenKnopf = document.getElementById("einstellungen-knopf");
  einstellungenKnopf.addEventListener("click", function (e) {
    e.stopPropagation();
    var panel = document.getElementById("einstellungen");
    var offen = panel.hidden;
    panel.hidden = !offen;
    einstellungenKnopf.setAttribute("aria-expanded", offen ? "true" : "false");
  });
  document.addEventListener("click", function (e) {
    var panel = document.getElementById("einstellungen");
    if (panel.hidden) { return; }
    if (!panel.contains(e.target) && e.target !== einstellungenKnopf) {
      panel.hidden = true;
      einstellungenKnopf.setAttribute("aria-expanded", "false");
    }
  });

  /* Plan-Knopf im Karten-Popup: dort greift die Listen-Behandlung nicht,
     darum ein eigener delegierter Klick auf dem Kartenbereich. */
  document.getElementById("karte").addEventListener("click", function (e) {
    var knopf = e.target.closest(".plan-knopf");
    if (knopf) { e.stopPropagation(); planUmschalten(knopf.dataset.id); }
  });

  document.getElementById("plan-leeren").addEventListener("click", planLeeren);

  var planFab = document.getElementById("plan-fab");
  var planOverlay = document.getElementById("plan-overlay");
  function planOverlayZeigen(auf) {
    planOverlay.hidden = !auf;
    planFab.setAttribute("aria-expanded", auf ? "true" : "false");
    planFab.classList.toggle("offen", auf);
  }
  planFab.addEventListener("click", function (e) {
    e.stopPropagation();
    planOverlayZeigen(planOverlay.hidden);
  });
  document.getElementById("plan-schliessen").addEventListener("click", function () {
    planOverlayZeigen(false);
  });
  document.addEventListener("click", function (e) {
    if (planOverlay.hidden) { return; }
    if (!planOverlay.contains(e.target) && !planFab.contains(e.target)) { planOverlayZeigen(false); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !planOverlay.hidden) { planOverlayZeigen(false); }
  });

  var routeKnopf = document.getElementById("route-knopf");
  var routePopup = document.getElementById("route-popup");
  function routePopupZeigen(auf) {
    routePopup.hidden = !auf;
    routeKnopf.setAttribute("aria-expanded", auf ? "true" : "false");
    routeKnopf.classList.toggle("offen", auf);
    if (auf) { planOverlayZeigen(false); }
  }
  routeKnopf.addEventListener("click", function (e) {
    e.stopPropagation();
    routePopupZeigen(routePopup.hidden);
  });
  document.getElementById("route-schliessen").addEventListener("click", function () {
    routePopupZeigen(false);
  });
  document.getElementById("route-berechnen").addEventListener("click", routeStarten);
  document.addEventListener("click", function (e) {
    if (routePopup.hidden) { return; }
    if (!routePopup.contains(e.target) && !routeKnopf.contains(e.target)) { routePopupZeigen(false); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !routePopup.hidden) { routePopupZeigen(false); }
  });

  karte.addControl(new StandortSteuerung());
  karte.addControl(new BearbeitenSteuerung());

  bereinigePlan();
  speicherePlan();

  zeichneFilter();
  zeichneRouteEingabe();
  document.querySelectorAll(".kat-scroller").forEach(verdrahteScroller);
  baueMarker();
  aktualisiere();
  zeichnePlan();
  zeichneLinie();
  zeigeMerker();

  if (window.location.hash === "#bearbeiten") { schalteBearbeiten(true); }

  /* Ob ein Popup gebunden wird, entscheidet sich beim Bauen der Marker. Wandert
     das Fenster über die Schwelle, müssen sie deshalb neu gebaut werden. */
  var warHandy = istHandy();
  window.addEventListener("resize", function () {
    karte.invalidateSize();
    if (istHandy() !== warHandy) {
      warHandy = istHandy();
      abwaehlen();
      baueMarker();
      aktualisiere();
    }
  });

  /* Auf dem Handy stehen Suche und Kategorien fest am oberen Rand. Sobald die
     Ortsliste darunter hochwandert, bräuchten sie einen Grund, sich vom Text
     abzuheben — den bekommen sie über diese Klasse, und nur dann. Über der
     Karte bleibt der Kopfbereich durchsichtig. */
  (function scrollZustand() {
    var laeuft = false;
    function pruefe() {
      laeuft = false;
      document.body.classList.toggle("gescrollt", window.scrollY > 8);
    }
    window.addEventListener("scroll", function () {
      if (laeuft) { return; }
      laeuft = true;
      window.requestAnimationFrame(pruefe);
    }, { passive: true });
    pruefe();
  })();
})();
