// Firebase Configuration (Fill with your credentials)
const firebaseConfig = {
  apiKey: "AIzaSyBYpvPKP1v4WoeiwfF7wJFYJcn--OQJN8k",
  authDomain: "scriptura-noraria.firebaseapp.com",
  projectId: "scriptura-noraria",
  storageBucket: "scriptura-noraria.firebasestorage.app",
  messagingSenderId: "352556172777",
  appId: "1:352556172777:web:d7e8c77c2c76539915b778",
  measurementId: "G-T3DHLBPYTB"
};

// Webhook Configuration for Make
const WEBHOOK_URL = "https://hook.us2.make.com/qcfugoge9ei0foesqowebsohf9jlzmcg";

// Check if Firebase is loaded and initialized
let db = null;
let useFirebase = false;

if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "") {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    db.enablePersistence().catch(err => {
      console.warn("Firestore persistence failed to enable:", err.code);
    });
    useFirebase = true;
    console.log("Firebase Firestore initialized successfully.");
  } catch (err) {
    console.error("Firebase initialization failed:", err);
  }
}

// State Management
let state = {
  currentUser: null,
  users: [],
  deeds: [],
  notes: [],
  events: [], // Calendar events
  offices: ['Notaría 134', 'Notaría 160', 'Personal', 'Chofer'], // Custom notary offices tags
  theme: 'light',
  currentFilter: 'all', // all, pending, completed, personal
  calendarDate: new Date(), // Selected month/year for display
  selectedCalendarDate: new Date() // Selected day for events
};

// Initial Default Data
const DEFAULT_USERS = [
  { id: '1', name: 'Mariano Sanchez', role: 'colaborador', password: '' },
  { id: '2', name: 'Paola Madrigal', role: 'colaborador', password: '' },
  { id: '3', name: 'Daniel Villagran', role: 'colaborador', password: '' },
  { id: 'boss', name: 'Hector Omar Lopez Mora', role: 'boss', password: '1234' }
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
    office: 'Notaría 134',
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
    office: 'Notaría 160',
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
    office: 'Personal',
    color: '4',
    date: '22.11.26',
    checklist: [
      { text: 'Redactar facultades generales y especiales', done: false },
      { text: 'Confirmar pago de honorarios', done: false }
    ]
  }
];

const DEFAULT_EVENTS = [
  {
    id: 'e1',
    title: 'Firma de Donación de Terreno',
    date: new Date().toISOString().split('T')[0], // Today
    time: '11:00',
    deedId: 'd1',
    desc: 'Cita con Juan Pérez en sala de firmas A.'
  },
  {
    id: 'e2',
    title: 'Reunión InnovaTech Estatutos',
    date: new Date().toISOString().split('T')[0], // Today
    time: '16:00',
    deedId: 'd2',
    desc: 'Presentación de estatutos constitucionales modificados.'
  }
];

// Data Synchronizer (LocalStorage + Firebase)
function loadData() {
  // Pre-load default state to guarantee login & autocomplete suggestions instantly
  state.users = DEFAULT_USERS;
  state.deeds = DEFAULT_DEEDS;
  state.notes = DEFAULT_NOTES;
  state.events = DEFAULT_EVENTS;
  state.theme = localStorage.getItem('scriptura_theme') || 'light';
  state.offices = ['Notaría 134', 'Notaría 160', 'Personal', 'Chofer'];

  renderUsersTable();
  populateDropdowns();
  renderLoginUsers();
  renderOfficeTags();

  if (useFirebase) {
    // 1. Listen to Users in real-time with self-healing boss verify
    db.collection('users').onSnapshot(snapshot => {
      const usersList = [];
      snapshot.forEach(doc => usersList.push(doc.data()));
      
      const bossInList = usersList.some(u => u.role === 'boss');
      if (usersList.length === 0 || !bossInList) {
        // Enforce Hector exists in DB
        const bossUser = DEFAULT_USERS.find(u => u.role === 'boss');
        db.collection('users').doc(bossUser.id).set(bossUser);
        DEFAULT_USERS.forEach(u => {
          if (u.role !== 'boss') db.collection('users').doc(u.id).set(u);
        });
      } else {
        state.users = usersList;
        renderUsersTable();
        populateDropdowns();
        renderLoginUsers();
      }
    }, error => {
      console.warn("Firestore 'users' failed to sync. Using defaults.", error.message);
    });

    // 2. Listen to Deeds
    db.collection('deeds').onSnapshot(snapshot => {
      const deedsList = [];
      snapshot.forEach(doc => deedsList.push(doc.data()));
      if (deedsList.length === 0) {
        DEFAULT_DEEDS.forEach(d => db.collection('deeds').doc(d.id).set(d));
      } else {
        state.deeds = deedsList;
        renderDeeds();
        populateDropdowns();
        updateMetrics();
      }
    }, error => {
      console.warn("Firestore 'deeds' failed to sync. Using defaults.", error.message);
    });

    // 3. Listen to Notes
    db.collection('notes').onSnapshot(snapshot => {
      const notesList = [];
      snapshot.forEach(doc => notesList.push(doc.data()));
      if (notesList.length === 0) {
        DEFAULT_NOTES.forEach(n => db.collection('notes').doc(n.id).set(n));
      } else {
        state.notes = notesList;
        renderNotes();
        updateMetrics();
      }
    }, error => {
      console.warn("Firestore 'notes' failed to sync. Using defaults.", error.message);
    });

    // 4. Listen to Calendar Events
    db.collection('events').onSnapshot(snapshot => {
      const eventsList = [];
      snapshot.forEach(doc => eventsList.push(doc.data()));
      if (eventsList.length === 0) {
        DEFAULT_EVENTS.forEach(e => db.collection('events').doc(e.id).set(e));
      } else {
        state.events = eventsList;
        renderCalendar();
        renderEventsForSelectedDay();
      }
    }, error => {
      console.warn("Firestore 'events' failed to sync. Using defaults.", error.message);
    });

    // 5. Listen to Offices tags
    db.collection('config').doc('offices').onSnapshot(doc => {
      if (doc.exists) {
        state.offices = doc.data().list;
        renderOfficeTags();
        populateDropdowns();
      } else {
        db.collection('config').doc('offices').set({ list: state.offices });
      }
    }, error => {
      console.warn("Firestore 'offices config' failed to sync. Using defaults.", error.message);
    });
  } else {
    // Local storage sync fallback
    const users = localStorage.getItem('scriptura_users');
    const deeds = localStorage.getItem('scriptura_deeds');
    const notes = localStorage.getItem('scriptura_notes');
    const events = localStorage.getItem('scriptura_events');
    const offices = localStorage.getItem('scriptura_offices');

    if (users) state.users = JSON.parse(users);
    if (deeds) state.deeds = JSON.parse(deeds);
    if (notes) state.notes = JSON.parse(notes);
    if (events) state.events = JSON.parse(events);
    if (offices) state.offices = JSON.parse(offices);

    renderUsersTable();
    populateDropdowns();
    renderLoginUsers();
    renderOfficeTags();
  }
}

// Optimistic UI updates inside syncSave and syncDelete for instant responsiveness
function syncSave(collection, docId, data) {
  // Update local state instantly
  if (collection === 'users') {
    const index = state.users.findIndex(u => u.id === docId);
    if (index !== -1) state.users[index] = data;
    else state.users.push(data);
    renderUsersTable();
    populateDropdowns();
    renderLoginUsers();
    localStorage.setItem('scriptura_users', JSON.stringify(state.users));
  } else if (collection === 'deeds') {
    const index = state.deeds.findIndex(d => d.id === docId);
    if (index !== -1) state.deeds[index] = data;
    else state.deeds.push(data);
    renderDeeds();
    populateDropdowns();
    localStorage.setItem('scriptura_deeds', JSON.stringify(state.deeds));
  } else if (collection === 'notes') {
    const index = state.notes.findIndex(n => n.id === docId);
    if (index !== -1) state.notes[index] = data;
    else state.notes.push(data);
    renderNotes();
    localStorage.setItem('scriptura_notes', JSON.stringify(state.notes));
  } else if (collection === 'events') {
    const index = state.events.findIndex(e => e.id === docId);
    if (index !== -1) state.events[index] = data;
    else state.events.push(data);
    renderCalendar();
    renderEventsForSelectedDay();
    localStorage.setItem('scriptura_events', JSON.stringify(state.events));
  }
  updateMetrics();

  // Firestore background save
  if (useFirebase) {
    db.collection(collection).doc(docId).set(data)
      .catch(err => console.error(`Error saving to Firestore (${collection}):`, err));
  }
}

function syncDelete(collection, docId) {
  // Update local state instantly
  if (collection === 'notes') {
    state.notes = state.notes.filter(n => n.id !== docId);
    renderNotes();
    localStorage.setItem('scriptura_notes', JSON.stringify(state.notes));
  } else if (collection === 'events') {
    state.events = state.events.filter(e => e.id !== docId);
    renderCalendar();
    renderEventsForSelectedDay();
    localStorage.setItem('scriptura_events', JSON.stringify(state.events));
  }
  updateMetrics();

  // Firestore background delete
  if (useFirebase) {
    db.collection(collection).doc(docId).delete()
      .catch(err => console.error(`Error deleting from Firestore (${collection}):`, err));
  }
}

// Trigger Make Webhook notification
function triggerNotification(note, isNew = true) {
  if (!WEBHOOK_URL || WEBHOOK_URL.includes("YOUR_MAKE")) return;

  const assignedUser = state.users.find(u => u.id === note.assignedTo);
  const linkedDeed = state.deeds.find(d => d.id === note.deedId);
  const checklistStr = note.checklist.map(item => `- [${item.done ? 'x' : ' '}] ${item.text}`).join('\n');

  const payload = {
    event: isNew ? 'task_assigned' : 'task_updated',
    task_id: note.id,
    title: note.title,
    assigned_name: assignedUser ? assignedUser.name : 'Sin Asignar',
    deed_number: linkedDeed ? linkedDeed.number : 'N/A',
    deed_title: linkedDeed ? linkedDeed.title : 'N/A',
    office: note.office || 'General',
    date: note.date,
    checklist: checklistStr,
    editor: state.currentUser ? state.currentUser.name : 'Sistema'
  };

  fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => console.log('Notification webhook triggered successfully'))
  .catch(err => console.error('Error triggering notification webhook:', err));
}

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app-container');
const deedsContainer = document.getElementById('deeds-container');
const notesContainer = document.getElementById('notes-container');
const usersTableBody = document.getElementById('users-table-body');
const searchInput = document.getElementById('search-input');
const themeToggle = document.getElementById('theme-toggle');
const globalFab = document.getElementById('global-fab');
const activeUserAvatar = document.getElementById('active-user-avatar');

// Login Form Elements
const loginForm = document.getElementById('login-form');
const loginNameInput = document.getElementById('login-name-input');
const loginPasswordContainer = document.getElementById('login-password-container');
const loginPwdInput = document.getElementById('login-pwd-input');
const loginErrorMsg = document.getElementById('login-error-msg');

// Modals
const deedModal = document.getElementById('deed-modal');
const deedForm = document.getElementById('deed-form');
const noteModal = document.getElementById('note-modal');
const noteForm = document.getElementById('note-form');
const userModal = document.getElementById('user-modal');
const userForm = document.getElementById('user-form');
const eventModal = document.getElementById('event-modal');
const eventForm = document.getElementById('event-form');
const speedDialMenu = document.getElementById('speed-dial-menu');

// Auth Flow
function renderLoginUsers() {
  const datalist = document.getElementById('login-users-datalist');
  if (datalist) {
    datalist.innerHTML = '';
    state.users.forEach(user => {
      const opt = document.createElement('option');
      opt.value = user.name;
      datalist.appendChild(opt);
    });
  }
}

function performLogin(user) {
  state.currentUser = user;
  loginScreen.style.display = 'none';
  appContainer.style.display = 'flex';
  
  // Save persistent session locally
  localStorage.setItem('scriptura_logged_user', JSON.stringify(user));
  
  activeUserAvatar.textContent = user.name.charAt(0).toUpperCase();
  
  const navAdmin = document.getElementById('nav-admin-btn');
  const barAdmin = document.getElementById('bar-switch-admin');
  
  if (user.role === 'boss') {
    if (navAdmin) navAdmin.style.display = 'flex';
    if (barAdmin) barAdmin.style.display = 'flex';
  } else {
    if (navAdmin) navAdmin.style.display = 'none';
    if (barAdmin) barAdmin.style.display = 'none';
  }

  switchScreen('deeds-screen');
  updateMetrics();
  renderDeeds();
  renderNotes();
  renderCalendar();
  renderEventsForSelectedDay();
  renderUsersTable();
  populateDropdowns();
  renderOfficeTags();
}

// Handle login typing behavior
loginNameInput.addEventListener('input', (e) => {
  const val = e.target.value.trim().toLowerCase();
  loginErrorMsg.style.display = 'none';
  if (val === 'hector omar' || val === 'hector omar lopez mora') {
    loginPasswordContainer.style.display = 'block';
    loginPwdInput.setAttribute('required', 'true');
  } else {
    loginPasswordContainer.style.display = 'none';
    loginPwdInput.removeAttribute('required');
    loginPwdInput.value = '';
  }
});

// Login Form Submit
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const nameVal = loginNameInput.value.trim();
  const pwdVal = loginPwdInput.value.trim();
  
  let matchedUser = state.users.find(u => u.name.toLowerCase() === nameVal.toLowerCase());
  
  // Fallback if Firestore has not loaded/synced yet
  if (!matchedUser && state.users.length === 0) {
    matchedUser = DEFAULT_USERS.find(u => u.name.toLowerCase() === nameVal.toLowerCase());
  }
  
  if (!matchedUser) {
    loginErrorMsg.textContent = 'Usuario no registrado. Contacta al Administrador.';
    loginErrorMsg.style.display = 'block';
    return;
  }
  
  if (matchedUser.role === 'boss') {
    if (loginPasswordContainer.style.display === 'none') {
      loginPasswordContainer.style.display = 'block';
      loginPwdInput.setAttribute('required', 'true');
      loginPwdInput.focus();
      return;
    }
    
    if (pwdVal === matchedUser.password) {
      performLogin(matchedUser);
    } else {
      loginErrorMsg.textContent = 'Contraseña incorrecta.';
      loginErrorMsg.style.display = 'block';
      loginPwdInput.focus();
    }
  } else {
    performLogin(matchedUser);
  }
});

// Logout Helper
function handleLogout() {
  state.currentUser = null;
  localStorage.removeItem('scriptura_logged_user'); // Clear persistent session
  appContainer.style.display = 'none';
  loginScreen.style.display = 'flex';
  
  loginForm.reset();
  loginPasswordContainer.style.display = 'none';
  loginPwdInput.removeAttribute('required');
  loginErrorMsg.style.display = 'none';
  loginNameInput.focus();
}

activeUserAvatar.addEventListener('click', handleLogout);

// Screen Switching Navigation
const navItems = document.querySelectorAll('.nav-item');
function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) targetScreen.classList.add('active');
  
  const headerTitle = document.getElementById('dashboard-title-text');
  if (screenId === 'deeds-screen') {
    headerTitle.textContent = 'Operación Diaria';
  } else if (screenId === 'keep-screen') {
    headerTitle.textContent = 'Tareas y Pendientes';
  } else if (screenId === 'calendar-screen') {
    headerTitle.textContent = 'Calendario Notarial';
  } else if (screenId === 'admin-screen') {
    headerTitle.textContent = 'Personal, Equipo y Oficinas';
  }

  navItems.forEach(item => {
    if (item.getAttribute('data-target') === screenId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  document.querySelectorAll('.floating-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  if (screenId === 'deeds-screen') {
    document.getElementById('bar-switch-deeds').classList.add('active');
    globalFab.style.display = 'flex';
  } else if (screenId === 'keep-screen') {
    document.getElementById('bar-switch-tasks').classList.add('active');
    globalFab.style.display = 'flex';
  } else if (screenId === 'calendar-screen') {
    document.getElementById('bar-switch-calendar').classList.add('active');
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

document.getElementById('bar-switch-deeds').addEventListener('click', () => switchScreen('deeds-screen'));
document.getElementById('bar-switch-tasks').addEventListener('click', () => switchScreen('keep-screen'));
document.getElementById('bar-switch-calendar').addEventListener('click', () => switchScreen('calendar-screen'));
document.getElementById('bar-switch-admin').addEventListener('click', () => switchScreen('admin-screen'));

// Theme Toggle
themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  localStorage.setItem('scriptura_theme', state.theme);
});

function applyTheme() {
  if (state.theme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
}

// Metrics Update
function updateMetrics() {
  document.getElementById('stat-deeds-count').textContent = state.deeds.length;
  
  const pendingTasks = state.notes.flatMap(n => n.checklist).filter(item => !item.done).length;
  document.getElementById('stat-tasks-count').textContent = pendingTasks;
  
  document.getElementById('stat-colabs-count').textContent = state.users.filter(u => u.role !== 'boss').length;

  const totalNotes = state.notes.length;
  const completedNotes = state.notes.filter(n => n.checklist.every(item => item.done)).length;
  const inProgressNotes = totalNotes - completedNotes;
  const personalNotes = state.notes.filter(n => n.office === 'Personal').length;

  document.getElementById('badge-all').textContent = totalNotes;
  document.getElementById('badge-pending').textContent = inProgressNotes;
  document.getElementById('badge-completed').textContent = completedNotes;
  document.getElementById('badge-personal').textContent = personalNotes;
}

// Filters
document.getElementById('filter-all').addEventListener('click', (e) => {
  setActiveFilter(e.target.closest('.pill-btn'), 'all');
});
document.getElementById('filter-pending').addEventListener('click', (e) => {
  setActiveFilter(e.target.closest('.pill-btn'), 'pending');
});
document.getElementById('filter-completed').addEventListener('click', (e) => {
  setActiveFilter(e.target.closest('.pill-btn'), 'completed');
});
document.getElementById('filter-personal').addEventListener('click', (e) => {
  setActiveFilter(e.target.closest('.pill-btn'), 'personal');
});

function setActiveFilter(element, filterType) {
  document.querySelectorAll('.filter-bar .pill-btn').forEach(btn => btn.classList.remove('active'));
  element.classList.add('active');
  state.currentFilter = filterType;
  renderNotes(searchInput.value);
}

// Render Deeds
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

// Render Notes/Tasks Grid
function renderNotes(filterText = '') {
  notesContainer.innerHTML = '';
  const isBoss = state.currentUser && state.currentUser.role === 'boss';
  
  const filtered = state.notes.filter(note => {
    const matchesQuery = 
      note.title.toLowerCase().includes(filterText.toLowerCase()) ||
      note.checklist.some(item => item.text.toLowerCase().includes(filterText.toLowerCase()));
      
    if (!matchesQuery) return false;
    
    // Auth filtering rules
    if (!isBoss && note.assignedTo !== state.currentUser.id) return false;

    // Sub-pills filtering
    const isCompleted = note.checklist.length > 0 && note.checklist.every(item => item.done);
    if (state.currentFilter === 'pending' && isCompleted) return false;
    if (state.currentFilter === 'completed' && !isCompleted) return false;
    if (state.currentFilter === 'personal' && note.office !== 'Personal') return false;

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
        <span class="keep-card-category">${note.office || 'General'} ${linkedDeed ? `• Esc. #${linkedDeed.number}` : ''}</span>
        <div class="card-action-dot">···</div>
      </div>
      <div class="keep-card-title">${note.title}</div>
      
      <div style="width:100%; height:4px; background-color:rgba(0,0,0,0.06); border-radius:var(--shape-full); overflow:hidden; margin-top:-4px;">
        <div style="width:${progressPercent}%; height:100%; background-color:var(--md-sys-color-primary); transition: width 0.3s ease;"></div>
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
    syncSave('notes', noteId, note);
    triggerNotification(note, false);
  }
}

// Render Users Table
function renderUsersTable() {
  usersTableBody.innerHTML = '';
  state.users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.name}</strong></td>
      <td>${u.role === 'boss' ? 'Jefe / Notario' : 'Personal / Colaborador'}</td>
      <td><code>${u.password || 'Sin Clave'}</code></td>
      <td>
        <button class="btn btn-text" onclick="openUserModal('${u.id}')" style="padding: 6px 12px; font-size: 13px;">Editar</button>
      </td>
    `;
    usersTableBody.appendChild(tr);
  });
}

// Render Calendar Month Grid
const MONTHS_SPANISH = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function renderCalendar() {
  const grid = document.getElementById('calendar-days-grid');
  const monthYearLabel = document.getElementById('calendar-month-year');
  if (!grid || !monthYearLabel) return;

  grid.innerHTML = '';
  
  const currentMonth = state.calendarDate.getMonth();
  const currentYear = state.calendarDate.getFullYear();
  
  monthYearLabel.textContent = `${MONTHS_SPANISH[currentMonth]} ${currentYear}`;

  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < firstDayIndex; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day-cell empty';
    grid.appendChild(emptyCell);
  }

  for (let day = 1; day <= totalDays; day++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';
    cell.textContent = day;
    
    const thisDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const selectedDateStr = state.selectedCalendarDate.toISOString().split('T')[0];
    
    if (thisDateStr === selectedDateStr) {
      cell.classList.add('active');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (thisDateStr === todayStr) {
      cell.classList.add('today');
    }

    const hasEvents = state.events.some(e => e.date === thisDateStr);
    if (hasEvents) {
      const dot = document.createElement('div');
      dot.className = 'day-event-dot';
      cell.appendChild(dot);
    }

    cell.addEventListener('click', () => {
      state.selectedCalendarDate = new Date(currentYear, currentMonth, day);
      renderCalendar();
      renderEventsForSelectedDay();
    });

    grid.appendChild(cell);
  }
}

// Render Event list for selected date
function renderEventsForSelectedDay() {
  const container = document.getElementById('events-list-container');
  const dayTitle = document.getElementById('selected-day-title');
  if (!container || !dayTitle) return;

  container.innerHTML = '';
  
  const selectedStr = state.selectedCalendarDate.toISOString().split('T')[0];
  const formattedDay = `${state.selectedCalendarDate.getDate()} de ${MONTHS_SPANISH[state.selectedCalendarDate.getMonth()]}`;
  dayTitle.textContent = `Eventos - ${formattedDay}`;

  const dayEvents = state.events.filter(e => e.date === selectedStr);
  dayEvents.sort((a, b) => a.time.localeCompare(b.time));

  if (dayEvents.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:24px; opacity:0.5; font-size:13px;">Sin citas para este día.</div>`;
    return;
  }

  dayEvents.forEach(evt => {
    const card = document.createElement('div');
    card.className = 'event-item-card';
    const linkedDeed = state.deeds.find(d => d.id === evt.deedId);
    
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="event-item-time">${evt.time} hrs</span>
        ${linkedDeed ? `<span style="font-size: 11px; padding:2px 8px; border-radius:var(--shape-small); background-color: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container);">Esc. #${linkedDeed.number}</span>` : ''}
      </div>
      <div class="event-item-title">${evt.title}</div>
      ${evt.desc ? `<p style="font-size:12px; opacity:0.7;">${evt.desc}</p>` : ''}
    `;
    card.addEventListener('click', () => openEventModal(evt));
    container.appendChild(card);
  });
}

// Prev/Next Month handlers
document.getElementById('prev-month-btn').addEventListener('click', () => {
  state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
  renderCalendar();
});
document.getElementById('next-month-btn').addEventListener('click', () => {
  state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
  renderCalendar();
});

// Render dynamic office tags list in Admin
function renderOfficeTags() {
  const container = document.getElementById('offices-list-tags');
  if (!container) return;

  container.innerHTML = '';
  state.offices.forEach((office, index) => {
    const tag = document.createElement('div');
    tag.style.cssText = `
      padding: 6px 12px;
      background-color: var(--md-sys-color-surface-variant);
      border-radius: var(--shape-small);
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    tag.innerHTML = `
      <span>${office}</span>
      <span onclick="deleteOfficeTag(${index})" style="cursor:pointer; font-weight:700; color:var(--md-sys-color-error);">✕</span>
    `;
    container.appendChild(tag);
  });
}

// Fixed: deleteOfficeTag now immediately does optimistic updates for responsive UI
window.deleteOfficeTag = function(index) {
  state.offices.splice(index, 1);
  renderOfficeTags();
  populateDropdowns();
  
  if (useFirebase) {
    db.collection('config').doc('offices').set({ list: state.offices });
  } else {
    localStorage.setItem('scriptura_offices', JSON.stringify(state.offices));
  }
};

// Add Office submit handler
const addOfficeForm = document.getElementById('add-office-form');
if (addOfficeForm) {
  addOfficeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('new-office-input');
    const name = input.value.trim();
    
    if (name && !state.offices.includes(name)) {
      state.offices.push(name);
      renderOfficeTags();
      populateDropdowns();
      
      if (useFirebase) {
        db.collection('config').doc('offices').set({ list: state.offices });
      } else {
        localStorage.setItem('scriptura_offices', JSON.stringify(state.offices));
      }
      input.value = '';
    }
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
    document.getElementById('note-office-input').value = note.office || '';
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
    document.getElementById('user-modal-title').textContent = 'Editar Registro';
    document.getElementById('user-id').value = user.id;
    document.getElementById('user-name-input').value = user.name;
    document.getElementById('user-password-input').value = user.password || '';
    document.getElementById('user-role-input').value = user.role;
  } else {
    document.getElementById('user-modal-title').textContent = 'Registrar Integrante / Colaborador';
    document.getElementById('user-id').value = '';
    document.getElementById('user-role-input').value = 'colaborador';
  }
  userModal.classList.add('active');
}

function openEventModal(evt = null) {
  eventForm.reset();
  document.getElementById('delete-event-btn').style.display = 'none';
  
  if (evt) {
    document.getElementById('event-modal-title').textContent = 'Editar Cita';
    document.getElementById('event-id').value = evt.id;
    document.getElementById('event-title-input').value = evt.title;
    document.getElementById('event-date-input').value = evt.date;
    document.getElementById('event-time-input').value = evt.time;
    document.getElementById('event-deed-input').value = evt.deedId || '';
    document.getElementById('event-desc-input').value = evt.desc || '';
    document.getElementById('delete-event-btn').style.display = 'block';
  } else {
    document.getElementById('event-modal-title').textContent = 'Nueva Cita / Firma';
    document.getElementById('event-id').value = '';
    const selectedDateStr = state.selectedCalendarDate.toISOString().split('T')[0];
    document.getElementById('event-date-input').value = selectedDateStr;
  }
  eventModal.classList.add('active');
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
  const id = document.getElementById('deed-id').value || 'd_' + Date.now();
  const number = document.getElementById('deed-number-input').value;
  const title = document.getElementById('deed-title-input').value;
  const client = document.getElementById('deed-client-input').value;
  const status = document.getElementById('deed-status-input').value;
  const desc = document.getElementById('deed-desc-input').value;

  const data = { id, number, title, client, status, desc };
  syncSave('deeds', id, data);
  deedModal.classList.remove('active');
});

noteForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('note-id').value || 'n_' + Date.now();
  const title = document.getElementById('note-title-input').value;
  const assignedTo = document.getElementById('note-assigned-input').value;
  const office = document.getElementById('note-office-input').value;
  const deedId = document.getElementById('note-deed-input').value;
  
  const selectedColorDot = document.querySelector('#modal-color-selector .color-dot.selected');
  const color = selectedColorDot ? selectedColorDot.getAttribute('data-color') : '1';

  const checklist = currentChecklistItems.filter(item => item.text.trim() !== '');

  const today = new Date();
  const dateStr = `${today.getDate()}.${today.getMonth()+1}.${String(today.getFullYear()).slice(-2)}`;
  
  const matchedNote = state.notes.find(n => n.id === id);
  const date = matchedNote ? matchedNote.date : dateStr;

  const isNew = !matchedNote;

  const data = { id, title, assignedTo, office, deedId, color, checklist, date };
  syncSave('notes', id, data);
  triggerNotification(data, isNew);
  noteModal.classList.remove('active');
});

document.getElementById('delete-note-btn').addEventListener('click', () => {
  const id = document.getElementById('note-id').value;
  if (id) {
    syncDelete('notes', id);
    noteModal.classList.remove('active');
  }
});

userForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('user-id').value || 'u_' + Date.now();
  const name = document.getElementById('user-name-input').value;
  const password = document.getElementById('user-password-input').value;
  const role = document.getElementById('user-role-input').value;

  const data = { id, name, role, password };
  syncSave('users', id, data);
  userModal.classList.remove('active');
});

eventForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('event-id').value || 'e_' + Date.now();
  const title = document.getElementById('event-title-input').value;
  const date = document.getElementById('event-date-input').value;
  const time = document.getElementById('event-time-input').value;
  const deedId = document.getElementById('event-deed-input').value;
  const desc = document.getElementById('event-desc-input').value;

  const data = { id, title, date, time, deedId, desc };
  syncSave('events', id, data);
  eventModal.classList.remove('active');
});

document.getElementById('delete-event-btn').addEventListener('click', () => {
  const id = document.getElementById('event-id').value;
  if (id) {
    syncDelete('events', id);
    eventModal.classList.remove('active');
  }
});

function populateDropdowns() {
  const assignSelect = document.getElementById('note-assigned-input');
  if (assignSelect) {
    assignSelect.innerHTML = '';
    state.users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = u.name;
      assignSelect.appendChild(opt);
    });
  }

  const officeSelect = document.getElementById('note-office-input');
  if (officeSelect) {
    officeSelect.innerHTML = '';
    state.offices.forEach(office => {
      const opt = document.createElement('option');
      opt.value = office;
      opt.textContent = office;
      officeSelect.appendChild(opt);
    });
  }

  const deedSelects = [document.getElementById('note-deed-input'), document.getElementById('event-deed-input')];
  deedSelects.forEach(deedSelect => {
    if (deedSelect) {
      deedSelect.innerHTML = '<option value="">Ninguna</option>';
      state.deeds.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `Esc. #${d.number} - ${d.title}`;
        deedSelect.appendChild(opt);
      });
    }
  });
}

// Global floating '+' Speed Dial toggle logic
globalFab.addEventListener('click', (e) => {
  e.stopPropagation();
  const isHidden = speedDialMenu.style.display === 'none';
  speedDialMenu.style.display = isHidden ? 'flex' : 'none';
});

// Hide Speed Dial when clicking outside
document.addEventListener('click', () => {
  if (speedDialMenu) speedDialMenu.style.display = 'none';
});

// Global Trigger Speed Dial handler
window.triggerSpeedDial = function(screenId) {
  speedDialMenu.style.display = 'none';
  switchScreen(screenId);
  if (screenId === 'deeds-screen') {
    openDeedModal();
  } else if (screenId === 'keep-screen') {
    openNoteModal();
  } else if (screenId === 'calendar-screen') {
    openEventModal();
  }
};

// Wire Speed Dial actions directly
document.getElementById('sd-deed').addEventListener('click', () => triggerSpeedDial('deeds-screen'));
document.getElementById('sd-task').addEventListener('click', () => triggerSpeedDial('keep-screen'));
document.getElementById('sd-event').addEventListener('click', () => triggerSpeedDial('calendar-screen'));

document.getElementById('add-user-btn').addEventListener('click', () => {
  openUserModal();
});

document.getElementById('add-event-btn').addEventListener('click', () => {
  openEventModal();
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
  loadData();
  applyTheme();
  
  // Persistent login session validation
  const savedUser = localStorage.getItem('scriptura_logged_user');
  if (savedUser) {
    performLogin(JSON.parse(savedUser));
  }
}

init();
