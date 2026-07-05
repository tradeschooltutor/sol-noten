/* SOL-Noten – Import von Moodle-/Logineo-Ergebnisexporten (XLSX oder CSV).
   Ohne externe Bibliotheken: XLSX wird als ZIP gelesen (DecompressionStream),
   die Tabellen-XML mit einfachen Mitteln ausgewertet. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.Importer = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- CSV ---------- */

  function parseCSV(text) {
    text = text.replace(/^\uFEFF/, '');
    var firstLine = text.split(/\r?\n/, 1)[0] || '';
    var delim = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';
    var rows = [], row = [], field = '', inQ = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQ) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQ = false;
        } else field += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === delim) { row.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        rows.push(row); row = [];
      } else field += ch;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
  }

  /* ---------- XLSX (Minimal-Leser) ---------- */

  function xlsxSupported() {
    return typeof DecompressionStream === 'function';
  }

  function u16(dv, o) { return dv.getUint16(o, true); }
  function u32(dv, o) { return dv.getUint32(o, true); }

  function inflateRaw(bytes) {
    var ds = new DecompressionStream('deflate-raw');
    var stream = new Blob([bytes]).stream().pipeThrough(ds);
    return new Response(stream).arrayBuffer().then(function (buf) {
      return new TextDecoder('utf-8').decode(buf);
    });
  }

  /* Liest die gewünschten Dateien aus einem ZIP (XLSX). */
  function readZipEntries(arrayBuffer, wanted) {
    var dv = new DataView(arrayBuffer);
    var bytes = new Uint8Array(arrayBuffer);
    /* End of Central Directory von hinten suchen */
    var eocd = -1;
    for (var i = arrayBuffer.byteLength - 22; i >= Math.max(0, arrayBuffer.byteLength - 66000); i--) {
      if (u32(dv, i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) return Promise.reject(new Error('Die Datei ist keine gültige Excel-Datei (ZIP-Ende nicht gefunden).'));
    var count = u16(dv, eocd + 10);
    var cdOfs = u32(dv, eocd + 16);

    var entries = {};
    var o = cdOfs;
    for (var n = 0; n < count; n++) {
      if (u32(dv, o) !== 0x02014b50) break;
      var method = u16(dv, o + 10);
      var cSize = u32(dv, o + 20);
      var nameLen = u16(dv, o + 28);
      var extraLen = u16(dv, o + 30);
      var commentLen = u16(dv, o + 32);
      var localOfs = u32(dv, o + 42);
      var name = new TextDecoder().decode(bytes.subarray(o + 46, o + 46 + nameLen));
      entries[name] = { method: method, cSize: cSize, localOfs: localOfs };
      o += 46 + nameLen + extraLen + commentLen;
    }

    var out = {};
    var jobs = wanted.filter(function (w) { return entries[w]; }).map(function (w) {
      var e = entries[w];
      var lo = e.localOfs;
      if (u32(dv, lo) !== 0x04034b50) return Promise.reject(new Error('ZIP-Eintrag beschädigt.'));
      var nLen = u16(dv, lo + 26), xLen = u16(dv, lo + 28);
      var dataStart = lo + 30 + nLen + xLen;
      var data = bytes.subarray(dataStart, dataStart + e.cSize);
      if (e.method === 0) { out[w] = new TextDecoder('utf-8').decode(data); return Promise.resolve(); }
      if (e.method === 8) return inflateRaw(data).then(function (t) { out[w] = t; });
      return Promise.reject(new Error('Nicht unterstützte ZIP-Komprimierung.'));
    });
    return Promise.all(jobs).then(function () { return { files: out, names: Object.keys(entries) }; });
  }

  function decodeEntities(s) {
    return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, function (m, d) { return String.fromCharCode(Number(d)); });
  }

  function parseSharedStrings(xml) {
    var out = [];
    if (!xml) return out;
    var re = /<si\b[^>]*>([\s\S]*?)<\/si>/g, m;
    while ((m = re.exec(xml))) {
      var texts = [], tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g, tm;
      while ((tm = tRe.exec(m[1]))) texts.push(decodeEntities(tm[1]));
      if (!texts.length && /<t\b[^>]*\/>/.test(m[1])) texts.push('');
      out.push(texts.join(''));
    }
    return out;
  }

  function colToIndex(ref) {
    var m = /^([A-Z]+)/.exec(ref);
    if (!m) return 0;
    var s = m[1], n = 0;
    for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
    return n - 1;
  }

  function parseSheet(xml, shared) {
    var rows = [];
    var rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g, rm;
    while ((rm = rowRe.exec(xml))) {
      var cells = [];
      var cRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, cm;
      while ((cm = cRe.exec(rm[1]))) {
        var attrs = cm[1] || '', inner = cm[2] || '';
        var refM = /r="([A-Z]+\d+)"/.exec(attrs);
        var idx = refM ? colToIndex(refM[1]) : cells.length;
        var type = (/t="([^"]+)"/.exec(attrs) || [])[1] || '';
        var val = '';
        var vM = /<v>([\s\S]*?)<\/v>/.exec(inner);
        if (type === 'inlineStr') {
          var tM = /<t\b[^>]*>([\s\S]*?)<\/t>/.exec(inner);
          val = tM ? decodeEntities(tM[1]) : '';
        } else if (vM) {
          val = decodeEntities(vM[1]);
          if (type === 's') val = shared[Number(val)] != null ? shared[Number(val)] : '';
        }
        cells[idx] = val;
      }
      for (var i = 0; i < cells.length; i++) if (cells[i] === undefined) cells[i] = '';
      rows.push(cells);
    }
    return rows;
  }

  function parseXLSX(arrayBuffer) {
    if (!xlsxSupported()) {
      return Promise.reject(new Error('Dieser Browser kann Excel-Dateien nicht direkt lesen. Bitte exportieren Sie die Ergebnisse aus Moodle als CSV-Datei.'));
    }
    return readZipEntries(arrayBuffer, ['xl/sharedStrings.xml']).then(function (first) {
      var sheetNames = first.names.filter(function (n) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(n); }).sort();
      if (!sheetNames.length) throw new Error('In der Excel-Datei wurde kein Tabellenblatt gefunden.');
      return readZipEntries(arrayBuffer, [sheetNames[0]]).then(function (second) {
        var shared = parseSharedStrings(first.files['xl/sharedStrings.xml']);
        return parseSheet(second.files[sheetNames[0]], shared);
      });
    });
  }

  /* ---------- Moodle-Auswertung ---------- */

  function germanNumber(v) {
    if (v == null) return NaN;
    var s = String(v).trim();
    if (s === '' || s === '-') return NaN;
    /* "1.234,56" -> "1234.56"; "85.00" bleibt 85.00 */
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    return Number(s);
  }

  /* Sucht Kopfzeile (Nachname/Vorname) und Bewertungsspalte,
     rechnet Bewertungen in Prozent um.
     Rückgabe: { results: [{lastName, firstName, percent}], skipped: n } */
  function extractMoodle(rows) {
    var headIdx = -1, colLast = -1, colFirst = -1, colGrade = -1, gradeMax = 100;
    for (var r = 0; r < Math.min(rows.length, 10); r++) {
      var row = rows[r].map(function (c) { return String(c || '').trim(); });
      var li = row.findIndex(function (c) { return /^nachname$/i.test(c); });
      var fi = row.findIndex(function (c) { return /^vorname$/i.test(c); });
      if (li >= 0 && fi >= 0) {
        headIdx = r; colLast = li; colFirst = fi;
        for (var c = 0; c < row.length; c++) {
          var m = /^bewertung\s*\/\s*([\d.,]+)$/i.exec(row[c]) || /^bewertung$/i.exec(row[c]);
          if (m) { colGrade = c; if (m[1]) gradeMax = germanNumber(m[1]); break; }
        }
        break;
      }
    }
    if (headIdx < 0) throw new Error('Kopfzeile mit „Nachname“ und „Vorname“ wurde nicht gefunden. Ist dies ein Moodle-Ergebnisexport?');
    if (colGrade < 0) throw new Error('Die Spalte „Bewertung/…“ wurde nicht gefunden.');
    if (!(gradeMax > 0)) gradeMax = 100;

    var results = [], skipped = 0;
    for (var i = headIdx + 1; i < rows.length; i++) {
      var last = String(rows[i][colLast] || '').trim();
      var first = String(rows[i][colFirst] || '').trim();
      if (!last && !first) continue;
      if (/^gesamtdurchschnitt/i.test(last)) continue;
      var val = germanNumber(rows[i][colGrade]);
      if (isNaN(val)) { skipped++; continue; }
      var pct = Math.round(val / gradeMax * 10000) / 100;
      results.push({ lastName: last, firstName: first, percent: pct });
    }
    return { results: results, skipped: skipped };
  }

  function normName(s) {
    return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /* Gleicht Importzeilen mit der Schülerliste ab.
     Rückgabe: { matched: [{studentId, percent}], unmatched: [rows] } */
  function matchStudents(results, students) {
    var byName = {};
    students.forEach(function (s) {
      byName[normName(s.lastName) + '|' + normName(s.firstName)] = s.id;
    });
    var matched = [], unmatched = [];
    results.forEach(function (r) {
      var id = byName[normName(r.lastName) + '|' + normName(r.firstName)];
      if (id) matched.push({ studentId: id, percent: r.percent });
      else unmatched.push(r);
    });
    return { matched: matched, unmatched: unmatched };
  }

  return {
    parseCSV: parseCSV,
    parseXLSX: parseXLSX,
    xlsxSupported: xlsxSupported,
    extractMoodle: extractMoodle,
    matchStudents: matchStudents,
    germanNumber: germanNumber
  };
});
