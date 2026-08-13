/* SENTINEL//OPS bridge — auto-injected by server.js; falls back to demo mode when no API */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var API = false, TOKEN = null, locked = false, attempts = 0;
  var DEMO = { user: 'operator', pass: 'letmein2026' };

  fetch('/api/health').then(function (r) { return r.json(); }).then(function (j) {
    if (j.status === 'online') { API = true; var f = $('#fBuild'); if (f) f.textContent = 'MODE: FULL-STACK · API LINKED'; }
  }).catch(function () {});

  function rebind(el) { var c = el.cloneNode(true); el.parentNode.replaceChild(c, el); return c; }
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var lBtn = rebind($('#lBtn'));
  lBtn.addEventListener('click', async function () {
    if (locked) return;
    var u = $('#lEmail').value.trim().toLowerCase(), p = $('#lPass').value, m = $('#lMsg');
    if (!u || !p) { m.textContent = '[!] both fields required'; m.className = 'login-msg err'; return; }
    if (API) {
      try {
        var r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: u, pass: p }) });
        var j = await r.json();
        if (r.ok) { TOKEN = j.token; m.textContent = '[✓] server verified salted hash — session token issued'; m.className = 'login-msg ok';
          await delay(400); $('#loginForm').style.display = 'none'; $('#granted').classList.add('on'); loadInbox(); }
        else if (j.locked) { locked = true; var t = j.retry || 10; m.className = 'login-msg err';
          var iv = setInterval(function () { t--; m.textContent = '[✕] SERVER RATE-LIMIT — retry in ' + t + 's'; if (t <= 0) { clearInterval(iv); locked = false; m.textContent = ''; } }, 1000); }
        else { m.textContent = '[✕] ' + j.error; m.className = 'login-msg err'; }
        return;
      } catch (e) {}
    }
    if (u.split('@')[0] === DEMO.user && p === DEMO.pass) {
      m.textContent = '[✓] verified (static demo mode)'; m.className = 'login-msg ok';
      await delay(400); $('#loginForm').style.display = 'none'; $('#granted').classList.add('on');
    } else { attempts++; var left = 5 - attempts; m.className = 'login-msg err';
      if (left <= 0) { locked = true; var t2 = 10, iv2 = setInterval(function () { t2--; m.textContent = '[✕] LOCKED — ' + t2 + 's'; if (t2 <= 0) { clearInterval(iv2); locked = false; attempts = 0; m.textContent = ''; } }, 1000); }
      else m.textContent = '[✕] invalid credentials — ' + left + ' left (demo mode)'; }
  });

  function loadInbox() {
    if (!API || !TOKEN) return;
    fetch('/api/messages?token=' + TOKEN).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j) return; var n = j.messages.length, p = document.createElement('p');
      p.className = 'g-brief'; p.style.marginTop = '14px';
      p.textContent = n ? '📥 SERVER INBOX: ' + n + ' transmission(s) via /api/contact — latest from "' + j.messages[n - 1].name + '".' : '📥 SERVER INBOX: empty — send one via the contact form.';
      $('#granted').insertBefore(p, $('#logout'));
    }).catch(function () {});
  }

  var cForm = rebind($('#cForm'));
  cForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var n = $('#cName').value, f = $('#cFrom').value, b = $('#cBody').value;
    if (API) {
      try {
        var r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n, from: f, message: b }) });
        if (r.ok) { var prev = $('#mailPrev');
          prev.textContent = 'STATUS: 200 OK\nSTORED: server-side inbox (db.json)\nREAD BY: operator after /api/login';
          prev.classList.add('on'); if (window.toast) toast('TRANSMISSION STORED IN SERVER INBOX'); return; }
      } catch (e2) {}
    }
    var prev2 = $('#mailPrev');
    prev2.textContent = 'TO: ' + ($('#cEmail') ? $('#cEmail').textContent : '') + '  (demo mode — mail client)\nSUBJECT: [SENTINEL//OPS] Contact from ' + n;
    prev2.classList.add('on');
    window.location.href = 'mailto:' + ($('#cEmail') ? $('#cEmail').textContent : '') + '?subject=' + encodeURIComponent('[SENTINEL//OPS] Contact from ' + n) + '&body=' + encodeURIComponent(b + '\n\n— ' + n + '\n' + f);
  });
})();