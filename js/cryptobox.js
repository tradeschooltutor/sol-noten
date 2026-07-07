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

  /* ---------- Hauptschlüssel-Verwaltung (für die lokale Datenbank) ---------- */

  function randomBytes(n) { return crypto.getRandomValues(new Uint8Array(n)); }

  function generateMasterRaw() { return randomBytes(32); } /* 256 Bit */

  function importAesKey(rawBytes) {
    return subtle.importKey('raw', rawBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }

  /* Text mit einem AES-Schlüssel verschlüsseln -> {iv, data} (Base64) */
  function encryptWithKey(key, plainText) {
    var iv = randomBytes(12);
    return subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(plainText))
      .then(function (cipher) { return { iv: b64(iv), data: b64(cipher) }; });
  }

  function decryptWithKey(key, box) {
    return subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.data))
      .then(function (plain) { return new TextDecoder().decode(plain); })
      .catch(function () { throw new Error('Entschlüsselung fehlgeschlagen.'); });
  }

  /* Hauptschlüssel mit der PIN umhüllen -> {kdf, iv, data} */
  function wrapMaster(pin, rawKeyBytes) {
    var salt = randomBytes(16);
    var iv = randomBytes(12);
    return deriveKey(pin, salt, ITERATIONS).then(function (pinKey) {
      return subtle.encrypt({ name: 'AES-GCM', iv: iv }, pinKey, rawKeyBytes);
    }).then(function (cipher) {
      return {
        kdf: { name: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: b64(salt) },
        iv: b64(iv),
        data: b64(cipher)
      };
    });
  }

  /* Hauptschlüssel mit der PIN entpacken -> Uint8Array (wirft bei falscher PIN) */
  function unwrapMaster(pin, wrapped) {
    return deriveKey(pin, unb64(wrapped.kdf.salt), wrapped.kdf.iterations || ITERATIONS)
      .then(function (pinKey) {
        return subtle.decrypt({ name: 'AES-GCM', iv: unb64(wrapped.iv) }, pinKey, unb64(wrapped.data));
      })
      .then(function (raw) { return new Uint8Array(raw); })
      .catch(function () { throw new Error('Falsche PIN.'); });
  }

  function isKeyEnvelope(obj) { /* Auto-Backup, verschlüsselt mit dem Hauptschlüssel */
    return !!(obj && obj.app === 'SOL-Noten' && obj.encrypted === true &&
      obj.mode === 'pin-master' && obj.wrapped && obj.iv && obj.data);
  }

  /* ---------- Biometrie (WebAuthn) ---------- *
   * Prinzip: Wir erzeugen ein Passkey-Credential mit dem "prf"-Zusatz. Daraus
   * leitet das Gerät nach erfolgreicher biometrischer Prüfung ein stabiles
   * Geheimnis ab (für alle Anwesenheitsprüfungen gleich), mit dem wir den
   * Hauptschlüssel ein zweites Mal verpacken. Das Geheimnis verlässt den
   * sicheren Gerätespeicher nie; die App erhält es nur bei Anwesenheit. */

  function biometricsSupported() {
    return !!(window.PublicKeyCredential && navigator.credentials &&
      typeof navigator.credentials.create === 'function');
  }

  function platformAuthenticatorAvailable() {
    if (!biometricsSupported() || !window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)
      return Promise.resolve(false);
    return window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .catch(function () { return false; });
  }

  var PRF_SALT = new TextEncoder().encode('sol-noten-prf-v1');

  /* Neues biometrisches Credential anlegen. Rückgabe: {credentialId (b64)} */
  function bioRegister() {
    var userId = crypto.getRandomValues(new Uint8Array(16));
    var challenge = crypto.getRandomValues(new Uint8Array(32));
    return navigator.credentials.create({
      publicKey: {
        challenge: challenge,
        rp: { name: 'SOL-Noten' },
        user: { id: userId, name: 'SOL-Noten', displayName: 'SOL-Noten' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'required'
        },
        timeout: 60000,
        extensions: { prf: {} }
      }
    }).then(function (cred) {
      if (!cred) throw new Error('Es wurde kein biometrischer Schlüssel erstellt.');
      var ext = cred.getClientExtensionResults ? cred.getClientExtensionResults() : {};
      if (!ext || !ext.prf || !ext.prf.enabled) {
        throw new Error('Dieses Gerät unterstützt die biometrische Schlüsselableitung (PRF) nicht.');
      }
      return { credentialId: b64(new Uint8Array(cred.rawId)) };
    });
  }

  /* PRF-Geheimnis über eine biometrische Prüfung abrufen. Rückgabe: CryptoKey */
  function bioGetSecretKey(credentialIdB64) {
    var challenge = crypto.getRandomValues(new Uint8Array(32));
    return navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        allowCredentials: [{ type: 'public-key', id: unb64(credentialIdB64) }],
        userVerification: 'required',
        timeout: 60000,
        extensions: { prf: { eval: { first: PRF_SALT } } }
      }
    }).then(function (assertion) {
      if (!assertion) throw new Error('Biometrische Prüfung abgebrochen.');
      var ext = assertion.getClientExtensionResults ? assertion.getClientExtensionResults() : {};
      if (!ext || !ext.prf || !ext.prf.results || !ext.prf.results.first) {
        throw new Error('Die biometrische Schlüsselableitung ist auf diesem Gerät nicht verfügbar.');
      }
      return subtle.importKey('raw', ext.prf.results.first, 'AES-GCM', false, ['encrypt', 'decrypt']);
    });
  }

  /* Hauptschlüssel mit dem biometrischen Geheimnis verpacken -> {iv, data} */
  function bioWrapMaster(secretKey, rawKeyBytes) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return subtle.encrypt({ name: 'AES-GCM', iv: iv }, secretKey, rawKeyBytes).then(function (cipher) {
      return { iv: b64(iv), data: b64(cipher) };
    });
  }

  function bioUnwrapMaster(secretKey, box) {
    return subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, secretKey, unb64(box.data))
      .then(function (raw) { return new Uint8Array(raw); })
      .catch(function () { throw new Error('Biometrische Entsperrung fehlgeschlagen.'); });
  }

  return {
    supported: supported, encrypt: encrypt, decrypt: decrypt,
    isEncryptedEnvelope: isEncryptedEnvelope, isKeyEnvelope: isKeyEnvelope,
    generateMasterRaw: generateMasterRaw, importAesKey: importAesKey,
    encryptWithKey: encryptWithKey, decryptWithKey: decryptWithKey,
    wrapMaster: wrapMaster, unwrapMaster: unwrapMaster,
    biometricsSupported: biometricsSupported,
    platformAuthenticatorAvailable: platformAuthenticatorAvailable,
    bioRegister: bioRegister, bioGetSecretKey: bioGetSecretKey,
    bioWrapMaster: bioWrapMaster, bioUnwrapMaster: bioUnwrapMaster
  };
});
