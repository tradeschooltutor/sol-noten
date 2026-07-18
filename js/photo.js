/* SOL-Noten – Fotoverkleinerung.
   Schneidet ein Bild mittig quadratisch zu und skaliert es auf 200×200 Pixel,
   Ausgabe als JPEG-Data-URL (verlässlich auf allen Geräten). */
(function (root) {
  'use strict';

  var SIZE = 200;
  var QUALITY = 0.82;

  /* File/Blob -> Promise<dataURL (200x200 JPEG)> */
  function processFile(file) {
    return readAsDataURL(file).then(loadImage).then(function (img) {
      return toSquareJpeg(img);
    });
  }

  function readAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error('Das Bild konnte nicht gelesen werden.')); };
      r.readAsDataURL(file);
    });
  }

  function loadImage(dataUrl) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Das Bild konnte nicht geladen werden.')); };
      img.src = dataUrl;
    });
  }

  function toSquareJpeg(img) {
    var side = Math.min(img.naturalWidth, img.naturalHeight);
    var sx = (img.naturalWidth - side) / 2;
    var sy = (img.naturalHeight - side) / 2;
    var canvas = document.createElement('canvas');
    canvas.width = SIZE; canvas.height = SIZE;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
    return canvas.toDataURL('image/jpeg', QUALITY);
  }

  root.Photo = { processFile: processFile, SIZE: SIZE };
})(self);
