/* SOL-Noten – Demo-Daten für Fortbildungen und Vorführungen.

   Erzeugt einen vollständigen, fiktiven Zustand: 2 Klassen, 3 Kurse,
   Quartale 1–3 vollständig bewertet, Quartal 4 leer (Vorführstand).
   Alle Namen sind frei erfunden; es werden keine Fotos erzeugt – der
   Sitzplan zeigt stattdessen die Namensinitialen.

   Reproduzierbarkeit: ein deterministischer Zufallsgenerator (Mulberry32)
   sorgt dafür, dass die Demo bei jedem Aufruf identisch aussieht. Für
   Fortbildungen wichtig: Screenshots und Ablaufpläne bleiben gültig. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.Demo = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- deterministischer Zufall ---------- */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var idN = 0;
  function nid(prefix) { idN++; return 'demo-' + prefix + '-' + idN; }

  /* ---------- Datumshilfen ---------- */
  function parseISO(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
      '-' + String(d.getDate()).padStart(2, '0');
  }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }

  /* Termine im Zeitraum, die auf die angegebenen Wochentage fallen. */
  function datesOnWeekdays(startISO, endISO, weekdays) {
    var out = [], d = parseISO(startISO), end = parseISO(endISO);
    while (d <= end) {
      if (weekdays.indexOf(d.getDay()) > -1) out.push(iso(d));
      d = addDays(d, 1);
    }
    return out;
  }

  /* ---------- fiktive Personen ---------- */
  var NAMES_A = [
    ['Achterberg', 'Lena'], ['Bilgin', 'Deniz'], ['Cramer', 'Jonas'],
    ['Delfs', 'Marie'], ['Ergün', 'Emre'], ['Fischbach', 'Paul'],
    ['Grewe', 'Sophie'], ['Hovestadt', 'Tim'], ['Iversen', 'Nele'],
    ['Jankowski', 'Luca'], ['Kremer', 'Hannah'], ['Lindqvist', 'Ben'],
    ['Meinhardt', 'Amelie'], ['Nowak', 'Jan'], ['Overbeck', 'Clara'],
    ['Petrov', 'Milan'], ['Quandt', 'Ida'], ['Rutkowski', 'Finn']
  ];
  var NAMES_B = [
    ['Adamczyk', 'Mia'], ['Brinkmann', 'Noah'], ['Cetin', 'Elif'],
    ['Dohmen', 'Leon'], ['Eichhorn', 'Frieda'], ['Falkner', 'Mats'],
    ['Gierlich', 'Alina'], ['Haverkamp', 'Til'], ['Ihlenfeld', 'Romy'],
    ['Jurczyk', 'Kilian'], ['Kaminski', 'Zoe'], ['Loeb', 'Anton'],
    ['Mertens', 'Johanna'], ['Nsiah', 'Kwame'], ['Ostrowski', 'Lara'],
    ['Peters', 'Julius']
  ];
  var FIRMEN = [
    'Autohaus Meridian GmbH', 'Nordstern Automobile', 'Kfz-Zentrum Talblick',
    'Wagner & Söhne Fahrzeuge', 'Rheinpark Motors', 'Auto Lindenhof KG'
  ];

  /* Leistungsprofil je Person: 0 = zuverlässig, 1 = mittel, 2 = schwankend.
     `level` steuert das Niveau, `swing` die Streuung – so bleiben die
     Leistungen einer Person in einem glaubwürdigen Rahmen. */
  function makeProfile(rand, i, n) {
    var pos = i / Math.max(1, n - 1);
    var kind = pos < 0.3 ? 0 : (pos < 0.75 ? 1 : 2);
    /* leichte Durchmischung, damit die Liste nicht sortiert wirkt */
    if (rand() < 0.18) kind = (kind + 1) % 3;
    if (kind === 0) return { kind: 0, level: 0.86 + rand() * 0.1, swing: 0.06 };
    if (kind === 1) return { kind: 1, level: 0.66 + rand() * 0.12, swing: 0.10 };
    return { kind: 2, level: 0.42 + rand() * 0.16, swing: 0.16 };
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* Anteil (0–1) der erreichten Leistung an einem Termin. */
  function share(rand, prof) {
    var v = prof.level + (rand() - 0.5) * 2 * prof.swing;
    return clamp(v, 0.08, 1);
  }

  /* Punkte auf halbe Schritte runden – wie bei der Eingabe in der App. */
  function halfStep(v) { return Math.round(v * 2) / 2; }

  /* =====================================================================
     Aufbau des Demo-Zustands
     ===================================================================== */
  function buildState(freshState, computeQuarters, defaults) {
    idN = 0;
    var rand = rng(20260720);
    var st = freshState();

    st.settings.bundesland = defaults && defaults.bundesland ? defaults.bundesland : 'NW';
    st.demo = true;

    /* ---- Schuljahr: beginnt im August des laufenden Schuljahres ---- */
    var today = new Date();
    var y = today.getFullYear();
    /* Vor August gehört der Januar noch zum Schuljahr des Vorjahres. */
    var startYear = today.getMonth() >= 7 ? y : y - 1;
    var startISO = startYear + '-08-15';
    var quarters = computeQuarters(startISO, []);
    var year = {
      id: nid('year'), name: startYear + '/' + String(startYear + 1).slice(2),
      startDate: startISO, holidays: [], quarters: quarters, holidaySource: 'demo'
    };
    st.schoolYears.push(year);

    /* ---- Klassen ---- */
    function makeClass(name, names) {
      var cls = { id: nid('cls'), yearId: year.id, name: name, students: [] };
      names.forEach(function (n, i) {
        cls.students.push({
          id: nid('stu'), lastName: n[0], firstName: n[1],
          company: FIRMEN[i % FIRMEN.length],
          phone: '', email: '', trainerName: '', trainerPhone: '', trainerEmail: ''
        });
      });
      st.classes.push(cls);
      return cls;
    }
    var clsA = makeClass('AK25A', NAMES_A);
    var clsB = makeClass('AK25B', NAMES_B);

    /* Profile je Schüler/in – gelten über alle Kurse hinweg, damit eine
       Person in der Demo durchgängig glaubwürdig bleibt. */
    var profiles = {};
    [clsA, clsB].forEach(function (c) {
      c.students.forEach(function (s, i) { profiles[s.id] = makeProfile(rand, i, c.students.length); });
    });

    /* ---- Kurse ----
       Zwei Kurse mit gleichbleibend 3 Punkten je Kriterium; der dritte
       (WISO) verschiebt in Q2 und Q3 die Gewichte. */
    var evenMax = [3, 3, 3, 3, 3];
    function makeCourse(cls, subject, weekdays, maxPoints, withPortfolio) {
      var c = {
        id: nid('course'), yearId: year.id, classId: cls.id, subject: subject,
        numOBT: 4, numKA: 2,
        weights: { sl: 40, obt: 20, ka: 40 },
        maxPoints: maxPoints,
        currentQuarter: 4,
        portfolio: {}, quarterOverrides: null, completed: false,
        uploadCriterion: 2,
        teachingDays: [{ from: null, days: weekdays }],
        obt: {}, ka: {}, zeugnis: {},
        seatings: [], activeSeating: null,
        lessonContents: []
      };
      c._withPortfolio = withPortfolio;
      st.courses.push(c);
      return c;
    }

    var kpa = makeCourse(clsA, 'KPA', [1, 3], {
      1: evenMax.slice(), 2: evenMax.slice(), 3: evenMax.slice(), 4: evenMax.slice()
    }, false);
    var kup = makeCourse(clsB, 'KUP', [2, 4], {
      1: evenMax.slice(), 2: evenMax.slice(), 3: evenMax.slice(), 4: evenMax.slice()
    }, false);
    /* WISO: Q2 betont Sozialkompetenz, Q3 die mündliche Beteiligung. */
    var wiso = makeCourse(clsA, 'WISO', [2, 5], {
      1: evenMax.slice(),
      2: [3, 1.5, 1.5, 6, 3],
      3: [3, 1.5, 1.5, 3, 6],
      4: evenMax.slice()
    }, true);

    var courses = [kpa, kup, wiso];

    /* ---- Sitzpläne (ohne Fotos – die App zeigt Initialen) ---- */
    courses.forEach(function (c) {
      var cls = c.classId === clsA.id ? clsA : clsB;
      var cols = 6;
      var pos = {};
      cls.students.forEach(function (s, i) {
        pos[s.id] = { r: Math.floor(i / cols), c: i % cols };
      });
      var plan = { id: nid('seat'), name: c.subject === 'WISO' ? '3-EG-080' : 'A-114', cols: cols, positions: pos };
      c.seatings.push(plan);
      c.activeSeating = plan.id;
    });

    /* ---- Bewertungsdaten: Quartale 1–3 ---- */
    var DONE_Q = [1, 2, 3];
    var INHALTE = [
      'Kundengespräch: Bedarfsanalyse üben', 'Finanzierungsarten im Vergleich',
      'Leasingvertrag: Bestandteile', 'Gruppenarbeit Zubehörkalkulation',
      'Serviceprozess im Autohaus', 'Reklamation und Gewährleistung',
      'Marktanalyse regionaler Wettbewerb', 'Präsentation der Projektergebnisse',
      'Zahlungsverkehr und Zahlungsstörungen', 'Nachhaltigkeit im Fuhrpark'
    ];

    courses.forEach(function (course) {
      var cls = course.classId === clsA.id ? clsA : clsB;
      var students = cls.students;
      var wd = course.teachingDays[0].days;

      DONE_Q.forEach(function (q) {
        var qq = quarters[q - 1];
        if (!qq || !qq.start || !qq.end) return;
        var termine = datesOnWeekdays(qq.start, qq.end, wd);
        if (!termine.length) return;

        /* An etwa jedem zweiten Termin wird bewertet – realistischer als
           lückenlose Vergabe an jedem einzelnen Kurstag. */
        var bewertungsTage = termine.filter(function (_, i) { return i % 2 === 0; });
        var maxima = course.maxPoints[q];

        /* Unentschuldigte Fehlzeiten: bei unzuverlässigen Personen häufiger. */
        var absentByStudent = {};
        students.forEach(function (s) {
          var prof = profiles[s.id];
          var p = prof.kind === 2 ? 0.10 : (prof.kind === 1 ? 0.04 : 0.012);
          absentByStudent[s.id] = termine.filter(function () { return rand() < p; });
        });

        Object.keys(absentByStudent).forEach(function (sid) {
          absentByStudent[sid].forEach(function (dateISO) {
            var absId = nid('abs');
            st.absences.push({ id: absId, courseId: course.id, studentId: sid, date: dateISO, quarter: q });
            /* Fehlzeit = 0 Punkte in allen fünf Kriterien (wie in der App). */
            for (var ci = 0; ci < 5; ci++) {
              st.soleiEntries.push({
                id: nid('e'), courseId: course.id, studentId: sid, quarter: q,
                criterion: ci, points: 0, date: dateISO,
                createdAt: dateISO + 'T08:00:00.000Z', absenceId: absId
              });
            }
          });
        });

        /* Reguläre Punktevergaben */
        bewertungsTage.forEach(function (dateISO) {
          students.forEach(function (s) {
            if (absentByStudent[s.id].indexOf(dateISO) > -1) return;
            var prof = profiles[s.id];
            for (var ci = 0; ci < 5; ci++) {
              /* Nicht jedes Kriterium an jedem Termin – so entstehen die
                 typischen Lücken eines echten Punktekontos. */
              if (rand() < 0.22) continue;
              var pts = halfStep(maxima[ci] * share(rand, prof));
              st.soleiEntries.push({
                id: nid('e'), courseId: course.id, studentId: s.id, quarter: q,
                criterion: ci, points: clamp(pts, 0, maxima[ci]), date: dateISO,
                createdAt: dateISO + 'T10:00:00.000Z'
              });
            }
          });
        });

        /* Ergebnis-Uploads: 5 Prüfungen je Quartal */
        students.forEach(function (s) {
          var prof = profiles[s.id];
          var done = 0;
          for (var k = 0; k < 5; k++) if (rand() < clamp(prof.level + 0.08, 0.1, 0.98)) done++;
          st.uploadTallies.push({
            courseId: course.id, studentId: s.id, quarter: q,
            done: done, missed: 5 - done
          });
        });

        /* Portfolio-/mdl.-Prüfungsnote (nur WISO – zeigt Auslegung B) */
        if (course._withPortfolio) {
          course.portfolio[q] = {};
          students.forEach(function (s) {
            var prof = profiles[s.id];
            var g = 6 - clamp(share(rand, prof) * 5.2, 0.2, 5);
            course.portfolio[q][s.id] = Math.round(g * 2) / 2;
          });
        }

        /* Stundeninhalte: einige Termine des Quartals füllen */
        termine.forEach(function (dateISO, i) {
          if (i % 3 !== 0) return;
          course.lessonContents.push({
            id: nid('lc'), date: dateISO,
            text: INHALTE[(i + q) % INHALTE.length]
          });
        });

        /* Kursnotizen: vereinzelt, vor allem bei auffälligen Personen */
        students.forEach(function (s) {
          if (rand() > 0.12) return;
          var prof = profiles[s.id];
          var d = bewertungsTage[Math.floor(rand() * bewertungsTage.length)];
          if (!d) return;
          st.notes.push({
            id: nid('note'), courseId: course.id, studentId: s.id, date: d,
            text: prof.kind === 2
              ? 'Arbeitsauftrag mehrfach nicht begonnen – Gespräch geführt.'
              : 'Hat die Gruppe sehr souverän durch die Aufgabe geführt.'
          });
        });
      });

      /* ---- Open Book Tests: 2 je Quartal, also 4 je Halbjahr ----
         Q1 → HJ1 Test 1+2, Q2 → HJ1 Test 3+4, Q3 → HJ2 Test 1+2.
         Der vierte Test des 2. Halbjahrs gehört zu Q4 und bleibt leer. */
      var obtPlan = [
        { hj: 1, idx: 0 }, { hj: 1, idx: 1 },
        { hj: 1, idx: 2 }, { hj: 1, idx: 3 },
        { hj: 2, idx: 0 }, { hj: 2, idx: 1 }
      ];
      obtPlan.forEach(function (o) {
        if (!course.obt[o.hj]) course.obt[o.hj] = {};
        course.obt[o.hj][o.idx] = {};
        students.forEach(function (s) {
          var prof = profiles[s.id];
          var pct = clamp(share(rand, prof) * 100 + (rand() - 0.5) * 8, 8, 100);
          course.obt[o.hj][o.idx][s.id] = Math.round(pct * 10) / 10;
        });
      });

      /* ---- Klausuren: 1 je Quartal ----
         Q1 → HJ1 Nr. 1, Q2 → HJ1 Nr. 2, Q3 → HJ2 Nr. 1.
         HJ2 Nr. 2 gehört zu Q4 und bleibt leer.
         Die erste Klausur wird vollständig bewertet (Aufgabenpunkte,
         Kommentare, Stapelreihenfolge), die übrigen einfach. */
      var kaPlan = [
        { hj: 1, idx: 0, q: 1, full: true },
        { hj: 1, idx: 1, q: 2, full: false },
        { hj: 2, idx: 0, q: 3, full: false }
      ];
      kaPlan.forEach(function (k) {
        if (!course.ka[k.hj]) course.ka[k.hj] = {};
        var qq = quarters[k.q - 1];
        var termine = qq && qq.start ? datesOnWeekdays(qq.start, qq.end, wd) : [];
        var kaDate = termine.length ? termine[Math.floor(termine.length * 0.8)] : null;

        if (k.full) {
          var tasks = [6, 8, 10, 6, 10, 8, 12];
          var maxSum = tasks.reduce(function (a, b) { return a + b; }, 0);
          var taskPoints = {}, comments = {}, order = {}, points = {};
          var seq = 0;
          students.forEach(function (s) {
            var prof = profiles[s.id];
            var arr = [], sum = 0;
            tasks.forEach(function (mp) {
              var v = halfStep(mp * clamp(share(rand, prof) + (rand() - 0.5) * 0.12, 0.05, 1));
              v = clamp(v, 0, mp);
              arr.push(v); sum += v;
            });
            taskPoints[s.id] = arr;
            points[s.id] = Math.round(sum * 100) / 100;
            order[s.id] = ++seq;
            if (rand() < 0.18) {
              comments[s.id] = prof.kind === 0
                ? 'Sehr saubere Argumentation in Aufgabe 7.'
                : 'Rechenweg fehlte mehrfach – bitte nacharbeiten.';
            }
          });
          course.ka[k.hj][k.idx] = {
            maxPoints: maxSum, points: points,
            full: {
              date: kaDate, tasks: tasks, taskPoints: taskPoints,
              dates: {}, comments: comments, order: order, sort: 'alpha'
            }
          };
        } else {
          var max = 60;
          var pts = {};
          students.forEach(function (s) {
            var prof = profiles[s.id];
            pts[s.id] = halfStep(clamp(max * share(rand, prof), 4, max));
          });
          course.ka[k.hj][k.idx] = { maxPoints: max, points: pts };
        }
      });

      delete course._withPortfolio;
    });

    return st;
  }

  return {
    buildState: buildState,
    datesOnWeekdays: datesOnWeekdays,
    rng: rng
  };
});
