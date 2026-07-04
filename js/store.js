/* SOL-Noten – Datenhaltung (rein lokal).
   IndexedDB mit drei Bereichen:
   - state:     der komplette App-Zustand als ein Dokument
   - snapshots: automatische interne Sicherungsstände (max. 14 Tage)
   - handles:   Ordner-Freigabe für automatische Backups (Chrome/Edge) */
(function (root) {
  'use strict';

  var DB_NAME = 'sol-noten', DB_VERSION = 1;
  var db = null;
  var state = null;
  var saveTimer = null;
  var listeners = [];
  var backupDirHandle = null;

  function openDB() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains('state')) d.createObjectStore('state');
        if (!d.objectStoreNames.contains('snapshots')) d.createObjectStore('snapshots');
        if (!d.objectStoreNames.contains('handles')) d.createObjectStore('handles');
      };
      req.onsuccess = function () { db = req.result; resolve(db); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function idb(storeName, mode, fn) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(storeName, mode);
      var st = tx.objectStore(storeName);
      var out = fn(st);
      tx.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : undefined); };
      tx.onerror = function () { reject(tx.error); };
    });
  }
  function idbGet(storeName, key) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(storeName, 'readonly');
      var req = tx.objectStore(storeName).get(key);
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function uid() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function freshState() {
    return {
      version: 1,
      app: 'SOL-Noten',
      settings: {
        bundesland: null,
        criteriaNames: Calc.DEFAULT_CRITERIA.slice(),
        grading15: JSON.parse(JSON.stringify(Calc.DEFAULT_GRADING15)),
        lastExport: null,
        autoBackupFolder: false
      },
      schoolYears: [],   /* {id, name, startDate, holidays[], quarters[4], holidaySource} */
      classes: [],       /* {id, yearId, name, students[]} */
      courses: [],       /* {id, yearId, classId, subject, numOBT, numKA,
                             weights:{sl,obt,ka}, maxPoints:{1:[..],2:..,3:..,4:..},
                             currentQuarter, portfolio:{q:{studentId:grade}},
                             dismissedQuarterHint:{q:true}} */
      soleiEntries: []   /* {id, courseId, studentId, quarter, criterion, points, date, createdAt} */
    };
  }

  /* ---------- Laden / Speichern ---------- */

  function init() {
    return openDB()
      .then(function () { return idbGet('state', 'main'); })
      .then(function (saved) {
        state = saved || freshState();
        return idbGet('handles', 'backupDir').catch(function () { return null; });
      })
      .then(function (h) { backupDirHandle = h || null; return state; });
  }

  function notify() { listeners.forEach(function (fn) { fn(state); }); }
  function onChange(fn) { listeners.push(fn); }

  function save() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 250);
    notify();
  }

  function persist() {
    saveTimer = null;
    return idb('state', 'readwrite', function (st) { return st.put(state, 'main'); })
      .then(dailySnapshot)
      .then(autoBackupToFolder)
      .catch(function (e) { console.error('Speichern fehlgeschlagen:', e); });
  }

  /* Ein interner Sicherungsstand pro Tag, die letzten 14 werden behalten. */
  function dailySnapshot() {
    var key = todayISO();
    return idb('snapshots', 'readwrite', function (st) {
      st.put(JSON.parse(JSON.stringify(state)), key);
    }).then(function () {
      return new Promise(function (resolve) {
        var tx = db.transaction('snapshots', 'readwrite');
        var st = tx.objectStore('snapshots');
        var req = st.getAllKeys();
        req.onsuccess = function () {
          var keys = (req.result || []).sort();
          while (keys.length > 14) st.delete(keys.shift());
        };
        tx.oncomplete = resolve;
      });
    });
  }

  function listSnapshots() {
    return new Promise(function (resolve) {
      var tx = db.transaction('snapshots', 'readonly');
      var req = tx.objectStore('snapshots').getAllKeys();
      req.onsuccess = function () { resolve((req.result || []).sort().reverse()); };
    });
  }
  function restoreSnapshot(key) {
    return idbGet('snapshots', key).then(function (snap) {
      if (!snap) throw new Error('Sicherungsstand nicht gefunden.');
      state = snap;
      return idb('state', 'readwrite', function (st) { return st.put(state, 'main'); });
    }).then(notify);
  }

  /* ---------- Export / Import (Backup-Datei) ---------- */

  function exportJSON() {
    var data = JSON.stringify(state, null, 1);
    var name = 'SOL-Noten-Backup-' + todayISO() + '.json';
    var blob = new Blob([data], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    state.settings.lastExport = new Date().toISOString();
    save();
  }

  function importJSON(text) {
    var data;
    try { data = JSON.parse(text); }
    catch (e) { throw new Error('Die Datei ist keine gültige Backup-Datei (JSON-Fehler).'); }
    if (!data || data.app !== 'SOL-Noten' || !Array.isArray(data.courses)) {
      throw new Error('Die Datei ist keine SOL-Noten-Backup-Datei.');
    }
    state = data;
    save();
  }

  /* ---------- Automatisches Backup in freigegebenen Ordner ---------- */

  function folderBackupSupported() {
    return typeof window.showDirectoryPicker === 'function';
  }

  function chooseBackupFolder() {
    return window.showDirectoryPicker({ mode: 'readwrite' }).then(function (handle) {
      backupDirHandle = handle;
      state.settings.autoBackupFolder = true;
      return idb('handles', 'readwrite', function (st) { st.put(handle, 'backupDir'); });
    }).then(function () { save(); });
  }

  function removeBackupFolder() {
    backupDirHandle = null;
    state.settings.autoBackupFolder = false;
    return idb('handles', 'readwrite', function (st) { st.delete('backupDir'); })
      .then(function () { save(); });
  }

  var lastFolderBackup = 0;
  function autoBackupToFolder() {
    if (!backupDirHandle) return Promise.resolve();
    var now = Date.now();
    if (now - lastFolderBackup < 30000) return Promise.resolve(); /* höchstens alle 30 s */
    lastFolderBackup = now;
    return backupDirHandle.queryPermission({ mode: 'readwrite' })
      .then(function (p) {
        if (p !== 'granted') return backupDirHandle.requestPermission({ mode: 'readwrite' });
        return p;
      })
      .then(function (p) {
        if (p !== 'granted') return;
        return backupDirHandle.getFileHandle('SOL-Noten-Backup-' + todayISO() + '.json', { create: true })
          .then(function (fh) { return fh.createWritable(); })
          .then(function (w) {
            return w.write(JSON.stringify(state)).then(function () { return w.close(); });
          })
          .then(function () {
            state.settings.lastExport = new Date().toISOString();
          });
      })
      .catch(function (e) { console.warn('Auto-Backup nicht möglich:', e); });
  }

  function daysSinceExport() {
    if (!state.settings.lastExport) return null;
    return Math.floor((Date.now() - new Date(state.settings.lastExport).getTime()) / 86400000);
  }

  /* ---------- Zugriffs-Helfer ---------- */

  function getState() { return state; }
  function yearById(id) { return state.schoolYears.find(function (y) { return y.id === id; }); }
  function classById(id) { return state.classes.find(function (c) { return c.id === id; }); }
  function courseById(id) { return state.courses.find(function (c) { return c.id === id; }); }
  function studentById(cls, id) { return cls.students.find(function (s) { return s.id === id; }); }

  function entriesFor(courseId, studentId, quarter) {
    var byCrit = [[], [], [], [], []];
    var list = [];
    for (var i = 0; i < state.soleiEntries.length; i++) {
      var e = state.soleiEntries[i];
      if (e.courseId === courseId && e.studentId === studentId && e.quarter === quarter) {
        byCrit[e.criterion].push(e.points);
        list.push(e);
      }
    }
    return { byCriterion: byCrit, list: list };
  }

  function addEntry(courseId, studentId, quarter, criterion, points, dateISO) {
    var e = {
      id: uid(), courseId: courseId, studentId: studentId, quarter: quarter,
      criterion: criterion, points: points, date: dateISO,
      createdAt: new Date().toISOString()
    };
    state.soleiEntries.push(e);
    save();
    return e;
  }
  function updateEntry(id, points, dateISO) {
    var e = state.soleiEntries.find(function (x) { return x.id === id; });
    if (e) { e.points = points; e.date = dateISO; save(); }
  }
  function deleteEntry(id) {
    var i = state.soleiEntries.findIndex(function (x) { return x.id === id; });
    if (i >= 0) { state.soleiEntries.splice(i, 1); save(); }
  }

  root.Store = {
    init: init, save: save, onChange: onChange, uid: uid, todayISO: todayISO,
    getState: getState, freshState: freshState,
    yearById: yearById, classById: classById, courseById: courseById, studentById: studentById,
    entriesFor: entriesFor, addEntry: addEntry, updateEntry: updateEntry, deleteEntry: deleteEntry,
    exportJSON: exportJSON, importJSON: importJSON,
    listSnapshots: listSnapshots, restoreSnapshot: restoreSnapshot,
    folderBackupSupported: folderBackupSupported, chooseBackupFolder: chooseBackupFolder,
    removeBackupFolder: removeBackupFolder, daysSinceExport: daysSinceExport,
    hasBackupFolder: function () { return !!backupDirHandle; }
  };
})(self);
