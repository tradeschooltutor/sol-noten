/* SOL-Noten – Bildschirme und Abläufe */
(function () {
  'use strict';
  var h = UI.h, clear = UI.clear, toast = UI.toast;
  var route = { name: 'loading', params: {} };

  function go(name, params) { route = { name: name, params: params || {} }; render(); }

  function S() { return Store.getState(); }

  /* ================= App-Start ================= */

  Store.init().then(function () {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
    if (!S().settings.bundesland || S().schoolYears.length === 0) go('setup');
    else go('home');
  }).catch(function (e) {
    document.body.textContent = 'Die App konnte nicht starten: ' + e.message;
  });

  /* ================= Grundgerüst ================= */

  function render() {
    var appEl = document.getElementById('app');
    clear(appEl);
    var view = views[route.name];
    if (view) appEl.appendChild(view(route.params));
  }

  function header(title, backTo, extra) {
    return h('header.topbar', {},
      backTo
        ? h('button.icon-btn', { onclick: function () { go(backTo.name, backTo.params); }, 'aria-label': 'Zurück' }, '‹')
        : h('span.logo-dot', {}, ''),
      h('h1.topbar-title', {}, title),
      extra || (route.name !== 'settings'
        ? h('button.icon-btn', { onclick: function () { go('settings', { back: route }); }, 'aria-label': 'Einstellungen' }, '⚙')
        : h('span'))
    );
  }

  var views = {};

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
        go('home');
      }
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
      h('button.btn-small.btn-primary', { onclick: function () { Store.exportJSON(); render(); } }, 'Jetzt sichern')
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
      } else {
        course = {
          id: Store.uid(), yearId: year.id, classId: classId,
          subject: subjectInput.value.trim(),
          numOBT: Number(obtInput.value), numKA: Number(kaInput.value),
          weights: { sl: Number(wSl.value), obt: Number(wObt.value), ka: Number(wKa.value) },
          maxPoints: { 1: Calc.DEFAULT_MAX.slice(), 2: Calc.DEFAULT_MAX.slice(), 3: Calc.DEFAULT_MAX.slice(), 4: Calc.DEFAULT_MAX.slice() },
          currentQuarter: Quarters.quarterForDate(Store.todayISO(), year.quarters),
          portfolio: {}, quarterOverrides: null, dismissedQuarterHint: {}
        };
        st.courses.push(course);
      }
      Store.save();
      go('course', { id: course.id });
    }

    return h('div.screen',
      header(course ? 'Kurs bearbeiten' : 'Kurs anlegen', p.id ? { name: 'course', params: { id: p.id } } : { name: 'home' }),
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
          h('div.field-row',
            h('label.field', h('span.hint', {}, 'Sonstige Leistungen'), wSl),
            h('label.field', h('span.hint', {}, 'Open Book Tests'), wObt),
            h('label.field', h('span.hint', {}, 'Klausuren'), wKa)
          )
        ),
        status,
        h('button.btn-primary.btn-block', { onclick: saveCourse }, course ? 'Änderungen speichern' : 'Kurs anlegen')
      )
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

    var studentRows = cls.students.map(function (stu) {
      var e = Store.entriesFor(course.id, stu.id, q);
      var stat = Calc.quarterStatus(e.byCriterion);
      var grade = Calc.gradeFor15(stat.sum, S().settings.grading15);
      return h('div.student-row', { onclick: function () { go('protokoll', { courseId: course.id, studentId: stu.id }); } },
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

    return h('div.screen',
      header(cls.name + ' · ' + course.subject, { name: 'home' }),
      due ? quarterHint(course, quarters) : null,
      h('div.card.card-tight',
        h('div.row-between',
          h('span.quarter-chip.big', {}, q + '. Quartal'),
          h('span.hint', {}, UI.fmtDate(quarters[q - 1].start) + ' – ' + UI.fmtDate(quarters[q - 1].end))
        ),
        h('button.btn-primary.btn-block.btn-big', { onclick: function () { go('capture', { id: course.id }); } },
          'SoLei-Punkte vergeben')
      ),
      h('div.section-head', {}, 'Punktestand im ' + q + '. Quartal'),
      cls.students.length === 0
        ? h('div.empty', h('p', {}, 'Diese Klasse hat noch keine Schüler/innen.'))
        : h('div.card.card-list', {}, studentRows),
      h('div.actions-col',
        h('button.btn-plain.btn-block', { onclick: function () { go('students', { classId: cls.id, courseId: course.id }); } },
          'Schülerliste bearbeiten (' + cls.students.length + ')'),
        h('button.btn-plain.btn-block', { onclick: function () { go('maxPoints', { id: course.id }); } },
          'Maximalpunkte der Kriterien (' + q + '. Quartal)'),
        h('button.btn-plain.btn-block', { onclick: function () { go('quarterDates', { id: course.id }); } },
          'Quartalszeiträume dieses Kurses'),
        h('button.btn-plain.btn-block', { onclick: function () { go('editCourse', { id: course.id }); } },
          'Kurs-Einstellungen'),
        h('button.btn-plain.btn-block.danger-text', { onclick: delCourse }, 'Kurs löschen')
      )
    );

    function delCourse() {
      UI.confirmDialog('Kurs löschen?',
        'Der Kurs „' + cls.name + ' · ' + course.subject + '“ und alle darin vergebenen Punkte werden gelöscht. ' +
        'Die Klasse und ihre Schülerliste bleiben erhalten.', 'Kurs löschen', true)
        .then(function (ok) {
          if (!ok) return;
          var st = S();
          st.courses = st.courses.filter(function (c) { return c.id !== course.id; });
          st.soleiEntries = st.soleiEntries.filter(function (e) { return e.courseId !== course.id; });
          Store.save();
          go('home');
        });
    }
  };

  function quarterHint(course, quarters) {
    var q = course.currentQuarter;
    return h('div.banner-info', {},
      h('span', {}, 'Das ' + q + '. Quartal ist laut Plan beendet (' + UI.fmtDate(quarters[q - 1].end) + '). In das ' + (q + 1) + '. Quartal wechseln?'),
      h('div.banner-actions',
        h('button.btn-small.btn-primary', { onclick: function () {
          course.currentQuarter = q + 1; Store.save(); render();
          toast('Der Kurs ist jetzt im ' + (q + 1) + '. Quartal.');
        } }, 'Jetzt wechseln'),
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

    var qSel = h('select.input', { style: { maxWidth: '10rem' } });
    [1, 2, 3, 4].forEach(function (n) {
      qSel.appendChild(h('option', { value: n, selected: n === q }, n + '. Quartal'));
    });
    qSel.addEventListener('change', function () {
      q = Number(qSel.value); current = course.maxPoints[q].slice(); redraw();
    });

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
    }
    redraw();

    return h('div.screen',
      header('Maximalpunkte', { name: 'course', params: { id: course.id } }),
      h('div.card',
        h('div.row-between', qSel, sumEl),
        h('p.hint', {}, 'Jedes Kriterium kann 1,5 / 3 / 4,5 oder 6 Maximalpunkte erhalten. Die Summe muss immer 15 Punkte ergeben. Die Tipp-Stufen ergeben sich automatisch (Maximum, ⅔, ⅓, 0).'),
        rowsHost,
        status,
        h('button.btn-primary.btn-block', { onclick: function () {
          var v = Calc.validateMaxPoints(current);
          if (!v.ok) { status.textContent = v.msg; return; }
          course.maxPoints[q] = current.slice();
          Store.save();
          toast('Maximalpunkte für das ' + q + '. Quartal gespeichert.');
          go('course', { id: course.id });
        } }, 'Speichern')
      )
    );
  };

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
        h('div.empty', h('p', {}, 'Diese Klasse hat noch keine Schüler/innen.'),
          h('button.btn-primary', { onclick: function () { go('students', { classId: cls.id, courseId: course.id }); } },
            'Schülerliste öffnen'))
      );
    }

    var dateInput = h('input.input.date-inline', { type: 'date', value: captureState.date });
    dateInput.addEventListener('change', function () { captureState.date = dateInput.value; });

    var modeBtn = h('button.btn-plain.btn-small', {
      onclick: function () {
        captureState.mode = captureState.mode === 'criterion' ? 'student' : 'criterion';
        render();
      }
    }, captureState.mode === 'criterion' ? 'Ansicht: Kriterium' : 'Ansicht: Schüler/in');

    var body = captureState.mode === 'criterion'
      ? criterionMode()
      : studentMode();

    return h('div.screen.screen-capture',
      header(q + '. Quartal · Punkte vergeben', { name: 'course', params: { id: course.id } },
        h('span')),
      h('div.capture-bar',
        h('label.hint', {}, 'Datum ', dateInput),
        modeBtn
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
          h('span.crit-current', {}, stu.lastName + ', ' + stu.firstName,
            h('span.hint.block', {},
              Calc.fmt(stat.sum, 1) + ' / 15' + (stat.rated > 0 ? ' · Note ' + Calc.fmt(grade.g) : ''))),
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

    var qSel = h('select.input', { style: { maxWidth: '10rem' } });
    [1, 2, 3, 4].forEach(function (n) {
      qSel.appendChild(h('option', { value: n, selected: n === (p.quarter || q) }, n + '. Quartal'));
    });
    qSel.addEventListener('change', function () {
      go('protokoll', { courseId: course.id, studentId: stu.id, quarter: Number(qSel.value) });
    });
    var shownQ = p.quarter || q;

    var e = Store.entriesFor(course.id, stu.id, shownQ);
    var stat = Calc.quarterStatus(e.byCriterion);
    var grade = Calc.gradeFor15(stat.sum, S().settings.grading15);

    var critSummary = h('div.crit-summary', {}, names.map(function (n, ci) {
      return h('div.crit-summary-item',
        h('span.hint', {}, n),
        h('strong', {}, stat.averages[ci] === null ? '–' : 'ø ' + Calc.fmt(stat.averages[ci], 1))
      );
    }));

    var list = e.list.slice().sort(function (a, b) {
      return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
    }).map(function (entry) {
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

    return h('div.screen',
      header(stu.lastName + ', ' + stu.firstName, { name: 'course', params: { id: course.id } }),
      h('div.card.card-tight',
        h('div.row-between', qSel,
          h('div.row-gap',
            h('span.sum-pill', {}, Calc.fmt(stat.sum, 1) + ' / 15'),
            stat.rated > 0 ? h('span.grade-pill.g' + Math.round(grade.g), {}, 'Note ' + Calc.fmt(grade.g) + ' (' + grade.label + ')') : null
          )
        ),
        critSummary,
        stat.rated > 0 && stat.rated < 5
          ? h('p.hint', {}, 'Erst ' + stat.rated + ' von 5 Kriterien bewertet – der Notenstand ist ein Zwischenstand.')
          : null
      ),
      h('div.section-head', {}, 'Alle Punktevergaben (' + e.list.length + ')'),
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
      if (!f) return;
      f.text().then(function (text) {
        return UI.confirmDialog('Backup einspielen?',
          'Achtung: Alle aktuell auf diesem Gerät gespeicherten Daten werden durch den Inhalt der Datei „' + f.name + '“ ersetzt.',
          'Backup einspielen', true).then(function (ok) {
            if (!ok) return;
            Store.importJSON(text);
            toast('Backup wurde eingespielt.');
            go('home');
          });
      }).catch(function (e) { UI.modal('Import fehlgeschlagen', h('p', {}, e.message)); });
    });

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
      header('Einstellungen', back, h('span')),

      h('div.section-head', {}, 'Datensicherung'),
      h('div.card',
        h('p.hint', {}, st.settings.lastExport
          ? 'Letztes Backup: ' + UI.fmtDate(st.settings.lastExport.slice(0, 10))
          : 'Es wurde noch kein Backup erstellt.'),
        h('div.actions-col',
          h('button.btn-primary.btn-block', { onclick: function () { Store.exportJSON(); render(); } },
            'Backup-Datei jetzt speichern'),
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

      h('div.section-head', {}, 'Über diese App'),
      h('div.card',
        h('p', {}, 'SOL-Noten · Notenverwaltung zum selbstorganisierten Lernen'),
        h('p.hint', {}, 'Version 0.1 (MVP) · © 2026 Andreas Vandelaar · Alle Daten bleiben ausschließlich auf diesem Gerät.')
      )
    );
  };

  Store.onChange(function () { /* Persistenz läuft im Hintergrund */ });
})();
