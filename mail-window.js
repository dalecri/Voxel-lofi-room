// The retro pixel email window. The mailbox and the typewriter both mount this,
// so a title, a header row, or a button is the same element in both places.
(function (root) {
  const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };
  function create(options = {}) {
    const form = el('form', 'mailwin');
    form.noValidate = false;
    form.setAttribute('aria-label', options.label || 'Compose a letter');
    form.addEventListener('submit', e => e.preventDefault());
    const bar = el('div', 'mailwin-bar');
    bar.setAttribute('aria-hidden', 'true');
    const name = el('b', 'mailwin-name');
    const mark = el('i', options.icon === 'typewriter' ? 'mailwin-typewriter' : 'mailwin-envelope');
    name.append(mark, document.createTextNode(options.title || 'Email'));
    bar.append(el('i', 'mailwin-close'), el('i', 'mailwin-stripes'), name, el('i', 'mailwin-stripes'), el('i', 'mailwin-zoom'), el('i', 'mailwin-shade'));
    const head = el('div', 'mailwin-head');
    const fields = {};
    for (const [key, value, max] of [['From', options.from, options.fromMax || 120], ['To', options.to, options.toMax || 120], ['Subject', options.subject, options.subjectMax || 200]]) {
      const row = el('label', 'mailwin-row');
      const k = el('span', 'mailwin-key'); k.textContent = key;
      const input = el('input', 'mailwin-val');
      input.type = 'text'; input.value = value == null ? '' : String(value); input.maxLength = max; input.spellcheck = false;
      input.setAttribute('aria-label', key);
      row.append(k, input); head.appendChild(row); fields[key] = input;
    }
    const page = el('div', 'mailwin-page');
    const body = el(options.richText ? 'div' : 'textarea', 'mailwin-body');
    if (options.richText) {
      body.contentEditable = 'true'; body.setAttribute('role', 'textbox'); body.setAttribute('aria-multiline', 'true');
      body.spellcheck = true; if (options.bodyId) body.id = options.bodyId;
      body.setAttribute('aria-label', options.bodyLabel || 'Letter body');
      body.dataset.placeholder = options.placeholder || 'Dear friend,';
      if (options.body) body.innerHTML = options.body;
    } else {
      body.value = options.body == null ? '' : String(options.body); body.rows = 8;
      body.setAttribute('aria-label', options.bodyLabel || 'Message'); body.placeholder = options.placeholder || 'Hey future me!';
    }
    const scroll = el('div', 'mailwin-scroll');
    scroll.setAttribute('aria-hidden', 'true');
    scroll.append(el('i', 'up'), el('i', 'thumb'), el('i', 'down'));
    page.append(body, scroll);
    let toolbar = null;
    if (options.richText) {
      toolbar = el('nav', 'letter-tools mailwin-tools');
      toolbar.setAttribute('aria-label', 'Letter formatting');
      for (const [format, label, inner] of [['bold', 'Bold', 'B'], ['italic', 'Italic', 'I'], ['underline', 'Underline', 'U']]) {
        const b = el('button'); b.type = 'button'; b.dataset.format = format; b.setAttribute('aria-label', label); b.setAttribute('aria-pressed', 'false');
        const mark = el(format === 'bold' ? 'b' : format === 'italic' ? 'i' : 'u'); mark.textContent = inner; b.appendChild(mark); toolbar.appendChild(b);
      }
      const rule = el('span'); toolbar.appendChild(rule);
      const date = el('button'); date.type = 'button'; date.id = 'letterDate'; date.textContent = 'Date stamp'; toolbar.appendChild(date);
    }
    const foot = el('div', 'mailwin-foot');
    let due = null;
    if (options.deliverOn) {
      const dueRow = el('label', 'mailwin-due');
      const dueKey = el('span'); dueKey.textContent = 'Deliver on';
      due = el('input'); due.type = 'date'; due.value = options.deliverOn.value || ''; due.required = options.deliverOn.required !== false;
      if (options.deliverOn.min) due.min = options.deliverOn.min;
      due.setAttribute('aria-label', 'Deliver on'); dueRow.append(dueKey, due); foot.appendChild(dueRow);
    }
    const actions = el('div', 'mailwin-actions');
    const saved = el('p', 'mailwin-saved'); saved.setAttribute('role', 'status'); saved.textContent = options.status || '';
    actions.appendChild(saved);
    const buttons = {};
    for (const spec of options.buttons || []) {
      const b = el('button', 'mailwin-btn' + (spec.className ? ' ' + spec.className : ''));
      b.type = 'button'; b.textContent = spec.label; if (spec.id) b.id = spec.id;
      actions.appendChild(b); buttons[spec.label] = b;
    }
    form.append(bar, head);
    if (toolbar) form.appendChild(toolbar);
    form.append(page, foot, actions);
    return { form, name, fields, body, toolbar, foot, due, saved, actions, buttons };
  }
  const api = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LRMailWindow = api;
})(typeof window !== 'undefined' ? window : globalThis);
