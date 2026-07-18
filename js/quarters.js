/* SOL-Noten – Schuljahr, Ferien (OpenHolidays-API) und Quartalsberechnung.
   Ein Quartal = 10 Schulwochen; Wochen, die überwiegend in den Ferien liegen,
   zählen nicht mit. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.Quarters = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BUNDESLAENDER = [
    { code: 'DE-BW', name: 'Baden-Württemberg' },
    { code: 'DE-BY', name: 'Bayern' },
    { code: 'DE-BE', name: 'Berlin' },
    { code: 'DE-BB', name: 'Brandenburg' },
    { code: 'DE-HB', name: 'Bremen' },
    { code: 'DE-HH', name: 'Hamburg' },
    { code: 'DE-HE', name: 'Hessen' },
    { code: 'DE-MV', name: 'Mecklenburg-Vorpommern' },
    { code: 'DE-NI', name: 'Niedersachsen' },
    { code: 'DE-NW', name: 'Nordrhein-Westfalen' },
    { code: 'DE-RP', name: 'Rheinland-Pfalz' },
    { code: 'DE-SL', name: 'Saarland' },
    { code: 'DE-SN', name: 'Sachsen' },
    { code: 'DE-ST', name: 'Sachsen-Anhalt' },
    { code: 'DE-SH', name: 'Schleswig-Holstein' },
    { code: 'DE-TH', name: 'Thüringen' }
  ];

  function iso(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function parseISO(s) {
    var p = s.split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function monday(d) { var x = new Date(d); var wd = (x.getDay() + 6) % 7; return addDays(x, -wd); }

  /* Ersten Schultag vorschlagen: erster Werktag (Mo–Fr) nach dem Ende der
     Sommerferien des Zieljahres. Liefert 'YYYY-MM-DD' oder null, wenn in den
     Feriendaten keine passenden Sommerferien zu finden sind. */
  function suggestFirstSchoolDay(holidays, targetYear) {
    var summer = null;
    (holidays || []).forEach(function (hh) {
      if (!hh || !hh.end) return;
      if ((hh.name || '').toLowerCase().indexOf('sommer') === -1) return;
      if (Number(hh.end.slice(0, 4)) !== targetYear) return;
      if (!summer || hh.end > summer.end) summer = hh;
    });
    if (!summer) return null;
    var d = addDays(parseISO(summer.end), 1);
    while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, 1);
    return iso(d);
  }

  /* Schulferien für ein Schuljahr laden (OpenHolidays-API, kostenlos, ohne Anmeldung).
     Rückgabe: Promise -> [{ start:'YYYY-MM-DD', end:'YYYY-MM-DD', name:'Herbstferien' }] */
  function fetchHolidays(subdivisionCode, fromISO, toISO) {
    var url = 'https://openholidaysapi.org/SchoolHolidays' +
      '?countryIsoCode=DE&languageIsoCode=DE' +
      '&subdivisionCode=' + encodeURIComponent(subdivisionCode) +
      '&validFrom=' + fromISO + '&validTo=' + toISO;
    return fetch(url, { headers: { accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('Ferien-Abruf fehlgeschlagen (HTTP ' + r.status + ')');
        return r.json();
      })
      .then(function (list) {
        return (list || []).map(function (h) {
          var name = (h.name && h.name.length) ? (h.name[0].text || 'Ferien') : 'Ferien';
          return { start: h.startDate, end: h.endDate, name: name };
        });
      });
  }

  function isHoliday(d, holidays) {
    var s = iso(d);
    for (var i = 0; i < holidays.length; i++) {
      if (s >= holidays[i].start && s <= holidays[i].end) return true;
    }
    return false;
  }

  /* Zählt Nicht-Ferien-Werktage (Mo–Fr) in der Woche ab wochenMontag */
  function schoolDaysInWeek(weekMonday, holidays) {
    var n = 0;
    for (var i = 0; i < 5; i++) {
      if (!isHoliday(addDays(weekMonday, i), holidays)) n++;
    }
    return n;
  }

  /* Berechnet die vier Quartale: je 10 Schulwochen (Woche zählt ab 3 Schultagen).
     Rückgabe: [{start,end}] mit ISO-Daten (Mo der ersten bis Fr der letzten Schulwoche). */
  function computeQuarters(startISO, holidays) {
    var quarters = [];
    var wk = monday(parseISO(startISO));
    var safety = 0;
    for (var q = 0; q < 4; q++) {
      var count = 0, qStart = null, qEnd = null;
      while (count < 10 && safety < 500) {
        safety++;
        if (schoolDaysInWeek(wk, holidays) >= 3) {
          if (qStart === null) qStart = new Date(wk);
          qEnd = addDays(wk, 4); /* Freitag */
          count++;
        }
        wk = addDays(wk, 7);
      }
      quarters.push({
        start: qStart ? iso(qStart) : null,
        end: qEnd ? iso(qEnd) : null
      });
    }
    return quarters;
  }

  /* Liefert die Nummer (1–4) des Quartals, in dem dateISO liegt; davor 1, danach 4.
     Lücken (Ferien zwischen Quartalen) werden dem folgenden Quartal zugerechnet. */
  function quarterForDate(dateISO, quarters) {
    for (var i = 0; i < quarters.length; i++) {
      if (quarters[i].end && dateISO <= quarters[i].end) return i + 1;
    }
    return 4;
  }

  /* Vorschlag "Quartal abschließen?": heute liegt hinter dem Ende von Quartal q,
     das im Kurs noch als aktuell markiert ist. */
  /* Meldet, dass das laufende Quartal laut Plan beendet ist. Für Q1–Q3 heißt
     das „Wechsel fällig“, für Q4 „Schuljahresende erreicht“ – die Unterscheidung
     (und der Abschluss-Status eines Kurses) liegt beim Aufrufer. */
  function quarterChangeDue(todayISO, currentQuarter, quarters) {
    var q = quarters[currentQuarter - 1];
    return !!(q && q.end && todayISO >= q.end);
  }

  return {
    BUNDESLAENDER: BUNDESLAENDER,
    iso: iso,
    parseISO: parseISO,
    fetchHolidays: fetchHolidays,
    suggestFirstSchoolDay: suggestFirstSchoolDay,
    computeQuarters: computeQuarters,
    quarterForDate: quarterForDate,
    quarterChangeDue: quarterChangeDue,
    schoolDaysInWeek: schoolDaysInWeek
  };
});
