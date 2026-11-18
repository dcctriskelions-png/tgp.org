/* Announcements bell for logged-in pages.
   - Members: a bell with a red number for announcements they have not read yet.
   - Admins: the same bell, plus a form to post and a delete button on each announcement.
   Load AFTER gas-shim.js and session.js (it uses TGP_TOKEN, TGP_REAL and TGP_INFO from session.js). */
(function () {
  if (typeof TGP_TOKEN === 'undefined' || !TGP_REAL) return;          // not logged in: nothing to show
  var POLL_MS = 90000, FRESH_MS = 45000;
  var seenKey = 'tgp_ann_seen_' + (TGP_INFO.admin ? 'admin' : (TGP_INFO.id || 'member'));
  var items = [], canPost = !!TGP_INFO.admin, lastLoad = 0, loading = false, open = false, loadError = '', panelSeen = '';

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function getSeen() { try { return localStorage.getItem(seenKey) || ''; } catch (e) { return ''; } }
  function setSeen(v) { try { localStorage.setItem(seenKey, v); } catch (e) {} }
  function newest() { return items.length ? items[0].created : ''; }
  function unread() { var s = getSeen(); return items.filter(function (x) { return x.created > s; }); }
  function fmt(iso) {
    try { return new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); }
    catch (e) { return iso; }
  }

  // ---------- styles + skeleton ----------
  var css = '' +
  '.an-float{position:fixed;z-index:99990;bottom:calc(120px + env(safe-area-inset-bottom,0px));right:12px;width:42px;height:42px;border-radius:50%;border:1px solid #6b5a22;background:#15151a;color:#e8b83a;display:grid;place-items:center;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35);padding:0;font-size:22px}' +
  '.an-float .badge{position:absolute;top:-4px;right:-4px;min-width:19px;height:19px;padding:0 5px;box-sizing:border-box;border-radius:10px;font:700 11px/19px Arial,sans-serif;text-align:center;border:2px solid #15151a}' +
  '#an-bell .an-ico{display:inline-flex;align-items:center;justify-content:center;line-height:0}' +
  '#an-bell svg{width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
  '#an-bell.ring .an-ico svg{animation:an-ring 1.6s ease-in-out infinite;transform-origin:50% 8%}' +
  '#an-bell .badge{background:#d93025!important;color:#fff!important;box-shadow:0 0 0 2px #17171a}' +
  '.navs.an-tight .nav .ico,.navs.an-tight .an-ico{font-size:clamp(15px,4.6vw,18px)!important}' +
  '.navs.an-tight .nav>span.s,.navs.an-tight #out span{font-size:clamp(8px,2.3vw,9.5px)!important;letter-spacing:0!important}' +
  '.navs.an-tight .nav{padding-left:0!important;padding-right:0!important;gap:3px!important}' +
  '#an-toast{position:fixed;z-index:99989;left:10px;right:64px;bottom:calc(120px + env(safe-area-inset-bottom,0px));background:#2a1a12;color:#ffe9d6;border:1px solid #d93025;border-radius:12px;padding:10px 12px;font:600 13px/1.35 Arial,sans-serif;display:none;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4)}' +
  '#an-toast b{color:#ff9d8f}' +
  '#an-ov{position:fixed;z-index:99995;inset:0;background:rgba(0,0,0,.55);display:none}' +
  '#an-panel{position:fixed;z-index:99996;right:0;top:0;bottom:0;width:min(420px,100vw);background:#15151a;color:#f5f1e2;display:none;flex-direction:column;font-family:Arial,Helvetica,sans-serif;box-shadow:-8px 0 30px rgba(0,0,0,.5)}' +
  '#an-panel header{display:flex;align-items:center;justify-content:space-between;padding:calc(14px + env(safe-area-inset-top,0px)) 16px 12px;border-bottom:1px solid #2c2c34}' +
  '#an-panel h2{margin:0;font-size:17px;color:#e8b83a;letter-spacing:.04em}' +
  '#an-x{background:none;border:0;color:#cfc8b0;font-size:26px;line-height:1;cursor:pointer;padding:2px 8px}' +
  '#an-body{flex:1;overflow:auto;padding:12px 14px calc(18px + env(safe-area-inset-bottom,0px));-webkit-overflow-scrolling:touch}' +
  '.an-item{background:#1d1d24;border:1px solid #2c2c34;border-radius:12px;padding:12px;margin:0 0 10px}' +
  '.an-item.new{border-color:#e8b83a}.an-item.urgent{border-left:4px solid #d93025}' +
  '.an-t{font-weight:700;font-size:15px;margin:0 0 3px;word-break:break-word}' +
  '.an-m{font-size:12px;color:#9a9482;margin:0 0 8px}.an-m i{font-style:normal;color:#ff9d8f;font-weight:700;margin-left:6px}.an-m u{text-decoration:none;color:#e8b83a;font-weight:700;margin-left:6px}' +
  '.an-b{font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word;color:#e9e4d2}' +
  '.an-del{margin-top:10px;background:none;border:1px solid #6b2a26;color:#ff9d8f;border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer}' +
  '.an-empty{color:#9a9482;text-align:center;padding:30px 10px;font-size:14px}' +
  '.an-form{background:#1d1d24;border:1px solid #3a3320;border-radius:12px;padding:12px;margin:0 0 14px}' +
  '.an-form h3{margin:0 0 8px;font-size:13px;color:#e8b83a;letter-spacing:.06em;text-transform:uppercase}' +
  '.an-form input[type=text],.an-form textarea{width:100%;box-sizing:border-box;background:#0f0f13;border:1px solid #3a3a44;border-radius:8px;color:#f5f1e2;padding:10px;font:14px Arial,sans-serif;margin:0 0 8px}' +
  '.an-form textarea{min-height:96px;resize:vertical}' +
  '.an-row{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;color:#9a9482}' +
  '.an-row label{display:flex;align-items:center;gap:6px;color:#e9e4d2;font-size:13px}' +
  '.an-post{background:#e8b83a;color:#111;border:0;border-radius:9px;padding:10px 16px;font:700 13px Arial,sans-serif;cursor:pointer}.an-post:disabled{opacity:.6}' +
  '#an-msg{font-size:12px;margin:8px 0 0;min-height:14px}#an-msg.err{color:#ff9d8f}#an-msg.ok{color:#8fd99a}' +
  '@keyframes an-ring{0%,60%,100%{transform:rotate(0)}10%{transform:rotate(14deg)}20%{transform:rotate(-12deg)}30%{transform:rotate(9deg)}40%{transform:rotate(-6deg)}}' +
  '@media(min-width:821px){.an-float{bottom:24px;right:24px}#an-toast{left:auto;right:80px;bottom:24px;width:340px}}' +
  '@media(prefers-reduced-motion:reduce){#an-bell.ring .an-ico svg{animation:none}}';

  var navs = null, ico = null;
  var BELL_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>';

  function fitDock() {
    if (!navs || !ico) return;
    var ref = navs.querySelector('.nav:not(.on):not(.an-nav) i.ico') || navs.querySelector('i.ico');
    if (ref) { var cs = getComputedStyle(ref); ico.style.fontSize = cs.fontSize; ico.style.color = cs.color; }
    var mobile = window.matchMedia('(max-width:820px)').matches;
    var inFlow = function (n) { var c = getComputedStyle(n); return c.display !== 'none' && c.position !== 'fixed'; };
    var count = Array.prototype.filter.call(navs.children, inFlow).length;
    var buttons = Array.prototype.filter.call(navs.querySelectorAll('.nav'), inFlow).length;
    navs.classList.toggle('an-tight', mobile && buttons >= 7);               // 7 buttons in one row: make icons and captions a little smaller
    if (mobile && getComputedStyle(navs).display === 'grid') navs.style.setProperty('grid-template-columns', 'repeat(' + count + ',minmax(0,1fr))', 'important');
    else navs.style.removeProperty('grid-template-columns');
  }

  function build() {
    var st = el('style'); st.id = 'an-style'; st.textContent = css; document.head.appendChild(st);

    navs = document.querySelector('#side .navs') || document.querySelector('.navs');
    var bell = el('button'); bell.id = 'an-bell'; bell.type = 'button'; bell.setAttribute('aria-label', 'Announcements');
    ico = el('span', 'an-ico'); ico.innerHTML = BELL_SVG;
    var badge = el('span', 'badge an-badge'); badge.id = 'an-badge'; badge.style.display = 'none';
    bell.appendChild(ico);
    if (navs) {                                                              // inside the navigation bar, just before Log out
      bell.className = 'nav an-nav';
      bell.appendChild(el('span', 'l', 'Announcements')); bell.appendChild(el('span', 's', 'News')); bell.appendChild(badge);
      var out = document.getElementById('out');
      if (out && out.parentNode === navs) navs.insertBefore(bell, out); else navs.appendChild(bell);
    } else {                                                                 // page without a navigation bar: floating bell
      bell.className = 'an-float'; bell.appendChild(badge); document.body.appendChild(bell);
    }
    bell.onclick = openPanel;
    fitDock(); window.addEventListener('resize', fitDock);

    var toast = el('div'); toast.id = 'an-toast'; toast.onclick = openPanel; document.body.appendChild(toast);

    var ov = el('div'); ov.id = 'an-ov'; ov.onclick = closePanel; document.body.appendChild(ov);
    var panel = el('div'); panel.id = 'an-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Announcements');
    var head = el('header'); head.appendChild(el('h2', '', 'ANNOUNCEMENTS'));
    var x = el('button', '', '\u00d7'); x.id = 'an-x'; x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.onclick = closePanel; head.appendChild(x);
    var body = el('div'); body.id = 'an-body';
    panel.appendChild(head); panel.appendChild(body); document.body.appendChild(panel);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) closePanel(); });
  }

  // ---------- indicator ----------
  function updateIndicator() {
    var n = unread().length, badge = $('an-badge'), bell = $('an-bell'), toast = $('an-toast');
    badge.style.display = n ? '' : 'none'; badge.textContent = n > 9 ? '9+' : String(n);
    var urgent = unread().filter(function (x) { return x.urgent; });
    bell.classList.toggle('ring', n > 0);
    if (!open && urgent.length) {
      toast.innerHTML = ''; var b = el('b', '', 'Urgent: '); toast.appendChild(b); toast.appendChild(document.createTextNode(urgent[0].title + ' \u2014 tap to read'));
      toast.style.display = 'block';
    } else toast.style.display = 'none';
    try {                                     // number on the app icon (only where the phone supports it)
      if (n && navigator.setAppBadge) navigator.setAppBadge(n); else if (!n && navigator.clearAppBadge) navigator.clearAppBadge();
    } catch (e) {}
  }

  // ---------- panel ----------
  function render() {
    var body = $('an-body'); if (!body) return; body.innerHTML = '';
    var seen = open ? panelSeen : getSeen();
    if (canPost) body.appendChild(buildForm());
    if (loadError) body.appendChild(el('div', 'an-empty', loadError));
    else if (!items.length) body.appendChild(el('div', 'an-empty', loading ? 'Loading...' : 'No announcements yet.'));
    items.forEach(function (a) {
      var card = el('div', 'an-item' + (a.urgent ? ' urgent' : '') + (a.created > seen ? ' new' : ''));
      card.appendChild(el('p', 'an-t', a.title));
      var m = el('p', 'an-m', fmt(a.created) + (a.by ? ' \u00b7 ' + a.by : ''));
      if (a.urgent) m.appendChild(el('i', '', 'URGENT'));
      if (a.created > seen) m.appendChild(el('u', '', 'NEW'));
      card.appendChild(m); card.appendChild(el('div', 'an-b', a.message));
      if (canPost) {
        var d = el('button', 'an-del', 'Delete'); d.type = 'button';
        d.onclick = function () { if (confirm('Delete this announcement for everyone?')) del(a.id); };
        card.appendChild(d);
      }
      body.appendChild(card);
    });
  }

  function buildForm() {
    var f = el('div', 'an-form'); f.appendChild(el('h3', '', 'New announcement'));
    var t = el('input'); t.type = 'text'; t.id = 'an-title'; t.maxLength = 120; t.placeholder = 'Title (e.g. General Assembly this Sunday)'; f.appendChild(t);
    var m = el('textarea'); m.id = 'an-text'; m.maxLength = 1500; m.placeholder = 'Message for all members'; f.appendChild(m);
    var row = el('div', 'an-row'), lab = el('label'), cb = el('input'); cb.type = 'checkbox'; cb.id = 'an-urgent';
    lab.appendChild(cb); lab.appendChild(document.createTextNode('Mark as urgent')); row.appendChild(lab);
    var count = el('span', '', '0 / 1500'); m.oninput = function () { count.textContent = m.value.length + ' / 1500'; }; row.appendChild(count); f.appendChild(row);
    var bar = el('div', 'an-row'); bar.style.marginTop = '10px';
    var btn = el('button', 'an-post', 'Post to all members'); btn.type = 'button'; btn.id = 'an-post'; btn.onclick = post; bar.appendChild(btn); f.appendChild(bar);
    var msg = el('div'); msg.id = 'an-msg'; f.appendChild(msg);
    return f;
  }
  function say(text, cls) { var m = $('an-msg'); if (m) { m.textContent = text; m.className = cls || ''; } }

  function post() {
    var title = $('an-title').value.trim(), text = $('an-text').value.trim(), urgent = $('an-urgent').checked, btn = $('an-post');
    if (!title || !text) return say('Please fill in the title and the message.', 'err');
    btn.disabled = true; say('Posting...', '');
    google.script.run.withSuccessHandler(function (r) {
      btn.disabled = false;
      if (r && r.expired) { say('Your session expired. Please log in again.', 'err'); return; }
      if (!r || !r.success) return say((r && r.message) || 'Could not post.', 'err');
      load(true, function () { panelSeen = newest(); markRead(); render(); say('Posted. Members will see it when they open the app.', 'ok'); });
    }).withFailureHandler(function (e) { btn.disabled = false; say(e.message || 'Could not post.', 'err'); }).postAnnouncement(TGP_TOKEN, title, text, urgent);
  }
  function del(id) {
    google.script.run.withSuccessHandler(function (r) {
      if (r && r.success) load(true, function () { updateIndicator(); render(); }); else alert((r && r.message) || 'Could not delete.');
    }).withFailureHandler(function (e) { alert(e.message || 'Could not delete.'); }).deleteAnnouncement(TGP_TOKEN, id);
  }

  function markRead() { if (newest()) setSeen(newest()); updateIndicator(); }
  function typing() { var t = $('an-title'), m = $('an-text'); return !!((t && t.value) || (m && m.value)); }
  function openPanel() {
    open = true; panelSeen = getSeen();
    $('an-ov').style.display = 'block'; $('an-panel').style.display = 'flex';
    render(); markRead();
    load(false, function () { if (open) { if (!typing()) render(); markRead(); } });
  }
  function closePanel() { open = false; $('an-ov').style.display = 'none'; $('an-panel').style.display = 'none'; updateIndicator(); }

  // ---------- loading ----------
  function load(force, done) {
    if (loading) return;
    if (!force && Date.now() - lastLoad < FRESH_MS) { if (done) done(); return; }
    loading = true;
    google.script.run.withSuccessHandler(function (r) {
      loading = false; lastLoad = Date.now();
      if (r && r.success) { items = r.items || []; canPost = !!r.canPost; loadError = ''; try { sessionStorage.setItem('tgp_ann_cache', JSON.stringify({ t: lastLoad, items: items })); } catch (e) {} }
      else if (!r || !r.expired) loadError = 'Could not load announcements. Please try again.';
      updateIndicator(); if (done) done();
    }).withFailureHandler(function () {
      loading = false; loadError = items.length ? '' : 'Could not load announcements. Check your connection.'; if (done) done();
    }).getAnnouncements(TGP_TOKEN);
  }

  function start() {
    build();
    try {                                       // show the last known state straight away while the fresh list loads
      var c = JSON.parse(sessionStorage.getItem('tgp_ann_cache') || 'null');
      if (c && c.items) { items = c.items; lastLoad = c.t || 0; }
    } catch (e) {}
    updateIndicator();
    load(false);
    setInterval(function () { if (!document.hidden) load(true); }, POLL_MS);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() - lastLoad > 30000) load(true); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
