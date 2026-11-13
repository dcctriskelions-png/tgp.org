/* Replaces what Apps Script used to inject into each page (token, user name, admin flag, page links).
   Load it AFTER gas-shim.js and BEFORE the page's own script. */
var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxjbyRlMPnxxAKBLSedAl6xccdIY9lSGf3MOIo4m-nA5FzkFDTD9Xq_cO7kHrjlu4EaLw/exec';
var TGP_PAGES = { home: 'index.html', login: 'MemberLogin.html', admin: 'AdminLogin.html', about: 'AboutUs.html',
                  col: 'COL.html', activities: 'Activities.html', dashboard: 'Dashboard.html' };

function tgpToken() {
  var t = new URLSearchParams(location.search).get('token') || '';
  try {
    if (t) sessionStorage.setItem('tgp_token', t); else t = sessionStorage.getItem('tgp_token') || '';
  } catch (e) {}
  return t;
}
function tgpClear() { try { sessionStorage.removeItem('tgp_token'); sessionStorage.removeItem('tgp_info'); } catch (e) {} }

// Who is logged in? Cached per token; the first page after login asks the backend once.
function tgpInfo(token) {
  if (!token) return null;
  try {
    var c = JSON.parse(sessionStorage.getItem('tgp_info') || 'null');
    if (c && c.token === token && c.info) return c.info;
  } catch (e) {}
  try {
    var x = new XMLHttpRequest();
    x.open('POST', APPS_SCRIPT_URL, false);
    x.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
    x.send(JSON.stringify({ fn: 'getSessionInfo', args: [token] }));
    var j = JSON.parse(x.responseText);
    if (j && j.ok && j.result) {
      try { sessionStorage.setItem('tgp_info', JSON.stringify({ token: token, info: j.result })); } catch (e) {}
      return j.result;
    }
  } catch (e) {}
  return null;
}

var TGP_TOKEN = tgpToken();
var TGP_REAL = tgpInfo(TGP_TOKEN);                       // null = not logged in / expired
var TGP_INFO = TGP_REAL || { id: '', name: '', admin: false };

// Link to another page of this site, carrying the token.
function pg(name, extra) {
  var q = [];
  if (name !== 'login' && name !== 'admin' && name !== 'home' && TGP_TOKEN) q.push('token=' + encodeURIComponent(TGP_TOKEN));
  for (var k in (extra || {})) q.push(k + '=' + encodeURIComponent(extra[k]));
  return TGP_PAGES[name] + (q.length ? '?' + q.join('&') : '');
}

// Call at the top of a page that needs a session. Sends the visitor to the log-in page when there is none.
function tgpRequire(adminOnly) {
  if (!TGP_REAL || (adminOnly && !TGP_REAL.admin)) {
    tgpClear();
    location.replace(TGP_PAGES[adminOnly ? 'admin' : 'login'] + '?expired=1');
    return false;
  }
  return true;
}

// Fills the user name and shows/hides the admin-only and member-only parts of a page.
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.who .nm').forEach(function (e) { e.textContent = TGP_INFO.name; });
  document.querySelectorAll('[data-role="admin"]').forEach(function (e) { if (!TGP_INFO.admin) e.style.display = 'none'; });
  document.querySelectorAll('[data-role="member"]').forEach(function (e) { if (TGP_INFO.admin) e.style.display = 'none'; });
});
