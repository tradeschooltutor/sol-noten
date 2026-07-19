/* SOL-Noten – Bildschirme und Abläufe */
(function () {
  'use strict';
  var h = UI.h, clear = UI.clear, toast = UI.toast;
  var route = { name: 'loading', params: {} };

  /* ---- Browser-History / Android-Zurück-Geste ----
     Jeder Seitenwechsel erzeugt einen History-Eintrag; die Wischgeste (bzw. der
     Zurück-Button) navigiert damit innerhalb der App zurück und schließt sie
     erst von der Startansicht aus. Parameterwechsel auf derselben Seite
     (z. B. Diagramm-Filter, Quartalswahl) ERSETZEN den Eintrag, damit die Geste
     seitenweise zurückführt und nicht durch jeden Klick. */
  var histFirst = true;   /* erste Navigation ersetzt den Basis-Eintrag */
  var histPopping = false; /* Navigation stammt aus popstate → nichts schreiben */

  function histWrite(replace) {
    try {
      var entry = { name: route.name, params: route.params };
      if (replace) history.replaceState(entry, '');
      else history.pushState(entry, '');
    } catch (e) { /* nicht-serialisierbare Params o. Ä. – Navigation geht vor */ }
  }

  function go(name, params) {
    var sameView = route.name === name;
    route = { name: name, params: params || {} };
    if (!histPopping) {
      histWrite(histFirst || sameView);
      histFirst = false;
    }
    render();
    /* Neue Seite immer oben beginnen, damit der Titel sichtbar ist. */
    window.scrollTo(0, 0);
    var appEl = document.getElementById('app');
    if (appEl) appEl.scrollTop = 0;
  }

  window.addEventListener('popstate', function (ev) {
    /* 1) Offenes Modal: Die Geste schließt zuerst das Modal; der konsumierte
       History-Eintrag wird wiederhergestellt, die Seite bleibt. Pflicht-Dialoge
       (z. B. PIN-Einrichtung) bleiben offen. */
    if (UI.hasOpenModal()) {
      UI.closeTopModal();
      histWrite(false);
      return;
    }
    /* 2) Gesperrt: Keine Rückkehr in geschützte Ansichten per Geste. */
    if (Store.isEncrypted && Store.isEncrypted() && Store.isLocked()) {
      route = { name: 'lock', params: {} };
      histWrite(false);
      render();
      return;
    }
    /* 3) Normale Rück-Navigation zum gespeicherten Eintrag. */
    var st = ev.state;
    histPopping = true;
    if (st && st.name && views[st.name] && st.name !== 'lock' && st.name !== 'setup') {
      route = { name: st.name, params: st.params || {} };
    } else {
      route = { name: 'home', params: {} };
    }
    render();
    window.scrollTo(0, 0);
    var appEl = document.getElementById('app');
    if (appEl) appEl.scrollTop = 0;
    histPopping = false;
  });

  function S() { return Store.getState(); }

  /* ================= App-Start ================= */

  var APP_VERSION = '0.33.0';

  /* ---------- PWA-Installation ----------
     Chrome/Edge/Android liefern `beforeinstallprompt`: Event abfangen und
     aufheben, dann kann ein eigener Button den nativen Dialog auslösen.
     iOS/iPadOS kennt das Event nicht – dort zeigen wir eine Anleitung
     (Safari: Teilen → „Zum Home-Bildschirm“). */
  var deferredInstall = null;

  window.addEventListener('beforeinstallprompt', function (ev) {
    ev.preventDefault();
    deferredInstall = ev;
    if (route && route.name !== 'loading') render();
  });

  window.addEventListener('appinstalled', function () {
    deferredInstall = null;
    toast('SOL-Noten wurde als App installiert. Sie finden sie jetzt bei Ihren Apps bzw. auf dem Home-Bildschirm.');
    if (route && route.name !== 'loading') render();
  });

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true;
  }

  function isIOS() {
    var ua = navigator.userAgent || '';
    /* iPadOS meldet sich als „MacIntel“ mit Touch-Unterstützung. */
    return /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function triggerInstall() {
    if (!deferredInstall) return;
    var ev = deferredInstall;
    deferredInstall = null;
    ev.prompt();
    ev.userChoice.then(function (res) {
      /* Bei Abbruch das Event behalten – der Button bleibt nutzbar. */
      if (!res || res.outcome !== 'accepted') { deferredInstall = ev; }
      render();
    });
  }

  /* Teilen-Symbol (iOS): Rechteck mit Pfeil nach oben – zur Wiedererkennung. */
  var SHARE_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 11v9h14v-9"/></svg>';

  /* iOS/iPadOS-Anleitung: als Overlay OBEN RECHTS, weil dort in Safari auf
     dem iPad das Teilen-Symbol sitzt – der Pfeil zeigt direkt darauf. Die
     Schritte 3 und 4 werden durch Nachbildungen der iOS-Menüzeilen
     verdeutlicht. */
  function showIOSGuide() {
    var existing = document.querySelector('.ios-guide');
    if (existing) existing.remove();

    function mockRow(iconHtml, label, device) {
      return h('div.ios-mockrow',
        h('span.ios-mockicon', { html: iconHtml }),
        h('span', {}, label),
        device ? h('span.ios-mockdevice', {}, device) : null);
    }
    /* „Mehr anzeigen" (nur iPad): Safari zeigt dort eine Pfeilspitze nach unten. */
    var CHEVRON_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10l6 5 6-5"/></svg>';
    var ADD_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 9v6M9 12h6"/></svg>';

    /* Zwei Varianten, weil Safari das Teilen-Symbol unterschiedlich platziert:
       iPhone (schmal) unten in der Mitte, iPad oben rechts. Entsprechend
       sitzen Anleitung und Pfeil unterschiedlich, und auf dem iPhone entfällt
       „Mehr anzeigen“ – dort steht „Zum Home-Bildschirm“ direkt im Menü. */
    var narrow = window.matchMedia && window.matchMedia('(max-width: 600px)').matches;

    var steps = narrow
      ? [
          h('li', {}, 'SOL-Noten in Safari öffnen.'),
          h('li', {}, 'Das Teilen-Symbol ', h('span.ios-inline-icon', { html: SHARE_SVG }),
            ' antippen – unten in der Mitte, dort wo der Pfeil hinzeigt.'),
          h('li', {}, '„Zum Home-Bildschirm“ wählen und mit „Hinzufügen“ bestätigen:',
            mockRow(ADD_ICON, 'Zum Home-Bildschirm'),
            h('div.ios-mockconfirm', {}, 'Hinzufügen'))
        ]
      : [
          h('li', {}, 'SOL-Noten in Safari öffnen.'),
          h('li', {}, 'Das Teilen-Symbol ', h('span.ios-inline-icon', { html: SHARE_SVG }),
            ' antippen – oben rechts, dort wo der Pfeil hinzeigt.'),
          h('li', {}, '„Mehr anzeigen“ antippen:',
            mockRow(CHEVRON_ICON, 'Mehr anzeigen')),
          h('li', {}, '„Zum Home-Bildschirm“ wählen und mit „Hinzufügen“ bestätigen:',
            mockRow(ADD_ICON, 'Zum Home-Bildschirm'),
            h('div.ios-mockconfirm', {}, 'Hinzufügen'))
        ];

    var box = h('div.ios-guide' + (narrow ? '.ios-guide-bottom' : ''),
      narrow ? null : h('div.ios-guide-arrow', {}, '⬆'),
      h('div.ios-guide-head',
        h('strong', {}, 'SOL-Noten installieren'),
        h('button.icon-btn.ios-guide-close', { 'aria-label': 'Schließen', onclick: function () { box.remove(); } }, '×')),
      h('ol.install-steps', steps),
      h('p.hint', {}, 'Danach erscheint SOL-Noten als App auf dem Home-Bildschirm.'),
      narrow ? h('div.ios-guide-arrow-down', {}, '⬇') : null);
    document.body.appendChild(box);
  }

  /* Plattformgenaue Installationsanleitung (wenn kein nativer Dialog möglich). */
  function installInstructions() {
    return h('div',
      h('p.hint', {}, 'In Chrome oder Edge lässt sich SOL-Noten so installieren:'),
      h('ol.install-steps',
        h('li', {}, 'Auf das Installations-Symbol rechts in der Adressleiste klicken (Monitor mit Pfeil), oder'),
        h('li', {}, 'über das Browser-Menü (⋮ bzw. …): „SOL-Noten installieren“ / „Apps“ / „Speichern und teilen“ → „Seite installieren“.')),
      h('p.hint', {}, 'Firefox am PC unterstützt die Installation von Web-Apps leider nicht – dort läuft SOL-Noten einfach im Browser weiter.'));
  }

  /* Karte für die Einstellungsseite – unabhängig davon, ob der Hinweis auf
     dem Startbildschirm ausgeblendet wurde, bleibt die Installation hier
     immer erreichbar. */
  function installSection() {
    if (isStandalone()) {
      return h('p.hint', {}, 'SOL-Noten läuft bereits als installierte App – alles erledigt.');
    }
    if (deferredInstall) {
      return h('div.actions-col',
        h('p.hint', {}, 'SOL-Noten lässt sich als App installieren: eigenes Symbol, eigenes Fenster, ohne Browser-Leisten – Daten und Anmeldung bleiben dabei erhalten.'),
        h('button.btn-primary.btn-block', { onclick: triggerInstall }, 'App installieren'));
    }
    if (isIOS()) {
      return h('div.actions-col',
        h('p.hint', {}, 'Auf iPhone und iPad erfolgt die Installation in Safari über das Teilen-Menü. Die Anleitung führt Schritt für Schritt hindurch.'),
        h('button.btn-primary.btn-block', { onclick: showIOSGuide }, 'Installations-Anleitung anzeigen'));
    }
    return installInstructions();
  }

  /* Dezente, ausblendbare Einladung auf dem Startbildschirm. */
  function installBanner() {
    var st = S();
    if (isStandalone() || (st.settings && st.settings.installHintDismissed)) return null;
    if (!deferredInstall && !isIOS()) return null;
    return h('div.card.card-tight.install-banner',
      h('p.hint', {}, 'Tipp: SOL-Noten lässt sich als App installieren – mit eigenem Symbol auf dem Startbildschirm.'),
      h('div.row-gap',
        deferredInstall
          ? h('button.btn-small.btn-primary', { onclick: triggerInstall }, 'App installieren')
          : h('button.btn-small.btn-primary', { onclick: function () {
              if (isIOS()) showIOSGuide();
              else UI.modal('SOL-Noten installieren', installInstructions(), [{ label: 'Schließen', value: true, primary: true }]);
            } }, 'Anleitung anzeigen'),
        h('button.btn-small.btn-plain', { onclick: function () {
          st.settings.installHintDismissed = true;
          Store.save();
          render();
        } }, 'Nicht mehr anzeigen')));
  }

  Store.init().then(function () {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        /* Beim Start aktiv nach einer neuen Version suchen */
        if (reg.update) reg.update().catch(function () {});
        reg.addEventListener('updatefound', function () {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', function () {
            if (nw.state === 'activated' && navigator.serviceWorker.controller) {
              showUpdateBanner();
            }
          });
        });
      }).catch(function () {});
    }
    startAutolockWatch();
    if (Store.isLocked()) go('lock');
    else if (!S().settings.bundesland || S().schoolYears.length === 0) go('setup');
    else if (!Store.isEncrypted() && CryptoBox.supported()) {
      /* Grundeinrichtung vorhanden, aber PIN-Schritt (z. B. durch Neuladen) übersprungen:
         Pflicht-PIN nachholen, damit die Daten verschlüsselt werden. */
      go('home');
      requirePinSetup(function () { render(); });
    }
    else go('home');
  }).catch(function (e) {
    document.body.textContent = 'Die App konnte nicht starten: ' + e.message;
  });

  function afterUnlock() {
    if (!S().settings.bundesland || S().schoolYears.length === 0) go('setup');
    else go('home');
  }

  function doLock() {
    if (!Store.isEncrypted() || Store.isLocked()) return;
    lockThisTab();
    broadcastLock(); /* alle anderen offenen Tabs ebenfalls sperren */
  }

  /* Nur diesen Tab sperren (ohne Signal an andere Tabs — vermeidet Echo-Schleifen). */
  function lockThisTab() {
    Store.lock();
    photoCache = {}; /* entschlüsselte Fotos nicht im Speicher belassen */
    go('lock');
  }

  /* Tab-übergreifende Sperre: Sperrt ein Tab (Timer, Menü, Verlassen der App),
     erhalten alle anderen Tabs ein Signal und sperren sich selbst. Ohne dies
     bliebe auf einem geteilten Gerät ein "vergessener" zweiter Tab entsperrt.
     Primär BroadcastChannel; Fallback: storage-Event (feuert nur in fremden Tabs). */
  var lockChannel = null;
  var LOCK_LS_KEY = 'sol-noten-lock';
  function onRemoteLock() {
    if (!Store.isEncrypted() || Store.isLocked()) return;
    lockThisTab();
  }
  function initLockSync() {
    if ('BroadcastChannel' in window) {
      lockChannel = new BroadcastChannel('sol-noten-lock');
      lockChannel.onmessage = onRemoteLock;
    } else {
      window.addEventListener('storage', function (e) {
        if (e.key === LOCK_LS_KEY && e.newValue) onRemoteLock();
      });
    }
  }
  function broadcastLock() {
    if (lockChannel) { try { lockChannel.postMessage('lock'); } catch (e) {} return; }
    try { localStorage.setItem(LOCK_LS_KEY, String(Date.now())); } catch (e) {}
  }
  initLockSync();

  /* Automatische Sperre: bei Inaktivität bzw. beim Verlassen der App ("sofort") */
  var lastActivity = Date.now();
  var hiddenAt = null;
  function startAutolockWatch() {
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
      document.addEventListener(ev, function () { lastActivity = Date.now(); }, { passive: true });
    });
    document.addEventListener('visibilitychange', function () {
      var m = Store.getAutolock();
      if (!Store.isEncrypted() || m === null || m === undefined) return;
      if (document.hidden) {
        hiddenAt = Date.now();
        if (m === 0) doLock(); /* sofort */
      } else if (hiddenAt && m > 0 && Date.now() - hiddenAt >= m * 60000) {
        doLock();
      }
    });
    setInterval(function () {
      var m = Store.getAutolock();
      if (!Store.isEncrypted() || Store.isLocked() || m === null || m === undefined || m === 0) return;
      if (Date.now() - lastActivity >= m * 60000) doLock();
    }, 20000);
  }

  function showUpdateBanner() {
    if (document.getElementById('update-banner')) return;
    var b = h('div#update-banner.update-banner',
      h('span', {}, 'Eine neue Version von SOL-Noten ist geladen.'),
      h('button.btn-small.btn-primary', { onclick: function () { location.reload(); } }, 'Jetzt aktualisieren')
    );
    document.body.appendChild(b);
  }

  /* ================= Grundgerüst ================= */

  var THEMES = [
    { id: 'petrol',    name: 'Petrol (Standard)', c: '#0e7c74' },
    { id: 'blau',      name: 'Ozeanblau',         c: '#1d63b8' },
    { id: 'himmel',    name: 'Himmelblau',        c: '#0284c7' },
    { id: 'orange',    name: 'Orange',            c: '#d1580a' },
    { id: 'beere',     name: 'Beere',             c: '#b83280' },
    { id: 'aubergine', name: 'Aubergine',         c: '#7a3b78' },
    { id: 'wald',      name: 'Waldgrün',          c: '#3d7a3f' },
    { id: 'schiefer',  name: 'Schieferblau',      c: '#4a6274' }
  ];
  function applyTheme() {
    var t = (S() && S().settings && S().settings.theme) || 'petrol';
    document.documentElement.setAttribute('data-theme', t);
    var th = null;
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === t) th = THEMES[i];
    var m = document.querySelector('meta[name="theme-color"]');
    if (m && th) m.setAttribute('content', th.c);
  }

  function render() {
    applyTheme();
    var appEl = document.getElementById('app');
    clear(appEl);
    var view = views[route.name];
    if (!view) return;
    try {
      var screen = view(route.params);
      appEl.appendChild(screen);
      /* „Über diese App“ unten auf jeder Seite – außer auf dem Sperrbildschirm. */
      if (route.name !== 'lock' && screen && screen.classList && screen.classList.contains('screen')) {
        screen.appendChild(aboutBox());
      }
    } catch (err) {
      console.error('Fehler beim Seitenaufbau:', err);
      clear(appEl);
      appEl.appendChild(h('div.screen',
        h('div.card',
          h('h2', {}, 'Hier ist etwas schiefgelaufen'),
          h('p.hint', {}, 'Beim Aufbau dieser Seite ist ein Fehler aufgetreten. Ihre Daten sind davon nicht betroffen.'),
          h('p.hint', {}, 'Technische Angabe für die Fehlersuche: ' + (err && err.message ? err.message : err)),
          h('button.btn-primary.btn-block', { onclick: function () { go('home'); } }, 'Zur Kursübersicht')
        )
      ));
    }
  }

  /* Wiederverwendbarer „Über diese App“-Kasten. */
  function aboutBox() {
    return h('div.about-box',
      h('div.section-head', {}, 'Über diese App'),
      h('div.card',
        h('p', {}, 'SOL-Noten ', h('span.beta-tag', {}, 'Beta')),
        h('p.hint', {}, 'Betaversion zu Testzwecken, Nutzung auf eigenes Risiko. Fehlermeldungen und Featurewünsche bitte an ',
          h('a', { href: 'mailto:vandelaar@live.de' }, 'vandelaar@live.de'), '.'),
        h('p.hint', {}, 'Version ' + APP_VERSION + ' · © 2026 Andreas Vandelaar'),
        h('p.hint', {}, 'Alle Daten sind verschlüsselt und bleiben ausschließlich auf diesem Gerät. Sie können die Daten durch verschlüsselte Backups auf andere Geräte übertragen.'),
        h('details.pct-details',
          h('summary', {}, 'Haftungshinweis anzeigen'),
          h('p.hint', {}, DISCLAIMER_TEXT),
          (S().settings.disclaimerAcceptedAt
            ? h('p.hint', {}, 'Bestätigt am ' + UI.fmtDate(S().settings.disclaimerAcceptedAt.slice(0, 10)) + '.')
            : null))
      )
    );
  }

  var NOTE_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h11l3 3v15H5z"/><path d="M9 9h6M9 13h6M9 17h3"/></svg>';
  var HOME_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>';

  /* Geschlossenes Buch (Stundeninhalte) – gleicher Stil wie HOME_SVG. */
  var BOOK_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3H19v18H6.5A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H19"/><path d="M9 7h6"/></svg>';
  var LOCK_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

  function header(title, backTo, extra) {
    var right = [];
    // Echte Zusatz-Buttons (z. B. „Drucken") zuerst; leere Platzhalter ignorieren.
    if (extra && !(extra.tagName === 'SPAN' && !extra.hasChildNodes())) right.push(extra);
    if (route.name !== 'settings') {
      right.push(h('button.icon-btn', { onclick: function () { go('settings', { back: route }); }, 'aria-label': 'Einstellungen' }, '⚙'));
    }
    if (backTo) {
      right.push(h('button.icon-btn', {
        onclick: function () { go('home'); }, 'aria-label': 'Zur Kursübersicht', html: HOME_SVG
      }));
    }
    return h('header.topbar', {},
      backTo
        ? h('button.icon-btn', { onclick: function () { go(backTo.name, backTo.params); }, 'aria-label': 'Zurück' }, '‹')
        : h('span.logo-dot', { html: LOGO_SVG }),
      backTo
        ? h('h1.topbar-title', {}, title)
        : h('h1.topbar-title', {}, title, h('span.beta-tag', {}, 'Beta')),
      right
    );
  }

  var LOGO_SVG = '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<text x="24" y="27" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="24" fill="currentColor">15</text>' +
    '<circle cx="15" cy="37" r="3" fill="currentColor"/>' +
    '<circle cx="24" cy="37" r="3" fill="currentColor"/>' +
    '<circle cx="33" cy="37" r="3" fill="currentColor"/></svg>';

  var views = {};

  /* ================= Sitzplan mit Fotos ================= */

  var photoCache = {}; /* studentId -> dataUrl (nur im Speicher, für schnelle Anzeige) */

  function loadPhotoInto(studentId, imgEl) {
    if (photoCache[studentId] !== undefined) {
      if (photoCache[studentId]) imgEl.src = photoCache[studentId];
      return;
    }
    Store.getPhoto(studentId).then(function (url) {
      photoCache[studentId] = url || null;
      if (url && imgEl.isConnected) imgEl.src = url;
    });
  }

  function initials(stu) {
    return ((stu.firstName || ' ')[0] + (stu.lastName || ' ')[0]).toUpperCase();
  }

  function photoTile(stu, opts) {
    opts = opts || {};
    var img = h('img.photo-img', { alt: '' });
    var cls = 'div.photo-avatar' + (opts.small ? '.small' : '') + (opts.seat ? '.seat' : '');
    var tile = h(cls,
      h('span.photo-fallback', {}, initials(stu)), img);
    loadPhotoInto(stu.id, img);
    return tile;
  }

  /* Kleines Schülerbild links neben dem Namen (für Listen wie OBT / Quartalsabschluss). */
  function nameWithPhoto(stu) {
    return h('div.name-with-photo',
      photoTile(stu, { small: true }),
      h('div.student-name', {}, stu.lastName + ', ' + stu.firstName));
  }

  /* Kursname (Klasse - Fach) als weiße Box unterhalb der Kopfzeile – auf allen Kursseiten. */
  function courseBox(course) {
    var cls = Store.classById(course.classId);
    return h('div.card.card-tight.course-box',
      h('strong', {}, cls.name + ' - ' + course.subject));
  }

  /* Schuljahr als Kurzform für Dateinamen: „2026/27" -> „26-27", „2026/2027" -> „26-27". */
  function yearShort(year) {
    var m = (year && year.name || '').match(/(\d{2})(\d{2})\D+(\d{2})?(\d{2})/);
    if (m) return m[2] + '-' + (m[4] || m[3] || '');
    return (year && year.name || '').replace(/[\/\s]+/g, '-');
  }

  views.seating = function (p) {
    var course = Store.courseById(p.id);
    var cls = Store.classById(course.classId);
    var st = S();

    /* Einmaliger Datenschutzhinweis beim ersten Öffnen */
    if (!st.settings.seatingConsentAt) {
      var consentCheck = h('input', { type: 'checkbox' });
      var consentErr = h('p.hint.error-text');
      return h('div.screen',
        header('Sitzplan', { name: 'course', params: { id: course.id } }),
        courseBox(course),
        h('div.card',
          h('h3', {}, 'Hinweis zu Schülerfotos'),
          h('p', {}, 'Fotos von Schülerinnen und Schülern sind besonders schützenswerte personenbezogene Daten. ' +
            'Nehmen Sie Fotos nur mit Einwilligung der Schüler bzw. der Erziehungsberechtigten auf.'),
          h('p', {}, 'Die Fotos werden ausschließlich lokal und verschlüsselt auf diesem Gerät gespeichert. ' +
            'Sie verlassen das Gerät nicht und sind nicht Teil des normalen Noten-Backups – für die Fotos gibt es eine eigene Sicherung.'),
          h('label.check-row', {}, consentCheck,
            h('span', {}, 'Ich habe den Hinweis gelesen und beachte die Einwilligungspflicht.')),
          consentErr,
          h('button.btn-primary.btn-block', { onclick: function () {
            if (!consentCheck.checked) {
              consentErr.textContent = 'Bitte bestätigen Sie den Hinweis, um fortzufahren.';
              return;
            }
            st.settings.seatingConsentAt = new Date().toISOString();
            Store.save();
            render();
          } }, 'Verstanden – Sitzplan öffnen')
        )
      );
    }

    /* Mindestens ein Sitzplan muss existieren (positions: studentId -> {r,c}). */
    if (!Store.seatingsOf(course).length) Store.addSeating(course.id, 'Standard');
    var students = cls.students.slice().sort(function (a, b) {
      return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName, 'de');
    });

    /* Planauswahl gehört in die Kursnamen-Box (rechtsbündig neben dem Namen);
       die Verwaltungs-Buttons bleiben im Bearbeiten-Modus beim Raster. */
    var planSelTop = h('select.input.plan-select');
    Store.seatingsOf(course).forEach(function (sp) {
      planSelTop.appendChild(h('option', { value: sp.id, selected: sp.id === course.activeSeating }, sp.name));
    });
    planSelTop.addEventListener('change', function () {
      selectedSeatStudent = null;
      Store.setActiveSeating(course.id, planSelTop.value);
      render();
    });

    return h('div.screen',
      header('Sitzplan', { name: 'course', params: { id: course.id } }),
      p.tab === 'photos'
        ? courseBox(course)
        : h('div.card.card-tight.course-box.course-box-row',
            h('strong', {}, cls.name + ' - ' + course.subject),
            planSelTop),
      h('div.tabbar',
        h('button.tab' + (p.tab !== 'photos' ? '.active' : ''), {
          onclick: function () { go('seating', { id: course.id, tab: 'plan' }); } }, 'Sitzplan'),
        h('button.tab' + (p.tab === 'photos' ? '.active' : ''), {
          onclick: function () { go('seating', { id: course.id, tab: 'photos' }); } }, 'Fotos verwalten')
      ),
      p.tab === 'photos' ? photoManager() : seatingGrid()
    );

    /* ---- Fotoverwaltung ---- */
    function photoManager() {
      var rows = students.map(function (stu) {
        var fileInput = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
        fileInput.addEventListener('change', function () {
          var f = fileInput.files[0]; fileInput.value = '';
          if (!f) return;
          Photo.processFile(f).then(function (dataUrl) {
            return Store.savePhoto(stu.id, dataUrl).then(function () {
              photoCache[stu.id] = dataUrl;
              toast('Foto gespeichert.');
              render();
            });
          }).catch(function (e) { UI.modal('Foto konnte nicht verarbeitet werden', h('p', {}, e.message)); });
        });
        var cameraInput = h('input', { type: 'file', accept: 'image/*', capture: 'user', style: { display: 'none' } });
        cameraInput.addEventListener('change', function () {
          var f = cameraInput.files[0]; cameraInput.value = '';
          if (!f) return;
          Photo.processFile(f).then(function (dataUrl) {
            return Store.savePhoto(stu.id, dataUrl).then(function () {
              photoCache[stu.id] = dataUrl; toast('Foto gespeichert.'); render();
            });
          }).catch(function (e) { UI.modal('Foto konnte nicht verarbeitet werden', h('p', {}, e.message)); });
        });

        var hasImg = photoCache[stu.id];
        return h('div.photo-row',
          photoTile(stu),
          h('div.photo-info', h('div.student-name', {}, stu.lastName + ', ' + stu.firstName)),
          h('div.photo-actions',
            h('button.btn-small.btn-plain', { onclick: function () { cameraInput.click(); } }, 'Kamera'),
            h('button.btn-small.btn-plain', { onclick: function () { fileInput.click(); } }, 'Galerie'),
            hasImg ? h('button.btn-small.btn-plain.danger-text', { onclick: function () {
              UI.confirmDialog('Foto entfernen?', stu.lastName + ', ' + stu.firstName + ' – Foto löschen?', 'Löschen', true)
                .then(function (ok) {
                  if (!ok) return;
                  Store.deletePhoto(stu.id).then(function () {
                    photoCache[stu.id] = null; toast('Foto entfernt.'); render();
                  });
                });
            } }, 'Entfernen') : null,
            fileInput, cameraInput
          )
        );
      });
      return h('div',
        h('p.hint', {}, 'Fotos werden auf 200 × 200 Pixel verkleinert und verschlüsselt gespeichert. Ein Foto gilt für alle Kurse dieser Klasse.'),
        h('div.card.card-list', {}, rows.length ? rows : h('div.empty', h('p', {}, 'Diese Klasse hat noch keine Schüler/innen.'))),
        h('p.hint', {}, 'Die Sicherung aller Fotos (klassenübergreifend) finden Sie zentral unter ',
          h('button.btn-inline', { onclick: function () { go('settings', { back: { name: 'seating', params: { id: course.id, tab: 'photos' } } }); } }, 'Einstellungen → Foto-Sicherung'),
          '.')
      );
    }

    /* ---- Sitzplan-Raster ---- */
    function seatingGrid() {
      var editMode = p.mode === 'edit';
      var plan = Store.activeSeating(course);
      var plans = Store.seatingsOf(course);
      var cols = plan.cols;
      var positions = plan.positions;
      var placed = {};
      Object.keys(positions).forEach(function (sid) { placed[sid] = positions[sid]; });
      var unplaced = students.filter(function (s) { return !placed[s.id]; });

      var maxRow = 0;
      Object.keys(placed).forEach(function (sid) { if (placed[sid].r > maxRow) maxRow = placed[sid].r; });
      var rows = Math.max(4, maxRow + 2);

      var colSel = h('select.input', { style: { maxWidth: '7rem' } });
      [3, 4, 5, 6, 7, 8, 9, 10].forEach(function (n) {
        colSel.appendChild(h('option', { value: n, selected: n === cols }, n + ' Spalten'));
      });
      colSel.addEventListener('change', function () {
        plan.cols = Number(colSel.value); Store.save(); render();
      });

      var byPos = {};
      Object.keys(placed).forEach(function (sid) { byPos[placed[sid].r + '_' + placed[sid].c] = sid; });

      var grid = h('div.seat-grid' + (editMode ? '.edit' : ''), { style: { gridTemplateColumns: 'repeat(' + cols + ', 88px)' } });
      for (var r = rows - 1; r >= 0; r--) {
        for (var c = 0; c < cols; c++) {
          (function (r, c) {
            var sid = byPos[r + '_' + c];
            var cell = h('div.seat-cell' + (sid ? '.filled' : '') + (editMode && selectedSeatStudent ? '.targetable' : ''), {
              onclick: function () {
                if (editMode) {
                  if (selectedSeatStudent) {
                    plan.positions[selectedSeatStudent] = { r: r, c: c };
                    selectedSeatStudent = null; Store.save(); render();
                  } else if (sid) {
                    selectedSeatStudent = sid; render();
                  }
                } else if (sid) {
                  /* Noten-geben-Modus: Person in der SoLei-Vergabe öffnen */
                  openStudentGrading(sid);
                }
              }
            });
            if (sid) {
              var stu = cls.students.find(function (x) { return x.id === sid; });
              if (stu) {
                cell.appendChild(photoTile(stu, { seat: true }));
                cell.appendChild(seatLabel(stu));
                if (editMode && selectedSeatStudent === sid) cell.classList.add('selected');
              }
            }
            grid.appendChild(cell);
          })(r, c);
        }
      }

      var gridScroll = h('div.seat-scroll', {}, grid);

      var teacherDesk = h('div.teacher-desk', h('span', {}, 'Lehrerpult'));

      var modeToggle = h('div.seat-modebar',
        h('button.seat-mode-btn' + (!editMode ? '.active' : ''), {
          onclick: function () { if (editMode) { selectedSeatStudent = null; go('seating', { id: course.id, tab: 'plan', mode: 'grade' }); } }
        }, 'SL-Punkte geben'),
        h('button.seat-mode-btn' + (editMode ? '.active' : ''), {
          onclick: function () { if (!editMode) go('seating', { id: course.id, tab: 'plan', mode: 'edit' }); }
        }, 'Sitzplan bearbeiten')
      );

      /* ---- Planauswahl und -verwaltung ----
         Namen werden frei vergeben (in der Regel die Raumnummer). */
      function askPlanName(title, preset, confirmLabel) {
        var inp = h('input.input', { type: 'text', value: preset || '', placeholder: 'z.B. 3-EG-080' });
        var err = h('p.hint.error-text');
        return UI.modal(title, [
          h('label.field', h('span.field-label', {}, 'Name des Sitzplans'), inp,
            h('p.hint', {}, 'Meist die Raumnummer – frei wählbar.')),
          err
        ], [
          { label: 'Abbrechen', value: false },
          { label: confirmLabel, value: true, primary: true,
            validate: function () {
              if (!inp.value.trim()) { err.textContent = 'Bitte einen Namen eingeben.'; return false; }
              return true;
            } }
        ]).then(function (ok) { return ok ? inp.value.trim() : null; });
      }

      var planBar = editMode
        ? h('div.row-between.plan-bar',
            h('span.hint', {}, 'Sitzplan „' + plan.name + '“'),
            h('div.row-gap',
              h('button.btn-small.btn-plain', { onclick: function () {
                askPlanName('Neuer Sitzplan', '', 'Anlegen').then(function (name) {
                  if (!name) return;
                  Store.addSeating(course.id, name);
                  selectedSeatStudent = null;
                  toast('Sitzplan „' + name + '“ angelegt – noch niemand platziert.');
                  render();
                });
              } }, '+ Neu'),
              h('button.btn-small.btn-plain', { onclick: function () {
                askPlanName('Sitzplan duplizieren', plan.name + ' (Kopie)', 'Duplizieren').then(function (name) {
                  if (!name) return;
                  Store.addSeating(course.id, name, plan.id);
                  selectedSeatStudent = null;
                  toast('Sitzplan „' + name + '“ als Kopie angelegt.');
                  render();
                });
              } }, 'Duplizieren'),
              h('button.btn-small.btn-plain', { onclick: function () {
                askPlanName('Sitzplan umbenennen', plan.name, 'Umbenennen').then(function (name) {
                  if (!name) return;
                  Store.renameSeating(course.id, plan.id, name);
                  render();
                });
              } }, 'Umbenennen'),
              plans.length > 1
                ? h('button.btn-small.btn-plain.danger-text', { onclick: function () {
                    UI.confirmDialog('Sitzplan löschen?',
                      'Der Sitzplan „' + plan.name + '“ und seine Platzierungen werden entfernt. Fotos und alle anderen Sitzpläne bleiben erhalten.',
                      'Löschen', true).then(function (ok) {
                        if (!ok) return;
                        Store.removeSeating(course.id, plan.id);
                        selectedSeatStudent = null;
                        toast('Sitzplan gelöscht.');
                        render();
                      });
                  } }, 'Löschen')
                : null))
        : null;

      if (!editMode) {
        return h('div',
          modeToggle,
          h('p.hint', {}, 'Tippen Sie auf eine Person, um ihre SoLei-Punkte zu vergeben (aktuelles Quartal, heutiges Datum).'),
          gridScroll,
          teacherDesk,
          unplaced.length
            ? h('p.hint', {}, unplaced.length + ' Schüler/innen sind noch nicht platziert. Zum Setzen in den Modus „Sitzplan bearbeiten“ wechseln.')
            : null
        );
      }

      return h('div',
        modeToggle,
        planBar,
        h('div.row-between',
          h('label.hint', {}, 'Raster: ', colSel),
          h('div.row-gap',
            h('button.btn-small.btn-plain', { onclick: autoArrange }, 'Automatisch anordnen'),
            h('button.btn-small.btn-plain', { onclick: clearPlan }, 'Plan leeren'))
        ),
        selectedSeatStudent
          ? h('p.hint.seat-hint', {}, 'Tippen Sie auf einen freien Platz, um ' +
              nameOf(selectedSeatStudent) + ' zu setzen – oder ' ,
              h('button.btn-inline', { onclick: function () { selectedSeatStudent = null; render(); } }, 'abbrechen'), '.')
          : h('p.hint', {}, 'Bearbeiten-Modus: Tippen Sie eine Person an und dann auf einen Platz. Eine gesetzte Person kann durch Antippen wieder ausgewählt und verschoben werden.'),
        gridScroll,
        teacherDesk,
        h('div.section-head', {}, 'Noch nicht platziert (' + unplaced.length + ')'),
        h('div.seat-pool', {}, unplaced.length
          ? unplaced.map(function (stu) {
              return h('button.pool-chip' + (selectedSeatStudent === stu.id ? '.selected' : ''), {
                onclick: function () {
                  selectedSeatStudent = (selectedSeatStudent === stu.id ? null : stu.id); render();
                }
              }, photoTile(stu, { small: true }), h('span', {}, stu.lastName));
            })
          : h('span.hint', {}, 'Alle Schüler/innen sind platziert.'))
      );

      function openStudentGrading(sid) {
        var idx = students.findIndex(function (x) { return x.id === sid; });
        captureState.mode = 'student';
        captureState.studentIdx = idx >= 0 ? idx : 0;
        captureState.date = Store.todayISO();
        go('capture', { id: course.id, from: 'seating' });
      }
      function nameOf(sid) {
        var s = cls.students.find(function (x) { return x.id === sid; });
        return s ? s.lastName + ', ' + s.firstName : '';
      }
      function autoArrange() {
        var pos = {};
        students.forEach(function (stu, i) {
          pos[stu.id] = { r: Math.floor(i / cols), c: i % cols };
        });
        plan.positions = pos; selectedSeatStudent = null; Store.save(); render();
      }
      function clearPlan() {
        UI.confirmDialog('Sitzplan leeren?', 'Alle Platzierungen dieses Kurses werden entfernt (Fotos bleiben erhalten).', 'Leeren', true)
          .then(function (ok) { if (!ok) return; plan.positions = {}; selectedSeatStudent = null; Store.save(); render(); });
      }
    }

    /* Kachelbeschriftung: Vorname ganz, Nachname bei Bedarf abgekürzt. */
    function seatLabel(stu) {
      var last = stu.lastName || '';
      var lastShort = last.length > 10 ? last.slice(0, 9) + '.' : last;
      return h('span.seat-name', {}, (stu.firstName || '') + ' ' + lastShort);
    }
  };

  var selectedSeatStudent = null;
  var lockKeyHandler = null;

  function photoBackupCard() {
    var days = Store.daysSincePhotoExport();
    var fileInput = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
    fileInput.addEventListener('change', function () {
      var f = fileInput.files[0]; fileInput.value = '';
      if (!f) return;
      if (f.size > 50 * 1024 * 1024) {
        UI.modal('Import fehlgeschlagen', h('p', {}, 'Die Datei ist zu groß für eine SOL-Noten-Foto-Sicherung (Limit 50 MB) und wurde abgelehnt.'));
        return;
      }
      f.text().then(function (text) {
        var parsed = Store.parsePhotoBackup(text);
        var getData = parsed.encrypted
          ? askBackupPassword(f.name).then(function (pw) {
              if (pw == null) return null;
              return CryptoBox.decrypt(parsed.envelope, pw).then(function (plain) { return JSON.parse(plain); });
            })
          : Promise.resolve(parsed.data);
        return getData.then(function (data) {
          if (!data) return;
          return Store.applyPhotoImport(data).then(function (n) {
            photoCache = {};
            toast(n + ' Fotos eingespielt.');
            render();
          });
        });
      }).catch(function (e) { UI.modal('Import fehlgeschlagen', h('p', {}, e.message)); });
    });

    return h('div.card',
      h('p.hint', {}, S().settings.lastPhotoExport
        ? 'Letzte Foto-Sicherung: ' + UI.fmtDate(S().settings.lastPhotoExport.slice(0, 10)) +
          (days > 30 ? ' (vor ' + days + ' Tagen)' : '')
        : 'Die Fotos wurden noch nie gesichert. Fotos sind nicht Teil des normalen Noten-Backups.'),
      h('div.actions-col',
        h('button.btn-primary.btn-block', { onclick: function () { photoExportDialog(); } }, 'Fotos jetzt sichern'),
        h('button.btn-plain.btn-block', { onclick: function () { fileInput.click(); } }, 'Foto-Sicherung einspielen'),
        fileInput)
    );

    function askBackupPassword(fileName) {
      var pw = h('input.input', { type: 'password', placeholder: 'Passwort' });
      return UI.modal('Verschlüsselte Foto-Sicherung',
        [h('p.hint', {}, 'Die Datei „' + fileName + '“ ist verschlüsselt. Bitte Passwort eingeben.'),
         h('label.field', h('span.field-label', {}, 'Passwort'), pw)],
        [{ label: 'Abbrechen', value: false }, { label: 'Entschlüsseln', value: true, primary: true }]
      ).then(function (ok) { return ok ? pw.value : null; });
    }
  }

  function photoExportDialog() {
    var pw1 = h('input.input', { type: 'password', autocomplete: 'new-password', placeholder: 'Passwort' });
    var pw2 = h('input.input', { type: 'password', autocomplete: 'new-password', placeholder: 'Wiederholung' });
    var err = h('p.hint.error-text');
    UI.modal('Fotos sichern', [
      h('p.hint', {}, 'Alle Fotos werden in eine einzelne, mit Passwort verschlüsselte Sicherungsdatei geschrieben. Da Schülerfotos besonders schützenswert sind, ist ein Passwort verpflichtend.'),
      h('label.field', h('span.field-label', {}, 'Passwort'), pw1),
      h('label.field', h('span.field-label', {}, 'Wiederholung'), pw2),
      h('p.hint', {}, 'Wichtig: Ein vergessenes Passwort kann nicht wiederhergestellt werden – die Sicherungsdatei ist dann unlesbar. Bewahren Sie das Passwort sicher auf (z. B. in einem Passwort-Manager).'),
      err
    ], [
      { label: 'Abbrechen', value: false },
      { label: 'Sicherung speichern', value: true, primary: true, validate: function () {
          if (pw1.value.length < 6) { err.textContent = 'Bitte ein Passwort mit mindestens 6 Zeichen vergeben.'; return false; }
          if (pw1.value !== pw2.value) { err.textContent = 'Die Passwörter stimmen nicht überein.'; return false; }
          return true;
        } }
    ]).then(function (ok) {
      if (!ok) return;
      Store.exportPhotos(pw1.value).then(function () {
        toast('Verschlüsselte Foto-Sicherung wird gespeichert.');
        render();
      });
    });
  }

  /* ================= Sperrbildschirm ================= */

  views.lock = function () {
    var pin = '';
    var dots = h('div.pin-dots');
    var msg = h('p.hint.lock-msg');
    var padHost = h('div.pin-pad');
    var busy = false;
    var bioTries = 0;
    var bioActive = Store.biometricsEnabled();
    var showPinPad = !bioActive; /* bei aktiver Biometrie zunächst Biometrie-Ansicht */
    var kind = Store.secretKind();
    var pwInput = null, pwBtn = null;
    if (kind === 'password') {
      pwInput = h('input.input.lock-pw', { type: 'password', autocomplete: 'current-password', placeholder: 'Passwort' });
      pwInput.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { submit(); ev.preventDefault(); }
      });
      pwBtn = h('button.btn-primary.btn-block', { onclick: function () { submit(); } }, 'Entsperren');
    }
    /* Eingabemöglichkeiten sperren/freigeben – je nach Modus Ziffernfeld oder Passwortfeld. */
    function setLockDisabled(d) {
      if (kind === 'password') {
        if (pwInput) pwInput.disabled = d;
        if (pwBtn) pwBtn.disabled = d;
      } else {
        drawPad(d);
      }
    }

    function refreshDots() {
      UI.clear(dots);
      for (var i = 0; i < Math.max(pin.length, 4); i++) {
        dots.appendChild(h('span.pin-dot' + (i < pin.length ? '.filled' : '')));
      }
    }

    function waitCountdown() {
      var w = Store.getLockWait();
      if (w <= 0) { msg.textContent = ''; setLockDisabled(false); return; }
      setLockDisabled(true);
      msg.textContent = 'Zu viele Fehlversuche – bitte ' + w + ' Sekunden warten.';
      var iv = setInterval(function () {
        if (!msg.isConnected) { clearInterval(iv); return; }
        var rest = Store.getLockWait();
        if (rest <= 0) {
          clearInterval(iv);
          msg.textContent = '';
          setLockDisabled(false);
        } else {
          msg.textContent = 'Zu viele Fehlversuche – bitte ' + rest + ' Sekunden warten.';
        }
      }, 1000);
    }

    function submit() {
      var secret = kind === 'password' ? (pwInput ? pwInput.value : '') : pin;
      if (busy || (kind === 'password' ? secret.length === 0 : secret.length < 4)) return;
      busy = true;
      Store.unlock(secret).then(function () {
        busy = false;
        afterUnlock();
      }).catch(function (err) {
        busy = false;
        pin = '';
        if (pwInput) pwInput.value = '';
        if (kind !== 'password') refreshDots();
        if (err.waitSeconds > 0) waitCountdown();
        else {
          msg.textContent = (kind === 'password' ? 'Falsches Passwort.' : 'Falsche PIN.') +
            (err.attempts >= 3 ? ' (' + err.attempts + ' Fehlversuche)' : '');
        }
      });
    }

    function drawPad(disabled) {
      UI.clear(padHost);
      var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'];
      keys.forEach(function (k) {
        var cls = k === 'OK' ? '.pin-key.pin-ok' : '.pin-key';
        padHost.appendChild(h('button' + cls, {
          disabled: disabled ? true : null,
          onclick: function () {
            if (k === '⌫') { pin = pin.slice(0, -1); }
            else if (k === 'OK') { submit(); return; }
            else if (pin.length < 8) { pin += k; }
            refreshDots();
          }
        }, k));
      });
    }

    function forgotPin() {
      UI.modal(kind === 'password' ? 'Passwort vergessen?' : 'PIN vergessen?',
        h('div', {},
          h('p', {}, 'Ohne ' + (kind === 'password' ? 'Passwort' : 'PIN') + ' können die verschlüsselten Daten auf diesem Gerät nicht wiederhergestellt werden – es gibt bewusst keine Hintertür.'),
          h('p', {}, 'Der Weg zurück: App zurücksetzen und anschließend Ihre Backup-Datei einspielen (Passwort der Backup-Datei bzw. bei automatischen Ordner-Backups die damalige PIN bzw. das damalige Passwort erforderlich).'),
          h('p.error-text', {}, 'Das Zurücksetzen löscht alle Daten auf diesem Gerät unwiderruflich.')
        ), [
          { label: 'Abbrechen', value: false },
          { label: 'App zurücksetzen …', value: true, danger: true }
        ]).then(function (ok) {
          if (!ok) return;
          var confirmInput = h('input.input', { type: 'text', placeholder: 'LÖSCHEN' });
          UI.modal('Wirklich alle Daten löschen?',
            [h('p', {}, 'Bitte tippen Sie zur Bestätigung das Wort LÖSCHEN ein.'), confirmInput],
            [
              { label: 'Abbrechen', value: false },
              { label: 'Endgültig löschen', value: true, danger: true,
                validate: function () { return confirmInput.value.trim() === 'LÖSCHEN'; } }
            ]).then(function (yes) {
              if (!yes) return;
              Store.factoryReset().then(function () {
                toast('App wurde zurückgesetzt.');
                go('setup');
              });
            });
        });
    }

    function hasFinePointer() {
      return !!(window.matchMedia && window.matchMedia('(any-pointer: fine)').matches);
    }

    /* Biometrische Entsperrung anbieten – bis zu 3 Versuche, dann PIN. */
    function tryBiometric() {
      if (!bioActive || busy) return;
      busy = true;
      msg.textContent = 'Biometrische Prüfung …';
      Store.unlockBiometric().then(function () {
        busy = false;
        afterUnlock();
      }).catch(function () {
        busy = false;
        bioTries++;
        if (bioTries >= 3) {
          bioActive = false;
          showPinPad = true;
          msg.textContent = 'Biometrie nicht erfolgreich. Bitte ' + (kind === 'password' ? 'Passwort' : 'PIN') + ' eingeben.';
          renderLock();
        } else {
          msg.textContent = 'Biometrie nicht erkannt (' + bioTries + '/3). Erneut versuchen oder ' + (kind === 'password' ? 'Passwort' : 'PIN') + ' verwenden.';
          renderLock();
        }
      });
    }

    var container = h('div.screen.lock-screen');
    function renderLock() {
      UI.clear(container);
      container.appendChild(h('div.setup-hero',
        h('div.setup-mark', { html: LOCK_SVG.replace('width="18" height="18"', 'width="30" height="30"') }),
        h('h1', {}, 'SOL-Noten'),
        h('p', {}, bioActive && !showPinPad
          ? 'Bitte biometrisch entsperren'
          : (kind === 'password' ? 'Bitte Passwort eingeben' : 'Bitte PIN eingeben'))
      ));
      if (kind !== 'password') container.appendChild(dots);
      container.appendChild(msg);

      if (bioActive && !showPinPad) {
        container.appendChild(h('button.btn-primary.btn-block.bio-btn', { onclick: tryBiometric },
          'Mit Fingerabdruck / Gesicht entsperren'));
        container.appendChild(h('button.btn-plain.btn-small.lock-alt', {
          onclick: function () { showPinPad = true; renderLock(); }
        }, kind === 'password' ? 'Stattdessen Passwort eingeben' : 'Stattdessen PIN eingeben'));
      } else if (kind === 'password') {
        container.appendChild(h('label.field', h('span.field-label', {}, 'Passwort'), pwInput));
        container.appendChild(pwBtn);
        if (Store.biometricsEnabled()) {
          container.appendChild(h('button.btn-plain.btn-small.lock-alt', {
            onclick: function () { bioActive = true; showPinPad = false; bioTries = 0; msg.textContent = ''; renderLock(); tryBiometric(); }
          }, 'Biometrie verwenden'));
        }
        setTimeout(function () { try { pwInput.focus(); } catch (e) {} }, 50);
      } else {
        refreshDots();
        container.appendChild(padHost);
        if (Store.biometricsEnabled()) {
          container.appendChild(h('button.btn-plain.btn-small.lock-alt', {
            onclick: function () { bioActive = true; showPinPad = false; bioTries = 0; msg.textContent = ''; renderLock(); tryBiometric(); }
          }, 'Biometrie verwenden'));
        }
        if (hasFinePointer()) {
          container.appendChild(h('p.hint.lock-kbd-hint', {}, 'Am Computer können Sie die PIN auch über die Tastatur eingeben (Enter bestätigt).'));
        }
      }
      container.appendChild(h('button.btn-plain.btn-small.lock-forgot', { onclick: forgotPin },
        kind === 'password' ? 'Passwort vergessen?' : 'PIN vergessen?'));
    }

    if (Store.getLockWait() > 0) { showPinPad = true; bioActive = false; }
    renderLock();
    if (Store.getLockWait() > 0) waitCountdown(); else setLockDisabled(false);

    /* Biometrie beim Öffnen automatisch anstoßen (nur wenn keine Wartesperre aktiv). */
    if (bioActive && Store.getLockWait() <= 0) {
      setTimeout(tryBiometric, 300);
    }

    /* Physische Tastatur mithören (PC). Der Handler bleibt registriert, solange
       die Route 'lock' aktiv ist, und entfernt sich selbst, sobald die App die
       Sperrseite verlässt – unabhängig von DOM-Mutationen. */
    function onKey(ev) {
      if (route.name !== 'lock') { document.removeEventListener('keydown', onKey); return; }
      if (kind === 'password') return; /* Passwortfeld verarbeitet Eingaben selbst */
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (Store.getLockWait() > 0) return;
      if (bioActive && !showPinPad) return;
      if (ev.key >= '0' && ev.key <= '9') {
        if (pin.length < 8) { pin += ev.key; refreshDots(); }
        ev.preventDefault();
      } else if (ev.key === 'Backspace') {
        pin = pin.slice(0, -1); refreshDots(); ev.preventDefault();
      } else if (ev.key === 'Enter') {
        submit(); ev.preventDefault();
      } else if (ev.key === 'Escape') {
        pin = ''; refreshDots(); ev.preventDefault();
      }
    }
    /* Doppelregistrierung vermeiden, falls der Sperrbildschirm mehrfach aufgebaut wird. */
    document.removeEventListener('keydown', lockKeyHandler);
    lockKeyHandler = onKey;
    document.addEventListener('keydown', onKey);

    return container;
  };


  /* ================= Einrichtung ================= */

  views.setup = function () {
    var st = S();
    var landSel = h('select.input');
    landSel.appendChild(h('option', { value: '' }, 'Bitte wählen …'));
    Quarters.BUNDESLAENDER.forEach(function (b) {
      landSel.appendChild(h('option', { value: b.code, selected: st.settings.bundesland === b.code }, b.name));
    });

    var now = new Date();
    var defYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    var nameInput = h('input.input', { type: 'text', value: defYear + '/' + String(defYear + 1).slice(2), placeholder: 'z. B. 2026/27' });
    var startInput = h('input.input', { type: 'date', value: defYear + '-08-01' });
    var startHint = h('p.hint');
    var status = h('p.hint');

    /* Vorschlag: erster Werktag nach den Sommerferien. Eine Handeingabe wird
       nie überschrieben; der Wert bleibt in jedem Fall änderbar (z. B. bei
       abweichendem Ausbildungs-/Blockbeginn am Berufskolleg). */
    var startTouched = false;
    startInput.addEventListener('change', function () { startTouched = true; });
    function suggestStart() {
      if (!landSel.value) return;
      var targetYear = Number(String(startInput.value || '').slice(0, 4)) || defYear;
      startHint.textContent = 'Erster Schultag wird aus den Ferienterminen ermittelt …';
      Quarters.fetchHolidays(landSel.value, targetYear + '-05-01', (targetYear + 1) + '-08-31')
        .then(function (hol) {
          var s = Quarters.suggestFirstSchoolDay(hol, targetYear);
          if (s && !startTouched) {
            startInput.value = s;
            startHint.textContent = 'Vorschlag: erster Werktag nach den Sommerferien (' + UI.fmtDate(s) + '). Bitte prüfen und bei Bedarf anpassen.';
          } else if (s) {
            startHint.textContent = 'Laut Ferienterminen wäre der erste Werktag nach den Sommerferien der ' + UI.fmtDate(s) + '.';
          } else {
            startHint.textContent = 'Kein automatischer Vorschlag möglich – bitte den ersten Schultag von Hand eintragen.';
          }
        })
        .catch(function () {
          startHint.textContent = 'Ferientermine gerade nicht erreichbar – bitte den ersten Schultag von Hand eintragen.';
        });
    }
    landSel.addEventListener('change', suggestStart);

    function finish() {
      if (!landSel.value) { status.textContent = 'Bitte wählen Sie Ihr Bundesland.'; return; }
      if (!startInput.value) { status.textContent = 'Bitte geben Sie den ersten Schultag an.'; return; }
      status.textContent = 'Ferientermine werden geladen …';
      var start = startInput.value;
      var from = start;
      var to = String(Number(start.slice(0, 4)) + 1) + '-08-31';
      Quarters.fetchHolidays(landSel.value, from, to)
        .then(function (holidays) { createYear(holidays, 'api'); })
        .catch(function () {
          UI.confirmDialog('Ferien konnten nicht geladen werden',
            'Die Ferientermine konnten gerade nicht aus dem Internet abgerufen werden. ' +
            'Sie können das Schuljahr trotzdem anlegen; die Quartale werden dann ohne Ferien berechnet ' +
            'und lassen sich in den Einstellungen jederzeit anpassen oder neu laden.',
            'Ohne Ferien fortfahren').then(function (ok) {
              if (ok) createYear([], 'manuell');
              else status.textContent = '';
            });
        });

      function createYear(holidays, source) {
        var quarters = Quarters.computeQuarters(start, holidays);
        st.settings.bundesland = landSel.value;
        st.schoolYears.push({
          id: Store.uid(), name: nameInput.value.trim() || 'Schuljahr',
          startDate: start, holidays: holidays, quarters: quarters, holidaySource: source
        });
        Store.save();
        finishSetup();
      }
    }

    /* Abschluss der Ersteinrichtung: Disclaimer -> Pflicht-PIN -> Startseite */
    function finishSetup() {
      showDisclaimer(function () {
        requirePinSetup(function () { go('home'); });
      });
    }

    return h('div.screen',
      h('div.setup-hero',
        h('div.setup-mark', {}, '15'),
        h('h1', {}, 'SOL-Noten'),
        h('p', {}, 'Notenverwaltung zum selbstorganisierten Lernen')
      ),
      h('div.card',
        h('label.field', h('span.field-label', {}, 'Bundesland'), landSel,
          h('p.hint', {}, 'Wird nur einmalig benötigt, um die Schulferien zu laden und daraus die vier Quartale (je 10 Schulwochen) zu berechnen. Ihre Noten bleiben ausschließlich auf diesem Gerät.')),
        h('label.field', h('span.field-label', {}, 'Bezeichnung des Schuljahres'), nameInput),
        h('label.field', h('span.field-label', {}, 'Erster Schultag'), startInput),
        startHint,
        status,
        h('button.btn-primary.btn-block', { onclick: finish }, 'Schuljahr anlegen')
      )
    );
  };

  /* ================= Kursübersicht (Start) ================= */

  views.home = function () {
    var st = S();
    var yearSel = h('select.year-select');
    st.schoolYears.forEach(function (y) {
      yearSel.appendChild(h('option', { value: y.id, selected: y.id === activeYearId() }, y.name));
    });
    yearSel.addEventListener('change', function () { setActiveYear(yearSel.value); render(); });

    var year = Store.yearById(activeYearId());
    var courses = st.courses.filter(function (c) { return c.yearId === year.id; });

    var screen = h('div.screen',
      header('SOL-Noten', null),
      backupBanner(),
      folderPermissionBanner(),
      installBanner(),
      h('div.row-between',
        h('label.year-label', {}, 'Schuljahr ', yearSel),
        h('button.btn-plain.btn-small', { onclick: addYear }, '+ Schuljahr')
      ),
      courses.length === 0
        ? h('div.empty',
            h('p', {}, 'Noch kein Kurs in diesem Schuljahr.'),
            h('p.hint', {}, 'Ein Kurs ist eine Klasse in einem Fach – z. B. „AK 2026 · Fahrzeugvertriebsprozesse“.'),
            st.courses.length > 0
              ? h('button.btn-plain', { onclick: function () { go('yearTransfer', { toId: year.id }); } },
                  'Aus einem früheren Schuljahr übernehmen')
              : null)
        : h('div.course-grid', {}, courses.map(courseTile)),
      h('button.btn-primary.btn-block', { onclick: function () { go('editCourse', {}); } }, '+ Kurs anlegen'),
      h('button.btn-plain.btn-block', { onclick: function () { go('settings', { back: { name: 'home' } }); } }, 'Globale Einstellungen')
    );
    return screen;

    function courseTile(c) {
      var cls = Store.classById(c.classId);
      var due = !c.completed && Quarters.quarterChangeDue(Store.todayISO(), c.currentQuarter, courseQuarters(c));
      var chipText = c.completed
        ? 'Schuljahr abgeschlossen'
        : c.currentQuarter + '. Quartal' + (due ? (c.currentQuarter === 4 ? ' · Schuljahresende' : ' · Wechsel fällig') : '');
      return h('div.course-tile', { onclick: function () { go('course', { id: c.id }); } },
        h('div.course-tile-class', {}, cls ? cls.name : '?'),
        h('div.course-tile-subject', {}, c.subject),
        h('div.course-tile-meta', {},
          h('span.quarter-chip' + (due ? '.due' : '') + (c.completed ? '.completed' : ''), {}, chipText),
          h('span.hint', {}, (cls ? cls.students.length : 0) + ' Schüler/innen')
        ),
        h('button.btn-capture', { onclick: function (e) { e.stopPropagation(); go('capture', { id: c.id }); } },
          'SoLei-Punkte vergeben')
      );
    }

    function addYear() {
      go('setupYear');
    }
  };

  var _activeYearId = null;
  function activeYearId() {
    var st = S();
    if (_activeYearId && Store.yearById(_activeYearId)) return _activeYearId;
    _activeYearId = st.schoolYears.length ? st.schoolYears[st.schoolYears.length - 1].id : null;
    return _activeYearId;
  }
  function setActiveYear(id) { _activeYearId = id; }

  views.setupYear = function () {
    var st = S();
    var now = new Date();
    var defYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    var nameInput = h('input.input', { type: 'text', value: defYear + '/' + String(defYear + 1).slice(2) });
    var startInput = h('input.input', { type: 'date', value: defYear + '-08-01' });
    var startHint = h('p.hint');
    var status = h('p.hint');

    /* Vorschlag wie in der Ersteinrichtung; das Bundesland ist hier bekannt. */
    var startTouched = false;
    startInput.addEventListener('change', function () { startTouched = true; });
    (function suggestStart() {
      if (!st.settings.bundesland) return;
      var targetYear = defYear;
      startHint.textContent = 'Erster Schultag wird aus den Ferienterminen ermittelt …';
      Quarters.fetchHolidays(st.settings.bundesland, targetYear + '-05-01', (targetYear + 1) + '-08-31')
        .then(function (hol) {
          var s = Quarters.suggestFirstSchoolDay(hol, targetYear);
          if (s && !startTouched) {
            startInput.value = s;
            startHint.textContent = 'Vorschlag: erster Werktag nach den Sommerferien (' + UI.fmtDate(s) + '). Bitte prüfen und bei Bedarf anpassen.';
          } else if (s) {
            startHint.textContent = 'Laut Ferienterminen wäre der erste Werktag nach den Sommerferien der ' + UI.fmtDate(s) + '.';
          } else {
            startHint.textContent = 'Kein automatischer Vorschlag möglich – bitte den ersten Schultag von Hand eintragen.';
          }
        })
        .catch(function () {
          startHint.textContent = 'Ferientermine gerade nicht erreichbar – bitte den ersten Schultag von Hand eintragen.';
        });
    })();

    return h('div.screen',
      header('Neues Schuljahr', { name: 'home' }),
      h('div.card',
        h('label.field', h('span.field-label', {}, 'Bezeichnung'), nameInput),
        h('label.field', h('span.field-label', {}, 'Erster Schultag'), startInput),
        startHint,
        status,
        h('button.btn-primary.btn-block', { onclick: create }, 'Schuljahr anlegen')
      )
    );
    function create() {
      status.textContent = 'Ferientermine werden geladen …';
      var start = startInput.value;
      var to = String(Number(start.slice(0, 4)) + 1) + '-08-31';
      Quarters.fetchHolidays(st.settings.bundesland, start, to)
        .then(function (hol) { finish(hol, 'api'); })
        .catch(function () { finish([], 'manuell'); });
      function finish(holidays, source) {
        var y = { id: Store.uid(), name: nameInput.value.trim(), startDate: start,
          holidays: holidays, quarters: Quarters.computeQuarters(start, holidays), holidaySource: source };
        st.schoolYears.push(y);
        _activeYearId = y.id;
        Store.save();
        /* Gibt es ein früheres Schuljahr mit Kursen, direkt die Übernahme anbieten. */
        var hasSource = st.schoolYears.filter(function (o) {
          if (o.id === y.id) return false;
          return st.courses.filter(function (c) { return c.yearId === o.id; }).length > 0;
        }).length > 0;
        if (hasSource) {
          UI.confirmDialog('Klassen und Kurse übernehmen?',
            'Möchten Sie Klassen und Kurse aus einem früheren Schuljahr in „' + y.name + '“ übernehmen? Schülerlisten, Fotos, Kurseinstellungen und Sitzpläne werden kopiert; Punkte und Noten bleiben im alten Schuljahr.',
            'Zum Assistenten')
            .then(function (ok) {
              if (ok) go('yearTransfer', { toId: y.id });
              else go('home');
            });
        } else {
          go('home');
        }
      }
    }
  };

  /* ================= Schuljahreswechsel-Assistent ================= */

  views.yearTransfer = function (p) {
    var st = S();
    var toYear = Store.yearById(p.toId);
    if (!toYear) return views.home({});

    /* Quelljahre: alle anderen Jahre, die Kurse haben; jüngstes zuerst. */
    var sourceYears = st.schoolYears.filter(function (y) {
      if (y.id === toYear.id) return false;
      return st.courses.filter(function (c) { return c.yearId === y.id; }).length > 0;
    }).sort(function (a, b) { return (b.startDate || '').localeCompare(a.startDate || ''); });

    if (sourceYears.length === 0) {
      return h('div.screen',
        header('Schuljahreswechsel', { name: 'home' }),
        h('div.empty', h('p', {}, 'Es gibt kein früheres Schuljahr mit Kursen, aus dem übernommen werden könnte.')));
    }

    var fromId = p.fromId || sourceYears[0].id;
    var fromYear = Store.yearById(fromId) || sourceYears[0];
    var srcSel = h('select.input');
    sourceYears.forEach(function (y) {
      srcSel.appendChild(h('option', { value: y.id, selected: y.id === fromId }, y.name));
    });
    srcSel.addEventListener('change', function () {
      go('yearTransfer', { toId: toYear.id, fromId: srcSel.value }); /* gleiche Seite → History-Eintrag wird ersetzt */
    });

    var srcCourses = st.courses.filter(function (c) { return c.yearId === fromId; });
    var courseChecks = []; /* {course, cb} */
    var classInputs = {};  /* Quell-Klassen-ID -> Namensfeld */

    var courseRows = srcCourses.map(function (c) {
      var cls = Store.classById(c.classId);
      var cb = h('input', { type: 'checkbox' });
      cb.checked = true;
      courseChecks.push({ course: c, cb: cb });
      return h('label.transfer-row', {}, cb,
        h('span', {}, (cls ? cls.name : '?') + ' · ' + c.subject +
          (c.completed ? ' (Schuljahr abgeschlossen)' : '')));
    });

    var classBlocks = [];
    var seenClasses = {};
    srcCourses.forEach(function (c) {
      if (seenClasses[c.classId]) return;
      seenClasses[c.classId] = true;
      var cls = Store.classById(c.classId);
      if (!cls) return;
      var inp = h('input.input', { type: 'text', value: cls.name });
      classInputs[c.classId] = inp;
      classBlocks.push(h('label.field',
        h('span.field-label', {}, 'Neuer Name für Klasse „' + cls.name + '“ (' + cls.students.length + ' Schüler/innen)'),
        inp));
    });

    var status = h('p.hint.error-text');

    function execute() {
      var ids = [];
      courseChecks.forEach(function (e) { if (e.cb.checked) ids.push(e.course.id); });
      if (ids.length === 0) { status.textContent = 'Bitte mindestens einen Kurs auswählen.'; return; }
      var names = {};
      Object.keys(classInputs).forEach(function (clsId) {
        var v = classInputs[clsId].value.trim();
        if (v) names[clsId] = v;
      });
      var res = Store.transferYear(fromId, toYear.id, ids, names);
      setActiveYear(toYear.id);
      var hadTd = courseChecks.some(function (e) {
        return e.cb.checked && Array.isArray(e.course.teachingDays) && e.course.teachingDays.length;
      });
      toast(res.courses + ' Kurs(e), ' + res.classes + ' Klasse(n) mit ' + res.students +
        ' Schüler/innen nach ' + toYear.name + ' übernommen.' +
        (hadTd ? ' Unterrichtstage wurden nicht übernommen – bitte in den Kurs-Einstellungen neu festlegen.' : ''));
      go('home');
    }

    /* Unterrichtstage wechseln zum Schuljahr → bewusst nicht übernommen. */
    var anySrcTd = srcCourses.some(function (c) {
      return Array.isArray(c.teachingDays) && c.teachingDays.length;
    });

    return h('div.screen',
      header('Schuljahreswechsel', { name: 'home' }),
      h('div.card',
        h('p.hint', {}, 'Übernimmt Klassen (samt Schülerlisten und Fotos) und Kurse (Einstellungen, Maximalpunkte, Sitzplan) in das Schuljahr „' + toYear.name + '“. Punktevergaben, Noten und Fehlzeiten des alten Schuljahres bleiben dort erhalten und werden nicht übernommen.'),
        anySrcTd
          ? h('p.hint', {}, 'Hinweis: Hinterlegte Unterrichtstage werden nicht übernommen, da Stundenpläne zum Schuljahr wechseln. Wenn Sie diese Funktion weiter nutzen möchten, legen Sie die Unterrichtstage in den Kurs-Einstellungen der neuen Kurse bitte neu fest.')
          : null,
        h('label.field', h('span.field-label', {}, 'Übernehmen aus'), srcSel)
      ),
      h('div.section-head', {}, 'Kurse'),
      h('div.card.card-tight', {}, courseRows),
      classBlocks.length ? h('div.section-head', {}, 'Klassennamen im neuen Schuljahr') : null,
      classBlocks.length ? h('div.card.card-tight', {}, classBlocks) : null,
      status,
      h('button.btn-primary.btn-block', { onclick: execute }, 'Übernehmen')
    );
  };

  /* Backup speichern – immer mit Passwort verschlüsselt (kein Klartext-Export). */
  function exportDialog(onDone) {
    var pw1 = h('input.input', { type: 'password', autocomplete: 'new-password', placeholder: 'Passwort' });
    var pw2 = h('input.input', { type: 'password', autocomplete: 'new-password', placeholder: 'Passwort wiederholen' });
    var err = h('p.hint.error-text');
    UI.modal('Backup speichern', [
      h('p.hint', {}, 'Das Backup wird mit Ihrem Passwort verschlüsselt (AES-256). Da es Schülerdaten enthält, ist ein Passwort verpflichtend.'),
      h('label.field', h('span.field-label', {}, 'Passwort'), pw1),
      h('label.field', h('span.field-label', {}, 'Wiederholung'), pw2),
      h('p.hint', {}, 'Wichtig: Ein vergessenes Passwort kann nicht wiederhergestellt werden – die Datei ist dann unlesbar. Bewahren Sie es sicher auf (z. B. in einem Passwort-Manager).'),
      err
    ], [
      { label: 'Abbrechen', value: false },
      { label: 'Backup speichern', value: true, primary: true,
        validate: function () {
          if (pw1.value.length < 6) { err.textContent = 'Bitte ein Passwort mit mindestens 6 Zeichen vergeben.'; return false; }
          if (pw1.value !== pw2.value) { err.textContent = 'Die Passwörter stimmen nicht überein.'; return false; }
          return true;
        } }
    ]).then(function (ok) {
      if (!ok) return;
      Store.exportJSON(pw1.value).then(function () {
        toast('Verschlüsseltes Backup wird gespeichert.');
        render();
        if (typeof onDone === 'function') onDone();
      }).catch(function (e) {
        UI.modal('Backup fehlgeschlagen', h('p', {}, e.message));
      });
    });
  }

  function backupBanner() {
    var days = Store.daysSinceExport();
    var st = S();
    var never = !st.settings.lastExport;
    var hasData = st.soleiEntries.length > 0 || st.courses.length > 0;
    if (!hasData) return null;
    if (!never && days < 7) return null;
    return h('div.banner-warn', {},
      h('span', {}, never ? 'Ihre Daten wurden noch nie gesichert.'
        : 'Ihr letztes Backup ist ' + days + ' Tage alt.'),
      h('button.btn-small.btn-primary', { onclick: function () { exportDialog(); } }, 'Jetzt sichern')
    );
  }

  /* Der Browser vergibt die Ordner-Freigabe nur je Sitzung; statt den Dialog
     mitten in der Arbeit aufpoppen zu lassen, wird hier bewusst gefragt. */
  function folderPermissionBanner() {
    if (!Store.backupFolderNeedsPermission()) return null;
    return h('div.banner-info', {},
      h('span', {}, 'Das automatische Ordner-Backup wartet auf Ihre Freigabe (der Browser verlangt sie einmal je Sitzung).'),
      h('div.banner-actions',
        h('button.btn-small.btn-primary', { onclick: function () {
          Store.regrantBackupPermission().then(function (ok) {
            if (ok) { toast('Ordner-Backup wieder aktiv.'); render(); }
            else { toast('Freigabe nicht erteilt – das Ordner-Backup bleibt pausiert.'); }
          });
        } }, 'Freigeben'))
    );
  }

  /* ================= Kurs anlegen / bearbeiten ================= */

  views.editCourse = function (p) {
    var st = S();
    var year = Store.yearById(activeYearId());
    var course = p.id ? Store.courseById(p.id) : null;

    /* Neuanlage aus einem bestehenden Kurs heraus („Neuer Kurs für ein anderes
       Fach in dieser Klasse"): `tpl` liefert die Vorbelegung. Übernommen werden
       Klasse, Einstellungen, Maximalpunkte und Sitzplan – nicht das Fach, keine
       Bewertungsdaten und (wie beim Schuljahreswechsel) nicht die
       Unterrichtstage, da ein anderes Fach meist anders liegt. */
    var tpl = (!course && p.from) ? Store.courseById(p.from) : null;
    var pre = course || tpl;

    var classSel = h('select.input');
    classSel.appendChild(h('option', { value: '' }, 'Klasse wählen …'));
    st.classes.filter(function (c) { return c.yearId === year.id; }).forEach(function (c) {
      classSel.appendChild(h('option', { value: c.id, selected: pre && pre.classId === c.id }, c.name));
    });
    classSel.appendChild(h('option', { value: '__new__' }, '+ Neue Klasse anlegen'));
    var newClassInput = h('input.input', { type: 'text', placeholder: 'Name der Klasse, z. B. AK 2026', style: { display: 'none' } });
    classSel.addEventListener('change', function () {
      newClassInput.style.display = classSel.value === '__new__' ? '' : 'none';
    });

    var subjectInput = h('input.input', { type: 'text', value: course ? course.subject : '', placeholder: 'z.B. Betriebswirtschaftslehre' });
    var obtInput = h('input.input.input-num', { type: 'number', min: 0, max: 8, value: pre ? pre.numOBT : 4 });
    var kaInput = h('input.input.input-num', { type: 'number', min: 0, max: 8, value: pre ? pre.numKA : 2 });
    var w = pre ? pre.weights : { sl: 40, obt: 20, ka: 40 };
    var wSl = h('input.input.input-num', { type: 'number', min: 0, max: 100, value: w.sl });
    var wObt = h('input.input.input-num', { type: 'number', min: 0, max: 100, value: w.obt });
    var wKa = h('input.input.input-num', { type: 'number', min: 0, max: 100, value: w.ka });

    var upCritDefault = pre && typeof pre.uploadCriterion === 'number' ? pre.uploadCriterion : 2;
    var upCritSel = h('select.input');
    st.settings.criteriaNames.forEach(function (n, i) {
      upCritSel.appendChild(h('option', { value: i, selected: i === upCritDefault }, n));
    });

    var status = h('p.hint.error-text');

    /* ---- Unterrichtstage (optional): Basis + „Änderung ab Datum“ ---- */
    var WD_LABELS = { 1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa' };
    var tdSegs = course && Array.isArray(course.teachingDays)
      ? JSON.parse(JSON.stringify(course.teachingDays))
      : [];
    var tdBase = null, tdChanges = [];
    tdSegs.forEach(function (s) {
      if (!s || !Array.isArray(s.days)) return;
      if (!s.from) { if (!tdBase) tdBase = { from: null, days: s.days.slice() }; }
      else tdChanges.push({ from: s.from, days: s.days.slice() });
    });
    if (!tdBase) tdBase = { from: null, days: [] };
    tdChanges.sort(function (a, b) { return a.from.localeCompare(b.from); });

    var tdArea = h('div');
    function wdChipRow(seg) {
      var row = h('div.wd-chip-row');
      [1, 2, 3, 4, 5, 6].forEach(function (wd) {
        var chip = h('button.wd-chip' + (seg.days.indexOf(wd) > -1 ? '.selected' : ''),
          { type: 'button' }, WD_LABELS[wd]);
        chip.addEventListener('click', function () {
          var i = seg.days.indexOf(wd);
          if (i > -1) seg.days.splice(i, 1); else seg.days.push(wd);
          seg.days.sort();
          chip.classList.toggle('selected', seg.days.indexOf(wd) > -1);
        });
        row.appendChild(chip);
      });
      return row;
    }
    function renderTdArea() {
      tdArea.innerHTML = '';
      tdArea.appendChild(h('div.td-seg',
        h('span.hint', {}, tdChanges.length ? 'Basis (gilt bis zur ersten Änderung, auch rückwirkend):' : 'Wochentage mit Unterricht:'),
        wdChipRow(tdBase)));
      tdChanges.forEach(function (seg, idx) {
        var dateInp = h('input.input.date-inline', { type: 'date', value: seg.from || '' });
        dateInp.addEventListener('change', function () { seg.from = dateInp.value; });
        tdArea.appendChild(h('div.td-seg.td-change',
          h('div.row-between',
            h('label.hint', {}, 'Änderung ab ', dateInp),
            h('button.btn-small.btn-plain.danger-text', { type: 'button', onclick: function () {
              tdChanges.splice(idx, 1); renderTdArea();
            } }, 'Entfernen')),
          wdChipRow(seg)));
      });
      tdArea.appendChild(h('button.btn-small.btn-plain', { type: 'button', onclick: function () {
        tdChanges.push({ from: '', days: [] }); renderTdArea();
      } }, '+ Änderung ab Datum'));
    }
    renderTdArea();

    /* Liefert das zu speichernde teachingDays-Array oder wirft eine
       Validierungsmeldung als String. Leere Basis ohne Änderungen = Feature aus. */
    function collectTeachingDays() {
      if (!tdBase.days.length && !tdChanges.length) return null;
      if (!tdBase.days.length) throw 'Unterrichtstage: Bitte zuerst die Basis-Wochentage wählen (oder alle Änderungen entfernen).';
      var out = [{ from: null, days: tdBase.days.slice() }];
      for (var i = 0; i < tdChanges.length; i++) {
        var seg = tdChanges[i];
        if (!seg.from) throw 'Unterrichtstage: Bitte für jede Änderung ein „ab“-Datum angeben.';
        if (!seg.days.length) throw 'Unterrichtstage: Bitte für die Änderung ab ' + UI.fmtDate(seg.from) + ' mindestens einen Wochentag wählen.';
        out.push({ from: seg.from, days: seg.days.slice() });
      }
      out.sort(function (a, b) { return (a.from || '').localeCompare(b.from || ''); });
      return out;
    }

    function saveCourse() {
      var classId = classSel.value;
      if (classId === '__new__') {
        var name = newClassInput.value.trim();
        if (!name) { status.textContent = 'Bitte geben Sie der neuen Klasse einen Namen.'; return; }
        var cls = { id: Store.uid(), yearId: year.id, name: name, students: [] };
        st.classes.push(cls);
        classId = cls.id;
      }
      if (!classId) { status.textContent = 'Bitte wählen Sie eine Klasse.'; return; }
      if (!subjectInput.value.trim()) { status.textContent = 'Bitte geben Sie das Fach an.'; return; }
      var sum = Number(wSl.value) + Number(wObt.value) + Number(wKa.value);
      if (sum !== 100) { status.textContent = 'Die Gewichtung muss in Summe 100 % ergeben (aktuell ' + sum + ' %).'; return; }
      var tDays;
      try { tDays = collectTeachingDays(); }
      catch (msg) { status.textContent = msg; return; }

      if (course) {
        course.classId = classId;
        course.subject = subjectInput.value.trim();
        course.numOBT = Number(obtInput.value); course.numKA = Number(kaInput.value);
        course.weights = { sl: Number(wSl.value), obt: Number(wObt.value), ka: Number(wKa.value) };
        course.uploadCriterion = Number(upCritSel.value);
        if (tDays) course.teachingDays = tDays; else delete course.teachingDays;
      } else {
        course = {
          id: Store.uid(), yearId: year.id, classId: classId,
          subject: subjectInput.value.trim(),
          numOBT: Number(obtInput.value), numKA: Number(kaInput.value),
          weights: { sl: Number(wSl.value), obt: Number(wObt.value), ka: Number(wKa.value) },
          maxPoints: { 1: Calc.DEFAULT_MAX.slice(), 2: Calc.DEFAULT_MAX.slice(), 3: Calc.DEFAULT_MAX.slice(), 4: Calc.DEFAULT_MAX.slice() },
          currentQuarter: Quarters.quarterForDate(Store.todayISO(), year.quarters),
          portfolio: {}, quarterOverrides: null, completed: false,
          uploadCriterion: Number(upCritSel.value)
        };
        if (tDays) course.teachingDays = tDays;
        /* Aus einem bestehenden Kurs heraus angelegt: Maximalpunkte und
           Sitzplan übernehmen (beide hängen an Klasse/Personen, nicht am
           Fach). Bewertungsdaten bleiben bewusst außen vor. */
        if (tpl) {
          if (tpl.maxPoints) course.maxPoints = JSON.parse(JSON.stringify(tpl.maxPoints));
          if (Array.isArray(tpl.seatings) && tpl.seatings.length) {
            course.seatings = JSON.parse(JSON.stringify(tpl.seatings));
            course.activeSeating = tpl.activeSeating;
          }
        }
        st.courses.push(course);
        Store.save();
        if (tpl) {
          toast('Kurs „' + course.subject + '“ für ' + Store.classById(classId).name +
            ' angelegt – Schülerliste, Einstellungen und Sitzplan wurden übernommen.');
          go('course', { id: course.id });
          return;
        }
        go('maxPoints', { id: course.id, intro: true });
        return;
      }
      Store.save();
      go('course', { id: course.id });
    }

    function reopenYear() {
      course.completed = false;
      Store.save();
      toast('Das Schuljahr ist wieder geöffnet.');
      go('editCourse', { id: course.id });
    }

    function delCourseFromSettings() {
      var cls = Store.classById(course.classId);
      var label = cls.name + ' · ' + course.subject;
      var nEntries = S().soleiEntries.filter(function (e) { return e.courseId === course.id; }).length;
      /* Bewusste Reibung gegen versehentliches Löschen: Der Kursname muss zur
         Bestätigung abgetippt werden; sonst bleibt der Löschvorgang wirkungslos. */
      var confirmInput = h('input.input', { type: 'text', autocomplete: 'off',
        placeholder: label, 'aria-label': 'Kursnamen zur Bestätigung eingeben' });
      UI.modal('Kurs unwiderruflich löschen',
        [h('p', {}, 'Der Kurs „' + label + '“ wird mit allen ' + nEntries +
            ' Punktevergaben, Fehlzeiten und Ergebnis-Uploads gelöscht. Die Klasse und ihre Schülerliste bleiben erhalten.'),
         h('p', {}, 'Diese Aktion kann nicht rückgängig gemacht werden. Tippen Sie zur Bestätigung den Kursnamen ein:'),
         h('p.hint', {}, label),
         h('label.field', {}, confirmInput)],
        [{ label: 'Abbrechen', value: false },
         { label: 'Endgültig löschen', value: true, danger: true,
           validate: function () {
             if (confirmInput.value.trim() === label) return true;
             confirmInput.classList.add('input-flash');
             setTimeout(function () { confirmInput.classList.remove('input-flash'); }, 600);
             return false;
           } }]
      ).then(function (ok) {
        if (!ok) return;
        var st2 = S();
        st2.courses = st2.courses.filter(function (c) { return c.id !== course.id; });
        st2.soleiEntries = st2.soleiEntries.filter(function (e) { return e.courseId !== course.id; });
        st2.absences = (st2.absences || []).filter(function (a) { return a.courseId !== course.id; });
        st2.uploadTallies = (st2.uploadTallies || []).filter(function (t) { return t.courseId !== course.id; });
        st2.notes = (st2.notes || []).filter(function (n) { return n.courseId !== course.id; });
        Store.save();
        toast('Kurs gelöscht.');
        go('home');
      });
    }

    var managementSection = course
      ? [
          h('div.section-head', {}, 'Weitere Kurs-Verwaltung'),
          h('div.actions-col',
            h('button.btn-plain.btn-block', { onclick: function () { go('students', { classId: course.classId, courseId: course.id, from: 'editCourse' }); } },
              'Schülerliste bearbeiten (' + (Store.classById(course.classId).students.length) + ')'),
            h('button.btn-plain.btn-block', { onclick: function () { go('maxPoints', { id: course.id, from: 'editCourse' }); } },
              'Maximalpunkte der Kriterien (' + course.currentQuarter + '. Quartal)'),
            h('button.btn-plain.btn-block', { onclick: function () { go('quarterDates', { id: course.id, from: 'editCourse' }); } },
              'Quartalszeiträume dieses Kurses'),
            course.completed
              ? h('button.btn-plain.btn-block', { onclick: reopenYear }, 'Schuljahr wieder öffnen')
              : null,
            h('button.btn-plain.btn-block', { onclick: function () { go('editCourse', { from: course.id }); } },
              'Neuer Kurs für ein anderes Fach in dieser Klasse'),
            h('div.danger-zone',
              h('p.hint', {}, 'Gefahrenbereich'),
              h('button.btn-plain.btn-block.danger-text', { onclick: delCourseFromSettings }, 'Kurs löschen …'))
          )
        ]
      : null;

    return h('div.screen',
      header(course ? 'Kurs-Einstellungen' : 'Kurs anlegen', p.id ? { name: 'course', params: { id: p.id } } : { name: 'home' }),
      course ? courseBox(course) : null,
      h('div.card',
        h('label.field', h('span.field-label', {}, 'Klasse'), classSel, newClassInput,
          h('p.hint', {}, 'Die Schülerliste gehört zur Klasse und wird von allen Kursen dieser Klasse gemeinsam genutzt.')),
        tpl ? h('p.hint.info-text', {},
          'Einstellungen, Maximalpunkte und Sitzplan aus „' + tpl.subject + '“ sind vorbelegt und hier änderbar. ' +
          'Bewertungsdaten werden nicht übernommen. Die Unterrichtstage bleiben leer, da ein anderes Fach meist an anderen Wochentagen liegt.') : null,
        h('label.field', h('span.field-label', {}, 'Fach'), subjectInput),
        h('div.field-row',
          h('label.field', h('span.field-label', {}, 'Open Book Tests je Halbjahr'), obtInput),
          h('label.field', h('span.field-label', {}, 'Klausuren je Halbjahr'), kaInput)
        ),
        h('div.field',
          h('span.field-label', {}, 'Gewichtung der Zeugnisnote (%)'),
          h('div.field-row.weight-row',
            h('label.field', h('span.hint', {}, 'Sonstige Leistungen'), wSl),
            h('label.field', h('span.hint', {}, 'Open Book Tests'), wObt),
            h('label.field', h('span.hint', {}, 'Klausuren'), wKa)
          )
        ),
        h('label.field', h('span.field-label', {}, 'Kriterium für Ergebnis-Uploads'), upCritSel,
          h('p.hint', {}, 'Auf dieses SoLei-Kriterium werden die auf der Seite „Ergebnis-Uploads“ gezählten Uploads angerechnet.')),
        h('div.field',
          h('span.field-label', {}, 'Unterrichtstage (optional)'),
          tdArea,
          h('p.hint', {}, 'Wenn Wochentage gewählt sind, zeigt „Unentschuldigte Fehlzeiten“ in der Schüler-Ansicht nur noch diese Tage. Stundenplanänderungen bilden Sie mit „+ Änderung ab Datum“ ab. Ohne Auswahl bleibt das bisherige Verhalten (alle Tage außer Sonntag).')),
        status,
        h('button.btn-primary.btn-block', { onclick: saveCourse }, course ? 'Änderungen speichern' : 'Kurs anlegen')
      ),
      managementSection
    );
  };

  /* ================= Kurs-Dashboard ================= */

  function courseQuarters(course) {
    var year = Store.yearById(course.yearId);
    return course.quarterOverrides || year.quarters;
  }

  views.course = function (p) {
    var course = Store.courseById(p.id);
    if (!course) return views.home({});
    var cls = Store.classById(course.classId);
    var quarters = courseQuarters(course);
    /* Anzeige-Quartal automatisch aus dem heutigen Datum: „wo stehe ich gerade“.
       Ersetzt die früheren manuellen „ins nächste Quartal wechseln“-Buttons. */
    var todayQ = Quarters.quarterForDate(Store.todayISO(), quarters);
    if (course.currentQuarter !== todayQ) { course.currentQuarter = todayQ; Store.save(); }
    var q = course.currentQuarter;
    var due = !course.completed &&
      Quarters.quarterChangeDue(Store.todayISO(), q, quarters);

    return h('div.screen',
      header(cls.name + ' · ' + course.subject, { name: 'home' }),
      due ? quarterHint(course, quarters) : null,
      h('div.card.card-tight',
        h('div.row-between',
          h('div.quarter-line',
            h('span.quarter-chip.big' + (course.completed ? '.completed' : ''), {},
              q + '. Quartal' + (course.completed ? ' · Schuljahr abgeschlossen' : '')),
            h('span.hint', {}, UI.fmtDate(quarters[q - 1].start) + ' – ' + UI.fmtDate(quarters[q - 1].end))
          ),
          h('button.icon-btn.icon-btn-primary', {
            onclick: function () { go('lessonContents', { id: course.id }); },
            'aria-label': 'Stundeninhalte', title: 'Stundeninhalte', html: BOOK_SVG
          })
        )
      ),
      h('div.section-head', {}, 'Sonstige Leistungen'),
      h('div.card.card-tight.solei-card',
        h('div.course-actions-grid',
          h('button.btn-primary.grid-btn', { onclick: function () { go('capture', { id: course.id }); } },
            'SoLei-Punkte vergeben'),
          h('button.btn-primary.grid-btn', { onclick: function () { go('seating', { id: course.id }); } },
            'Sitzplan'),
          h('button.btn-primary.grid-btn', { onclick: function () { go('pointstand', { id: course.id }); } },
            'SoLei-Punktestand'),
          h('button.btn-primary.grid-btn', { onclick: function () { go('uploads', { id: course.id }); } },
            'Ergebnis-Uploads'),
          h('button.btn-primary.grid-btn', { onclick: function () { go('absences', { id: course.id }); } },
            'Unentschuldigte Fehlzeiten'),
          h('button.btn-primary.grid-btn', { onclick: function () { go('quarterReview', { id: course.id, quarter: q }); } },
            'SoLei-Quartalsnoten')
        )
      ),
      h('div.section-head', {}, 'Weitere Prüfungsleistungen'),
      h('div.card.card-tight.solei-card',
        h('div.course-actions-grid',
          h('button.btn-primary.grid-btn', { onclick: function () { go('obt', { id: course.id }); } },
            'Open Book Tests'),
          h('button.btn-primary.grid-btn', { onclick: function () { go('klausuren', { id: course.id }); } },
            'Klausuren')
        )
      ),
      h('div.section-head', {}, 'Auswertung'),
      h('div.card.card-tight.solei-card',
        h('button.btn-primary.btn-block.grid-btn', { onclick: function () { gradesState.mode = 'class'; gradesState.studentIdx = 0; go('grades', { id: course.id }); } },
          'Notenübersicht & Zeugnisnoten')
      ),
      h('button.btn-plain.btn-block.course-settings-btn', { onclick: function () { go('editCourse', { id: course.id }); } },
        'Kurs-Einstellungen'),
      /* Punktestand-Liste bewusst nicht mehr auf der Kursseite (über den Button
         „SoLei-Punktestand“ erreichbar). Nur bei leerer Klasse bleibt der
         Schnellzugang zur Schülerliste erhalten. */
      cls.students.length === 0
        ? h('div.empty', h('p', {}, 'Diese Klasse hat noch keine Schüler/innen.'),
            h('button.btn-primary', { onclick: function () { go('students', { classId: cls.id, courseId: course.id }); } },
              'Schüler/innen hinzufügen'))
        : null
    );
  };

  function pointstandRows(course, cls, q) {
    var sums = [];
    var rows = cls.students.map(function (stu) {
      var e = Store.entriesFor(course.id, stu.id, q);
      var stat = Calc.quarterStatus(e.byCriterion);
      var grade = Calc.gradeFor15(stat.sum, S().settings.grading15);
      if (stat.rated > 0) sums.push(stat.sum);
      return h('div.student-row', { onclick: function () { go('protokoll', { courseId: course.id, studentId: stu.id, quarter: q }); } },
        h('div.student-name', {}, stu.lastName + ', ' + stu.firstName),
        h('div.student-stats', {},
          stat.rated === 0
            ? h('span.hint', {}, 'noch keine Punkte')
            : [
                h('span.sum-pill', {}, Calc.fmt(stat.sum, 1) + ' / 15'),
                h('span.grade-pill.g' + Math.round(grade.g), {}, 'Note ' + Calc.fmt(grade.g)),
                stat.rated < 5 ? h('span.hint', {}, stat.rated + '/5 Kriterien') : null
              ]
        )
      );
    });
    /* Klassendurchschnitt am unteren Ende der Liste */
    if (sums.length) {
      var avg = Math.round(sums.reduce(function (a, b) { return a + b; }, 0) / sums.length * 10) / 10;
      var avgGrade = Calc.gradeFor15(avg, S().settings.grading15);
      rows.push(h('div.student-row.avg-row',
        h('div.student-name', {}, 'ø Klassendurchschnitt (' + sums.length + ' von ' + cls.students.length + ')'),
        h('div.student-stats', {},
          h('span.sum-pill', {}, Calc.fmt(avg, 1) + ' / 15'),
          h('span.grade-pill.g' + Math.round(avgGrade.g), {}, 'Note ' + Calc.fmt(avgGrade.g)))));
    }
    return rows;
  }

  views.pointstand = function (p) {
    var course = Store.courseById(p.id);
    if (!course) return views.home({});
    var cls = Store.classById(course.classId);
    var shownQ = p.quarter || course.currentQuarter;
    var quarters = courseQuarters(course);

    var qSel = h('select.input.q-select', { style: { maxWidth: '7.5rem' } });
    [1, 2, 3, 4].forEach(function (n) {
      qSel.appendChild(h('option', { value: n, selected: n === shownQ }, n + '. Quartal'));
    });
    qSel.addEventListener('change', function () {
      go('pointstand', { id: course.id, quarter: Number(qSel.value), back: p.back });
    });

    var viewToggle = h('div.view-toggle',
      h('button.view-btn.active', {}, 'Ansicht: Liste'),
      h('button.view-btn', {
        onclick: function () {
          if (!cls.students.length) return;
          go('protokoll', { courseId: course.id, studentId: cls.students[0].id, quarter: shownQ, back: p.back });
        }
      }, 'Ansicht: Schüler/in')
    );

    return h('div.screen',
      header('SoLei-Punktestand', p.back || { name: 'course', params: { id: course.id } }),
      courseBox(course),
      h('div.capture-bar', qSel, viewToggle),
      h('div.section-head.section-head-spaced', {},
        shownQ + '. Quartal · ' + UI.fmtDate(quarters[shownQ - 1].start) + ' – ' + UI.fmtDate(quarters[shownQ - 1].end)),
      cls.students.length === 0
        ? h('div.empty', h('p', {}, 'Diese Klasse hat noch keine Schüler/innen.'))
        : h('div.card.card-list', {}, pointstandRows(course, cls, shownQ))
    );
  };

  /* ================= Ergebnis-Uploads (Zählung am Quartalsende) ================= */

  views.uploads = function (p) {
    var course = Store.courseById(p.id);
    if (!course) return views.home({});
    var cls = Store.classById(course.classId);
    var shownQ = p.quarter || course.currentQuarter;
    var ci = typeof course.uploadCriterion === 'number' ? course.uploadCriterion : 2;
    var critName = S().settings.criteriaNames[ci];
    var max = course.maxPoints[shownQ][ci];
    var students = cls.students.slice().sort(function (a, b) {
      return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName, 'de');
    });

    var qSel = h('select.input.q-select', { style: { maxWidth: '7.5rem' } });
    [1, 2, 3, 4].forEach(function (n) {
      qSel.appendChild(h('option', { value: n, selected: n === shownQ }, n + '. Quartal'));
    });
    qSel.addEventListener('change', function () {
      go('uploads', { id: course.id, quarter: Number(qSel.value) });
    });

    /* Erläuterungen ein-/ausklappbar; der Zustand wird gemerkt (erster Aufruf: ausgeklappt). */
    var helpCollapsed = !!S().settings.uploadsHelpCollapsed;
    var helpArrow = h('span.collapse-arrow', {}, helpCollapsed ? '▸' : '▾');
    var helpBody = h('div.collapse-body',
      h('p', {},
        'Wenn Ihre Schüler/innen die Aufgabe haben, ihre Arbeitsergebnisse in das Learning Management System der Schule (z.B. Moodle/Logineo, OneNote, usw.) hochzuladen, haben Sie zwei Möglichkeiten:',
        h('br'),
        'a) Sie prüfen die Uploads täglich über den Menüpunkt „SoLei-Punkte vergeben“.',
        h('br'),
        'b) Sie prüfen alle erfolgten / vergessenen Uploads am Quartalsende. Das können Sie hier auf dieser Seite eintragen.'),
      h('p', {},
        h('strong', {}, 'Wie funktioniert das?'),
        h('br'),
        'Die Anzahl der erfolgten Uploads wird mit jeweils ' + Calc.fmt(max, 1) + ' Punkten beim SoLei-Kriterium ',
        h('strong', {}, critName),
        ' gezählt. Die Anzahl der vergessenen Uploads wird mit jeweils 0 Punkten gezählt. Eine Datumsangabe erfolgt hier nicht, da die Zählung erst am Quartalsende erfolgt. Die Punkte gehen aber in die Durchschnittsberechnung beim SoLei-Kriterium ',
        h('strong', {}, critName),
        ' ein.'),
      h('p', {},
        'Wenn Sie die Uploads Ihrer Schüler/innen genauer bewerten möchten, d.h. mit Datumsangabe und abgestufter Punktevergabe für deren Vollständigkeit, nutzen Sie stattdessen Möglichkeit a), d.h. den Menüpunkt ',
        h('strong', {}, 'SoLei-Punkte vergeben'),
        '.')
    );
    if (helpCollapsed) helpBody.style.display = 'none';

    var intro = h('div.card',
      h('div.collapse-head', {
        role: 'button', tabindex: 0,
        onclick: function () {
          helpCollapsed = !helpCollapsed;
          S().settings.uploadsHelpCollapsed = helpCollapsed;
          Store.save();
          helpBody.style.display = helpCollapsed ? 'none' : '';
          helpArrow.textContent = helpCollapsed ? '▸' : '▾';
        }
      }, h('strong', {}, 'Erläuterungen'), helpArrow),
      helpBody
    );

    var inputs = {};
    function parseCount(str) {
      var s = String(str).trim();
      if (s === '') return { ok: true, value: 0 };
      var v = Number(s);
      if (isNaN(v) || v < 0 || v !== Math.floor(v)) return { ok: false };
      return { ok: true, value: v };
    }

    var rows = students.map(function (stu) {
      var t = Store.uploadTallyFor(course.id, stu.id, shownQ);
      var inpDone = h('input.input.grade-input', {
        type: 'text', inputmode: 'numeric', placeholder: '0',
        value: t && t.done ? t.done : '', 'aria-label': 'Erledigte Uploads'
      });
      var inpMissed = h('input.input.grade-input', {
        type: 'text', inputmode: 'numeric', placeholder: '0',
        value: t && t.missed ? t.missed : '', 'aria-label': 'Vergessene Uploads'
      });
      inputs[stu.id] = { done: inpDone, missed: inpMissed };
      function refresh() {
        inpDone.classList.toggle('input-error', !parseCount(inpDone.value).ok);
        inpMissed.classList.toggle('input-error', !parseCount(inpMissed.value).ok);
      }
      /* Bewertungsdaten: sofort speichern (entprellt bzw. beim Verlassen). */
      var upTimer = null;
      function persistUp() {
        if (upTimer) { clearTimeout(upTimer); upTimer = null; }
        var rd = parseCount(inpDone.value), rm = parseCount(inpMissed.value);
        if (!rd.ok || !rm.ok) return;
        Store.setUploadTally(course.id, stu.id, shownQ, rd.value, rm.value);
      }
      function onInput() {
        refresh();
        if (upTimer) clearTimeout(upTimer);
        upTimer = setTimeout(persistUp, 600);
      }
      inpDone.addEventListener('input', onInput);
      inpMissed.addEventListener('input', onInput);
      inpDone.addEventListener('blur', persistUp);
      inpMissed.addEventListener('blur', persistUp);
      return h('div.review-row',
        h('div.review-name', nameWithPhoto(stu)),
        h('div.review-grades',
          h('div.review-cell', h('span.hint', {}, 'Erledigte Uploads'), inpDone),
          h('div.review-cell', h('span.hint', {}, 'Vergessene Uploads'), inpMissed)
        )
      );
    });

    

    return h('div.screen',
      header('Ergebnis-Uploads', { name: 'course', params: { id: course.id } }),
      courseBox(course),
      intro,
      h('div.capture-bar', qSel, h('span')),
      students.length === 0
        ? h('div.empty', h('p', {}, 'Diese Klasse hat noch keine Schüler/innen.'))
        : h('div.card.card-list', {}, rows),
      h('p.hint', {}, 'Eingaben werden automatisch gespeichert.')
    );
  };

  function quarterHint(course, quarters) {
    var q = course.currentQuarter;
    var isFinal = q === 4;
    return h('div.banner-info', {},
      h('span', {}, isFinal
        ? 'Das 4. Quartal ist laut Plan beendet (' + UI.fmtDate(quarters[q - 1].end) + ') – tragen Sie die Portfolionoten ein und schließen Sie anschließend das Schuljahr ab.'
        : 'Das ' + q + '. Quartal ist laut Plan beendet (' + UI.fmtDate(quarters[q - 1].end) + '). Tragen Sie die Portfolionoten für dieses Quartal ein.'),
      h('div.banner-actions',
        h('button.btn-small.btn-primary', { onclick: function () {
          go('quarterReview', { id: course.id, quarter: q });
        } }, 'Zu den SoLei-Quartalsnoten')
      )
    );
  }

  /* ================= Maximalpunkte je Quartal ================= */

  views.maxPoints = function (p) {
    var course = Store.courseById(p.id);
    var q = course.currentQuarter;
    var names = S().settings.criteriaNames;
    var current = course.maxPoints[q].slice();
    var status = h('p.hint');
    var sumEl = h('span.sum-pill');
    var warnHost = h('div');

    function entriesInQuarter(qq) {
      return S().soleiEntries.filter(function (e) {
        return e.courseId === course.id && e.quarter === qq;
      }).length;
    }

    var qSel = h('select.input', { style: { maxWidth: '10rem' } });
    [1, 2, 3, 4].forEach(function (n) {
      qSel.appendChild(h('option', { value: n, selected: n === q }, n + '. Quartal'));
    });
    qSel.addEventListener('change', function () {
      q = Number(qSel.value); current = course.maxPoints[q].slice(); redraw();
    });
    if (p.intro) qSel.disabled = true;

    var rowsHost = h('div');
    function redraw() {
      clear(rowsHost);
      names.forEach(function (name, i) {
        var seg = h('div.seg', {}, Calc.ALLOWED_MAX.map(function (v) {
          return h('button.seg-btn' + (current[i] === v ? '.active' : ''), {
            onclick: function () { current[i] = v; redraw(); }
          }, Calc.fmt(v, 1));
        }));
        rowsHost.appendChild(h('div.max-row', h('span.max-name', {}, name), seg));
      });
      var v = Calc.validateMaxPoints(current);
      sumEl.textContent = 'Summe: ' + Calc.fmt(v.sum || current.reduce(function (a, b) { return Calc.round1(a + b); }, 0), 1) + ' / 15';
      sumEl.className = 'sum-pill' + (v.ok ? ' ok' : ' bad');
      status.textContent = v.ok ? '' : v.msg;
      clear(warnHost);
      var n = entriesInQuarter(q);
      if (n > 0) {
        warnHost.appendChild(h('div.banner-warn', {},
          h('span', {}, 'In diesem Quartal wurden bereits ' + n + ' Punktevergaben erfasst. ' +
            'Eine Änderung der Maximalpunkte verschiebt die Tipp-Stufen – bereits vergebene Punkte behalten ihren Wert, ' +
            'passen dann aber unter Umständen nicht mehr zur neuen Skala. Ändern Sie die Maximalpunkte am besten nur, ' +
            'bevor die ersten Punkte vergeben werden.')));
      }
    }
    redraw();

    function doSave() {
      course.maxPoints[q] = current.slice();
      Store.save();
      toast('Maximalpunkte für das ' + q + '. Quartal gespeichert.');
      go('course', { id: course.id });
    }

    return h('div.screen',
      header('Maximalpunkte', p.from === 'editCourse'
        ? { name: 'editCourse', params: { id: course.id } }
        : { name: 'course', params: { id: course.id } }),
      courseBox(course),
      p.intro ? h('div.banner-info', {},
        h('span', {}, 'Bitte prüfen Sie die Maximalpunkte der Kriterien für das ' + q + '. Quartal, ' +
          'bevor Sie die ersten Punkte vergeben. Der Standard ist 5 × 3 Punkte.')) : null,
      h('div.card',
        h('div.row-between', qSel, sumEl),
        h('p.hint', {}, 'Jedes Kriterium kann 1,5 / 3 / 4,5 oder 6 Maximalpunkte erhalten. Die Summe muss immer 15 Punkte ergeben. Die Tipp-Stufen ergeben sich automatisch (Maximum, ⅔, ⅓, 0).'),
        warnHost,
        rowsHost,
        status,
        h('button.btn-primary.btn-block', { onclick: function () {
          var v = Calc.validateMaxPoints(current);
          if (!v.ok) { status.textContent = v.msg; return; }
          var unchanged = JSON.stringify(current) === JSON.stringify(course.maxPoints[q]);
          if (!unchanged && entriesInQuarter(q) > 0) {
            UI.confirmDialog('Maximalpunkte trotzdem ändern?',
              'In diesem Quartal wurden bereits Punkte vergeben. Bereits erfasste Vergaben behalten ihren Punktwert ' +
              'und fließen weiter in die Durchschnitte ein, liegen aber unter Umständen nicht mehr auf der neuen Skala. ' +
              'Sie können solche Vergaben anschließend im Punkteprotokoll der Schüler/innen anpassen.',
              'Trotzdem ändern', true).then(function (ok) { if (ok) doSave(); });
            return;
          }
          doSave();
        } }, p.intro ? 'Übernehmen und weiter' : 'Speichern')
      )
    );
  };

  /* ================= Quartalsabschluss: Portfolio & SoLei-Noten ================= */

  function portfolioGrade(course, q, studentId) {
    if (!course.portfolio) course.portfolio = {};
    var p = course.portfolio[q];
    return (p && p[studentId] != null) ? p[studentId] : null;
  }

  /* Entwicklung gegenüber dem Vorquartal: 'up' (mehr Punkte, grün),
     'down' (weniger, rot) oder null. */
  function development(curr, prev) {
    if (curr == null || prev == null) return null;
    if (curr > prev + 1e-9) return 'up';
    if (curr < prev - 1e-9) return 'down';
    return null;
  }

  views.quarterReview = function (p) {
    var course = Store.courseById(p.id);
    if (!course.portfolio) course.portfolio = {};
    var cls = Store.classById(course.classId);
    var quarters = courseQuarters(course); /* für die Datums-Zuordnung der Kursnotizen */
    var q = p.quarter || course.currentQuarter;
    var grading = S().settings.grading15;
    var students = cls.students.slice().sort(function (a, b) {
      return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName, 'de');
    });

    var qSel = h('select.input', { style: { maxWidth: '10rem' } });
    [1, 2, 3, 4].forEach(function (n) {
      qSel.appendChild(h('option', { value: n, selected: n === q }, n + '. Quartal'));
    });
    qSel.addEventListener('change', function () {
      go('quarterReview', { id: course.id, quarter: Number(qSel.value) });
    });

    var inputs = {}; /* studentId -> input */
    var soleiCells = {}; /* studentId -> Zelle für Note SoLei (Live-Aktualisierung) */

    function parseGrade(str) {
      var s = String(str).trim().replace(',', '.');
      if (s === '') return { ok: true, value: null };
      var n = Number(s);
      if (isNaN(n) || n < 1 || n > 6) return { ok: false };
      return { ok: true, value: Math.round(n * 100) / 100 };
    }

    /* Klassendurchschnitt der SoLei-Noten – live bei Portfolio-Eingaben. */
    var latestSolei = {};
    var avgSoleiCell = h('strong.review-solei');
    function refreshSoleiAvg() {
      var vals = [];
      Object.keys(latestSolei).forEach(function (sid) {
        if (latestSolei[sid] != null) vals.push(latestSolei[sid]);
      });
      avgSoleiCell.textContent = vals.length
        ? Calc.fmt(Math.round(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length * 100) / 100)
        : '–';
    }

    var rows = students.map(function (stu) {
      var e = Store.entriesFor(course.id, stu.id, q);
      var stat = Calc.quarterStatus(e.byCriterion);
      var slGrade = stat.rated > 0 ? Calc.gradeFor15(stat.sum, grading) : null;

      var dev = null;
      if (q > 1) {
        var prev = Calc.quarterStatus(Store.entriesFor(course.id, stu.id, q - 1).byCriterion);
        if (prev.rated > 0 && stat.rated > 0) dev = development(stat.sum, prev.sum);
      }

      var pg = portfolioGrade(course, q, stu.id);
      var inp = h('input.input.grade-input', {
        type: 'text', inputmode: 'decimal',
        value: pg == null ? '' : Calc.fmt(pg), placeholder: '–', 'aria-label': 'Portfolio/mdl. Prüfung'
      });
      inputs[stu.id] = inp;

      var soleiCell = h('strong.review-solei');
      soleiCells[stu.id] = soleiCell;

      function refreshSolei() {
        var r = parseGrade(inp.value);
        inp.classList.toggle('input-error', !r.ok);
        /* Auslegung A: ohne Portfolio zählt allein der SL-Bogen; mit Portfolio wird gemittelt. */
        var g = (r.ok && slGrade) ? Calc.soleiGrade(slGrade.g, r.value) : null;
        soleiCell.textContent = g == null ? '–' : Calc.fmt(g);
        latestSolei[stu.id] = g;
        refreshSoleiAvg();
      }
      /* Bewertungsdaten: sofort speichern (entprellt bzw. beim Verlassen). */
      var pfTimer = null;
      function persistPortfolio() {
        if (pfTimer) { clearTimeout(pfTimer); pfTimer = null; }
        var r = parseGrade(inp.value);
        if (!r.ok) return;
        if (!course.portfolio[q]) course.portfolio[q] = {};
        if (r.value == null) delete course.portfolio[q][stu.id];
        else course.portfolio[q][stu.id] = r.value;
        Store.save();
      }
      inp.addEventListener('input', function () {
        refreshSolei();
        if (pfTimer) clearTimeout(pfTimer);
        pfTimer = setTimeout(persistPortfolio, 600);
      });
      inp.addEventListener('blur', persistPortfolio);

      var row = h('div.review-row',
        h('div.review-name.name-with-photo.tappable-name', {
          role: 'button', tabindex: '0',
          title: 'SoLei-Punktestand dieser Person mit Kriteriendetails anzeigen',
          onclick: function () {
            go('protokoll', { courseId: course.id, studentId: stu.id, quarter: q,
              back: { name: 'quarterReview', params: { id: course.id, quarter: q } } });
          },
          onkeydown: function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              go('protokoll', { courseId: course.id, studentId: stu.id, quarter: q,
                back: { name: 'quarterReview', params: { id: course.id, quarter: q } } });
            }
          }
        },
          photoTile(stu, { small: true }),
          h('div',
            h('div.student-name', {}, stu.lastName + ', ' + stu.firstName),
            h('div.tap-substats',
              h('span.sum-pill.small' + (dev === 'up' ? '.up' : dev === 'down' ? '.down' : ''), {},
                (dev === 'up' ? '▲ ' : dev === 'down' ? '▼ ' : '') + Calc.fmt(stat.sum, 1) + '/15'),
              stat.rated > 0 && stat.rated < 5 ? h('span.hint', {}, stat.rated + '/5 Kriterien') : null
            )
          )
        ),
        h('div.review-grades',
          h('div.review-cell', h('span.hint', {}, 'SL-Bogen'),
            h('strong', {}, slGrade ? Calc.fmt(slGrade.g) : '–')),
          h('div.review-cell', h('span.hint', {}, 'Portfolio /', h('br'), 'mdl. Prüfung'), inp),
          h('div.review-cell', h('span.hint', {}, 'SoLei-Note'), soleiCell)
        ),
        /* Kursnotizen dieses Quartals als datierte Liste – Entscheidungshilfe
           für die Quartalsnote. Quartalszuordnung wie überall über das Datum. */
        (function () {
          var qNotes = Store.notesFor(course.id, stu.id).filter(function (n) {
            return Quarters.quarterForDate(n.date, quarters) === q;
          });
          if (!qNotes.length) return null;
          return h('div.review-notes', {}, qNotes.map(function (n) {
            return h('p.review-note', {},
              h('span.note-date', {}, UI.fmtDate(n.date) + ': '), n.text);
          }));
        })()
      );
      refreshSolei();
      return row;
    });

    /* Portfolionoten speichern sich selbst; vor dem Schuljahresabschluss
       wird nur noch geprüft, ob alle sichtbaren Eingaben gültig sind. */
    function allPortfolioValid() {
      var bad = [];
      students.forEach(function (stu) {
        if (!parseGrade(inputs[stu.id].value).ok) bad.push(stu.lastName + ', ' + stu.firstName);
      });
      if (bad.length) {
        UI.modal('Ungültige Portfolionote',
          h('p', {}, 'Portfolionoten müssen zwischen 1 und 6 liegen. Bitte prüfen Sie: ' + bad.join('; ') + '.'));
        return false;
      }
      return true;
    }

    return h('div.screen',
      header('SoLei-Quartalsnoten', { name: 'course', params: { id: course.id } }),
      courseBox(course),
      h('div.card.card-tight',
        h('div.row-between', qSel,
          q > 1 ? h('span.hint', {}, '▲ / ▼ = Entwicklung zum Vorquartal') : null),
        h('p.hint', {}, 'Die Note SL-Bogen ergibt sich aus der Punktesumme (15-Punkte-Schema). ' +
          'Die SoLei-Note ist der Durchschnitt aus Note SL-Bogen und Portfolio/mdl. Prüfung. ' +
          'Wird kein Portfolio bzw. keine mündliche Prüfung eingetragen, zählt allein die Note SL-Bogen.')
      ),
      h('div.card.card-list', {},
        students.length ? [rows, h('div.review-row.avg-row',
          h('div.review-name', {}, h('strong', {}, 'ø Klassendurchschnitt')),
          h('div.review-grades', h('div.review-cell', h('span.hint', {}, 'SoLei-Note'), avgSoleiCell)))]
          : h('div.empty', h('p', {}, 'Diese Klasse hat noch keine Schüler/innen.'))),
      h('div.actions-col',
        h('p.hint', {}, 'Eingaben werden automatisch gespeichert.'),
        q === 4 && !course.completed
          ? h('button.btn-plain.btn-block', { onclick: function () {
              if (!allPortfolioValid()) return;
              UI.confirmDialog('Schuljahr abschließen?',
                'Der Kurs wird als „Schuljahr abgeschlossen“ markiert. Alle Ansichten, Zeugnisnoten, Drucke und Nachträge bleiben weiterhin möglich; die Markierung lässt sich in den Kurs-Einstellungen jederzeit wieder aufheben.',
                'Schuljahr abschließen')
                .then(function (ok) {
                  if (!ok) return;
                  course.completed = true;
                  Store.save();
                  toast('Das Schuljahr ist für diesen Kurs abgeschlossen.');
                  go('course', { id: course.id });
                });
            } }, 'Schuljahr abschließen')
          : null,
        course.completed
          ? h('p.hint', {}, 'Dieser Kurs ist als „Schuljahr abgeschlossen“ markiert (in den Kurs-Einstellungen aufhebbar).')
          : null
      )
    );
  };

  /* ================= Open Book Tests ================= */

  function obtResults(course, hj, idx) {
    if (!course.obt) course.obt = {};
    if (!course.obt[hj]) course.obt[hj] = {};
    if (!course.obt[hj][idx]) course.obt[hj][idx] = {};
    return course.obt[hj][idx];
  }

  views.obt = function (p) {
    var course = Store.courseById(p.id);
    var cls = Store.classById(course.classId);
    var hj = p.hj || 1;
    var idx = p.idx || 0;
    var n = Math.max(1, course.numOBT || 4);
    if (idx >= n) idx = 0;
    var pctTable = S().settings.gradingPct || Calc.DEFAULT_GRADING_PCT;
    var students = cls.students.slice().sort(function (a, b) {
      return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName, 'de');
    });
    var results = obtResults(course, hj, idx);

    var hjSeg = h('div.seg.seg-wide', {}, [1, 2].map(function (v) {
      return h('button.seg-btn' + (hj === v ? '.active' : ''), {
        onclick: function () { go('obt', { id: course.id, hj: v, idx: 0 }); }
      }, v + '. Halbjahr');
    }));

    var tabs = h('div.crit-tabs', {}, Array.from({ length: n }, function (_, i) {
      var has = course.obt && course.obt[hj] && course.obt[hj][i] && Object.keys(course.obt[hj][i]).length > 0;
      return h('button.crit-tab' + (i === idx ? '.active' : ''), {
        onclick: function () { go('obt', { id: course.id, hj: hj, idx: i }); }
      }, 'OBT ' + (i + 1) + (has ? ' ●' : ''));
    }));

    var inputs = {};
    function parsePct(str) {
      var s = String(str).trim().replace(',', '.').replace('%', '');
      if (s === '') return { ok: true, value: null };
      var v = Number(s);
      if (isNaN(v) || v < 0 || v > 100) return { ok: false };
      return { ok: true, value: Math.round(v * 100) / 100 };
    }

    var avgEl = h('span.hint');
    function refreshAvg() {
      var vals = [];
      students.forEach(function (stu) {
        if (!inputs[stu.id]) return; /* Feld existiert beim Seitenaufbau ggf. noch nicht */
        var r = parsePct(inputs[stu.id].value);
        if (r.ok && r.value != null) vals.push(r.value);
      });
      if (!vals.length) { avgEl.textContent = ''; return; }
      var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
      avgEl.textContent = 'Durchschnitt: ' + Calc.fmt(Math.round(avg * 10) / 10, 1) + ' % (' +
        vals.length + ' von ' + students.length + ')';
    }

    var rows = students.map(function (stu) {
      var pct = results[stu.id] != null ? results[stu.id] : null;
      var inp = h('input.input.grade-input', {
        type: 'text', inputmode: 'decimal', placeholder: '–',
        value: pct == null ? '' : Calc.fmt(pct), 'aria-label': 'Prozent'
      });
      inputs[stu.id] = inp;
      var gradeCell = h('strong.review-solei');
      function refresh() {
        var r = parsePct(inp.value);
        inp.classList.toggle('input-error', !r.ok);
        var g = (r.ok && r.value != null) ? Calc.gradeForPercent(r.value, pctTable) : null;
        gradeCell.textContent = g ? Calc.fmt(g.g) : '–';
        refreshAvg();
      }
      /* Bewertungsdaten: sofort speichern (entprellt bzw. beim Verlassen). */
      var obtTimer = null;
      function persistObt() {
        if (obtTimer) { clearTimeout(obtTimer); obtTimer = null; }
        var r = parsePct(inp.value);
        if (!r.ok) return;
        if (!course.obt[hj]) course.obt[hj] = {};
        if (!course.obt[hj][idx]) course.obt[hj][idx] = {};
        if (r.value == null) delete course.obt[hj][idx][stu.id];
        else course.obt[hj][idx][stu.id] = r.value;
        Store.save();
      }
      inp.addEventListener('input', function () {
        refresh();
        if (obtTimer) clearTimeout(obtTimer);
        obtTimer = setTimeout(persistObt, 600);
      });
      inp.addEventListener('blur', persistObt);
      var row = h('div.review-row',
        h('div.review-name', nameWithPhoto(stu)),
        h('div.review-grades',
          h('div.review-cell', h('span.hint', {}, 'Prozent'), inp),
          h('div.review-cell', h('span.hint', {}, 'Note'), gradeCell)
        )
      );
      refresh();
      return row;
    });
    refreshAvg();

    /* --- Moodle-Import --- */
    var fileInput = h('input', { type: 'file', accept: '.xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', style: { display: 'none' } });
    fileInput.addEventListener('change', function () {
      var f = fileInput.files[0];
      fileInput.value = '';
      if (!f) return;
      var isCsv = /\.csv$/i.test(f.name);
      var parsed = isCsv
        ? f.text().then(function (t) { return Importer.parseCSV(t); })
        : f.arrayBuffer().then(function (ab) { return Importer.parseXLSX(ab); });
      parsed
        .then(function (rows) { return Importer.extractMoodle(rows); })
        .then(function (ex) { showImportPreview(ex); })
        .catch(function (e) { UI.modal('Import fehlgeschlagen', h('p', {}, e.message)); });
    });

    function showImportPreview(ex) {
      var m = Importer.matchStudents(ex.results, students);
      var assignSelects = [];
      var body = [
        h('p', {}, m.matched.length + ' von ' + ex.results.length + ' Zeilen konnten der Schülerliste automatisch zugeordnet werden.' +
          (ex.skipped ? ' ' + ex.skipped + ' Zeile(n) ohne Bewertung wurden übersprungen.' : ''))
      ];
      if (m.unmatched.length) {
        body.push(h('p.hint', {}, 'Bitte ordnen Sie die übrigen Zeilen zu (oder lassen Sie sie unberücksichtigt):'));
        m.unmatched.forEach(function (r) {
          var sel = h('select.input');
          sel.appendChild(h('option', { value: '' }, 'Nicht übernehmen'));
          students.forEach(function (stu) {
            sel.appendChild(h('option', { value: stu.id }, stu.lastName + ', ' + stu.firstName));
          });
          assignSelects.push({ row: r, sel: sel });
          body.push(h('label.field',
            h('span.field-label', {}, r.lastName + ', ' + r.firstName + ' (' + Calc.fmt(r.percent, 1) + ' %)'), sel));
        });
      }
      body.push(h('p.hint', {}, 'Die Werte werden in „OBT ' + (idx + 1) + ' · ' + hj + '. Halbjahr“ eingetragen und überschreiben dort vorhandene Prozentwerte der betroffenen Schüler/innen.'));
      UI.modal('Moodle-Import', body, [
        { label: 'Abbrechen', value: false },
        { label: 'Übernehmen', value: true, primary: true }
      ]).then(function (ok) {
        if (!ok) return;
        var out = obtResults(course, hj, idx);
        m.matched.forEach(function (x) { out[x.studentId] = x.percent; });
        var manual = 0;
        assignSelects.forEach(function (a) {
          if (a.sel.value) { out[a.sel.value] = a.row.percent; manual++; }
        });
        Store.save();
        toast((m.matched.length + manual) + ' Ergebnisse übernommen.');
        render();
      });
    }

    return h('div.screen',
      header('Open Book Tests', { name: 'course', params: { id: course.id } }),
      courseBox(course),
      h('div.card.card-tight',
        h('div.row-between', hjSeg, avgEl),
        tabs,
        h('p.hint', {}, 'Prozentwerte eintragen oder direkt den Moodle-/Logineo-Export einlesen (Excel- oder CSV-Datei). Die Note ergibt sich aus dem Prozent-Bewertungsspiegel.')
      ),
      h('div.card.card-list', {},
        students.length ? rows : h('div.empty', h('p', {}, 'Diese Klasse hat noch keine Schüler/innen.'))),
      h('div.actions-col',
        h('p.hint', {}, 'Eingaben werden automatisch gespeichert.'),
        h('button.btn-plain.btn-block', { onclick: function () { fileInput.click(); } },
          'Moodle-Export einlesen (Excel/CSV)'),
        fileInput
      )
    );
  };

  /* ================= Klausuren ================= */

  function kaData(course, hj, idx) {
    if (!course.ka) course.ka = {};
    if (!course.ka[hj]) course.ka[hj] = {};
    if (!course.ka[hj][idx]) course.ka[hj][idx] = { maxPoints: null, points: {} };
    return course.ka[hj][idx];
  }

  /* ---------- Vollständige Klausurbewertung ----------
     Punkte je Aufgabe, Klausurdatum (je Schüler/in überschreibbar für
     Nachschreiber), Kommentar. Summen werden in maxPoints/points
     DURCHGESCHRIEBEN, damit Zeugnisrechnung, Notenübersicht und Export
     unverändert funktionieren. Leere Aufgabenfelder zählen als 0, sobald
     mindestens ein Feld der Person ausgefüllt ist; ganz ohne Eintrag gilt
     die Person als nicht bewertet. Punkte ÜBER dem Aufgaben-Maximum sind
     erlaubt (Zusatzpunkte) und werden rot dargestellt; die Prozentnote ist
     bei über 100 % auf die 100-%-Zeile des Spiegels begrenzt.
     Alle Eingaben werden AUTOMATISCH gespeichert (entprellt bzw. beim
     Verlassen eines Feldes) – kein manueller Speichern-Schritt, damit bei
     Sperre wegen Inaktivität nichts verloren geht. Solange die möglichen
     Punkte unvollständig sind, wird maxPoints=null durchgeschrieben, damit
     keine veralteten Noten stehen bleiben. */
  var KA_MAX_TASKS = 50;
  var fullExamOpen = {}; /* aufgeklappte Schülerzeilen je Kurs/HJ/Klausur (Sitzung) */

  function fullExamView(course, cls, students, hj, idx, data, hjSeg, tabs, pctTable, parseNum) {
    var full = data.full || { date: null, tasks: [4, 4, 4, 4], taskPoints: {}, dates: {}, comments: {}, order: {}, sort: 'alpha' };
    var work = JSON.parse(JSON.stringify(full));
    if (!work.order) work.order = {};      /* Klausuren aus v0.28.0 */
    if (!work.sort) work.sort = 'alpha';
    var openKey = course.id + '/' + hj + '/' + idx;
    if (!fullExamOpen[openKey]) fullExamOpen[openKey] = {};

    /* Automatisches Speichern: entprellt bei Eingaben, sofort bei change/blur.
       Schreibt full-Daten UND die Summen (maxPoints/points) durch. */
    var saveTimer = null;
    function persistNow() {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      var t = taskSum();
      var outPoints = {};
      Object.keys(work.taskPoints).forEach(function (sid) {
        var arr = work.taskPoints[sid] || [];
        if (!arr.some(function (v) { return v != null; })) {
          delete work.taskPoints[sid];
          delete work.order[sid]; /* ohne Eingaben auch raus aus der Stapelreihenfolge */
          return;
        }
        var sum = 0;
        for (var i = 0; i < work.tasks.length; i++) if (arr[i] != null) sum += arr[i];
        outPoints[sid] = Math.round(sum * 100) / 100;
      });
      data.full = work;
      data.maxPoints = (t.ok && t.sum > 0) ? t.sum : null;
      data.points = (t.ok && t.sum > 0) ? outPoints : {};
      course.ka[hj][idx] = data;
      Store.save();
    }
    function scheduleSave() {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(persistNow, 600);
    }

    /* ----- Definition: Datum, Aufgabenzahl, Punkte je Aufgabe ----- */
    var dateInput = h('input.input.date-inline', { type: 'date', value: work.date || '' });
    var countInput = h('input.input.input-num', {
      type: 'number', min: 1, max: KA_MAX_TASKS, value: work.tasks.length
    });
    var taskArea = h('div.task-grid');
    var sumLabel = h('span.hint');
    var taskInputs = [];

    function taskSum() {
      var sum = 0, ok = true;
      taskInputs.forEach(function (inp) {
        var r = parseNum(inp.value);
        if (!r.ok || r.value == null || r.value <= 0) ok = false;
        else sum += r.value;
      });
      return { sum: Math.round(sum * 100) / 100, ok: ok };
    }
    function refreshSum() {
      var t = taskSum();
      sumLabel.textContent = 'Summe: ' + Calc.fmt(t.sum) + ' Punkte' + (t.ok ? '' : ' (unvollständig)');
      refreshAllStudents();
    }
    function renderTasks() {
      taskArea.innerHTML = '';
      taskInputs = [];
      work.tasks.forEach(function (mp, i) {
        var inp = h('input.input.input-num.task-max', {
          type: 'text', inputmode: 'decimal', value: mp == null ? '' : Calc.fmt(mp), 'aria-label': 'Aufgabe ' + (i + 1)
        });
        inp.addEventListener('input', function () {
          var r = parseNum(inp.value);
          work.tasks[i] = (r.ok && r.value != null) ? r.value : null;
          inp.classList.toggle('input-error', !(r.ok && r.value != null && r.value > 0));
          refreshSum();
          renderStudentTaskLabels();
          scheduleSave();
        });
        inp.addEventListener('change', persistNow);
        taskInputs.push(inp);
        taskArea.appendChild(h('label.task-cell', h('span.task-no', {}, 'Aufg. ' + (i + 1)), inp));
      });
      refreshSum();
    }
    countInput.addEventListener('change', function () {
      var n = Math.max(1, Math.min(KA_MAX_TASKS, Math.round(Number(countInput.value) || 1)));
      countInput.value = n;
      if (n < work.tasks.length) {
        /* Warnen, wenn auf wegfallenden Aufgaben bereits Punkte stehen. */
        var affected = Object.keys(work.taskPoints).some(function (sid) {
          return (work.taskPoints[sid] || []).slice(n).some(function (v) { return v != null; });
        });
        var shrink = function () {
          work.tasks = work.tasks.slice(0, n);
          Object.keys(work.taskPoints).forEach(function (sid) {
            work.taskPoints[sid] = (work.taskPoints[sid] || []).slice(0, n);
          });
          renderTasks(); renderStudents();
          persistNow();
        };
        if (affected) {
          UI.modal('Aufgaben reduzieren?',
            h('p', {}, 'Auf mindestens einer der wegfallenden Aufgaben sind bereits Punkte eingetragen. Diese Punkte werden entfernt.'),
            [{ label: 'Abbrechen', value: false }, { label: 'Reduzieren', value: true, primary: true }]
          ).then(function (okv) {
            if (okv) shrink();
            else { countInput.value = work.tasks.length; }
          });
        } else shrink();
      } else if (n > work.tasks.length) {
        var last = work.tasks[work.tasks.length - 1];
        while (work.tasks.length < n) work.tasks.push(last != null ? last : 4);
        renderTasks(); renderStudents();
      }
      persistNow();
    });
    dateInput.addEventListener('change', function () {
      work.date = dateInput.value || null;
      persistNow();
    });

    /* ----- Stapelreihenfolge (Eingabereihenfolge) -----
       Beim ersten Punkteeintrag einer Person erhält sie die nächste
       Laufnummer – die Eingabe-Sortierung entspricht damit dem
       Korrekturstapel. ▲▼ erlaubt manuelles Nachsortieren. */
    function nextOrder() {
      var m = 0;
      Object.keys(work.order).forEach(function (k) { if (work.order[k] > m) m = work.order[k]; });
      return m + 1;
    }
    function sortedStudents() {
      if (work.sort !== 'entry') return students;
      var withO = students.filter(function (st2) { return work.order[st2.id] != null; })
        .sort(function (a, b) { return work.order[a.id] - work.order[b.id]; });
      var rest = students.filter(function (st2) { return work.order[st2.id] == null; });
      return withO.concat(rest);
    }
    function moveOrder(stuId, dir) {
      var seq = students.filter(function (st2) { return work.order[st2.id] != null; })
        .sort(function (a, b) { return work.order[a.id] - work.order[b.id]; });
      var i = seq.findIndex(function (st2) { return st2.id === stuId; });
      var j = i + dir;
      if (i < 0 || j < 0 || j >= seq.length) return;
      var a = work.order[seq[i].id];
      work.order[seq[i].id] = work.order[seq[j].id];
      work.order[seq[j].id] = a;
      persistNow();
      renderStudents();
    }

    /* ----- Schülerliste mit aufklappbarer Punkteeingabe ----- */
    var listHost = h('div.card.card-list');
    var studentRefreshers = [];
    var taskLabelRefreshers = [];
    function refreshAllStudents() { studentRefreshers.forEach(function (f) { f(); }); mirrorRefresh(); }
    function renderStudentTaskLabels() { taskLabelRefreshers.forEach(function (f) { f(); }); }

    function studentRow(stu) {
      var tp = work.taskPoints[stu.id] || [];
      var open = !!fullExamOpen[openKey][stu.id];

      var sumCell = h('span.review-solei');
      var pctCell = h('span.hint');
      var gradeCell = h('strong.review-solei');

      function studentState() {
        var any = false, sum = 0;
        var arr = work.taskPoints[stu.id] || [];
        for (var i = 0; i < work.tasks.length; i++) {
          var v = arr[i];
          if (v != null) { any = true; sum += v; }
        }
        return { any: any, sum: Math.round(sum * 100) / 100 };
      }
      function refresh() {
        var t = taskSum();
        var st2 = studentState();
        if (!st2.any || !t.ok || t.sum <= 0) {
          sumCell.textContent = '–'; pctCell.textContent = ''; gradeCell.textContent = '–';
          return;
        }
        var pct = Math.round(st2.sum / t.sum * 10000) / 100;
        sumCell.textContent = Calc.fmt(st2.sum) + ' / ' + Calc.fmt(t.sum);
        pctCell.textContent = Calc.fmt(Math.round(pct * 10) / 10, 1) + ' %';
        /* Zusatzpunkte über 100 %: gradeForPercent klemmt auf die 100-%-Zeile. */
        gradeCell.textContent = Calc.fmt(Calc.gradeForPercent(pct, pctTable).g);
      }
      studentRefreshers.push(refresh);

      var orderCtl = null;
      if (work.sort === 'entry' && work.order[stu.id] != null) {
        function mkMove(sym, dir, label) {
          var b = h('button.icon-btn.order-btn', { 'aria-label': label }, sym);
          b.addEventListener('click', function (ev) { ev.stopPropagation(); moveOrder(stu.id, dir); });
          return b;
        }
        orderCtl = h('div.order-ctl', mkMove('▲', -1, 'nach oben'), mkMove('▼', 1, 'nach unten'));
      }
      var head = h('div.review-row.exam-head-row',
        h('div.review-name', nameWithPhoto(stu)),
        h('div.review-grades',
          h('div.review-cell', h('span.hint', {}, 'Punkte'), sumCell),
          h('div.review-cell', h('span.hint', {}, 'Prozent'), h('span.review-solei', {}, pctCell)),
          h('div.review-cell', h('span.hint', {}, 'Note'), gradeCell)
        ),
        orderCtl);
      head.addEventListener('click', function () {
        fullExamOpen[openKey][stu.id] = !fullExamOpen[openKey][stu.id];
        renderStudents();
      });

      var wrap = h('div.exam-student' + (open ? '.open' : ''), head);
      if (open) {
        var body = h('div.exam-detail');
        /* Datum: Vorschlag = Klausurdatum, überschreibbar (Nachschreiber). */
        var sDate = h('input.input.date-inline', {
          type: 'date', value: work.dates[stu.id] || work.date || ''
        });
        sDate.addEventListener('change', function () {
          if (sDate.value && sDate.value !== work.date) work.dates[stu.id] = sDate.value;
          else delete work.dates[stu.id];
          persistNow();
        });
        body.appendChild(h('label.field.field-inline', h('span.hint', {}, 'Datum'), sDate));

        var grid = h('div.task-grid');
        work.tasks.forEach(function (mp, i) {
          var lbl = h('span.hint', {}, 'max ' + (mp != null ? Calc.fmt(mp) : '?'));
          taskLabelRefreshers.push(function () {
            lbl.textContent = 'max ' + (work.tasks[i] != null ? Calc.fmt(work.tasks[i]) : '?');
          });
          var pInp = h('input.input.input-num.task-pts', {
            type: 'text', inputmode: 'decimal', placeholder: '–',
            value: tp[i] == null ? '' : Calc.fmt(tp[i]), 'aria-label': 'Aufgabe ' + (i + 1)
          });
          function markOver() {
            var r = parseNum(pInp.value);
            var over = r.ok && r.value != null && work.tasks[i] != null && r.value > work.tasks[i];
            pInp.classList.toggle('input-error', !r.ok);
            pInp.classList.toggle('input-over', !!over && r.ok);
          }
          pInp.addEventListener('input', function () {
            var r = parseNum(pInp.value);
            if (!work.taskPoints[stu.id]) work.taskPoints[stu.id] = [];
            work.taskPoints[stu.id][i] = (r.ok && r.value != null) ? r.value : null;
            var hasAny = work.taskPoints[stu.id].some(function (v) { return v != null; });
            if (hasAny && work.order[stu.id] == null) work.order[stu.id] = nextOrder();
            markOver();
            refresh();
            mirrorRefresh();
            scheduleSave();
          });
          pInp.addEventListener('change', persistNow);
          markOver();
          grid.appendChild(h('label.task-cell', h('span.task-no', {}, 'Aufg. ' + (i + 1)), lbl, pInp));
        });
        body.appendChild(grid);
        body.appendChild(h('p.hint', {}, 'Leere Felder zählen als 0 Punkte, sobald mindestens ein Feld ausgefüllt ist. Ohne jede Eingabe gilt die Person als nicht bewertet (z. B. fehlend). Punkte über dem Aufgaben-Maximum (Zusatzpunkte) sind erlaubt und werden rot dargestellt.'));

        var cInp = h('textarea.input.lesson-ta', { rows: 1, placeholder: 'Kommentar (optional)' }, work.comments[stu.id] || '');
        cInp.addEventListener('input', function () {
          if (cInp.value.trim()) work.comments[stu.id] = cInp.value;
          else delete work.comments[stu.id];
          scheduleSave();
        });
        cInp.addEventListener('blur', persistNow);
        body.appendChild(h('label.field', h('span.hint', {}, 'Kommentar'), cInp));
        body.appendChild(h('button.btn-small.btn-plain', {
          onclick: function () { printSheets([stu]); }
        }, 'Bogen drucken (nur diese Person)'));
        wrap.appendChild(body);
      }
      refresh();
      return wrap;
    }

    function renderStudents() {
      listHost.innerHTML = '';
      studentRefreshers = [];
      taskLabelRefreshers = [];
      if (!students.length) {
        listHost.appendChild(h('div.empty', h('p', {}, 'Diese Klasse hat noch keine Schüler/innen.')));
        return;
      }
      sortedStudents().forEach(function (stu) { listHost.appendChild(studentRow(stu)); });
    }

    /* ----- Bewertungsbogen: eine Seite je Person ----- */
    function examSheet(stu, isFirst) {
      var t = taskSum();
      var arr = work.taskPoints[stu.id] || [];
      var sum = 0;
      arr.forEach(function (v) { if (v != null) sum += v; });
      sum = Math.round(sum * 100) / 100;
      var pct = t.sum > 0 ? Math.round(sum / t.sum * 10000) / 100 : null;
      var g = pct != null ? Calc.gradeForPercent(pct, pctTable) : null;

      var thead = h('tr', h('th', {}, 'Aufgabe'), h('th', {}, 'Mögl. Punkte'), h('th', {}, 'Erreichte Punkte'));
      var tbody = work.tasks.map(function (mp, i) {
        return h('tr',
          h('td', {}, String(i + 1)),
          h('td', {}, mp != null ? Calc.fmt(mp) : '?'),
          h('td', {}, arr[i] != null ? Calc.fmt(arr[i]) : '0'));
      });
      var sumRow = h('tr.exam-sum-row',
        h('td', {}, 'Summe'), h('td', {}, Calc.fmt(t.sum)), h('td', {}, Calc.fmt(sum)));

      var block = h('div.exam-sheet' + (isFirst ? '' : '.page-break'),
        h('h2', {}, 'Klausur ' + (idx + 1) + ' · ' + hj + '. Halbjahr'),
        h('p.print-sub', {}, cls.name + ' · ' + course.subject + ' · ' +
          Store.yearById(course.yearId).name),
        h('p.exam-sheet-name', {}, h('strong', {}, stu.lastName + ', ' + stu.firstName),
          ' · Datum: ' + UI.fmtDate(work.dates[stu.id] || work.date || Store.todayISO())),
        h('table.exam-tbl', thead, tbody, sumRow),
        h('p.exam-result', {},
          'Prozent: ' + (pct != null ? Calc.fmt(Math.round(pct * 10) / 10, 1) + ' %' : '–') +
          ' · Note: ' + (g ? Calc.fmt(g.g) + ' (' + g.label + ')' : '–'))
      );
      /* Kommentarzeile nur, wenn die Person einen Kommentar hat. */
      if (work.comments[stu.id]) {
        block.appendChild(h('p.exam-comment', {}, 'Kommentar: ' + work.comments[stu.id]));
      }
      return block;
    }

    function ratedStudents() {
      return sortedStudents().filter(function (st2) {
        return (work.taskPoints[st2.id] || []).some(function (v) { return v != null; });
      });
    }

    function printSheets(list) {
      var t = taskSum();
      if (!t.ok || t.sum <= 0) {
        toast('Bitte zuerst die möglichen Punkte aller Aufgaben vollständig angeben.');
        return;
      }
      if (!list.length) {
        toast('Noch keine bewerteten Klausuren – es gibt nichts zu drucken.');
        return;
      }
      var host = h('div');
      list.forEach(function (st2, i) { host.appendChild(examSheet(st2, i === 0)); });
      printNode(host, false, yearShort(Store.yearById(course.yearId)) + ' ' + cls.name + ' Klausur ' + (idx + 1) + ' HJ' + hj + ' Bewertungsbögen');
    }

    /* ----- Notenspiegel: Anzahl je ganzer Note 1–6, live ----- */
    var mirrorRefresh = function () {};
    function mirrorCounts() {
      var t = taskSum();
      var counts = [0, 0, 0, 0, 0, 0];
      if (!t.ok || t.sum <= 0) return counts;
      students.forEach(function (st2) {
        var arr = work.taskPoints[st2.id] || [];
        var any = false, sum = 0;
        arr.forEach(function (v) { if (v != null) { any = true; sum += v; } });
        if (!any) return;
        var pct = sum / t.sum * 100;
        var g = Calc.gradeForPercent(pct, pctTable).g;
        var whole = Math.min(6, Math.max(1, Math.round(g)));
        counts[whole - 1]++;
      });
      return counts;
    }
    function mirrorTable() {
      var counts = mirrorCounts();
      /* Durchschnitt der exakten Einzelnoten (nicht der gerundeten Spiegel-
         Spalten), auf 2 Nachkommastellen – konsistent zu Calc.avgRound2. */
      var t = taskSum();
      var grades = [];
      if (t.ok && t.sum > 0) {
        students.forEach(function (st2) {
          var arr = work.taskPoints[st2.id] || [];
          var any = false, sum = 0;
          arr.forEach(function (v) { if (v != null) { any = true; sum += v; } });
          if (any) grades.push(Calc.gradeForPercent(sum / t.sum * 100, pctTable).g);
        });
      }
      var avg = Calc.avgRound2(grades);
      return h('table.mirror-tbl',
        h('tr',
          [1, 2, 3, 4, 5, 6].map(function (n) { return h('th', {}, 'Note ' + n); })
            .concat([h('th.mirror-avg', {}, 'Durchschnitt')])),
        h('tr',
          counts.map(function (c2) { return h('td', {}, String(c2)); })
            .concat([h('td.mirror-avg', {}, avg == null ? '–' : Calc.fmt(avg))])));
    }
    var mirrorHost = h('div');
    mirrorRefresh = function () {
      mirrorHost.innerHTML = '';
      mirrorHost.appendChild(mirrorTable());
    };
    function printMirror() {
      var counts = mirrorCounts();
      var total = counts.reduce(function (a, b) { return a + b; }, 0);
      if (!total) { toast('Noch keine bewerteten Klausuren – es gibt nichts zu drucken.'); return; }
      var pt = h('div.exam-sheet',
        h('h2', {}, 'Notenspiegel · Klausur ' + (idx + 1) + ' · ' + hj + '. Halbjahr'),
        h('p.print-sub', {}, cls.name + ' · ' + course.subject + ' · ' +
          Store.yearById(course.yearId).name +
          (work.date ? ' · Klausurdatum: ' + UI.fmtDate(work.date) : '')),
        mirrorTable(),
        h('p.exam-comment', {}, total + ' bewertete Klausur(en)'));
      printNode(pt, false, yearShort(Store.yearById(course.yearId)) + ' ' + cls.name + ' Klausur ' + (idx + 1) + ' HJ' + hj + ' Notenspiegel');
    }

    /* Sortier-Umschalter */
    var sortSeg = h('div.seg.seg-wide');
    [{ v: 'alpha', l: 'Alphabet' }, { v: 'entry', l: 'Eingabe' }].forEach(function (o) {
      sortSeg.appendChild(h('button.seg-btn' + (work.sort === o.v ? '.active' : ''), {
        onclick: function () {
          if (work.sort === o.v) return;
          work.sort = o.v;
          persistNow();
          go('klausuren', { id: course.id, hj: hj, idx: idx });
        }
      }, o.l));
    });

    renderTasks();
    renderStudents();
    mirrorRefresh();

    return h('div.screen',
      header('Klausuren', { name: 'course', params: { id: course.id } }),
      courseBox(course),
      h('div.card.card-tight',
        h('div.row-between', hjSeg, null),
        tabs,
        h('div.exam-def-row',
          h('label.field.field-inline', h('span.field-label', {}, 'Klausurdatum'), dateInput),
          h('label.field.field-inline', h('span.field-label', {}, 'Anzahl Aufgaben'), countInput)),
        h('span.field-label', {}, 'Mögliche Punkte je Aufgabe'),
        taskArea,
        sumLabel,
        h('p.hint', {}, 'Zum Eintragen der Punkte eine Person antippen. Prozent und Note (Prozent-Bewertungsspiegel) berechnet die App aus der Punktesumme. Alle Eingaben werden automatisch gespeichert.')
      ),
      h('div.card.card-tight',
        h('div.row-between',
          h('div.row-gap', h('span.hint', {}, 'Sortierung'), sortSeg),
          h('button.btn-small.btn-primary', { onclick: function () { printSheets(ratedStudents()); } }, 'Bewertungsbögen drucken')),
        h('p.hint', {}, 'In der Eingabe-Sortierung stehen die Personen in der Reihenfolge ihrer ersten Punkteeingabe (Korrekturstapel); ▲▼ sortiert um. Der Druck folgt der gewählten Sortierung – eine Seite je Person; einzelne Seiten wählen Sie im Druckdialog aus.')),
      listHost,
      h('div.card.card-tight',
        h('div.row-between',
          h('strong', {}, 'Notenspiegel'),
          h('div.row-gap',
            h('button.btn-small.btn-plain', { onclick: function () {
              var t = taskSum();
              var head = ['Name', 'Datum'];
              work.tasks.forEach(function (mp, ti) { head.push('Aufg. ' + (ti + 1) + ' (max ' + (mp == null ? '?' : mp) + ')'); });
              head.push('Summe', 'Mögliche Punkte', 'Prozent', 'Note', 'Kommentar');
              var rows = [head];
              sortedStudents().forEach(function (st2) {
                var arr = work.taskPoints[st2.id] || [];
                if (!arr.some(function (v) { return v != null; })) return;
                var sum = 0;
                var row = [st2.lastName + ', ' + st2.firstName,
                  UI.fmtDate(work.dates[st2.id] || work.date || '')];
                work.tasks.forEach(function (mp, ti) {
                  row.push(arr[ti] != null ? arr[ti] : 0);
                  if (arr[ti] != null) sum += arr[ti];
                });
                sum = Math.round(sum * 100) / 100;
                var pct = (t.ok && t.sum > 0) ? Math.round(sum / t.sum * 10000) / 100 : null;
                row.push(sum, t.ok ? t.sum : '', pct == null ? '' : Calc.fmt(Math.round(pct * 10) / 10, 1),
                  pct == null ? '' : Calc.fmt(Calc.gradeForPercent(pct, pctTable).g),
                  work.comments[st2.id] || '');
                rows.push(row);
              });
              if (rows.length < 2) { toast('Noch keine bewerteten Klausuren zum Kopieren.'); return; }
              copyRowsToClipboard(rows, 'Klausurergebnisse');
            } }, 'Ergebnisse kopieren'),
            h('button.btn-small.btn-plain', { onclick: printMirror }, 'Notenspiegel drucken'))),
        mirrorHost)
    );
  }

  views.klausuren = function (p) {
    var course = Store.courseById(p.id);
    var cls = Store.classById(course.classId);
    var hj = p.hj || 1;
    var idx = p.idx || 0;
    var n = Math.max(1, course.numKA || 2);
    if (idx >= n) idx = 0;
    var pctTable = S().settings.gradingPct || Calc.DEFAULT_GRADING_PCT;
    var students = cls.students.slice().sort(function (a, b) {
      return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName, 'de');
    });
    var data = kaData(course, hj, idx);

    /* Vollständige Klausurbewertung: greift, wenn diese Klausur bereits
       Aufgabendaten hat ODER der globale Schalter auf „Vollständig" steht.
       Datengetrieben vor Einstellung – Umschalten versteckt nie Daten. */
    var fullMode = !!(data.full || S().settings.kaFullMode);

    var hjSeg = h('div.seg.seg-wide', {}, [1, 2].map(function (v) {
      return h('button.seg-btn' + (hj === v ? '.active' : ''), {
        onclick: function () { go('klausuren', { id: course.id, hj: v, idx: 0 }); }
      }, v + '. Halbjahr');
    }));

    var tabs = h('div.crit-tabs', {}, Array.from({ length: n }, function (_, i) {
      var d = course.ka && course.ka[hj] && course.ka[hj][i];
      var has = d && d.points && Object.keys(d.points).length > 0;
      return h('button.crit-tab' + (i === idx ? '.active' : ''), {
        onclick: function () { go('klausuren', { id: course.id, hj: hj, idx: i }); }
      }, 'Klausur ' + (i + 1) + (has ? ' ●' : ''));
    }));

    function parseNum(str) {
      var s = String(str).trim().replace(',', '.');
      if (s === '') return { ok: true, value: null };
      var v = Number(s);
      if (isNaN(v) || v < 0) return { ok: false };
      return { ok: true, value: Math.round(v * 100) / 100 };
    }

    if (fullMode) {
      return fullExamView(course, cls, students, hj, idx, data, hjSeg, tabs, pctTable, parseNum);
    }

    var maxInput = h('input.input.input-num', {
      type: 'text', inputmode: 'decimal', placeholder: 'z. B. 100',
      value: data.maxPoints == null ? '' : Calc.fmt(data.maxPoints)
    });

    function currentMax() {
      var r = parseNum(maxInput.value);
      return (r.ok && r.value != null && r.value > 0) ? r.value : null;
    }

    var inputs = {};
    var refreshers = [];
    function refreshAll() { refreshers.forEach(function (f) { f(); }); }

    /* Automatisches Speichern (Bewertungsdaten): entprellt beim Tippen,
       sofort beim Verlassen eines Feldes. Es werden nur maxPoints/points
       geschrieben – vorhandene Aufgabendaten (data.full) bleiben unberührt,
       damit ein Moduswechsel nie Daten verliert. Ungültige Einzelfelder
       (unlesbar oder über dem Maximum) werden übersprungen und rot markiert. */
    var kaTimer = null;
    function persistKa() {
      if (kaTimer) { clearTimeout(kaTimer); kaTimer = null; }
      var maxR = parseNum(maxInput.value);
      if (!maxR.ok || (maxR.value != null && maxR.value <= 0)) return;
      var max = maxR.value;
      var out = {};
      students.forEach(function (stu) {
        var r = parseNum(inputs[stu.id].value);
        if (!r.ok || r.value == null) return;
        if (max != null && r.value > max) return;
        out[stu.id] = r.value;
      });
      data.maxPoints = max;
      data.points = out;
      course.ka[hj][idx] = data;
      Store.save();
    }
    function scheduleKaSave() {
      if (kaTimer) clearTimeout(kaTimer);
      kaTimer = setTimeout(persistKa, 600);
    }

    maxInput.addEventListener('input', function () { refreshAll(); scheduleKaSave(); });
    maxInput.addEventListener('blur', persistKa);

    var rows = students.map(function (stu) {
      var pts = data.points[stu.id] != null ? data.points[stu.id] : null;
      var inp = h('input.input.grade-input', {
        type: 'text', inputmode: 'decimal', placeholder: '–',
        value: pts == null ? '' : Calc.fmt(pts), 'aria-label': 'Punkte'
      });
      inputs[stu.id] = inp;
      var pctCell = h('span.hint');
      var gradeCell = h('strong.review-solei');
      function refresh() {
        var max = currentMax();
        var r = parseNum(inp.value);
        var tooHigh = r.ok && r.value != null && max != null && r.value > max;
        inp.classList.toggle('input-error', !r.ok || tooHigh);
        if (!r.ok || r.value == null || max == null) {
          pctCell.textContent = ''; gradeCell.textContent = '–';
          return;
        }
        var pct = Math.round(r.value / max * 10000) / 100;
        pctCell.textContent = Calc.fmt(Math.round(pct * 10) / 10, 1) + ' %';
        var g = tooHigh ? null : Calc.gradeForPercent(pct, pctTable);
        gradeCell.textContent = g ? Calc.fmt(g.g) : '–';
      }
      refreshers.push(refresh);
      inp.addEventListener('input', function () { refresh(); scheduleKaSave(); });
      inp.addEventListener('blur', persistKa);
      return h('div.review-row',
        h('div.review-name', nameWithPhoto(stu)),
        h('div.review-grades',
          h('div.review-cell', h('span.hint', {}, 'Punkte'), inp),
          h('div.review-cell', h('span.hint', {}, 'Prozent'), h('span.review-solei', {}, pctCell)),
          h('div.review-cell', h('span.hint', {}, 'Note'), gradeCell)
        )
      );
    });
    refreshAll();

    return h('div.screen',
      header('Klausuren', { name: 'course', params: { id: course.id } }),
      courseBox(course),
      h('div.card.card-tight',
        h('div.row-between', hjSeg, null),
        tabs,
        h('label.field',
          h('span.field-label', {}, 'Maximalpunktzahl dieser Klausur'), maxInput),
        h('p.hint', {}, 'Je Schüler/in die erreichten Punkte eintragen – Prozent und Note (Prozent-Bewertungsspiegel) berechnet die App. ' +
          'Ohne Maximalpunktzahl können Prozent und Note nicht berechnet werden. Eingaben werden automatisch gespeichert.')
      ),
      h('div.card.card-list', {},
        students.length ? rows : h('div.empty', h('p', {}, 'Diese Klasse hat noch keine Schüler/innen.')))
    );
  };

  /* ================= Notenübersicht & Notenausdruck ================= */

  /* Berechnet alle Noten eines Schülers – nach den Formeln des Noten-Blatts. */
  function studentGradeRow(course, stu) {
    var grading15 = S().settings.grading15;
    var pctTable = S().settings.gradingPct || Calc.DEFAULT_GRADING_PCT;
    var nObt = Math.max(1, course.numOBT || 4);
    var nKa = Math.max(1, course.numKA || 2);

    var soleiQ = [], slBogenQ = [], portfolioQ = [], sumQ = [], statQ = [];
    for (var q = 1; q <= 4; q++) {
      var stat = Calc.quarterStatus(Store.entriesFor(course.id, stu.id, q).byCriterion);
      statQ.push(stat);
      var slG = stat.rated > 0 ? Calc.gradeFor15(stat.sum, grading15).g : null;
      var pg = portfolioGrade(course, q, stu.id);
      slBogenQ.push(slG);
      portfolioQ.push(pg);
      sumQ.push(stat.rated > 0 ? stat.sum : null);
      soleiQ.push(Calc.soleiGrade(slG, pg));
    }
    var slHJ1 = Calc.avgRound2([soleiQ[0], soleiQ[1]]);
    var slHJ2 = Calc.avgRound2([soleiQ[2], soleiQ[3]]);
    var slSJ = Calc.avgRound2(soleiQ);

    function obtGrade(hj, i) {
      var d = course.obt && course.obt[hj] && course.obt[hj][i];
      var pct = d && d[stu.id] != null ? d[stu.id] : null;
      if (pct == null) return null;
      return Calc.gradeForPercent(pct, pctTable).g;
    }
    var obtG = { 1: [], 2: [] };
    for (var i = 0; i < nObt; i++) { obtG[1].push(obtGrade(1, i)); obtG[2].push(obtGrade(2, i)); }
    var obtHJ1 = Calc.avgRound2(obtG[1]);
    var obtHJ2 = Calc.avgRound2(obtG[2]);
    var obtSJ = Calc.avgRound2(obtG[1].concat(obtG[2]));

    function kaGrade(hj, i) {
      var d = course.ka && course.ka[hj] && course.ka[hj][i];
      if (!d || d.maxPoints == null || d.maxPoints <= 0) return null;
      var pts = d.points && d.points[stu.id] != null ? d.points[stu.id] : null;
      if (pts == null) return null;
      return Calc.gradeForPercent(pts / d.maxPoints * 100, pctTable).g;
    }
    var kaG = { 1: [], 2: [] };
    for (var k = 0; k < nKa; k++) { kaG[1].push(kaGrade(1, k)); kaG[2].push(kaGrade(2, k)); }
    var kaHJ1 = Calc.avgRound2(kaG[1]);
    var kaHJ2 = Calc.avgRound2(kaG[2]);
    var kaSJ = Calc.avgRound2(kaG[1].concat(kaG[2]));

    var w = course.weights || { sl: 40, obt: 20, ka: 40 };
    var zHJ1 = Calc.weightedGrade(slHJ1, obtHJ1, kaHJ1, w);
    var zHJ2 = Calc.weightedGrade(slHJ2, obtHJ2, kaHJ2, w);
    var zSJ = Calc.weightedGrade(slSJ, obtSJ, kaSJ, w);

    var zg = (course.zeugnis && course.zeugnis[stu.id]) || {};

    return {
      stu: stu, statQ: statQ, sumQ: sumQ, slBogenQ: slBogenQ, portfolioQ: portfolioQ,
      soleiQ: soleiQ, slHJ1: slHJ1, slHJ2: slHJ2, slSJ: slSJ,
      obtG: obtG, obtHJ1: obtHJ1, obtHJ2: obtHJ2, obtSJ: obtSJ,
      kaG: kaG, kaHJ1: kaHJ1, kaHJ2: kaHJ2, kaSJ: kaSJ,
      zHJ1: zHJ1, zHJ2: zHJ2, zSJ: zSJ,
      tendenz: Calc.tendency(zHJ1, zHJ2),
      zeugnisHJ: zg.hj != null ? zg.hj : null,
      zeugnisJahr: zg.jahr != null ? zg.jahr : null
    };
  }

  function fmtG(v) { return v == null ? '' : Calc.fmt(v); }

  /* Druck-/PDF-Ausgabe (Weg B): Ein isoliertes Druckfenster mit nur dem Druckinhalt.
     Robuster auf iPadOS/Android, weil kein Alt-Kontext (Scroll-Container, position-Ebenen)
     mitgeschleppt wird – genau das verhinderte dort die Anzeige der Tabelle. */
  function printNode(node, landscape, docTitle) {
    var win = window.open('', '_blank');
    if (!win) {
      /* Popup blockiert (auf Mobilgeräten häufig, wenn nicht als direkte Tippfolge erkannt). */
      UI.modal('Druck/PDF blockiert',
        h('p', {}, 'Der Browser hat das Druckfenster blockiert. Bitte erlauben Sie für diese Seite ' +
          'Pop-up-Fenster und tippen Sie erneut auf „Drucken / als PDF speichern".'));
      return;
    }

    var theme = document.documentElement.getAttribute('data-theme') || '';
    var pageRule = '@page { size: A4 ' + (landscape ? 'landscape' : 'portrait') + '; margin: ' + (landscape ? '7mm' : '12mm') + '; }';

    /* Die Diagramme (SVG) verwenden CSS-Variablen wie var(--teal). Im isolierten Fenster
       sind diese sonst undefiniert – daher die aktuell aufgelösten Werte übernehmen. */
    var cs = getComputedStyle(document.documentElement);
    function cssVar(name, fallback) {
      var v = cs.getPropertyValue(name);
      return (v && v.trim()) || fallback;
    }
    var rootVars = ':root{' +
      '--teal:' + cssVar('--teal', '#0e7c74') + ';' +
      '--teal-dark:' + cssVar('--teal-dark', '#0b5f59') + ';' +
      '--red:' + cssVar('--red', '#c0392b') + ';' +
      '--line:' + cssVar('--line', '#c8ccd0') + ';' +
      '--ink-soft:' + cssVar('--ink-soft', '#555') + ';' +
      '}';

    /* Die Druck-spezifischen Tabellenregeln (bisher nur in @media print) auch hier direkt
       anwenden, damit der Inhalt im Druckfenster sichtbar und korrekt gesetzt ist. */
    var printCss =
      'html,body{margin:0;padding:0;background:#fff;color:#000;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}' +
      'body{padding:6mm;}' +
      '.print-page h2{margin:0 0 2mm;}' +
      '.print-sub{margin:0 0 3mm;color:#333;}' +
      '.grades-table{font-size:6.5pt;width:100%;border-collapse:collapse;}' +
      '.report-table{font-size:8.5pt;width:100%;border-collapse:collapse;}' +
      '.grades-table th,.grades-table td,.report-table th,.report-table td{' +
        'border:0.5pt solid #888;padding:1mm 1.2mm;text-align:center;}' +
      '.grades-table th{white-space:normal;hyphens:auto;font-weight:600;}' +
      '.grades-table td{white-space:nowrap;}' +
      '.grades-table .sticky-col{position:static;box-shadow:none;text-align:left;}' +
      '.grades-table .group-row th{background:#eee;color:#000;}' +
      '.grades-table tr:nth-child(2) th,.report-table th{background:#f2f2f2;color:#000;}' +
      '.report-table .row-label{text-align:left;color:#333;}' +
      '.report-table .val.strong{font-weight:750;background:#f6f8f7;}' +
      /* Entwicklung zum Vorquartal farbig wie am Bildschirm; print-color-adjust
         erzwingt die Hintergrundfarben auch ohne „Hintergrundgrafiken drucken“.
         Die farbige Schrift druckt zusätzlich in jedem Fall. */
      '.report-table .val.up{background:' + cssVar('--green-soft', '#e9f4ec') + ';' +
        'color:' + cssVar('--green', '#2e7d46') + ';font-weight:700;' +
        '-webkit-print-color-adjust:exact;print-color-adjust:exact;}' +
      '.report-table .val.down{background:' + cssVar('--red-soft', '#fbecea') + ';' +
        'color:' + cssVar('--red', '#b4382f') + ';font-weight:700;' +
        '-webkit-print-color-adjust:exact;print-color-adjust:exact;}' +
      '.report-table .tend-cell{font-weight:750;}' +
      '.table-scroll{overflow:visible;box-shadow:none;}' +
      '.report{font-size:8.5pt;}' +
      '.report-head h2{font-size:13pt;margin:0 0 1mm;}' +
      '.report-block{page-break-inside:avoid;margin:0 0 2.5mm;}' +
      '.report-block h3{font-size:9.5pt;margin:0 0 1mm;}' +
      '.report-section{font-size:9.5pt;margin:2mm 0 1mm;}' +
      '.report-line{margin:0.8mm 0;}' +
      '.zeugnis-box{text-align:center;margin-top:2mm;page-break-inside:avoid;break-inside:avoid;}' +
      '.zeugnis-head{margin:0 0 0.6mm;font-weight:750;font-size:8.5pt;}' +
      '.zeugnis-line{text-align:center;}' +
      '.page-break{page-break-before:always;break-before:page;}' +
      '.exam-sheet h2{font-size:13pt;margin:0 0 1mm;}' +
      '.exam-sheet .print-sub{font-size:9pt;color:#444;margin:0 0 2mm;}' +
      '.exam-sheet-name{font-size:11pt;margin:0 0 2mm;}' +
      '.exam-tbl{border-collapse:collapse;margin:0 0 2mm;}' +
      '.exam-tbl th,.exam-tbl td{border:1px solid #888;padding:0.8mm 3mm;font-size:9.5pt;text-align:center;}' +
      '.exam-tbl th{background:#eee;}' +
      '.exam-sum-row td{font-weight:700;background:#f4f4f4;}' +
      '.exam-result{font-size:11pt;font-weight:700;margin:1mm 0;}' +
      '.exam-comment{font-size:9.5pt;margin:1mm 0;}' +
      '.mirror-tbl{border-collapse:collapse;}' +
      '.mirror-tbl th,.mirror-tbl td{border:1px solid #888;padding:1mm 4mm;font-size:10pt;text-align:center;}' +
      '.mirror-tbl th{background:#eee;}' +
      '.mirror-tbl td{font-weight:700;}' +
      '.mirror-tbl .mirror-avg{border-left:2px solid #333;}' +
      '.grades-table tr.avg-row td{font-weight:700;background:#eef3f2;border-top:1pt solid #333;' +
        '-webkit-print-color-adjust:exact;print-color-adjust:exact;}' +
      '.charts-print h2{font-size:13pt;margin:0 0 1mm;}' +
      '.charts-print .print-sub{font-size:9pt;margin:0 0 3mm;}' +
      '.charts-print .report-block{page-break-inside:avoid;margin:0 0 2.5mm;}' +
      '.charts-print .report-block h3{font-size:9pt;margin:0 0 1mm;}' +
      '.charts-print .chart-host svg{height:30mm;width:100%;display:block;}' +
      '.charts-print .hint{font-size:8pt;margin:0;}' +
      '.legend-dot{display:inline-block;width:0.5em;height:0.5em;border-radius:50%;background:#c0392b;}' +
      'h3{font-size:10pt;margin:2mm 0 1mm;}' +
      /* Bedienleiste nur am Bildschirm – im Ausdruck ausgeblendet. */
      '.print-toolbar{position:sticky;top:0;display:flex;gap:10px;justify-content:flex-end;' +
        'padding:8px 4px;margin:0 0 6px;background:#fff;border-bottom:1px solid #ddd;}' +
      '.print-toolbar button{font:inherit;font-size:14px;padding:8px 16px;border-radius:8px;' +
        'border:1px solid ' + cssVar('--teal', '#0e7c74') + ';background:' + cssVar('--teal', '#0e7c74') + ';' +
        'color:#fff;cursor:pointer;}' +
      '.print-toolbar .btn-secondary{background:#fff;color:' + cssVar('--teal', '#0e7c74') + ';}' +
      '@media print{.print-toolbar{display:none !important;}}';

    var doc = win.document;
    doc.open();
    doc.write('<!DOCTYPE html><html lang="de"' + (theme ? ' data-theme="' + theme + '"' : '') + '><head>' +
      '<meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>' + (docTitle ? String(docTitle).replace(/[<>]/g, '') : 'SOL-Noten – Druck') + '</title>' +
      '<style>' + pageRule + rootVars + printCss + '</style>' +
      '</head><body></body></html>');
    doc.close();

    /* Knoten stammt aus dem Ursprungsdokument – für Fremddokument sicher übernehmen. */
    var imported;
    try { imported = doc.importNode(node, true); }
    catch (e) { imported = node; }

    /* Bedienleiste (nur am Bildschirm): erneut drucken bzw. Fenster schließen.
       Wichtig für iPad-PWA, wo sonst kein sichtbarer Weg zurück zur App besteht. */
    var toolbar = doc.createElement('div');
    toolbar.className = 'print-toolbar';
    var btnPrint = doc.createElement('button');
    btnPrint.className = 'btn-secondary';
    btnPrint.textContent = 'Drucken / als PDF';
    btnPrint.onclick = function () { try { win.print(); } catch (e) {} };
    var btnClose = doc.createElement('button');
    btnClose.textContent = 'Schließen';
    btnClose.onclick = function () { try { win.close(); } catch (e) {} };
    toolbar.appendChild(btnPrint);
    toolbar.appendChild(btnClose);
    doc.body.appendChild(toolbar);
    doc.body.appendChild(imported);

    /* Drucken erst starten, wenn das Layout im Fenster steht. */
    var printed = false;
    function triggerPrint() {
      if (printed) return;
      printed = true;
      try { win.focus(); } catch (e) {}
      try { win.print(); } catch (e) {}
    }

    if (doc.readyState === 'complete') {
      setTimeout(triggerPrint, 300);
    } else {
      win.addEventListener('load', function () { setTimeout(triggerPrint, 200); });
      /* Fallback, falls das load-Ereignis ausbleibt. */
      setTimeout(triggerPrint, 1200);
    }
  }

  var gradesState = { mode: 'class', studentIdx: 0 };

  /* Notenübersicht eines Kurses als Zeilenmatrix (für Excel-Export; auch vom
     Schuljahres-Export genutzt, daher unabhängig vom grades-View). */
  function gradeExportRows(course) {
    var cls = Store.classById(course.classId);
    var year = Store.yearById(course.yearId);
    var nObt = Math.max(1, course.numOBT || 4);
    var nKa = Math.max(1, course.numKA || 2);
    var students = cls.students.slice().sort(function (a, b) {
      return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName, 'de');
    });
    var rowsData = students.map(function (stu) { return studentGradeRow(course, stu); });

    var head = ['Name', 'SoLei 1. Q', 'SoLei 2. Q', 'SoLei 3. Q', 'SoLei 4. Q',
      'SoLei ø 1. HJ', 'SoLei ø 2. HJ', 'SoLei ø SJ'];
    for (var hj = 1; hj <= 2; hj++) for (var i = 0; i < nObt; i++) head.push('OBT' + (i + 1) + ' ' + hj + '.HJ');
    head.push('OBT ø 1. HJ', 'OBT ø 2. HJ', 'OBT ø SJ');
    for (var hj2 = 1; hj2 <= 2; hj2++) for (var k = 0; k < nKa; k++) head.push('K' + (k + 1) + ' ' + hj2 + '.HJ');
    head.push('KA ø 1. HJ', 'KA ø 2. HJ', 'KA ø SJ',
      'Zeugnisnote ø 1. HJ', 'Zeugnisnote ø 2. HJ', 'Zeugnisnote ø SJ', 'Tendenz', 'HJ-Zeugnis', 'Jahreszeugnis');
    var out = [
      ['Notenübersicht', cls.name + ' · ' + course.subject + ' · ' + year.name + ' · Stand: ' + UI.fmtDate(Store.todayISO())],
      [],
      head
    ];
    rowsData.forEach(function (r) {
      var row = [r.stu.lastName + ', ' + r.stu.firstName];
      r.soleiQ.forEach(function (v) { row.push(v); });
      row.push(r.slHJ1, r.slHJ2, r.slSJ);
      [1, 2].forEach(function (hjx) { r.obtG[hjx].forEach(function (v) { row.push(v); }); });
      row.push(r.obtHJ1, r.obtHJ2, r.obtSJ);
      [1, 2].forEach(function (hjx) { r.kaG[hjx].forEach(function (v) { row.push(v); }); });
      row.push(r.kaHJ1, r.kaHJ2, r.kaSJ, r.zHJ1, r.zHJ2, r.zSJ, r.tendenz || null, r.zeugnisHJ, r.zeugnisJahr);
      out.push(row);
    });
    return out;
  }

  views.grades = function (p) {
    var course = Store.courseById(p.id);
    var cls = Store.classById(course.classId);
    var year = Store.yearById(course.yearId);
    if (!course.zeugnis) course.zeugnis = {};
    var nObt = Math.max(1, course.numOBT || 4);
    var nKa = Math.max(1, course.numKA || 2);
    var students = cls.students.slice().sort(function (a, b) {
      return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName, 'de');
    });
    var rowsData = students.map(function (stu) { return studentGradeRow(course, stu); });

    function headCells() {
      var cells = [h('th.sticky-col', {}, 'Name')];
      ['1. Q', '2. Q', '3. Q', '4. Q', 'ø 1. HJ', 'ø 2. HJ', 'ø SJ'].forEach(function (t) {
        cells.push(h('th', {}, t));
      });
      for (var hj = 1; hj <= 2; hj++) for (var i = 0; i < nObt; i++)
        cells.push(h('th', {}, 'OBT' + (i + 1) + ' · ' + hj + '.HJ'));
      ['ø 1. HJ', 'ø 2. HJ', 'ø SJ'].forEach(function (t) { cells.push(h('th', {}, t)); });
      for (var hj2 = 1; hj2 <= 2; hj2++) for (var k = 0; k < nKa; k++)
        cells.push(h('th', {}, 'K' + (k + 1) + ' · ' + hj2 + '.HJ'));
      ['ø 1. HJ', 'ø 2. HJ', 'ø SJ', 'ø 1. HJ', 'ø 2. HJ', 'ø SJ', 'Tendenz', 'HJ-Zeugnis', 'Jahreszeugnis']
        .forEach(function (t) { cells.push(h('th', {}, t)); });
      return cells;
    }

    function groupRow() {
      var w = course.weights || { sl: 40, obt: 20, ka: 40 };
      return h('tr.group-row',
        h('th.sticky-col', {}, ''),
        h('th', { colspan: 7 }, 'Sonstige Leistungen (' + w.sl + ' %)'),
        h('th', { colspan: nObt * 2 + 3 }, 'Open Book Tests (' + w.obt + ' %)'),
        h('th', { colspan: nKa * 2 + 3 }, 'Klausuren (' + w.ka + ' %)'),
        h('th', { colspan: 4 }, 'Zeugnisnote'),
        h('th', { colspan: 2 }, 'Zeugnis (manuell)')
      );
    }

    var zInputs = {};
    function zeugnisInput(stu, key, val) {
      var inp = h('input.input.z-input', {
        type: 'text', inputmode: 'numeric', value: val == null ? '' : Calc.fmt(val), placeholder: '–'
      });
      zInputs[stu.id] = zInputs[stu.id] || {};
      zInputs[stu.id][key] = inp;
      /* Sofort speichern (Bewertungsdaten): ungültige Werte werden markiert
         und nicht übernommen, gültige landen direkt im Zustand. */
      function persistZ() {
        var r = parseZeugnis(inp.value);
        inp.classList.toggle('input-error', !r.ok);
        if (!r.ok) return;
        var cur = course.zeugnis[stu.id] || {};
        cur[key] = r.value;
        if (cur.hj == null && cur.jahr == null) delete course.zeugnis[stu.id];
        else course.zeugnis[stu.id] = cur;
        Store.save();
      }
      inp.addEventListener('input', function () {
        var r = parseZeugnis(inp.value);
        inp.classList.toggle('input-error', !r.ok);
        if (zSaveTimer) clearTimeout(zSaveTimer);
        zSaveTimer = setTimeout(persistZ, 600);
      });
      inp.addEventListener('blur', function () {
        if (zSaveTimer) { clearTimeout(zSaveTimer); zSaveTimer = null; }
        persistZ();
      });
      return inp;
    }
    var zSaveTimer = null;

    var body = rowsData.map(function (r) {
      var cells = [h('td.sticky-col.name-cell', {
        onclick: function () {
          gradesState.mode = 'student';
          gradesState.studentIdx = students.indexOf(r.stu);
          render();
        }
      }, r.stu.lastName + ', ' + r.stu.firstName)];
      r.soleiQ.forEach(function (v) { cells.push(h('td', {}, fmtG(v))); });
      [r.slHJ1, r.slHJ2, r.slSJ].forEach(function (v) { cells.push(h('td.avg-cell', {}, fmtG(v))); });
      [1, 2].forEach(function (hj) { r.obtG[hj].forEach(function (v) { cells.push(h('td', {}, fmtG(v))); }); });
      [r.obtHJ1, r.obtHJ2, r.obtSJ].forEach(function (v) { cells.push(h('td.avg-cell', {}, fmtG(v))); });
      [1, 2].forEach(function (hj) { r.kaG[hj].forEach(function (v) { cells.push(h('td', {}, fmtG(v))); }); });
      [r.kaHJ1, r.kaHJ2, r.kaSJ].forEach(function (v) { cells.push(h('td.avg-cell', {}, fmtG(v))); });
      [r.zHJ1, r.zHJ2, r.zSJ].forEach(function (v) { cells.push(h('td.avg-cell.z-cell', {}, fmtG(v))); });
      cells.push(h('td.tend-cell', {}, r.tendenz));
      cells.push(h('td', {}, zeugnisInput(r.stu, 'hj', r.zeugnisHJ)));
      cells.push(h('td', {}, zeugnisInput(r.stu, 'jahr', r.zeugnisJahr)));
      return h('tr', {}, cells);
    });

    /* Durchschnittszeile: Spaltenmittel über alle Personen mit Wert.
       Tendenz und manuelle Zeugnisspalten bleiben bewusst leer. */
    function avgRow() {
      function colAvg(pick) {
        return Calc.avgRound2(rowsData.map(pick));
      }
      var cells = [h('td.sticky-col', {}, h('strong', {}, 'ø Klasse'))];
      for (var qi = 0; qi < 4; qi++) (function (qi2) {
        cells.push(h('td', {}, fmtG(colAvg(function (r) { return r.soleiQ[qi2]; }))));
      })(qi);
      [function (r) { return r.slHJ1; }, function (r) { return r.slHJ2; }, function (r) { return r.slSJ; }]
        .forEach(function (p2) { cells.push(h('td.avg-cell', {}, fmtG(colAvg(p2)))); });
      [1, 2].forEach(function (hj) {
        for (var i = 0; i < nObt; i++) (function (hj2, i2) {
          cells.push(h('td', {}, fmtG(colAvg(function (r) { return r.obtG[hj2][i2]; }))));
        })(hj, i);
      });
      [function (r) { return r.obtHJ1; }, function (r) { return r.obtHJ2; }, function (r) { return r.obtSJ; }]
        .forEach(function (p2) { cells.push(h('td.avg-cell', {}, fmtG(colAvg(p2)))); });
      [1, 2].forEach(function (hj) {
        for (var k = 0; k < nKa; k++) (function (hj2, k2) {
          cells.push(h('td', {}, fmtG(colAvg(function (r) { return r.kaG[hj2][k2]; }))));
        })(hj, k);
      });
      [function (r) { return r.kaHJ1; }, function (r) { return r.kaHJ2; }, function (r) { return r.kaSJ; }]
        .forEach(function (p2) { cells.push(h('td.avg-cell', {}, fmtG(colAvg(p2)))); });
      [function (r) { return r.zHJ1; }, function (r) { return r.zHJ2; }, function (r) { return r.zSJ; }]
        .forEach(function (p2) { cells.push(h('td.avg-cell.z-cell', {}, fmtG(colAvg(p2)))); });
      cells.push(h('td', {}, ''), h('td', {}, ''), h('td', {}, ''));
      return h('tr.avg-row', {}, cells);
    }

    var table = h('table.grades-table',
      groupRow(),
      h('tr', {}, headCells()),
      body,
      students.length ? avgRow() : null
    );

    function parseZeugnis(str) {
      var s = String(str).trim().replace(',', '.');
      if (s === '') return { ok: true, value: null };
      var v = Number(s);
      if (isNaN(v) || v < 1 || v > 6) return { ok: false };
      return { ok: true, value: v };
    }

    /* --- Exporte --- */
    function exportRows() { return gradeExportRows(course); }

    function doExcel() {
      var name = ('Notenuebersicht_' + cls.name + '_' + course.subject + '_' + year.name)
        .replace(/[^\wäöüÄÖÜß-]+/g, '_') + '.xlsx';
      XlsxWrite.download(name, 'Notenübersicht', exportRows());
      toast('Excel-Datei wird gespeichert.');
    }

    function doPrint() {
      var pt = h('div.print-page',
        h('h2', {}, 'Notenübersicht'),
        h('p.print-sub', {}, cls.name + ' · ' + course.subject + ' · ' + year.name +
          ' · Stand: ' + UI.fmtDate(Store.todayISO())),
        table.cloneNode(true)
      );
      /* Eingabefelder im Druck durch Textwerte ersetzen */
      pt.querySelectorAll('input').forEach(function (inp) {
        inp.parentNode.replaceChild(document.createTextNode(inp.value || ''), inp);
      });
      printNode(pt, true, yearShort(year) + ' ' + cls.name + ' ' + course.subject + ' Notenliste');
    }

    /* Diagramm-Wahl ist eine dauerhafte Vorliebe → im verschlüsselten
       Zustand gespeichert, nicht nur je Sitzung. */
    var chartsOn = !!S().settings.gradesCharts;
    var viewToggle = h('div.view-toggle.grades-toggle',
      h('button.view-btn' + (gradesState.mode === 'class' ? '.active' : ''), {
        onclick: function () { if (gradesState.mode !== 'class') { gradesState.mode = 'class'; render(); } }
      }, 'Ansicht: Klasse'),
      h('button.view-btn' + (gradesState.mode === 'student' ? '.active' : ''), {
        onclick: function () { if (gradesState.mode !== 'student') { gradesState.mode = 'student'; gradesState.studentIdx = 0; render(); } }
      }, 'Ansicht: Schüler/in'),
      gradesState.mode === 'student'
        ? h('button.view-btn' + (chartsOn ? '.active' : ''), {
            onclick: function () {
              S().settings.gradesCharts = !chartsOn;
              Store.save();
              render();
            }
          }, 'Diagramme: ' + (chartsOn ? 'Ein' : 'Aus'))
        : null
    );

    if (gradesState.mode === 'student' && students.length) {
      if (gradesState.studentIdx >= students.length) gradesState.studentIdx = 0;
      var si = gradesState.studentIdx;
      var stu = students[si];
      var reportContent = buildReportContent(course, stu);
      function doStudentPrint() {
        var pt = h('div', reportContent.cloneNode(true));
        /* Diagramme drucken genau dann, wenn sie eingeblendet sind –
           auf einer eigenen zweiten Seite mit Namens-Kopfzeile. */
        if (chartsOn) pt.appendChild(buildStudentChartsContent(course, stu, true));
        printNode(pt, false, yearShort(year) + ' ' + stu.lastName + ' ' + stu.firstName + ' Notenübersicht');
      }
      return h('div.screen.screen-wide',
        header('Notenübersicht & Zeugnisnoten', { name: 'course', params: { id: course.id } }),
        h('div.card.card-tight.course-box.course-box-row',
          h('strong', {}, cls.name + ' - ' + course.subject),
          h('button.btn-small.btn-primary.course-box-btn', { onclick: doStudentPrint }, 'Drucken / PDF')),
        h('div.grades-toggle-row', viewToggle),
        h('div.crit-nav',
          h('button.icon-btn', { onclick: function () {
            gradesState.studentIdx = (si + students.length - 1) % students.length; render();
          } }, '‹'),
          h('span.crit-current', {}, stu.lastName + ', ' + stu.firstName),
          h('button.icon-btn', { onclick: function () {
            gradesState.studentIdx = (si + 1) % students.length; render();
          } }, '›')
        ),
        h('div.card', {}, reportContent),
        chartsOn ? buildStudentChartsContent(course, stu, false) : null,
        exportWarning()
      );
    }

    /* ----- Leistungsverlauf: Klassendurchschnitte als Liniendiagramm -----
       X-Achse = Leistungen der gewählten Kategorie in zeitlicher Reihenfolge,
       Y-Achse = Durchschnittsnote (1 oben, 6 unten). */
    if (!gradesState.chartMetric) gradesState.chartMetric = 'solei';
    function classAvgChartCard() {
      function pts() {
        function avgOf(pick) { return Calc.avgRound2(rowsData.map(pick)); }
        var out = [];
        if (gradesState.chartMetric === 'solei') {
          for (var q2 = 1; q2 <= 4; q2++) (function (qq) {
            var v = avgOf(function (r) { return r.soleiQ[qq - 1]; });
            if (v != null) out.push({ label: qq + '. Q', v: v });
          })(q2);
        } else if (gradesState.chartMetric === 'obt') {
          [1, 2].forEach(function (hj) {
            for (var i = 0; i < nObt; i++) (function (hj2, i2) {
              var v = avgOf(function (r) { return r.obtG[hj2][i2]; });
              if (v != null) out.push({ label: 'OBT ' + (i2 + 1) + ' · ' + hj2 + '.HJ', v: v });
            })(hj, i);
          });
        } else {
          [1, 2].forEach(function (hj) {
            for (var k = 0; k < nKa; k++) (function (hj2, k2) {
              var v = avgOf(function (r) { return r.kaG[hj2][k2]; });
              if (v != null) out.push({ label: 'K' + (k2 + 1) + ' · ' + hj2 + '.HJ', v: v });
            })(hj, k);
          });
        }
        return out;
      }

      var metricSeg = h('div.seg.seg-wide');
      [{ v: 'solei', l: 'SoLei' }, { v: 'obt', l: 'Open Book Tests' }, { v: 'ka', l: 'Klausuren' }]
        .forEach(function (o) {
          metricSeg.appendChild(h('button.seg-btn' + (gradesState.chartMetric === o.v ? '.active' : ''), {
            onclick: function () {
              if (gradesState.chartMetric === o.v) return;
              gradesState.chartMetric = o.v;
              render();
            }
          }, o.l));
        });

      var data2 = pts();
      var chartNode;
      if (!data2.length) {
        chartNode = h('p.hint', {}, 'Für diese Kategorie liegen noch keine Durchschnittswerte vor.');
      } else {
        var W = 560, H = 190, padL = 30, padR = 14, padT = 12, padB = 34;
        var iw = W - padL - padR, ih = H - padT - padB;
        var n = data2.length;
        function x(i) { return padL + (n === 1 ? iw / 2 : i * (iw / (n - 1))); }
        function y(v) { return padT + (v - 1) / 5 * ih; } /* Note 1 oben, 6 unten */
        var svg = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Klassendurchschnitte">'];
        for (var g2 = 1; g2 <= 6; g2++) {
          svg.push('<line x1="' + padL + '" y1="' + y(g2) + '" x2="' + (W - padR) + '" y2="' + y(g2) + '" stroke="var(--line)" stroke-width="1"/>');
          svg.push('<text x="' + (padL - 6) + '" y="' + (y(g2) + 3.5) + '" text-anchor="end" font-size="10" fill="var(--ink-soft)">' + g2 + '</text>');
        }
        if (n > 1) {
          var d2 = data2.map(function (pt2, i) { return (i ? 'L' : 'M') + x(i) + ' ' + y(pt2.v); }).join(' ');
          svg.push('<path d="' + d2 + '" fill="none" stroke="var(--teal)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>');
        }
        data2.forEach(function (pt2, i) {
          svg.push('<circle cx="' + x(i) + '" cy="' + y(pt2.v) + '" r="4" fill="var(--teal)"/>');
          svg.push('<text x="' + x(i) + '" y="' + (y(pt2.v) - 8) + '" text-anchor="middle" font-size="10" font-weight="700" fill="var(--teal)">' + Calc.fmt(pt2.v) + '</text>');
          svg.push('<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="9.5" fill="var(--ink-soft)">' + pt2.label + '</text>');
        });
        svg.push('</svg>');
        chartNode = h('div.chart-host');
        chartNode.innerHTML = svg.join('');
      }
      return h('div.card.card-tight',
        h('div.row-between', h('strong', {}, 'Leistungsverlauf (ø Klasse)'), metricSeg),
        chartNode);
    }

    return h('div.screen.screen-wide',
      header('Notenübersicht & Zeugnisnoten', { name: 'course', params: { id: course.id } }),
        courseBox(course),
      h('div.grades-toggle-row', viewToggle),
      h('p.hint.grades-hint',
        'Hier vergeben Sie die ', h('strong', {}, 'Zeugnisnoten für das HJ-Zeugnis und das Jahreszeugnis'),
        ' (in der Liste ganz rechts)!', h('br'),
        h('strong', {}, 'Tippen Sie auf einen Namen'), ', um in dessen Einzelansicht zu wechseln.', h('br'),
        'Eingaben werden automatisch gespeichert.'),
      h('div.table-scroll', {}, table),
      classAvgChartCard(),
      h('div.actions-col',
        h('button.btn-plain.btn-block', { onclick: doExcel }, 'Als Excel-Datei exportieren'),
        h('button.btn-plain.btn-block', {
          onclick: function () { copyRowsToClipboard(exportRows(), 'Notenübersicht'); }
        }, 'In die Zwischenablage kopieren'),
        h('button.btn-plain.btn-block', { onclick: doPrint }, 'Drucken / als PDF speichern'),
        exportWarning()
      )
    );
  };

  /* ---------- Punkteentwicklung über alle bisherigen Quartale ----------
     Fünf Liniendiagramme (je Kriterium) für die Schüler-Ansicht der
     Notenübersicht. Y-Achse relativ zum Quartals-Maximum: Sind die Maxima
     aller Quartale gleich (Regelfall), werden absolute Punktwerte
     beschriftet, sonst Prozent. Quartalsgrenzen als gestrichelte Linien. */
  function buildStudentChartsContent(course, stu, forPrint) {
    var names = S().settings.criteriaNames;
    var lastQ = Math.min(4, Math.max(1, course.currentQuarter || 1));
    var upCi = typeof course.uploadCriterion === 'number' ? course.uploadCriterion : 2;

    function chartFor(ci) {
      var pts = [];
      for (var q = 1; q <= lastQ; q++) {
        var maxQ = course.maxPoints[q][ci];
        Store.entriesFor(course.id, stu.id, q).list
          .filter(function (x) { return x.criterion === ci; })
          .sort(function (a, b) { return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt); })
          .forEach(function (x) {
            pts.push({ date: x.date, points: x.points, absence: !!x.absenceId, q: q, max: maxQ });
          });
      }
      if (!pts.length) return { node: h('p.hint', {}, 'Noch keine Punktevergaben für dieses Kriterium.'), hasAbsence: false };

      var W = 560, H = 170, padL = 34, padR = 12, padT = 16, padB = 26;
      var iw = W - padL - padR, ih = H - padT - padB;
      var n = pts.length;
      var sameMax = pts.every(function (p) { return p.max === pts[0].max; });
      function x(i) { return padL + (n === 1 ? iw / 2 : i * (iw / (n - 1))); }
      function y(pt) { return padT + ih - (pt.max > 0 ? (pt.points / pt.max) : 0) * ih; }
      var svg = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Punkteentwicklung ' + names[ci] + '">'];

      /* Raster: absolute Stufen bei gleichem Maximum, sonst Prozent */
      if (sameMax) {
        Calc.tapValues(pts[0].max).forEach(function (v) {
          var yy = padT + ih - (v / pts[0].max) * ih;
          svg.push('<line x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy + '" stroke="var(--line)" stroke-width="1"/>');
          svg.push('<text x="' + (padL - 6) + '" y="' + (yy + 3.5) + '" text-anchor="end" font-size="10" fill="var(--ink-soft)">' + Calc.fmt(v, 1) + '</text>');
        });
      } else {
        [0, 0.5, 1].forEach(function (f) {
          var yy = padT + ih - f * ih;
          svg.push('<line x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy + '" stroke="var(--line)" stroke-width="1"/>');
          svg.push('<text x="' + (padL - 6) + '" y="' + (yy + 3.5) + '" text-anchor="end" font-size="10" fill="var(--ink-soft)">' + (f * 100) + ' %</text>');
        });
      }

      /* Quartalsgrenzen und -beschriftung */
      var segStart = 0;
      for (var i = 1; i <= n; i++) {
        if (i === n || pts[i].q !== pts[i - 1].q) {
          var cx = (x(segStart) + x(i - 1)) / 2;
          svg.push('<text x="' + cx + '" y="' + (padT - 5) + '" text-anchor="middle" font-size="9.5" fill="var(--ink-soft)">' + pts[segStart].q + '. Q</text>');
          if (i < n) {
            var bx = (x(i - 1) + x(i)) / 2;
            svg.push('<line x1="' + bx + '" y1="' + padT + '" x2="' + bx + '" y2="' + (padT + ih) + '" stroke="var(--line)" stroke-width="1" stroke-dasharray="4 3"/>');
          }
          segStart = i;
        }
      }

      if (n > 1) {
        var d = pts.map(function (pt, i) { return (i ? 'L' : 'M') + x(i) + ' ' + y(pt); }).join(' ');
        svg.push('<path d="' + d + '" fill="none" stroke="var(--teal)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>');
      }
      var step = Math.max(1, Math.ceil(n / 8));
      var hasAbsence = false;
      pts.forEach(function (pt, i) {
        if (pt.absence) hasAbsence = true;
        svg.push('<circle cx="' + x(i) + '" cy="' + y(pt) + '" r="' + (pt.absence ? 5 : 4) + '" fill="' + (pt.absence ? 'var(--red)' : 'var(--teal)') + '"/>');
        if (i === 0 || i === n - 1 || i % step === 0) {
          var pp = pt.date.split('-');
          svg.push('<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="9.5" fill="var(--ink-soft)">' + pp[2] + '.' + pp[1] + '.</text>');
        }
      });
      svg.push('</svg>');
      var host = h('div.chart-host');
      host.innerHTML = svg.join('');
      return { node: host, hasAbsence: hasAbsence };
    }

    /* Ergebnis-Uploads über alle bisherigen Quartale summiert.
       uploadTallyFor liefert null, wenn im Quartal nichts erfasst wurde. */
    var upDone = 0, upMissed = 0;
    for (var q = 1; q <= lastQ; q++) {
      var t = Store.uploadTallyFor(course.id, stu.id, q);
      if (t) { upDone += t.done || 0; upMissed += t.missed || 0; }
    }

    var rangeLabel = lastQ === 1 ? '1. Quartal' : '1.–' + lastQ + '. Quartal';
    var blocks = names.map(function (nm, ci) {
      var c = chartFor(ci);
      var extras = [];
      if (ci === upCi && (upDone > 0 || upMissed > 0)) {
        extras.push(h('p.hint', {}, upDone + ' mal Ergebnisse hochgeladen, ' + upMissed + ' Ergebnisse fehlen'));
      }
      if (c.hasAbsence) {
        extras.push(h('p.hint', {}, h('span.legend-dot.red'), ' rote Punkte = unentschuldigte Fehlzeit (0 Punkte)'));
      }
      if (forPrint) {
        return h('div.report-block', h('h3', {}, nm + ' · ' + rangeLabel), c.node, extras);
      }
      return h('div.card.card-tight', h('strong', {}, nm + ' · ' + rangeLabel), c.node, extras);
    });

    if (forPrint) {
      var cls = Store.classById(course.classId);
      var year = Store.yearById(course.yearId);
      return h('div.charts-print.page-break',
        h('h2', {}, 'Punkteentwicklung'),
        h('p.print-sub', {}, stu.lastName + ', ' + stu.firstName + ' · ' + cls.name + ' · ' + course.subject +
          ' · ' + year.name + ' · Stand: ' + UI.fmtDate(Store.todayISO())),
        blocks);
    }
    return h('div.grades-charts', blocks);
  }

  /* ---------- Notenausdruck-Inhalt je Schüler/in (wiederverwendbar) ---------- */

  function buildReportContent(course, stu) {
    var cls = Store.classById(course.classId);
    var year = Store.yearById(course.yearId);
    var names = S().settings.criteriaNames;
    var r = studentGradeRow(course, stu);
    var w = course.weights || { sl: 40, obt: 20, ka: 40 };
    var nObt = Math.max(1, course.numOBT || 4);
    var nKa = Math.max(1, course.numKA || 2);

    function devClass(curr, prev) {
      var d = development(curr, prev);
      return d === 'up' ? '.up' : d === 'down' ? '.down' : '';
    }

    function quarterBlock(q) {
      var stat = r.statQ[q - 1];
      var prev = q > 1 ? r.statQ[q - 2] : null;
      var maxes = course.maxPoints[q];
      var headCells = [h('th', {}, '')].concat(names.map(function (n) { return h('th', {}, n); }))
        .concat([h('th', {}, 'Summe'), h('th', {}, 'Note SL-Bogen'), h('th', {}, 'Portfolio/mdl. Prüfung'), h('th', {}, 'SoLei-Note')]);
      var maxCells = [h('td.row-label', {}, 'maximal')].concat(maxes.map(function (m) {
        return h('td', {}, Calc.fmt(m, 1));
      })).concat([h('td', {}, '15'), h('td'), h('td'), h('td')]);
      var valCells = [h('td.row-label', {}, 'erreicht')].concat(names.map(function (n, ci) {
        var v = stat.averages[ci];
        var cl = prev ? devClass(v, prev.averages[ci]) : '';
        return h('td.val' + cl, {}, v == null ? '' : Calc.fmt(v, 1));
      }));
      var sumCl = prev && stat.rated > 0 && prev.rated > 0 ? devClass(stat.sum, prev.sum) : '';
      valCells.push(h('td.val' + sumCl, {}, stat.rated > 0 ? Calc.fmt(stat.sum, 1) : ''));
      valCells.push(h('td.val', {}, fmtG(r.slBogenQ[q - 1])));
      valCells.push(h('td.val', {}, fmtG(r.portfolioQ[q - 1])));
      valCells.push(h('td.val.strong', {}, fmtG(r.soleiQ[q - 1])));
      return h('div.report-block',
        h('h3', {}, q + '. Quartal'),
        h('div.table-scroll', {},
          h('table.report-table', h('tr', {}, headCells), h('tr', {}, maxCells), h('tr', {}, valCells)))
      );
    }

    function seriesBlock(title, weight, labels, grades1, grades2, sj) {
      var head = [h('th', {}, '')];
      var row = [h('td.row-label', {}, 'Noten')];
      [1, 2].forEach(function (hj) {
        labels.forEach(function (l, i) {
          head.push(h('th', {}, l + ' · ' + hj + '. HJ'));
          var v = (hj === 1 ? grades1 : grades2)[i];
          row.push(h('td.val', {}, fmtG(v)));
        });
      });
      head.push(h('th', {}, 'Vorläufige Jahresnote'));
      row.push(h('td.val.strong', {}, fmtG(sj)));
      return h('div.report-block',
        h('h3', {}, title + ' (Gewichtung ' + weight + ' %)'),
        h('div.table-scroll', {},
          h('table.report-table', h('tr', {}, head), h('tr', {}, row)))
      );
    }

    var obtLabels = [], kaLabels = [];
    for (var i = 0; i < nObt; i++) obtLabels.push('OBT' + (i + 1));
    for (var k = 0; k < nKa; k++) kaLabels.push('K' + (k + 1));

    return h('div.report',
      h('div.report-head',
        h('h2', {}, 'Notenübersicht'),
        h('p.print-sub', {},
          'Klasse: ' + cls.name + ' · Fach: ' + course.subject + ' · Schuljahr: ' + year.name),
        h('p.print-sub', {}, 'Name: ' + stu.lastName + ', ' + stu.firstName +
          ' · Stand: ' + UI.fmtDate(Store.todayISO()))
      ),
      h('h3.report-section', {}, 'Sonstige Leistungen (Gewichtung ' + w.sl + ' %)'),
      [1, 2, 3, 4].map(quarterBlock),
      h('p.report-line', {}, 'Vorläufige Jahresnote Sonstige Leistungen: ',
        h('strong', {}, fmtG(r.slSJ) || '–')),
      seriesBlock('Open Book Tests', w.obt, obtLabels, r.obtG[1], r.obtG[2], r.obtSJ),
      seriesBlock('Klausuren', w.ka, kaLabels, r.kaG[1], r.kaG[2], r.kaSJ),
      h('div.report-block',
        h('h3', {}, 'Vorläufige Gesamtnote (vorbehaltlich weiterer Noten und pädagogischer Entscheidungen)'),
        h('table.report-table',
          h('tr', {}, h('th', {}, '1. Halbjahr'), h('th', {}, '2. Halbjahr'), h('th', {}, 'Vorläufige Jahresnote'), h('th', {}, 'Tendenz')),
          h('tr', {},
            h('td.val', {}, fmtG(r.zHJ1)), h('td.val', {}, fmtG(r.zHJ2)),
            h('td.val.strong', {}, fmtG(r.zSJ)), h('td.val.tend-cell', {}, r.tendenz)))
      ),
      (r.zeugnisHJ != null || r.zeugnisJahr != null)
        ? h('div.zeugnis-box',
            h('h3.zeugnis-head', {}, 'Zeugnisnoten'),
            h('p.report-line.zeugnis-line', {}, 'Note HJ-Zeugnis: ', h('strong', {}, fmtG(r.zeugnisHJ) || '–'),
              '   ·   Note Jahreszeugnis: ', h('strong', {}, fmtG(r.zeugnisJahr) || '–')))
        : null
    );
  }

  /* ---------- Notenausdruck je Schüler/in (Blatt "Notenausdruck") ---------- */

  /* Ehemals eigene Seite „Notenausdruck" – seit v0.25.1 in die Schüler-
     Ansicht von „Notenübersicht & Zeugnisnoten" integriert. Die Route bleibt
     als Weiterleitung erhalten (alte History-Einträge, externe Verweise). */
  views.report = function (p) {
    var course = Store.courseById(p.id);
    if (course && p.studentId) {
      var students = Store.classById(course.classId).students.slice().sort(function (a, b) {
        return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName, 'de');
      });
      var si = students.findIndex(function (s) { return s.id === p.studentId; });
      gradesState.studentIdx = si > -1 ? si : 0;
    }
    gradesState.mode = 'student';
    return views.grades({ id: p.id });
  };

  /* ================= Unentschuldigte Fehlzeiten ================= */

  /* ================= Stundeninhalte ================= */

  /* Sitzungs-Zustand: Sortierung (aufsteigend = Standard) und ob die
     Hinweise eingeklappt wurden – bleibt während der Sitzung erhalten. */
  var lessonState = { desc: false, hintsCollapsed: false };

  views.lessonContents = function (p) {
    var course = Store.courseById(p.id);
    if (!course) return views.home({});
    var quarters = courseQuarters(course);
    var shownQ = p.quarter || course.currentQuarter;

    var qSel = h('select.input.q-select', { style: { maxWidth: '7.5rem' } });
    [1, 2, 3, 4].forEach(function (n) {
      qSel.appendChild(h('option', { value: n, selected: n === shownQ }, n + '. Quartal'));
    });
    qSel.addEventListener('change', function () {
      go('lessonContents', { id: course.id, quarter: Number(qSel.value) });
    });

    /* Kopfkarte: links die Quartalsauswahl, rechts der rahmenlose
       Hinweise-Umschalter; die Hinweise selbst klappen darunter auf. */
    function headCard() {
      var toggle = h('button.btn-plain.hints-toggle', {
        onclick: function () { lessonState.hintsCollapsed = !lessonState.hintsCollapsed; render(); },
        'aria-expanded': String(!lessonState.hintsCollapsed)
      }, 'Hinweise ', h('span.hints-arrow', {}, lessonState.hintsCollapsed ? '▸' : '▾'));

      var card = h('div.card.card-tight',
        h('div.row-between', qSel, toggle));
      if (lessonState.hintsCollapsed) return card;
      card.appendChild(h('div.hint-with-btn',
        h('p.hint', {}, 'In den Kurs-Einstellungen können Sie die Wochentage festlegen, an denen der Kurs stattfindet – die Liste zeigt dann nur diese Termine.'),
        h('button.btn-small.btn-plain', { onclick: function () { go('editCourse', { id: course.id }); } },
          'Zu den Kurs-Einstellungen')));
      card.appendChild(h('div.hint-with-btn',
        h('p.hint', {}, 'Notizen zu einzelnen Schüler/innen erfassen Sie auf der Seite „SoLei-Punkte vergeben“.'),
        h('button.btn-small.btn-plain', { onclick: function () {
          captureState.mode = 'student';
          captureState.kbActive = null; captureState.kbBuffer = '';
          go('capture', { id: course.id });
        } }, 'Zu „SoLei-Punkte vergeben“')));
      return card;
    }

    /* Termine des Quartals: nur Unterrichtstage laut Kurs-Einstellungen
       (segmentgenau je Datum); ohne Konfiguration alle Tage außer Sonntag.
       Termine mit vorhandenem Eintrag bleiben immer sichtbar. */
    var qq = quarters[shownQ - 1];
    var days = weekdaysBetween(qq.start, qq.end).filter(function (iso) {
      var td = Store.teachingDaysFor(course, iso);
      if (td === null) return true;
      return td.indexOf(new Date(iso + 'T12:00:00').getDay()) > -1;
    });
    Store.lessonContentsFor(course.id).forEach(function (e) {
      if (e.date >= qq.start && e.date <= qq.end && days.indexOf(e.date) === -1) days.push(e.date);
    });
    days.sort();
    if (lessonState.desc) days.reverse();

    var WD_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    var today = Store.todayISO();

    function dayRow(iso) {
      var entry = Store.lessonContentFor(course.id, iso);
      var ta = h('textarea.input.lesson-ta', { rows: 1, placeholder: '–' }, entry ? entry.text : '');
      ta.addEventListener('blur', function () {
        var before = entry ? entry.text : '';
        if (ta.value.trim() === before) return;
        Store.setLessonContent(course.id, iso, ta.value);
      });
      var wd = WD_SHORT[new Date(iso + 'T12:00:00').getDay()];
      /* Kurzform „Mo, 02.09.27“ – passt auf Smartphones in eine Zeile. */
      var short = iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.' + iso.slice(2, 4);
      return h('div.lesson-row' + (iso === today ? '.today' : ''),
        h('span.lesson-date', {}, wd + ', ' + short),
        ta);
    }

    var sortBtn = h('button.icon-btn.sort-btn', {
      onclick: function () { lessonState.desc = !lessonState.desc; render(); },
      'aria-label': lessonState.desc ? 'Aufsteigend sortieren' : 'Absteigend sortieren'
    }, lessonState.desc ? '↓' : '↑');

    return h('div.screen',
      header('Stundeninhalte', { name: 'course', params: { id: course.id } }),
      courseBox(course),
      headCard(),
      h('div.card.card-tight',
        h('div.lesson-row.lesson-head',
          h('span.lesson-date', {}, 'Termin ', sortBtn),
          h('span.lesson-head-label', {}, 'Unterrichtsinhalt')),
        days.length
          ? days.map(dayRow)
          : h('p.hint', {}, 'Im ' + shownQ + '. Quartal liegt laut den hinterlegten Unterrichtstagen kein Kurstag.')
      )
    );
  };

  views.absences = function (p) {
    var course = Store.courseById(p.id);
    var cls = Store.classById(course.classId);
    var quarters = courseQuarters(course);
    var students = cls.students.slice().sort(function (a, b) {
      return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName, 'de');
    });
    var shownQ = p.quarter || course.currentQuarter;
    var mode = p.view === 'date' ? 'date' : 'student';

    var qSel = h('select.input.q-select', { style: { maxWidth: '7.5rem' } });
    [1, 2, 3, 4].forEach(function (n) {
      qSel.appendChild(h('option', { value: n, selected: n === shownQ }, n + '. Quartal'));
    });
    qSel.addEventListener('change', function () {
      go('absences', { id: course.id, quarter: Number(qSel.value), date: dateInput.value, view: mode });
    });

    var dateInput = h('input.input.date-inline', { type: 'date', value: p.date || Store.todayISO() });

    var viewToggle = h('div.view-toggle',
      h('button.view-btn' + (mode === 'date' ? '.active' : ''), {
        onclick: function () { if (mode !== 'date') go('absences', { id: course.id, quarter: shownQ, view: 'date' }); }
      }, 'Ansicht: Datum'),
      h('button.view-btn' + (mode === 'student' ? '.active' : ''), {
        onclick: function () { if (mode !== 'student') go('absences', { id: course.id, quarter: shownQ, view: 'student' }); }
      }, 'Ansicht: Schüler/in')
    );

    function addFor(stu) {
      var d = dateInput.value;
      if (!d) { toast('Bitte zuerst ein Datum wählen.'); return; }
      var quarter = Quarters.quarterForDate(d, quarters);
      var a = Store.addAbsence(course.id, stu.id, d, quarter);
      if (!a) {
        toast('Für ' + stu.lastName + ' ist am ' + UI.fmtDate(d) + ' bereits eine Fehlzeit erfasst.');
        return;
      }
      /* Hinweis (kein Blockieren): Ausnahmen wie Vertretung/Exkursion bleiben erfassbar. */
      var td = Store.teachingDaysFor(course, d);
      var offDay = td !== null && td.indexOf(new Date(d + 'T12:00:00').getDay()) === -1;
      toast(stu.lastName + ': Fehlzeit am ' + UI.fmtDate(d) + ' erfasst – 0 Punkte in allen Kriterien (' +
        quarter + '. Quartal).' +
        (offDay ? ' Hinweis: Laut Unterrichtstagen ist dies kein Kurstag.' : ''),
        function () { Store.removeAbsence(a.id); render(); });
      if (quarter !== shownQ) {
        go('absences', { id: course.id, quarter: quarter, date: d, view: mode });
      } else render();
    }

    function removeAbs(a, stu) {
      UI.confirmDialog('Fehlzeit löschen?',
        stu.lastName + ', ' + stu.firstName + ' – ' + UI.fmtDate(a.date) +
        ': Die Fehlzeit und die damit verbundenen 0-Punkte-Vergaben werden entfernt.',
        'Löschen', true).then(function (ok) {
          if (!ok) return;
          Store.removeAbsence(a.id);
          toast('Fehlzeit gelöscht.');
          render();
        });
    }

    return h('div.screen',
      header('Unentschuldigte Fehlzeiten', { name: 'course', params: { id: course.id } },
        h('span')),
      courseBox(course),
      h('div.capture-bar', qSel, viewToggle),
      mode === 'student' ? studentView() : dateView()
    );

    /* ---- Ansicht: Datum (bisher) ---- */
    function dateView() {
      var total = 0;
      var rows = students.map(function (stu) {
        var abs = Store.absencesFor(course.id, stu.id, shownQ);
        total += abs.length;
        return h('div.abs-row',
          h('div.abs-head',
            h('div.student-name', {}, stu.lastName + ', ' + stu.firstName,
              abs.length ? h('span.abs-count', {}, abs.length) : null),
            h('button.btn-small.btn-plain', { onclick: function () { addFor(stu); } }, '+ Fehlzeit')
          ),
          abs.length ? h('div.abs-chips', {}, abs.map(function (a) {
            return h('span.abs-chip', {}, UI.fmtDate(a.date),
              h('button.abs-x', { onclick: function () { removeAbs(a, stu); }, 'aria-label': 'Fehlzeit löschen' }, '×'));
          })) : null
        );
      });
      return h('div',
        h('div.card.card-tight',
          h('label.hint', {}, 'Datum wählen: ', dateInput),
          h('p.hint', {}, '„+ Fehlzeit“ erfasst für das gewählte Datum eine unentschuldigte Fehlzeit – ' +
            'die App vergibt dann automatisch 0 Punkte in allen fünf SoLei-Kriterien dieses Tages. ' +
            'Das Quartal ergibt sich aus dem Datum. Löschen entfernt auch die 0-Punkte-Vergaben wieder.')
        ),
        h('div.section-head.section-head-spaced', {}, 'Fehlzeiten im ' + shownQ + '. Quartal (' + total + ')'),
        h('div.card.card-list', {},
          students.length ? rows : h('div.empty', h('p', {}, 'Diese Klasse hat noch keine Schüler/innen.')))
      );
    }

    /* ---- Ansicht: Schüler/in (Unterrichtstage des Quartals als Chips) ---- */
    function studentView() {
      var qq = quarters[shownQ - 1];
      var allDays = weekdaysBetween(qq.start, qq.end); /* alle Tage außer Sonntag */
      /* Sind Unterrichtstage konfiguriert, gilt je Datum das dort gültige
         Segment – ein Stundenplanwechsel mitten im Quartal bildet sich so
         von selbst ab. Ohne Konfiguration (null) bleibt alles wie bisher. */
      var tdConfigured = false;
      var days = allDays.filter(function (iso) {
        var td = Store.teachingDaysFor(course, iso);
        if (td === null) return true;
        tdConfigured = true;
        return td.indexOf(new Date(iso + 'T12:00:00').getDay()) > -1;
      });

      if (!allDays.length) {
        return h('div.card', h('p.hint', {}, 'Für das ' + shownQ + '. Quartal ist kein gültiger Zeitraum hinterlegt. ' +
          'Bitte prüfen Sie die Quartalszeiträume in den Kurs-Einstellungen.'));
      }
      if (!days.length) {
        return h('div.card', h('p.hint', {}, 'Im ' + shownQ + '. Quartal liegt laut den hinterlegten Unterrichtstagen kein Kurstag. ' +
          'Bitte prüfen Sie die Unterrichtstage in den Kurs-Einstellungen.'));
      }

      var blocks = students.map(function (stu) {
        var absSet = {};
        Store.absencesFor(course.id, stu.id, shownQ).forEach(function (a) { absSet[a.date] = a.id; });
        var count = Object.keys(absSet).length;

        /* Erfasste Fehlzeiten dürfen nie unsichtbar werden – auch wenn ihr
           Datum (z. B. nach einer rückwirkenden Stundenplanänderung oder
           einer Ausnahme aus der Datums-Ansicht) kein Unterrichtstag ist. */
        var stuDays = days;
        if (tdConfigured) {
          var extra = Object.keys(absSet).filter(function (d) { return days.indexOf(d) === -1; });
          if (extra.length) stuDays = days.concat(extra).sort();
        }

        var chips = stuDays.map(function (iso) {
          var isAbsent = !!absSet[iso];
          var d = iso.split('-');
          var label = d[2] + '.' + d[1] + '.';
          return h('button.day-chip' + (isAbsent ? '.absent' : ''), {
            onclick: function () {
              if (absSet[iso]) {
                Store.removeAbsence(absSet[iso]);
                render();
              } else {
                var quarter = Quarters.quarterForDate(iso, quarters);
                Store.addAbsence(course.id, stu.id, iso, quarter);
                render();
              }
            }
          }, label);
        });

        return h('div.abs-student-block',
          h('div.abs-head',
            h('div.student-name', {}, stu.lastName + ', ' + stu.firstName,
              count ? h('span.abs-count', {}, count) : null)),
          h('div.day-chip-grid', {}, chips)
        );
      });

      return h('div',
        h('div.card.card-tight',
          h('p.hint', {}, 'Tippen Sie die Tage an, an denen die Person unentschuldigt gefehlt hat ' +
            (tdConfigured
              ? '(angezeigt werden die in den Kurs-Einstellungen hinterlegten Unterrichtstage). '
              : '(Sonntage sind ausgelassen). ') +
            'Ein markierter Tag vergibt automatisch 0 Punkte in allen fünf ' +
            'SoLei-Kriterien; erneutes Antippen entfernt die Fehlzeit wieder.')
        ),
        h('div.section-head.section-head-spaced', {}, shownQ + '. Quartal · ' + UI.fmtDate(qq.start) + ' – ' + UI.fmtDate(qq.end)),
        students.length ? blocks : h('div.empty', h('p', {}, 'Diese Klasse hat noch keine Schüler/innen.'))
      );
    }
  };

  /* Alle Tage zwischen zwei ISO-Daten außer Sonntag, als ISO-Strings. */
  function weekdaysBetween(startISO, endISO) {
    var out = [];
    if (!startISO || !endISO) return out;
    var d = new Date(startISO + 'T12:00:00');
    var end = new Date(endISO + 'T12:00:00');
    if (isNaN(d) || isNaN(end) || d > end) return out;
    var guard = 0;
    while (d <= end && guard < 400) {
      if (d.getDay() !== 0) { /* 0 = Sonntag */
        out.push(d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0'));
      }
      d.setDate(d.getDate() + 1);
      guard++;
    }
    return out;
  }

  /* ================= Quartalszeiträume je Kurs ================= */

  views.quarterDates = function (p) {
    var course = Store.courseById(p.id);
    var year = Store.yearById(course.yearId);
    var qs = JSON.parse(JSON.stringify(courseQuarters(course)));
    var inputs = [];

    var rows = qs.map(function (qq, i) {
      var s = h('input.input', { type: 'date', value: qq.start || '' });
      var e = h('input.input', { type: 'date', value: qq.end || '' });
      inputs.push([s, e]);
      return h('div.field-row',
        h('label.field', h('span.field-label', {}, (i + 1) + '. Quartal – Beginn'), s),
        h('label.field', h('span.field-label', {}, 'Ende'), e)
      );
    });

    return h('div.screen',
      header('Quartalszeiträume', p.from === 'editCourse'
        ? { name: 'editCourse', params: { id: course.id } }
        : { name: 'course', params: { id: course.id } }),
      courseBox(course),
      h('div.card',
        h('p.hint', {}, 'Vorgeschlagen aus dem Schuljahresplan (' + year.name + ', je 10 Schulwochen ohne Ferien). Anpassungen gelten nur für diesen Kurs.'),
        rows,
        h('div.actions-col',
          h('button.btn-primary.btn-block', { onclick: save }, 'Speichern'),
          h('button.btn-plain.btn-block', { onclick: function () {
            course.quarterOverrides = null; Store.save();
            toast('Zurückgesetzt auf den Schuljahresplan.');
            go('course', { id: course.id });
          } }, 'Auf Schuljahresplan zurücksetzen')
        )
      )
    );
    function save() {
      course.quarterOverrides = inputs.map(function (pair) {
        return { start: pair[0].value, end: pair[1].value };
      });
      Store.save();
      go('course', { id: course.id });
    }
  };

  /* ================= Schülerliste ================= */

  views.students = function (p) {
    var cls = Store.classById(p.classId);
    var back = p.from === 'editCourse' && p.courseId
      ? { name: 'editCourse', params: { id: p.courseId } }
      : (p.courseId ? { name: 'course', params: { id: p.courseId } } : { name: 'home' });

    var list = cls.students
      .slice()
      .sort(function (a, b) { return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName, 'de'); })
      .map(function (stu) {
        return h('div.student-row', {},
          h('div.student-name', {}, stu.lastName + ', ' + stu.firstName,
            stu.company ? h('span.hint.block', {}, stu.company) : null),
          h('div.row-gap',
            h('button.btn-small.btn-plain', { onclick: function () { editStudent(stu); } }, 'Bearbeiten'),
            h('button.btn-small.btn-plain.danger-text', { onclick: function () { delStudent(stu); } }, 'Löschen')
          )
        );
      });

    return h('div.screen',
      header('Schülerliste · ' + cls.name, back),
      h('div.card.card-list', {}, list.length ? list : h('div.empty', h('p', {}, 'Noch keine Schüler/innen.'))),
      h('div.actions-col',
        h('button.btn-primary.btn-block', { onclick: function () { editStudent(null); } }, '+ Schüler/in hinzufügen'),
        h('button.btn-primary.btn-block', { onclick: importStudents }, 'Aus Excel einfügen (Kopieren & Einfügen)'),
        cls.students.length
          ? h('button.btn-plain.btn-block', { onclick: function () {
              /* Spaltenreihenfolge wie beim Import („Aus Excel einfügen“),
                 damit kopierte Listen unverändert wieder einlesbar sind. */
              var rows = [['Nachname', 'Vorname', 'Telefon Schüler/in', 'E-Mail Schüler/in',
                'Ausbildungsbetrieb', 'Ausbilder/in bzw. Eltern',
                'Telefon Ausbilder/Eltern', 'E-Mail Ausbilder/Eltern']];
              cls.students.slice().sort(function (a, b) {
                return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName, 'de');
              }).forEach(function (stu) {
                rows.push([stu.lastName || '', stu.firstName || '', stu.phone || '', stu.email || '',
                  stu.company || '', stu.trainerName || '', stu.trainerPhone || '', stu.trainerEmail || '']);
              });
              copyRowsToClipboard(rows, 'Schülerliste');
            } }, 'In die Zwischenablage kopieren')
          : null,
        cls.students.length ? exportWarning() : null
      )
    );

    function editStudent(stu) {
      var fields = [
        ['lastName', 'Nachname *'], ['firstName', 'Vorname *'],
        ['phone', 'Telefon Schüler/in'], ['email', 'E-Mail Schüler/in'],
        ['company', 'Ausbildungsbetrieb'], ['trainerName', 'Ausbilder/in bzw. Eltern'],
        ['trainerPhone', 'Telefon Ausbilder/Eltern'], ['trainerEmail', 'E-Mail Ausbilder/Eltern']
      ];
      var inputs = {};
      var body = fields.map(function (f) {
        inputs[f[0]] = h('input.input', { type: 'text', value: (stu && stu[f[0]]) || '' });
        return h('label.field', h('span.field-label', {}, f[1]), inputs[f[0]]);
      });
      UI.modal(stu ? 'Schüler/in bearbeiten' : 'Schüler/in hinzufügen', body, [
        { label: 'Abbrechen', value: false },
        { label: 'Speichern', value: true, primary: true,
          validate: function () { return inputs.lastName.value.trim() && inputs.firstName.value.trim(); } }
      ]).then(function (ok) {
        if (!ok) return;
        if (!stu) { stu = { id: Store.uid() }; cls.students.push(stu); }
        fields.forEach(function (f) { stu[f[0]] = inputs[f[0]].value.trim(); });
        Store.save();
        render();
      });
    }

    function delStudent(stu) {
      UI.confirmDialog('Schüler/in löschen?',
        stu.lastName + ', ' + stu.firstName + ' wird aus der Klasse entfernt. ' +
        'Alle bereits vergebenen Punkte dieser Person werden in sämtlichen Kursen der Klasse gelöscht.',
        'Löschen', true).then(function (ok) {
          if (!ok) return;
          cls.students = cls.students.filter(function (s) { return s.id !== stu.id; });
          var st = S();
          st.soleiEntries = st.soleiEntries.filter(function (e) { return e.studentId !== stu.id; });
          st.absences = (st.absences || []).filter(function (a) { return a.studentId !== stu.id; });
          st.uploadTallies = (st.uploadTallies || []).filter(function (t) { return t.studentId !== stu.id; });
          /* Sitzplatz-Positionen in allen Kursen dieser Klasse entfernen */
          st.courses.forEach(function (co) {
            (co.seatings || []).forEach(function (sp) {
              if (sp.positions) delete sp.positions[stu.id];
            });
          });
          Store.deletePhoto(stu.id);
          delete photoCache[stu.id];
          Store.save();
          render();
        });
    }

    function importStudents() {
      var ta = h('textarea.input.import-area', {
        placeholder: 'In Excel die Zeilen markieren, kopieren (Strg+C) und hier einfügen (Strg+V) …',
        rows: 8
      });
      UI.modal('Schülerliste aus Excel einfügen', [
        h('p.hint', {}, 'Erwartete Spaltenreihenfolge: Nachname · Vorname · Telefon · E-Mail · Ausbildungsbetrieb · Ausbilder/Eltern · Telefon (Ausbilder/Eltern) · E-Mail (Ausbilder/Eltern). Nachname und Vorname genügen; weitere Spalten dürfen fehlen.'),
        ta
      ], [
        { label: 'Abbrechen', value: false },
        { label: 'Vorschau anzeigen', value: true, primary: true }
      ]).then(function (ok) {
        if (!ok) return;
        var rows = parsePaste(ta.value);
        if (rows.length === 0) { toast('Es wurden keine Zeilen erkannt.'); return; }
        previewImport(rows);
      });
    }

    function parsePaste(text) {
      var sep = text.indexOf('\t') >= 0 ? '\t' : ';';
      return text.split(/\r?\n/).map(function (line) {
        return line.split(sep).map(function (c) { return c.trim(); });
      }).filter(function (cols) {
        if (!cols[0] || !cols[1]) return false;
        var head = (cols[0] + cols[1]).toLowerCase();
        return head.indexOf('nachname') === -1; /* Kopfzeile überspringen */
      });
    }

    function previewImport(rows) {
      var table = h('table.preview-table',
        h('tr', {}, ['Nachname', 'Vorname', 'Betrieb'].map(function (t) { return h('th', {}, t); })),
        rows.slice(0, 30).map(function (r) {
          return h('tr', {}, h('td', {}, r[0]), h('td', {}, r[1]), h('td', {}, r[4] || ''));
        })
      );
      UI.modal(rows.length + ' Schüler/innen erkannt',
        [table, rows.length > 30 ? h('p.hint', {}, '… und ' + (rows.length - 30) + ' weitere.') : null],
        [
          { label: 'Abbrechen', value: false },
          { label: 'Alle übernehmen', value: true, primary: true }
        ]).then(function (ok) {
          if (!ok) return;
          rows.forEach(function (r) {
            cls.students.push({
              id: Store.uid(), lastName: r[0], firstName: r[1],
              phone: r[2] || '', email: r[3] || '', company: r[4] || '',
              trainerName: r[5] || '', trainerPhone: r[6] || '', trainerEmail: r[7] || ''
            });
          });
          Store.save();
          toast(rows.length + ' Schüler/innen übernommen.');
          render();
        });
    }
  };

  /* ================= SoLei-Erfassung (Herzstück) ================= */

  var captureState = { mode: 'criterion', criterion: 0, studentIdx: 0, date: null,
    kbActive: null, kbBuffer: '', kbTimer: null, kbCourse: null, noteOpen: null };

  /* Tastatur-Erfassung (PC/Mac): globaler Listener, aktiv nur auf der Erfassungsseite.
     Der eigentliche Handler wird bei jedem Aufbau der Seite frisch gesetzt (Closures). */
  var captureKeyHandler = null;
  document.addEventListener('keydown', function (ev) {
    if (route && route.name === 'capture' && typeof captureKeyHandler === 'function') {
      captureKeyHandler(ev);
    }
  });

  views.capture = function (p) {
    var course = Store.courseById(p.id);
    var cls = Store.classById(course.classId);
    var names = S().settings.criteriaNames;
    var quarters = courseQuarters(course);
    /* Schuljahresgrenzen: Anfang Q1 bis Ende Q4 – Einträge außerhalb sind nicht
       zuordenbar und werden per min/max am Datumsfeld verhindert. */
    var yearStart = (quarters[0] && quarters[0].start) || null;
    var yearEnd = (quarters[3] && quarters[3].end) || null;
    if (!captureState.date) captureState.date = Store.todayISO();
    /* Datum in das Schuljahr klemmen (z. B. wenn „heute“ nach Schuljahresende liegt). */
    if (yearEnd && captureState.date > yearEnd) captureState.date = yearEnd;
    if (yearStart && captureState.date < yearStart) captureState.date = yearStart;
    /* Das Quartal ergibt sich AUS dem gewählten Datum, nicht aus course.currentQuarter. */
    var q = Quarters.quarterForDate(captureState.date, quarters);
    if (captureState.kbCourse !== course.id) {
      captureState.kbCourse = course.id;
      captureState.kbActive = null; captureState.kbBuffer = '';
    }
    var students = cls.students.slice().sort(function (a, b) {
      return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName, 'de');
    });

    if (students.length === 0) {
      captureKeyHandler = null;
      return h('div.screen',
        header('SoLei-Punkte', { name: 'course', params: { id: course.id } }),
        courseBox(course),
        h('div.empty', h('p', {}, 'Diese Klasse hat noch keine Schüler/innen.'),
          h('button.btn-primary', { onclick: function () { go('students', { classId: cls.id, courseId: course.id }); } },
            'Schülerliste öffnen'))
      );
    }

    var dateProps = { type: 'date', value: captureState.date };
    if (yearStart) dateProps.min = yearStart;
    if (yearEnd) dateProps.max = yearEnd;
    var dateInput = h('input.input.date-inline', dateProps);
    dateInput.addEventListener('change', function () {
      var v = dateInput.value;
      if (!v) { dateInput.value = captureState.date; return; }
      if (yearEnd && v > yearEnd) {
        v = yearEnd; dateInput.value = v;
        toast('Das Datum wurde auf das Schuljahresende (' + UI.fmtDate(yearEnd) + ') begrenzt.');
      } else if (yearStart && v < yearStart) {
        v = yearStart; dateInput.value = v;
        toast('Das Datum wurde auf den Schuljahresbeginn (' + UI.fmtDate(yearStart) + ') begrenzt.');
      }
      captureState.date = v;
      captureState.kbActive = null; captureState.kbBuffer = '';
      render(); /* Quartal, Titel und Punktestände an das neue Datum anpassen */
    });

    var viewToggle = h('div.view-toggle',
      h('button.view-btn' + (captureState.mode === 'criterion' ? '.active' : ''), {
        onclick: function () { if (captureState.mode !== 'criterion') { captureState.mode = 'criterion'; captureState.kbActive = null; captureState.kbBuffer = ''; render(); } }
      }, 'Ansicht: Kriterium'),
      h('button.view-btn' + (captureState.mode === 'student' ? '.active' : ''), {
        onclick: function () { if (captureState.mode !== 'student') { captureState.mode = 'student'; captureState.kbActive = null; captureState.kbBuffer = ''; render(); } }
      }, 'Ansicht: Schüler/in')
    );

    var body = captureState.mode === 'criterion'
      ? criterionMode()
      : studentMode();

    var backTarget = p.from === 'seating'
      ? { name: 'seating', params: { id: course.id, tab: 'plan', mode: 'grade' } }
      : { name: 'course', params: { id: course.id } };

    captureKeyHandler = kbHandler;
    if (captureState.kbActive != null) {
      requestAnimationFrame(function () {
        var el = document.querySelector('.tap-row.key-active');
        if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
      });
    }

    return h('div.screen.screen-capture',
      header('SoLei-Punkte vergeben: ' + q + '. Quartal', backTarget,
        h('span')),
      courseBox(course),
      h('p.hint.capture-qnote', {},
        'Das Quartal ergibt sich aus dem gewählten Datum (' +
        UI.fmtDate(quarters[q - 1].start) + ' – ' + UI.fmtDate(quarters[q - 1].end) + ').'),
      h('div.capture-bar',
        h('label.date-field', {}, dateInput),
        viewToggle
      ),
      body
    );

    /* --- Kriterium-Modus: ein Kriterium, alle Schüler --- */
    function criterionMode() {
      var ci = captureState.criterion;
      var max = course.maxPoints[q][ci];
      var taps = Calc.tapValues(max);

      var tabs = h('div.crit-tabs', {}, names.map(function (n, i) {
        return h('button.crit-tab' + (i === ci ? '.active' : ''), {
          onclick: function () { captureState.criterion = i; render(); }
        }, n);
      }));

      var rows = students.map(function (stu, rowIdx) {
        var e = Store.entriesFor(course.id, stu.id, q);
        var stat = Calc.quarterStatus(e.byCriterion);
        var grade = Calc.gradeFor15(stat.sum, S().settings.grading15);
        var todays = e.list.filter(function (x) {
          return x.criterion === ci && x.date === captureState.date;
        });
        var lastToday = todays.length ? todays[todays.length - 1] : null;

        /* Kursnotiz zum gewählten Datum: Symbol unter dem Foto, Feld darunter. */
        var note = Store.noteFor(course.id, stu.id, captureState.date);
        var noteOpen = captureState.noteOpen === stu.id;
        var noteBtn = h('button.note-btn' + (note ? '.has-note' : '') + (noteOpen ? '.open' : ''), {
          'aria-label': 'Kursnotiz zu ' + stu.lastName + ', ' + stu.firstName,
          title: 'Kursnotiz (' + UI.fmtDate(captureState.date) + ')',
          html: NOTE_SVG,
          onclick: function () {
            captureState.noteOpen = noteOpen ? null : stu.id;
            render();
          }
        });
        var notePanel = null;
        if (noteOpen) {
          var ta = h('textarea.input.note-area', {
            placeholder: 'Kursnotiz für den ' + UI.fmtDate(captureState.date) + ' …', autofocus: true
          });
          ta.value = note ? note.text : '';
          ta.addEventListener('blur', function () {
            Store.setNote(course.id, stu.id, captureState.date, ta.value);
            noteBtn.classList.toggle('has-note', !!ta.value.trim());
          });
          notePanel = h('div.note-panel', {}, ta);
        }

        var row = h('div.tap-row' + (captureState.kbActive === rowIdx ? '.key-active' : ''),
          h('div.avatar-col',
            photoTile(stu, { small: true }),
            noteBtn),
          h('div.tap-info',
            h('div.student-name', {}, stu.lastName + ', ' + stu.firstName),
            h('div.tap-substats',
              h('span.sum-pill.small', {}, Calc.fmt(stat.sum, 1) + '/15'),
              stat.rated > 0 ? h('span.grade-pill.small.g' + Math.round(grade.g), {}, Calc.fmt(grade.g)) : null,
              stat.averages[ci] !== null ? h('span.hint', {}, 'ø ' + Calc.fmt(stat.averages[ci], 1)) : null
            )
          ),
          h('div.tap-btns', {}, taps.map(function (v) {
            var isSet = lastToday && lastToday.points === v;
            return h('button.tap-btn' + (isSet ? '.set' : ''), {
              onclick: function () { tap(stu, ci, v, lastToday); }
            }, Calc.fmt(v, 1));
          }))
        );
        return h('div.note-wrap', {}, row, notePanel);
      });

      return h('div.capture-body',
        tabs,
        h('div.crit-nav',
          h('button.icon-btn', { onclick: function () { captureState.criterion = (ci + 4) % 5; render(); } }, '‹'),
          h('span.crit-current', {}, names[ci], h('span.hint.block', {}, 'max. ' + Calc.fmt(max, 1) + ' Punkte')),
          h('button.icon-btn', { onclick: function () { captureState.criterion = (ci + 1) % 5; render(); } }, '›')
        ),
        h('div.card.card-list', {}, rows)
      );
    }

    /* --- Schüler-Modus: ein Schüler, alle Kriterien --- */
    function studentMode() {
      var si = Math.min(captureState.studentIdx, students.length - 1);
      var stu = students[si];
      var e = Store.entriesFor(course.id, stu.id, q);
      var stat = Calc.quarterStatus(e.byCriterion);
      var grade = Calc.gradeFor15(stat.sum, S().settings.grading15);

      var rows = names.map(function (n, ci) {
        var max = course.maxPoints[q][ci];
        var taps = Calc.tapValues(max);
        var todays = e.list.filter(function (x) { return x.criterion === ci && x.date === captureState.date; });
        var lastToday = todays.length ? todays[todays.length - 1] : null;
        return h('div.tap-row' + (captureState.kbActive === ci ? '.key-active' : ''),
          h('div.tap-info',
            h('div.student-name', {}, n),
            stat.averages[ci] !== null ? h('span.hint', {}, 'ø ' + Calc.fmt(stat.averages[ci], 1)) : h('span.hint', {}, '–')
          ),
          h('div.tap-btns', {}, taps.map(function (v) {
            var isSet = lastToday && lastToday.points === v;
            return h('button.tap-btn' + (isSet ? '.set' : ''), {
              onclick: function () { tap(stu, ci, v, lastToday); }
            }, Calc.fmt(v, 1));
          }))
        );
      });

      /* Kursnotiz: in der Schüleransicht direkt als volles Feld (mehr Platz). */
      var note = Store.noteFor(course.id, stu.id, captureState.date);
      var noteTa = h('textarea.input.note-area', {
        placeholder: 'Kursnotiz für den ' + UI.fmtDate(captureState.date) + ' …'
      });
      noteTa.value = note ? note.text : '';
      noteTa.addEventListener('blur', function () {
        Store.setNote(course.id, stu.id, captureState.date, noteTa.value);
      });

      return h('div.capture-body',
        h('div.crit-nav',
          h('button.icon-btn', { onclick: function () { captureState.studentIdx = (si + students.length - 1) % students.length; render(); } }, '‹'),
          h('div.student-head',
            photoTile(stu, { small: true }),
            h('span.crit-current', {}, stu.lastName + ', ' + stu.firstName,
              h('span.hint.block', {},
                Calc.fmt(stat.sum, 1) + ' / 15' + (stat.rated > 0 ? ' · Note ' + Calc.fmt(grade.g) : '')))
          ),
          h('button.icon-btn', { onclick: function () { captureState.studentIdx = (si + 1) % students.length; render(); } }, '›')
        ),
        h('div.card.card-list', {}, rows),
        h('div.card.card-tight',
          h('label.field',
            h('span.field-label', {}, 'Kursnotiz (' + UI.fmtDate(captureState.date) + ')'),
            noteTa))
      );
    }

    /* Punktevergabe: pro Kriterium und Tag gilt der letzte Tipp (Korrektur statt Doppelvergabe). */
    function tap(stu, ci, points, lastToday) {
      if (lastToday) {
        if (lastToday.points === points) {
          Store.deleteEntry(lastToday.id);
          toast('Vergabe entfernt (' + stu.lastName + ', ' + names[ci] + ').');
          render();
          return;
        }
        Store.updateEntry(lastToday.id, points, captureState.date);
        toast(stu.lastName + ': ' + names[ci] + ' geändert auf ' + Calc.fmt(points, 1) + ' Punkte.');
        render();
        return;
      }
      var entry = Store.addEntry(course.id, stu.id, q, ci, points, captureState.date);
      toast(stu.lastName + ': ' + Calc.fmt(points, 1) + ' Punkte für ' + names[ci] + '.', function () {
        Store.deleteEntry(entry.id);
        render();
      });
      render();
    }

    /* ---------- Tastatur-Erfassung (PC/Mac) ----------
       Ziffern vergeben Punkte an die aktive Zeile; Enter/Pfeile bewegen die Markierung
       (kein automatisches Weiterspringen nach einer Ziffer). Mehrdeutige Eingaben
       (nur bei Stufen 1,5/1/0,5/0) werden durch die nächste Taste, Enter/Pfeil oder
       nach 600 ms aufgelöst. Ungültige Eingaben blinken kurz rot. */

    function kbItemsCount() {
      return captureState.mode === 'criterion' ? students.length : names.length;
    }
    function kbAllowedValues() {
      var ci = captureState.mode === 'criterion' ? captureState.criterion : captureState.kbActive;
      if (ci == null) return [];
      return Calc.tapValues(course.maxPoints[q][ci]);
    }
    function kbTarget() {
      if (captureState.mode === 'criterion') {
        return { stu: students[captureState.kbActive], ci: captureState.criterion };
      }
      return { stu: students[Math.min(captureState.studentIdx, students.length - 1)], ci: captureState.kbActive };
    }
    function canonOf(v) { return Calc.fmt(v, 1).replace(/[^0-9]/g, ''); }
    function kbCanonBuf(buf) {
      var b = buf.charAt(0) === ',' ? '0' + buf : buf;
      return b.replace(/[^0-9]/g, '');
    }
    function kbClearTimer() {
      if (captureState.kbTimer) { clearTimeout(captureState.kbTimer); captureState.kbTimer = null; }
    }
    function kbClearBuffer() { captureState.kbBuffer = ''; kbClearTimer(); }

    /* Punkte setzen: wie tap(), aber ohne Umschalt-Löschen – Tastatur bedeutet „setzen". */
    function kbSet(points) {
      var t = kbTarget();
      if (!t.stu || t.ci == null) return;
      var e = Store.entriesFor(course.id, t.stu.id, q);
      var todays = e.list.filter(function (x) { return x.criterion === t.ci && x.date === captureState.date; });
      var lastToday = todays.length ? todays[todays.length - 1] : null;
      if (lastToday && lastToday.points === points) return; /* unverändert */
      if (lastToday) {
        Store.updateEntry(lastToday.id, points, captureState.date);
        toast(t.stu.lastName + ': ' + names[t.ci] + ' geändert auf ' + Calc.fmt(points, 1) + ' Punkte.');
        render();
        return;
      }
      var entry = Store.addEntry(course.id, t.stu.id, q, t.ci, points, captureState.date);
      toast(t.stu.lastName + ': ' + Calc.fmt(points, 1) + ' Punkte für ' + names[t.ci] + '.', function () {
        Store.deleteEntry(entry.id); render();
      });
      render();
    }

    function kbCommitPending() {
      if (!captureState.kbBuffer) return;
      var buf = captureState.kbBuffer;
      var canon = kbCanonBuf(buf);
      kbClearBuffer();
      var allowed = kbAllowedValues();
      var exact = null;
      allowed.forEach(function (v) { if (canonOf(v) === canon) exact = v; });
      if (/,$/.test(buf)) {
        /* Komma am Ende: der Nutzer wollte den längeren Wert (z. B. „1," -> 1,5) */
        var longer = allowed.filter(function (v) {
          return canonOf(v).indexOf(canon) === 0 && canonOf(v).length > canon.length;
        });
        if (longer.length === 1) { kbSet(longer[0]); return; }
      }
      if (exact != null) kbSet(exact);
    }

    function kbFlashInvalid() {
      var el = document.querySelector('.tap-row.key-active');
      if (!el) return;
      el.classList.add('key-invalid');
      setTimeout(function () { el.classList.remove('key-invalid'); }, 450);
    }

    function kbMove(dir) {
      var n = kbItemsCount();
      if (!n) return;
      if (captureState.kbActive == null) captureState.kbActive = 0;
      else captureState.kbActive = Math.max(0, Math.min(n - 1, captureState.kbActive + dir));
      render();
    }

    function kbArmTimer(commitValue) {
      kbClearTimer();
      captureState.kbTimer = setTimeout(function () {
        captureState.kbTimer = null;
        captureState.kbBuffer = '';
        if (route.name !== 'capture') return; /* Seite inzwischen verlassen */
        if (commitValue != null) kbSet(commitValue);
      }, 600);
    }

    function kbChar(ch) {
      if (captureState.kbActive == null) { captureState.kbActive = 0; render(); }
      kbClearTimer();
      var buf = captureState.kbBuffer + ch;
      var canon = kbCanonBuf(buf);
      var endsComma = /,$/.test(buf);
      var allowed = kbAllowedValues();
      var cands = allowed.filter(function (v) { return canonOf(v).indexOf(canon) === 0; });
      var exact = null;
      allowed.forEach(function (v) { if (canonOf(v) === canon) exact = v; });
      if (endsComma && exact != null) {
        /* Komma kündigt Nachkommastelle an – auf sie warten statt sofort festzuschreiben,
           sonst würde die nachgetippte Ziffer fälschlich als neue (ungültige) Eingabe gelten. */
        var longer = cands.filter(function (v) { return canonOf(v).length > canon.length; });
        if (longer.length === 0) { captureState.kbBuffer = ''; kbSet(exact); return; }
        captureState.kbBuffer = buf;
        kbArmTimer(longer.length === 1 ? longer[0] : exact);
        return;
      }
      if (cands.length === 0) {
        /* Schwebende exakte Eingabe ggf. abschließen, dann das Zeichen frisch versuchen */
        var pendingCanon = kbCanonBuf(captureState.kbBuffer);
        var pendingExact = null;
        allowed.forEach(function (v) { if (pendingCanon && canonOf(v) === pendingCanon) pendingExact = v; });
        captureState.kbBuffer = '';
        if (pendingExact != null) {
          kbSet(pendingExact);
          kbChar(ch);
          return;
        }
        kbFlashInvalid();
        return;
      }
      if (cands.length === 1) { captureState.kbBuffer = ''; kbSet(cands[0]); return; }
      /* Mehrdeutig (z. B. „1" bei Stufen 1,5/1/0,5/0): kurz warten */
      captureState.kbBuffer = buf;
      kbArmTimer(exact);
    }

    function kbHandler(ev) {
      var t = ev.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      var mh = document.getElementById('modal-host');
      if (mh && mh.hasChildNodes()) return;
      if (!students.length) return;
      var k = ev.key;
      if (k === 'Escape') {
        kbClearBuffer();
        if (captureState.kbActive != null) { captureState.kbActive = null; render(); }
        return;
      }
      var isDigit = k.length === 1 && k >= '0' && k <= '9';
      var isComma = (k === ',' || k === '.');
      var isNext = (k === 'Enter' || k === 'ArrowDown' || k === 'ArrowRight');
      var isPrev = (k === 'ArrowUp' || k === 'ArrowLeft');
      if (!isDigit && !isComma && !isNext && !isPrev) return;
      if (isComma && !captureState.kbBuffer) return; /* Komma ohne führende Ziffer ignorieren */
      /* Enter auf Bedienelementen außerhalb der Liste normal wirken lassen */
      if (k === 'Enter' && t && t.closest && t.closest('.view-toggle, .crit-tabs, .capture-bar, .topbar, .crit-nav')) return;
      ev.preventDefault();
      if (isNext || isPrev) { kbCommitPending(); kbMove(isNext ? 1 : -1); return; }
      kbChar(isComma ? ',' : k);
    }
  };

  /* ================= Punkteprotokoll je Schüler ================= */

  views.protokoll = function (p) {
    var course = Store.courseById(p.courseId);
    var cls = Store.classById(course.classId);
    var stu = Store.studentById(cls, p.studentId);
    var names = S().settings.criteriaNames;
    var q = course.currentQuarter;

    var qSel = h('select.input.q-select', { style: { maxWidth: '7.5rem' } });
    [1, 2, 3, 4].forEach(function (n) {
      qSel.appendChild(h('option', { value: n, selected: n === (p.quarter || q) }, n + '. Quartal'));
    });
    qSel.addEventListener('change', function () {
      go('protokoll', { courseId: course.id, studentId: stu.id, quarter: Number(qSel.value), back: p.back });
    });
    var shownQ = p.quarter || q;
    /* Standard: erstes Kriterium (Zeitmanagement) ist ausgewählt und sein
       Diagramm sichtbar, damit die Filter-/Diagrammfunktion entdeckbar ist.
       'none' = bewusst abgewählt (Unterscheidung von „nicht gesetzt“). */
    var filterCrit = p.crit === 'none' ? null : (p.crit != null ? p.crit : 0);

    var viewToggle = h('div.view-toggle',
      h('button.view-btn', {
        onclick: function () { go('pointstand', { id: course.id, quarter: shownQ, back: p.back }); }
      }, 'Ansicht: Liste'),
      h('button.view-btn.active', {}, 'Ansicht: Schüler/in')
    );

    var e = Store.entriesFor(course.id, stu.id, shownQ);
    var stat = Calc.quarterStatus(e.byCriterion);
    var grade = Calc.gradeFor15(stat.sum, S().settings.grading15);

    var prevStat = shownQ > 1
      ? Calc.quarterStatus(Store.entriesFor(course.id, stu.id, shownQ - 1).byCriterion)
      : null;

    function setFilter(ci) {
      go('protokoll', { courseId: course.id, studentId: stu.id, quarter: shownQ,
        crit: (filterCrit === ci ? 'none' : ci), back: p.back });
    }

    var critSummary = h('div.crit-summary', {}, names.map(function (n, ci) {
      var dev = prevStat ? development(stat.averages[ci], prevStat.averages[ci]) : null;
      return h('div.crit-summary-item.clickable' +
        (dev === 'up' ? '.up' : dev === 'down' ? '.down' : '') +
        (filterCrit === ci ? '.selected' : ''),
        { onclick: function () { setFilter(ci); }, role: 'button', tabindex: 0 },
        h('span.hint', {}, n),
        h('strong', {}, stat.averages[ci] === null ? '–'
          : (dev === 'up' ? '▲ ' : dev === 'down' ? '▼ ' : '') + 'ø ' + Calc.fmt(stat.averages[ci], 1))
      );
    }));

    var pg = portfolioGrade(course, shownQ, stu.id);
    var slG = stat.rated > 0 ? grade.g : null;
    var soleiG = (slG != null && pg != null) ? Calc.soleiGrade(slG, pg) : null;
    var gradeLine = (slG != null || pg != null)
      ? h('div.crit-summary',
          h('div.crit-summary-item', h('span.hint', {}, 'Note SL-Bogen'), h('strong', {}, slG != null ? Calc.fmt(slG) : '–')),
          h('div.crit-summary-item', h('span.hint', {}, 'Note Portfolio'), h('strong', {}, pg != null ? Calc.fmt(pg) : '–')),
          h('div.crit-summary-item', h('span.hint', {}, 'Note SoLei'), h('strong', {}, soleiG != null ? Calc.fmt(soleiG) : '–')))
      : null;

    /* --- Liniendiagramm der Punkteentwicklung im gefilterten Kriterium --- */
    function lineChart(points, max) { /* points: [{date, points}] chronologisch */
      var W = 560, H = 150, padL = 30, padR = 12, padT = 10, padB = 26;
      var iw = W - padL - padR, ih = H - padT - padB;
      var n = points.length;
      function x(i) { return padL + (n === 1 ? iw / 2 : i * (iw / (n - 1))); }
      function y(v) { return padT + ih - (v / max) * ih; }
      var svg = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Punkteentwicklung">'];
      /* Rasterlinien bei den Tipp-Stufen */
      Calc.tapValues(max).forEach(function (v) {
        svg.push('<line x1="' + padL + '" y1="' + y(v) + '" x2="' + (W - padR) + '" y2="' + y(v) +
          '" stroke="var(--line)" stroke-width="1"/>');
        svg.push('<text x="' + (padL - 6) + '" y="' + (y(v) + 3.5) + '" text-anchor="end" font-size="10" fill="var(--ink-soft)">' +
          Calc.fmt(v, 1) + '</text>');
      });
      /* Linie */
      if (n > 1) {
        var d = points.map(function (pt, i) { return (i ? 'L' : 'M') + x(i) + ' ' + y(pt.points); }).join(' ');
        svg.push('<path d="' + d + '" fill="none" stroke="var(--teal)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>');
      }
      /* Punkte + Datumsbeschriftung (erste, letzte, dazwischen ausgedünnt) */
      var step = Math.max(1, Math.ceil(n / 8));
      points.forEach(function (pt, i) {
        svg.push('<circle cx="' + x(i) + '" cy="' + y(pt.points) + '" r="' + (pt.absence ? 5 : 4) +
          '" fill="' + (pt.absence ? 'var(--red)' : 'var(--teal)') + '"/>');
        if (i === 0 || i === n - 1 || i % step === 0) {
          var pp = pt.date.split('-');
          svg.push('<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="9.5" fill="var(--ink-soft)">' +
            pp[2] + '.' + pp[1] + '.</text>');
        }
      });
      svg.push('</svg>');
      var host = h('div.chart-host');
      host.innerHTML = svg.join('');
      return host;
    }

    var chartCard = null;
    if (filterCrit != null) {
      var chartPoints = e.list.filter(function (x) { return x.criterion === filterCrit; })
        .sort(function (a, b) { return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt); })
        .map(function (x) { return { date: x.date, points: x.points, absence: !!x.absenceId }; });
      /* Ergebnis-Uploads (Quartalsend-Zählung ohne Datum): nicht im Diagramm, sondern als Anmerkung darunter. */
      var upCi = typeof course.uploadCriterion === 'number' ? course.uploadCriterion : 2;
      var upTally = filterCrit === upCi ? Store.uploadTallyFor(course.id, stu.id, shownQ) : null;
      var upNote = (upTally && (upTally.done > 0 || upTally.missed > 0))
        ? h('p.hint', {}, upTally.done + ' mal Ergebnisse hochgeladen, ' + upTally.missed + ' Ergebnisse fehlen')
        : null;
      chartCard = h('div.card.card-tight.chart-card-slot',
        h('div.row-between',
          h('strong', {}, names[filterCrit] + ' im ' + shownQ + '. Quartal'),
          h('button.btn-small.btn-plain', { onclick: function () { setFilter(filterCrit); } }, 'Filter aufheben')),
        chartPoints.length
          ? [lineChart(chartPoints, course.maxPoints[shownQ][filterCrit]),
             chartPoints.some(function (cp) { return cp.absence; })
               ? h('p.hint', {}, h('span.legend-dot.red'), ' rote Punkte = unentschuldigte Fehlzeit (0 Punkte)')
               : null]
          : h('p.hint', {}, 'In diesem Quartal wurden für dieses Kriterium noch keine Punkte vergeben.'),
        upNote
      );
    }

    /* --- Vergabeliste: normale Vergaben editierbar, Fehlzeiten gekennzeichnet --- */
    var absences = Store.absencesFor(course.id, stu.id, shownQ);
    var shownEntries = e.list.filter(function (x) {
      if (filterCrit != null) return x.criterion === filterCrit;
      return !x.absenceId; /* ungefiltert: Fehlzeiten unten zusammengefasst */
    });

    var list = shownEntries.slice().sort(function (a, b) {
      return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
    }).map(function (entry) {
      if (entry.absenceId) {
        return h('div.log-row',
          h('div',
            h('strong', {}, '0 P.'), ' · ', names[entry.criterion],
            h('span.hint.block', {}, UI.fmtDate(entry.date) + ' · unentschuldigte Fehlzeit')),
          h('button.btn-small.btn-plain', { onclick: function () {
            go('absences', { id: course.id, quarter: shownQ });
          } }, 'Fehlzeiten verwalten')
        );
      }
      return h('div.log-row',
        h('div',
          h('strong', {}, Calc.fmt(entry.points, 1) + ' P.'), ' · ', names[entry.criterion],
          h('span.hint.block', {}, UI.fmtDate(entry.date))
        ),
        h('div.row-gap',
          h('button.btn-small.btn-plain', { onclick: function () { editEntry(entry); } }, 'Ändern'),
          h('button.btn-small.btn-plain.danger-text', { onclick: function () {
            Store.deleteEntry(entry.id); toast('Vergabe gelöscht.'); render();
          } }, 'Löschen')
        )
      );
    });

    if (filterCrit == null && absences.length) {
      absences.forEach(function (a) {
        list.push(h('div.log-row',
          h('div',
            h('strong', {}, 'Unentschuldigte Fehlzeit'),
            h('span.hint.block', {}, UI.fmtDate(a.date) + ' · 0 Punkte in allen Kriterien')),
          h('button.btn-small.btn-plain', { onclick: function () {
            go('absences', { id: course.id, quarter: shownQ });
          } }, 'Fehlzeiten verwalten')
        ));
      });
    }

    function printCharts() {
      var page = h('div.print-page.charts-print',
        h('h2', {}, 'SoLei-Punkteentwicklung'),
        h('p.print-sub', {}, cls.name + ' · ' + course.subject + ' · ' + shownQ + '. Quartal · ' +
          stu.lastName + ', ' + stu.firstName + ' · Stand: ' + UI.fmtDate(Store.todayISO())),
        names.map(function (n, ci) {
          var pts = e.list.filter(function (x) { return x.criterion === ci; })
            .sort(function (a, b) { return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt); })
            .map(function (x) { return { date: x.date, points: x.points, absence: !!x.absenceId }; });
          return h('div.report-block',
            h('h3', {}, n + (stat.averages[ci] != null ? ' · ø ' + Calc.fmt(stat.averages[ci], 1) +
              ' von ' + Calc.fmt(course.maxPoints[shownQ][ci], 1) : '')),
            pts.length ? lineChart(pts, course.maxPoints[shownQ][ci])
              : h('p.hint', {}, 'Keine Punktevergaben in diesem Quartal.'),
            (function () {
              /* Ergebnis-Uploads (Quartalsend-Zählung ohne Datum) als Anmerkung unter dem Diagramm. */
              var upCi = typeof course.uploadCriterion === 'number' ? course.uploadCriterion : 2;
              if (ci !== upCi) return null;
              var t = Store.uploadTallyFor(course.id, stu.id, shownQ);
              return (t && (t.done > 0 || t.missed > 0))
                ? h('p.hint', {}, t.done + ' mal Ergebnisse hochgeladen, ' + t.missed + ' Ergebnisse fehlen')
                : null;
            })());
        }),
        Store.absencesFor(course.id, stu.id, shownQ).length
          ? h('p.hint', {}, h('span.legend-dot.red'), ' rote Punkte = unentschuldigte Fehlzeit (0 Punkte)')
          : null
      );
      printNode(page, false);
    }

    return h('div.screen',
      header('SoLei-Punktestand', p.back || { name: 'course', params: { id: course.id } }),
      h('div.card.card-tight.course-box.course-box-row',
        h('strong', {}, cls.name + ' - ' + course.subject),
        h('button.btn-small.btn-primary.course-box-btn', { onclick: printCharts }, 'Diagramme drucken')),
      h('div.capture-bar', qSel, viewToggle),
      h('div.card.card-tight',
        h('div.row-between',
          h('div.name-with-photo',
            photoTile(stu, { small: true }),
            h('strong', {}, stu.lastName + ', ' + stu.firstName)),
          h('div.row-gap',
            h('span.sum-pill', {}, Calc.fmt(stat.sum, 1) + ' / 15'),
            stat.rated > 0 ? h('span.grade-pill.g' + Math.round(grade.g), {}, 'Note ' + Calc.fmt(grade.g) + ' (' + grade.label + ')') : null
          )
        )
      ),
      h('div.protokoll-stack',
        h('div.card.card-tight',
          h('p.hint', {}, 'Tipp: Ein Kriterium antippen filtert die Vergaben und zeigt die Entwicklung als Diagramm.'),
          critSummary,
          gradeLine,
          stat.rated > 0 && stat.rated < 5
            ? h('p.hint', {}, 'Erst ' + stat.rated + ' von 5 Kriterien bewertet – der Notenstand ist ein Zwischenstand.')
            : null
        ),
        chartCard
      ),
      /* Kursnotizen des angezeigten Quartals – oberhalb der Punktevergaben,
         gleiche Darstellung wie auf „SoLei-Quartalsnoten". */
      (function () {
        var quarters = courseQuarters(course);
        var qNotes = Store.notesFor(course.id, stu.id).filter(function (n) {
          return Quarters.quarterForDate(n.date, quarters) === shownQ;
        });
        if (!qNotes.length) return null;
        return h('div.card.card-tight',
          h('div.section-head-inline', {}, 'Kursnotizen (' + shownQ + '. Quartal)'),
          h('div.review-notes.no-top-border', {}, qNotes.map(function (n) {
            return h('p.review-note', {},
              h('span.note-date', {}, UI.fmtDate(n.date) + ': '), n.text);
          })));
      })(),
      h('div.section-head', {}, filterCrit != null
        ? 'Vergaben · ' + names[filterCrit] + ' (' + shownEntries.length + ')'
        : 'Alle Punktevergaben (' + (shownEntries.length + absences.length) + ')'),
      h('div.card.card-list', {}, list.length ? list : h('div.empty', h('p', {}, 'In diesem Quartal wurden noch keine Punkte vergeben.')))
    );

    function editEntry(entry) {
      var max = course.maxPoints[entry.quarter][entry.criterion];
      var taps = Calc.tapValues(max);
      var chosen = entry.points;
      var dateIn = h('input.input', { type: 'date', value: entry.date });
      var segHost = h('div.seg');
      function drawSeg() {
        clear(segHost);
        taps.forEach(function (v) {
          segHost.appendChild(h('button.seg-btn' + (chosen === v ? '.active' : ''), {
            onclick: function () { chosen = v; drawSeg(); }
          }, Calc.fmt(v, 1)));
        });
      }
      drawSeg();
      UI.modal('Vergabe ändern · ' + names[entry.criterion], [
        h('label.field', h('span.field-label', {}, 'Punkte'), segHost),
        h('label.field', h('span.field-label', {}, 'Datum'), dateIn)
      ], [
        { label: 'Abbrechen', value: false },
        { label: 'Speichern', value: true, primary: true }
      ]).then(function (ok) {
        if (!ok) return;
        Store.updateEntry(entry.id, chosen, dateIn.value);
        toast('Vergabe geändert.');
        render();
      });
    }
  };

  /* ================= Einstellungen ================= */

  /* ---------- Schuljahr-Export (Excel / Druck) ---------- */

  function yearSelect(preferOld) {
    var st = S();
    var sel = h('select.input');
    var years = st.schoolYears.slice().sort(function (a, b) {
      return (b.startDate || '').localeCompare(a.startDate || '');
    });
    if (preferOld) years = years.slice().reverse(); /* ältestes zuerst anbieten */
    years.forEach(function (y) {
      var n = st.courses.filter(function (c) { return c.yearId === y.id; }).length;
      sel.appendChild(h('option', { value: y.id }, y.name + ' (' + n + ' Kurs' + (n === 1 ? '' : 'e') + ')'));
    });
    return sel;
  }

  function sanitizeFilename(s) {
    return s.replace(/[^\wäöüÄÖÜß-]+/g, '_');
  }

  /* ---------- Zwischenablage ----------
     Zeilen als TSV kopieren – Excel/LibreOffice verteilen das direkt auf
     Zellen. Tabulatoren und Zeilenumbrüche innerhalb einer Zelle werden
     durch Leerzeichen ersetzt, damit das Raster nicht zerfällt. */
  function rowsToTSV(rows) {
    return rows.map(function (row) {
      return row.map(function (v) {
        if (v === null || v === undefined) return '';
        return String(v).replace(/[\t\r\n]+/g, ' ');
      }).join('\t');
    }).join('\n');
  }

  function copyRowsToClipboard(rows, label) {
    var text = rowsToTSV(rows);
    function fallback() {
      /* execCommand als Rückfallebene (ältere Browser, unsichere Kontexte). */
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      if (ok) toast((label || 'Liste') + ' in die Zwischenablage kopiert – in Excel mit Strg+V einfügen.');
      else UI.modal('Kopieren nicht möglich',
        h('p', {}, 'Der Browser hat das Kopieren abgelehnt. Nutzen Sie bitte den Excel-Export.'));
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast((label || 'Liste') + ' in die Zwischenablage kopiert – in Excel mit Strg+V einfügen.');
      }).catch(fallback);
    } else fallback();
  }

  /* ---------- Excel-Export aller Schuljahresdaten (Rohdaten + Notenübersicht) ---------- */

  /* Ein Tabellenblatt je Kurs: Kopf, Notenübersicht und alle Rohdaten-Abschnitte
     im langen Format (eine Zeile = ein Ereignis), Abschnitte fett überschrieben. */
  function courseDataSheet(course) {
    var st = S();
    var cls = Store.classById(course.classId);
    var year = Store.yearById(course.yearId);
    var quarters = courseQuarters(course);
    var critNames = st.settings.criteriaNames;
    var nameOf = {};
    (cls ? cls.students : []).forEach(function (s) { nameOf[s.id] = s.lastName + ', ' + s.firstName; });
    function nm(id) { return nameOf[id] || '– unbekannt –'; }

    var rows = [], bold = [];
    function boldRow(r) { bold.push(rows.length); rows.push(r); }
    function section(title, head, data) {
      rows.push([]);
      boldRow([title]);
      if (head) boldRow(head);
      if (!data.length) rows.push(['(keine Einträge)']);
      else data.forEach(function (r) { rows.push(r); });
    }

    /* Kopf */
    boldRow(['Rohdaten & Notenübersicht', (cls ? cls.name : '?') + ' · ' + course.subject + ' · ' + (year ? year.name : '')]);
    rows.push(['Exportiert am', UI.fmtDate(Store.todayISO())]);
    rows.push(['Gewichtung SoLei / OBT / Klausuren',
      course.weights.sl + ' / ' + course.weights.obt + ' / ' + course.weights.ka]);
    rows.push([]);
    boldRow(['Maximalpunkte'].concat(critNames));
    [1, 2, 3, 4].forEach(function (q) {
      rows.push([q + '. Quartal'].concat((course.maxPoints && course.maxPoints[q]) || []));
    });

    /* Notenübersicht (berechnete Durchschnitte & Zeugnisnoten) */
    var ge = gradeExportRows(course);
    section('Notenübersicht & Zeugnisnoten', ge[2], ge.slice(3));

    /* SoLei-Punktevergaben */
    var entries = st.soleiEntries.filter(function (e) { return e.courseId === course.id; })
      .sort(function (a, b) {
        return (nm(a.studentId) + a.date + a.criterion).localeCompare(nm(b.studentId) + b.date + b.criterion, 'de');
      });
    section('SoLei-Punktevergaben',
      ['Datum', 'Quartal', 'Name', 'Kriterium', 'Punkte', 'aus Fehlzeit'],
      entries.map(function (e) {
        return [UI.fmtDate(e.date), e.quarter, nm(e.studentId),
          critNames[e.criterion] || ('Kriterium ' + (e.criterion + 1)), e.points,
          e.absenceId ? 'ja' : ''];
      }));

    /* Unentschuldigte Fehlzeiten */
    var abs = (st.absences || []).filter(function (a) { return a.courseId === course.id; })
      .sort(function (a, b) { return (nm(a.studentId) + a.date).localeCompare(nm(b.studentId) + b.date, 'de'); });
    section('Unentschuldigte Fehlzeiten', ['Datum', 'Quartal', 'Name'],
      abs.map(function (a) { return [UI.fmtDate(a.date), a.quarter, nm(a.studentId)]; }));

    /* Ergebnis-Uploads */
    var ups = (st.uploadTallies || []).filter(function (t) { return t.courseId === course.id; })
      .sort(function (a, b) { return (a.quarter + nm(a.studentId)).localeCompare(b.quarter + nm(b.studentId), 'de'); });
    section('Ergebnis-Uploads', ['Quartal', 'Name', 'hochgeladen', 'versäumt'],
      ups.map(function (t) { return [t.quarter, nm(t.studentId), t.done, t.missed]; }));

    /* OBT-Noten (Prozentwerte) */
    var obtRows = [];
    [1, 2].forEach(function (hj) {
      for (var i = 0; i < Math.max(1, course.numOBT || 0); i++) {
        var o = course.obt && course.obt[hj] && course.obt[hj][i];
        if (!o) continue;
        Object.keys(o).sort(function (a, b) { return nm(a).localeCompare(nm(b), 'de'); })
          .forEach(function (sid) { obtRows.push([hj, 'OBT ' + (i + 1), nm(sid), o[sid]]); });
      }
    });
    section('Open Book Tests', ['Halbjahr', 'Nr.', 'Name', 'Prozent'], obtRows);

    /* Klausur-Noten (Punkte) */
    var kaRows = [];
    [1, 2].forEach(function (hj) {
      for (var i = 0; i < Math.max(1, course.numKA || 0); i++) {
        var k = course.ka && course.ka[hj] && course.ka[hj][i];
        if (!k || !k.points) continue;
        Object.keys(k.points).sort(function (a, b) { return nm(a).localeCompare(nm(b), 'de'); })
          .forEach(function (sid) { kaRows.push([hj, 'Klausur ' + (i + 1), nm(sid), k.points[sid], k.maxPoints]); });
      }
    });
    section('Klausuren', ['Halbjahr', 'Nr.', 'Name', 'Punkte', 'Max. Punkte'], kaRows);

    /* Vollständig bewertete Klausuren: Aufgabenpunkte im Detail */
    [1, 2].forEach(function (hj) {
      for (var i = 0; i < Math.max(1, course.numKA || 0); i++) {
        var k = course.ka && course.ka[hj] && course.ka[hj][i];
        if (!k || !k.full || !Array.isArray(k.full.tasks)) continue;
        var f = k.full;
        var head = ['Name', 'Datum'];
        f.tasks.forEach(function (mp, ti) { head.push('Aufg. ' + (ti + 1) + ' (max ' + mp + ')'); });
        head.push('Summe', 'Kommentar');
        var rows = [];
        Object.keys(f.taskPoints || {}).sort(function (a, b) { return nm(a).localeCompare(nm(b), 'de'); })
          .forEach(function (sid) {
            var arr = f.taskPoints[sid] || [];
            var sum = 0;
            var row = [nm(sid), UI.fmtDate((f.dates && f.dates[sid]) || f.date || '')];
            f.tasks.forEach(function (mp, ti) {
              var v = arr[ti];
              row.push(v != null ? v : 0);
              if (v != null) sum += v;
            });
            row.push(Math.round(sum * 100) / 100);
            row.push((f.comments && f.comments[sid]) || '');
            rows.push(row);
          });
        if (rows.length) {
          section('Klausur ' + (i + 1) + ' (' + hj + '. HJ) – Aufgabenpunkte', head, rows);
        }
      }
    });

    /* Portfolio / mdl. Prüfung */
    var pfRows = [];
    [1, 2, 3, 4].forEach(function (q) {
      var p = course.portfolio && course.portfolio[q];
      if (!p) return;
      Object.keys(p).sort(function (a, b) { return nm(a).localeCompare(nm(b), 'de'); })
        .forEach(function (sid) { pfRows.push([q, nm(sid), p[sid]]); });
    });
    section('Portfolio / mdl. Prüfung', ['Quartal', 'Name', 'Note'], pfRows);

    /* Kursnotizen */
    var noteRows = (st.notes || []).filter(function (n) { return n.courseId === course.id; })
      .sort(function (a, b) { return (nm(a.studentId) + a.date).localeCompare(nm(b.studentId) + b.date, 'de'); })
      .map(function (n) {
        return [UI.fmtDate(n.date), Quarters.quarterForDate(n.date, quarters), nm(n.studentId), n.text];
      });
    section('Kursnotizen', ['Datum', 'Quartal', 'Name', 'Notiz'], noteRows);

    /* Stundeninhalte (chronologisch aufsteigend) */
    var lcRows = Store.lessonContentsFor(course.id).map(function (e) {
      return [UI.fmtDate(e.date), Quarters.quarterForDate(e.date, quarters), e.text];
    });
    section('Stundeninhalte', ['Datum', 'Quartal', 'Unterrichtsinhalt'], lcRows);

    return {
      name: (cls ? cls.name : '?') + ' ' + course.subject,
      rows: rows, bold: bold,
      colWidths: [14, 10, 28, 24, 12, 12]
    };
  }

  /* Hinweis für alle Export-/Druckwege: Anders als das Backup sind Exporte
     unverschlüsselt. Bewusst als eigener Baustein, damit der Wortlaut an
     allen Stellen identisch ist. */
  function exportWarning() {
    return h('p.hint.warn-text', {},
      'Hinweis: Diese Datei ist – anders als das Backup – nicht verschlüsselt und enthält personenbezogene Daten. ' +
      'Bitte nur auf geschützten Geräten speichern und nicht ungeschützt weitergeben.');
  }

  function yearFullExportDialog() {
    var sel = yearSelect(false);
    var err = h('p.hint.error-text');
    UI.modal('Excel-Export aller Schuljahresdaten', [
      h('p.hint', {}, 'Erzeugt eine Excel-Datei mit einem Übersichtsblatt und einem Tabellenblatt je Kurs: Notenübersicht & Zeugnisnoten plus sämtliche Rohdaten (Punktevergaben, Fehlzeiten, Ergebnis-Uploads, OBT- und Klausurnoten, Portfolionoten, Kursnotizen, Stundeninhalte).'),
      h('label.field', h('span.field-label', {}, 'Schuljahr'), sel),
      exportWarning(),
      err
    ], [
      { label: 'Abbrechen', value: false },
      { label: 'Excel-Datei erstellen', value: true, primary: true,
        validate: function () { return yearHasCourses(sel.value, err); } }
    ]).then(function (ok) {
      if (!ok) return;
      var st = S();
      var year = Store.yearById(sel.value);
      var courses = st.courses.filter(function (c) { return c.yearId === year.id; });

      /* Übersichtsblatt */
      var oRows = [], oBold = [];
      function ob(r) { oBold.push(oRows.length); oRows.push(r); }
      ob(['SOL-Noten – Excel-Export aller Schuljahresdaten']);
      oRows.push(['Schuljahr', year.name]);
      oRows.push(['Erster Schultag', UI.fmtDate(year.startDate)]);
      oRows.push(['Exportiert am', UI.fmtDate(Store.todayISO())]);
      oRows.push(['App-Version', APP_VERSION]);
      oRows.push([]);
      ob(['SoLei-Kriterien']);
      st.settings.criteriaNames.forEach(function (n, i) { oRows.push([(i + 1) + '.', n]); });
      oRows.push([]);
      ob(['Kurse', 'Punktevergaben', 'Fehlzeiten', 'Uploads', 'Notizen']);
      courses.forEach(function (c) {
        var cls = Store.classById(c.classId);
        oRows.push([(cls ? cls.name : '?') + ' · ' + c.subject,
          st.soleiEntries.filter(function (e) { return e.courseId === c.id; }).length,
          (st.absences || []).filter(function (a) { return a.courseId === c.id; }).length,
          (st.uploadTallies || []).filter(function (t) { return t.courseId === c.id; }).length,
          (st.notes || []).filter(function (n) { return n.courseId === c.id; }).length]);
      });

      var sheets = [{ name: 'Übersicht', rows: oRows, bold: oBold, colWidths: [30, 16, 12, 10, 10] }]
        .concat(courses.map(courseDataSheet));
      XlsxWrite.downloadMulti(sanitizeFilename('SOL-Noten_' + year.name + '_Gesamtexport') + '.xlsx', sheets);
      toast('Excel-Datei mit ' + sheets.length + ' Tabellenblättern wird gespeichert.');
    });
  }

  function yearExportDialog() {
    var sel = yearSelect(false);
    var err = h('p.hint.error-text');
    UI.modal('Nur Notenübersichten exportieren', [
      h('p.hint', {}, 'Exportiert alle Kurse des gewählten Schuljahres mit ihren vollständigen Notenübersichten & Zeugnisnoten – als Excel-Datei (ein Tabellenblatt je Kurs) oder als Druckansicht (dort als PDF speicherbar).'),
      h('label.field', h('span.field-label', {}, 'Schuljahr'), sel),
      exportWarning(),
      err
    ], [
      { label: 'Abbrechen', value: false },
      { label: 'Drucken / PDF', value: 'print',
        validate: function () { return yearHasCourses(sel.value, err); } },
      { label: 'Zwischenablage', value: 'clip',
        validate: function () { return yearHasCourses(sel.value, err); } },
      { label: 'Excel-Datei', value: 'xlsx', primary: true,
        validate: function () { return yearHasCourses(sel.value, err); } }
    ]).then(function (choice) {
      if (!choice) return;
      var year = Store.yearById(sel.value);
      var courses = S().courses.filter(function (c) { return c.yearId === year.id; });
      if (choice === 'clip') {
        /* Mehrere Kurse: Blöcke mit Kurstitel und Leerzeile dazwischen. */
        var rows = [];
        courses.forEach(function (c, i) {
          var cls = Store.classById(c.classId);
          if (i) rows.push([]);
          rows.push([(cls ? cls.name : '?') + ' · ' + c.subject]);
          gradeExportRows(c).forEach(function (r) { rows.push(r); });
        });
        copyRowsToClipboard(rows, courses.length + ' Notenübersicht(en)');
        return;
      }
      if (choice === 'xlsx') {
        var sheets = courses.map(function (c) {
          var cls = Store.classById(c.classId);
          return { name: (cls ? cls.name : '?') + ' ' + c.subject, rows: gradeExportRows(c) };
        });
        XlsxWrite.downloadMulti(sanitizeFilename('SOL-Noten_' + year.name + '_Notenuebersichten') + '.xlsx', sheets);
        toast('Excel-Datei mit ' + sheets.length + ' Tabellenblättern wird gespeichert.');
      } else {
        printYear(year, courses);
      }
    });
  }

  function yearHasCourses(yearId, err) {
    var n = S().courses.filter(function (c) { return c.yearId === yearId; }).length;
    if (n === 0) { err.textContent = 'Dieses Schuljahr enthält keine Kurse.'; return false; }
    return true;
  }

  /* Druck-Export: je Kurs eine Seite mit der Notenübersicht als Tabelle. */
  function printYear(year, courses) {
    var wrap = h('div');
    courses.forEach(function (c) {
      var rows = gradeExportRows(c);
      var head = rows[2];
      var body = rows.slice(3);
      var table = h('table.report-table',
        h('thead', h('tr', {}, head.map(function (t) { return h('th', {}, t); }))),
        h('tbody', {}, body.map(function (r) {
          return h('tr', {}, r.map(function (v) {
            return h('td', {}, (v === null || v === undefined) ? '' : String(v));
          }));
        })));
      wrap.appendChild(h('div.print-page', { style: { pageBreakAfter: 'always' } },
        h('h2', {}, 'Notenübersicht'),
        h('p.print-sub', {}, String(rows[0][1] || '')),
        table));
    });
    printNode(wrap, true, sanitizeFilename('SOL-Noten_' + year.name + '_Notenuebersichten'));
  }

  /* ---------- Schuljahr löschen (Gefahrenbereich) ---------- */

  function yearDeleteDialog() {
    var st = S();
    if (st.schoolYears.length <= 1) {
      UI.modal('Schuljahr löschen', h('p', {}, 'Das letzte verbliebene Schuljahr kann nicht gelöscht werden.'));
      return;
    }
    var sel = yearSelect(true);
    var pwInput = h('input.input', { type: 'password', autocomplete: 'current-password',
      placeholder: 'PIN / Passwort der App' });
    var err = h('p.hint.error-text');
    var secured = Store.isEncrypted();
    UI.modal('Schuljahr unwiderruflich löschen', [
      h('p', {}, 'Das gewählte Schuljahr wird mit allen Klassen, Kursen, Punktevergaben, Fehlzeiten und Noten gelöscht. Fotos werden nur entfernt, wenn die Schüler/innen in keinem anderen Schuljahr mehr vorkommen.'),
      h('p', {}, 'Diese Aktion kann nicht rückgängig gemacht werden. Erstellen Sie im Zweifel vorher ein Backup oder einen Schuljahr-Export.'),
      h('label.field', h('span.field-label', {}, 'Schuljahr'), sel),
      secured
        ? h('label.field', h('span.field-label', {}, 'Zur Bestätigung: PIN / Passwort der App'), pwInput)
        : null,
      err
    ], [
      { label: 'Abbrechen', value: false },
      { label: 'Endgültig löschen', value: true, danger: true,
        validate: function () {
          if (secured && !pwInput.value) {
            err.textContent = 'Bitte geben Sie zur Bestätigung Ihre PIN bzw. Ihr Passwort ein.';
            return false;
          }
          return true;
        } }
    ]).then(function (ok) {
      if (!ok) return;
      var yearId = sel.value;
      var yearName = (Store.yearById(yearId) || {}).name || '';
      Store.verifySecret(pwInput.value).then(function (valid) {
        if (!valid) {
          UI.modal('Löschen abgebrochen', h('p', {}, 'Die eingegebene PIN bzw. das Passwort ist nicht korrekt. Das Schuljahr wurde nicht gelöscht.'));
          return;
        }
        Store.deleteYear(yearId).then(function (removed) {
          toast('Schuljahr „' + yearName + '“ gelöscht (' + removed.courses + ' Kurse, ' +
            removed.classes + ' Klassen' + (removed.photos ? ', ' + removed.photos + ' Fotos' : '') + ').');
          render();
        }).catch(function (e) {
          UI.modal('Löschen nicht möglich', h('p', {}, e && e.message ? e.message : 'Unbekannter Fehler.'));
        });
      });
    });
  }

  views.settings = function (p) {
    var st = S();
    var back = p.back || { name: 'home' };

    /* Kriteriennamen */
    var nameInputs = st.settings.criteriaNames.map(function (n) {
      return h('input.input', { type: 'text', value: n });
    });

    /* Bewertungsspiegel */
    var gradeInputs = st.settings.grading15.map(function (row) {
      return h('input.input.input-num', { type: 'number', step: '0.25', min: 1, max: 6, value: row.g });
    });
    var gradeTable = h('table.grading-table',
      h('tr', h('th', {}, 'Punkte'), h('th', {}, 'Note'), h('th', {}, '')),
      st.settings.grading15.map(function (row, i) {
        return h('tr', h('td', {}, 'ab ' + row.p), h('td', {}, gradeInputs[i]), h('td.hint', {}, row.label));
      })
    );

    var fileInput = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
    fileInput.addEventListener('change', function () {
      var f = fileInput.files[0];
      fileInput.value = '';
      if (!f) return;
      if (f.size > 10 * 1024 * 1024) {
        UI.modal('Import fehlgeschlagen', h('p', {}, 'Die Datei ist zu groß für ein SOL-Noten-Backup (Limit 10 MB) und wurde abgelehnt.'));
        return;
      }
      f.text().then(function (text) {
        var parsed = Store.parseBackup(text);
        var getData;
        if (parsed.keyEnvelope) {
          getData = askPassword(f.name, true).then(function (pin) {
            if (pin == null) return null;
            return CryptoBox.unwrapMaster(pin, parsed.envelope.wrapped)
              .then(function (raw) { return CryptoBox.importAesKey(raw); })
              .then(function (key) { return CryptoBox.decryptWithKey(key, parsed.envelope); })
              .then(function (plain) { return JSON.parse(plain); })
              .catch(function () { throw new Error('Falsche PIN / falsches Passwort oder beschädigte Datei.'); });
          });
        } else if (parsed.encrypted) {
          getData = askPassword(f.name, false).then(function (pw) {
            if (pw == null) return null;
            return CryptoBox.decrypt(parsed.envelope, pw).then(function (plain) { return JSON.parse(plain); });
          });
        } else {
          getData = Promise.resolve(parsed.data);
        }
        return getData.then(function (data) {
          if (!data) return;
          return UI.confirmDialog('Backup einspielen?',
            'Achtung: Alle aktuell auf diesem Gerät gespeicherten Daten werden durch den Inhalt der Datei „' + f.name + '“ ersetzt.',
            'Backup einspielen', true).then(function (ok) {
              if (!ok) return;
              Store.applyImport(data);
              toast('Backup wurde eingespielt.');
              go('home');
            });
        });
      }).catch(function (e) { UI.modal('Import fehlgeschlagen', h('p', {}, e.message)); });
    });

    function askPassword(fileName, isKeyEnvelope) {
      var label = isKeyEnvelope ? 'PIN / Passwort' : 'Passwort';
      var pw = h('input.input', { type: 'password',
        autocomplete: 'current-password', placeholder: label });
      return UI.modal('Verschlüsseltes Backup',
        [h('p.hint', {}, isKeyEnvelope
          ? 'Die Datei „' + fileName + '“ ist ein automatisches Backup. Bitte geben Sie die PIN bzw. das Passwort ein, die/das beim Erstellen der Datei aktiv war.'
          : 'Die Datei „' + fileName + '“ ist verschlüsselt. Bitte geben Sie das Passwort ein.'),
         h('label.field', h('span.field-label', {}, label), pw)],
        [{ label: 'Abbrechen', value: false }, { label: 'Entschlüsseln', value: true, primary: true }]
      ).then(function (ok) { return ok ? pw.value : null; });
    }

    var snapHost = h('div.actions-col');
    Store.listSnapshots().then(function (keys) {
      if (!keys.length) return;
      snapHost.appendChild(h('p.hint', {}, 'Interne Sicherungsstände (automatisch, je einer pro Tag) – stellen Fehlbedienungen wieder her, ersetzen aber kein Backup auf einem anderen Gerät:'));
      keys.slice(0, 5).forEach(function (k) {
        snapHost.appendChild(h('button.btn-plain.btn-block', { onclick: function () {
          UI.confirmDialog('Stand vom ' + UI.fmtDate(k) + ' wiederherstellen?',
            'Alle Änderungen seit diesem Stand gehen verloren.', 'Wiederherstellen', true)
            .then(function (ok) {
              if (!ok) return;
              Store.restoreSnapshot(k).then(function () { toast('Stand wiederhergestellt.'); go('home'); });
            });
        } }, 'Stand vom ' + UI.fmtDate(k) + ' wiederherstellen'));
      });
    });

    return h('div.screen',
      header('Globale Einstellungen für alle Kurse', back, h('span')),

      h('div.banner-info', {},
        h('span', {}, 'Maximalpunkte der Kriterien, Quartalszeiträume, Gewichtung sowie die Anzahl der Klausuren und Open Book Tests stellen Sie je Kurs ein: Kurs auf dem Startbildschirm antippen, dann „Kurs-Einstellungen“.')),

      h('div.section-head', {}, 'App-Installation'),
      h('div.card', {}, installSection()),

      h('div.section-head', {}, 'Farbschema'),
      h('div.card',
        h('div.theme-row', {}, THEMES.map(function (t) {
          var active = (st.settings.theme || 'petrol') === t.id;
          return h('button.theme-swatch' + (active ? '.active' : ''), {
            onclick: function () {
              st.settings.theme = t.id;
              Store.save();
              applyTheme();
              toast('Farbschema „' + t.name + '“ aktiviert.');
              render();
            }
          },
            h('span.theme-dot', { style: { background: t.c } }),
            h('span', {}, t.name));
        }))
      ),

      h('div.section-head', {}, 'Zugangsschutz & Verschlüsselung'),
      h('div.card', {}, securitySection()),

      h('div.section-head', {}, 'Datensicherung'),
      h('div.card',
        h('p.hint', {}, st.settings.lastExport
          ? 'Letztes Backup: ' + UI.fmtDate(st.settings.lastExport.slice(0, 10))
          : 'Es wurde noch kein Backup erstellt.'),
        h('div.actions-col',
          h('button.btn-primary.btn-block', { onclick: function () { exportDialog(); } },
            'Backup-Datei jetzt verschlüsselt speichern'),
          h('button.btn-plain.btn-block', { onclick: function () { fileInput.click(); } },
            'Backup-Datei einspielen'),
          Store.folderBackupSupported()
            ? (Store.hasBackupFolder()
                ? h('button.btn-plain.btn-block', { onclick: function () {
                    Store.removeBackupFolder().then(render);
                  } }, 'Automatisches Backup beenden (Ordner: verbunden)')
                : h('button.btn-plain.btn-block', { onclick: function () {
                    Store.chooseBackupFolder()
                      .then(function () { toast('Automatisches Backup eingerichtet.'); render(); })
                      .catch(function () {});
                  } }, 'Automatisches Backup: Ordner wählen'))
            : h('p.hint', {}, 'Automatisches Backup in einen Ordner wird von diesem Browser nicht unterstützt (z. B. auf iPad/iPhone). Die App erinnert Sie stattdessen alle 7 Tage an ein Backup.')
        ),
        Store.folderBackupSupported()
          ? h('p.hint', {}, 'Tipp: Wählen Sie als Backup-Ziel einen Ordner, der von der OneDrive- oder Google-Drive-App synchronisiert wird – dann liegt Ihr (verschlüsseltes) Backup automatisch zusätzlich in der Cloud.')
          : null,
        fileInput,
        snapHost
      ),

      h('div.section-head', {}, 'Schuljahre'),
      h('div.card',
        h('p.hint', {}, 'Alte Schuljahre lassen sich vollständig archivieren und anschließend löschen, um Speicherplatz freizugeben: „Excel-Export aller Schuljahresdaten“ erzeugt eine Excel-Datei mit Notenübersicht und sämtlichen Rohdaten je Kurs; „Nur Notenübersichten exportieren“ liefert die kompakte Variante als Excel oder Druck/PDF.'),
        h('div.actions-col',
          h('button.btn-primary.btn-block', { onclick: yearFullExportDialog }, 'Excel-Export aller Schuljahresdaten'),
          h('button.btn-plain.btn-block', { onclick: yearExportDialog }, 'Nur Notenübersichten exportieren')),
        h('div.danger-zone',
          h('p.hint', {}, 'Gefahrenbereich'),
          h('button.btn-plain.btn-block.danger-text', { onclick: yearDeleteDialog }, 'Schuljahr löschen …'))
      ),

      h('div.section-head', {}, 'Foto-Sicherung (alle Klassen)'),
      h('div.card', {}, photoBackupCard()),

      h('div.section-head', {}, 'SoLei-Kriterien (gilt für alle Kurse)'),
      h('div.card',
        nameInputs.map(function (inp, i) {
          return h('label.field', h('span.field-label', {}, (i + 1) + '. Kriterium'), inp);
        }),
        h('button.btn-primary.btn-block', { onclick: function () {
          var vals = nameInputs.map(function (i) { return i.value.trim(); });
          if (vals.some(function (v) { return !v; })) { toast('Kriteriennamen dürfen nicht leer sein.'); return; }
          st.settings.criteriaNames = vals;
          Store.save();
          toast('Kriteriennamen gespeichert.');
        } }, 'Kriteriennamen speichern')
      ),

      h('div.section-head', {}, 'Bewertungsspiegel (15-Punkte-Schema)'),
      h('div.card',
        h('p.hint', {}, 'Die Note gilt ab der jeweils erreichten vollen Punktstufe. Beispiel: 11,9 Punkte → Stufe „ab 11“ → Note 2.'),
        h('details.pct-details',
          h('summary', {}, 'Tabelle anzeigen (0 – 15 Punkte)'),
          h('div.pct-scroll', {}, gradeTable)),
        h('div.actions-col',
          h('button.btn-primary.btn-block', { onclick: function () {
            st.settings.grading15.forEach(function (row, i) { row.g = Number(gradeInputs[i].value); });
            Store.save();
            toast('Bewertungsspiegel gespeichert.');
          } }, 'Bewertungsspiegel speichern'),
          h('button.btn-plain.btn-block', { onclick: function () {
            st.settings.grading15 = JSON.parse(JSON.stringify(Calc.DEFAULT_GRADING15));
            Store.save();
            toast('Auf Standardwerte zurückgesetzt.');
            render();
          } }, 'Auf Standard zurücksetzen')
        )
      ),

      h('div.section-head', {}, 'Klausurbewertung'),
      h('div.card',
        h('p.hint', {}, 'Einfach: je Klausur eine Maximalpunktzahl und je Schüler/in die Gesamtpunkte. Vollständig: Punkte je Aufgabe werden in der App vergeben (mit Klausurdatum und Kommentar); Summe, Prozent und Note berechnet die App. Der Schalter bestimmt die Erfassung neuer Klausuren – bereits vollständig bewertete Klausuren behalten ihre Aufgaben-Ansicht.'),
        (function () {
          var seg = h('div.seg.seg-wide');
          function draw() {
            seg.innerHTML = '';
            [{ v: false, l: 'Einfach (Gesamtpunkte)' }, { v: true, l: 'Vollständig (je Aufgabe)' }].forEach(function (o) {
              seg.appendChild(h('button.seg-btn' + (!!st.settings.kaFullMode === o.v ? '.active' : ''), {
                onclick: function () {
                  if (!!st.settings.kaFullMode === o.v) return;
                  st.settings.kaFullMode = o.v;
                  Store.save(); draw();
                }
              }, o.l));
            });
          }
          draw();
          return seg;
        })()
      ),

      h('div.section-head', {}, 'Bewertungsspiegel (Prozent-Schema)'),
      h('div.card',
        h('p.hint', {}, 'Gilt für Open Book Tests und Klausuren. Die Note gilt je vollem Prozentpunkt (abgerundet): 65,9 % → Zeile 65 %.'),
        (function () {
          if (!st.settings.gradingPct) st.settings.gradingPct = Calc.DEFAULT_GRADING_PCT.slice();
          var pctInputs = [];
          var tbl = h('table.grading-table',
            h('tr', h('th', {}, 'Prozent'), h('th', {}, 'Note'), h('th', {}, '')));
          for (var i = 100; i >= 0; i--) {
            (function (p) {
              var inp = h('input.input.input-num', { type: 'number', step: '0.1', min: 1, max: 6, value: st.settings.gradingPct[p] });
              pctInputs[p] = inp;
              tbl.appendChild(h('tr', h('td', {}, 'ab ' + p + ' %'), h('td', {}, inp),
                h('td.hint', {}, Calc.labelForGrade(st.settings.gradingPct[p]))));
            })(i);
          }
          var det = h('details.pct-details',
            h('summary', {}, 'Tabelle anzeigen (0–100 %)'),
            h('div.pct-scroll', {}, tbl));
          return h('div.actions-col',
            det,
            h('button.btn-primary.btn-block', { onclick: function () {
              for (var p = 0; p <= 100; p++) {
                var v = Number(pctInputs[p].value);
                if (isNaN(v) || v < 1 || v > 6) { toast('Ungültige Note bei ' + p + ' % (erlaubt: 1 bis 6).'); return; }
                st.settings.gradingPct[p] = v;
              }
              Store.save();
              toast('Prozent-Bewertungsspiegel gespeichert.');
            } }, 'Prozent-Bewertungsspiegel speichern'),
            h('button.btn-plain.btn-block', { onclick: function () {
              st.settings.gradingPct = Calc.DEFAULT_GRADING_PCT.slice();
              Store.save();
              toast('Auf Standardwerte zurückgesetzt.');
              render();
            } }, 'Auf Standard zurücksetzen'));
        })()
      )
    );
  };

  /* ---------- PIN-Sperre & Verschlüsselung (Einstellungen) ---------- */

  var DISCLAIMER_TEXT =
    'Die App wurde mit größter Sorgfalt und nach bestem Wissen erstellt. ' +
    'Für Fehlerfreiheit, ununterbrochene Verfügbarkeit oder den Erhalt der gespeicherten Daten wird keine Gewähr übernommen. ' +
    'Die Nutzung erfolgt auf eigene Verantwortung. Für die regelmäßige Sicherung der Daten (Backup) ist die nutzende Person selbst verantwortlich. ' +
    'Eine Haftung für Datenverlust oder mittelbare Schäden ist ausgeschlossen, soweit gesetzlich zulässig.';

  /* Disclaimer am Ende der Ersteinrichtung – muss aktiv bestätigt werden. */
  function showDisclaimer(onAccept) {
    var check = h('input', { type: 'checkbox' });
    var checkErr = h('p.hint.error-text');
    UI.modal('Wichtiger Hinweis', [
      h('p', {}, DISCLAIMER_TEXT),
      h('label.check-row', {}, check, h('span', {}, 'Ich habe den Hinweis gelesen und bin einverstanden.')),
      checkErr
    ], [
      { label: 'Einverstanden', value: true, primary: true, validate: function () {
          if (!check.checked) { checkErr.textContent = 'Bitte bestätigen Sie den Hinweis, um fortzufahren.'; return false; }
          return true;
        } }
    ], { mandatory: true }).then(function () {
      S().settings.disclaimerAcceptedAt = new Date().toISOString();
      Store.save();
      if (onAccept) onAccept();
    });
  }

  /* Pflicht-PIN in der Ersteinrichtung: erklärt die Verschlüsselung, keine
     Abbruchmöglichkeit; Backup wird nur empfohlen (Datenbank noch leer). */
  function requirePinSetup(onDone) {
    if (Store.isEncrypted()) { if (onDone) onDone(); return; }
    if (!CryptoBox.supported()) {
      UI.modal('Hinweis zur Verschlüsselung',
        h('p', {}, 'Dieser Browser unterstützt die nötige Verschlüsselungstechnik leider nicht. ' +
          'Die App funktioniert, die Daten können auf diesem Gerät aber nicht verschlüsselt werden. ' +
          'Bitte verwenden Sie nach Möglichkeit einen aktuellen Browser.'))
        .then(function () { if (onDone) onDone(); });
      return;
    }
    var pins = secretInputPair(['Festlegen', 'Wiederholen']);
    UI.modal('Zugangsschutz festlegen', [
      h('p', {}, 'Zum Schutz der Schülerdaten verschlüsselt SOL-Noten alle Daten auf diesem Gerät. ' +
        'Dazu legen Sie jetzt eine PIN oder ein Passwort fest.'),
      h('p.hint', {}, 'Die App fragt PIN bzw. Passwort künftig beim Start ab. Wichtig: Bei Verlust sind die Daten nur über ein Backup wiederherstellbar – es gibt bewusst keine Hintertür.')
    ].concat(pins.nodes), [
      { label: 'Festlegen und verschlüsseln', value: true, primary: true, validate: pins.validate }
    ], { mandatory: true }).then(function () {
      Store.enableEncryption(pins.value(), pins.kind()).then(function () {
        UI.modal('Verschlüsselung aktiv', [
          h('p', {}, 'Alle Daten der App sind jetzt auf diesem Gerät verschlüsselt. Bewahren Sie Ihre Zugangsdaten (PIN / Passwort) an einem sicheren Ort auf (z. B. in einem Passwort-Manager).'),
          h('p', {},
            h('strong', {}, 'Backup-Empfehlung:'),
            h('br'),
            'Sobald Sie Schüler/innen und Noten erfasst haben, sichern Sie Ihre Daten über „Einstellungen → Backup-Datei jetzt speichern“. Diese Backups sind ebenfalls verschlüsselt. Sichern Sie die Backup-Dateien regelmäßig, beispielsweise auf einem externen Datenträger.')
        ], [{ label: 'Verstanden', value: true, primary: true }]).then(function () {
          if (onDone) onDone();
        });
      }).catch(function (e) {
        UI.modal('Aktivierung fehlgeschlagen', h('p', {}, e.message)).then(function () {
          if (onDone) onDone();
        });
      });
    });
  }

  /* Eingabepaar für den Zugangsschutz: PIN (4–8 Ziffern) oder Passwort (mind. 10 Zeichen).
     Liefert value(), kind() und validate() für den umgebenden Dialog. */
  var HINT_PIN = 'Die PIN schützt vor neugierigen Blicken im Alltag. Wer das Gerät häufig mitnimmt, wählt besser das Passwort – es schützt auch bei Verlust oder Diebstahl.';
  var HINT_PW = 'Länge zählt mehr als Sonderzeichen: Eine merkbare Wortfolge wie „roterTraktorImSchnee“ ist stark und lässt sich gut behalten.';
  function secretInputPair(labels) {
    var sel = h('select.input');
    sel.appendChild(h('option', { value: 'pin' }, 'PIN (4–8 Ziffern) – schneller Zugriff'));
    sel.appendChild(h('option', { value: 'password' }, 'Passwort (mind. 10 Zeichen) – höherer Schutz'));
    var p1 = h('input.input', { type: 'password', inputmode: 'numeric', autocomplete: 'new-password', placeholder: '4–8 Ziffern' });
    var p2 = h('input.input', { type: 'password', inputmode: 'numeric', autocomplete: 'new-password', placeholder: 'Wiederholung' });
    var err = h('p.hint.error-text');
    var hint = h('p.hint', {}, HINT_PIN);
    function applyMode() {
      var pw = sel.value === 'password';
      p1.value = ''; p2.value = ''; err.textContent = '';
      if (pw) {
        p1.removeAttribute('inputmode'); p2.removeAttribute('inputmode');
        p1.placeholder = 'Mindestens 10 Zeichen';
        hint.textContent = HINT_PW;
      } else {
        p1.setAttribute('inputmode', 'numeric'); p2.setAttribute('inputmode', 'numeric');
        p1.placeholder = '4–8 Ziffern';
        hint.textContent = HINT_PIN;
      }
    }
    sel.addEventListener('change', applyMode);
    function validate() {
      if (sel.value === 'password') {
        if (p1.value.length < 10) { err.textContent = 'Das Passwort muss mindestens 10 Zeichen lang sein.'; return false; }
      } else {
        if (!/^\d{4,8}$/.test(p1.value)) { err.textContent = 'Die PIN muss aus 4 bis 8 Ziffern bestehen.'; return false; }
      }
      if (p1.value !== p2.value) { err.textContent = 'Die Eingaben stimmen nicht überein.'; return false; }
      return true;
    }
    return { nodes: [
      h('label.field', h('span.field-label', {}, 'Art des Zugangsschutzes'), sel),
      h('label.field', h('span.field-label', {}, labels[0]), p1),
      h('label.field', h('span.field-label', {}, labels[1]), p2),
      hint,
      err
    ], value: function () { return p1.value; }, kind: function () { return sel.value; }, validate: validate };
  }

  function enableEncryptionFlow() {
    UI.modal('Sperre einrichten – Schritt 1 von 2',
      h('div', {},
        h('p', {}, 'Bevor die Verschlüsselung aktiviert wird, verlangt die App ein frisches Backup. Denn es gilt: Ohne PIN bzw. Passwort gibt es keinen Zugriff auf die Daten – der einzige Rettungsweg ist Ihre Backup-Datei.'),
        h('p.hint', {}, 'Bitte notieren Sie Zugangsdaten und Backup-Passwort an einem sicheren Ort, z. B. in einem Passwort-Manager.')
      ), [
        { label: 'Abbrechen', value: false },
        { label: 'Backup jetzt speichern', value: true, primary: true }
      ]).then(function (ok) {
        if (!ok) return;
        exportDialog(function () { setTimeout(pinStep, 300); });
      });

    function pinStep() {
      var pins = secretInputPair(['Festlegen', 'Wiederholen']);
      UI.modal('Sperre einrichten – Schritt 2 von 2',
        [h('p.hint', {}, 'Die Datenbank wird mit einem Hauptschlüssel verschlüsselt (AES-256), den Ihre PIN bzw. Ihr Passwort entsperrt. Die App fragt die Eingabe künftig beim Start ab.')].concat(pins.nodes),
        [
          { label: 'Abbrechen', value: false },
          { label: 'Verschlüsselung aktivieren', value: true, primary: true, validate: pins.validate }
        ]).then(function (ok) {
          if (!ok) return;
          Store.enableEncryption(pins.value(), pins.kind()).then(function () {
            toast('Verschlüsselung ist aktiv. Die App fragt ' + (pins.kind() === 'password' ? 'das Passwort' : 'die PIN') + ' künftig beim Start ab.');
            render();
          }).catch(function (e) {
            UI.modal('Aktivierung fehlgeschlagen', h('p', {}, e.message));
          });
        });
    }
  }

  /* 'PIN' oder 'Passwort' – je nach aktivem Modus, für Beschriftungen. */
  function secretWord() { return Store.secretKind() === 'password' ? 'Passwort' : 'PIN'; }

  function changePinFlow() {
    var isPw = Store.secretKind() === 'password';
    var oldPin = h('input.input', { type: 'password',
      inputmode: isPw ? null : 'numeric',
      autocomplete: 'current-password',
      placeholder: isPw ? 'Aktuelles Passwort' : 'Aktuelle PIN' });
    var pins = secretInputPair(['Neu festlegen', 'Wiederholen']);
    UI.modal('PIN / Passwort ändern',
      [h('p.hint', {}, 'Hier können Sie auch zwischen PIN und Passwort wechseln.'),
       h('label.field', h('span.field-label', {}, isPw ? 'Aktuelles Passwort' : 'Aktuelle PIN'), oldPin)].concat(pins.nodes),
      [
        { label: 'Abbrechen', value: false },
        { label: 'Ändern', value: true, primary: true, validate: pins.validate }
      ]).then(function (ok) {
        if (!ok) return;
        Store.changePin(oldPin.value, pins.value(), pins.kind()).then(function () {
          toast((pins.kind() === 'password' ? 'Passwort' : 'PIN') + ' wurde geändert.');
          render();
        }).catch(function () {
          UI.modal('Ändern fehlgeschlagen', h('p', {}, isPw ? 'Das aktuelle Passwort ist nicht korrekt.' : 'Die aktuelle PIN ist nicht korrekt.'));
        });
      });
  }

  function biometricRow() {
    var host = h('div.bio-row');
    function draw(available) {
      UI.clear(host);
      if (!available) {
        host.appendChild(h('p.hint', {}, 'Biometrische Entsperrung (Fingerabdruck/Gesicht) wird von diesem Gerät oder Browser nicht angeboten.'));
        return;
      }
      if (Store.biometricsEnabled()) {
        host.appendChild(h('div.row-between',
          h('span', {}, 'Biometrische Entsperrung ist aktiv.'),
          h('button.btn-small.btn-plain.danger-text', { onclick: function () {
            Store.disableBiometrics().then(function () {
              draw(true);
              UI.modal('Biometrie deaktiviert',
                h('p', {}, 'Die biometrische Entsperrung ist in SOL-Noten abgeschaltet. Der zugehörige Passkey verbleibt in den Einstellungen Ihres Geräts (Passwörter / Passkeys) und kann dort bei Bedarf gelöscht werden – für die App ist er ohne Funktion.'),
                [{ label: 'Verstanden', value: true, primary: true }]);
            });
          } }, 'Deaktivieren')));
      } else {
        host.appendChild(h('div.actions-col',
          h('p.hint', {}, 'Bequemer entsperren: Statt ' + (Store.secretKind() === 'password' ? 'des Passworts' : 'der PIN') + ' können Sie Fingerabdruck oder Gesichtserkennung dieses Geräts nutzen. ' + secretWord() + ' bleibt weiterhin gültig. Sicherheit und Verschlüsselung bleiben unverändert – die Biometrie ist nur ein bequemer Zugang.'),
          h('button.btn-plain.btn-block', { onclick: setupBio }, 'Mit Fingerabdruck / Gesicht entsperren einrichten')));
      }
    }
    function setupBio() {
      var isPw = Store.secretKind() === 'password';
      var pin = h('input.input', { type: 'password', inputmode: isPw ? null : 'numeric', placeholder: secretWord() });
      UI.modal('Biometrie einrichten',
        [h('p.hint', {}, 'Bitte bestätigen Sie einmal ' + (isPw ? 'Ihr Passwort' : 'Ihre PIN') + '. Danach richtet das Gerät die biometrische Entsperrung ein.'),
         h('label.field', h('span.field-label', {}, secretWord()), pin)],
        [{ label: 'Abbrechen', value: false }, { label: 'Weiter', value: true, primary: true }]
      ).then(function (ok) {
        if (!ok) return;
        Store.enableBiometrics(pin.value).then(function () {
          toast('Biometrische Entsperrung ist aktiv.');
          draw(true);
        }).catch(function (e) {
          UI.modal('Einrichtung nicht möglich', h('p.prewrap', {},
            /Falsche PIN/.test(e.message) ? (isPw ? 'Das Passwort ist nicht korrekt.' : 'Die PIN ist nicht korrekt.') : e.message));
        });
      });
    }
    CryptoBox.platformAuthenticatorAvailable().then(draw);
    return host;
  }

  function securitySection() {
    if (!CryptoBox.supported()) {
      return h('p.hint', {}, 'Dieser Browser unterstützt die nötige Verschlüsselungstechnik nicht.');
    }
    if (!Store.isEncrypted()) {
      return h('div.actions-col',
        h('p.hint', {}, 'Schützt die Daten auf diesem Gerät: Die Datenbank wird verschlüsselt (AES-256) und die App beim Start mit einer PIN oder einem Passwort entsperrt. Wichtig: Bei vergessenem Zugang sind die Gerätedaten nur über ein Backup wiederherstellbar – die Einrichtung verlangt deshalb zuerst ein frisches Backup.'),
        h('button.btn-primary.btn-block', { onclick: enableEncryptionFlow }, 'Sperre einrichten (PIN oder Passwort)')
      );
    }
    var lockSel = h('select.input');
    [[null, 'Aus'], [0, 'Sofort beim Verlassen'], [1, 'Nach 1 Minute'], [5, 'Nach 5 Minuten'], [15, 'Nach 15 Minuten']]
      .forEach(function (o) {
        lockSel.appendChild(h('option', { value: o[0] === null ? 'aus' : o[0], selected: Store.getAutolock() === o[0] }, o[1]));
      });
    lockSel.addEventListener('change', function () {
      var v = lockSel.value === 'aus' ? null : Number(lockSel.value);
      Store.setAutolock(v);
      toast('Automatische Sperre: ' + lockSel.options[lockSel.selectedIndex].text + '.');
    });
    return h('div.actions-col',
      h('p.hint', {}, 'Verschlüsselung ist aktiv (AES-256). Automatische Ordner-Backups werden mit dem Hauptschlüssel verschlüsselt und lassen sich mit ' + (Store.secretKind() === 'password' ? 'Ihrem Passwort' : 'Ihrer PIN') + ' wiederherstellen; manuelle Backups behalten ihr eigenes Passwort.'),
      biometricRow(),
      h('label.field', h('span.field-label', {}, 'Automatische Sperre bei Inaktivität'), lockSel),
      h('button.btn-plain.btn-block', { onclick: doLock }, 'Jetzt sperren'),
      h('button.btn-plain.btn-block', { onclick: changePinFlow }, 'PIN / Passwort ändern')
    );
  }

  Store.onChange(function () { /* Persistenz läuft im Hintergrund */ });
})();
