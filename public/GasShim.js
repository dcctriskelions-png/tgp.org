/* Drop-in replacement for google.script.run.
   Existing code like  google.script.run.withSuccessHandler(ok).withFailureHandler(fail).someFunction(a, b)
   keeps working: it is sent to your Apps Script backend as a POST request. */
(function () {
  var API_URL = 'https://script.google.com/macros/s/AKfycbxjbyRlMPnxxAKBLSedAl6xccdIY9lSGf3MOIo4m-nA5FzkFDTD9Xq_cO7kHrjlu4EaLw/exec';

  function makeRunner(onOk, onFail) {
    return new Proxy({}, {
      get: function (_, name) {
        if (typeof name !== 'string' || name === 'then') return undefined;
        if (name === 'withSuccessHandler') return function (f) { return makeRunner(f, onFail); };
        if (name === 'withFailureHandler') return function (f) { return makeRunner(onOk, f); };
        if (name === 'withUserObject') return function () { return makeRunner(onOk, onFail); };
        return function () {
          var args = Array.prototype.slice.call(arguments);
          fetch(API_URL, {
            method: 'POST',
            // text/plain avoids a CORS preflight, which Apps Script cannot answer
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ fn: name, args: args })
          })
            .then(function (r) { return r.json(); })
            .then(function (j) {
              if (j && j.ok) { if (onOk) onOk(j.result); }
              else { var e = { message: (j && j.error) || 'Server error' }; if (onFail) onFail(e); else console.error(e.message); }
            })
            .catch(function (err) {
              var e = { message: String((err && err.message) || err) };
              if (onFail) onFail(e); else console.error(e.message);
            });
        };
      }
    });
  }

  window.google = window.google || {};
  window.google.script = { run: makeRunner(null, null) };
})();
