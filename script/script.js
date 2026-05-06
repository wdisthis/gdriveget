let queue = [];
let history = [];
let idCounter = 0;

try { history = JSON.parse(localStorage.getItem('driveget_history') || '[]'); } catch(e) { history = []; }

// ── HELPERS ──
function extractFileId(url) {
  url = (url || '').trim();
  let m;
  m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) return url;
  return null;
}

function buildDownloadUrl(fileId) {
  return 'https://drive.google.com/uc?export=download&id=' + fileId;
}

function shortUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 30 ? u.pathname.slice(0, 30) + '...' : u.pathname;
    return u.hostname + path;
  } catch { return (url || '').slice(0, 48); }
}

function formatDate(ts) {
  return new Date(ts).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
}

function genId() { return ++idCounter; }
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── TABS ──
function switchTab(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'history') renderHistory();
}

// ── CLIPBOARD ──
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    document.getElementById('single-url').value = text.trim();
  } catch {
    toast('Unable to access clipboard.', 'error');
  }
}

// ── SINGLE LINK ──
function addSingleLink() {
  const input = document.getElementById('single-url');
  const url = (input.value || '').trim();
  if (!url) { toast('Please enter a link first.', 'error'); return; }
  const fileId = extractFileId(url);
  if (!fileId) { toast('Google Drive link format not recognized.', 'error'); return; }
  queue.push({ id: genId(), url, fileId, name: 'file_' + fileId.slice(0, 8), status: 'pending' });
  input.value = '';
  renderQueue();
  toast('Link successfully added to queue.', 'success');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('single-url').addEventListener('keydown', e => {
    if (e.key === 'Enter') addSingleLink();
  });
});

// ── BULK TXT ──
const dropZone = document.getElementById('drop-zone');
if (dropZone) {
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) readTxtFile(file);
  });
}

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (file) readTxtFile(file);
}

function readTxtFile(file) {
  if (!file.name.endsWith('.txt')) { toast('Only .txt files are supported.', 'error'); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    const text = ev.target.result;
    document.getElementById('bulk-textarea').value = text;
    document.getElementById('bulk-preview-card').style.display = 'block';
    const lines = text.split('\n').filter(l => l.trim()).length;
    toast(lines + ' lines found in file.', 'success');
  };
  reader.readAsText(file);
}

function clearBulk() {
  document.getElementById('bulk-textarea').value = '';
  document.getElementById('bulk-preview-card').style.display = 'none';
  document.getElementById('file-input').value = '';
}

function addBulkLinks() {
  const text = document.getElementById('bulk-textarea').value || '';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let added = 0, skipped = 0;
  lines.forEach(url => {
    const fileId = extractFileId(url);
    if (!fileId) { skipped++; return; }
    queue.push({ id: genId(), url, fileId, name: 'file_' + fileId.slice(0, 8), status: 'pending' });
    added++;
  });
  renderQueue();
  clearBulk();
  switchTab('single');
  if (added) {
    toast(added + ' links added' + (skipped ? ', ' + skipped + ' skipped.' : '.'), 'success');
  } else {
    toast('No valid links found.', 'error');
  }
}

// ── RENDER QUEUE ──
function renderQueue() {
  const list = document.getElementById('file-list');
  const empty = document.getElementById('empty-state');
  if (!list || !empty) return;
  
  document.getElementById('queue-count').textContent = queue.length;
  document.getElementById('btn-clear').style.display = queue.length ? '' : 'none';
  document.getElementById('btn-download-all').style.display = queue.length > 0 ? '' : 'none';

  list.querySelectorAll('.file-item').forEach(el => el.remove());

  if (!queue.length) { empty.style.display = ''; return; }
  empty.style.display = 'none';

  queue.forEach(item => {
    const el = document.createElement('div');
    el.className = 'file-item' + (item.status !== 'pending' ? ' ' + item.status : '');
    el.id = 'item-' + item.id;

    const iconColor = item.status === 'done' ? '#22d47a' : item.status === 'error' ? '#f25757' : item.status === 'downloading' ? '#4f8ef7' : '#606880';
    const fileIconHtml = '<svg viewBox="0 0 24 24" fill="none" stroke="' + iconColor + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>';

    const badges = { pending: ['pending','Pending'], downloading: ['downloading','Downloading'], done: ['done','Done'], error: ['error','Failed'] };
    const [cls, label] = badges[item.status] || badges.pending;
    const pulse = item.status === 'downloading' ? ' pulse' : '';
    const badgeHtml = '<span class="status-badge ' + cls + '"><span class="status-dot' + pulse + '"></span>' + label + '</span>';

    const progressHtml = item.status === 'downloading'
      ? '<div class="progress-wrap"><div class="progress-bar indeterminate"></div></div>'
      : '';

    const dlBtnHtml = (item.status === 'pending' || item.status === 'error')
      ? '<button class="btn btn-primary btn-sm" onclick="downloadItem(' + item.id + ')">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
        + 'Download</button>'
      : '';

    el.innerHTML =
      '<div class="file-icon">' + fileIconHtml + '</div>'
      + '<div class="file-info">'
      + '<div class="file-name-container">'
      + '<span class="file-name" id="name-' + item.id + '">' + escHtml(item.name) + '</span>'
      + '<button class="btn-icon-sm" onclick="renameItem(' + item.id + ')" title="Rename">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
      + '</button>'
      + '</div>'
      + '<div class="file-url">' + escHtml(shortUrl(item.url)) + '</div>'
      + progressHtml
      + '</div>'
      + '<div class="file-actions">'
      + badgeHtml
      + '<button class="btn btn-ghost btn-sm" onclick="copyLink(' + item.id + ')" title="Copy link">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>'
      + '</button>'
      + dlBtnHtml
      + '<button class="btn btn-ghost btn-sm" onclick="removeItem(' + item.id + ')" title="Remove">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
      + '</button>'
      + '</div>';

    list.appendChild(el);
  });
}

// ── DOWNLOAD ──
function downloadItem(id) {
  const item = queue.find(i => i.id === id);
  if (!item) return;
  item.status = 'downloading';
  renderQueue();
  
  const url = buildDownloadUrl(item.fileId);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank'; // Prevent navigating away from the app
  a.rel = 'noopener noreferrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  
  setTimeout(() => {
    try {
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        item.status = 'done';
        addToHistory(item);
        renderQueue();
        toast('Download started: ' + item.name, 'success');
      }, 500);
    } catch(e) {
      item.status = 'error';
      renderQueue();
      toast('Failed to start download.', 'error');
    }
  }, 300);
}

async function downloadSequentially(items) {
  if (!items.length) { toast('No files to download.', 'error'); return; }
  toast('Starting sequential download for ' + items.length + ' files...', 'success');
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    downloadItem(item.id);
    if (i < items.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
}

function clearQueue() { queue = []; renderQueue(); }

function removeItem(id) { queue = queue.filter(i => i.id !== id); renderQueue(); }

function renameItem(id) {
  const item = queue.find(i => i.id === id);
  if (!item) return;
  const newName = prompt('Enter new filename:', item.name);
  if (newName && newName.trim()) {
    item.name = newName.trim();
    renderQueue();
  }
}

function copyLink(id) {
  const item = queue.find(i => i.id === id);
  if (!item) return;
  navigator.clipboard.writeText(item.url)
    .then(() => toast('Link copied.', 'success'))
    .catch(() => toast('Failed to copy link.', 'error'));
}

// ── HISTORY ──
function addToHistory(item) {
  history.unshift({ name: item.name, url: item.url, fileId: item.fileId, ts: Date.now() });
  if (history.length > 50) history = history.slice(0, 50);
  try { localStorage.setItem('driveget_history', JSON.stringify(history)); } catch(e) {}
}

function renderHistory() {
  const list = document.getElementById('history-list');
  const empty = document.getElementById('history-empty');
  if (!list || !empty) return;
  
  list.querySelectorAll('.history-item').forEach(el => el.remove());
  if (!history.length) { empty.style.display = ''; return; }
  empty.style.display = 'none';
  history.forEach((h, idx) => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.innerHTML =
      '<div class="file-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#22d47a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg></div>'
      + '<div class="history-info">'
      + '<div class="history-name">' + escHtml(h.name) + '</div>'
      + '<div class="history-meta">' + escHtml(shortUrl(h.url)) + ' &nbsp;·&nbsp; ' + formatDate(h.ts) + '</div>'
      + '</div>'
      + '<div class="flex-row">'
      + '<button class="btn btn-ghost btn-sm" onclick="copyHistoryLink(' + idx + ')" title="Copy link">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>'
      + '</button>'
      + '<button class="btn btn-primary btn-sm" onclick="redownload(' + idx + ')">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
      + 'Redownload</button>'
      + '</div>';
    list.appendChild(el);
  });
}

function clearHistory() {
  history = [];
  try { localStorage.removeItem('driveget_history'); } catch(e) {}
  renderHistory();
  toast('History cleared.', 'success');
}

function copyHistoryLink(idx) {
  const h = history[idx];
  if (!h) return;
  navigator.clipboard.writeText(h.url)
    .then(() => toast('Link copied.', 'success'))
    .catch(() => toast('Failed to copy.', 'error'));
}

function redownload(idx) {
  const h = history[idx];
  if (!h) return;
  const a = document.createElement('a');
  a.href = buildDownloadUrl(h.fileId);
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  toast('Download restarted.', 'success');
}

// ── TOAST ──
function toast(msg, type) {
  type = type || 'success';
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const iconSuccess = '<svg style="width:16px;height:16px;flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="#22d47a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  const iconError   = '<svg style="width:16px;height:16px;flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="#f25757" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  el.innerHTML = (type === 'error' ? iconError : iconSuccess) + '<span>' + escHtml(msg) + '</span>';
  container.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  renderQueue();
});
