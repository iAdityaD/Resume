(() => {
'use strict';

const R = window.RESUME || {};
const $ = s => document.querySelector(s);
const T = 16, MW = 40, MH = 28;

/* ================= helpers ================= */
function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(77);
const ri = n => (rand() * n) | 0;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => (/^(https?:\/\/|mailto:|tel:)/i.test(u) ? u : '');
function mk(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  fn(c.getContext('2d'));
  return c;
}

/* ================= world ================= */
const G = 0, P = 1, WTR = 2, TREE = 3, BLD = 4, FLW = 5;
const map = Array.from({ length: MH }, () => new Uint8Array(MW));
const setRect = (x, y, w, h, v) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) map[j][i] = v; };

setRect(4, 9, 33, 1, P);
setRect(4, 21, 33, 1, P);
setRect(14, 9, 1, 13, P);
setRect(26, 9, 1, 13, P);
setRect(14, 13, 13, 1, P);
setRect(17, 11, 7, 4, P);
setRect(31, 12, 5, 2, WTR);
setRect(32, 11, 3, 4, WTR);

const BUILDINGS = [
  { id: 'about',      label: 'ABOUT',      name: 'HOME',        bx: 6,  by: 4,  roof: '#d95763', roofD: '#ac3232', roofL: '#f08a8f' },
  { id: 'experience', label: 'EXPERIENCE', name: 'GUILD HALL',  bx: 18, by: 4,  roof: '#5b6ee1', roofD: '#3f3f9c', roofL: '#8fa3f5' },
  { id: 'projects',   label: 'PROJECTS',   name: 'WORKSHOP',    bx: 30, by: 4,  roof: '#df7126', roofD: '#a84f16', roofL: '#f7a45c' },
  { id: 'skills',     label: 'SKILLS',     name: 'ARMORY',      bx: 6,  by: 16, roof: '#8f563b', roofD: '#663931', roofL: '#b98363' },
  { id: 'education',  label: 'EDUCATION',  name: 'ACADEMY',     bx: 18, by: 16, roof: '#37946e', roofD: '#22654a', roofL: '#6cc79b' },
  { id: 'contact',    label: 'CONTACT',    name: 'POST OFFICE', bx: 30, by: 16, roof: '#76428a', roofD: '#4f2a61', roofL: '#a773bb' }
];
BUILDINGS.forEach(b => { setRect(b.bx, b.by, 5, 4, BLD); map[b.by + 4][b.bx + 2] = P; });

for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
  if (x < 2 || y < 2 || x >= MW - 2 || y >= MH - 2) map[y][x] = TREE;
}
const nearNonGrass = (x, y) => {
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const v = map[y + j] && map[y + j][x + i];
    if (v === P || v === BLD || v === WTR) return true;
  }
  return false;
};
for (let k = 0; k < 110; k++) {
  const x = 2 + ri(MW - 4), y = 2 + ri(MH - 4);
  if (map[y][x] === G && !nearNonGrass(x, y)) map[y][x] = TREE;
}
for (let k = 0; k < 70; k++) {
  const x = 2 + ri(MW - 4), y = 2 + ri(MH - 4);
  if (map[y][x] === G) map[y][x] = FLW;
}

const NPC = { tx: 22, ty: 11 };
const SPAWN = { tx: 20, ty: 13 };
const isSolidTile = (tx, ty) => {
  if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
  const v = map[ty][tx];
  if (v === WTR || v === TREE || v === BLD) return true;
  return tx === NPC.tx && ty === NPC.ty;
};

// Skill gems: placed only on tiles reachable from spawn.
const skillList = (R.skills || []).reduce((a, g) => a.concat(g.items || []), []);
const gems = [];
(() => {
  const seen = new Set([SPAWN.tx + ',' + SPAWN.ty]);
  const q = [[SPAWN.tx, SPAWN.ty]], cells = [];
  while (q.length) {
    const [x, y] = q.shift();
    if (Math.abs(x - SPAWN.tx) + Math.abs(y - SPAWN.ty) > 4) cells.push([x, y]);
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      const k = (x + dx) + ',' + (y + dy);
      if (!seen.has(k) && !isSolidTile(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); }
    });
  }
  const doorFront = (x, y) => BUILDINGS.some(b => x === b.bx + 2 && y === b.by + 4);
  const used = new Set();
  skillList.forEach((s, i) => {
    for (let tries = 0; tries < 200 && cells.length; tries++) {
      const [x, y] = cells[ri(cells.length)];
      const k = x + ',' + y;
      if (used.has(k) || doorFront(x, y)) continue;
      let crowded = false;
      gems.forEach(g => { if (Math.abs(g.tx - x) + Math.abs(g.ty - y) < 4) crowded = true; });
      if (crowded && tries < 150) continue;
      used.add(k);
      gems.push({ tx: x, ty: y, skill: s, got: false, hue: (i * 67) % 360 });
      break;
    }
  });
})();

/* ================= art ================= */
const C = {
  grass: '#63b44c', grassD: '#4f9c3e', grassL: '#82cc62',
  path: '#e6c98e', pathD: '#cdaa6c', pathL: '#f3dfb0',
  water: '#3f8fd8', waterD: '#2f6fb8', waterL: '#9fd8f5',
  leaf: '#2f7d3a', leafD: '#1f5c2c', leafL: '#4fa650', trunk: '#6b4226'
};
const grassTiles = [0, 1, 2, 3].map(() => mk(T, T, c => {
  c.fillStyle = C.grass; c.fillRect(0, 0, T, T);
  for (let k = 0; k < 7; k++) { c.fillStyle = k % 2 ? C.grassD : C.grassL; c.fillRect(ri(15), ri(14), 1, 2); }
}));
const pathTile = [0, 1].map(() => mk(T, T, c => {
  c.fillStyle = C.path; c.fillRect(0, 0, T, T);
  for (let k = 0; k < 5; k++) { c.fillStyle = k % 2 ? C.pathD : C.pathL; c.fillRect(ri(15), ri(15), 2, 1); }
}));
const waterTiles = [0, 1].map(f => mk(T, T, c => {
  c.fillStyle = C.water; c.fillRect(0, 0, T, T);
  c.fillStyle = C.waterL;
  c.fillRect(2 + f * 3, 3, 4, 1); c.fillRect(9 - f * 2, 8, 5, 1); c.fillRect(3 + f * 2, 13, 3, 1);
  c.fillStyle = C.waterD;
  c.fillRect(10 - f * 3, 4, 3, 1); c.fillRect(1 + f * 4, 10, 3, 1);
}));
const treeSprite = mk(16, 24, c => {
  c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(3, 21, 10, 2);
  c.fillStyle = C.trunk; c.fillRect(7, 15, 3, 7);
  c.fillStyle = C.leafD; c.fillRect(2, 3, 12, 13); c.fillRect(1, 5, 14, 9); c.fillRect(4, 1, 8, 2);
  c.fillStyle = C.leaf; c.fillRect(2, 3, 11, 11); c.fillRect(1, 5, 13, 7); c.fillRect(4, 1, 7, 2);
  c.fillStyle = C.leafL; c.fillRect(4, 3, 4, 2); c.fillRect(3, 5, 2, 3); c.fillRect(8, 6, 2, 1); c.fillRect(6, 9, 1, 1);
});
const FLOWER_COLS = ['#ff7eb6', '#ffe066', '#ffffff', '#c59bff'];

const ICONS = {
  about:      ['..XXXX..', '..XXXX..', '..XXXX..', '...XX...', '.XXXXXX.', '.XXXXXX.', '.XXXXXX.', '..X..X..'],
  experience: ['......XX', '.....XXX', '....XXX.', 'X..XXX..', '.XXXX...', '..XX....', '.X.XX...', 'X...X...'],
  projects:   ['.XXXXX..', '.XXXXXX.', '.XXXXX..', '...XX...', '...XX...', '...XX...', '...XX...', '...XX...'],
  skills:     ['XXXXXXXX', 'XXXXXXXX', 'XX.XX.XX', 'XXXXXXXX', '.XXXXXX.', '.XXXXXX.', '..XXXX..', '...XX...'],
  education:  ['........', 'XXX..XXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXX..XXX', '........'],
  contact:    ['........', 'XXXXXXXX', 'XX....XX', 'X.X..X.X', 'X..XX..X', 'X......X', 'XXXXXXXX', '........']
};
function drawIcon(c, id, x, y, col) {
  c.fillStyle = col;
  ICONS[id].forEach((row, j) => { for (let i = 0; i < 8; i++) if (row[i] === 'X') c.fillRect(x + i, y + j, 1, 1); });
}
BUILDINGS.forEach(b => {
  b.sprite = mk(80, 66, c => {
    c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(2, 62, 76, 4);
    c.fillStyle = '#f2e3c2'; c.fillRect(4, 28, 72, 36);
    c.fillStyle = '#d9c59c'; c.fillRect(4, 59, 72, 5);
    c.fillStyle = '#4a3524'; c.fillRect(4, 28, 1, 36); c.fillRect(75, 28, 1, 36);
    // roof
    c.fillStyle = b.roof; c.fillRect(0, 8, 80, 24); c.fillRect(3, 5, 74, 3); c.fillRect(7, 3, 66, 2);
    c.fillStyle = b.roofL; c.fillRect(7, 3, 66, 1); c.fillRect(3, 5, 4, 1); c.fillRect(73, 5, 4, 1);
    c.fillStyle = b.roofD;
    for (let y = 11; y < 30; y += 6) for (let x = (y % 12 ? 0 : 5); x < 80; x += 10) c.fillRect(x, y, 6, 1);
    c.fillRect(0, 30, 80, 2);
    // chimney
    c.fillStyle = '#847e87'; c.fillRect(60, 0, 8, 8); c.fillStyle = '#5a5560'; c.fillRect(60, 0, 8, 2);
    // windows
    [12, 56].forEach(wx => {
      c.fillStyle = '#4a3524'; c.fillRect(wx, 38, 12, 12);
      c.fillStyle = '#9fd8f5'; c.fillRect(wx + 1, 39, 10, 10);
      c.fillStyle = '#e8f7ff'; c.fillRect(wx + 2, 40, 2, 2);
      c.fillStyle = '#4a3524'; c.fillRect(wx + 5, 39, 1, 10); c.fillRect(wx + 1, 43, 10, 1);
      c.fillStyle = b.roof; c.fillRect(wx - 1, 50, 14, 2);
    });
    // door
    c.fillStyle = '#4a3524'; c.fillRect(32, 44, 16, 20);
    c.fillStyle = '#8a5a34'; c.fillRect(34, 46, 12, 18);
    c.fillStyle = '#6b4226'; c.fillRect(39, 46, 1, 18);
    c.fillStyle = '#ffd866'; c.fillRect(43, 55, 2, 2);
    // sign
    c.fillStyle = '#4a3524'; c.fillRect(31, 29, 18, 13);
    c.fillStyle = '#fff3d1'; c.fillRect(32, 30, 16, 11);
    drawIcon(c, b.id, 36, 32, b.roofD);
  });
});

const ground = mk(MW * T, MH * T, c => {
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const v = map[y][x], px = x * T, py = y * T;
    if (v === P) {
      c.drawImage(pathTile[(x + y) % 2], px, py);
      c.fillStyle = C.grassD;
      if (map[y - 1] && map[y - 1][x] !== P && map[y - 1][x] !== BLD) c.fillRect(px, py, T, 1);
      if (map[y + 1] && map[y + 1][x] !== P) c.fillRect(px, py + T - 1, T, 1);
      if (map[y][x - 1] !== P) c.fillRect(px, py, 1, T);
      if (map[y][x + 1] !== P) c.fillRect(px + T - 1, py, 1, T);
    } else {
      c.drawImage(grassTiles[(x * 7 + y * 13) % 4], px, py);
      if (v === FLW) {
        const col = FLOWER_COLS[(x * 3 + y * 5) % 4];
        [[4, 5], [11, 10]].forEach(([fx, fy]) => {
          c.fillStyle = C.leafD; c.fillRect(px + fx, py + fy + 1, 1, 3);
          c.fillStyle = col; c.fillRect(px + fx - 1, py + fy, 3, 1); c.fillRect(px + fx, py + fy - 1, 1, 3);
          c.fillStyle = '#ffb000'; c.fillRect(px + fx, py + fy, 1, 1);
        });
      }
    }
  }
});

const HERO = { skin: '#f1c27d', hair: '#2b1d16', shirt: '#3f8fd8', pants: '#2a2f55', shoe: '#1b1530', extra: '#d95763' };
const SAGE = { skin: '#f1c27d', hair: '#e8e8f0', shirt: '#76428a', pants: '#4f2a61', shoe: '#1b1530', extra: '#ffcf40' };
function drawChar(c, x, y, dir, step, p) {
  x = Math.round(x); y = Math.round(y);
  const r = (a, b, w, h, col) => { c.fillStyle = col; c.fillRect(x + a, y + b, w, h); };
  r(4, 15, 8, 1, 'rgba(0,0,0,.28)');
  const lu = step === 1 ? 1 : 0, ru = step === 2 ? 1 : 0;
  r(5, 12, 2, 3 - lu, p.pants); r(9, 12, 2, 3 - ru, p.pants);
  r(5, 14 - lu, 2, 1, p.shoe); r(9, 14 - ru, 2, 1, p.shoe);
  r(4, 8, 8, 4, p.shirt);
  r(4, 11, 8, 1, p.pants);
  if (dir === 'down' || dir === 'up') {
    r(3, 8, 1, 3, p.shirt); r(12, 8, 1, 3, p.shirt);
    r(3, 11 - ru, 1, 1, p.skin); r(12, 11 - lu, 1, 1, p.skin);
    if (dir === 'down') r(7, 8, 2, 1, p.extra);
  } else {
    r(dir === 'left' ? 8 : 6, 9, 2, 3, p.shirt);
    r(dir === 'left' ? 8 : 6, 11, 2, 1, p.skin);
  }
  r(4, 2, 8, 6, p.skin);
  if (dir === 'down') {
    r(4, 1, 8, 2, p.hair); r(3, 2, 1, 4, p.hair); r(12, 2, 1, 4, p.hair);
    r(6, 5, 1, 2, '#1b1530'); r(9, 5, 1, 2, '#1b1530');
  } else if (dir === 'up') {
    r(3, 1, 10, 6, p.hair); r(4, 7, 8, 1, p.hair);
  } else if (dir === 'left') {
    r(4, 1, 8, 2, p.hair); r(8, 2, 5, 5, p.hair);
    r(5, 5, 1, 2, '#1b1530');
  } else {
    r(4, 1, 8, 2, p.hair); r(3, 2, 5, 5, p.hair);
    r(10, 5, 1, 2, '#1b1530');
  }
}

// Static things that the hero can walk in front of / behind.
const statics = [];
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
  if (map[y][x] === TREE) statics.push({ base: (y + 1) * T, draw: (c, cx, cy) => c.drawImage(treeSprite, x * T - cx, y * T - 8 - cy) });
}
BUILDINGS.forEach(b => statics.push({ base: (b.by + 4) * T, draw: (c, cx, cy) => c.drawImage(b.sprite, b.bx * T - cx, b.by * T - cy) }));
statics.push({ base: (NPC.ty + 1) * T, draw: (c, cx, cy, t) => drawChar(c, NPC.tx * T - cx, NPC.ty * T - 2 - cy + (Math.floor(t / 600) % 2), 'down', 0, SAGE) });
statics.sort((a, b) => a.base - b.base);

/* ================= state ================= */
const cv = $('#game'), ctx = cv.getContext('2d');
const ov = $('#labels'), octx = ov.getContext('2d');
let scale = 3, VW = 0, VH = 0, dpr = 1;
let state = 'title';
const hero = { x: SPAWN.tx * T, y: SPAWN.ty * T - 4, dir: 'down', walk: 0, moving: false };
const keys = {}, joy = { x: 0, y: 0 };
const visited = new Set();
let gemCount = 0, won = false, near = null, cam = { x: 0, y: 0 };
const particles = [];
const coarse = window.matchMedia && matchMedia('(hover: none), (pointer: coarse)').matches;

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  scale = Math.max(2, Math.min(6, Math.floor(Math.min(w, h) / (T * 9))));
  VW = Math.ceil(w / scale); VH = Math.ceil(h / scale);
  cv.width = VW; cv.height = VH;
  cv.style.width = VW * scale + 'px'; cv.style.height = VH * scale + 'px';
  ov.width = Math.round(w * dpr); ov.height = Math.round(h * dpr);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

/* ================= audio ================= */
let actx = null, muted = false;
function beep(f, d, type, slide) {
  if (muted) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.linearRampToValueAtTime(f + slide, t + d);
    g.gain.setValueAtTime(0.045, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(actx.destination);
    o.start(t); o.stop(t + d);
  } catch (e) { /* audio is optional */ }
}
const sfx = {
  open: () => { beep(440, 0.07); setTimeout(() => beep(660, 0.09), 70); },
  close: () => beep(330, 0.08),
  gem: () => { beep(880, 0.06); setTimeout(() => beep(1320, 0.12), 60); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.18), i * 130))
};

/* ================= resume content ================= */
const tags = (arr, cls) => '<div class="tags">' + (arr || []).map(t => `<span class="tag-i${cls ? ' ' + cls(t) : ''}">${esc(t)}</span>`).join('') + '</div>';
const list = arr => (arr && arr.length ? '<ul>' + arr.map(p => `<li>${esc(p)}</li>`).join('') + '</ul>' : '');
const link = (u, text) => { const s = safeUrl(u); return s ? `<a href="${esc(s)}" target="_blank" rel="noopener">${esc(text || u)}</a>` : esc(text || u); };

const SECTION = {
  about: () =>
    `<h3>${esc(R.name)}</h3><p class="meta">${esc(R.title)}${R.location ? ' · ' + esc(R.location) : ''}</p>` +
    (R.about || []).map(p => `<p>${esc(p)}</p>`).join('') +
    ((R.stats || []).length ? '<div class="stats">' + R.stats.map(s => `<div class="stat"><b>${esc(s.label)}</b>${esc(s.value)}</div>`).join('') + '</div>' : ''),
  experience: () => (R.experience || []).map(e =>
    `<div class="entry"><h3>${esc(e.role)}</h3><p class="meta">${esc(e.company)}${e.period ? ' · ' + esc(e.period) : ''}</p>${list(e.points)}</div>`).join(''),
  projects: () => (R.projects || []).map(p =>
    `<div class="entry"><h3>${esc(p.name)}</h3>${tags(p.tech)}<p>${esc(p.desc)}</p>${p.link ? '<p>' + link(p.link) + '</p>' : ''}</div>`).join(''),
  skills: plain => (R.skills || []).map(g =>
    `<h3>${esc(g.group)}</h3>` + tags(g.items, plain ? null : t => (gems.some(x => x.skill === t && x.got) ? 'got' : ''))).join('') +
    (plain || !gems.length ? '' : `<p class="meta">◆ = gems you have found (${gemCount}/${gems.length}). The rest are still out in the village.</p>`),
  education: () => (R.education || []).map(e =>
    `<div class="entry"><h3>${esc(e.degree)}</h3><p class="meta">${esc(e.school)}${e.period ? ' · ' + esc(e.period) : ''}</p>${e.note ? '<p>' + esc(e.note) + '</p>' : ''}</div>`).join(''),
  contact: () => {
    const c = R.contact || {}, rows = [];
    if (c.email) rows.push(['EMAIL', link('mailto:' + c.email, c.email)]);
    if (c.phone) rows.push(['PHONE', link('tel:' + c.phone.replace(/\s+/g, ''), c.phone)]);
    if (c.github) rows.push(['GITHUB', link(c.github)]);
    if (c.linkedin) rows.push(['LINKEDIN', link(c.linkedin)]);
    if (c.website) rows.push(['WEBSITE', link(c.website)]);
    return '<ul class="links">' + rows.map(r => `<li><b>${r[0]}</b> ${r[1]}</li>`).join('') + '</ul>';
  }
};

function renderPlain() {
  $('#plainBody').innerHTML =
    `<h1>${esc(R.name)}</h1><p class="meta">${esc(R.title)}${R.location ? ' · ' + esc(R.location) : ''}</p>` +
    (R.tagline ? `<p>${esc(R.tagline)}</p>` : '') + SECTION.contact() +
    '<h2>ABOUT</h2>' + (R.about || []).map(p => `<p>${esc(p)}</p>`).join('') +
    '<h2>EXPERIENCE</h2>' + SECTION.experience() +
    '<h2>PROJECTS</h2>' + SECTION.projects() +
    '<h2>SKILLS</h2>' + SECTION.skills(true) +
    '<h2>EDUCATION</h2>' + SECTION.education();
}

/* ================= UI ================= */
const el = { title: $('#title'), panel: $('#panel'), plain: $('#plain'), hud: $('#hud'), hint: $('#hint'), touch: $('#touch'), toast: $('#toast'), score: $('#score') };
$('#tName').textContent = R.name || 'RESUME';
$('#tRole').textContent = R.title || '';
$('#tTag').textContent = R.tagline || '';
document.title = (R.name ? R.name + ' — ' : '') + 'Resume Quest';
renderPlain();

function updateScore() {
  el.score.textContent = `QUEST ${visited.size}/${BUILDINGS.length} · GEMS ${gemCount}/${gems.length}`;
}
function showGameUi(on) { el.hud.hidden = !on; el.hint.hidden = !on; el.touch.hidden = !on; }
let toastTimer = 0;
function toast(msg) {
  el.toast.textContent = msg; el.toast.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.toast.hidden = true; }, 1800);
}
let afterClose = null;
function openPanel(title, html, then) {
  $('#pTitle').textContent = title;
  $('#pBody').innerHTML = html;
  $('#pBody').scrollTop = 0;
  el.panel.hidden = false; state = 'panel'; afterClose = then || null;
  resetInput(); sfx.open();
  $('#btnClose').focus({ preventScroll: true });
}
function closePanel() {
  if (state !== 'panel') return;
  el.panel.hidden = true; state = 'play'; sfx.close();
  $('#btnClose').blur();
  const f = afterClose; afterClose = null;
  if (f) f();
}
function start() {
  el.title.hidden = true; state = 'play'; showGameUi(true); updateScore(); sfx.open();
  document.activeElement && document.activeElement.blur();
}
function showPlain() {
  renderPlain(); resetInput();
  el.plain.hidden = false; el.plain.dataset.from = state; state = 'plain';
}
function hidePlain() {
  el.plain.hidden = true;
  if (el.plain.dataset.from === 'title') state = 'title'; else { state = 'play'; }
}
function resetInput() { for (const k in keys) keys[k] = false; joy.x = joy.y = 0; $('#nub').style.transform = ''; }

function checkWin() {
  if (won || visited.size < BUILDINGS.length) return;
  won = true; sfx.win();
  for (let i = 0; i < 90; i++) particles.push({ x: Math.random() * VW, y: -Math.random() * 60, vx: (Math.random() - 0.5) * 30, vy: 30 + Math.random() * 50, col: FLOWER_COLS[i % 4], life: 5 });
  openPanel('★ QUEST COMPLETE ★',
    `<p>You explored the whole village and now know ${esc(R.name)}'s story.</p><h3>NEXT QUEST: SAY HELLO</h3>` + SECTION.contact() +
    '<p class="meta">Tip: the RESUME button at the top has a printable one-page version.</p>');
}

function interact() {
  if (state !== 'play' || !near) return;
  if (near.type === 'npc') {
    hero.dir = 'up';
    openPanel('VILLAGE SAGE',
      `<p>Welcome, traveller! This village is the resume of <b>${esc(R.name)}</b>.</p>` +
      `<ul><li>Enter all ${BUILDINGS.length} buildings to complete the quest.</li><li>Collect the glowing gems to discover skills.</li><li>In a hurry? Tap RESUME at the top for the plain version.</li></ul>` +
      `<p class="meta">Progress: ${visited.size}/${BUILDINGS.length} buildings · ${gemCount}/${gems.length} gems</p>`);
    return;
  }
  const b = near.b;
  hero.dir = 'up';
  visited.add(b.id); updateScore();
  openPanel(`${b.name} — ${b.label}`, SECTION[b.id]() || '<p class="meta">Nothing here yet.</p>', checkWin);
}

/* ================= input ================= */
const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
window.addEventListener('keydown', e => {
  if (state === 'title') { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); start(); } return; }
  if (state === 'plain') { if (e.code === 'Escape') hidePlain(); return; }
  if (state === 'panel') {
    if (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'KeyB' || e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); closePanel(); }
    return;
  }
  if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; e.preventDefault(); }
  else if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (!e.repeat) interact(); }
});
window.addEventListener('keyup', e => { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
window.addEventListener('blur', resetInput);

const pad = $('#pad'), nub = $('#nub');
let padId = null;
function padMove(e) {
  const r = pad.getBoundingClientRect();
  let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const max = r.width / 2, len = Math.hypot(dx, dy) || 1;
  if (len > max) { dx = dx / len * max; dy = dy / len * max; }
  nub.style.transform = `translate(${dx * 0.6}px, ${dy * 0.6}px)`;
  joy.x = Math.abs(dx) > max * 0.22 ? dx / max : 0;
  joy.y = Math.abs(dy) > max * 0.22 ? dy / max : 0;
}
pad.addEventListener('pointerdown', e => { padId = e.pointerId; try { pad.setPointerCapture(padId); } catch (err) {} padMove(e); e.preventDefault(); });
pad.addEventListener('pointermove', e => { if (e.pointerId === padId) padMove(e); });
const padEnd = e => { if (e.pointerId === padId) { padId = null; joy.x = joy.y = 0; nub.style.transform = ''; } };
pad.addEventListener('pointerup', padEnd);
pad.addEventListener('pointercancel', padEnd);
$('#btnA').addEventListener('pointerdown', e => { e.preventDefault(); interact(); });
cv.addEventListener('pointerdown', () => { if (state === 'play') interact(); });

$('#btnStart').addEventListener('click', start);
$('#btnSkip').addEventListener('click', showPlain);
$('#btnPlain').addEventListener('click', showPlain);
$('#btnBack').addEventListener('click', hidePlain);
$('#btnPrint').addEventListener('click', () => window.print());
$('#btnClose').addEventListener('click', closePanel);
el.panel.addEventListener('pointerdown', e => { if (e.target === el.panel) closePanel(); });
$('#btnSound').addEventListener('click', e => { muted = !muted; e.currentTarget.textContent = muted ? 'SFX OFF' : 'SFX ON'; e.currentTarget.blur(); });
document.addEventListener('contextmenu', e => { if (state === 'play') e.preventDefault(); });

/* ================= simulation ================= */
function free(x, y) {
  const l = Math.floor((x + 4) / T), r = Math.floor((x + 11) / T), t = Math.floor((y + 10) / T), b = Math.floor((y + 15) / T);
  return !isSolidTile(l, t) && !isSolidTile(r, t) && !isSolidTile(l, b) && !isSolidTile(r, b);
}
function update(dt) {
  if (state !== 'play') { hero.moving = false; return; }
  let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + joy.x;
  let dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0) + joy.y;
  const len = Math.hypot(dx, dy);
  hero.moving = len > 0.15;
  if (hero.moving) {
    if (len > 1) { dx /= len; dy /= len; }
    hero.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    const sp = 74 * dt;
    if (free(hero.x + dx * sp, hero.y)) hero.x += dx * sp;
    if (free(hero.x, hero.y + dy * sp)) hero.y += dy * sp;
    hero.walk += dt;
  } else hero.walk = 0;

  const hx = hero.x + 8, hy = hero.y + 13;
  gems.forEach(g => {
    if (!g.got && Math.hypot(g.tx * T + 8 - hx, g.ty * T + 8 - hy) < 10) {
      g.got = true; gemCount++; updateScore(); sfx.gem();
      toast(`◆ SKILL FOUND: ${g.skill}`);
      for (let i = 0; i < 10; i++) particles.push({ wx: g.tx * T + 8, wy: g.ty * T + 6, vx: (Math.random() - 0.5) * 70, vy: -Math.random() * 70, col: `hsl(${g.hue},90%,70%)`, life: 0.5 });
      if (gemCount === gems.length) setTimeout(() => toast('ALL SKILL GEMS COLLECTED!'), 1900);
    }
  });

  near = null; let best = 1e9;
  BUILDINGS.forEach(b => {
    const d = Math.hypot((b.bx + 2) * T + 8 - hx, (b.by + 4) * T + 4 - hy);
    if (d < 15 && d < best) { best = d; near = { type: 'b', b }; }
  });
  const dn = Math.hypot(NPC.tx * T + 8 - hx, NPC.ty * T + 10 - hy);
  if (dn < 22 && dn < best) near = { type: 'npc' };
}

/* ================= render ================= */
function render(t) {
  const mapW = MW * T, mapH = MH * T;
  cam.x = VW >= mapW ? (mapW - VW) / 2 : Math.max(0, Math.min(mapW - VW, hero.x + 8 - VW / 2));
  cam.y = VH >= mapH ? (mapH - VH) / 2 : Math.max(0, Math.min(mapH - VH, hero.y + 8 - VH / 2));
  const cx = Math.round(cam.x), cy = Math.round(cam.y);

  ctx.fillStyle = '#1f5c2c'; ctx.fillRect(0, 0, VW, VH);
  ctx.drawImage(ground, -cx, -cy);

  const wf = Math.floor(t / 500) % 2;
  for (let y = 10; y < 16; y++) for (let x = 30; x < 37; x++) if (map[y][x] === WTR) ctx.drawImage(waterTiles[(wf + x + y) % 2], x * T - cx, y * T - cy);

  gems.forEach((g, i) => {
    if (g.got) return;
    const gx = g.tx * T + 8 - cx, gy = g.ty * T + 6 - cy + Math.round(Math.sin(t / 250 + i) * 1.5);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(gx - 3, g.ty * T + 13 - cy, 6, 1);
    ctx.fillStyle = `hsl(${g.hue},85%,35%)`; ctx.fillRect(gx - 1, gy - 4, 2, 8); ctx.fillRect(gx - 3, gy - 2, 6, 4); ctx.fillRect(gx - 2, gy - 3, 4, 6);
    ctx.fillStyle = `hsl(${g.hue},90%,62%)`; ctx.fillRect(gx - 1, gy - 3, 2, 6); ctx.fillRect(gx - 2, gy - 2, 4, 4);
    ctx.fillStyle = '#fff'; ctx.fillRect(gx - 1, gy - 2, 1, 2);
    if (Math.floor(t / 300 + i) % 4 === 0) ctx.fillRect(gx + 3, gy - 5, 1, 1);
  });

  const heroBase = hero.y + 16;
  const step = hero.moving ? [1, 0, 2, 0][Math.floor(hero.walk * 9) % 4] : 0;
  let drawn = false;
  for (let i = 0; i < statics.length; i++) {
    const s = statics[i];
    if (!drawn && s.base > heroBase) { drawChar(ctx, hero.x - cx, hero.y - cy, hero.dir, step, HERO); drawn = true; }
    s.draw(ctx, cx, cy, t);
  }
  if (!drawn) drawChar(ctx, hero.x - cx, hero.y - cy, hero.dir, step, HERO);

  // visited stars on roofs
  BUILDINGS.forEach(b => {
    if (!visited.has(b.id)) return;
    const sx = b.bx * T + 12 - cx, sy = b.by * T + 14 - cy;
    ctx.fillStyle = '#1b1530'; ctx.fillRect(sx - 1, sy - 1, 9, 9);
    ctx.fillStyle = '#ffcf40'; ctx.fillRect(sx + 3, sy, 1, 7); ctx.fillRect(sx, sy + 2, 7, 2); ctx.fillRect(sx + 1, sy + 4, 5, 1); ctx.fillRect(sx + 2, sy + 1, 3, 4);
  });

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    ctx.fillStyle = p.col;
    if (p.wx !== undefined) ctx.fillRect(Math.round(p.wx - cx), Math.round(p.wy - cy), 2, 2);
    else ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 3);
  }

  // ----- crisp overlay: labels, prompt, compass -----
  const k = scale * dpr;
  octx.clearRect(0, 0, ov.width, ov.height);
  if (state === 'plain') return;
  const fs = Math.max(8, Math.round(scale * 3.2)) * dpr;
  octx.font = `${fs}px "Press Start 2P", monospace`;
  octx.textAlign = 'center'; octx.textBaseline = 'middle';
  const plate = (text, wx, wy, fg, bg) => {
    const w = octx.measureText(text).width + fs * 1.2, h = fs * 1.9;
    const x = Math.round((wx - cx) * k - w / 2), y = Math.round((wy - cy) * k - h / 2);
    octx.fillStyle = '#1b1530'; octx.fillRect(x - 2 * dpr, y - 2 * dpr, w + 4 * dpr, h + 4 * dpr);
    octx.fillStyle = bg; octx.fillRect(x, y, w, h);
    octx.fillStyle = fg; octx.fillText(text, x + w / 2, y + h / 2 + dpr);
  };
  BUILDINGS.forEach(b => {
    const v = visited.has(b.id);
    plate(b.label, b.bx * T + 40, b.by * T - 5, v ? '#1b1530' : '#fff3d1', v ? '#ffcf40' : '#1b1530');
  });
  if (state === 'play') {
    if (near) {
      const bob = Math.round(Math.sin(t / 180) * 1.5);
      plate(coarse ? 'A' : 'E', hero.x + 8, hero.y - 8 + bob, '#1b1530', '#ffcf40');
    } else if (!won) {
      // compass towards the nearest unvisited building
      let tgt = null, bd = 1e9;
      BUILDINGS.forEach(b => {
        if (visited.has(b.id)) return;
        const d = Math.hypot((b.bx + 2) * T + 8 - hero.x - 8, (b.by + 4) * T + 4 - hero.y - 13);
        if (d < bd) { bd = d; tgt = b; }
      });
      if (tgt && bd > 70) {
        const a = Math.atan2((tgt.by + 4) * T + 4 - hero.y - 13, (tgt.bx + 2) * T + 8 - hero.x - 8);
        const px = (hero.x + 8 - cx) * k, py = (hero.y + 8 - cy) * k, rad = 20 * k, s = 4 * k;
        octx.save(); octx.translate(px + Math.cos(a) * rad, py + Math.sin(a) * rad); octx.rotate(a);
        octx.beginPath(); octx.moveTo(s, 0); octx.lineTo(-s * 0.7, -s * 0.8); octx.lineTo(-s * 0.7, s * 0.8); octx.closePath();
        octx.fillStyle = '#ffcf40'; octx.strokeStyle = '#1b1530'; octx.lineWidth = 2 * dpr; octx.globalAlpha = 0.6 + 0.4 * Math.sin(t / 200);
        octx.fill(); octx.globalAlpha = 1; octx.stroke(); octx.restore();
      }
    }
  }
}

let last = 0;
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
  update(dt);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt; p.vy += 120 * dt * (p.wx !== undefined ? 1 : 0);
    if (p.wx !== undefined) { p.wx += p.vx * dt; p.wy += p.vy * dt; } else { p.x += p.vx * dt; p.y += p.vy * dt; }
    if (p.life <= 0) particles.splice(i, 1);
  }
  render(t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Small hook for automated checks.
window.__quest = { hero, BUILDINGS, gems, visited, T, state: () => state };
})();
