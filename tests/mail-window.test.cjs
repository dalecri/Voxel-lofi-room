const {test}=require('node:test');
const assert=require('node:assert/strict');

function installDocument() {
  function node(tag) {
    return {
      nodeType: 1, nodeName: String(tag).toUpperCase(), tagName: String(tag).toUpperCase(),
      className: '', id: '', children: [], style: {}, dataset: {}, attrs: {}, textContent: '', value: '', parentNode: null,
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      append(...kids) { for (const kid of kids) this.appendChild(kid); },
      appendChild(kid) { this.children.push(kid); if (kid && typeof kid === 'object') kid.parentNode = this; return kid; },
      addEventListener() {},
    };
  }
  global.document = {
    createElement: node,
    createTextNode: value => ({ nodeType: 3, textContent: String(value), children: [] }),
  };
}
function textOf(n) {
  if (!n || n.nodeType === 3) return n ? n.textContent : '';
  return [n.textContent, ...(n.children || []).map(textOf)].join('');
}
function byClass(root, cls) {
  const out = [];
  (function walk(n) {
    if (!n || n.nodeType === 3) return;
    if (String(n.className || '').split(/\s+/).includes(cls)) out.push(n);
    for (const kid of n.children || []) walk(kid);
  })(root);
  return out;
}
installDocument();
const Window = require('../mail-window.js');

test('the mailbox and the typewriter mount one pixel window, with rich text only when asked', () => {
  const email = Window.create({
    title: 'Email', icon: 'envelope', label: 'Compose a letter to future you',
    from: 'crisdalessio@gmail.com', to: 'Future me', subject: 'A note for future me', body: 'Hey',
    richText: false, deliverOn: { value: '2026-10-22', min: '2026-10-16' },
    buttons: [{ label: 'Save draft' }, { label: 'Send', className: 'mailwin-send' }],
  });
  const typewriter = Window.create({
    title: 'Typewriter', icon: 'typewriter', label: 'Write a letter',
    from: 'crisdalessio@gmail.com', to: 'Me', subject: 'For later', richText: true, bodyId: 'letterBody',
    buttons: [{ label: 'Save', id: 'letterSave' }, { label: 'Send to future', className: 'mailwin-send', id: 'letterSend' }],
  });
  assert.equal(email.form.className, 'mailwin');
  assert.equal(typewriter.form.className, 'mailwin');
  assert.deepEqual(email.form.children.map(n => n.className), ['mailwin-bar', 'mailwin-head', 'mailwin-page', 'mailwin-foot', 'mailwin-actions']);
  assert.deepEqual(typewriter.form.children.map(n => n.className), ['mailwin-bar', 'mailwin-head', 'letter-tools mailwin-tools', 'mailwin-page', 'mailwin-foot', 'mailwin-actions']);
  assert.equal(textOf(email.name), 'Email');
  assert.equal(byClass(email.form, 'mailwin-envelope').length, 1);
  assert.equal(byClass(email.form, 'mailwin-typewriter').length, 0);
  assert.equal(email.body.tagName, 'TEXTAREA');
  assert.equal(email.body.value, 'Hey');
  assert.equal(email.toolbar, null);
  assert.equal(email.due.type, 'date');
  assert.equal(email.due.value, '2026-10-22');
  assert.equal(email.due.min, '2026-10-16');
  assert.equal(email.due.required, true);
  assert.equal(email.fields.From.value, 'crisdalessio@gmail.com');
  assert.equal(email.fields.To.value, 'Future me');
  assert.equal(email.fields.Subject.value, 'A note for future me');
  assert.equal(email.buttons['Save draft'].className, 'mailwin-btn');
  assert.equal(email.buttons.Send.className, 'mailwin-btn mailwin-send');
  assert.equal(textOf(typewriter.name), 'Typewriter');
  assert.equal(byClass(typewriter.form, 'mailwin-typewriter').length, 1);
  assert.equal(byClass(typewriter.form, 'mailwin-envelope').length, 0);
  assert.equal(typewriter.body.tagName, 'DIV');
  assert.equal(typewriter.body.id, 'letterBody');
  assert.equal(typewriter.body.contentEditable, 'true');
  assert.equal(typewriter.due, null);
  assert.equal(typewriter.fields.To.value, 'Me');
  assert.equal(typewriter.fields.Subject.value, 'For later');
  assert.deepEqual([...typewriter.toolbar.children].filter(n => n.tagName === 'BUTTON').map(n => n.getAttribute('aria-label') || n.textContent), ['Bold', 'Italic', 'Underline', 'Date stamp']);
  assert.equal(typewriter.buttons.Save.id, 'letterSave');
  assert.equal(typewriter.buttons['Send to future'].id, 'letterSend');
  assert.equal(typewriter.buttons['Send to future'].className, 'mailwin-btn mailwin-send');
  const date = [...typewriter.toolbar.children].find(n => n.id === 'letterDate');
  assert.equal(date.textContent, 'Date stamp');
});
