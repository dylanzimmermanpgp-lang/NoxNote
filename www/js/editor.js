/**
 * editor.js
 * Motor del "cuaderno libre": permite colocar texto e imagenes en cualquier
 * parte del lienzo, moverlos y redimensionarlos con el dedo/mouse.
 * Tambien soporta el modo de texto tradicional (textarea simple).
 */
const params = new URLSearchParams(location.search);
const noteId = params.get('id');

let note = null;
let selectedEl = null;
let saveTimer = null;

const titleInput = document.getElementById('titleInput');
const canvas = document.getElementById('canvas');
const canvasWrap = document.getElementById('canvasWrap');
const textModeWrap = document.getElementById('textModeWrap');
const textArea = document.getElementById('textArea');
const freeToolbar = document.getElementById('freeToolbar');
const modeTextBtn = document.getElementById('modeTextBtn');
const modeFreeBtn = document.getElementById('modeFreeBtn');

async function init() {
  note = await DB.getNote(noteId);
  if (!note) { location.href = 'index.html'; return; }

  titleInput.value = note.title || '';
  textArea.value = note.text || '';
  canvas.style.minHeight = (note.canvasHeight || 900) + 'px';

  applyMode();
  (note.elements || []).forEach(renderElement);
}

function applyMode() {
  const free = note.mode === 'freeform';
  canvasWrap.classList.toggle('hidden', !free);
  textModeWrap.classList.toggle('hidden', free);
  freeToolbar.classList.toggle('hidden', !free);
  modeFreeBtn.classList.toggle('active', free);
  modeTextBtn.classList.toggle('active', !free);
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => DB.saveNote(note), 400);
}

titleInput.addEventListener('input', () => { note.title = titleInput.value; scheduleSave(); });
textArea.addEventListener('input', () => { note.text = textArea.value; scheduleSave(); });

modeTextBtn.addEventListener('click', () => {
  if (note.mode === 'text') return;
  if (!confirm('Cambiar a modo texto tradicional? El contenido libre se conserva pero no se vera en este modo.')) return;
  note.mode = 'text';
  applyMode();
  scheduleSave();
});
modeFreeBtn.addEventListener('click', () => {
  if (note.mode === 'freeform') return;
  note.mode = 'freeform';
  applyMode();
  scheduleSave();
});

document.getElementById('backBtn').addEventListener('click', () => { history.back(); });

/* ---------- Crear elementos ---------- */
function uidEl() { return 'e_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

document.getElementById('addTextBtn').addEventListener('click', () => {
  const el = {
    id: uidEl(),
    type: 'text',
    x: 40, y: 40, w: 200, h: 90,
    content: '',
    fontSize: 16,
    z: nextZ()
  };
  note.elements.push(el);
  const node = renderElement(el);
  selectElement(node, el);
  const editable = node.querySelector('.el-text');
  editable.focus();
  scheduleSave();
});

document.getElementById('addImageBtn').addEventListener('click', () => {
  document.getElementById('imageInput').click();
});

document.getElementById('imageInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const el = {
      id: uidEl(),
      type: 'image',
      x: 30, y: 30, w: 180, h: 180,
      src: reader.result,
      z: nextZ()
    };
    note.elements.push(el);
    const node = renderElement(el);
    selectElement(node, el);
    scheduleSave();
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});

document.getElementById('addPageBtn').addEventListener('click', () => {
  note.canvasHeight = (note.canvasHeight || 900) + 500;
  canvas.style.minHeight = note.canvasHeight + 'px';
  scheduleSave();
});

function nextZ() {
  const zs = (note.elements || []).map(e => e.z || 0);
  return (zs.length ? Math.max(...zs) : 0) + 1;
}

/* ---------- Renderizar y hacer interactivo cada elemento ---------- */
function renderElement(el) {
  const node = document.createElement('div');
  node.className = 'el';
  node.style.left = el.x + 'px';
  node.style.top = el.y + 'px';
  node.style.width = el.w + 'px';
  node.style.height = el.h + 'px';
  node.style.zIndex = el.z || 1;
  node.dataset.id = el.id;

  if (el.type === 'text') {
    const div = document.createElement('div');
    div.className = 'el-text';
    div.contentEditable = 'true';
    div.style.fontSize = (el.fontSize || 16) + 'px';
    div.innerHTML = el.content || '';
    div.addEventListener('input', () => { el.content = div.innerHTML; scheduleSave(); });
    div.addEventListener('pointerdown', (e) => { selectElement(node, el); e.stopPropagation(); });
    node.appendChild(div);
  } else if (el.type === 'image') {
    const wrap = document.createElement('div');
    wrap.className = 'el-image';
    wrap.style.width = '100%';
    wrap.style.height = '100%';
    const img = document.createElement('img');
    img.src = el.src;
    wrap.appendChild(img);
    node.appendChild(wrap);
  }

  const delBtn = document.createElement('div');
  delBtn.className = 'el-delete';
  delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  delBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    note.elements = note.elements.filter(x => x.id !== el.id);
    node.remove();
    selectedEl = null;
    scheduleSave();
  });
  node.appendChild(delBtn);

  const handle = document.createElement('div');
  handle.className = 'el-handle';
  handle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
  node.appendChild(handle);

  makeDraggable(node, el);
  makeResizable(handle, node, el);

  node.addEventListener('pointerdown', () => selectElement(node, el));

  canvas.appendChild(node);
  return node;
}

function selectElement(node, el) {
  document.querySelectorAll('.el.selected').forEach(n => n.classList.remove('selected'));
  node.classList.add('selected');
  node.style.zIndex = nextZ();
  el.z = parseInt(node.style.zIndex, 10);
  selectedEl = el;
}

canvas.addEventListener('pointerdown', (e) => {
  if (e.target === canvas) {
    document.querySelectorAll('.el.selected').forEach(n => n.classList.remove('selected'));
    selectedEl = null;
  }
});

function makeDraggable(node, el) {
  let startX, startY, origX, origY, dragging = false;

  node.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.el-handle') || e.target.closest('.el-delete')) return;
    if (e.target.classList.contains('el-text') && document.activeElement === e.target) return;
    dragging = true;
    node.setPointerCapture(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
    origX = el.x;
    origY = el.y;
  });

  node.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    el.x = Math.max(0, origX + dx);
    el.y = Math.max(0, origY + dy);
    node.style.left = el.x + 'px';
    node.style.top = el.y + 'px';
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    scheduleSave();
  }
  node.addEventListener('pointerup', endDrag);
  node.addEventListener('pointercancel', endDrag);
}

function makeResizable(handle, node, el) {
  let startX, startY, origW, origH, resizing = false;

  handle.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    resizing = true;
    handle.setPointerCapture(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
    origW = el.w;
    origH = el.h;
  });

  handle.addEventListener('pointermove', (e) => {
    if (!resizing) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    el.w = Math.max(40, origW + dx);
    el.h = Math.max(30, origH + dy);
    node.style.width = el.w + 'px';
    node.style.height = el.h + 'px';
  });

  function endResize() {
    if (!resizing) return;
    resizing = false;
    scheduleSave();
  }
  handle.addEventListener('pointerup', endResize);
  handle.addEventListener('pointercancel', endResize);
}

/* ---------- Sheet de opciones ---------- */
const sheetBackdrop = document.getElementById('sheetBackdrop');
const actionSheet = document.getElementById('actionSheet');

document.getElementById('moreBtn').addEventListener('click', () => {
  document.getElementById('sheetCategory').textContent = note.category || 'Sin categoria';
  document.getElementById('pinBtn').classList.toggle('active-teal', !!note.pinned);
  document.getElementById('lockBtn').classList.toggle('active-teal', !!note.locked);
  sheetBackdrop.classList.add('open');
  actionSheet.classList.add('open');
});
sheetBackdrop.addEventListener('click', () => {
  sheetBackdrop.classList.remove('open');
  actionSheet.classList.remove('open');
});

document.getElementById('categoryRow').addEventListener('click', async () => {
  const cats = await DB.allCategories();
  const names = cats.map(c => c.name).join(', ') || '(ninguna aun)';
  const val = prompt('Categorias existentes: ' + names + '\nEscribe el nombre de la categoria para esta nota:', note.category || '');
  if (val !== null && val.trim()) {
    note.category = val.trim();
    if (!cats.some(c => c.name === note.category)) await DB.addCategory(note.category);
    document.getElementById('sheetCategory').textContent = note.category;
    scheduleSave();
  }
});

actionSheet.addEventListener('click', async (e) => {
  const btn = e.target.closest('.sheet-btn');
  if (!btn) return;
  const action = btn.dataset.action;
  switch (action) {
    case 'delete':
      if (confirm('Eliminar esta nota de forma permanente?')) {
        await DB.deleteNote(note.id);
        location.href = 'index.html';
      }
      break;
    case 'archive':
      note.archived = !note.archived;
      await DB.saveNote(note);
      location.href = 'index.html';
      break;
    case 'duplicate':
      { const copy = await DB.duplicateNote(note.id);
        location.href = 'editor.html?id=' + copy.id; }
      break;
    case 'export':
      { const text = note.mode === 'text' ? note.text :
          (note.elements || []).filter(el => el.type === 'text').map(el => {
            const tmp = document.createElement('div'); tmp.innerHTML = el.content || ''; return tmp.textContent;
          }).join('\n\n');
        const blob = new Blob([`${note.title || 'Sin titulo'}\n\n${text}`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (note.title || 'nota').replace(/[^a-z0-9_\- ]/gi, '_') + '.txt';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      }
      break;
    case 'pin':
      note.pinned = !note.pinned;
      await DB.saveNote(note);
      btn.classList.toggle('active-teal', note.pinned);
      break;
    case 'lock':
      note.locked = !note.locked;
      await DB.saveNote(note);
      btn.classList.toggle('active-teal', note.locked);
      break;
  }
});

window.addEventListener('beforeunload', () => { if (note) DB.saveNote(note); });

init();
