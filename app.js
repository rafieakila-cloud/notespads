// NOTESPADS — notes app with share via link + QR
const STORAGE = 'notespads-data';
let state = loadState();
let currentId = null;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const noteList = $('#noteList');
const noteTitle = $('#noteTitle');
const noteBody = $('#noteBody');
const noteDate = $('#noteDate');
const wordCount = $('#wordCount');
const noteCount = $('#noteCount');
const toastEl = $('#toast');

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) return JSON.parse(raw);
  } catch {}
  const id = uid();
  return { notes: [{ id, title: 'Selamat datang 👋', body: 'Ini Notespads.\n\nKetik apa saja di sini. Pin untuk menjorok ke atas, Bintang untuk prioritas.\nSemua tersimpan otomatis di HP kamu.\n\nTombol "Export" untuk cetak jadi PDF, atau "Share" untuk dapat QR code share.', pinned: false, fav: false, created: Date.now(), updated: Date.now() }], active: id };
}
function saveState() {
  try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch {}
}
function uid() { return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function fmtDate(t) { return new Date(t).toLocaleString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
function shareUrl(n) {
  const data = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify({ title: n.title, body: n.body })))));
  return window.location.origin + window.location.pathname + '#share=' + data;
}
function showToast(msg) {
  toastEl.textContent = msg; toastEl.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.add('hidden'), 2400);
}
function wordCountText(t) { return (t.trim().split(/\s+/).filter(w => w).length) + ' kata'; }

function filtered(list) {
  const q = $('#search').value.trim().toLowerCase();
  const f = $('.filter-row .chip.active')?.dataset.filter || 'all';
  return list.filter(n => {
    if (f === 'fav' && !n.fav) return false;
    if (f === 'pin' && !n.pinned) return false;
    if (!q) return true;
    return (n.title + ' ' + n.body).toLowerCase().includes(q);
  });
}
function renderList() {
  noteList.innerHTML = '';
  const sorted = [...state.notes].sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (b.updated - a.updated));
  const list = filtered(sorted);
  if (!list.length) { noteList.innerHTML = '<div style="color:var(--muted);text-align:center;padding:30px 10px;font-size:11px">Tidak ada catatan</div>'; return; }
  for (const n of list) {
    const li = document.createElement('li');
    li.className = 'note-item' + (n.id === state.active ? ' active' : '') + (n.pinned ? ' pinned' : '') + (n.fav ? ' fav' : '');
    li.innerHTML = `
      <div class="t">${escapeHtml(n.title || '(tanpa judul)')}</div>
      <div class="m">${fmtDate(n.updated)} · ${wordCountText(n.body)}</div>
      <div class="badges">${n.pinned ? '<span style="color:var(--gold)">★</span>' : ''}${n.fav ? '<span style="color:var(--orange)">♥</span>' : ''}</div>`;
    li.onclick = () => { state.active = n.id; saveState(); renderList(); openNote(); };
    noteList.appendChild(li);
  }
  noteCount.textContent = state.notes.length + ' catatan';
}
function escapeHtml(s) { return String(s||'').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function openNote() {
  const n = state.notes.find(x => x.id === state.active) || state.notes[0];
  currentId = n.id;
  noteTitle.value = n.title;
  noteBody.value = n.body;
  noteDate.textContent = 'diedit ' + fmtDate(n.updated);
  wordCount.textContent = wordCountText(n.body);
  $('#togglePin').classList.toggle('active', n.pinned);
  $('#toggleFav').classList.toggle('active', n.fav);
}
function newNote() {
  const id = uid();
  state.notes.push({ id, title: '', body: '', pinned: false, fav: false, created: Date.now(), updated: Date.now() });
  state.active = id; currentId = id;
  saveState(); noteTitle.value=''; noteBody.value=''; noteTitle.focus();
  noteDate.textContent = 'dibuat ' + fmtDate(Date.now());
  wordCount.textContent = '0 kata';
  renderList();
}
function updateCurrent() {
  const n = state.notes.find(x => x.id === currentId);
  if (!n) return;
  n.title = noteTitle.value;
  n.body = noteBody.value;
  n.updated = Date.now();
  noteDate.textContent = 'diedit ' + fmtDate(n.updated);
  wordCount.textContent = wordCountText(n.body);
  saveState(); renderList();
}
function deleteCurrent() {
  const n = state.notes.find(x => x.id === currentId);
  if (!n) return;
  if (state.notes.length <= 1) { alert('Catatan terakhir — hapus tidak diizinkan'); return; }
  if (confirm('Hapus catatan ini?')) {
    state.notes = state.notes.filter(x => x.id !== currentId);
    state.active = state.notes[0].id;
    currentId = state.active;
    saveState();
    openNote(); renderList();
    showToast('Catatan dihapus');
  }
}

/* events */
$('#btnNew').addEventListener('click', newNote);
noteTitle.addEventListener('input', updateCurrent);
noteBody.addEventListener('input', updateCurrent);
$('#search').addEventListener('input', renderList);
$('.filter-row').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  $$('.filter-row .chip').forEach(c => c.classList.toggle('active', c === b));
  renderList();
});
$('#togglePin').addEventListener('click', () => { const n = state.notes.find(x => x.id === currentId); n.pinned = !n.pinned; saveState(); renderList(); openNote(); });
$('#toggleFav').addEventListener('click', () => { const n = state.notes.find(x => x.id === currentId); n.fav = !n.fav; saveState(); renderList(); openNote(); });
$('#btnDelete').addEventListener('click', deleteCurrent);

/* export PDF via print */
$('#btnExport').addEventListener('click', () => {
  const n = state.notes.find(x => x.id === currentId); if (!n) return;
  const w = window.open('', '_blank', 'width=800,height=900');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(n.title||'Notespads')}</title><link rel="stylesheet" href="style.css"><style>body{background:#fff;color:#111;padding:40px;font-family:Georgia,serif;}.body-view{font-size:15px;line-height:1.7;white-space:pre-wrap;}h1{border-bottom:3px solid #f97316;padding-bottom:10px}.meta{color:#888;font-size:11px;margin-bottom:20px}</style></head><body><h1>${escapeHtml(n.title||'(tanpa judul)')}</h1><div class="meta">${fmtDate(n.updated)}</div><div class="body-view">${escapeHtml(n.body)}</div><script>window.print()</` + `script></body></html>`);
  w.document.close();
});

/* share modal */
$('#btnShare').addEventListener('click', () => {
  const n = state.notes.find(x => x.id === currentId); if (!n) return;
  const url = shareUrl(n);
  $('#shareUrl').textContent = url;
  $('#qrImage').src = 'https://api.qrserver.com/v1/create-qr-code/?size=112x112&data=' + encodeURIComponent(url);
  $('#about').classList.remove('hidden');
  showToast('Tautan siap dibagikan');
});
$('#copyShareUrl').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#shareUrl').textContent); showToast('Link disalin'); } catch { showToast('gagal salin'); }
});
$('#btnAbout').addEventListener('click', () => aboutModal.classList.remove('hidden'));
const aboutModal = $('#about');
$('#btnCloseAbout').addEventListener('click', () => aboutModal.classList.add('hidden'));
aboutModal.addEventListener('click', e => { if (e.target === aboutModal) aboutModal.classList.add('hidden'); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') aboutModal.classList.add('hidden');
  if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); newNote(); }
  if (e.ctrlKey && e.key.toLowerCase() === 'f') { e.preventDefault(); $('#search').focus(); }
  if (e.key === 'Delete' && document.activeElement !== noteBody.activeElement && document.activeElement !== noteTitle && document.activeElement.tagName !== 'TEXTAREA') { e.preventDefault(); deleteCurrent(); }
});

/* shared-link mode: #share=... */
(function applyShare() {
  const m = window.location.hash.match(/share=([^&]+)/);
  if (!m) return;
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));
    document.body.classList.add('view-only');
    noteTitle.value = data.title || '';
    noteBody.value = data.body || '';
    noteDate.textContent = 'catatan dibagikan';
    wordCount.textContent = wordCountText(data.body || '');
    $('#btnShare').style.display = 'none';
    $('#togglePin').style.display = 'none';
    $('#toggleFav').style.display = 'none';
    $('#btnExport').style.display = 'none';
    $('#btnDelete').style.display = 'none';
  } catch (e) { console.warn('share link tidak dikenal'); }
})();

/* init */
if (state.notes.length && !state.notes.find(n => n.id === state.active)) state.active = state.notes[0].id;
renderList();
openNote();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
