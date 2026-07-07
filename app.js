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
  notes: [],
  privateNotes: [],
  events: [], 
  offices: ['General', 'Urgente', 'Personal'], 
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
  const lPrivateNotes = localStorage.getItem('scriptura_private_notes');
  const lNotes = localStorage.getItem('scriptura_notes');
  const lEvents = localStorage.getItem('scriptura_events');
  const lOffices = localStorage.getItem('scriptura_offices');
  const lTheme = localStorage.getItem('scriptura_theme');

  state.users = lUsers ? JSON.parse(lUsers) : [];
  state.privateNotes = lPrivateNotes ? JSON.parse(lPrivateNotes) : [];
  state.notes = lNotes ? JSON.parse(lNotes) : [];
  state.events = lEvents ? JSON.parse(lEvents) : [];
  state.offices = lOffices ? JSON.parse(lOffices) : ['General', 'Urgente', 'Personal'];
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
      const usersList = [];
      if (!snapshot.empty) {
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.role && !data.roles) data.roles = [data.role];
          usersList.push(data);
        });
      }
      
      // Failsafe: Siempre asegurar que exista al menos un usuario jefe (admin)
      const bossInList = usersList.some(u => u.roles && u.roles.includes('boss'));
      if (!bossInList) {
        const bossUser = { id: 'boss', name: 'Hector Omar Lopez Mora', roles: ['boss'], password: '1234' };
        usersList.push(bossUser);
        db.collection('users').doc(bossUser.id).set(bossUser).catch(err => console.error(err));
      }

      state.users = usersList;
      localStorage.setItem('scriptura_users', JSON.stringify(state.users));
      
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

    // 2. Listen to Private Notes (Only for Boss)
    // We attach this conditionally or just listen and handle permissions via rules if any.
    // Assuming UI filters it or boss logs in. We can attach it globally, and if it fails due to permissions, it just logs warning.
    // Since there are no strict roles in this mock backend, we just listen to it.
    db.collection('private_notes').onSnapshot(snapshot => {
      if (!snapshot.empty) {
        const pNotesList = [];
        snapshot.forEach(doc => pNotesList.push(doc.data()));
        state.privateNotes = pNotesList;
        localStorage.setItem('scriptura_private_notes', JSON.stringify(state.privateNotes));
      } else {
        state.privateNotes = [];
      }
      renderPrivateNotes();
      updateMetrics();
    }, err => {
      console.warn("No permission to read private_notes or error:", err);
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
        state.offices = doc.data().list || ['General', 'Urgente', 'Personal'];
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
  } else if (collection === 'private_notes') {
    const index = state.privateNotes.findIndex(d => d.id === docId);
    if (index !== -1) state.privateNotes[index] = data;
    else state.privateNotes.push(data);
    renderPrivateNotes();
    localStorage.setItem('scriptura_private_notes', JSON.stringify(state.privateNotes));
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
  if (collection === 'users') {
    state.users = state.users.filter(u => u.id !== docId);
    renderUsersTable();
    populateDropdowns();
    renderLoginUsers();
    localStorage.setItem('scriptura_users', JSON.stringify(state.users));
  } else if (collection === 'private_notes') {
    state.privateNotes = state.privateNotes.filter(n => n.id !== docId);
    renderPrivateNotes();
    localStorage.setItem('scriptura_private_notes', JSON.stringify(state.privateNotes));
  } else if (collection === 'notes') {
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
  const checklistStr = note.checklist ? note.checklist.map(item => `- [${item.done ? 'x' : ' '}] ${item.text}`).join('\n') : '';

  const payload = {
    event: isNew ? 'task_assigned' : 'task_updated',
    task_id: note.id,
    title: note.title,
    assigned_name: assignedUser ? assignedUser.name : 'Sin Asignar',
    deed_number: 'N/A',
    deed_title: 'N/A',
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
const privateContainer = document.getElementById('private-container');
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
    const usersToRender = state.users;
    usersToRender.forEach((user, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'login-option';
      
      if (index >= 2) {
        btn.style.display = 'none';
      }
      
      const isBoss = user.roles && user.roles.includes('boss');
      const roleName = isBoss ? 'Administrador' : (user.roles && user.roles.includes('personal') ? 'Personal' : 'Colaborador');
      
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
  const navPrivate = document.getElementById('nav-private-btn');
  const barPrivate = document.getElementById('bar-switch-private');
  const sdPrivate = document.getElementById('sd-private');
  const sdTask = document.getElementById('sd-task');
  
  const isPrivileged = user.roles && user.roles.includes('boss');

  if (user.roles && user.roles.includes('boss')) {
    if (navAdmin) navAdmin.style.display = 'flex';
    if (barAdmin) barAdmin.style.display = 'flex';
    if (sdTask) sdTask.style.display = 'flex';
  } else {
    if (navAdmin) navAdmin.style.display = 'none';
    if (barAdmin) barAdmin.style.display = 'none';
    if (sdTask) sdTask.style.display = 'none'; // Only boss/personal create tasks? Wait, keep original logic for tasks
  }

  if (isPrivileged) {
    if (navPrivate) navPrivate.style.display = 'flex';
    if (barPrivate) barPrivate.style.display = 'flex';
    if (sdPrivate) sdPrivate.style.display = 'flex';
  } else {
    if (navPrivate) navPrivate.style.display = 'none';
    if (barPrivate) barPrivate.style.display = 'none';
    if (sdPrivate) sdPrivate.style.display = 'none';
  }

  if (isPrivileged) {
    switchScreen('private-screen');
  } else {
    switchScreen('keep-screen');
  }
  updateMetrics();
  renderPrivateNotes();
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
    
    let potentialUser = state.users.find(u => u.name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === val);
    const hectorVariations = ['hector', 'hector omar', 'hector omar lopez mora'];
    if (hectorVariations.includes(val)) {
      potentialUser = state.users.find(u => u.roles && u.roles.includes('boss')) || potentialUser;
    }
    
    if (potentialUser && potentialUser.password && potentialUser.password.trim() !== '') {
      loginPasswordContainer.style.display = 'block';
      loginPwdInput.setAttribute('required', 'true');
    } else {
      loginPasswordContainer.style.display = 'none';
      loginPwdInput.removeAttribute('required');
      loginPwdInput.value = '';
    }
    
    // Filter visually the buttons if typing
    const buttons = loginUsersListContainer.querySelectorAll('.login-option');
    buttons.forEach((btn, index) => {
      if (val === '') {
        btn.style.display = index < 2 ? 'flex' : 'none';
      } else {
        const btnText = btn.textContent.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (btnText.includes(val)) {
          btn.style.display = 'flex';
        } else {
          btn.style.display = 'none';
        }
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
    
    const cleanNameVal = nameVal.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let matchedUser = state.users.find(u => u.name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === cleanNameVal);
    
    // Variaciones para el jefe (sin acentos)
    const hectorVariations = ['hector', 'hector omar', 'hector omar lopez mora'];
    if (hectorVariations.includes(cleanNameVal)) {
      matchedUser = state.users.find(u => u.roles && u.roles.includes('boss')) || matchedUser;
    }
    
    // Eliminado el fallback local de DEFAULT_USERS.
    // Firebase ya maneja la carga y creación del jefe.
    
    if (!matchedUser) {
      loginErrorMsg.textContent = 'Usuario no registrado. Contacta al Administrador.';
      loginErrorMsg.style.display = 'block';
      return;
    }
    
    if (matchedUser.password && matchedUser.password.trim() !== '') {
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
  if (screenId === 'private-screen') {
    headerTitle.textContent = 'Pendientes Personales';
  } else if (screenId === 'keep-screen') {
    headerTitle.textContent = 'Tareas y Pendientes';
  } else if (screenId === 'calendar-screen') {
    headerTitle.textContent = 'Calendario de Actividades';
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
  
  // Old nav sync logic removed. Using floating-btn instead.

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
  if (screenId === 'private-screen') {
    document.getElementById('bar-switch-private').classList.add('active');
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

document.getElementById('bar-switch-private').addEventListener('click', () => switchScreen('private-screen'));
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

function updateMetrics() {
  const statPrivateCount = document.getElementById('stat-private-count');
  if (statPrivateCount) {
    statPrivateCount.textContent = state.privateNotes.length;
  }
  
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

// Render Private Notes (Boss only)
function renderPrivateNotes(filterText = '') {
  if (!privateContainer) return;
  privateContainer.innerHTML = '';
  
  const isBoss = state.currentUser && state.currentUser.roles && state.currentUser.roles.includes('boss');
  if (!isBoss) {
    privateContainer.innerHTML = `<div style="text-align:center; padding:48px; opacity:0.5; grid-column: 1/-1;">Acceso restringido.</div>`;
    return;
  }

  const filtered = state.privateNotes.filter(note => {
    return (note.title || '').toLowerCase().includes(filterText.toLowerCase()) ||
           (note.checklist || []).some(item => (item.text || '').toLowerCase().includes(filterText.toLowerCase()));
  });

  if (filtered.length === 0) {
    privateContainer.innerHTML = `<div style="text-align:center; padding:48px; opacity:0.5; grid-column: 1/-1;">No tienes pendientes privados.</div>`;
    return;
  }

  filtered.forEach(note => {
    const card = document.createElement('div');
    card.className = `keep-card`;
    if (note.color && note.color.startsWith('#')) {
      card.style.backgroundColor = note.color;
      card.style.color = '#ffffff'; // Assume dark background for custom colors or just use white text
    } else {
      card.classList.add(`card-color-${note.color || '1'}`);
    }
    
    let checklistHtml = '';
    let doneCount = 0;
    const checklistArr = note.checklist || [];
    checklistArr.forEach((item, index) => {
      if (item.done) doneCount++;
      checklistHtml += `
        <li class="checklist-item ${item.done ? 'done' : ''}" onclick="togglePrivateChecklistItem(event, '${note.id}', ${index})">
          <input type="checkbox" ${item.done ? 'checked' : ''} style="pointer-events:none;">
          <span>${item.text}</span>
        </li>
      `;
    });

    const progressPercent = checklistArr.length > 0 ? (doneCount / checklistArr.length) * 100 : 0;

    card.innerHTML = `
      <div class="keep-card-header">
        <span class="keep-card-category">Pendiente Privado</span>
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
          <span class="card-footer-name">Solo Administrador</span>
          <span class="card-footer-date">${note.date || 'Hoy'}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (!e.target.closest('.checklist-item')) {
        openNoteModal(note, true);
      }
    });

    privateContainer.appendChild(card);
  });
}

function togglePrivateChecklistItem(e, noteId, index) {
  e.stopPropagation();
  const note = state.privateNotes.find(n => n.id === noteId);
  if (note) {
    note.checklist[index].done = !note.checklist[index].done;
    syncSave('private_notes', noteId, note);
  }
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
    card.className = `keep-card`;
    if (note.color && note.color.startsWith('#')) {
      card.style.backgroundColor = note.color;
      card.style.color = '#ffffff';
    } else {
      card.classList.add(`card-color-${note.color || '1'}`);
    }
    
    const assignedUsers = Array.isArray(note.assignedTo) 
      ? note.assignedTo.map(id => state.users.find(u => u.id === id)).filter(Boolean)
      : [state.users.find(u => u.id === note.assignedTo)].filter(Boolean);
    
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
        <span class="keep-card-category">${note.office || 'General'}</span>
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
      <td>${u.roles && u.roles.includes('boss') ? 'Administrador' : (u.roles || []).join(', ')}</td>
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
    
    const sDate = state.selectedCalendarDate;
    const selectedDateStr = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}-${String(sDate.getDate()).padStart(2, '0')}`;
    
    if (thisDateStr === selectedDateStr) {
      cell.classList.add('active');
    }

    const tDate = new Date();
    const todayStr = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}-${String(tDate.getDate()).padStart(2, '0')}`;
    
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
  
  const sDate = state.selectedCalendarDate;
  const selectedStr = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}-${String(sDate.getDate()).padStart(2, '0')}`;
  const formattedDay = `${sDate.getDate()} de ${MONTHS_SPANISH[sDate.getMonth()]}`;
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
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="event-item-time">${evt.time ? evt.time + ' hrs' : 'Todo el día'}</span>
        ${evt.isPrivate ? `<span style="font-size: 11px; padding:2px 8px; border-radius:var(--shape-small); background-color: var(--md-sys-color-error-container); color: var(--md-sys-color-on-error-container);">Privado</span>` : ''}
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
let currentCommentsList = [];

let currentNoteIsPrivate = false;

function openNoteModal(note = null, isPrivate = false) {
  currentNoteIsPrivate = isPrivate;
  noteForm.reset();
  const searchInput = document.getElementById('note-user-search');
  if (searchInput) searchInput.value = '';
  currentChecklistItems = [];
  
  document.querySelectorAll('#modal-color-selector .color-dot').forEach(dot => dot.classList.remove('selected'));
  document.querySelector('#modal-color-selector .color-dot[data-color="1"]').classList.add('selected');
  document.getElementById('delete-note-btn').style.display = 'none';

  if (note) {
    document.getElementById('note-modal-title').textContent = 'Editar Nota / Tarea';
    document.getElementById('note-id').value = note.id;
    document.getElementById('note-title-input').value = note.title;
    
    const assignedContainer = document.getElementById('note-assigned-input');
    let visibleCount = 0;
    assignedContainer.querySelectorAll('.user-badge').forEach((badge, idx) => {
      const uid = badge.getAttribute('data-uid');
      if (Array.isArray(note.assignedTo) ? note.assignedTo.includes(uid) : uid === note.assignedTo) {
        badge.classList.add('selected');
      } else {
        badge.classList.remove('selected');
      }
      
      // Make sure selected or first 3 are visible
      if (badge.classList.contains('selected') || visibleCount < 3) {
        badge.style.display = 'flex';
        if (!badge.classList.contains('selected')) visibleCount++;
      } else {
        badge.style.display = 'none';
      }
    });

    document.getElementById('note-office-input').value = note.office || '';
    document.getElementById('note-date-input').value = note.date || '';
    document.getElementById('note-add-calendar').checked = false;
    
    currentChecklistItems = [...note.checklist.map(item => ({...item}))];
    
    document.querySelectorAll('#modal-color-selector .color-dot').forEach(dot => {
      if (note.color && note.color.startsWith('#')) {
        dot.classList.remove('selected');
        if (dot.classList.contains('custom-color-dot')) {
          dot.classList.add('selected');
          dot.style.backgroundColor = note.color;
          document.getElementById('note-custom-color').value = note.color;
        }
      } else if (dot.getAttribute('data-color') === note.color) {
        dot.classList.add('selected');
      } else {
        dot.classList.remove('selected');
      }
    });

    if (note.commentsList) {
      currentCommentsList = [...note.commentsList];
    } else if (note.comments) {
      currentCommentsList = [{ text: note.comments, authorName: 'Sistema', role: 'system', timestamp: Date.now() }];
    }
    renderCommentsList();
    document.getElementById('delete-note-btn').style.display = 'block';
  } else {
    document.getElementById('note-id').value = '';
    document.getElementById('note-date-input').value = '';
    document.getElementById('note-date-input').value = '';
    document.getElementById('note-add-calendar').checked = false;
    currentCommentsList = [];
    renderCommentsList();
    
    const assignedContainer = document.getElementById('note-assigned-input');
    let visibleCount = 0;
    assignedContainer.querySelectorAll('.user-badge').forEach(badge => badge.classList.remove('selected'));
    if (state.currentUser) {
      assignedContainer.querySelectorAll('.user-badge').forEach(badge => {
        if(badge.getAttribute('data-uid') === state.currentUser.id) badge.classList.add('selected');
      });
    }
    
    assignedContainer.querySelectorAll('.user-badge').forEach((badge, idx) => {
      if (badge.classList.contains('selected') || visibleCount < 3) {
        badge.style.display = 'flex';
        if (!badge.classList.contains('selected')) visibleCount++;
      } else {
        badge.style.display = 'none';
      }
    });
  }

  // Hide assignment if private note
  if (isPrivate) {
    document.getElementById('note-assign-wrapper').style.display = 'none';
  } else {
    document.getElementById('note-assign-wrapper').style.display = 'flex';
  }
  
  const isPersonal = state.currentUser && state.currentUser.roles && state.currentUser.roles.includes('personal');
  const isBoss = state.currentUser && state.currentUser.roles && state.currentUser.roles.includes('boss');
  
  if (isPersonal || isBoss) {
    document.getElementById('note-comment-new-container').style.display = 'flex';
  } else {
    document.getElementById('note-comment-new-container').style.display = 'none';
  }

  renderModalChecklist();
  noteModal.classList.add('active');
}

function renderCommentsList() {
  const container = document.getElementById('note-comments-list');
  container.innerHTML = '';
  if (currentCommentsList.length === 0) {
    container.innerHTML = '<span style="opacity:0.5; font-size:13px; text-align:center;">No hay sugerencias aún...</span>';
    return;
  }
  
  currentCommentsList.forEach(c => {
    const bubble = document.createElement('div');
    const isBoss = c.role === 'boss';
    bubble.style.padding = '8px 12px';
    bubble.style.borderRadius = 'var(--shape-medium)';
    bubble.style.marginBottom = '4px';
    bubble.style.fontSize = '13px';
    
    if (isBoss) {
      bubble.style.backgroundColor = 'var(--md-sys-color-primary)';
      bubble.style.color = 'var(--md-sys-color-on-primary)';
      bubble.style.alignSelf = 'flex-end';
      bubble.style.borderBottomRightRadius = '4px';
    } else {
      bubble.style.backgroundColor = 'var(--md-sys-color-secondary-container)';
      bubble.style.color = 'var(--md-sys-color-on-secondary-container)';
      bubble.style.alignSelf = 'flex-start';
      bubble.style.borderBottomLeftRadius = '4px';
    }
    
    const timeStr = new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    bubble.innerHTML = `
      <div style="font-weight:700; font-size:11px; margin-bottom:2px; opacity:0.8;">${c.authorName} • ${timeStr}</div>
      <div>${c.text}</div>
    `;
    container.appendChild(bubble);
  });
  container.scrollTop = container.scrollHeight;
}

document.getElementById('note-comment-add-btn').addEventListener('click', () => {
  const input = document.getElementById('note-comment-new-input');
  const text = input.value.trim();
  if (text) {
    const role = state.currentUser.roles.includes('boss') ? 'boss' : 'personal';
    currentCommentsList.push({
      text: text,
      authorName: state.currentUser.name,
      role: role,
      timestamp: Date.now()
    });
    input.value = '';
    renderCommentsList();
  }
});

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
    
    // Solo permitir eliminar si no es el jefe
    if (user.roles && user.roles.includes('boss')) {
      document.getElementById('delete-user-btn').style.display = 'none';
    } else {
      document.getElementById('delete-user-btn').style.display = 'block';
    }
  } else {
    document.getElementById('user-modal-title').textContent = 'Registrar Integrante / Colaborador';
    document.getElementById('user-id').value = '';
    document.getElementById('delete-user-btn').style.display = 'none';
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
    document.getElementById('event-time-input').value = evt.time || '';
    document.getElementById('event-privacy-input').value = evt.isPrivate ? 'private' : 'public';
    document.getElementById('event-desc-input').value = evt.desc || '';
    document.getElementById('delete-event-btn').style.display = 'block';
  } else {
    document.getElementById('event-modal-title').textContent = 'Nueva Cita / Firma';
    document.getElementById('event-id').value = '';
    const sDate = state.selectedCalendarDate;
    const selectedDateStr = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}-${String(sDate.getDate()).padStart(2, '0')}`;
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

document.querySelectorAll('#modal-color-selector .color-dot:not(.custom-color-dot)').forEach(dot => {
  dot.addEventListener('click', () => {
    document.querySelectorAll('#modal-color-selector .color-dot').forEach(d => d.classList.remove('selected'));
    dot.classList.add('selected');
  });
});

document.getElementById('note-custom-color').addEventListener('input', (e) => {
  document.querySelectorAll('#modal-color-selector .color-dot').forEach(d => d.classList.remove('selected'));
  const customDot = document.querySelector('.custom-color-dot');
  customDot.classList.add('selected');
  customDot.style.backgroundColor = e.target.value;
  customDot.style.color = '#fff';
});

noteForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('note-id').value || 'n_' + Date.now();
  const title = document.getElementById('note-title-input').value;
  const assignedContainer = document.getElementById('note-assigned-input');
  const assignedTo = currentNoteIsPrivate ? [state.currentUser.id] : Array.from(assignedContainer.querySelectorAll('.user-badge.selected')).map(b => b.getAttribute('data-uid'));
  const office = document.getElementById('note-office-input').value;
  const noteDate = document.getElementById('note-date-input').value;
  const addCalendar = document.getElementById('note-add-calendar').checked;
  
  const customColorInput = document.getElementById('note-custom-color');
  const customColorDot = document.querySelector('.custom-color-dot');
  let color = '1';
  if (customColorDot && customColorDot.classList.contains('selected')) {
    color = customColorInput.value;
  } else {
    const selectedColorDot = document.querySelector('#modal-color-selector .color-dot.selected');
    if (selectedColorDot) color = selectedColorDot.getAttribute('data-color');
  }

  const checklist = currentChecklistItems.filter(item => item.text.trim() !== '');

  // Borrar si está vacío
  if (title.trim() === '' && checklist.length === 0) {
    if (document.getElementById('note-id').value) {
      if (currentNoteIsPrivate) syncDelete('private_notes', id);
      else syncDelete('notes', id);
    }
    noteModal.classList.remove('active');
    return;
  }

  const today = new Date();
  const dateStr = noteDate ? noteDate : `${today.getDate()}.${today.getMonth()+1}.${String(today.getFullYear()).slice(-2)}`;
  
  const targetCollection = currentNoteIsPrivate ? state.privateNotes : state.notes;
  const matchedNote = targetCollection.find(n => n.id === id);
  const date = matchedNote && !noteDate ? matchedNote.date : dateStr;

  const isNew = !matchedNote;
  const isBoss = state.currentUser && state.currentUser.roles && state.currentUser.roles.includes('boss');
  let data = { id, title, assignedTo, office, color, checklist, date, commentsList: currentCommentsList };
  
  if (!isBoss && matchedNote) {
    data = { ...matchedNote, commentsList: currentCommentsList }; // Solo permite agregar comentarios a staff
  }

  if (currentNoteIsPrivate) {
    syncSave('private_notes', id, data);
  } else {
    syncSave('notes', id, data);
    triggerNotification(data, isNew);
  }

  if (addCalendar && noteDate) {
    const eventId = 'e_' + Date.now();
    const eventData = { 
      id: eventId, 
      title: title || 'Tarea: ' + checklist[0]?.text, 
      date: noteDate, 
      time: '', 
      desc: currentCommentsList.map(c => c.text).join('\\n'),
      isPrivate: currentNoteIsPrivate 
    };
    syncSave('events', eventId, eventData);
  }

  noteModal.classList.remove('active');
});

document.getElementById('delete-note-btn').addEventListener('click', () => {
  const id = document.getElementById('note-id').value;
  if (id) {
    if (currentNoteIsPrivate) syncDelete('private_notes', id);
    else syncDelete('notes', id);
    noteModal.classList.remove('active');
  }
});

userForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('user-id').value || 'u_' + Date.now();
  const name = document.getElementById('user-name-input').value.trim();
  const password = document.getElementById('user-password-input').value;
  const roleSelect = document.getElementById('user-role-input');
  const roles = Array.from(roleSelect.selectedOptions).map(opt => opt.value);

  const data = { id, name, roles, password };
  syncSave('users', id, data);
  userModal.classList.remove('active');
});

document.getElementById('delete-user-btn').addEventListener('click', () => {
  const id = document.getElementById('user-id').value;
  if (id) {
    if (confirm('¿Estás seguro de eliminar a este colaborador? Ya no podrá acceder al sistema.')) {
      syncDelete('users', id);
      userModal.classList.remove('active');
    }
  }
});

eventForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('event-id').value || 'e_' + Date.now();
  const title = document.getElementById('event-title-input').value;
  const date = document.getElementById('event-date-input').value;
  const time = document.getElementById('event-time-input').value;
  const isPrivate = document.getElementById('event-privacy-input').value === 'private';
  const desc = document.getElementById('event-desc-input').value;

  const data = { id, title, date, time, isPrivate, desc };
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
  const assignContainer = document.getElementById('note-assigned-input');
  if (assignContainer) {
    assignContainer.innerHTML = '';
    state.users.forEach((u, index) => {
      const badge = document.createElement('div');
      badge.className = 'user-badge';
      badge.setAttribute('data-uid', u.id);
      // Solo mostrar los primeros 3 al inicio
      if (index >= 3) badge.style.display = 'none';
      badge.innerHTML = `
        <div class="user-badge-avatar">${u.name.charAt(0).toUpperCase()}</div>
        <span class="user-badge-name">${u.name}</span>
      `;
      badge.addEventListener('click', () => {
        badge.classList.toggle('selected');
      });
      assignContainer.appendChild(badge);
    });
    
    // Add search listener
    const searchInput = document.getElementById('note-user-search');
    if (searchInput && !searchInput.hasAttribute('data-bound')) {
      searchInput.setAttribute('data-bound', 'true');
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const badges = assignContainer.querySelectorAll('.user-badge');
        let visibleCount = 0;
        badges.forEach(b => {
          const name = b.querySelector('.user-badge-name').textContent.toLowerCase();
          if (query.trim() === '') {
            // Sin query, vuelve a mostrar los 3 primeros (si no están seleccionados)
            if (visibleCount < 3 || b.classList.contains('selected')) {
              b.style.display = 'flex';
              visibleCount++;
            } else {
              b.style.display = 'none';
            }
          } else {
            if (name.includes(query) || b.classList.contains('selected')) {
              b.style.display = 'flex';
            } else {
              b.style.display = 'none';
            }
          }
        });
      });
    }
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

  // Removing deedSelects population logic as deeds are gone
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
  if (screenId === 'private-screen') {
    openNoteModal(null, true);
  } else if (screenId === 'keep-screen') {
    openNoteModal();
  } else if (screenId === 'calendar-screen') {
    openEventModal();
  }
};

// Wire Speed Dial actions directly
document.getElementById('sd-private').addEventListener('click', () => triggerSpeedDial('private-screen'));
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
    renderPrivateNotes(query);
    renderNotes(query);
  });
}

// --- Swipe Gestures for Mobile ---
let touchStartX = 0;
let touchEndX = 0;
const screenOrder = ['private-screen', 'keep-screen', 'calendar-screen', 'admin-screen'];

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
