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
  events: [], 
  offices: ['Notaría 134', 'Notaría 160', 'Personal'], 
  theme: 'light',
  currentFilter: 'all', 
  calendarDate: new Date(), 
  selectedCalendarDate: new Date() 
};

// Data Synchronizer (LocalStorage + Firebase)
function loadData() {
  const overlay = document.getElementById('skeleton-loader-overlay');
  if (overlay) overlay.style.display = 'flex';

  // Solo usamos LocalStorage como fallback offline temporal si Firebase tarda, pero NO como fuente de verdad ni para emular.
  const lUsers = localStorage.getItem('scriptura_users');
  const lDeeds = localStorage.getItem('scriptura_deeds');
  const lNotes = localStorage.getItem('scriptura_notes');
  const lEvents = localStorage.getItem('scriptura_events');
  const lOffices = localStorage.getItem('scriptura_offices');
  const lTheme = localStorage.getItem('scriptura_theme');

  state.users = lUsers ? JSON.parse(lUsers) : [];
  state.deeds = lDeeds ? JSON.parse(lDeeds) : [];
  state.notes = lNotes ? JSON.parse(lNotes) : [];
  state.events = lEvents ? JSON.parse(lEvents) : [];
  state.offices = lOffices ? JSON.parse(lOffices) : ['Notaría 134', 'Notaría 160', 'Personal'];
  state.theme = lTheme || 'light';

  renderUsersTable();
  populateDropdowns();
  renderLoginUsers();
  renderOfficeTags();

  if (useFirebase) {
    let isResolved = false;
    setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        if (overlay) overlay.style.display = 'none';
      }
    }, 2000);

    // 1. Listen to Users in real-time
    db.collection('users').onSnapshot(snapshot => {
      if (!snapshot.empty) {
        const usersList = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.role && !data.roles) data.roles = [data.role];
          usersList.push(data);
        });
        state.users = usersList;
        localStorage.setItem('scriptura_users', JSON.stringify(state.users));
      } else {
        state.users = [];
      }
      
      renderUsersTable();
      populateDropdowns();
      renderLoginUsers();

      if (!isResolved) {
        isResolved = true;
        if (overlay) overlay.style.display = 'none';
      }
    }, error => {
      if (!isResolved) {
        isResolved = true;
        if (overlay) overlay.style.display = 'none';
      }
    });

    // 2. Listen to Deeds
    db.collection('deeds').onSnapshot(snapshot => {
      if (!snapshot.empty) {
        const deedsList = [];
        snapshot.forEach(doc => deedsList.push(doc.data()));
        state.deeds = deedsList;
        localStorage.setItem('scriptura_deeds', JSON.stringify(state.deeds));
      } else {
        state.deeds = [];
      }
      renderDeeds();
      populateDropdowns();
      updateMetrics();
    });

    // 3. Listen to Notes
    db.collection('notes').onSnapshot(snapshot => {
      if (!snapshot.empty) {
        const notesList = [];
        snapshot.forEach(doc => notesList.push(doc.data()));
        state.notes = notesList;
        localStorage.setItem('scriptura_notes', JSON.stringify(state.notes));
      } else {
        state.notes = [];
      }
      renderNotes();
      updateMetrics();
    });

    // 4. Listen to Calendar Events
    db.collection('events').onSnapshot(snapshot => {
      if (!snapshot.empty) {
        const eventsList = [];
        snapshot.forEach(doc => eventsList.push(doc.data()));
        state.events = eventsList;
        localStorage.setItem('scriptura_events', JSON.stringify(state.events));
      } else {
        state.events = [];
      }
      renderCalendar();
      renderEventsForSelectedDay();
    });

    // 5. Listen to Offices tags
    db.collection('config').doc('offices').onSnapshot(doc => {
      if (doc.exists) {
        state.offices = doc.data().list || ['Notaría 134', 'Notaría 160', 'Personal'];
        localStorage.setItem('scriptura_offices', JSON.stringify(state.offices));
        renderOfficeTags();
        populateDropdowns();
      }
    });
  } else {
    if (overlay) overlay.style.display = 'none';
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

  // PWA Local Notification (Free)
  if ('Notification' in window && Notification.permission === 'granted' && state.currentUser && state.currentUser.id !== assignedUser?.id) {
    new Notification(isNew ? 'Nueva Tarea Asignada' : 'Tarea Actualizada', {
      body: `${note.title} - ${assignedUser ? assignedUser.name : ''}`,
      icon: 'icon-192.png'
    });
  }

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
const loginUsersListContainer = document.getElementById('login-users-list-container');
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
  if (loginUsersListContainer) {
    loginUsersListContainer.innerHTML = '';
    const usersToRender = state.users.length > 0 ? state.users : DEFAULT_USERS;
    usersToRender.forEach(user => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'login-option';
      
      const isBoss = user.roles && user.roles.includes('boss');
      const roleName = isBoss ? 'Notario Público / Jefe' : (user.roles && user.roles.includes('personal') ? 'Personal' : 'Colaborador');
      
      btn.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:flex-start;">
          <span style="font-weight:700; font-size:15px;">${user.name}</span>
          <span style="font-size:11px; opacity:0.8; font-weight:500;">${roleName}</span>
        </div>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
      `;
      
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        loginNameInput.value = user.name;
        loginNameInput.dispatchEvent(new Event('input'));
      });
      loginUsersListContainer.appendChild(btn);
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
  const sdTask = document.getElementById('sd-task');
  
  if (user.roles && user.roles.includes('boss')) {
    if (navAdmin) navAdmin.style.display = 'flex';
    if (barAdmin) barAdmin.style.display = 'flex';
    if (sdTask) sdTask.style.display = 'flex';
  } else {
    if (navAdmin) navAdmin.style.display = 'none';
    if (barAdmin) barAdmin.style.display = 'none';
    if (sdTask) sdTask.style.display = 'none';
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
if (loginNameInput) {
  loginNameInput.addEventListener('input', (e) => {
    // Normalizar para quitar acentos (héctor -> hector)
    const rawVal = e.target.value.trim().toLowerCase();
    const val = rawVal.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    loginErrorMsg.style.display = 'none';
    if (val === 'hector' || val === 'hector omar' || val === 'hector omar lopez mora') {
      loginPasswordContainer.style.display = 'block';
      loginPwdInput.setAttribute('required', 'true');
    } else {
      loginPasswordContainer.style.display = 'none';
      loginPwdInput.removeAttribute('required');
      loginPwdInput.value = '';
    }
    
    // Filter visually the buttons if typing
    const buttons = loginUsersListContainer.querySelectorAll('.login-option');
    buttons.forEach(btn => {
      const btnText = btn.textContent.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (btnText.includes(val)) {
        btn.style.display = 'flex';
      } else {
        btn.style.display = 'none';
      }
    });
  });
}

// Login Form Submit
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameVal = loginNameInput.value.trim();
    const pwdVal = loginPwdInput.value.trim();
    
    let matchedUser = state.users.find(u => u.name.toLowerCase() === nameVal.toLowerCase());
    
    // Variaciones para el jefe (sin acentos)
    const cleanNameVal = nameVal.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const hectorVariations = ['hector', 'hector omar', 'hector omar lopez mora'];
    if (hectorVariations.includes(cleanNameVal)) {
      matchedUser = state.users.find(u => u.roles && u.roles.includes('boss'));
    }
    
    // Fallback if Firestore has not loaded/synced yet
    if (!matchedUser && state.users.length === 0) {
      if (hectorVariations.includes(cleanNameVal)) {
        matchedUser = DEFAULT_USERS.find(u => u.roles && u.roles.includes('boss'));
      } else {
        matchedUser = DEFAULT_USERS.find(u => u.name.toLowerCase() === nameVal.toLowerCase());
      }
    }
    
    if (!matchedUser) {
      loginErrorMsg.textContent = 'Usuario no registrado. Contacta al Administrador.';
      loginErrorMsg.style.display = 'block';
      return;
    }
    
    if (matchedUser.roles && matchedUser.roles.includes('boss')) {
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
}

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

  const filterBar = document.querySelector('.filter-bar');
  if (filterBar) {
    if (screenId === 'keep-screen') {
      filterBar.style.display = 'flex';
    } else {
      filterBar.style.display = 'none';
    }
  }

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
    globalFab.style.display = 'flex';
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
  
  // Premium rotation animation
  themeToggle.style.transform = `rotate(${state.theme === 'dark' ? '360deg' : '0deg'}) scale(1.15)`;
  setTimeout(() => themeToggle.style.transform = `rotate(${state.theme === 'dark' ? '360deg' : '0deg'}) scale(1)`, 250);
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
  
  const pendingTasks = state.notes.flatMap(n => n.checklist || []).filter(item => !item.done).length;
  document.getElementById('stat-tasks-count').textContent = pendingTasks;
  
  document.getElementById('stat-colabs-count').textContent = state.users.filter(u => !(u.roles || []).includes('boss')).length;

  const totalNotes = state.notes.length;
  const completedNotes = state.notes.filter(n => (n.checklist || []).length > 0 && (n.checklist || []).every(item => item.done)).length;
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
  const query = searchInput ? searchInput.value : '';
  renderNotes(query);
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
  const isBoss = state.currentUser && state.currentUser.roles && state.currentUser.roles.includes('boss');
  const filtered = state.notes.filter(note => {
    const matchesQuery = 
      (note.title || '').toLowerCase().includes(filterText.toLowerCase()) ||
      (note.checklist || []).some(item => (item.text || '').toLowerCase().includes(filterText.toLowerCase()));
      
    if (!matchesQuery) return false;
    
    // Auth filtering rules
    if (!isBoss) {
      if (Array.isArray(note.assignedTo)) {
        if (!note.assignedTo.includes(state.currentUser.id)) return false;
      } else {
        if (note.assignedTo !== state.currentUser.id) return false;
      }
    }

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
    
    const assignedUsers = Array.isArray(note.assignedTo) 
      ? note.assignedTo.map(id => state.users.find(u => u.id === id)).filter(Boolean)
      : [state.users.find(u => u.id === note.assignedTo)].filter(Boolean);
    const linkedDeed = state.deeds.find(d => d.id === note.deedId);
    
    let checklistHtml = '';
    let doneCount = 0;
    const checklistArr = note.checklist || [];
    checklistArr.forEach((item, index) => {
      if (item.done) doneCount++;
      checklistHtml += `
        <li class="checklist-item ${item.done ? 'done' : ''}" onclick="toggleChecklistItem(event, '${note.id}', ${index})">
          <input type="checkbox" ${item.done ? 'checked' : ''} style="pointer-events:none;">
          <span>${item.text}</span>
        </li>
      `;
    });

    const progressPercent = checklistArr.length > 0 ? (doneCount / checklistArr.length) * 100 : 0;

    const avatarsHtml = assignedUsers.length > 0 
      ? assignedUsers.map((u, i) => `<div class="assigned-avatar" style="border: 2px solid var(--md-sys-color-surface); margin-left: ${i > 0 ? '-10px' : '0'}; z-index: ${10-i};" title="${u.name}">${u.name.split(' ').map(n=>n[0]).join('').substring(0,2)}</div>`).join('')
      : '<div class="assigned-avatar">?</div>';

    card.innerHTML = `
      <div class="keep-card-header">
        <span class="keep-card-category">${note.office || 'General'} ${linkedDeed ? `• Esc. #${linkedDeed.number}` : ''}</span>
        <div class="card-action-dot">···</div>
      </div>
      <div class="keep-card-title">${note.title || '<em>Sin Título</em>'}</div>
      
      <div style="width:100%; height:4px; background-color:rgba(0,0,0,0.06); border-radius:var(--shape-full); overflow:hidden; margin-top:-4px;">
        <div style="width:${progressPercent}%; height:100%; background-color:var(--md-sys-color-primary); transition: width 0.3s ease;"></div>
      </div>

      <ul class="card-checklist">
        ${checklistHtml}
      </ul>

      <div class="card-footer">
        <div class="card-footer-info">
          <span class="card-footer-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${assignedUsers.length > 0 ? assignedUsers.map(u => u.name).join(', ') : 'Sin Asignar'}</span>
          <span class="card-footer-date">${note.date || 'Hoy'}</span>
        </div>
        <div class="assigned-avatars-container" style="display: flex;">
          ${avatarsHtml}
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (!e.target.closest('.checklist-item')) {
        if (isBoss) {
          openNoteModal(note);
        }
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
      <td>${u.roles && u.roles.includes('boss') ? 'Jefe / Notario' : (u.roles || []).join(', ')}</td>
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
    
    const assignedSelect = document.getElementById('note-assigned-input');
    Array.from(assignedSelect.options).forEach(opt => {
      opt.selected = Array.isArray(note.assignedTo) 
        ? note.assignedTo.includes(opt.value)
        : opt.value === note.assignedTo;
    });

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

    document.getElementById('note-comments-input').value = note.comments || '';
    document.getElementById('delete-note-btn').style.display = 'block';
  } else {
    document.getElementById('note-modal-title').textContent = 'Crear Nota / Tarea';
    document.getElementById('note-id').value = '';
    document.getElementById('note-comments-input').value = '';
    
    const assignedSelect = document.getElementById('note-assigned-input');
    Array.from(assignedSelect.options).forEach(opt => opt.selected = false);
    if (state.currentUser) {
      Array.from(assignedSelect.options).forEach(opt => {
        if(opt.value === state.currentUser.id) opt.selected = true;
      });
    }
  }
  
  const isPersonal = state.currentUser && state.currentUser.roles && state.currentUser.roles.includes('personal');
  const isBoss = state.currentUser && state.currentUser.roles && state.currentUser.roles.includes('boss');
  
  if (isPersonal || isBoss) {
    document.getElementById('note-comments-input').removeAttribute('disabled');
  } else {
    document.getElementById('note-comments-input').setAttribute('disabled', 'true');
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
    
    const roleSelect = document.getElementById('user-role-input');
    Array.from(roleSelect.options).forEach(opt => {
      opt.selected = user.roles ? user.roles.includes(opt.value) : false;
    });
  } else {
    document.getElementById('user-modal-title').textContent = 'Registrar Integrante / Colaborador';
    document.getElementById('user-id').value = '';
    const roleSelect = document.getElementById('user-role-input');
    Array.from(roleSelect.options).forEach(opt => opt.selected = false);
    roleSelect.options[0].selected = true; // colaborador default
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
  const assignedSelect = document.getElementById('note-assigned-input');
  const assignedTo = Array.from(assignedSelect.selectedOptions).map(opt => opt.value);
  const office = document.getElementById('note-office-input').value;
  const deedId = document.getElementById('note-deed-input').value;
  const comments = document.getElementById('note-comments-input').value;
  
  const selectedColorDot = document.querySelector('#modal-color-selector .color-dot.selected');
  const color = selectedColorDot ? selectedColorDot.getAttribute('data-color') : '1';

  const checklist = currentChecklistItems.filter(item => item.text.trim() !== '');

  // Borrar si está vacío
  if (title.trim() === '' && checklist.length === 0) {
    if (document.getElementById('note-id').value) {
      syncDelete('notes', id);
    }
    noteModal.classList.remove('active');
    return;
  }

  const today = new Date();
  const dateStr = `${today.getDate()}.${today.getMonth()+1}.${String(today.getFullYear()).slice(-2)}`;
  
  const matchedNote = state.notes.find(n => n.id === id);
  const date = matchedNote ? matchedNote.date : dateStr;

  const isNew = !matchedNote;

  // Preserve other properties if editing as Personal (so they don't overwrite title/checklist if they somehow hacked the UI)
  const isBoss = state.currentUser && state.currentUser.roles && state.currentUser.roles.includes('boss');
  let data = { id, title, assignedTo, office, deedId, color, checklist, date, comments };
  
  if (!isBoss && matchedNote) {
    data = { ...matchedNote, comments: comments }; // Only allow updating comments
  }

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
  const roleSelect = document.getElementById('user-role-input');
  const roles = Array.from(roleSelect.selectedOptions).map(opt => opt.value);

  const data = { id, name, roles, password };
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
  const isActive = speedDialMenu.classList.contains('active');
  
  if (isActive) {
    speedDialMenu.classList.remove('active');
    globalFab.style.transform = 'rotate(0deg)';
  } else {
    speedDialMenu.classList.add('active');
    globalFab.style.transform = 'rotate(45deg)';
  }
  globalFab.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
});

// Hide Speed Dial when clicking outside
document.addEventListener('click', () => {
  if (speedDialMenu) speedDialMenu.classList.remove('active');
  if (globalFab) globalFab.style.transform = 'rotate(0deg)';
});

// Global Trigger Speed Dial handler
window.triggerSpeedDial = function(screenId) {
  speedDialMenu.classList.remove('active');
  if (globalFab) globalFab.style.transform = 'rotate(0deg)';
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

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    renderDeeds(query);
    renderNotes(query);
  });
}

// --- Swipe Gestures for Mobile ---
let touchStartX = 0;
let touchEndX = 0;
const screenOrder = ['deeds-screen', 'keep-screen', 'calendar-screen', 'admin-screen'];

appContainer.addEventListener('touchstart', e => {
  // Ignore swipe if touching a modal or horizontal scroll
  if (e.target.closest('.modal-content') || e.target.closest('.user-table')) return;
  touchStartX = e.changedTouches[0].screenX;
}, {passive: true});

appContainer.addEventListener('touchend', e => {
  if (e.target.closest('.modal-content') || e.target.closest('.user-table')) return;
  touchEndX = e.changedTouches[0].screenX;
  handleSwipeGesture();
}, {passive: true});

function handleSwipeGesture() {
  const swipeThreshold = 60;
  if (Math.abs(touchEndX - touchStartX) > swipeThreshold) {
    const currentActive = document.querySelector('.screen.active');
    if (!currentActive) return;
    let currentIndex = screenOrder.indexOf(currentActive.id);
    
    if (touchEndX < touchStartX) {
      // Swipe left -> Next screen
      if (currentIndex < screenOrder.length - 1) {
        const isBossSwipe = state.currentUser?.roles && state.currentUser.roles.includes('boss');
        if (screenOrder[currentIndex + 1] === 'admin-screen' && !isBossSwipe) return;
        switchScreen(screenOrder[currentIndex + 1]);
      }
    } else if (touchEndX > touchStartX) {
      // Swipe right -> Prev screen
      if (currentIndex > 0) {
        switchScreen(screenOrder[currentIndex - 1]);
      }
    }
  }
}
// --------------------------------

function init() {
  if ('Notification' in window) {
    Notification.requestPermission();
  }
  
  const wipeBtn = document.getElementById('temp-wipe-btn');
  if (wipeBtn) {
    wipeBtn.addEventListener('click', () => {
      if (confirm('¿ESTÁS ABSOLUTAMENTE SEGURO? Esto borrará TODA la base de datos de Firebase (usuarios, tareas, etc.) de forma irreversible.')) {
        wipeBtn.textContent = 'Borrando...';
        wipeBtn.disabled = true;
        if (useFirebase) {
          const collections = ['users', 'deeds', 'notes', 'events'];
          let promises = [];
          collections.forEach(coll => {
            promises.push(db.collection(coll).get().then(snap => {
              const batch = db.batch();
              snap.forEach(doc => batch.delete(doc.ref));
              return batch.commit();
            }));
          });
          promises.push(db.collection('config').doc('offices').delete());
          
          Promise.all(promises).then(() => {
            localStorage.clear();
            alert('¡Base de datos borrada con éxito! Todo está en blanco de nuevo.');
            window.location.reload();
          }).catch(err => {
            console.error(err);
            alert('Hubo un error borrando la base de datos. Mira la consola.');
            wipeBtn.textContent = '⚠️ RESETEAR TODA LA BASE DE DATOS ⚠️';
            wipeBtn.disabled = false;
          });
        }
      }
    });
  }

  loadData();
  
  const logged = localStorage.getItem('scriptura_logged_user');
  if (logged) {
    const user = JSON.parse(logged);
    // Optimistic login: we assume the user exists to prevent flash of login screen.
    // If Firebase later explicitly removes them, the onSnapshot for users can handle it.
    
    // Asignamos al currentUser para que los renderizados no fallen
    state.currentUser = user;
    
    // Verificamos si existe en caché local (state.users ya cargado sincrónicamente)
    const localUser = state.users.find(u => u.id === user.id);
    
    // Usamos el usuario de caché si existe (por si cambió el rol localmente), sino el guardado
    performLogin(localUser || user);
  }
  
  applyTheme();
}

init();
