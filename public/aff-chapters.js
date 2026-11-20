/* CHAPTER / TAO / COUNCIL AFFILIATED rows - shared by index.html (new member) and member-form.html (edit profile).
   Each row has:
     1. a list with "Current Affiliation Outside DCC" at the top, followed by the chapters of the Dipolog City Council
        (the same list as CHAPTER INITIATED / ROOT CHAPTER);
     2. a text box that appears below the list when "Current Affiliation Outside DCC" is chosen;
     3. a check box "I am now Active here" - an Active chapter receives that chapter's Announcements and Activities
        and the member is added to the chapter's Members List.
   Saved as two texts (separated by ";"): chapterAffiliated (every affiliation) and activeChapters (the ticked ones).
   Load AFTER the form markup (needs #affContainer and #chapterInitiated) and BEFORE the page's own script. */
(function (w) {
  var OUTSIDE = '@@OUTSIDE@@';
  var OUTSIDE_LABEL = 'Current Affiliation Outside DCC';
  var PH_SELECT = '-- SELECT CHAPTER / TAO / COUNCIL --';
  var PH_FIRST_OUTSIDE = 'This will be your Official Affiliate Chapter of DCC';
  var PH_TEXT = 'Please indicate the Chapter / TAO / or Council';
  var OLD_NAMES = { "st. vincent's college chapter inc chapter": "St Vincent's College Inc Chapter",
    "tau gamma sigma dipolog city chapter": "TGS Dipolog City Chapter", "triskelion league of elders zdn": "Triskelion League of Elders",
    "dipolog computer systems institute chapter": "Dipolog Computer System Inc Chapter (Inactive)",
    "dipolog city chapter now dip city council": "Dipolog City Chapter", "jose rizal memorial state university": "Jose Rizal Memorial State University Chapter" };

  var css = document.createElement('style');
  css.textContent =
    '.aff-row{align-items:flex-start!important;padding:10px;border:1px solid #e4e4e8;border-radius:10px;background:#fbfbf9}' +
    '.aff-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}' +
    '.aff-main select,.aff-main input[type=text]{width:100%}' +
    '.aff-active{display:flex!important;align-items:center;gap:8px;margin:0!important;text-transform:none!important;letter-spacing:0!important;font-weight:600!important;font-size:13px!important;cursor:pointer}' +
    '.aff-active input{width:auto!important;margin:0;flex:none;accent-color:#b08d1e;transform:scale(1.15)}';
  document.head.appendChild(css);

  function $(id) { return document.getElementById(id); }
  function isOutsideInitiated() { return /^initiated outside/i.test(($('chapterInitiated') || {}).value || ''); }
  function key(s) {                                    // same chapter, however it was typed or saved
    var v = String(s == null ? '' : s).trim(), old = OLD_NAMES[v.replace(/\s*\(inactive\)\s*$/i, '').toLowerCase()];
    return String(old || v).toUpperCase().replace(/\(\s*INACTIVE\s*\)/g, ' ').replace(/[^A-Z0-9]+/g, ' ').trim();
  }
  function chapterList() {                             // the chapters of the DCC: same list as CHAPTER INITIATED, without "Initiated Outside..."
    var list = [];
    Array.prototype.forEach.call($('chapterInitiated').options, function (o) {
      var t = o.textContent.trim();
      if (t && o.value !== '' && !/^initiated outside/i.test(t)) list.push(t);
    });
    return list;
  }

  function buildRow() {
    var row = document.createElement('div'); row.className = 'dynamic-row aff-row';
    var main = document.createElement('div'); main.className = 'aff-main';
    var sel = document.createElement('select'); sel.className = 'affSel'; sel.setAttribute('aria-label', 'Chapter / TAO / Council');
    var ph = document.createElement('option'); ph.value = ''; ph.textContent = PH_SELECT; sel.appendChild(ph);
    var out = document.createElement('option'); out.value = OUTSIDE; out.textContent = OUTSIDE_LABEL; sel.appendChild(out);
    chapterList().forEach(function (t) { var o = document.createElement('option'); o.value = o.textContent = t; sel.appendChild(o); });
    var txt = document.createElement('input'); txt.type = 'text'; txt.className = 'affOut'; txt.maxLength = 150; txt.autocomplete = 'off';
    txt.placeholder = PH_TEXT; txt.style.display = 'none';
    var lab = document.createElement('label'); lab.className = 'aff-active';
    var cb = document.createElement('input'); cb.type = 'checkbox'; cb.className = 'affActive';
    lab.appendChild(cb); lab.appendChild(document.createTextNode('I am now Active here'));
    main.appendChild(sel); main.appendChild(txt); main.appendChild(lab);
    var rm = document.createElement('button'); rm.type = 'button'; rm.className = 'btn-remove'; rm.setAttribute('aria-label', 'Remove affiliation');
    rm.innerHTML = '<i class="ico ico-x"></i>'; rm.onclick = function () { row.remove(); w.syncAffFirstRow(); };
    row.appendChild(main); row.appendChild(rm);
    sel.addEventListener('change', function () { showText(row); });
    return row;
  }
  function showText(row) {
    var sel = row.querySelector('.affSel'), txt = row.querySelector('.affOut'), on = sel.value === OUTSIDE;
    txt.style.display = on ? '' : 'none';
    if (!on) txt.value = '';
  }

  // Adds a row. value = saved text of one affiliation, active = was "I am now Active here" ticked.
  w.addAffRow = function (value, active) {
    var row = buildRow(); $('affContainer').appendChild(row);
    var v = String(value == null ? '' : value).trim();
    if (v) {
      var sel = row.querySelector('.affSel'), k = key(v), hit = null;
      Array.prototype.forEach.call(sel.options, function (o) { if (!hit && o.value && o.value !== OUTSIDE && key(o.value) === k) hit = o; });
      if (hit) sel.value = hit.value;
      else { sel.value = OUTSIDE; row.querySelector('.affOut').value = v; }
      showText(row);
    }
    row.querySelector('.affActive').checked = !!active;
    w.syncAffFirstRow();
    return row;
  };

  // The first row must be a Chapter of the DCC when the member was initiated outside the DCC (it gives the Member ID its chapter code).
  w.syncAffFirstRow = function () {
    var c = $('affContainer');
    if (!c.querySelector('.aff-row')) { c.appendChild(buildRow()); }
    var outside = isOutsideInitiated();
    Array.prototype.forEach.call(c.querySelectorAll('.aff-row'), function (row, i) {
      var sel = row.querySelector('.affSel'), first = i === 0, lock = first && outside;
      sel.options[0].textContent = lock ? PH_FIRST_OUTSIDE : PH_SELECT;
      sel.options[1].disabled = lock;                                       // "Current Affiliation Outside DCC" is not allowed here
      if (lock && sel.value === OUTSIDE) { /* a saved outside entry stays visible; validation asks for a DCC chapter */ }
      var rm = row.querySelector('.btn-remove'); if (rm) rm.style.display = lock ? 'none' : '';
    });
  };
  // Value of the first row when it is a chapter of the DCC ('' when empty or "outside").
  w.firstAffValue = function () {
    var sel = document.querySelector('#affContainer .affSel');
    return sel && sel.value && sel.value !== OUTSIDE ? sel.value.trim() : '';
  };
  // -> { list: "A; B", active: "A" }  (capitals, no duplicates)
  w.collectAff = function () {
    var list = [], active = [];
    Array.prototype.forEach.call(document.querySelectorAll('#affContainer .aff-row'), function (row) {
      var sel = row.querySelector('.affSel'), v = sel.value === OUTSIDE ? row.querySelector('.affOut').value : sel.value;
      v = String(v || '').replace(/;/g, ',').replace(/\s+/g, ' ').trim().toUpperCase();
      if (!v || list.indexOf(v) !== -1) return;
      list.push(v);
      if (row.querySelector('.affActive').checked) active.push(v);
    });
    return { list: list.join('; '), active: active.join('; ') };
  };
  // '' when fine, otherwise the message to show
  w.affError = function () {
    var rows = document.querySelectorAll('#affContainer .aff-row');
    for (var i = 0; i < rows.length; i++) {
      var sel = rows[i].querySelector('.affSel'), txt = rows[i].querySelector('.affOut');
      if (sel.value === OUTSIDE && !txt.value.trim()) return 'PLEASE INDICATE THE CHAPTER / TAO / OR COUNCIL for "Current Affiliation Outside DCC" (CHAPTER / TAO / COUNCIL AFFILIATED).';
      if (!sel.value && rows[i].querySelector('.affActive').checked) return 'SELECT A CHAPTER / TAO / COUNCIL for the affiliation marked "I am now Active here".';
    }
    return '';
  };
  // Fill the rows from the saved texts.
  w.populateAff = function (listText, activeText) {
    $('affContainer').innerHTML = '';
    var act = {};
    String(activeText || '').split(';').forEach(function (x) { if (x.trim()) act[key(x)] = true; });
    String(listText || '').split(';').forEach(function (x) { if (x.trim()) w.addAffRow(x, !!act[key(x)]); });
    w.syncAffFirstRow();
  };
  w.resetAff = function () { $('affContainer').innerHTML = ''; w.syncAffFirstRow(); };
})(window);
