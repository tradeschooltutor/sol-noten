/* SOL-Noten – Verschlüsselung für Backup-Dateien.
   AES-256-GCM, Schlüssel aus Passwort über PBKDF2 (SHA-256, 310.000 Runden).
   Nutzt ausschließlich die Web-Crypto-Schnittstelle des Browsers. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.CryptoBox = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ITERATIONS = 310000;
  var subtle = (typeof crypto !== 'undefined' && crypto.subtle) ? crypto.subtle : null;

  function supported() { return !!subtle; }

  function b64(bytes) {
    var s = '';
    var u = new Uint8Array(bytes);
    for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s);
  }
  function unb64(str) {
    var s = atob(str);
    var u = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u;
  }

  function deriveKey(password, salt, iterations) {
    return subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return subtle.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      });
  }

  /* Verschlüsselt einen Text mit Passwort.
     Rückgabe: Promise -> Umschlag-Objekt (JSON-tauglich). */
  function encrypt(plainText, password) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return deriveKey(password, salt, ITERATIONS).then(function (key) {
      return subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(plainText));
    }).then(function (cipher) {
      return {
        app: 'SOL-Noten',
        encrypted: true,
        v: 1,
        kdf: { name: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: b64(salt) },
        iv: b64(iv),
        data: b64(cipher)
      };
    });
  }

  /* Entschlüsselt einen Umschlag. Promise -> Klartext.
     Wirft bei falschem Passwort oder beschädigter Datei. */
  function decrypt(envelope, password) {
    var salt = unb64(envelope.kdf.salt);
    var iv = unb64(envelope.iv);
    var data = unb64(envelope.data);
    var iter = envelope.kdf.iterations || ITERATIONS;
    return deriveKey(password, salt, iter).then(function (key) {
      return subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, data);
    }).then(function (plain) {
      return new TextDecoder().decode(plain);
    }).catch(function () {
      throw new Error('Entschlüsselung fehlgeschlagen – falsches Passwort oder beschädigte Datei.');
    });
  }

  function isEncryptedEnvelope(obj) {
    return !!(obj && obj.app === 'SOL-Noten' && obj.encrypted === true && obj.data && obj.iv && obj.kdf);
  }

  return { supported: supported, encrypt: encrypt, decrypt: decrypt, isEncryptedEnvelope: isEncryptedEnvelope };
});
