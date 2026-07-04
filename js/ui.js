/* SOL-Noten – kleine UI-Helfer (ohne Framework) */
(function (root) {
  'use strict';

  /* h('div.klasse#id', {attrs}, kinder...) */
  function h(tag, attrs) {
    var parts = tag.split(/([.#])/);
    var el = document.createElement(parts[0] || 'div');
    for (var i = 1; i < parts.length; i += 2) {
      if (parts[i] === '.') el.classList.add(parts[i + 1]);
      if (parts[i] === '#') el.id = parts[i + 1];
    }
    var start = 2;
    if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
      start = 1;
    } else if (attrs) {
      for (var k in attrs) {
        var v = attrs[k];
        if (k === 'onclick' || k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (v !== null && v !== undefined && v !== false) el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (var a = start; a < arguments.length; a++) append(el, arguments[a]);
    return el;
  }
  function append(el, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(el, c); }); return; }
    if (child instanceof Node) { el.appendChild(child); return; }
    el.appendChild(document.createTextNode(String(child)));
  }

  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  /* ---------- Toast mit optionalem Rückgängig ---------- */
  var toastTimer = null;
  function toast(msg, undoFn) {
    var host = document.getElementById('toast-host');
    clear(host);
    var t = h('div.toast', {}, h('span', {}, msg));
    if (undoFn) {
      t.appendChild(h('button.toast-undo', {
        onclick: function () { undoFn(); clear(host); if (toastTimer) clearTimeout(toastTimer); }
      }, 'Rückgängig'));
    }
    host.appendChild(t);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { clear(host); }, undoFn ? 5000 : 2500);
  }

  /* ---------- Modale ---------- */
  function modal(title, bodyNodes, buttons) {
    return new Promise(function (resolve) {
      var host = document.getElementById('modal-host');
      function close(val) { clear(host); resolve(val); }
      var box = h('div.modal',
        h('h2.modal-title', {}, title),
        h('div.modal-body', {}, bodyNodes),
        h('div.modal-actions', {},
          (buttons || [{ label: 'OK', value: true, primary: true }]).map(function (b) {
            return h('button' + (b.primary ? '.btn-primary' : b.danger ? '.btn-danger' : '.btn-plain'),
              { onclick: function () {
                  if (b.validate && !b.validate()) return;
                  close(b.value);
                } }, b.label);
          })
        )
      );
      var back = h('div.modal-backdrop', { onclick: function (e) { if (e.target === back) close(null); } }, box);
      host.appendChild(back);
    });
  }

  function confirmDialog(title, text, okLabel, danger) {
    return modal(title, h('p', {}, text), [
      { label: 'Abbrechen', value: false },
      { label: okLabel || 'OK', value: true, primary: !danger, danger: !!danger }
    ]);
  }

  function fmtDate(isoDate) {
    if (!isoDate) return '';
    var p = isoDate.split('-');
    return p[2] + '.' + p[1] + '.' + p[0];
  }

  root.UI = { h: h, clear: clear, toast: toast, modal: modal, confirmDialog: confirmDialog, fmtDate: fmtDate };
})(self);
