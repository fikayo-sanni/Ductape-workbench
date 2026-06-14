(function () {
  var MIN_MS = 2000;
  var MAX_MS = 4000;
  var delay = MIN_MS + Math.random() * (MAX_MS - MIN_MS);
  var started = Date.now();
  var loader = document.getElementById('boot-loader');
  var body = document.body;

  var messages = [
    'Loading workbench…',
    'Preparing workspace…',
    'Wiring environments…',
  ];
  var msgEl = document.getElementById('boot-loader-text');
  if (msgEl) {
    msgEl.textContent = messages[Math.floor(Math.random() * messages.length)];
  }

  function dismiss() {
    if (!loader || !body) return;
    loader.classList.add('boot-loader--out');
    body.classList.remove('boot-loading');
    window.setTimeout(function () {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    }, 500);
  }

  function scheduleDismiss() {
    var elapsed = Date.now() - started;
    var wait = Math.max(0, delay - elapsed);
    window.setTimeout(dismiss, wait);
  }

  if (document.readyState === 'complete') {
    scheduleDismiss();
  } else {
    window.addEventListener('load', scheduleDismiss);
  }

  window.__ductapeDismissBootLoader = dismiss;
})();
