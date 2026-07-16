/* SOL-Noten – Datenhaltung (rein lokal).
   IndexedDB mit drei Bereichen:
   - state:     der komplette App-Zustand als ein Dokument
   - snapshots: automatische interne Sicherungsstände (max. 14 Tage)
   - handles:   Ordner-Freigabe für automatische Backups (Chrome/Edge) */
(function (root) {
  'use strict';

  var DB_NAME = 'sol-noten', DB_VERSION = 2;
  var db = null;
  var state = null;
  var saveTimer = null;
  var listeners = [];
  var backupDirHandle = null;
  var security = null;      /* {enabled, wrapped, secretKind:'pin'|'password', fail:{count,lockUntil}, autolockMinutes} */
  var masterRaw = null;     /* Uint8Array – nur im Arbeitsspeicher der entsperrten App */
  var masterKey = null;     /* CryptoKey */

  function openDB() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains('state')) d.createObjectStore('state');
        if (!d.objectStoreNames.contains('snapshots')) d.createObjectStore('snapshots');
        if (!d.objectStoreNames.contains('handles')) d.createObjectStore('handles');
        if (!d.objectStoreNames.contains('photos')) d.createObjectStore('photos');
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
        gradingPct: Calc.DEFAULT_GRADING_PCT.slice(),
        theme: 'petrol',
        lastExport: null,
        lastPhotoExport: null,
        autoBackupFolder: false
      },
      absences: [],      /* {id, courseId, studentId, date, quarter} */
      schoolYears: [],   /* {id, name, startDate, holidays[], quarters[4], holidaySource} */
      classes: [],       /* {id, yearId, name, students[]} */
      courses: [],       /* {id, yearId, classId, subject, numOBT, numKA,
                             weights:{sl,obt,ka}, maxPoints:{1:[..],2:..,3:..,4:..},
                             currentQuarter, portfolio:{q:{studentId:grade}},
                             dismissedQuarterHint:{q:true}} */
      soleiEntries: [],  /* {id, courseId, studentId, quarter, criterion, points, date, createdAt} */
      uploadTallies: []  /* {courseId, studentId, quarter, done, missed} – Ergebnis-Uploads, Zählung am Quartalsende */
    };
  }

  /* ---------- Laden / Speichern ---------- */

  function migrate(s) {
    if (s && s.settings) {
      if (!s.settings.gradingPct) s.settings.gradingPct = Calc.DEFAULT_GRADING_PCT.slice();
      if (!s.settings.theme) s.settings.theme = 'petrol';
      if (!Array.isArray(s.absences)) s.absences = [];
      if (!Array.isArray(s.uploadTallies)) s.uploadTallies = [];
      if (Array.isArray(s.courses)) s.courses.forEach(function (c) {
        if (typeof c.uploadCriterion !== 'number') c.uploadCriterion = 2; /* Standard: 3. Kriterium (Arbeitsergebnisse) */
        if (typeof c.completed !== 'boolean') c.completed = false; /* Schuljahr abgeschlossen (Q4-Abschluss) */
      });
    }
    return s;
  }

  function init() {
    return openDB()
      .then(function () { return idbGet('handles', 'security').catch(function () { return null; }); })
      .then(function (sec) {
        security = sec || null;
        return idbGet('handles', 'backupDir').catch(function () { return null; });
      })
      .then(function (h) {
        backupDirHandle = h || null;
        if (security && security.enabled) {
          return { locked: true }; /* Daten bleiben verschlüsselt, bis die PIN eingegeben ist */
        }
        return idbGet('state', 'main').then(function (saved) {
          state = migrate(saved) || freshState();
          return state;
        });
      });
  }

  function saveSecurity() {
    return idb('handles', 'readwrite', function (st) {
      if (security) st.put(security, 'security');
      else st.delete('security');
    });
  }

  function isEncrypted() { return !!(security && security.enabled); }
  function isLocked() { return isEncrypted() && !masterKey; }

  /* Verbleibende Wartezeit (Sekunden) nach zu vielen Fehlversuchen */
  function getLockWait() {
    if (!security || !security.fail) return 0;
    var rest = Math.ceil((security.fail.lockUntil - Date.now()) / 1000);
    return rest > 0 ? rest : 0;
  }
  function failedAttempts() { return (security && security.fail && security.fail.count) || 0; }

  /* App entsperren: PIN prüft sich selbst über das Entpacken des Hauptschlüssels. */
  function unlock(pin) {
    if (!isEncrypted()) return Promise.reject(new Error('Keine Verschlüsselung aktiv.'));
    var wait = getLockWait();
    if (wait > 0) {
      var e1 = new Error('Zu viele Fehlversuche. Bitte warten.');
      e1.waitSeconds = wait;
      return Promise.reject(e1);
    }
    return CryptoBox.unwrapMaster(pin, security.wrapped).then(function (raw) {
      masterRaw = raw;
      return CryptoBox.importAesKey(raw);
    }).then(function (key) {
      masterKey = key;
      security.fail = { count: 0, lockUntil: 0 };
      return saveSecurity();
    }).then(function () {
      return idbGet('state', 'main');
    }).then(function (saved) {
      if (saved && saved.enc) {
        return CryptoBox.decryptWithKey(masterKey, saved).then(function (plain) {
          state = migrate(JSON.parse(plain));
          return state;
        });
      }
      state = migrate(saved) || freshState();
      return state;
    }).catch(function (err) {
      if (/Falsche PIN/.test(err.message || '')) {
        masterRaw = null; masterKey = null;
        security.fail = security.fail || { count: 0, lockUntil: 0 };
        security.fail.count++;
        if (security.fail.count >= 5) {
          security.fail.lockUntil = Date.now() + 30000 * Math.pow(2, security.fail.count - 5);
        }
        return saveSecurity().then(function () {
          var e = new Error('Falsche PIN.');
          e.waitSeconds = getLockWait();
          e.attempts = security.fail.count;
          throw e;
        });
      }
      throw err;
    });
  }

  function lock() {
    masterRaw = null; masterKey = null; state = null;
  }

  /* ---------- Biometrie ---------- */

  function biometricsEnabled() { return !!(security && security.bio && security.bio.credentialId); }

  /* Biometrie einrichten – die PIN entpackt den Hauptschlüssel, ohne den
     laufenden App-Zustand zu verändern (kein Neuladen, keine Fehlersperre). */
  function enableBiometrics(pin) {
    if (!isEncrypted()) return Promise.reject(new Error('Verschlüsselung ist nicht aktiv.'));
    var ensureMaster = masterRaw
      ? Promise.resolve(masterRaw)
      : CryptoBox.unwrapMaster(pin, security.wrapped);
    return ensureMaster.then(function (raw) {
      masterRaw = raw;
      /* Bekannten Passkey ausschließen, damit der Authenticator kein Duplikat anlegt (F8). */
      var knownId = security.bio && security.bio.credentialId;
      return CryptoBox.bioRegister(knownId || null);
    }).then(function (reg) {
      return CryptoBox.bioGetSecretKey(reg.credentialId).then(function (secretKey) {
        return CryptoBox.bioWrapMaster(secretKey, masterRaw).then(function (box) {
          security.bio = { credentialId: reg.credentialId, iv: box.iv, data: box.data };
          return saveSecurity();
        });
      });
    });
  }

  function disableBiometrics() {
    if (security) { delete security.bio; return saveSecurity(); }
    return Promise.resolve();
  }

  /* Entsperren per Biometrie: PRF-Geheimnis abrufen, Hauptschlüssel entpacken,
     Datenbank laden – analog zu unlock(pin), aber ohne PIN. */
  function unlockBiometric() {
    if (!biometricsEnabled()) return Promise.reject(new Error('Biometrie ist nicht eingerichtet.'));
    var bio = security.bio;
    return CryptoBox.bioGetSecretKey(bio.credentialId).then(function (secretKey) {
      return CryptoBox.bioUnwrapMaster(secretKey, { iv: bio.iv, data: bio.data });
    }).then(function (raw) {
      masterRaw = raw;
      return CryptoBox.importAesKey(raw);
    }).then(function (key) {
      masterKey = key;
      return idbGet('state', 'main');
    }).then(function (saved) {
      if (saved && saved.enc) {
        return CryptoBox.decryptWithKey(masterKey, saved).then(function (plain) {
          state = migrate(JSON.parse(plain));
          return state;
        });
      }
      state = migrate(saved) || freshState();
      return state;
    });
  }

  /* Verschlüsselung aktivieren: Hauptschlüssel erzeugen, mit PIN oder Passwort umhüllen,
     Datenbank und Sicherungsstände verschlüsselt neu schreiben. */
  function enableEncryption(secret, kind) {
    masterRaw = CryptoBox.generateMasterRaw();
    return CryptoBox.wrapMaster(secret, masterRaw).then(function (wrapped) {
      security = {
        enabled: true, wrapped: wrapped,
        secretKind: kind === 'password' ? 'password' : 'pin',
        fail: { count: 0, lockUntil: 0 }, autolockMinutes: 5,
        createdAt: new Date().toISOString()
      };
      return CryptoBox.importAesKey(masterRaw);
    }).then(function (key) {
      masterKey = key;
      return saveSecurity();
    }).then(function () { return persist(); })
      .then(function () { return reencryptSnapshots(true); })
      .then(function () { return reencryptPhotos(true); });
  }

  function changePin(oldSecret, newSecret, newKind) {
    return CryptoBox.unwrapMaster(oldSecret, security.wrapped).then(function (raw) {
      return CryptoBox.wrapMaster(newSecret, raw);
    }).then(function (wrapped) {
      security.wrapped = wrapped;
      if (newKind) security.secretKind = newKind === 'password' ? 'password' : 'pin';
      return saveSecurity();
    });
  }

  /* 'pin' (Standard, auch für Bestandsnutzer ohne Flag) oder 'password'. */
  function secretKind() {
    return (security && security.secretKind) === 'password' ? 'password' : 'pin';
  }

  function setAutolock(minutesOrNull) {
    if (security) { security.autolockMinutes = minutesOrNull; saveSecurity(); }
  }
  function getAutolock() { return security ? security.autolockMinutes : null; }

  /* Sicherungsstände ver- bzw. entschlüsseln */
  function reencryptSnapshots(encrypt) {
    return new Promise(function (resolve) {
      var tx = db.transaction('snapshots', 'readonly');
      var req = tx.objectStore('snapshots').getAllKeys();
      req.onsuccess = function () { resolve(req.result || []); };
      req.onerror = function () { resolve([]); };
    }).then(function (keys) {
      var chain = Promise.resolve();
      keys.forEach(function (k) {
        chain = chain.then(function () { return idbGet('snapshots', k); }).then(function (snap) {
          if (!snap) return;
          if (encrypt && !snap.enc) {
            return CryptoBox.encryptWithKey(masterKey, JSON.stringify(snap)).then(function (box) {
              box.enc = true;
              return idb('snapshots', 'readwrite', function (st) { st.put(box, k); });
            });
          }
          if (!encrypt && snap.enc) {
            return CryptoBox.decryptWithKey(masterKey, snap).then(function (plain) {
              return idb('snapshots', 'readwrite', function (st) { st.put(JSON.parse(plain), k); });
            });
          }
        });
      });
      return chain;
    });
  }

  /* Kompletter Neustart (PIN vergessen): löscht alle Daten unwiderruflich. */
  function factoryReset() {
    security = null; masterRaw = null; masterKey = null;
    state = freshState();
    return Promise.all([
      idb('state', 'readwrite', function (st) { st.clear(); }),
      idb('snapshots', 'readwrite', function (st) { st.clear(); }),
      idb('handles', 'readwrite', function (st) { st.clear(); }),
      idb('photos', 'readwrite', function (st) { st.clear(); })
    ]).then(function () {
      backupDirHandle = null;
      return idb('state', 'readwrite', function (st) { st.put(state, 'main'); });
    });
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
    if (!state) return Promise.resolve();
    var write;
    if (isEncrypted() && masterKey) {
      write = CryptoBox.encryptWithKey(masterKey, JSON.stringify(state)).then(function (box) {
        box.enc = true;
        return idb('state', 'readwrite', function (st) { return st.put(box, 'main'); });
      });
    } else {
      write = idb('state', 'readwrite', function (st) { return st.put(state, 'main'); });
    }
    return write
      .then(dailySnapshot)
      .then(autoBackupToFolder)
      .catch(function (e) { console.error('Speichern fehlgeschlagen:', e); });
  }

  /* Ein interner Sicherungsstand pro Tag, die letzten 14 werden behalten. */
  function dailySnapshot() {
    var key = todayISO();
    var put;
    if (isEncrypted() && masterKey) {
      put = CryptoBox.encryptWithKey(masterKey, JSON.stringify(state)).then(function (box) {
        box.enc = true;
        return idb('snapshots', 'readwrite', function (st) { st.put(box, key); });
      });
    } else {
      put = idb('snapshots', 'readwrite', function (st) {
        st.put(JSON.parse(JSON.stringify(state)), key);
      });
    }
    return put.then(function () {
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
      if (snap.enc) {
        return CryptoBox.decryptWithKey(masterKey, snap).then(function (plain) {
          state = migrate(JSON.parse(plain));
        });
      }
      state = migrate(snap);
    }).then(function () { return persist(); }).then(notify);
  }

  /* ---------- Fotos (eigener Speicherbereich, verschlüsselt mit Hauptschlüssel) ---------- */

  /* Ein Foto (Data-URL-String) zu einem Schüler speichern. */
  function savePhoto(studentId, dataUrl) {
    var write;
    if (isEncrypted() && masterKey) {
      write = CryptoBox.encryptWithKey(masterKey, dataUrl).then(function (box) {
        box.enc = true;
        return idb('photos', 'readwrite', function (st) { st.put(box, studentId); });
      });
    } else {
      write = idb('photos', 'readwrite', function (st) { st.put({ raw: dataUrl }, studentId); });
    }
    return write;
  }

  /* Foto laden -> Data-URL oder null. */
  function getPhoto(studentId) {
    return idbGet('photos', studentId).then(function (rec) {
      if (!rec) return null;
      if (rec.enc) {
        if (!masterKey) return null;
        return CryptoBox.decryptWithKey(masterKey, rec).catch(function () { return null; });
      }
      return rec.raw || null;
    });
  }

  function deletePhoto(studentId) {
    return idb('photos', 'readwrite', function (st) { st.delete(studentId); });
  }

  function photoKeys() {
    return new Promise(function (resolve) {
      var tx = db.transaction('photos', 'readonly');
      var req = tx.objectStore('photos').getAllKeys();
      req.onsuccess = function () { resolve(req.result || []); };
      req.onerror = function () { resolve([]); };
    });
  }

  function hasPhoto(studentId) {
    return idbGet('photos', studentId).then(function (r) { return !!r; });
  }

  /* Alle Fotos als eine Sicherungsdatei exportieren; immer mit Passwort
     verschlüsselt (AES-256-GCM). Ein Klartext-Export ist bewusst nicht möglich. */
  function exportPhotos(password) {
    if (!password) {
      return Promise.reject(new Error('Für die Foto-Sicherung ist ein Passwort erforderlich.'));
    }
    return photoKeys().then(function (keys) {
      var chain = Promise.resolve();
      var out = {};
      keys.forEach(function (k) {
        chain = chain.then(function () { return getPhoto(k); }).then(function (url) {
          if (url) out[k] = url;
        });
      });
      return chain.then(function () {
        var payload = { app: 'SOL-Noten', kind: 'photos', v: 1, photos: out,
          count: Object.keys(out).length, exportedAt: new Date().toISOString() };
        var finish = function (text) {
          downloadText('SOL-Noten-Fotos-' + todayISO() + '.json', text);
          state.settings.lastPhotoExport = new Date().toISOString();
          save();
        };
        return CryptoBox.encrypt(JSON.stringify(payload), password).then(function (env) {
          env.kind = 'photos';
          finish(JSON.stringify(env));
        });
      });
    });
  }

  function parsePhotoBackup(text) {
    if (text.length > PHOTO_IMPORT_MAX_BYTES) {
      throw new Error('Die Datei ist zu groß für eine SOL-Noten-Foto-Sicherung (Limit 50 MB) und wurde abgelehnt.');
    }
    var data;
    try { data = JSON.parse(text); }
    catch (e) { throw new Error('Die Datei ist keine gültige Foto-Sicherung (JSON-Fehler).'); }
    if (CryptoBox.isEncryptedEnvelope(data)) return { encrypted: true, envelope: data };
    if (!data || data.app !== 'SOL-Noten' || data.kind !== 'photos' || !data.photos) {
      throw new Error('Die Datei ist keine SOL-Noten-Foto-Sicherung.');
    }
    return { encrypted: false, data: data };
  }

  /* Fotos aus einer (bereits entschlüsselten) Sicherung übernehmen. */
  function applyPhotoImport(data) {
    if (!data || typeof data !== 'object' || !data.photos ||
        typeof data.photos !== 'object' || Array.isArray(data.photos)) {
      throw new Error('Die Datei ist keine SOL-Noten-Foto-Sicherung.');
    }
    scanForbiddenKeys(data);
    var entries = Object.keys(data.photos);
    entries.forEach(function (studentId) {
      var url = data.photos[studentId];
      if (typeof url !== 'string' || url.indexOf('data:image/') !== 0) {
        throw new Error('Die Foto-Sicherung enthält ungültige Bilddaten und wurde abgelehnt.');
      }
    });
    var chain = Promise.resolve();
    entries.forEach(function (studentId) {
      chain = chain.then(function () { return savePhoto(studentId, data.photos[studentId]); });
    });
    return chain.then(function () { return entries.length; });
  }

  function daysSincePhotoExport() {
    if (!state.settings.lastPhotoExport) return null;
    return Math.floor((Date.now() - new Date(state.settings.lastPhotoExport).getTime()) / 86400000);
  }

  /* Bei Aktivierung/Deaktivierung der Verschlüsselung auch die Fotos umschlüsseln. */
  function reencryptPhotos(encrypt) {
    return photoKeys().then(function (keys) {
      var chain = Promise.resolve();
      keys.forEach(function (k) {
        chain = chain.then(function () { return idbGet('photos', k); }).then(function (rec) {
          if (!rec) return;
          if (encrypt && !rec.enc) {
            return CryptoBox.encryptWithKey(masterKey, rec.raw).then(function (box) {
              box.enc = true;
              return idb('photos', 'readwrite', function (st) { st.put(box, k); });
            });
          }
          if (!encrypt && rec.enc) {
            return CryptoBox.decryptWithKey(masterKey, rec).then(function (url) {
              return idb('photos', 'readwrite', function (st) { st.put({ raw: url }, k); });
            });
          }
        });
      });
      return chain;
    });
  }

  /* ---------- Export / Import (Backup-Datei) ---------- */

  function downloadText(name, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* Backup exportieren; immer mit Passwort verschlüsselt (AES-256-GCM).
     Ein unverschlüsselter Klartext-Export ist bewusst nicht mehr möglich. */
  function exportJSON(password) {
    if (!password) {
      return Promise.reject(new Error('Für das Backup ist ein Passwort erforderlich.'));
    }
    return CryptoBox.encrypt(JSON.stringify(state), password).then(function (env) {
      downloadText('SOL-Noten-Backup-' + todayISO() + '.json', JSON.stringify(env));
      state.settings.lastExport = new Date().toISOString();
      save();
    });
  }

  /* ---------- Import-Schutz (F7): Größenlimits und Struktur-Prüfung ---------- */

  var IMPORT_MAX_BYTES = 10 * 1024 * 1024;        /* Noten-Backup: großzügig, echte Dateien liegen weit darunter */
  var PHOTO_IMPORT_MAX_BYTES = 50 * 1024 * 1024;  /* Foto-Sicherung: Data-URLs vieler Klassen */

  /* Lehnt manipulationsverdächtige Schlüsselnamen im gesamten Objektbaum ab. */
  function scanForbiddenKeys(node) {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(scanForbiddenKeys); return; }
    Object.keys(node).forEach(function (k) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
        throw new Error('Die Datei enthält unzulässige Feldnamen und wurde aus Sicherheitsgründen abgelehnt.');
      }
      scanForbiddenKeys(node[k]);
    });
  }

  /* Struktur-Prüfung vor der Übernahme eines Backups: erwartete Bereiche und
     Grundtypen, keine Voll-Schemaprüfung (bleibt vorwärtskompatibel zu neueren
     Backups mit zusätzlichen Feldern). */
  function validateImport(data) {
    var bad = new Error('Die Datei ist keine SOL-Noten-Backup-Datei oder hat nicht den erwarteten Aufbau.');
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw bad;
    if (data.app !== 'SOL-Noten') throw bad;
    if (!data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) throw bad;
    ['courses', 'schoolYears', 'classes', 'soleiEntries'].forEach(function (k) {
      if (!Array.isArray(data[k])) throw bad;
    });
    ['absences', 'uploadTallies'].forEach(function (k) { /* fehlen in Alt-Backups; migrate() ergänzt sie */
      if (data[k] !== undefined && !Array.isArray(data[k])) throw bad;
    });
    ['courses', 'schoolYears', 'classes', 'soleiEntries', 'absences', 'uploadTallies'].forEach(function (k) {
      (data[k] || []).forEach(function (el) {
        if (!el || typeof el !== 'object' || Array.isArray(el)) throw bad;
        ['id', 'courseId', 'studentId', 'yearId', 'classId'].forEach(function (idKey) {
          if (el[idKey] !== undefined && typeof el[idKey] !== 'string') throw bad;
        });
      });
    });
    scanForbiddenKeys(data);
  }

  function parseBackup(text) {
    if (text.length > IMPORT_MAX_BYTES) {
      throw new Error('Die Datei ist zu groß für ein SOL-Noten-Backup (Limit 10 MB) und wurde abgelehnt.');
    }
    var data;
    try { data = JSON.parse(text); }
    catch (e) { throw new Error('Die Datei ist keine gültige Backup-Datei (JSON-Fehler).'); }
    if (CryptoBox.isKeyEnvelope(data)) return { encrypted: true, keyEnvelope: true, envelope: data };
    if (CryptoBox.isEncryptedEnvelope(data)) return { encrypted: true, envelope: data };
    if (!data || data.app !== 'SOL-Noten' || !Array.isArray(data.courses)) {
      throw new Error('Die Datei ist keine SOL-Noten-Backup-Datei.');
    }
    return { encrypted: false, data: data };
  }

  function applyImport(data) {
    validateImport(data);
    state = migrate(data);
    save();
  }

  function importJSON(text) { /* unverschlüsselter Direktimport (Altbestand) */
    var p = parseBackup(text);
    if (p.encrypted) throw new Error('Diese Backup-Datei ist verschlüsselt.');
    applyImport(p.data);
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
    backupPermissionNeeded = false;
    state.settings.autoBackupFolder = false;
    return idb('handles', 'readwrite', function (st) { st.delete('backupDir'); })
      .then(function () { save(); });
  }

  var lastFolderBackup = 0;
  var backupPermissionNeeded = false;
  function autoBackupToFolder() {
    if (!backupDirHandle) return Promise.resolve();
    var now = Date.now();
    if (now - lastFolderBackup < 30000) return Promise.resolve(); /* höchstens alle 30 s */
    lastFolderBackup = now;
    /* Nur STILL prüfen (queryPermission). requestPermission würde mitten in der
       Arbeit den Browser-Dialog „Darf diese Website Dateien bearbeiten?“ öffnen –
       die Nachfrage geschieht stattdessen bewusst per Klick (regrantBackupPermission). */
    return backupDirHandle.queryPermission({ mode: 'readwrite' })
      .then(function (p) {
        if (p !== 'granted') { backupPermissionNeeded = true; return; }
        backupPermissionNeeded = false;
        return writeFolderBackup();
      })
      .catch(function (e) { console.warn('Auto-Backup nicht möglich:', e); });
  }

  function writeFolderBackup() {
    /* Nur verschlüsselt sichern. Ohne aktive Verschlüsselung entsteht bewusst
       kein Auto-Backup (kein Klartext auf der Platte). In der Praxis erzwingt
       die App ohnehin die PIN, bevor Daten erfasst werden. */
    if (!(isEncrypted() && masterKey)) return Promise.resolve();
    return CryptoBox.encryptWithKey(masterKey, JSON.stringify(state)).then(function (box) {
      return JSON.stringify({
        app: 'SOL-Noten', encrypted: true, v: 2, mode: 'pin-master',
        wrapped: security.wrapped, iv: box.iv, data: box.data
      });
    }).then(function (text) {
      return backupDirHandle.getFileHandle('SOL-Noten-Backup-' + todayISO() + '.json', { create: true })
        .then(function (fh) { return fh.createWritable(); })
        .then(function (w) {
          return w.write(text).then(function () { return w.close(); });
        });
    }).then(function () {
      state.settings.lastExport = new Date().toISOString();
    });
  }

  /* Vom UI abfragbar: Wartet das Ordner-Backup auf eine Freigabe? */
  function backupFolderNeedsPermission() {
    return !!(backupPermissionNeeded && backupDirHandle && state &&
      state.settings && state.settings.autoBackupFolder);
  }

  /* Freigabe bewusst anfordern (muss aus einer Nutzeraktion heraus aufgerufen
     werden, sonst verweigert der Browser den Dialog). Bei Erfolg wird sofort
     ein Backup geschrieben. */
  function regrantBackupPermission() {
    if (!backupDirHandle) return Promise.resolve(false);
    return backupDirHandle.requestPermission({ mode: 'readwrite' }).then(function (p) {
      if (p !== 'granted') return false;
      backupPermissionNeeded = false;
      lastFolderBackup = Date.now();
      return writeFolderBackup().then(function () { return true; });
    }).catch(function () { return false; });
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
    /* Ergebnis-Uploads (Quartalsend-Zählung, ohne Datum) in die Durchschnitte einrechnen:
       jeder erledigte Upload = Maximalpunktzahl des gewählten Kriteriums, jeder vergessene = 0.
       Bewusst NICHT in "list" – dort stehen nur datierte Vergaben (Diagramm/Vergabeliste). */
    var t = uploadTallyFor(courseId, studentId, quarter);
    if (t && (t.done > 0 || t.missed > 0)) {
      var course = courseById(courseId);
      if (course) {
        var ci = typeof course.uploadCriterion === 'number' ? course.uploadCriterion : 2;
        var max = (course.maxPoints && course.maxPoints[quarter] && course.maxPoints[quarter][ci]) || 3;
        for (var d = 0; d < t.done; d++) byCrit[ci].push(max);
        for (var m = 0; m < t.missed; m++) byCrit[ci].push(0);
      }
    }
    return { byCriterion: byCrit, list: list };
  }

  /* ---------- Ergebnis-Uploads (Zählung am Quartalsende) ---------- */

  function uploadTallyFor(courseId, studentId, quarter) {
    return state.uploadTallies.find(function (t) {
      return t.courseId === courseId && t.studentId === studentId && t.quarter === quarter;
    }) || null;
  }

  /* Setzt (ersetzt) die Upload-Zählung. done/missed = 0/0 entfernt den Eintrag. */
  function setUploadTally(courseId, studentId, quarter, done, missed) {
    var i = state.uploadTallies.findIndex(function (t) {
      return t.courseId === courseId && t.studentId === studentId && t.quarter === quarter;
    });
    if (!done && !missed) {
      if (i >= 0) state.uploadTallies.splice(i, 1);
    } else if (i >= 0) {
      state.uploadTallies[i].done = done;
      state.uploadTallies[i].missed = missed;
    } else {
      state.uploadTallies.push({ courseId: courseId, studentId: studentId, quarter: quarter, done: done, missed: missed });
    }
    save();
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

  /* ---------- Unentschuldigte Fehlzeiten ---------- */

  /* Erfasst eine unentschuldigte Fehlzeit und vergibt automatisch
     0 Punkte in allen 5 SoLei-Kriterien (verknüpft über absenceId). */
  function addAbsence(courseId, studentId, dateISO, quarter) {
    var dup = state.absences.some(function (a) {
      return a.courseId === courseId && a.studentId === studentId && a.date === dateISO;
    });
    if (dup) return null;
    var a = { id: uid(), courseId: courseId, studentId: studentId, date: dateISO, quarter: quarter };
    state.absences.push(a);
    for (var c = 0; c < 5; c++) {
      state.soleiEntries.push({
        id: uid(), courseId: courseId, studentId: studentId, quarter: quarter,
        criterion: c, points: 0, date: dateISO, absenceId: a.id,
        createdAt: new Date().toISOString()
      });
    }
    save();
    return a;
  }

  function removeAbsence(absenceId) {
    state.absences = state.absences.filter(function (a) { return a.id !== absenceId; });
    state.soleiEntries = state.soleiEntries.filter(function (e) { return e.absenceId !== absenceId; });
    save();
  }

  function absencesFor(courseId, studentId, quarter) {
    return state.absences.filter(function (a) {
      return a.courseId === courseId &&
        (studentId == null || a.studentId === studentId) &&
        (quarter == null || a.quarter === quarter);
    }).sort(function (x, y) { return x.date.localeCompare(y.date); });
  }

  root.Store = {
    init: init, save: save, onChange: onChange, uid: uid, todayISO: todayISO,
    getState: getState, freshState: freshState,
    yearById: yearById, classById: classById, courseById: courseById, studentById: studentById,
    entriesFor: entriesFor, addEntry: addEntry, updateEntry: updateEntry, deleteEntry: deleteEntry,
    uploadTallyFor: uploadTallyFor, setUploadTally: setUploadTally,
    addAbsence: addAbsence, removeAbsence: removeAbsence, absencesFor: absencesFor,
    exportJSON: exportJSON, importJSON: importJSON, parseBackup: parseBackup, applyImport: applyImport,
    listSnapshots: listSnapshots, restoreSnapshot: restoreSnapshot,
    savePhoto: savePhoto, getPhoto: getPhoto, deletePhoto: deletePhoto,
    hasPhoto: hasPhoto, photoKeys: photoKeys,
    exportPhotos: exportPhotos, parsePhotoBackup: parsePhotoBackup, applyPhotoImport: applyPhotoImport,
    daysSincePhotoExport: daysSincePhotoExport,
    isEncrypted: isEncrypted, isLocked: isLocked, unlock: unlock, lock: lock,
    enableEncryption: enableEncryption,
    changePin: changePin, secretKind: secretKind, setAutolock: setAutolock, getAutolock: getAutolock,
    biometricsEnabled: biometricsEnabled, enableBiometrics: enableBiometrics,
    disableBiometrics: disableBiometrics, unlockBiometric: unlockBiometric,
    getLockWait: getLockWait, failedAttempts: failedAttempts, factoryReset: factoryReset,
    folderBackupSupported: folderBackupSupported, chooseBackupFolder: chooseBackupFolder,
    backupFolderNeedsPermission: backupFolderNeedsPermission, regrantBackupPermission: regrantBackupPermission,
    removeBackupFolder: removeBackupFolder, daysSinceExport: daysSinceExport,
    hasBackupFolder: function () { return !!backupDirHandle; }
  };
})(self);
