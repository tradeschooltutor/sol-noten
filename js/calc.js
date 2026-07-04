/* SOL-Noten – Berechnungslogik
   Basiert auf der Excel-Notenverwaltung V8.0 von Andreas Vandelaar. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.Calc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULT_CRITERIA = [
    'Zeitmanagement',
    'Material/Medien',
    'Arbeitsergebnisse',
    'Sozialkompetenz',
    'Mündliche Beteiligung'
  ];

  /* SoLei-Bewertungsspiegel (15-Punkte-Schema) – Blatt "Bewertungsspiegel" E4:G19 */
  var DEFAULT_GRADING15 = [
    { p: 0,  g: 6,    label: 'ungenügend' },
    { p: 1,  g: 5.25, label: 'mangelhaft (-)' },
    { p: 2,  g: 5,    label: 'mangelhaft' },
    { p: 3,  g: 4.75, label: 'mangelhaft (+)' },
    { p: 4,  g: 4.25, label: 'ausreichend (-)' },
    { p: 5,  g: 4,    label: 'ausreichend' },
    { p: 6,  g: 3.75, label: 'ausreichend (+)' },
    { p: 7,  g: 3.25, label: 'befriedigend (-)' },
    { p: 8,  g: 3,    label: 'befriedigend' },
    { p: 9,  g: 2.75, label: 'befriedigend (+)' },
    { p: 10, g: 2.25, label: 'gut (-)' },
    { p: 11, g: 2,    label: 'gut' },
    { p: 12, g: 1.75, label: 'gut (+)' },
    { p: 13, g: 1.25, label: 'sehr gut (-)' },
    { p: 14, g: 1,    label: 'sehr gut' },
    { p: 15, g: 1,    label: 'sehr gut (+)' }
  ];

  /* Zulässige Maximalpunkte je Kriterium ("glatte" Werte, Summe muss 15 ergeben) */
  var ALLOWED_MAX = [1.5, 3, 4.5, 6];
  var DEFAULT_MAX = [3, 3, 3, 3, 3];

  function round1(x) { return Math.round(x * 10) / 10; }
  function round2(x) { return Math.round(x * 100) / 100; }

  /* Tap-Stufen eines Kriteriums: Max, 2/3, 1/3, 0 – auf 1 Nachkommastelle glatt */
  function tapValues(max) {
    return [max, round1(max * 2 / 3), round1(max / 3), 0];
  }

  /* Durchschnitt eines Kriteriums im Quartal, auf 1 Nachkommastelle gerundet */
  function criterionAverage(points) {
    if (!points || points.length === 0) return null;
    var s = 0;
    for (var i = 0; i < points.length; i++) s += points[i];
    return round1(s / points.length);
  }

  /* Quartalsstand eines Schülers.
     entriesByCriterion: Array[5] mit Punktelisten.
     Rückgabe: { sum, rated, averages[5] } – sum = ungerundete Summe der
     gerundeten Kriteriendurchschnitte, rated = Anzahl bewerteter Kriterien. */
  function quarterStatus(entriesByCriterion) {
    var averages = [], sum = 0, rated = 0;
    for (var c = 0; c < 5; c++) {
      var avg = criterionAverage(entriesByCriterion[c] || []);
      averages.push(avg);
      if (avg !== null) { sum += avg; rated++; }
    }
    return { sum: round2(sum), rated: rated, averages: averages };
  }

  /* Note zur Punktesumme: größte erreichte volle Punktstufe (VLOOKUP, TRUE).
     Beispiel: 11,9 Punkte -> Stufe 11 -> Note 2. */
  function gradeFor15(sum, table) {
    var t = table || DEFAULT_GRADING15;
    var best = t[0];
    for (var i = 0; i < t.length; i++) {
      if (t[i].p <= sum + 1e-9) best = t[i]; else break;
    }
    return best;
  }

  /* Note SoLei = Durchschnitt aus Note SL-Bogen und Portfolionote.
     Ohne Portfolionote bleibt sie leer (Excel-Logik). */
  function soleiGrade(slBogenGrade, portfolioGrade) {
    if (slBogenGrade == null || portfolioGrade == null) return null;
    return round2((slBogenGrade + portfolioGrade) / 2);
  }

  /* Deutsche Zahlformatierung (Komma) */
  function fmt(x, digits) {
    if (x == null || x === '') return '';
    var d = (digits == null) ? 2 : digits;
    var s = Number(x).toFixed(d).replace(/\.?0+$/, '');
    if (s.indexOf('.') === -1 && d > 0 && Number(x) % 1 !== 0) s = Number(x).toFixed(d);
    return s.replace('.', ',');
  }
  function fmtFixed(x, digits) {
    if (x == null || x === '') return '';
    return Number(x).toFixed(digits).replace('.', ',');
  }

  /* Validierung der Maximalpunkte: 5 Werte aus ALLOWED_MAX, Summe = 15 */
  function validateMaxPoints(arr) {
    if (!arr || arr.length !== 5) return { ok: false, sum: 0, msg: 'Es müssen genau 5 Werte sein.' };
    var sum = 0;
    for (var i = 0; i < 5; i++) {
      if (ALLOWED_MAX.indexOf(arr[i]) === -1)
        return { ok: false, sum: 0, msg: 'Zulässige Werte je Kriterium: 1,5 / 3 / 4,5 / 6 Punkte.' };
      sum += arr[i];
    }
    sum = round1(sum);
    if (sum !== 15) {
      var diff = round1(15 - sum);
      return { ok: false, sum: sum,
        msg: 'Die Summe der Maximalpunkte muss 15 ergeben (aktuell ' + fmt(sum, 1) + ', ' +
             (diff > 0 ? 'es fehlen ' + fmt(diff, 1) : fmt(-diff, 1) + ' zu viel') + ').' };
    }
    return { ok: true, sum: 15, msg: '' };
  }

  return {
    DEFAULT_CRITERIA: DEFAULT_CRITERIA,
    DEFAULT_GRADING15: DEFAULT_GRADING15,
    ALLOWED_MAX: ALLOWED_MAX,
    DEFAULT_MAX: DEFAULT_MAX,
    round1: round1,
    round2: round2,
    tapValues: tapValues,
    criterionAverage: criterionAverage,
    quarterStatus: quarterStatus,
    gradeFor15: gradeFor15,
    soleiGrade: soleiGrade,
    validateMaxPoints: validateMaxPoints,
    fmt: fmt,
    fmtFixed: fmtFixed
  };
});
