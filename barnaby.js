// Barnaby's Dandelion Odyssey, hosted in a cabinet. The game page stays a
// standalone static site; this overlay only opens and closes it.
(function (root) {
  const SRC = 'games/barnaby/index.html';
  function createView({ beforeOpen = () => {}, onClose = () => {} } = {}) {
    const el = (tag, cls, text) => {
      const node = document.createElement(tag);
      if (cls) node.className = cls;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const view = el('section');
    view.id = 'barnabyView';
    view.hidden = true;
    view.setAttribute('role', 'dialog');
    view.setAttribute('aria-modal', 'true');
    view.setAttribute('aria-label', "Barnaby's Dandelion Odyssey");
    const chrome = el('header', 'barnaby-chrome');
    const title = el('h2', '', "Barnaby's Dandelion Odyssey");
    const closeButton = el('button', 'barnaby-close', '×');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close game');
    chrome.append(title, closeButton);
    const stage = el('div', 'barnaby-stage');
    view.append(chrome, stage);
    document.body.appendChild(view);
    let active = false, lastFocus = null;

    function viewport() {
      view.style.height = (window.visualViewport?.height || innerHeight) + 'px';
      view.style.top = (window.visualViewport?.offsetTop || 0) + 'px';
    }
    function frame() { return stage.querySelector('iframe'); }
    function open() {
      if (active) return;
      lastFocus = document.activeElement;
      beforeOpen();
      active = true;
      const iframe = el('iframe', 'barnaby-frame');
      iframe.src = SRC;
      iframe.title = "Barnaby's Dandelion Odyssey";
      iframe.addEventListener('load', () => {
        if (!active || frame() !== iframe) return;
        try {
          iframe.contentWindow.addEventListener('keydown', e => {
            if (e.key === 'Escape') { e.preventDefault(); close(); }
          });
          iframe.contentWindow.focus();
        } catch (e) { /* same-origin focus is enough; taps still reach the game */ }
      });
      stage.replaceChildren(iframe);
      view.hidden = false;
      viewport();
    }
    function close() {
      if (!active) return;
      active = false;
      const iframe = frame();
      if (iframe) {
        iframe.src = 'about:blank';
        iframe.remove();
      }
      stage.replaceChildren();
      view.hidden = true;
      onClose();
      if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
    }
    closeButton.onclick = e => { e.stopPropagation(); close(); };
    window.addEventListener('keydown', e => {
      if (!active || e.key !== 'Escape') return;
      e.preventDefault();
      close();
      e.stopImmediatePropagation();
    }, true);
    window.addEventListener('resize', viewport);
    window.visualViewport?.addEventListener('resize', viewport);
    window.visualViewport?.addEventListener('scroll', viewport);
    return { open, close, view, get active() { return active; } };
  }
  const api = { createView, SRC };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LRBarnaby = api;
})(typeof window !== 'undefined' ? window : globalThis);
