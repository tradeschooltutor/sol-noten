/* SOL-Noten – minimaler Excel-Schreiber (.xlsx) ohne Fremdbibliotheken.
   Erzeugt eine Arbeitsmappe mit einem Tabellenblatt; ZIP ohne Kompression. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.XlsxWrite = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- CRC32 ---------- */
  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  var enc = new TextEncoder();

  /* ---------- ZIP (nur "stored", ohne Kompression) ---------- */
  function buildZip(files) { /* files: [{name, text}] */
    var parts = [], central = [], offset = 0;
    files.forEach(function (f) {
      var nameB = enc.encode(f.name);
      var dataB = enc.encode(f.text);
      var crc = crc32(dataB);
      var local = new Uint8Array(30 + nameB.length);
      var dv = new DataView(local.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);              /* Version */
      dv.setUint16(6, 0x0800, true);          /* UTF-8-Flag */
      dv.setUint16(8, 0, true);               /* stored */
      dv.setUint32(14, crc, true);
      dv.setUint32(18, dataB.length, true);
      dv.setUint32(22, dataB.length, true);
      dv.setUint16(26, nameB.length, true);
      local.set(nameB, 30);
      parts.push(local, dataB);

      var cd = new Uint8Array(46 + nameB.length);
      var cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, dataB.length, true);
      cv.setUint32(24, dataB.length, true);
      cv.setUint16(28, nameB.length, true);
      cv.setUint32(42, offset, true);
      cd.set(nameB, 46);
      central.push(cd);
      offset += local.length + dataB.length;
    });
    var cdSize = central.reduce(function (a, b) { return a + b.length; }, 0);
    var eocd = new Uint8Array(22);
    var ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);
    var all = parts.concat(central, [eocd]);
    var total = all.reduce(function (a, b) { return a + b.length; }, 0);
    var out = new Uint8Array(total);
    var pos = 0;
    all.forEach(function (b) { out.set(b, pos); pos += b.length; });
    return out;
  }

  /* ---------- XLSX ---------- */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function colName(i) {
    var s = '';
    i++;
    while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
    return s;
  }

  /* rows: Array von Zeilen; Zelle = null | number | string.
     Rückgabe: Uint8Array der fertigen .xlsx-Datei. */
  /* Ein Tabellenblatt-XML aus Zeilen erzeugen. */
  function sheetXml(rows) {
    var sheetRows = rows.map(function (row, r) {
      var cells = row.map(function (v, c) {
        if (v === null || v === undefined || v === '') return '';
        var ref = colName(c) + (r + 1);
        if (typeof v === 'number' && isFinite(v)) {
          return '<c r="' + ref + '"><v>' + v + '</v></c>';
        }
        return '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + esc(v) + '</t></is></c>';
      }).join('');
      return '<row r="' + (r + 1) + '">' + cells + '</row>';
    }).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetData>' + sheetRows + '</sheetData></worksheet>';
  }

  /* Blattnamen für Excel zulässig machen: verbotene Zeichen raus, max. 31
     Zeichen, eindeutig innerhalb der Mappe. */
  function safeSheetNames(names) {
    var used = {};
    return names.map(function (n) {
      var s = String(n || 'Blatt').replace(/[\[\]:*?\/\\]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!s) s = 'Blatt';
      s = s.slice(0, 31);
      var base = s, i = 2;
      while (used[s.toLowerCase()]) {
        var suffix = ' (' + i + ')';
        s = base.slice(0, 31 - suffix.length) + suffix;
        i++;
      }
      used[s.toLowerCase()] = true;
      return s;
    });
  }

  /* Arbeitsmappe mit mehreren Blättern: sheets = [{name, rows}] */
  function buildMulti(sheets) {
    var names = safeSheetNames(sheets.map(function (s) { return s.name; }));
    var files = [];
    var sheetEntries = '', relEntries = '', typeOverrides = '';
    sheets.forEach(function (s, i) {
      var n = i + 1;
      files.push({ name: 'xl/worksheets/sheet' + n + '.xml', text: sheetXml(s.rows) });
      sheetEntries += '<sheet name="' + esc(names[i]) + '" sheetId="' + n + '" r:id="rId' + n + '"/>';
      relEntries += '<Relationship Id="rId' + n + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + n + '.xml"/>';
      typeOverrides += '<Override PartName="/xl/worksheets/sheet' + n + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    });

    var workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets>' + sheetEntries + '</sheets></workbook>';

    var wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      relEntries + '</Relationships>';

    var rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>';

    var contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      typeOverrides + '</Types>';

    return buildZip([
      { name: '[Content_Types].xml', text: contentTypes },
      { name: '_rels/.rels', text: rootRels },
      { name: 'xl/workbook.xml', text: workbook },
      { name: 'xl/_rels/workbook.xml.rels', text: wbRels }
    ].concat(files));
  }

  /* Ein Blatt (bisherige API, unverändert nutzbar). */
  function build(sheetName, rows) {
    return buildMulti([{ name: sheetName, rows: rows }]);
  }

  function downloadBytes(filename, bytes) {
    var blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function download(filename, sheetName, rows) {
    downloadBytes(filename, build(sheetName, rows));
  }

  function downloadMulti(filename, sheets) {
    downloadBytes(filename, buildMulti(sheets));
  }

  return { build: build, buildMulti: buildMulti, download: download, downloadMulti: downloadMulti };
});
