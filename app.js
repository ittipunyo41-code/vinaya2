const KEY = 'vinaya-data';
const TYPES = { h2: 'หัวการ์ด (h2)', h3: 'หัวข้อย่อย (h3)', items: 'รายการ', pills: 'แท็ก', verse: 'บาลี/หมายเหตุ', html: 'HTML ดิบ' };
const ADMIN = window.ADMIN === true; // ตั้งค่าจาก index.html (false) / admin.html (true)
let D, editing = false;
const $ = id => document.getElementById(id);

async function load() {
  if (ADMIN) try { const s = localStorage.getItem(KEY); if (s) { D = JSON.parse(s); return render(); } } catch (e) {}
  try { D = await (await fetch('data.json')).json(); render(); }
  catch (e) { $('bar').innerHTML = '<span style="color:#fff">โหลด data.json ไม่ได้ (เปิดด้วย file://) → </span>'; addBtn('เลือก data.json', pick); }
}
function addBtn(t, f, on) { const b = document.createElement('button'); b.textContent = t; b.onclick = f; if (on) b.className = 'on'; $('bar').appendChild(b); }

function blockHTML(b) {
  const st = b.style ? ` style="${b.style}"` : '';
  switch (b.type) {
    case 'heading': return `<${b.level}${st}>${b.html}</${b.level}>`;
    case 'items': return `<${b.wrap} class="vertical-list"${st}>` + b.items.map(it => {
      const t = it.li ? 'li' : 'div', c = it.li ? (it.cls || '') : ('vertical-item ' + (it.cls || ''));
      return `<${t} class="${c.trim()}"${it.style ? ` style="${it.style}"` : ''}>${it.html}</${t}>`; }).join('') + `</${b.wrap}>`;
    case 'pills': return `<div class="pill-row"${st}>` + b.items.map(x => `<span class="pill">${x}</span>`).join('') + '</div>';
    case 'verse': return `<div class="verse"${st}>${b.html}</div>`;
    default: return b.html;
  }
}

const S = { q: '', sort: 'orig', tag: '' };
const key = t => (t || '').replace(/^[\d๐-๙.\s]+/, '');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const plain = c => (c.title + ' ' + (c.tags || []).join(' ') + ' ' + c.blocks.map(b => b.html || (b.items || []).map(x => x.html || x).join(' ')).join(' ')).replace(/<[^>]+>/g, ' ').toLowerCase();
function view() {
  let v = D.cards.map((c, i) => [c, i]);
  if (S.tag) v = v.filter(([c]) => (c.tags || []).includes(S.tag));
  if (S.q) v = v.filter(([c]) => plain(c).includes(S.q.toLowerCase()));
  const col = new Intl.Collator('th');
  if (S.sort === 'name') v.sort((a, b) => col.compare(key(a[0].title), key(b[0].title)));
  if (S.sort === 'tag') v.sort((a, b) => { const x = (a[0].tags || [])[0], y = (b[0].tags || [])[0];
    if (!x !== !y) return x ? -1 : 1; return col.compare(x || '', y || '') || col.compare(key(a[0].title), key(b[0].title)); });
  return v;
}
function initFilters() {
  $('flt').innerHTML = '<input id="q" placeholder="ค้นหา..."><select id="srt"><option value="orig">เรียง: ลำดับเดิม</option><option value="name">เรียง: ชื่อ ก-ฮ</option><option value="tag">เรียง: แท็ก</option></select><span id="chips" style="display:contents"></span>';
  $('q').oninput = e => { S.q = e.target.value; drawGrid(); };
  $('srt').onchange = e => { S.sort = e.target.value; drawGrid(); };
}
function drawChips() {
  const tags = [...new Set(D.cards.flatMap(c => c.tags || []))].sort(new Intl.Collator('th').compare);
  if (S.tag && !tags.includes(S.tag)) S.tag = '';
  $('chips').innerHTML = ['', ...tags].map(t => `<button class="chip${S.tag === t ? ' on' : ''}" data-t="${esc(t)}" onclick="setTag(this.dataset.t)">${t ? esc(t) : 'ทั้งหมด'}</button>`).join('');
}
const setTag = t => { S.tag = S.tag === t ? '' : t; drawChips(); drawGrid(); };

function drawGrid() {
  const movable = S.sort === 'orig' && !S.tag && !S.q, v = view();
  $('grid').innerHTML = v.length ? v.map(([c, i]) => `<div class="card"><div class="cardbar">
    ${movable ? `<button onclick="mv(${i},-1)">↑</button><button onclick="mv(${i},1)">↓</button>` : ''}
    <button onclick="openEditor(${i})">✎ แก้ไข</button><button onclick="del(${i})">🗑</button></div>`
    + c.blocks.map(blockHTML).join('')
    + ((c.tags || []).length ? `<div class="ctags">${c.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : '') + '</div>').join('')
    : '<div class="empty">ไม่พบการ์ดที่ตรงเงื่อนไข</div>';
  $('grid').classList.toggle('editing', editing); document.body.classList.toggle('editing', editing);
}
function render() {
  $('ttl').textContent = D.meta.title; $('sub').textContent = D.meta.subtitle;
  document.title = D.meta.title;
  drawChips(); drawGrid();
  $('bar').innerHTML = '';
  addBtn('📄 บันทึกเป็น PDF', () => window.print()); // พิมพ์ A4 (CSS @media print) แล้วเลือก "บันทึกเป็น PDF"; ได้เฉพาะการ์ดที่กรอง/เรียงอยู่
  if (!ADMIN) return;
  addBtn(editing ? '✏️ ปิดโหมดแก้ไข' : '✏️ โหมดแก้ไข', () => { editing = !editing; render(); }, editing);
  if (editing) { addBtn('+ การ์ดใหม่', () => openEditor(-1)); addBtn('⬇ ส่งออก data.json', exportJSON);
    addBtn('⬆ นำเข้า', pick); addBtn('↺ ล้างฉบับร่าง', () => { if (confirm('ล้างการแก้ไขในเบราว์เซอร์นี้?')) { localStorage.removeItem(KEY); location.reload(); } }); }
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { alert('บันทึกในเบราว์เซอร์ไม่ได้ กรุณาส่งออกไฟล์'); } render(); };
const mv = (i, d) => { const j = i + d; if (j < 0 || j >= D.cards.length) return; [D.cards[i], D.cards[j]] = [D.cards[j], D.cards[i]]; save(); };
const del = i => { if (confirm('ลบการ์ด "' + D.cards[i].title + '" ?')) { D.cards.splice(i, 1); save(); } };

function toText(b) { return b.type === 'items' ? b.items.map(x => x.html).join('\n') : b.type === 'pills' ? b.items.join('\n') : b.html || ''; }
const kind = b => b.type === 'heading' ? b.level : b.type;
function fromText(k, txt, old) {
  const lines = txt.split('\n').map(s => s.trim()).filter(Boolean);
  const conv = s => (!s.includes('<') && s.includes(' | ')) ? s.replace(/^(.*?) \| (.*)$/, '<b>$1</b> - $2') : s;
  const keep = old && old.type === (k === 'h2' || k === 'h3' ? 'heading' : k) ? old : {};
  const sty = keep.style ? { style: keep.style } : {};
  if (k === 'h2' || k === 'h3') return { type: 'heading', level: k, html: txt.trim(), ...sty };
  if (k === 'items') return { type: 'items', wrap: keep.wrap || 'div', ...sty, items: lines.map((s, i) => {
    const o = (keep.items && (keep.items[i] || keep.items[keep.items.length - 1])) || {}, it = { html: conv(s) };
    if (o.li) it.li = true; if (o.cls) it.cls = o.cls; if (keep.items && keep.items[i] && o.style) it.style = o.style; return it; }) };
  if (k === 'pills') return { type: 'pills', items: lines, ...sty };
  return { type: k, html: txt.trim(), ...sty };
}

function openEditor(i) {
  const isNew = i < 0, card = isNew ? { id: 'c' + Date.now(), title: '', blocks: [] } : D.cards[i];
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal"><b>${isNew ? 'การ์ดใหม่' : 'แก้ไขการ์ด'}</b>
    <input id="m-title" placeholder="ชื่อการ์ด (หัวข้อ)" value="${esc(card.title || '')}">
    <input id="m-tags" placeholder="แท็ก (คั่นด้วย ,)" value="${esc((card.tags || []).join(', '))}">
    <div id="m-blocks"></div><button id="m-add">+ เพิ่มส่วน</button>
    <div class="hint">รายการ/แท็ก: 1 บรรทัด = 1 รายการ · พิมพ์ "คำย่อ | คำเต็ม" ระบบทำตัวหนาให้ · เขียน HTML เองได้</div>
    <div class="row" style="display:flex;gap:6px"><button id="m-ok">บันทึก</button><button id="m-no">ยกเลิก</button></div></div>`;
  document.body.appendChild(bg);
  const box = bg.querySelector('#m-blocks'), olds = [];
  const addBlk = (b, old) => { const d = document.createElement('div'); d.className = 'blk'; d._old = old;
    d.innerHTML = `<div class="row"><select>${Object.entries(TYPES).map(([k, v]) => `<option value="${k}"${k === kind(b) ? ' selected' : ''}>${v}</option>`).join('')}</select><button>🗑</button></div><textarea></textarea>`;
    d.querySelector('textarea').value = toText(b); d.querySelector('button').onclick = () => d.remove(); box.appendChild(d); };
  card.blocks.forEach(b => addBlk(b, b));
  if (isNew) addBlk({ type: 'items', items: [] }, null);
  bg.querySelector('#m-add').onclick = () => addBlk({ type: 'items', items: [] }, null);
  bg.querySelector('#m-no').onclick = () => bg.remove();
  bg.querySelector('#m-ok').onclick = () => {
    const title = bg.querySelector('#m-title').value.trim();
    const blocks = [...box.children].map(d => fromText(d.querySelector('select').value, d.querySelector('textarea').value, d._old));
    if (isNew && title && !blocks.some(b => b.type === 'heading')) blocks.unshift({ type: 'heading', level: 'h2', html: title });
    card.title = title || card.title || 'การ์ดใหม่'; card.blocks = blocks;
    card.tags = bg.querySelector('#m-tags').value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    if (isNew) D.cards.push(card); bg.remove(); save(); };
}

function exportJSON() {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(D, null, 1)], { type: 'application/json' }));
  a.download = 'data.json'; a.click();
}
function pick() {
  const f = document.createElement('input'); f.type = 'file'; f.accept = '.json,application/json';
  f.onchange = async () => { try { const j = JSON.parse(await f.files[0].text()); if (!Array.isArray(j.cards)) throw 0; D = j; save(); } catch (e) { alert('ไฟล์ JSON ไม่ถูกต้อง'); } };
  f.click();
}
initFilters();
load();
