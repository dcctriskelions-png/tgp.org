/* Drop-in replacement for google.script.run.
   Existing code like  google.script.run.withSuccessHandler(ok).withFailureHandler(fail).someFunction(a, b)
   keeps working: it is sent to your Apps Script backend as a POST request.
   Every request now gives up after 40 seconds and says why, instead of waiting forever. */
(function () {
  var API_URL = 'https://script.google.com/macros/s/AKfycbxjbyRlMPnxxAKBLSedAl6xccdIY9lSGf3MOIo4m-nA5FzkFDTD9Xq_cO7kHrjlu4EaLw/exec';
  var TIMEOUT_MS = 40000;

  function makeRunner(onOk, onFail) {
    return new Proxy({}, {
      get: function (_, name) {
        if (typeof name !== 'string' || name === 'then') return undefined;
        if (name === 'withSuccessHandler') return function (f) { return makeRunner(f, onFail); };
        if (name === 'withFailureHandler') return function (f) { return makeRunner(onOk, f); };
        if (name === 'withUserObject') return function () { return makeRunner(onOk, onFail); };
        return function () {
          var args = Array.prototype.slice.call(arguments);
          var started = Date.now();
          var ctl = new AbortController();
          var timer = setTimeout(function () { ctl.abort(); }, TIMEOUT_MS);
          function fail(msg) {
            clearTimeout(timer);
            console.error('[' + name + '] ' + msg + ' (after ' + Math.round((Date.now() - started) / 1000) + 's)');
            var e = { message: msg };
            if (onFail) onFail(e);
          }
          fetch(API_URL, {
            method: 'POST',
            // text/plain avoids a CORS preflight, which Apps Script cannot answer
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ fn: name, args: args }),
            signal: ctl.signal
          })
            .then(function (r) { return r.text(); })
            .then(function (text) {
              var j;
              try { j = JSON.parse(text); }
              catch (x) { return fail('The server sent a web page instead of data. Check that the deployment is set to "Anyone" and that you deployed a New version.'); }
              clearTimeout(timer);
              console.log('[' + name + '] ' + Math.round((Date.now() - started) / 100) / 10 + 's');
              if (j && j.ok) { if (onOk) onOk(j.result); }
              else fail((j && j.error) || 'Server error');
            })
            .catch(function (err) {
              if (err && err.name === 'AbortError') fail('The server did not answer in 40 seconds.');
              else fail('Could not reach the server (' + String((err && err.message) || err) + ').');
            });
        };
      }
    });
  }

  window.google = window.google || {};
  window.google.script = { run: makeRunner(null, null) };
})();
