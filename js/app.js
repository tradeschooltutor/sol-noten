/* SOL-Noten – Bildschirme und Abläufe */
(function () {
  'use strict';
  var h = UI.h, clear = UI.clear, toast = UI.toast;
  var route = { name: 'loading', params: {} };

  function go(name, params) {
    route = { name: name, params: params || {} };
    render();
    /* Neue Seite immer oben beginnen, damit der Titel sichtbar ist. */
    window.scrollTo(0, 0);
    var appEl = document.getElementById('app');
    if (appEl) appEl.scrollTop = 0;
  }

  function S() { return Store.getState(); }

  /* ================= App-Start ================= */

  var APP_VERSION = '0.14.3';

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
    Store.lock();
    go('lock');
  }

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

  var HOME_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>';
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

    if (!course.seating) course.seating = { cols: 6, positions: {} }; /* positions: studentId -> {r,c} */
    var students = cls.students.slice().sort(function (a, b) {
      return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName, 'de');
    });

    return h('div.screen',
      header('Sitzplan', { name: 'course', params: { id: course.id } }),
      courseBox(course),
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
      var cols = course.seating.cols;
      var positions = course.seating.positions;
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
        course.seating.cols = Number(colSel.value); Store.save(); render();
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
                    course.seating.positions[selectedSeatStudent] = { r: r, c: c };
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
        course.seating.positions = pos; selectedSeatStudent = null; Store.save(); render();
      }
      function clearPlan() {
        UI.confirmDialog('Sitzplan leeren?', 'Alle Platzierungen dieses Kurses werden entfernt (Fotos bleiben erhalten).', 'Leeren', true)
          .then(function (ok) { if (!ok) return; course.seating.positions = {}; selectedSeatStudent = null; Store.save(); render(); });
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

    function refreshDots() {
      UI.clear(dots);
      for (var i = 0; i < Math.max(pin.length, 4); i++) {
        dots.appendChild(h('span.pin-dot' + (i < pin.length ? '.filled' : '')));
      }
    }

    function waitCountdown() {
      var w = Store.getLockWait();
      if (w <= 0) { msg.textContent = ''; drawPad(false); return; }
      drawPad(true);
      msg.textContent = 'Zu viele Fehlversuche – bitte ' + w + ' Sekunden warten.';
      var iv = setInterval(function () {
        if (!msg.isConnected) { clearInterval(iv); return; }
        var rest = Store.getLockWait();
        if (rest <= 0) {
          clearInterval(iv);
          msg.textContent = '';
          drawPad(false);
        } else {
          msg.textContent = 'Zu viele Fehlversuche – bitte ' + rest + ' Sekunden warten.';
        }
      }, 1000);
    }

    function submit() {
      if (busy || pin.length < 4) return;
      busy = true;
      Store.unlock(pin).then(function () {
        busy = false;
        afterUnlock();
      }).catch(function (err) {
        busy = false;
        pin = '';
        refreshDots();
        if (err.waitSeconds > 0) waitCountdown();
        else {
          msg.textContent = 'Falsche PIN.' + (err.attempts >= 3 ? ' (' + err.attempts + ' Fehlversuche)' : '');
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
      UI.modal('PIN vergessen?',
        h('div', {},
          h('p', {}, 'Ohne PIN können die verschlüsselten Daten auf diesem Gerät nicht wiederhergestellt werden – es gibt bewusst keine Hintertür.'),
          h('p', {}, 'Der Weg zurück: App zurücksetzen und anschließend Ihre Backup-Datei einspielen (Passwort der Backup-Datei bzw. bei automatischen Ordner-Backups die damalige PIN erforderlich).'),
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
          msg.textContent = 'Biometrie nicht erfolgreich. Bitte PIN eingeben.';
          renderLock();
        } else {
          msg.textContent = 'Biometrie nicht erkannt (' + bioTries + '/3). Erneut versuchen oder PIN verwenden.';
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
        h('p', {}, bioActive && !showPinPad ? 'Bitte biometrisch entsperren' : 'Bitte PIN eingeben')
      ));
      container.appendChild(dots);
      container.appendChild(msg);

      if (bioActive && !showPinPad) {
        container.appendChild(h('button.btn-primary.btn-block.bio-btn', { onclick: tryBiometric },
          'Mit Fingerabdruck / Gesicht entsperren'));
        container.appendChild(h('button.btn-plain.btn-small.lock-alt', {
          onclick: function () { showPinPad = true; renderLock(); }
        }, 'Stattdessen PIN eingeben'));
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
      container.appendChild(h('button.btn-plain.btn-small.lock-forgot', { onclick: forgotPin }, 'PIN vergessen?'));
    }

    if (Store.getLockWait() > 0) { showPinPad = true; bioActive = false; }
    renderLock();
    if (Store.getLockWait() > 0) waitCountdown(); else drawPad(false);

    /* Biometrie beim Öffnen automatisch anstoßen (nur wenn keine Wartesperre aktiv). */
    if (bioActive && Store.getLockWait() <= 0) {
      setTimeout(tryBiometric, 300);
    }

    /* Physische Tastatur mithören (PC). Der Handler bleibt registriert, solange
       die Route 'lock' aktiv ist, und entfernt sich selbst, sobald die App die
       Sperrseite verlässt – unabhängig von DOM-Mutationen. */
    function onKey(ev) {
      if (route.name !== 'lock') { document.removeEventListener('keydown', onKey); return; }
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
    var status = h('p.hint');

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
      h('div.row-between',
        h('label.year-label', {}, 'Schuljahr ', yearSel),
        h('button.btn-plain.btn-small', { onclick: addYear }, '+ Schuljahr')
      ),
      courses.length === 0
        ? h('div.empty',
            h('p', {}, 'Noch kein Kurs in diesem Schuljahr.'),
            h('p.hint', {}, 'Ein Kurs ist eine Klasse in einem Fach – z. B. „AK 2026 · Fahrzeugvertriebsprozesse“.'))
        : h('div.course-grid', {}, courses.map(courseTile)),
      h('button.btn-primary.btn-block', { onclick: function () { go('editCourse', {}); } }, '+ Kurs anlegen')
    );
    return screen;

    function courseTile(c) {
      var cls = Store.classById(c.classId);
      var due = Quarters.quarterChangeDue(Store.todayISO(), c.currentQuarter, courseQuarters(c));
      return h('div.course-tile', { onclick: function () { go('course', { id: c.id }); } },
        h('div.course-tile-class', {}, cls ? cls.name : '?'),
        h('div.course-tile-subject', {}, c.subject),
        h('div.course-tile-meta', {},
          h('span.quarter-chip' + (due ? '.due' : ''), {}, c.currentQuarter + '. Quartal' + (due ? ' · Wechsel fällig' : '')),
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
    var status = h('p.hint');
    return h('div.screen',
      header('Neues Schuljahr', { name: 'home' }),
      h('div.card',
        h('label.field', h('span.field-label', {}, 'Bezeichnung'), nameInput),
        h('label.field', h('span.field-label', {}, 'Erster Schultag'), startInput),
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
        go('home');
      }
    }
  };

  /* Backup speichern – mit optionalem Passwort (verschlüsselt). */
  function exportDialog(onDone) {
    var pw1 = h('input.input', { type: 'password', autocomplete: 'new-password', placeholder: 'Passwort (empfohlen)' });
    var pw2 = h('input.input', { type: 'password', autocomplete: 'new-password', placeholder: 'Passwort wiederholen' });
    var err = h('p.hint.error-text');
    UI.modal('Backup speichern', [
      h('p.hint', {}, 'Mit Passwort wird die Datei verschlüsselt (AES-256) – empfohlen, wenn das Backup in Cloud-Ordnern oder Mails landet. Ohne Passwort wird sie im Klartext gespeichert.'),
      h('label.field', h('span.field-label', {}, 'Passwort'), pw1),
      h('label.field', h('span.field-label', {}, 'Wiederholung'), pw2),
      h('p.hint', {}, 'Wichtig: Ein vergessenes Passwort kann nicht wiederhergestellt werden – die Datei ist dann unlesbar.'),
      err
    ], [
      { label: 'Abbrechen', value: false },
      { label: 'Backup speichern', value: true, primary: true,
        validate: function () {
          if (pw1.value !== pw2.value) { err.textContent = 'Die Passwörter stimmen nicht überein.'; return false; }
          if (pw1.value && pw1.value.length < 6) { err.textContent = 'Bitte mindestens 6 Zeichen verwenden.'; return false; }
          return true;
        } }
    ]).then(function (ok) {
      if (!ok) return;
      var pw = pw1.value || null;
      Store.exportJSON(pw).then(function () {
        toast(pw ? 'Verschlüsseltes Backup wird gespeichert.' : 'Backup (unverschlüsselt) wird gespeichert.');
        render();
        if (typeof onDone === 'function') onDone();
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

  /* ================= Kurs anlegen / bearbeiten ================= */

  views.editCourse = function (p) {
    var st = S();
    var year = Store.yearById(activeYearId());
    var course = p.id ? Store.courseById(p.id) : null;

    var classSel = h('select.input');
    classSel.appendChild(h('option', { value: '' }, 'Klasse wählen …'));
    st.classes.filter(function (c) { return c.yearId === year.id; }).forEach(function (c) {
      classSel.appendChild(h('option', { value: c.id, selected: course && course.classId === c.id }, c.name));
    });
    classSel.appendChild(h('option', { value: '__new__' }, '+ Neue Klasse anlegen'));
    var newClassInput = h('input.input', { type: 'text', placeholder: 'Name der Klasse, z. B. AK 2026', style: { display: 'none' } });
    classSel.addEventListener('change', function () {
      newClassInput.style.display = classSel.value === '__new__' ? '' : 'none';
    });

    var subjectInput = h('input.input', { type: 'text', value: course ? course.subject : '', placeholder: 'z. B. Fahrzeugvertriebsprozesse' });
    var obtInput = h('input.input.input-num', { type: 'number', min: 0, max: 8, value: course ? course.numOBT : 4 });
    var kaInput = h('input.input.input-num', { type: 'number', min: 0, max: 8, value: course ? course.numKA : 2 });
    var w = course ? course.weights : { sl: 40, obt: 20, ka: 40 };
    var wSl = h('input.input.input-num', { type: 'number', min: 0, max: 100, value: w.sl });
    var wObt = h('input.input.input-num', { type: 'number', min: 0, max: 100, value: w.obt });
    var wKa = h('input.input.input-num', { type: 'number', min: 0, max: 100, value: w.ka });

    var upCritDefault = course && typeof course.uploadCriterion === 'number' ? course.uploadCriterion : 2;
    var upCritSel = h('select.input');
    st.settings.criteriaNames.forEach(function (n, i) {
      upCritSel.appendChild(h('option', { value: i, selected: i === upCritDefault }, n));
    });

    var status = h('p.hint.error-text');

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

      if (course) {
        course.classId = classId;
        course.subject = subjectInput.value.trim();
        course.numOBT = Number(obtInput.value); course.numKA = Number(kaInput.value);
        course.weights = { sl: Number(wSl.value), obt: Number(wObt.value), ka: Number(wKa.value) };
        course.uploadCriterion = Number(upCritSel.value);
      } else {
        course = {
          id: Store.uid(), yearId: year.id, classId: classId,
          subject: subjectInput.value.trim(),
          numOBT: Number(obtInput.value), numKA: Number(kaInput.value),
          weights: { sl: Number(wSl.value), obt: Number(wObt.value), ka: Number(wKa.value) },
          maxPoints: { 1: Calc.DEFAULT_MAX.slice(), 2: Calc.DEFAULT_MAX.slice(), 3: Calc.DEFAULT_MAX.slice(), 4: Calc.DEFAULT_MAX.slice() },
          currentQuarter: Quarters.quarterForDate(Store.todayISO(), year.quarters),
          portfolio: {}, quarterOverrides: null, dismissedQuarterHint: {},
          uploadCriterion: Number(upCritSel.value)
        };
        st.courses.push(course);
        Store.save();
        go('maxPoints', { id: course.id, intro: true });
        return;
      }
      Store.save();
      go('course', { id: course.id });
    }

    function delCourseFromSettings() {
      var cls = Store.classById(course.classId);
      UI.confirmDialog('Kurs löschen?',
        'Der Kurs „' + cls.name + ' · ' + course.subject + '“ und alle darin vergebenen Punkte werden gelöscht. ' +
        'Die Klasse und ihre Schülerliste bleiben erhalten.', 'Kurs löschen', true)
        .then(function (ok) {
          if (!ok) return;
          var st2 = S();
          st2.courses = st2.courses.filter(function (c) { return c.id !== course.id; });
          st2.soleiEntries = st2.soleiEntries.filter(function (e) { return e.courseId !== course.id; });
          st2.absences = (st2.absences || []).filter(function (a) { return a.courseId !== course.id; });
          st2.uploadTallies = (st2.uploadTallies || []).filter(function (t) { return t.courseId !== course.id; });
          Store.save();
          go('home');
        });
    }

    var managementSection = course
      ? [
          h('div.section-head', {}, 'Weitere Kurs-Verwaltung'),
          h('div.actions-col',
            h('button.btn-plain.btn-block', { onclick: function () { go('students', { classId: course.classId, courseId: course.id }); } },
              'Schülerliste bearbeiten (' + (Store.classById(course.classId).students.length) + ')'),
            h('button.btn-plain.btn-block', { onclick: function () { go('maxPoints', { id: course.id }); } },
              'Maximalpunkte der Kriterien (' + course.currentQuarter + '. Quartal)'),
            h('button.btn-plain.btn-block', { onclick: function () { go('quarterDates', { id: course.id }); } },
              'Quartalszeiträume dieses Kurses'),
            h('button.btn-plain.btn-block.danger-text', { onclick: delCourseFromSettings }, 'Kurs löschen')
          )
        ]
      : null;

    return h('div.screen',
      header(course ? 'Kurs-Einstellungen' : 'Kurs anlegen', p.id ? { name: 'course', params: { id: p.id } } : { name: 'home' }),
      course ? courseBox(course) : null,
      h('div.card',
        h('label.field', h('span.field-label', {}, 'Klasse'), classSel, newClassInput,
          h('p.hint', {}, 'Die Schülerliste gehört zur Klasse und wird von allen Kursen dieser Klasse gemeinsam genutzt.')),
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
    var q = course.currentQuarter;
    var quarters = courseQuarters(course);
    var due = Quarters.quarterChangeDue(Store.todayISO(), q, quarters) && !course.dismissedQuarterHint[q];

    var studentRows = pointstandRows(course, cls, q);

    return h('div.screen',
      header(cls.name + ' · ' + course.subject, { name: 'home' }),
      due ? quarterHint(course, quarters) : null,
      h('div.card.card-tight',
        h('div.row-between',
          h('span.quarter-chip.big', {}, q + '. Quartal'),
          h('span.hint', {}, UI.fmtDate(quarters[q - 1].start) + ' – ' + UI.fmtDate(quarters[q - 1].end))
        )
      ),
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
          'SoLei-Quartalsnoten'),
        h('button.btn-primary.grid-btn', { onclick: function () { go('obt', { id: course.id }); } },
          'Open Book Tests'),
        h('button.btn-primary.grid-btn', { onclick: function () { go('klausuren', { id: course.id }); } },
          'Klausuren'),
        h('button.btn-primary.grid-btn', { onclick: function () { gradesState.mode = 'class'; gradesState.studentIdx = 0; go('grades', { id: course.id }); } },
          'Notenübersicht & Zeugnisnoten'),
        h('button.btn-primary.grid-btn', { onclick: function () { go('editCourse', { id: course.id }); } },
          'Kurs-Einstellungen')
      ),
      h('div.section-head', {}, 'SoLei-Punktestand im ' + q + '. Quartal'),
      cls.students.length === 0
        ? h('div.empty', h('p', {}, 'Diese Klasse hat noch keine Schüler/innen.'))
        : h('div.card.card-list', {}, studentRows)
    );
  };

  function pointstandRows(course, cls, q) {
    return cls.students.map(function (stu) {
      var e = Store.entriesFor(course.id, stu.id, q);
      var stat = Calc.quarterStatus(e.byCriterion);
      var grade = Calc.gradeFor15(stat.sum, S().settings.grading15);
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
      go('pointstand', { id: course.id, quarter: Number(qSel.value) });
    });

    var viewToggle = h('div.view-toggle',
      h('button.view-btn.active', {}, 'Ansicht: Liste'),
      h('button.view-btn', {
        onclick: function () {
          if (!cls.students.length) return;
          go('protokoll', { courseId: course.id, studentId: cls.students[0].id, quarter: shownQ });
        }
      }, 'Ansicht: Schüler/in')
    );

    return h('div.screen',
      header('SoLei-Punktestand', { name: 'course', params: { id: course.id } }),
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
      inpDone.addEventListener('input', refresh);
      inpMissed.addEventListener('input', refresh);
      return h('div.review-row',
        h('div.review-name', nameWithPhoto(stu)),
        h('div.review-grades',
          h('div.review-cell', h('span.hint', {}, 'Erledigte Uploads'), inpDone),
          h('div.review-cell', h('span.hint', {}, 'Vergessene Uploads'), inpMissed)
        )
      );
    });

    function saveAll() {
      var bad = [];
      students.forEach(function (stu) {
        var rd = parseCount(inputs[stu.id].done.value);
        var rm = parseCount(inputs[stu.id].missed.value);
        if (!rd.ok || !rm.ok) bad.push(stu.lastName + ', ' + stu.firstName);
      });
      if (bad.length) {
        UI.modal('Ungültige Eingabe',
          h('p', {}, 'Bitte geben Sie ganze Zahlen (0 oder größer) ein. Bitte prüfen Sie: ' + bad.join('; ') + '.'));
        return;
      }
      students.forEach(function (stu) {
        var done = parseCount(inputs[stu.id].done.value).value;
        var missed = parseCount(inputs[stu.id].missed.value).value;
        Store.setUploadTally(course.id, stu.id, shownQ, done, missed);
      });
      toast('Ergebnis-Uploads (' + shownQ + '. Quartal) gespeichert.');
    }

    return h('div.screen',
      header('Ergebnis-Uploads', { name: 'course', params: { id: course.id } }),
      courseBox(course),
      intro,
      h('div.capture-bar', qSel, h('span')),
      students.length === 0
        ? h('div.empty', h('p', {}, 'Diese Klasse hat noch keine Schüler/innen.'))
        : h('div.card.card-list', {}, rows),
      h('div.actions-col',
        h('button.btn-primary.btn-block', { onclick: saveAll }, 'Uploads speichern'))
    );
  };

  function quarterHint(course, quarters) {
    var q = course.currentQuarter;
    return h('div.banner-info', {},
      h('span', {}, 'Das ' + q + '. Quartal ist laut Plan beendet (' + UI.fmtDate(quarters[q - 1].end) + '). Tragen Sie die Portfolionoten ein und wechseln Sie dann in das ' + (q + 1) + '. Quartal.'),
      h('div.banner-actions',
        h('button.btn-small.btn-primary', { onclick: function () {
          go('quarterReview', { id: course.id, quarter: q, advance: true });
        } }, 'Quartal abschließen'),
        h('button.btn-small.btn-plain', { onclick: function () {
          course.dismissedQuarterHint[q] = true; Store.save(); render();
        } }, 'Später')
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
      header('Maximalpunkte', { name: 'course', params: { id: course.id } }),
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
      go('quarterReview', { id: course.id, quarter: Number(qSel.value), advance: p.advance });
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
      }
      inp.addEventListener('input', refreshSolei);

      var row = h('div.review-row',
        h('div.review-name.name-with-photo',
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
          h('div.review-cell', h('span.hint', {}, 'Portfolio/mdl. Prüfung'), inp),
          h('div.review-cell', h('span.hint', {}, 'SoLei-Note'), soleiCell)
        )
      );
      refreshSolei();
      return row;
    });

    function saveAll() {
      var bad = [];
      var result = {};
      students.forEach(function (stu) {
        var r = parseGrade(inputs[stu.id].value);
        if (!r.ok) { bad.push(stu.lastName + ', ' + stu.firstName); return; }
        if (r.value != null) result[stu.id] = r.value;
      });
      if (bad.length) {
        UI.modal('Ungültige Portfolionote',
          h('p', {}, 'Portfolionoten müssen zwischen 1 und 6 liegen. Bitte prüfen Sie: ' + bad.join('; ') + '.'));
        return false;
      }
      course.portfolio[q] = result;
      Store.save();
      toast('Portfolionoten für das ' + q + '. Quartal gespeichert.');
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
        students.length ? rows : h('div.empty', h('p', {}, 'Diese Klasse hat noch keine Schüler/innen.'))),
      h('div.actions-col',
        h('button.btn-primary.btn-block', { onclick: saveAll }, 'Portfolionoten speichern'),
        p.advance && q < 4 && q === course.currentQuarter
          ? h('button.btn-plain.btn-block', { onclick: function () {
              if (!saveAll()) return;
              course.currentQuarter = q + 1;
              Store.save();
              toast('Der Kurs ist jetzt im ' + (q + 1) + '. Quartal.');
              go('maxPoints', { id: course.id, intro: true });
            } }, 'Speichern und ins ' + (q + 1) + '. Quartal wechseln')
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

    var hjSeg = h('div.seg', {}, [1, 2].map(function (v) {
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
      inp.addEventListener('input', refresh);
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

    function saveAll() {
      var bad = [];
      var out = {};
      students.forEach(function (stu) {
        var r = parsePct(inputs[stu.id].value);
        if (!r.ok) { bad.push(stu.lastName + ', ' + stu.firstName); return; }
        if (r.value != null) out[stu.id] = r.value;
      });
      if (bad.length) {
        UI.modal('Ungültiger Prozentwert',
          h('p', {}, 'Prozentwerte müssen zwischen 0 und 100 liegen. Bitte prüfen Sie: ' + bad.join('; ') + '.'));
        return false;
      }
      course.obt[hj][idx] = out;
      Store.save();
      toast('OBT ' + (idx + 1) + ' (' + hj + '. Halbjahr) gespeichert.');
      return true;
    }

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
        h('button.btn-primary.btn-block', { onclick: saveAll }, 'Speichern'),
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

    var hjSeg = h('div.seg', {}, [1, 2].map(function (v) {
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
    maxInput.addEventListener('input', refreshAll);

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
      inp.addEventListener('input', refresh);
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

    function saveAll() {
      var maxR = parseNum(maxInput.value);
      if (!maxR.ok || (maxR.value != null && maxR.value <= 0)) {
        UI.modal('Ungültige Maximalpunktzahl', h('p', {}, 'Bitte geben Sie eine Zahl größer 0 ein.'));
        return;
      }
      var max = maxR.value;
      var bad = [], anyPoints = false, out = {};
      students.forEach(function (stu) {
        var r = parseNum(inputs[stu.id].value);
        if (!r.ok || (r.value != null && max != null && r.value > max)) {
          bad.push(stu.lastName + ', ' + stu.firstName); return;
        }
        if (r.value != null) { out[stu.id] = r.value; anyPoints = true; }
      });
      if (bad.length) {
        UI.modal('Ungültige Punkteeingabe',
          h('p', {}, 'Punkte müssen zwischen 0 und der Maximalpunktzahl liegen. Bitte prüfen Sie: ' + bad.join('; ') + '.'));
        return;
      }
      if (anyPoints && max == null) {
        UI.modal('Maximalpunktzahl fehlt',
          h('p', {}, 'Bitte tragen Sie zuerst die Maximalpunktzahl der Klausur ein – ohne sie können Prozent und Note nicht berechnet werden.'));
        return;
      }
      course.ka[hj][idx] = { maxPoints: max, points: out };
      Store.save();
      toast('Klausur ' + (idx + 1) + ' (' + hj + '. Halbjahr) gespeichert.');
    }

    return h('div.screen',
      header('Klausuren', { name: 'course', params: { id: course.id } }),
      courseBox(course),
      h('div.card.card-tight',
        h('div.row-between', hjSeg, null),
        tabs,
        h('label.field',
          h('span.field-label', {}, 'Maximalpunktzahl dieser Klausur'), maxInput),
        h('p.hint', {}, 'Je Schüler/in die erreichten Punkte eintragen – Prozent und Note (Prozent-Bewertungsspiegel) berechnet die App.')
      ),
      h('div.card.card-list', {},
        students.length ? rows : h('div.empty', h('p', {}, 'Diese Klasse hat noch keine Schüler/innen.'))),
      h('button.btn-primary.btn-block', { onclick: saveAll }, 'Speichern')
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
      '.report-table .val.up{background:#e4f2e8;}' +
      '.report-table .val.down{background:#f9e9e7;}' +
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
      return inp;
    }

    var body = rowsData.map(function (r) {
      var cells = [h('td.sticky-col.name-cell', {
        onclick: function () { go('report', { id: course.id, studentId: r.stu.id }); }
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

    var table = h('table.grades-table',
      groupRow(),
      h('tr', {}, headCells()),
      body
    );

    function parseZeugnis(str) {
      var s = String(str).trim().replace(',', '.');
      if (s === '') return { ok: true, value: null };
      var v = Number(s);
      if (isNaN(v) || v < 1 || v > 6) return { ok: false };
      return { ok: true, value: v };
    }

    function saveZeugnis() {
      var bad = [];
      students.forEach(function (stu) {
        var hj = parseZeugnis(zInputs[stu.id].hj.value);
        var jahr = parseZeugnis(zInputs[stu.id].jahr.value);
        if (!hj.ok || !jahr.ok) { bad.push(stu.lastName + ', ' + stu.firstName); return; }
        if (hj.value == null && jahr.value == null) { delete course.zeugnis[stu.id]; return; }
        course.zeugnis[stu.id] = { hj: hj.value, jahr: jahr.value };
      });
      if (bad.length) {
        UI.modal('Ungültige Zeugnisnote',
          h('p', {}, 'Zeugnisnoten müssen zwischen 1 und 6 liegen. Bitte prüfen Sie: ' + bad.join('; ') + '.'));
        return;
      }
      Store.save();
      toast('Zeugnisnoten gespeichert.');
    }

    /* --- Exporte --- */
    function exportRows() {
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
        [1, 2].forEach(function (hj) { r.obtG[hj].forEach(function (v) { row.push(v); }); });
        row.push(r.obtHJ1, r.obtHJ2, r.obtSJ);
        [1, 2].forEach(function (hj) { r.kaG[hj].forEach(function (v) { row.push(v); }); });
        row.push(r.kaHJ1, r.kaHJ2, r.kaSJ, r.zHJ1, r.zHJ2, r.zSJ, r.tendenz || null, r.zeugnisHJ, r.zeugnisJahr);
        out.push(row);
      });
      return out;
    }

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

    var viewToggle = h('div.view-toggle.grades-toggle',
      h('button.view-btn' + (gradesState.mode === 'class' ? '.active' : ''), {
        onclick: function () { if (gradesState.mode !== 'class') { gradesState.mode = 'class'; render(); } }
      }, 'Ansicht: Klasse'),
      h('button.view-btn' + (gradesState.mode === 'student' ? '.active' : ''), {
        onclick: function () { if (gradesState.mode !== 'student') { gradesState.mode = 'student'; render(); } }
      }, 'Ansicht: Schüler/in')
    );

    if (gradesState.mode === 'student' && students.length) {
      if (gradesState.studentIdx >= students.length) gradesState.studentIdx = 0;
      var si = gradesState.studentIdx;
      var stu = students[si];
      var reportContent = buildReportContent(course, stu);
      return h('div.screen.screen-wide',
        header('Notenübersicht & Zeugnisnoten', { name: 'course', params: { id: course.id } }),
        courseBox(course),
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
        h('div.actions-col',
          h('button.btn-plain.btn-block', { onclick: function () { printNode(reportContent.cloneNode(true), false, yearShort(year) + ' ' + stu.lastName + ' ' + stu.firstName + ' Notenübersicht'); } },
            'Drucken / als PDF speichern'))
      );
    }

    return h('div.screen.screen-wide',
      header('Notenübersicht & Zeugnisnoten', { name: 'course', params: { id: course.id } }),
        courseBox(course),
      h('div.grades-toggle-row', viewToggle),
      h('p.hint.grades-hint',
        'Hier vergeben Sie die ', h('strong', {}, 'Zeugnisnoten für das HJ-Zeugnis und das Jahreszeugnis'),
        ' (in der Liste ganz rechts)!', h('br'),
        h('strong', {}, 'Tippen Sie auf einen Namen'), ', um in dessen Einzelansicht zu wechseln.'),
      h('div.table-scroll', {}, table),
      h('div.actions-col',
        h('button.btn-primary.btn-block', { onclick: saveZeugnis }, 'Zeugnisnoten speichern'),
        h('button.btn-plain.btn-block', { onclick: doExcel }, 'Als Excel-Datei exportieren'),
        h('button.btn-plain.btn-block', { onclick: doPrint }, 'Drucken / als PDF speichern')
      )
    );
  };

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

  views.report = function (p) {
    var course = Store.courseById(p.id);
    var cls = Store.classById(course.classId);
    var year = Store.yearById(course.yearId);
    var students = cls.students.slice().sort(function (a, b) {
      return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName, 'de');
    });
    var si = Math.max(0, students.findIndex(function (s) { return s.id === p.studentId; }));
    var stu = students[si];

    var reportContent = buildReportContent(course, stu);

    function doReportPrint() {
      printNode(reportContent.cloneNode(true), false, yearShort(year) + ' ' + stu.lastName + ' ' + stu.firstName + ' Notenübersicht');
    }

    return h('div.screen',
      header('Notenausdruck', { name: 'grades', params: { id: course.id } },
        h('button.btn-small.btn-plain', { onclick: doReportPrint }, 'Drucken')),
      courseBox(course),
      h('div.crit-nav',
        h('button.icon-btn', { onclick: function () {
          go('report', { id: course.id, studentId: students[(si + students.length - 1) % students.length].id });
        } }, '‹'),
        h('span.crit-current', {}, stu.lastName + ', ' + stu.firstName),
        h('button.icon-btn', { onclick: function () {
          go('report', { id: course.id, studentId: students[(si + 1) % students.length].id });
        } }, '›')
      ),
      h('div.card', {}, reportContent),
      h('button.btn-primary.btn-block', { onclick: doReportPrint },
        'Drucken / als PDF speichern (für das Notengespräch)')
    );
  };

  /* ================= Unentschuldigte Fehlzeiten ================= */

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
      toast(stu.lastName + ': Fehlzeit am ' + UI.fmtDate(d) + ' erfasst – 0 Punkte in allen Kriterien (' +
        quarter + '. Quartal).', function () { Store.removeAbsence(a.id); render(); });
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

    /* ---- Ansicht: Schüler/in (alle Werktage des Quartals als Chips) ---- */
    function studentView() {
      var qq = quarters[shownQ - 1];
      var days = weekdaysBetween(qq.start, qq.end); /* alle Tage außer Sonntag */

      if (!days.length) {
        return h('div.card', h('p.hint', {}, 'Für das ' + shownQ + '. Quartal ist kein gültiger Zeitraum hinterlegt. ' +
          'Bitte prüfen Sie die Quartalszeiträume in den Kurs-Einstellungen.'));
      }

      var blocks = students.map(function (stu) {
        var absSet = {};
        Store.absencesFor(course.id, stu.id, shownQ).forEach(function (a) { absSet[a.date] = a.id; });
        var count = Object.keys(absSet).length;

        var chips = days.map(function (iso) {
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
            '(Sonntage sind ausgelassen). Ein markierter Tag vergibt automatisch 0 Punkte in allen fünf ' +
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
      header('Quartalszeiträume', { name: 'course', params: { id: course.id } }),
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
    var back = p.courseId ? { name: 'course', params: { id: p.courseId } } : { name: 'home' };

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
        h('button.btn-plain.btn-block', { onclick: importStudents }, 'Aus Excel einfügen (Kopieren & Einfügen)')
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
            if (co.seating && co.seating.positions) delete co.seating.positions[stu.id];
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

  var captureState = { mode: 'criterion', criterion: 0, studentIdx: 0, date: null };

  views.capture = function (p) {
    var course = Store.courseById(p.id);
    var cls = Store.classById(course.classId);
    var names = S().settings.criteriaNames;
    var q = course.currentQuarter;
    if (!captureState.date) captureState.date = Store.todayISO();
    var students = cls.students.slice().sort(function (a, b) {
      return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName, 'de');
    });

    if (students.length === 0) {
      return h('div.screen',
        header('SoLei-Punkte', { name: 'course', params: { id: course.id } }),
        courseBox(course),
        h('div.empty', h('p', {}, 'Diese Klasse hat noch keine Schüler/innen.'),
          h('button.btn-primary', { onclick: function () { go('students', { classId: cls.id, courseId: course.id }); } },
            'Schülerliste öffnen'))
      );
    }

    var dateInput = h('input.input.date-inline', { type: 'date', value: captureState.date });
    dateInput.addEventListener('change', function () { captureState.date = dateInput.value; });

    var viewToggle = h('div.view-toggle',
      h('button.view-btn' + (captureState.mode === 'criterion' ? '.active' : ''), {
        onclick: function () { if (captureState.mode !== 'criterion') { captureState.mode = 'criterion'; render(); } }
      }, 'Ansicht: Kriterium'),
      h('button.view-btn' + (captureState.mode === 'student' ? '.active' : ''), {
        onclick: function () { if (captureState.mode !== 'student') { captureState.mode = 'student'; render(); } }
      }, 'Ansicht: Schüler/in')
    );

    var body = captureState.mode === 'criterion'
      ? criterionMode()
      : studentMode();

    var backTarget = p.from === 'seating'
      ? { name: 'seating', params: { id: course.id, tab: 'plan', mode: 'grade' } }
      : { name: 'course', params: { id: course.id } };

    return h('div.screen.screen-capture',
      header('SoLei-Punkte vergeben: ' + q + '. Quartal', backTarget,
        h('span')),
      courseBox(course),
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

      var rows = students.map(function (stu) {
        var e = Store.entriesFor(course.id, stu.id, q);
        var stat = Calc.quarterStatus(e.byCriterion);
        var grade = Calc.gradeFor15(stat.sum, S().settings.grading15);
        var todays = e.list.filter(function (x) {
          return x.criterion === ci && x.date === captureState.date;
        });
        var lastToday = todays.length ? todays[todays.length - 1] : null;

        return h('div.tap-row',
          photoTile(stu, { small: true }),
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
        return h('div.tap-row',
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
        h('div.card.card-list', {}, rows)
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
      go('protokoll', { courseId: course.id, studentId: stu.id, quarter: Number(qSel.value) });
    });
    var shownQ = p.quarter || q;
    var filterCrit = (p.crit != null) ? p.crit : null;

    var viewToggle = h('div.view-toggle',
      h('button.view-btn', {
        onclick: function () { go('pointstand', { id: course.id, quarter: shownQ }); }
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
        crit: (filterCrit === ci ? null : ci) });
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
      chartCard = h('div.card.card-tight',
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
      header('SoLei-Punktestand', { name: 'course', params: { id: course.id } },
        h('button.btn-small.btn-plain', { onclick: printCharts }, 'Diagramme drucken')),
      courseBox(course),
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
      h('div.card.card-tight',
        h('p.hint', {}, 'Tipp: Ein Kriterium antippen filtert die Vergaben und zeigt die Entwicklung als Diagramm.'),
        critSummary,
        gradeLine,
        stat.rated > 0 && stat.rated < 5
          ? h('p.hint', {}, 'Erst ' + stat.rated + ' von 5 Kriterien bewertet – der Notenstand ist ein Zwischenstand.')
          : null
      ),
      chartCard,
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
              .catch(function () { throw new Error('Falsche PIN oder beschädigte Datei.'); });
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

    function askPassword(fileName, isPin) {
      var label = isPin ? 'PIN' : 'Passwort';
      var pw = h('input.input', { type: 'password',
        inputmode: isPin ? 'numeric' : null,
        autocomplete: 'current-password', placeholder: label });
      return UI.modal('Verschlüsseltes Backup',
        [h('p.hint', {}, isPin
          ? 'Die Datei „' + fileName + '“ ist ein automatisches Backup und mit einer PIN verschlüsselt. Bitte geben Sie die PIN ein, die beim Erstellen aktiv war.'
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

      h('div.section-head', {}, 'PIN-Sperre & Verschlüsselung'),
      h('div.card', {}, securitySection()),

      h('div.section-head', {}, 'Datensicherung'),
      h('div.card',
        h('p.hint', {}, st.settings.lastExport
          ? 'Letztes Backup: ' + UI.fmtDate(st.settings.lastExport.slice(0, 10))
          : 'Es wurde noch kein Backup erstellt.'),
        h('div.actions-col',
          h('button.btn-primary.btn-block', { onclick: function () { exportDialog(); } },
            'Backup-Datei jetzt speichern (mit Passwort: verschlüsselt)'),
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
        fileInput,
        snapHost
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
        gradeTable,
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
    var pins = pinInputPair(['PIN festlegen', 'PIN wiederholen']);
    UI.modal('PIN festlegen', [
      h('p', {}, 'Zum Schutz der Schülerdaten verschlüsselt SOL-Noten alle Daten auf diesem Gerät. ' +
        'Dazu legen Sie jetzt eine PIN fest. Nach Eingabe der PIN werden alle Daten durch die App verschlüsselt.'),
      h('p.hint', {}, 'Die App fragt die PIN künftig beim Start ab. Wichtig: Bei Verlust der PIN sind die Daten nur über ein Backup wiederherstellbar – es gibt bewusst keine Hintertür.')
    ].concat(pins.nodes), [
      { label: 'PIN festlegen und verschlüsseln', value: true, primary: true, validate: pins.validate }
    ], { mandatory: true }).then(function () {
      Store.enableEncryption(pins.value()).then(function () {
        UI.modal('Verschlüsselung aktiv', [
          h('p', {}, 'Alle Daten auf diesem Gerät sind jetzt verschlüsselt.'),
          h('p.hint', {}, 'Empfehlung: Sobald Sie Schüler und Noten erfasst haben, sichern Sie Ihre Daten über „Einstellungen → Backup-Datei jetzt speichern“. Bewahren Sie PIN und Backup an einem sicheren Ort auf (z. B. in einem Passwort-Manager).')
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

  function pinInputPair(labels) {
    var p1 = h('input.input', { type: 'password', inputmode: 'numeric', autocomplete: 'new-password', placeholder: '4–8 Ziffern' });
    var p2 = h('input.input', { type: 'password', inputmode: 'numeric', autocomplete: 'new-password', placeholder: 'Wiederholung' });
    var err = h('p.hint.error-text');
    function validate() {
      if (!/^\d{4,8}$/.test(p1.value)) { err.textContent = 'Die PIN muss aus 4 bis 8 Ziffern bestehen.'; return false; }
      if (p1.value !== p2.value) { err.textContent = 'Die PINs stimmen nicht überein.'; return false; }
      return true;
    }
    return { nodes: [
      h('label.field', h('span.field-label', {}, labels[0]), p1),
      h('label.field', h('span.field-label', {}, labels[1]), p2),
      err
    ], value: function () { return p1.value; }, validate: validate };
  }

  function enableEncryptionFlow() {
    UI.modal('PIN-Sperre einrichten – Schritt 1 von 2',
      h('div', {},
        h('p', {}, 'Bevor die Verschlüsselung aktiviert wird, verlangt die App ein frisches Backup. Denn es gilt: Ohne PIN gibt es keinen Zugriff auf die Daten – der einzige Rettungsweg ist Ihre Backup-Datei.'),
        h('p.hint', {}, 'Bitte notieren Sie PIN und Backup-Passwort an einem sicheren Ort, z. B. in einem Passwort-Manager.')
      ), [
        { label: 'Abbrechen', value: false },
        { label: 'Backup jetzt speichern', value: true, primary: true }
      ]).then(function (ok) {
        if (!ok) return;
        exportDialog(function () { setTimeout(pinStep, 300); });
      });

    function pinStep() {
      var pins = pinInputPair(['Neue PIN', 'PIN wiederholen']);
      UI.modal('PIN-Sperre einrichten – Schritt 2 von 2',
        [h('p.hint', {}, 'Die Datenbank wird mit einem Hauptschlüssel verschlüsselt (AES-256), den Ihre PIN entsperrt. Die App fragt die PIN künftig beim Start ab.')].concat(pins.nodes),
        [
          { label: 'Abbrechen', value: false },
          { label: 'Verschlüsselung aktivieren', value: true, primary: true, validate: pins.validate }
        ]).then(function (ok) {
          if (!ok) return;
          Store.enableEncryption(pins.value()).then(function () {
            toast('Verschlüsselung ist aktiv. Die App fragt die PIN künftig beim Start ab.');
            render();
          }).catch(function (e) {
            UI.modal('Aktivierung fehlgeschlagen', h('p', {}, e.message));
          });
        });
    }
  }

  function changePinFlow() {
    var oldPin = h('input.input', { type: 'password', inputmode: 'numeric', autocomplete: 'current-password', placeholder: 'Aktuelle PIN' });
    var pins = pinInputPair(['Neue PIN', 'Neue PIN wiederholen']);
    UI.modal('PIN ändern',
      [h('label.field', h('span.field-label', {}, 'Aktuelle PIN'), oldPin)].concat(pins.nodes),
      [
        { label: 'Abbrechen', value: false },
        { label: 'PIN ändern', value: true, primary: true, validate: pins.validate }
      ]).then(function (ok) {
        if (!ok) return;
        Store.changePin(oldPin.value, pins.value()).then(function () {
          toast('PIN wurde geändert.');
        }).catch(function () {
          UI.modal('PIN ändern fehlgeschlagen', h('p', {}, 'Die aktuelle PIN ist nicht korrekt.'));
        });
      });
  }

  function disableEncryptionFlow() {
    var pin = h('input.input', { type: 'password', inputmode: 'numeric', placeholder: 'PIN' });
    UI.modal('Verschlüsselung deaktivieren',
      [h('p', {}, 'Die Daten werden wieder unverschlüsselt auf dem Gerät gespeichert und die PIN-Abfrage entfällt.'),
       h('label.field', h('span.field-label', {}, 'PIN zur Bestätigung'), pin)],
      [
        { label: 'Abbrechen', value: false },
        { label: 'Deaktivieren', value: true, danger: true }
      ]).then(function (ok) {
        if (!ok) return;
        Store.disableEncryption(pin.value).then(function () {
          toast('Verschlüsselung wurde deaktiviert.');
          render();
        }).catch(function () {
          UI.modal('Deaktivieren fehlgeschlagen', h('p', {}, 'Die PIN ist nicht korrekt.'));
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
            Store.disableBiometrics().then(function () { toast('Biometrie deaktiviert.'); draw(true); });
          } }, 'Deaktivieren')));
      } else {
        host.appendChild(h('div.actions-col',
          h('p.hint', {}, 'Bequemer entsperren: Statt der PIN können Sie Fingerabdruck oder Gesichtserkennung dieses Geräts nutzen. Die PIN bleibt weiterhin gültig. Sicherheit und Verschlüsselung bleiben unverändert – die Biometrie ist nur ein bequemer Zugang.'),
          h('button.btn-plain.btn-block', { onclick: setupBio }, 'Mit Fingerabdruck / Gesicht entsperren einrichten')));
      }
    }
    function setupBio() {
      var pin = h('input.input', { type: 'password', inputmode: 'numeric', placeholder: 'PIN' });
      UI.modal('Biometrie einrichten',
        [h('p.hint', {}, 'Bitte bestätigen Sie einmal Ihre PIN. Danach richtet das Gerät die biometrische Entsperrung ein.'),
         h('label.field', h('span.field-label', {}, 'PIN'), pin)],
        [{ label: 'Abbrechen', value: false }, { label: 'Weiter', value: true, primary: true }]
      ).then(function (ok) {
        if (!ok) return;
        Store.enableBiometrics(pin.value).then(function () {
          toast('Biometrische Entsperrung ist aktiv.');
          draw(true);
        }).catch(function (e) {
          UI.modal('Einrichtung nicht möglich', h('p.prewrap', {},
            /Falsche PIN/.test(e.message) ? 'Die PIN ist nicht korrekt.' : e.message));
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
        h('p.hint', {}, 'Schützt die Daten auf diesem Gerät: Die Datenbank wird verschlüsselt (AES-256) und die App beim Start mit einer PIN entsperrt. Wichtig: Bei vergessener PIN sind die Gerätedaten nur über ein Backup wiederherstellbar – die Einrichtung verlangt deshalb zuerst ein frisches Backup.'),
        h('button.btn-primary.btn-block', { onclick: enableEncryptionFlow }, 'PIN-Sperre einrichten')
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
      h('p.hint', {}, 'Verschlüsselung ist aktiv (AES-256). Automatische Ordner-Backups werden mit dem Hauptschlüssel verschlüsselt und lassen sich mit Ihrer PIN wiederherstellen; manuelle Backups behalten ihr eigenes Passwort.'),
      biometricRow(),
      h('label.field', h('span.field-label', {}, 'Automatische Sperre bei Inaktivität'), lockSel),
      h('button.btn-plain.btn-block', { onclick: doLock }, 'Jetzt sperren'),
      h('button.btn-plain.btn-block', { onclick: changePinFlow }, 'PIN ändern'),
      h('button.btn-plain.btn-block.danger-text', { onclick: disableEncryptionFlow }, 'Verschlüsselung deaktivieren')
    );
  }

  Store.onChange(function () { /* Persistenz läuft im Hintergrund */ });
})();
