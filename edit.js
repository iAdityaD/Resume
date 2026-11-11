(() => {
'use strict';

/*
 * Owner editor.
 * - The PIN is never stored in this repo, only a salted PBKDF2 hash of it.
 * - Publishing needs a GitHub token with write access to this one repo. The
 *   token is AES-GCM encrypted with the PIN and kept in this browser only.
 *   Without that token nobody can change the live site, whatever they type here.
 */
const CFG = { owner: 'iAdityaD', repo: 'Resume', branches: ['gh-pages', 'main'], path: 'resume-data.js' };
const PIN = { salt: 'c80f823e2a7ddd9c0d3fc39ca2b801b2', hash: '665e20776cd5a9e58c9cda5608a2d716e3bb3e6456261b16e3ed11728596eedb', iter: 300000 };
const API = `https://api.github.com/repos/${CFG.owner}/${CFG.repo}`;
const HEADER = '/* Resume content. Edit it from the owner page (edit.html) - or by hand, keeping valid JSON after the equals sign. */\n';

const $ = s => document.querySelector(s);
const enc = new TextEncoder(), dec = new TextDecoder();
const hex = b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
const unhex = h => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
const b64 = bytes => { let s = ''; new Uint8Array(bytes).forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0));

let pin = '', token = '', sha = '', dirty = false, fails = 0, fields = [];

/* ---------- crypto ---------- */
async function kdf(p, salt) {
  const k = await crypto.subtle.importKey('raw', enc.encode(p), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PIN.iter, hash: 'SHA-256' }, k, 256);
}
async function aes(p, salt) { return crypto.subtle.importKey('raw', await kdf(p, salt), 'AES-GCM', false, ['encrypt', 'decrypt']); }
async function storeToken() {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aes(pin, salt), enc.encode(token));
  localStorage.setItem('rq_tok', JSON.stringify({ s: b64(salt), i: b64(iv), c: b64(ct) }));
}
async function loadToken() {
  try {
    const o = JSON.parse(localStorage.getItem('rq_tok') || 'null');
    if (!o) return '';
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.i) }, await aes(pin, unb64(o.s)), unb64(o.c));
    return dec.decode(pt);
  } catch (e) { return ''; }
}

/* ---------- GitHub ---------- */
async function gh(path, opts) {
  const r = await fetch(API + path, Object.assign({
    cache: 'no-store',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
  }, opts || {}));
  let body = null;
  try { body = await r.json(); } catch (e) { /* empty body */ }
  if (!r.ok) { const err = new Error((body && body.message) || ('GitHub error ' + r.status)); err.status = r.status; throw err; }
  return body;
}
async function fetchFile(branch) {
  const f = await gh(`/contents/${CFG.path}?ref=${branch || CFG.branches[0]}`);
  sha = f.sha;
  const text = dec.decode(unb64(f.content));
  try { return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)); } catch (e) { return null; }
}

/* ---------- form ---------- */
const F = (key, label, type, fieldsArr) => ({ key, label, type: type || 'text', fields: fieldsArr });
const SCHEMA = [
  F('name', 'NAME'), F('title', 'TITLE / ROLE'), F('location', 'LOCATION'), F('tagline', 'TAGLINE'),
  F('about', 'ABOUT — BLANK LINE BETWEEN PARAGRAPHS', 'paras'),
  F('stats', 'STATS (SHOWN AS RPG STATS)', 'list', [F('label', 'LABEL'), F('value', 'VALUE')]),
  F('experience', 'EXPERIENCE', 'list', [F('role', 'ROLE'), F('company', 'COMPANY'), F('period', 'PERIOD'), F('points', 'ACHIEVEMENTS — ONE PER LINE', 'lines')]),
  F('projects', 'PROJECTS', 'list', [F('name', 'NAME'), F('tech', 'TECH — COMMA SEPARATED', 'csv'), F('desc', 'DESCRIPTION', 'area'), F('link', 'LINK (https://…)')]),
  F('skills', 'SKILLS (EACH ONE BECOMES A GEM)', 'list', [F('group', 'GROUP'), F('items', 'SKILLS — COMMA SEPARATED', 'csv')]),
  F('education', 'EDUCATION', 'list', [F('degree', 'DEGREE'), F('school', 'SCHOOL'), F('period', 'PERIOD'), F('note', 'NOTE')]),
  F('contact', 'CONTACT (EMPTY ROWS ARE HIDDEN)', 'group', [F('email', 'EMAIL'), F('phone', 'PHONE'), F('github', 'GITHUB URL'), F('linkedin', 'LINKEDIN URL'), F('website', 'WEBSITE URL')])
];
function h(tag, attrs) {
  const e = document.createElement(tag);
  for (const k in attrs || {}) {
    if (k === 'class') e.className = attrs[k];
    else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
    else e.setAttribute(k, attrs[k]);
  }
  for (let i = 2; i < arguments.length; i++) [].concat(arguments[i]).forEach(c => e.append(c));
  return e;
}
const split = (s, re) => s.split(re).map(x => x.trim()).filter(Boolean);
function build(f, val) {
  if (f.type === 'list') {
    const items = h('div');
    const add = v => {
      const subs = f.fields.map(sf => build(sf, (v || {})[sf.key]));
      const card = h('div', { class: 'card' },
        h('button', { type: 'button', class: 'x', 'aria-label': 'Remove', onclick: () => { card.remove(); dirty = true; } }, '✕'),
        subs.map(s => s.el));
      card._get = () => Object.fromEntries(subs.map(s => [s.key, s.get()]));
      items.append(card);
    };
    (Array.isArray(val) ? val : []).forEach(add);
    const el = h('section', { class: 'sec' }, h('h2', {}, f.label), items,
      h('button', { type: 'button', class: 'btn small', onclick: () => { add(); dirty = true; } }, '+ ADD'));
    return { key: f.key, el, get: () => Array.from(items.children).map(c => c._get()) };
  }
  if (f.type === 'group') {
    const subs = f.fields.map(sf => build(sf, (val || {})[sf.key]));
    return { key: f.key, el: h('section', { class: 'sec' }, h('h2', {}, f.label), subs.map(s => s.el)), get: () => Object.fromEntries(subs.map(s => [s.key, s.get()])) };
  }
  const multi = f.type !== 'text';
  const input = h(multi ? 'textarea' : 'input', multi ? { rows: f.type === 'csv' ? 2 : 4 } : { type: 'text' });
  const arr = Array.isArray(val) ? val : [];
  input.value = f.type === 'paras' ? arr.join('\n\n') : f.type === 'lines' ? arr.join('\n') : f.type === 'csv' ? arr.join(', ') : (val == null ? '' : String(val));
  const get = () => {
    const v = input.value;
    if (f.type === 'paras') return split(v, /\n\s*\n/);
    if (f.type === 'lines') return split(v, /\n/);
    if (f.type === 'csv') return split(v, /,/);
    return v.trim();
  };
  return { key: f.key, el: h('label', { class: 'fld' }, h('span', {}, f.label), input), get };
}
function renderForm(data) {
  const form = $('#form');
  form.innerHTML = '';
  fields = SCHEMA.map(f => build(f, (data || {})[f.key]));
  fields.forEach(x => form.append(x.el));
  dirty = false;
}
const collect = () => Object.fromEntries(fields.map(x => [x.key, x.get()]));

/* ---------- screens ---------- */
const status = (msg, cls) => { const s = $('#status'); s.textContent = msg; s.className = cls || ''; };
function show(id) { ['gate', 'setup', 'editor'].forEach(x => { $('#' + x).hidden = x !== id; }); $('#bar').hidden = id !== 'editor'; window.scrollTo(0, 0); }

async function openEditor() {
  show('editor');
  status('Loading latest version…');
  let data = null;
  try { data = await fetchFile(); status('Ready.'); }
  catch (e) {
    if (e.status === 401 || e.status === 403 || e.status === 404) {
      localStorage.removeItem('rq_tok'); token = '';
      $('#tokErr').textContent = 'The saved token no longer works. Please create a new one.';
      show('setup'); return;
    }
    status('Could not reach GitHub — showing the published version.', 'bad');
  }
  renderForm(data || window.RESUME || {});
}

$('#pinForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#pinBtn'), err = $('#pinErr'), val = $('#pin').value.trim();
  btn.disabled = true; err.textContent = 'Checking…';
  try {
    if (!window.crypto || !crypto.subtle) throw new Error('nocrypto');
    await new Promise(r => setTimeout(r, Math.min(15000, fails * fails * 500)));
    const ok = hex(await kdf(val, unhex(PIN.salt))) === PIN.hash;
    if (!ok) {
      fails++; err.textContent = 'Wrong PIN.'; $('#pin').value = '';
      $('#gate').classList.remove('shake'); void $('#gate').offsetWidth; $('#gate').classList.add('shake');
      return;
    }
    pin = val; fails = 0; err.textContent = '';
    token = await loadToken();
    if (token) await openEditor(); else show('setup');
  } catch (ex) {
    err.textContent = ex.message === 'nocrypto' ? 'This browser cannot run the secure login. Open the page over https.' : 'Something went wrong. Try again.';
  } finally { btn.disabled = false; }
});

$('#tokForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#tokBtn'), err = $('#tokErr');
  btn.disabled = true; err.textContent = 'Checking token…';
  token = $('#tok').value.trim();
  try {
    const repo = await gh('');
    if (!repo.permissions || !repo.permissions.push) throw new Error('This token cannot write to the repo. Give it Contents: Read and write.');
    await storeToken();
    $('#tok').value = ''; err.textContent = '';
    await openEditor();
  } catch (ex) {
    token = '';
    err.textContent = ex.status === 401 ? 'GitHub rejected this token.' : ex.status === 404 ? 'This token has no access to the Resume repo.' : ex.message;
  } finally { btn.disabled = false; }
});

$('#form').addEventListener('input', () => { dirty = true; });
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

$('#save').addEventListener('click', async () => {
  const btn = $('#save'), data = collect();
  if (!data.name) { status('Name cannot be empty.', 'bad'); return; }
  btn.disabled = true; status('Publishing…');
  const content = b64(enc.encode(HEADER + 'window.RESUME = ' + JSON.stringify(data, null, 2) + ';\n'));
  try {
    // The site is served from the first branch; the others are kept in step with it.
    let done = 0;
    for (const branch of CFG.branches) {
      try { await fetchFile(branch); }
      catch (ex) { if (ex.status === 404 && done + CFG.branches.length > 1) continue; throw ex; }
      await gh('/contents/' + CFG.path, { method: 'PUT', body: JSON.stringify({ message: 'Update resume content', branch, sha, content }) });
      done++;
    }
    if (!done) throw new Error('resume-data.js was not found in the repo.');
    dirty = false;
    try { localStorage.setItem('rq_draft', JSON.stringify({ at: Date.now(), data })); } catch (ex) { /* optional */ }
    status('Saved ✔ Live for everyone in about a minute.', 'ok');
  } catch (ex) {
    status(ex.status === 401 || ex.status === 403 ? 'Token rejected — press FORGET DEVICE and set up again.' : 'Save failed: ' + ex.message, 'bad');
  } finally { btn.disabled = false; }
});

$('#forget').addEventListener('click', () => {
  if (!confirm('Remove the saved GitHub token from this device?')) return;
  localStorage.removeItem('rq_tok'); token = ''; pin = ''; dirty = false;
  $('#pin').value = ''; show('gate');
});
})();
