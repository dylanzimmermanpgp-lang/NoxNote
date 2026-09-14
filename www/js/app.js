/**
 * app.js - Pantalla de lista de notas
 */
let allNotes = [];
let activeCategory = '__all__';
let sheetNoteId = null;

const notesGrid = document.getElementById('notesGrid');
const emptyState = document.getElementById('emptyState');
const chipsRow = document.getElementById('chipsRow');
const searchInput = document.getElementById('searchInput');

function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function snippetFor(note) {
  if (note.mode === 'text') {
    return (note.text || '').slice(0, 140);
  }
  const texts = (note.elements || [])
    .filter(e => e.type === 'text')
    .map(e => stripHtml(e.content))
    .join(' ');
  return texts.slice(0, 140) || (note.elements && note.elements.some(e => e.type === 'image') ? '(Contiene imagenes)' : '');
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return tmp.textContent || '';
}

async function loadNotes() {
  allNotes = await DB.allNotes();
  renderCategoryChips();
  renderList();
}

async function renderCategoryChips() {
  const cats = await DB.allCategories();
  chipsRow.innerHTML = '';

  const allChip = document.createElement('div');
  allChip.className = 'chip' + (activeCategory === '__all__' ? ' active' : '');
  allChip.dataset.cat = '__all__';
  allChip.textContent = 'Todas';
  chipsRow.appendChild(allChip);

  cats.forEach(c => {
    const chip = document.createElement('div');
    chip.className = 'chip' + (activeCategory === c.name ? ' active' : '');
    chip.dataset.cat = c.name;
    chip.textContent = c.name;
    chipsRow.appendChild(chip);
  });

  const addChip = document.createElement('div');
  addChip.className = 'chip';
  addChip.dataset.cat = '__add__';
  addChip.textContent = '+ Anadir';
  chipsRow.appendChild(addChip);

  chipsRow.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', async () => {
      const cat = chip.dataset.cat;
      if (cat === '__add__') {
        const name = prompt('Nombre de la nueva categoria:');
        if (name && name.trim()) {
          await DB.addCategory(name.trim());
          renderCategoryChips();
        }
        return;
      }
      activeCategory = cat;
      renderCategoryChips();
      renderList();
    });
  });
}

function renderList() {
  const query = searchInput.value.trim().toLowerCase();
  let list = allNotes.filter(n => !n.archived);

  if (activeCategory !== '__all__') {
    list = list.filter(n => n.category === activeCategory);
  }
  if (query) {
    list = list.filter(n => {
      return (n.title || '').toLowerCase().includes(query) ||
             snippetFor(n).toLowerCase().includes(query);
    });
  }

  list.sort((a, b) => (b.pinned - a.pinned) || (b.modifiedAt - a.modifiedAt));

  notesGrid.innerHTML = '';
  emptyState.classList.toggle('hidden', list.length > 0);

  list.forEach(note => {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.innerHTML = `
      ${note.pinned ? `<svg class="pin" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.5 5.5L19 9l-4 4 1 6-4-3-4 3 1-6-4-4 5.5-1.5z"/></svg>` : ''}
      <div class="title">${escapeHtml(note.title) || 'Sin titulo'}</div>
      <div class="snippet">${escapeHtml(snippetFor(note))}</div>
      <div class="meta">
        <span class="date">${fmtDate(note.modifiedAt)}</span>
        <span class="badge-mode">${note.mode === 'freeform' ? 'LIBRE' : 'TEXTO'}</span>
      </div>
    `;
    card.addEventListener('click', () => {
      if (note.locked) {
        if (!confirm('Esta nota esta bloqueada. Abrir de todas formas?')) return;
      }
      location.href = 'editor.html?id=' + note.id;
    });
    let pressTimer;
    card.addEventListener('touchstart', () => { pressTimer = setTimeout(() => openSheet(note.id), 480); });
    card.addEventListener('touchend', () => clearTimeout(pressTimer));
    card.addEventListener('touchmove', () => clearTimeout(pressTimer));
    card.addEventListener('contextmenu', (e) => { e.preventDefault(); openSheet(note.id); });
    notesGrid.appendChild(card);
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

/* ---------- Bottom sheet de acciones ---------- */
const sheetBackdrop = document.getElementById('sheetBackdrop');
const actionSheet = document.getElementById('actionSheet');

async function openSheet(id) {
  sheetNoteId = id;
  const note = await DB.getNote(id);
  if (!note) return;

  document.getElementById('sheetTitle').textContent = note.title || 'Sin titulo';
  document.getElementById('sheetCategory').textContent = note.category || 'Sin categoria';
  document.getElementById('sheetCreated').textContent = new Date(note.createdAt).toLocaleString('es-ES');
  document.getElementById('sheetModified').textContent = new Date(note.modifiedAt).toLocaleString('es-ES');

  const fullText = note.mode === 'text' ? (note.text || '') :
    (note.elements || []).filter(e => e.type === 'text').map(e => stripHtml(e.content)).join(' ');
  document.getElementById('sheetWords').textContent = (fullText.trim() ? fullText.trim().split(/\s+/).length : 0);
  document.getElementById('sheetChars').textContent = fullText.length;

  document.getElementById('pinBtn').classList.toggle('active-teal', !!note.pinned);
  document.getElementById('pinBtn').lastChild.textContent = note.pinned ? ' Desfijar' : ' Fijar';
  document.getElementById('lockBtn').classList.toggle('active-teal', !!note.locked);
  document.getElementById('lockBtn').lastChild.textContent = note.locked ? ' Desbloquear' : ' Bloquear';

  sheetBackdrop.classList.add('open');
  actionSheet.classList.add('open');
}

function closeSheet() {
  sheetBackdrop.classList.remove('open');
  actionSheet.classList.remove('open');
  sheetNoteId = null;
}

sheetBackdrop.addEventListener('click', closeSheet);

actionSheet.addEventListener('click', async (e) => {
  const btn = e.target.closest('.sheet-btn');
  if (!btn || !sheetNoteId) return;
  const action = btn.dataset.action;
  const note = await DB.getNote(sheetNoteId);
  if (!note) return;

  switch (action) {
    case 'delete':
      if (confirm('Eliminar esta nota de forma permanente?')) {
        await DB.deleteNote(note.id);
        closeSheet();
        loadNotes();
      }
      break;
    case 'archive':
      note.archived = !note.archived;
      await DB.saveNote(note);
      closeSheet();
      loadNotes();
      break;
    case 'share':
      { const text = note.mode === 'text' ? note.text : snippetFor(note);
        if (navigator.share) {
          navigator.share({ title: note.title || 'Nota', text }).catch(() => {});
        } else {
          alert('Compartir no esta disponible en este dispositivo.');
        }
      }
      break;
    case 'duplicate':
      await DB.duplicateNote(note.id);
      closeSheet();
      loadNotes();
      break;
    case 'export':
      exportNoteAsFile(note);
      break;
    case 'copy':
      { const text = note.mode === 'text' ? note.text :
          (note.elements || []).filter(el => el.type === 'text').map(el => stripHtml(el.content)).join('\n');
        if (navigator.clipboard) navigator.clipboard.writeText(text);
        alert('Texto copiado.');
      }
      break;
    case 'pin':
      note.pinned = !note.pinned;
      await DB.saveNote(note);
      closeSheet();
      loadNotes();
      break;
    case 'lock':
      note.locked = !note.locked;
      await DB.saveNote(note);
      closeSheet();
      loadNotes();
      break;
  }
});

function exportNoteAsFile(note) {
  const text = note.mode === 'text' ? note.text :
    (note.elements || []).filter(el => el.type === 'text').map(el => stripHtml(el.content)).join('\n\n');
  const blob = new Blob([`${note.title || 'Sin titulo'}\n\n${text}`], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (note.title || 'nota').replace(/[^a-z0-9_\- ]/gi, '_') + '.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------- FAB: nueva nota ---------- */
document.getElementById('fab').addEventListener('click', () => {
  const useFree = confirm('Aceptar = Nota libre (arrastra texto/imagenes)\nCancelar = Nota de texto tradicional');
  createNote(useFree ? 'freeform' : 'text');
});

async function createNote(mode) {
  const note = await DB.newNote(mode);
  location.href = 'editor.html?id=' + note.id;
}

searchInput.addEventListener('input', renderList);

document.getElementById('settingsBtn').addEventListener('click', () => {
  alert('Cuaderno v1.0\n100% local y sin conexion.\nTodos tus datos se guardan unicamente en este dispositivo.');
});

loadNotes();
