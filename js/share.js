/* SOL-Noten – Teamteaching-Austausch (geteilte Kurse).
   Zwei Lehrkräfte bewerten denselben Kurs auf getrennten Geräten:
   Lehrkraft 1 („Notengeberin“) führt den Kurs vollständig und vergibt die
   Zeugnisnote; Lehrkraft 2 („Partnerin“) vergibt in ihren Stunden ebenfalls
   SoLei-Punkte. Dieses Modul definiert das Dateiformat und baut die
   Nutzdaten für Export und Import zusammen. Verschlüsselung (CryptoBox),
   Persistenz (Store) und Oberfläche (app.js) bleiben außen vor – das Modul
   ist dadurch vollständig in Node testbar.

   Ablauf über das Schuljahr:
   1. Schuljahresanfang: Lehrkraft 1 exportiert den Kurs, Lehrkraft 2
      importiert ihn als „Partnerkurs“ (sharedRole: 'partner'). Schüler-IDs
      bleiben dabei erhalten – sie sind später der Schlüssel für die
      Zuordnung der Punkte.
   2. Bei Änderungen (Nachzügler, Maximalpunkte, Quartalszeiträume):
      Lehrkraft 1 exportiert erneut, Lehrkraft 2 importiert erneut. Der
      Import wirkt dann als Abgleich: Geteilte Einstellungen werden
      übernommen, vorhandene Bewertungsdaten bleiben unangetastet.
   3. Quartalsende: Punkte-Export/-Import (Sitzung 2, noch nicht enthalten).

   Bewusste Entscheidungen:
   - Geteilte Einstellungen (Kriterien über Maximalpunkte, Quartalszeiträume,
     Unterrichtstage) sind auf dem Partnergerät schreibgeschützt. Es gibt
     genau eine Quelle für die Skala; ein stilles Auseinanderlaufen ist
     damit unmöglich statt nur verboten.
   - Sitzpläne, Fotos, Stundeninhalte und Bewertungsdaten reisen NICHT mit:
     Sitzpläne und Stundeninhalte sind gerätelokal, Fotos sind die heikelste
     Datenkategorie und jede Lehrkraft pflegt ihre eigenen.
   - shareId identifiziert die Kurs-Beziehung über beide Geräte hinweg und
     bleibt bei jedem Folge-Export gleich. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.Share = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FORMAT = 'sol-noten-kurs';
  var FORMAT_VERSION = 1;

  /* ---------- Export: Nutzdaten aus Kurs + Klasse + Schuljahr bauen ---------- */

  /* Baut die unverschlüsselten Nutzdaten des Kurs-Exports. Wirft bei
     unvollständigen Daten – die Oberfläche fängt das ab.
     opts: { newShareId, now, appVersion, criteriaNames }.
     criteriaNames sind GLOBALE Einstellungen des Absenders; sie reisen nur
     zur Kontrolle mit und werden beim Import nie geschrieben, weil sie auf
     dem Zielgerät alle Kurse beträfen. Die Punkte selbst hängen am
     Kriterien-Index 0–4 und sind von den Bezeichnungen unabhängig. */
  function buildCourseExport(course, cls, year, opts) {
    if (!course || !cls || !year) throw new Error('Kurs, Klasse oder Schuljahr fehlt.');
    if (course.sharedRole === 'partner') {
      throw new Error('Ein Partnerkurs kann nicht erneut exportiert werden – der Export erfolgt bei der Lehrkraft, die die Note vergibt.');
    }
    var quarters = (course.quarterOverrides || year.quarters || []).map(function (q) {
      return { start: q.start, end: q.end };
    });
    if (quarters.length !== 4) throw new Error('Die Quartalszeiträume des Kurses sind unvollständig.');

    return {
      format: FORMAT,
      version: FORMAT_VERSION,
      shareId: course.shareId || (opts && opts.newShareId) || null,
      exportedAt: (opts && opts.now) || new Date().toISOString(),
      appVersion: (opts && opts.appVersion) || '',
      course: {
        subject: course.subject,
        className: cls.name,
        yearName: year.name,
        quarters: quarters,
        maxPoints: JSON.parse(JSON.stringify(course.maxPoints || {})),
        criteriaNames: (opts && opts.criteriaNames) ? opts.criteriaNames.slice() : null,
        uploadCriterion: typeof course.uploadCriterion === 'number' ? course.uploadCriterion : 2,
        teachingDays: course.teachingDays ? JSON.parse(JSON.stringify(course.teachingDays)) : null
      },
      /* Bewusst nur Name und ID: Lehrkraft 2 braucht die Namen zum Bewerten;
         Kontaktdaten und Betriebe bleiben auf dem Gerät von Lehrkraft 1. */
      students: (cls.students || []).map(function (s) {
        return { id: s.id, lastName: s.lastName || '', firstName: s.firstName || '' };
      })
    };
  }

  /* ---------- Import: Prüfen ---------- */

  function validateCourseImport(data) {
    if (!data || typeof data !== 'object') throw new Error('Die Datei ist keine gültige Kurs-Datei.');
    if (data.format !== FORMAT) throw new Error('Die Datei ist keine Kurs-Datei für Teamteaching (falsches Format).');
    if (typeof data.version !== 'number' || data.version > FORMAT_VERSION) {
      throw new Error('Die Datei stammt aus einer neueren App-Version. Bitte aktualisieren Sie SOL-Noten.');
    }
    if (!data.shareId || typeof data.shareId !== 'string') throw new Error('Der Datei fehlt die Kurs-Kennung.');
    var c = data.course;
    if (!c || typeof c.subject !== 'string' || !c.subject.trim()) throw new Error('Der Datei fehlt das Fach.');
    if (typeof c.className !== 'string' || !c.className.trim()) throw new Error('Der Datei fehlt der Klassenname.');
    if (!Array.isArray(c.quarters) || c.quarters.length !== 4 ||
        c.quarters.some(function (q) { return !q || !q.start || !q.end; })) {
      throw new Error('Die Quartalszeiträume in der Datei sind unvollständig.');
    }
    if (!c.maxPoints || typeof c.maxPoints !== 'object') throw new Error('Der Datei fehlen die Maximalpunkte.');
    if (!Array.isArray(data.students) || !data.students.length) {
      throw new Error('Die Datei enthält keine Schülerliste.');
    }
    var seen = {};
    data.students.forEach(function (s) {
      if (!s || !s.id || typeof s.id !== 'string') throw new Error('Ein Eintrag der Schülerliste hat keine ID.');
      if (seen[s.id]) throw new Error('Die Schülerliste enthält doppelte IDs.');
      seen[s.id] = true;
      if (typeof s.lastName !== 'string') throw new Error('Ein Eintrag der Schülerliste hat keinen Nachnamen.');
    });
    return true;
  }

  /* ---------- Import: Abgleichplan berechnen ---------- *
     Reine Funktion ohne Seiteneffekte – liefert, WAS passieren würde.
     Der Store führt den Plan aus, die Oberfläche zeigt ihn als Vorschau.
     existing = { course, cls } des vorhandenen Partnerkurses oder null.
     myCriteriaNames = die globalen Kriterienbezeichnungen des Empfängers. */
  function planCourseImport(data, existing, myCriteriaNames) {
    validateCourseImport(data);
    var plan = {
      mode: existing ? 'update' : 'create',
      subject: data.course.subject,
      className: data.course.className,
      yearName: data.course.yearName,
      studentsNew: [],
      studentsKept: 0,
      studentsMissing: [],   /* vorhanden beim Partner, fehlen in der Datei */
      settingsChanged: [],
      /* Weichen die globalen Kriterienbezeichnungen des Empfängers von denen
         des Absenders ab, ist das nur eine Anzeige-Differenz (Punkte hängen
         am Index) – aber eine, die man kennen sollte. */
      criteriaMismatch: false
    };
    if (data.course.criteriaNames && myCriteriaNames &&
        JSON.stringify(data.course.criteriaNames) !== JSON.stringify(myCriteriaNames)) {
      plan.criteriaMismatch = true;
    }
    if (!existing) {
      plan.studentsNew = data.students.slice();
      return plan;
    }
    var have = {};
    (existing.cls.students || []).forEach(function (s) { have[s.id] = s; });
    var incoming = {};
    data.students.forEach(function (s) {
      incoming[s.id] = true;
      if (have[s.id]) plan.studentsKept++;
      else plan.studentsNew.push(s);
    });
    (existing.cls.students || []).forEach(function (s) {
      if (!incoming[s.id]) plan.studentsMissing.push({ id: s.id, lastName: s.lastName, firstName: s.firstName });
    });
    var c = existing.course;
    if (JSON.stringify(c.maxPoints || {}) !== JSON.stringify(data.course.maxPoints)) plan.settingsChanged.push('Maximalpunkte');
    var haveQ = (c.quarterOverrides || []).map(function (q) { return q.start + '/' + q.end; }).join(',');
    var newQ = data.course.quarters.map(function (q) { return q.start + '/' + q.end; }).join(',');
    if (haveQ !== newQ) plan.settingsChanged.push('Quartalszeiträume');
    if (JSON.stringify(c.teachingDays || null) !== JSON.stringify(data.course.teachingDays || null)) plan.settingsChanged.push('Unterrichtstage');

    if ((typeof c.uploadCriterion === 'number' ? c.uploadCriterion : 2) !== data.course.uploadCriterion) plan.settingsChanged.push('Upload-Kriterium');
    if (c.subject !== data.course.subject) plan.settingsChanged.push('Fach');
    return plan;
  }

  /* ---------- Dateiname ---------- */

  function courseFileName(data) {
    function safe(s) {
      return String(s || '').replace(/[^\wäöüÄÖÜß-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);
    }
    return 'SOL-Kurs-' + safe(data.course.className) + '-' + safe(data.course.subject) + '.solkurs';
  }

  return {
    FORMAT: FORMAT,
    FORMAT_VERSION: FORMAT_VERSION,
    buildCourseExport: buildCourseExport,
    validateCourseImport: validateCourseImport,
    planCourseImport: planCourseImport,
    courseFileName: courseFileName
  };
});
