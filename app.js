// State Management
let state = {
  currentUser: null,
  users: [],
  deeds: [],
  notes: [],
  theme: 'light',
  currentFilter: 'all' // all, pending, completed
};

// Initial Default Data (loaded if LocalStorage is empty)
const DEFAULT_USERS = [
  { id: '1', name: 'Mariano Sanchez', role: 'colaborador', password: '1111' },
  { id: '2', name: 'Paola Madrigal', role: 'colaborador', password: '2222' },
  { id: '3', name: 'Daniel Villagran', role: 'colaborador', password: '3333' },
  { id: 'boss', name: 'Jefe (Notario)', role: 'boss', password: '1234' }
];

const DEFAULT_DEEDS = [
  { id: 'd1', number: '14,302', title: 'Donación de Terreno Rústico', client: 'Juan Pérez García', status: 'pendiente', desc: 'Pendiente de traer certificado de no adeudo predial y firma del donatario.' },
  { id: 'd2', number: '14,303', title: 'Constitución de Sociedad Anónima', client: 'InnovaTech S.A. de C.V.', status: 'revision', desc: 'Revisar estatutos sociales solicitados por el cliente. Especial atención en cláusulas de extranjeros.' },
  { id: 'd3', number: '14,301', title: 'Compraventa de Casa Habitación', client: 'María Gómez y Pedro Estrada', status: 'firmado', desc: 'Trámite concluido con firmas recolectadas y pago de impuestos realizado.' }
];

const DEFAULT_NOTES = [
  {
    id: 'n1',
    title: 'Documentos Compraventa 14,301',
    assignedTo: '1', // Mariano Sanchez
    deedId: 'd3',
    color: '2',
    date: '12.11.26',
    checklist: [
      { text: 'Certificado de libertad de gravamen', done: true },
      { text: 'Identificaciones oficiales vigentes', done: true },
      { text: 'Comprobante de pago del Impuesto Predial', done: true }
    ]
  },
  {
    id: 'n2',
    title: 'Revisión Estatutos InnovaTech',
    assignedTo: '2', // Paola Madrigal
    deedId: 'd2',
    color: '3',
    date: '15.11.26',
    checklist: [
      { text: 'Redacción de Objeto Social', done: true },
      { text: 'Validar RFC de socios fundadores', done: false },
      { text: 'Agendar cita de firmas', done: false }
    ]
  },
  {
    id: 'n3',
    title: 'Poder Notarial Urgente',
    assignedTo: '3', // Daniel Villagran
    deedId: 'd1',
    color: '4',
    date: '22.11.26',
    checklist: [
      { text: 'Redactar facultades generales y especiales', done: false },
      { text: 'Confirmar pago de honorarios', done: false }
    ]
  }
];

// LocalStorage helpers
function loadFromStorage() {
  const users = localStorage.getItem('scriptura_users');
  const deeds = localStorage.getItem('scriptura_deeds');
  const notes = localStorage.getItem('scriptura_notes');
  const theme = localStorage.getItem('scriptura_theme');

  state.users = users ? JSON.parse(users) : DEFAULT_USERS;
  state.deeds = deeds ? JSON.parse(deeds) : DEFAULT_DEEDS;
  state.notes = notes ? JSON.parse(notes) : DEFAULT_NOTES;
  state.theme = theme || 'light';
}

function saveToStorage() {
  localStorage.setItem('scriptura_users', JSON.stringify(state.users));
  localStorage.setItem('scriptura_deeds', JSON.stringify(state.deeds));
  localStorage.setItem('scriptura_notes', JSON.stringify(state.notes));
  localStorage.setItem('scriptura_theme', state.theme);
}

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app-container');
const loginUsersList = document.getElementById('login-users-list');
const deedsContainer = document.getElementById('deeds-container');
const notesContainer = document.getElementById('notes-container');
const usersTableBody = document.getElementById('users-table-body');
const searchInput = document.getElementById('search-input');
const themeToggle = document.getElementById('theme-toggle');
const globalFab = document.getElementById('global-fab');
const activeUserAvatar = document.getElementById('active-user-avatar');
const logoutBtn = document.getElementById('logout-btn');

// Modals
const deedModal = document.getElementById('deed-modal');
const deedForm = document.getElementById('deed-form');
const noteModal = document.getElementById('note-modal');
const noteForm = document.getElementById('note-form');
const passwordModal = document.getElementById('password-modal');
const userModal = document.getElementById('user-modal');
const userForm = document.getElementById('user-form');

// Auth Flow
function renderLoginUsers() {
  loginUsersList.innerHTML = '';
  state.users.forEach(user => {
    const btn = document.createElement('button');
    btn.className = 'login-option';
    btn.innerHTML = `
      <span>${user.name}</span>
      <span style="font-size: 11px; opacity: 0.6; font-weight: normal;">${user.role.toUpperCase()}</span>
    `;
    btn.addEventListener('click', () => handleLoginSelect(user));
    loginUsersList.appendChild(btn);
  });
}

let selectedUserForLogin = null;

function handleLoginSelect(user) {
  selectedUserForLogin = user;
  if (user.role === 'boss') {
    // Prompt password modal
    document.getElementById('boss-password-input').value = '';
    document.getElementById('password-error').style.display = 'none';
    passwordModal.classList.add('active');
  } else {
    // Log in collaborator instantly (no credentials required per client spec)
    performLogin(user);
  }
}

function performLogin(user) {
  state.currentUser = user;
  loginScreen.style.display = 'none';
  appContainer.style.display = 'flex';
  
  // Set profile info
  activeUserAvatar.textContent = user.name.charAt(0).toUpperCase();
  
  // Admin screen visual buttons
  const navAdmin = document.getElementById('nav-admin-btn');
  const bottomAdmin = document.getElementById('bottom-admin-btn');
  const barAdmin = document.getElementById('bar-switch-admin');
  
  if (user.role === 'boss') {
    if (navAdmin) navAdmin.style.display = 'flex';
    if (bottomAdmin) bottomAdmin.style.display = 'flex';
    if (barAdmin) barAdmin.style.display = 'flex';
  } else {
    if (navAdmin) navAdmin.style.display = 'none';
    if (bottomAdmin) bottomAdmin.style.display = 'none';
    if (barAdmin) barAdmin.style.display = 'none';
  }

  switchScreen('deeds-screen');
  updateMetrics();
  renderDeeds();
  renderNotes();
  renderUsersTable();
  populateDropdowns();
}

// Password submission
document.getElementById('password-submit-btn').addEventListener('click', () => {
  const pwdInput = document.getElementById('boss-password-input').value;
  if (pwdInput === selectedUserForLogin.password) {
    passwordModal.classList.remove('active');
    performLogin(selectedUserForLogin);
  } else {
    document.getElementById('password-error').style.display = 'block';
  }
});

document.getElementById('password-cancel-btn').addEventListener('click', () => {
  passwordModal.classList.remove('active');
});

// Logout Helper
function handleLogout() {
  state.currentUser = null;
  appContainer.style.display = 'none';
  loginScreen.style.display = 'flex';
  renderLoginUsers();
}

logoutBtn.addEventListener('click', handleLogout);
document.getElementById('bar-logout').addEventListener('click', handleLogout);

// Screen Switching Navigation
const navItems = document.querySelectorAll('.nav-item, .bottom-nav-item');
function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) targetScreen.classList.add('active');
  
  // Update header text based on screen
  const headerTitle = document.getElementById('dashboard-title-text');
  if (screenId === 'deeds-screen') {
    headerTitle.textContent = 'Operación Diaria';
  } else if (screenId === 'keep-screen') {
    headerTitle.textContent = 'Tareas y Pendientes';
  } else if (screenId === 'admin-screen') {
    headerTitle.textContent = 'Gestión de Personal';
  }

  // Sync active states on sidebar & bottombar
  navItems.forEach(item => {
    if (item.getAttribute('data-target') === screenId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Sync active states on floating bar buttons
  document.querySelectorAll('.floating-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  if (screenId === 'deeds-screen') {
    document.getElementById('bar-switch-deeds').classList.add('active');
    globalFab.style.display = 'flex';
  } else if (screenId === 'keep-screen') {
    document.getElementById('bar-switch-tasks').classList.add('active');
    globalFab.style.display = 'flex';
  } else if (screenId === 'admin-screen') {
    const barAdmin = document.getElementById('bar-switch-admin');
    if (barAdmin) barAdmin.classList.add('active');
    globalFab.style.display = 'none';
  }
}

navItems.forEach(item => {
  item.addEventListener('click', () => {
    switchScreen(item.getAttribute('data-target'));
  });
});

// Bind floating action bar items specifically
document.getElementById('bar-switch-deeds').addEventListener('click', () => switchScreen('deeds-screen'));
document.getElementById('bar-switch-tasks').addEventListener('click', () => switchScreen('keep-screen'));
document.getElementById('bar-switch-admin').addEventListener('click', () => switchScreen('admin-screen'));

// Theme Toggle
themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  saveToStorage();
});

function applyTheme() {
  if (state.theme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
}

// Calculate and Update Dashboard Metrics in real-time
function updateMetrics() {
  document.getElementById('stat-deeds-count').textContent = state.deeds.length;
  
  const pendingTasks = state.notes.flatMap(n => n.checklist).filter(item => !item.done).length;
  document.getElementById('stat-tasks-count').textContent = pendingTasks;
  
  document.getElementById('stat-colabs-count').textContent = state.users.filter(u => u.role !== 'boss').length;

  const totalNotes = state.notes.length;
  const completedNotes = state.notes.filter(n => n.checklist.every(item => item.done)).length;
  const inProgressNotes = totalNotes - completedNotes;

  document.getElementById('badge-all').textContent = totalNotes;
  document.getElementById('badge-pending').textContent = inProgressNotes;
  document.getElementById('badge-completed').textContent = completedNotes;
}

// Filter button logic
document.getElementById('filter-all').addEventListener('click', (e) => {
  setActiveFilter(e.target.closest('.pill-btn'), 'all');
});
document.getElementById('filter-pending').addEventListener('click', (e) => {
  setActiveFilter(e.target.closest('.pill-btn'), 'pending');
});
document.getElementById('filter-completed').addEventListener('click', (e) => {
  setActiveFilter(e.target.closest('.pill-btn'), 'completed');
});

function setActiveFilter(element, filterType) {
  document.querySelectorAll('.filter-bar .pill-btn').forEach(btn => btn.classList.remove('active'));
  element.classList.add('active');
  state.currentFilter = filterType;
  renderNotes(searchInput.value);
}

// Render Deeds Registry
function renderDeeds(filterText = '') {
  deedsContainer.innerHTML = '';
  const filtered = state.deeds.filter(d => 
    d.number.toLowerCase().includes(filterText.toLowerCase()) ||
    d.title.toLowerCase().includes(filterText.toLowerCase()) ||
    d.client.toLowerCase().includes(filterText.toLowerCase())
  );

  if (filtered.length === 0) {
    deedsContainer.innerHTML = `<div style="text-align:center; padding:48px; opacity:0.5;">No se encontraron escrituras registradas.</div>`;
    return;
  }

  filtered.forEach(deed => {
    const card = document.createElement('div');
    card.className = 'deed-row';
    card.innerHTML = `
      <div class="deed-main">
        <span class="deed-number">ESCRITURA #${deed.number}</span>
        <span class="deed-title">${deed.title}</span>
        <span class="deed-client">Cliente: <strong>${deed.client}</strong></span>
      </div>
      <div class="deed-meta">
        <span class="deed-status status-${deed.status}">${deed.status === 'pendiente' ? 'Pendiente firma' : deed.status === 'revision' ? 'En revisión' : 'Firmado'}</span>
      </div>
    `;
    card.addEventListener('click', () => openDeedModal(deed));
    deedsContainer.appendChild(card);
  });
}

// Render Notes and Tasks Board (Google Keep Board / Kanban Grid Style)
function renderNotes(filterText = '') {
  notesContainer.innerHTML = '';
  
  const isBoss = state.currentUser && state.currentUser.role === 'boss';
  
  const filtered = state.notes.filter(note => {
    // Search query filter
    const matchesQuery = 
      note.title.toLowerCase().includes(filterText.toLowerCase()) ||
      note.checklist.some(item => item.text.toLowerCase().includes(filterText.toLowerCase()));
      
    if (!matchesQuery) return false;

    // Collaborator view filter
    if (!isBoss && note.assignedTo !== state.currentUser.id) return false;

    // Sub-pill filter
    const isCompleted = note.checklist.length > 0 && note.checklist.every(item => item.done);
    if (state.currentFilter === 'pending' && isCompleted) return false;
    if (state.currentFilter === 'completed' && !isCompleted) return false;

    return true;
  });

  if (filtered.length === 0) {
    notesContainer.innerHTML = `<div style="text-align:center; padding:48px; opacity:0.5; grid-column: 1/-1;">No hay notas o tareas en esta categoría.</div>`;
    return;
  }

  filtered.forEach(note => {
    const card = document.createElement('div');
    card.className = `keep-card card-color-${note.color || '1'}`;
    
    const assignedUser = state.users.find(u => u.id === note.assignedTo);
    const linkedDeed = state.deeds.find(d => d.id === note.deedId);
    
    // Checklist html
    let checklistHtml = '';
    let doneCount = 0;
    note.checklist.forEach((item, index) => {
      if (item.done) doneCount++;
      checklistHtml += `
        <li class="checklist-item ${item.done ? 'done' : ''}" onclick="toggleChecklistItem(event, '${note.id}', ${index})">
          <input type="checkbox" ${item.done ? 'checked' : ''} style="pointer-events:none;">
          <span>${item.text}</span>
        </li>
      `;
    });

    const progressPercent = note.checklist.length > 0 ? (doneCount / note.checklist.length) * 100 : 0;

    card.innerHTML = `
      <div class="keep-card-header">
        <span class="keep-card-category">${linkedDeed ? `Esc. #${linkedDeed.number}` : 'NOTARÍA'}</span>
        <div class="card-action-dot">···</div>
      </div>
      <div class="keep-card-title">${note.title}</div>
      
      <div style="width:100%; height:4px; background-color:rgba(0,0,0,0.06); border-radius:var(--shape-full); overflow:hidden; margin-top:-4px;">
        <div style="width:${progressPercent}%; height:100%; background-color:#121212; transition: width 0.3s ease;"></div>
      </div>

      <ul class="card-checklist">
        ${checklistHtml}
      </ul>

      <div class="card-footer">
        <div class="card-footer-info">
          <span class="card-footer-name">${assignedUser ? assignedUser.name : 'Sin Asignar'}</span>
          <span class="card-footer-date">${note.date || 'Hoy'}</span>
        </div>
        <div class="assigned-avatar" title="${assignedUser ? assignedUser.name : 'Sin asignar'}">
          ${assignedUser ? assignedUser.name.split(' ').map(n=>n[0]).join('') : '?'}
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (!e.target.closest('.checklist-item')) {
        openNoteModal(note);
      }
    });

    notesContainer.appendChild(card);
  });
}

function toggleChecklistItem(e, noteId, index) {
  e.stopPropagation();
  const note = state.notes.find(n => n.id === noteId);
  if (note) {
    note.checklist[index].done = !note.checklist[index].done;
    saveToStorage();
    updateMetrics();
    renderNotes(searchInput.value);
  }
}

// Render Users/Collaborators Table
function renderUsersTable() {
  usersTableBody.innerHTML = '';
  state.users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.name}</strong></td>
      <td>${u.role === 'boss' ? 'Jefe / Notario' : 'Colaborador'}</td>
      <td><code>${u.password}</code></td>
      <td>
        <button class="btn btn-text" onclick="openUserModal('${u.id}')" style="padding: 6px 12px; font-size: 13px;">Editar</button>
      </td>
    `;
    usersTableBody.appendChild(tr);
  });
}

// Modal Form handling
let currentChecklistItems = [];

function openDeedModal(deed = null) {
  deedForm.reset();
  if (deed) {
    document.getElementById('deed-modal-title').textContent = 'Editar Escritura';
    document.getElementById('deed-id').value = deed.id;
    document.getElementById('deed-number-input').value = deed.number;
    document.getElementById('deed-title-input').value = deed.title;
    document.getElementById('deed-client-input').value = deed.client;
    document.getElementById('deed-status-input').value = deed.status;
    document.getElementById('deed-desc-input').value = deed.desc || '';
  } else {
    document.getElementById('deed-modal-title').textContent = 'Nueva Escritura';
    document.getElementById('deed-id').value = '';
  }
  deedModal.classList.add('active');
}

function openNoteModal(note = null) {
  noteForm.reset();
  currentChecklistItems = [];
  
  document.querySelectorAll('#modal-color-selector .color-dot').forEach(dot => dot.classList.remove('selected'));
  document.querySelector('#modal-color-selector .color-dot[data-color="1"]').classList.add('selected');
  document.getElementById('delete-note-btn').style.display = 'none';

  if (note) {
    document.getElementById('note-modal-title').textContent = 'Editar Nota / Tarea';
    document.getElementById('note-id').value = note.id;
    document.getElementById('note-title-input').value = note.title;
    document.getElementById('note-assigned-input').value = note.assignedTo;
    document.getElementById('note-deed-input').value = note.deedId || '';
    
    currentChecklistItems = [...note.checklist.map(item => ({...item}))];
    
    document.querySelectorAll('#modal-color-selector .color-dot').forEach(dot => {
      if (dot.getAttribute('data-color') === note.color) {
        dot.classList.add('selected');
      } else {
        dot.classList.remove('selected');
      }
    });

    document.getElementById('delete-note-btn').style.display = 'block';
  } else {
    document.getElementById('note-modal-title').textContent = 'Crear Nota / Tarea';
    document.getElementById('note-id').value = '';
    document.getElementById('note-assigned-input').value = state.currentUser ? state.currentUser.id : '';
  }
  
  renderModalChecklist();
  noteModal.classList.add('active');
}

function openUserModal(userId = null) {
  userForm.reset();
  if (userId) {
    const user = state.users.find(u => u.id === userId);
    document.getElementById('user-modal-title').textContent = 'Editar Colaborador';
    document.getElementById('user-id').value = user.id;
    document.getElementById('user-name-input').value = user.name;
    document.getElementById('user-password-input').value = user.password;
  } else {
    document.getElementById('user-modal-title').textContent = 'Agregar Colaborador';
    document.getElementById('user-id').value = '';
  }
  userModal.classList.add('active');
}

function renderModalChecklist() {
  const container = document.getElementById('modal-checklist-builder');
  container.innerHTML = '';
  currentChecklistItems.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'builder-row';
    row.innerHTML = `
      <input type="checkbox" ${item.done ? 'checked' : ''} onchange="updateModalChecklistItem(${index}, 'done', this.checked)">
      <input type="text" value="${item.text}" placeholder="Tarea..." required oninput="updateModalChecklistItem(${index}, 'text', this.value)">
      <button type="button" class="btn-icon" onclick="deleteModalChecklistItem(${index})" style="color: var(--md-sys-color-error); width:32px; height:32px;">✕</button>
    `;
    container.appendChild(row);
  });
}

window.updateModalChecklistItem = function(index, key, val) {
  currentChecklistItems[index][key] = val;
};

window.deleteModalChecklistItem = function(index) {
  currentChecklistItems.splice(index, 1);
  renderModalChecklist();
};

document.getElementById('add-checklist-item-btn').addEventListener('click', () => {
  currentChecklistItems.push({ text: '', done: false });
  renderModalChecklist();
});

document.querySelectorAll('#modal-color-selector .color-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    document.querySelectorAll('#modal-color-selector .color-dot').forEach(d => d.classList.remove('selected'));
    dot.classList.add('selected');
  });
});

deedForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('deed-id').value;
  const number = document.getElementById('deed-number-input').value;
  const title = document.getElementById('deed-title-input').value;
  const client = document.getElementById('deed-client-input').value;
  const status = document.getElementById('deed-status-input').value;
  const desc = document.getElementById('deed-desc-input').value;

  if (id) {
    const index = state.deeds.findIndex(d => d.id === id);
    if (index !== -1) {
      state.deeds[index] = { id, number, title, client, status, desc };
    }
  } else {
    state.deeds.push({
      id: 'd_' + Date.now(),
      number,
      title,
      client,
      status,
      desc
    });
  }

  saveToStorage();
  updateMetrics();
  renderDeeds();
  populateDropdowns();
  deedModal.classList.remove('active');
});

noteForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('note-id').value;
  const title = document.getElementById('note-title-input').value;
  const assignedTo = document.getElementById('note-assigned-input').value;
  const deedId = document.getElementById('note-deed-input').value;
  
  const selectedColorDot = document.querySelector('#modal-color-selector .color-dot.selected');
  const color = selectedColorDot ? selectedColorDot.getAttribute('data-color') : '1';

  const checklist = currentChecklistItems.filter(item => item.text.trim() !== '');

  const today = new Date();
  const dateStr = `${today.getDate()}.${today.getMonth()+1}.${String(today.getFullYear()).slice(-2)}`;

  if (id) {
    const index = state.notes.findIndex(n => n.id === id);
    if (index !== -1) {
      state.notes[index] = { id, title, assignedTo, deedId, color, checklist, date: state.notes[index].date || dateStr };
    }
  } else {
    state.notes.push({
      id: 'n_' + Date.now(),
      title,
      assignedTo,
      deedId,
      color,
      checklist,
      date: dateStr
    });
  }

  saveToStorage();
  updateMetrics();
  renderNotes();
  noteModal.classList.remove('active');
});

document.getElementById('delete-note-btn').addEventListener('click', () => {
  const id = document.getElementById('note-id').value;
  if (id) {
    state.notes = state.notes.filter(n => n.id !== id);
    saveToStorage();
    updateMetrics();
    renderNotes();
    noteModal.classList.remove('active');
  }
});

userForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('user-id').value;
  const name = document.getElementById('user-name-input').value;
  const password = document.getElementById('user-password-input').value;

  if (id) {
    const index = state.users.findIndex(u => u.id === id);
    if (index !== -1) {
      state.users[index].name = name;
      state.users[index].password = password;
    }
  } else {
    state.users.push({
      id: 'u_' + Date.now(),
      name,
      role: 'colaborador',
      password
    });
  }

  saveToStorage();
  updateMetrics();
  renderUsersTable();
  populateDropdowns();
  userModal.classList.remove('active');
});

function populateDropdowns() {
  const assignSelect = document.getElementById('note-assigned-input');
  assignSelect.innerHTML = '';
  state.users.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.name;
    assignSelect.appendChild(opt);
  });

  const deedSelect = document.getElementById('note-deed-input');
  deedSelect.innerHTML = '<option value="">Ninguna</option>';
  state.deeds.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `Esc. #${d.number} - ${d.title}`;
    deedSelect.appendChild(opt);
  });
}

globalFab.addEventListener('click', () => {
  const activeScreen = document.querySelector('.screen.active').id;
  if (activeScreen === 'deeds-screen') {
    openDeedModal();
  } else if (activeScreen === 'keep-screen') {
    openNoteModal();
  }
});

document.getElementById('add-user-btn').addEventListener('click', () => {
  openUserModal();
});

document.querySelectorAll('.modal-close-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  });
});

searchInput.addEventListener('input', (e) => {
  const query = e.target.value;
  renderDeeds(query);
  renderNotes(query);
});

function init() {
  loadFromStorage();
  applyTheme();
  renderLoginUsers();
}

init();
