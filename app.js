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

// EmailJS Configuration (Free background emails)
const EMAILJS_CONFIG = {
  serviceId: "service_ktf1gtr",     // Actualizado con el ID de tu captura
  templateId: "template_1ue91mn",   // ID de tu plantilla provista
  publicKey: "wVYfLABXRbFd3u0tD",   // Tu Public Key provista
  privateKey: "yT9eSMreDG1rehFWjgOFx" // Guardado por referencia
};

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
  selectedCalendarDate: new Date(),
  emailStats: { sentCount: 3, lastResetMonthYear: "" }
};

function checkAndResetEmailStats() {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonthYear = `${today.getMonth() + 1}-${today.getFullYear()}`;
  
  if (state.emailStats.lastResetMonthYear !== currentMonthYear && currentDay >= 13) {
    state.emailStats.sentCount = 0;
    state.emailStats.lastResetMonthYear = currentMonthYear;
    
    localStorage.setItem('scriptura_email_stats', JSON.stringify(state.emailStats));
    if (useFirebase) {
      db.collection('config').doc('email_stats').set(state.emailStats);
    }
  }
}

function renderEmailTracker() {
  const container = document.getElementById('email-tracker-container');
  if (!container) return;

  const isBoss = state.currentUser && state.currentUser.roles && state.currentUser.roles.includes('boss');
  if (!isBoss) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  
  const stats = state.emailStats || { sentCount: 3, lastResetMonthYear: "" };
  const limit = 200;
  const count = stats.sentCount || 0;
  const percent = Math.min((count / limit) * 100, 100);

  const today = new Date();
  let resetMonth = today.getMonth();
  let resetYear = today.getFullYear();
  if (today.getDate() >= 13) {
    resetMonth++;
    if (resetMonth > 11) {
      resetMonth = 0;
      resetYear++;
    }
  }
  const MONTHS_SPANISH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const resetDateStr = `${13} de ${MONTHS_SPANISH_SHORT[resetMonth]}`;

  const isExceeded = count >= limit;

  container.innerHTML = `
    <div class="admin-card" style="padding: 20px; background-color: var(--md-sys-color-surface-variant); border-radius: 12px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-weight: 700; font-size: 15px;">Uso de Notificaciones por Correo</span>
        <span style="font-weight: 700; font-size: 14px; color: ${isExceeded ? 'var(--md-sys-color-error)' : 'inherit'};">${count}/${limit}</span>
      </div>
      <div style="width: 100%; height: 8px; background-color: rgba(0,0,0,0.06); border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
        <div style="width: ${percent}%; height: 100%; background-color: ${isExceeded ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-primary)'}; transition: width 0.3s ease; border-radius: 4px;"></div>
      </div>
      <div style="font-size: 11px; opacity: 0.7; margin-bottom: 12px; font-weight: 600;">Se restablece el día 13 del mes (${resetDateStr})</div>
      
      ${isExceeded ? `
        <div style="font-size: 13px; color: var(--md-sys-color-error); font-weight: 600; line-height: 1.4; margin-bottom: 16px; padding: 10px; background-color: rgba(255, 180, 171, 0.15); border-radius: 8px; border-left: 4px solid var(--md-sys-color-error);">
          ⚠️ Tus usuarios siguen recibiendo sus tareas desde su app, pero ya no tienen notificaciones por correo.
        </div>
      ` : ''}

      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 13px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.05);">
        <span style="opacity: 0.85; font-weight: 500;">Cotiza tu límite de correos para tener más capacidad:</span>
        <a href="https://api.whatsapp.com/send?phone=525543508612&text=Hola,%20me%20gustar%C3%ADa%20cotizar%20m%C3%A1s%20capacidad%20de%20correos%20para%20Scriptura." target="_blank" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 12px; border-radius: 20px; text-decoration: none; background-color: #25d366; border-color: #25d366; color: white; font-weight: 600;">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="vertical-align: middle;"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.059-3.486l.332.197c1.7.1 3.57.502 5.09.503 5.485 0 9.948-4.414 9.95-9.848.002-2.634-1.02-5.109-2.879-6.97C16.75 2.535 14.28 1.511 11.65 1.51c-5.487 0-9.953 4.414-9.956 9.848a9.789 9.789 0 0 0 1.523 5.176l.217.346L2.43 20.916l4.285-1.12c.001-.001.001-.001 0 0zM17.848 14.39c-.314-.157-1.86-.92-2.148-1.025-.289-.105-.499-.157-.709.157-.21.314-.813 1.025-.996 1.235-.183.21-.366.236-.68.079-1.353-.679-2.222-1.258-3.08-2.733-.183-.314-.183-.509-.026-.666.141-.141.314-.366.471-.549.157-.183.21-.314.314-.523.105-.21.052-.393-.026-.549-.079-.157-.709-1.71-.971-2.338-.255-.615-.515-.532-.709-.542-.183-.01-.393-.01-.603-.01-.21 0-.55.079-.838.393-.289.314-1.102 1.077-1.102 2.626 0 1.549 1.127 3.045 1.284 3.255.157.21 2.217 3.398 5.372 4.764.75.325 1.336.52 1.79.664.755.24 1.442.207 1.985.126.607-.09 1.86-.759 2.122-1.464.262-.705.262-1.307.183-1.432-.079-.126-.289-.21-.603-.367z"/></svg>
          Cotizar en WhatsApp
        </a>
      </div>
    </div>
  `;
}

// Data Synchronizer (LocalStorage + Firebase)
function loadData() {
  const overlay = document.getElementById('skeleton-loader-overlay');
  if (overlay) overlay.style.display = 'flex';

  const lUsers = localStorage.getItem('scriptura_users');
  const lPrivateNotes = localStorage.getItem('scriptura_private_notes');
  const lNotes = localStorage.getItem('scriptura_notes');
  const lEvents = localStorage.getItem('scriptura_events');
  const lEmailStats = localStorage.getItem('scriptura_email_stats');
  
  state.emailStats = lEmailStats ? JSON.parse(lEmailStats) : { sentCount: 3, lastResetMonthYear: "7-2026" };
  checkAndResetEmailStats();
  renderEmailTracker();
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

    // 6. Listen to Email Stats config
    db.collection('config').doc('email_stats').onSnapshot(doc => {
      if (doc.exists) {
        state.emailStats = doc.data();
        localStorage.setItem('scriptura_email_stats', JSON.stringify(state.emailStats));
        checkAndResetEmailStats();
        renderEmailTracker();
      } else {
        const initialStats = { sentCount: 3, lastResetMonthYear: "7-2026" };
        db.collection('config').doc('email_stats').set(initialStats);
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

// Trigger Make Webhook and EmailJS notifications
function triggerNotification(note, isNew = true) {
  const assignedUsers = Array.isArray(note.assignedTo) 
    ? note.assignedTo.map(id => state.users.find(u => u.id === id)).filter(Boolean)
    : [state.users.find(u => u.id === note.assignedTo)].filter(Boolean);

  const mainAssigned = assignedUsers[0];

  // PWA Local Notification (Free)
  if ('Notification' in window && Notification.permission === 'granted' && state.currentUser && (!mainAssigned || state.currentUser.id !== mainAssigned.id)) {
    new Notification(isNew ? 'Nueva Tarea Asignada' : 'Tarea Actualizada', {
      body: `${note.title} - ${mainAssigned ? mainAssigned.name : ''}`,
      icon: 'icon-192.png'
    });
  }

  // Trigger EmailJS Notification (Free Email)
  sendEmailJSNotification(note, isNew);

  // Trigger Make Webhook (Optional/Legacy)
  if (WEBHOOK_URL && !WEBHOOK_URL.includes("YOUR_MAKE")) {
    const checklistStr = note.checklist ? note.checklist.map(item => `- [${item.done ? 'x' : ' '}] ${item.text}`).join('\n') : '';
    const payload = {
      event: isNew ? 'task_assigned' : 'task_updated',
      task_id: note.id,
      title: note.title,
      assigned_name: mainAssigned ? mainAssigned.name : 'Sin Asignar',
      deed_number: 'N/A',
      deed_title: 'N/A',
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
}

// Send Email Notification via EmailJS REST API
function sendEmailJSNotification(note, isNew = true) {
  if (!EMAILJS_CONFIG.serviceId || EMAILJS_CONFIG.serviceId.includes("YOUR_SERVICE")) return;

  const currentCount = state.emailStats.sentCount || 0;
  if (currentCount >= 200) {
    console.log("Email limit reached, skipping EmailJS call.");
    return;
  }

  const assignedUsers = Array.isArray(note.assignedTo) 
    ? note.assignedTo.map(id => state.users.find(u => u.id === id)).filter(Boolean)
    : [state.users.find(u => u.id === note.assignedTo)].filter(Boolean);

  assignedUsers.forEach(user => {
    if (!user.email) return;

    // A Héctor no le llegan correos a menos que un tercero (ej. personal) le asigne la tarea
    const isHector = user.id === 'boss' || (user.roles && user.roles.includes('boss'));
    const isHectorEditing = state.currentUser && (state.currentUser.id === 'boss' || (state.currentUser.roles && state.currentUser.roles.includes('boss')));
    if (isHector && isHectorEditing) {
      return; // Ignorar el correo si el propio Héctor realiza el cambio
    }

    const checklistStr = note.checklist && note.checklist.length > 0
      ? note.checklist.map(item => `${item.done ? '✓' : '✗'} ${item.text}`).join('\n')
      : 'Sin checklist';
      
    const priorityLabel = note.priority === 'high' ? 'Alta 🔴' : (note.priority === 'medium' ? 'Media 🟡' : 'Baja 🟢');

    const payload = {
      service_id: EMAILJS_CONFIG.serviceId,
      template_id: EMAILJS_CONFIG.templateId,
      user_id: EMAILJS_CONFIG.publicKey,
      template_params: {
        to_email: user.email,
        to_name: user.name,
        task_title: note.title || 'Sin Título',
        task_office: note.office || 'General',
        task_priority: priorityLabel,
        task_date: note.date || 'Hoy',
        task_checklist: checklistStr,
        editor_name: state.currentUser ? state.currentUser.name : 'Sistema',
        action_type: isNew ? 'asignado una nueva tarea' : 'actualizado un pendiente'
      }
    };

    fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(res => {
      if (res.ok) {
        console.log(`Email notification sent successfully to ${user.name}`);
        state.emailStats.sentCount = (state.emailStats.sentCount || 0) + 1;
        localStorage.setItem('scriptura_email_stats', JSON.stringify(state.emailStats));
        renderEmailTracker();
        if (useFirebase) {
          db.collection('config').doc('email_stats').set(state.emailStats);
        }
      } else {
        console.error(`Failed to send EmailJS notification:`, res.statusText);
      }
    })
    .catch(err => console.error('Error sending EmailJS notification:', err));
  });
}

// Enviar aviso de Calendario por Correo a Héctor si lo agenda el personal
function sendCalendarEventEmail(eventData) {
  const isPersonalUser = state.currentUser && state.currentUser.roles && state.currentUser.roles.includes('personal');
  if (!isPersonalUser) return;

  const hector = state.users.find(u => u.id === 'boss' || (u.roles && u.roles.includes('boss')));
  if (!hector || !hector.email) return;

  if (!EMAILJS_CONFIG.serviceId || EMAILJS_CONFIG.serviceId.includes("YOUR_SERVICE")) return;

  const currentCount = state.emailStats.sentCount || 0;
  if (currentCount >= 200) {
    console.log("Email limit reached, skipping calendar event email notification.");
    return;
  }

  const payload = {
    service_id: EMAILJS_CONFIG.serviceId,
    template_id: EMAILJS_CONFIG.templateId,
    user_id: EMAILJS_CONFIG.publicKey,
    template_params: {
      to_email: hector.email,
      to_name: hector.name,
      task_title: `Evento: ${eventData.title}`,
      task_office: eventData.isPrivate ? 'Privado (Solo Admin)' : 'Público',
      task_priority: 'Calendario 📅',
      task_date: `${eventData.date} ${eventData.time || ''}`,
      task_checklist: eventData.desc || 'Sin descripción',
      editor_name: state.currentUser.name,
      action_type: 'creado un nuevo evento en tu calendario'
    }
  };

  fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => {
    if (res.ok) {
      console.log(`Calendar event email sent successfully to Hector`);
      state.emailStats.sentCount = (state.emailStats.sentCount || 0) + 1;
      localStorage.setItem('scriptura_email_stats', JSON.stringify(state.emailStats));
      renderEmailTracker();
      if (useFirebase) {
        db.collection('config').doc('email_stats').set(state.emailStats);
      }
    } else {
      console.error(`Failed to send EmailJS calendar notification to Hector:`, res.statusText);
    }
  })
  .catch(err => console.error('Error sending calendar email to Hector:', err));
}

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app-container');
const privateContainer = document.getElementById('private-container');
const notesContainer = document.getElementById('notes-container');
const usersTableBody = document.getElementById('users-table-body');
const searchInput = document.getElementById('global-search-input');
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
  const sdEvent = document.getElementById('sd-event');
  const addEventBtn = document.getElementById('add-event-btn');
  
  const userRoles = user.roles || [user.role];
  const isBoss = userRoles.includes('boss');
  const isPersonal = userRoles.includes('personal');
  const canCreateGeneral = isBoss || isPersonal;

  if (isBoss) {
    if (navAdmin) navAdmin.style.display = 'flex';
    if (barAdmin) barAdmin.style.display = 'flex';
  } else {
    if (navAdmin) navAdmin.style.display = 'none';
    if (barAdmin) barAdmin.style.display = 'none';
  }

  if (isBoss) {
    if (navPrivate) navPrivate.style.display = 'flex';
    if (barPrivate) barPrivate.style.display = 'flex';
    if (sdPrivate) sdPrivate.style.display = 'flex';
  } else {
    if (navPrivate) navPrivate.style.display = 'none';
    if (barPrivate) barPrivate.style.display = 'none';
    if (sdPrivate) sdPrivate.style.display = 'none';
  }
  
  if (canCreateGeneral) {
    if (sdTask) sdTask.style.display = 'flex';
    if (sdEvent) sdEvent.style.display = 'flex';
    if (addEventBtn) addEventBtn.style.display = 'block';
  } else {
    if (sdTask) sdTask.style.display = 'none';
    if (sdEvent) sdEvent.style.display = 'none';
    if (addEventBtn) addEventBtn.style.display = 'none';
  }

  if (isBoss) {
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
  renderEmailTracker();
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
  
  const isBoss = state.currentUser && state.currentUser.roles && state.currentUser.roles.includes('boss');
  
  let visibleNotes = state.notes;
  if (!isBoss && state.currentUser) {
    visibleNotes = state.notes.filter(note => {
      if (Array.isArray(note.assignedTo)) {
        return note.assignedTo.includes(state.currentUser.id);
      }
      return note.assignedTo === state.currentUser.id;
    });
  }
  
  const pendingTasks = visibleNotes.flatMap(n => n.checklist || []).filter(item => !item.done).length;
  document.getElementById('stat-tasks-count').textContent = pendingTasks;
  
  document.getElementById('stat-colabs-count').textContent = state.users.filter(u => !(u.roles || []).includes('boss')).length;

  const totalNotes = visibleNotes.length;
  const completedNotes = visibleNotes.filter(n => (n.checklist || []).length > 0 && (n.checklist || []).every(item => item.done)).length;
  const inProgressNotes = totalNotes - completedNotes;
  const personalNotes = visibleNotes.filter(n => n.office === 'Personal').length;

  document.getElementById('badge-all').textContent = totalNotes;
  document.getElementById('badge-pending').textContent = inProgressNotes;
  document.getElementById('badge-completed').textContent = completedNotes;
  document.getElementById('badge-personal').textContent = personalNotes;
  
  const filterPersonalBtn = document.getElementById('filter-personal');
  if (filterPersonalBtn) {
    filterPersonalBtn.style.display = isBoss ? 'inline-block' : 'none';
  }
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
    card.className = `keep-card priority-${note.priority || 'low'}`;
    if (note.color && note.color.startsWith('#')) {
      card.style.backgroundColor = note.color;
      card.style.color = '#ffffff';
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
    
    let progressHtml = '';
    if (checklistArr.length > 0) {
      progressHtml = `
        <div class="card-progress-container" style="margin-top: -4px; display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 600; opacity: 0.85;">
            <span>Progreso</span>
            <span>${doneCount}/${checklistArr.length} (${Math.round(progressPercent)}%)</span>
          </div>
          <div style="width:100%; height:6px; background-color:rgba(0,0,0,0.06); border-radius:var(--shape-full); overflow:hidden;">
            <div style="width:${progressPercent}%; height:100%; background-color:var(--md-sys-color-primary); transition: width 0.3s ease; border-radius:var(--shape-full);"></div>
          </div>
        </div>
      `;
    }

    const priorityLabel = note.priority === 'high' ? 'Alta' : (note.priority === 'medium' ? 'Media' : 'Baja');
    const priorityClass = `badge-priority-${note.priority || 'low'}`;
    const priorityBadge = `<span class="keep-card-priority-badge ${priorityClass}">${priorityLabel}</span>`;

    let dateBadgeHtml = '';
    if (note.date) {
      const todayDateStr = new Date().toLocaleDateString('en-CA');
      const taskDateStr = note.date;
      
      let dateBadgeStyle = 'color: var(--md-sys-color-on-surface-variant);';
      let dateIcon = '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style="vertical-align: middle; margin-right: 4px;"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/></svg>';
      
      const isCompleted = checklistArr.length > 0 && checklistArr.every(item => item.done);

      if (!isCompleted) {
        if (taskDateStr === todayDateStr) {
          dateBadgeStyle = 'color: #ffa726; font-weight: 700; background-color: rgba(255, 167, 38, 0.12); padding: 2px 6px; border-radius: var(--shape-small);';
          dateIcon = '<svg viewBox="0 0 24 24" width="12" height="12" fill="#ffa726" style="vertical-align: middle; margin-right: 4px; animation: pulse 2s infinite;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';
        } else if (taskDateStr < todayDateStr) {
          dateBadgeStyle = 'color: var(--md-sys-color-error); font-weight: 700; background-color: rgba(255, 180, 171, 0.15); padding: 2px 6px; border-radius: var(--shape-small);';
          dateIcon = '<svg viewBox="0 0 24 24" width="12" height="12" fill="var(--md-sys-color-error)" style="vertical-align: middle; margin-right: 4px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';
        }
      }

      dateBadgeHtml = `
        <span class="card-footer-date" style="${dateBadgeStyle} display: inline-flex; align-items: center;">
          ${dateIcon} ${note.date}
        </span>
      `;
    } else {
      dateBadgeHtml = `<span class="card-footer-date">Hoy</span>`;
    }

    card.innerHTML = `
      <div class="keep-card-header">
        <div style="display: flex; align-items: center;">
          <span class="keep-card-category">Pendiente Privado</span>
          ${priorityBadge}
        </div>
        <div class="card-action-dot">···</div>
      </div>
      <div class="keep-card-title">${note.title || '<em>Sin Título</em>'}</div>
      
      ${progressHtml}

      <ul class="card-checklist">
        ${checklistHtml}
      </ul>

      <div class="card-footer">
        <div class="card-footer-info">
          <span class="card-footer-name">Solo Administrador</span>
          ${dateBadgeHtml}
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (!e.target.closest('.checklist-item')) {
        const userRoles = state.currentUser.roles || [state.currentUser.role];
        if (userRoles.includes('personal') && !userRoles.includes('boss')) {
          openCommentModal(note, true);
        } else {
          openNoteModal(note, true);
        }
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
    card.className = `keep-card priority-${note.priority || 'low'}`;
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

    let progressHtml = '';
    if (checklistArr.length > 0) {
      progressHtml = `
        <div class="card-progress-container" style="margin-top: -4px; display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 600; opacity: 0.85;">
            <span>Progreso</span>
            <span>${doneCount}/${checklistArr.length} (${Math.round(progressPercent)}%)</span>
          </div>
          <div style="width:100%; height:6px; background-color:rgba(0,0,0,0.06); border-radius:var(--shape-full); overflow:hidden;">
            <div style="width:${progressPercent}%; height:100%; background-color:var(--md-sys-color-primary); transition: width 0.3s ease; border-radius:var(--shape-full);"></div>
          </div>
        </div>
      `;
    }

    const priorityLabel = note.priority === 'high' ? 'Alta' : (note.priority === 'medium' ? 'Media' : 'Baja');
    const priorityClass = `badge-priority-${note.priority || 'low'}`;
    const priorityBadge = `<span class="keep-card-priority-badge ${priorityClass}">${priorityLabel}</span>`;

    const avatarsHtml = assignedUsers.length > 0 
      ? assignedUsers.map((u, i) => `<div class="assigned-avatar" style="border: 2px solid var(--md-sys-color-surface); margin-left: ${i > 0 ? '-10px' : '0'}; z-index: ${10-i};" title="${u.name}">${u.name.split(' ').map(n=>n[0]).join('').substring(0,2)}</div>`).join('')
      : '<div class="assigned-avatar">?</div>';

    const waUser = assignedUsers.find(u => u.phone);
    let waShareButtonHtml = '';
    if (waUser) {
      waShareButtonHtml = `
        <button class="btn-wa-share" title="Enviar aviso de tarea por WhatsApp a ${waUser.name}" style="background: none; border: none; padding: 4px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: #25d366; transition: transform 0.2s;" onclick="shareTaskOnWhatsApp(event, '${note.id}', '${waUser.id}')">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.059-3.486l.332.197c1.7.1 3.57.502 5.09.503 5.485 0 9.948-4.414 9.95-9.848.002-2.634-1.02-5.109-2.879-6.97C16.75 2.535 14.28 1.511 11.65 1.51c-5.487 0-9.953 4.414-9.956 9.848a9.789 9.789 0 0 0 1.523 5.176l.217.346L2.43 20.916l4.285-1.12c.001-.001.001-.001 0 0zM17.848 14.39c-.314-.157-1.86-.92-2.148-1.025-.289-.105-.499-.157-.709.157-.21.314-.813 1.025-.996 1.235-.183.21-.366.236-.68.079-1.353-.679-2.222-1.258-3.08-2.733-.183-.314-.183-.509-.026-.666.141-.141.314-.366.471-.549.157-.183.21-.314.314-.523.105-.21.052-.393-.026-.549-.079-.157-.709-1.71-.971-2.338-.255-.615-.515-.532-.709-.542-.183-.01-.393-.01-.603-.01-.21 0-.55.079-.838.393-.289.314-1.102 1.077-1.102 2.626 0 1.549 1.127 3.045 1.284 3.255.157.21 2.217 3.398 5.372 4.764.75.325 1.336.52 1.79.664.755.24 1.442.207 1.985.126.607-.09 1.86-.759 2.122-1.464.262-.705.262-1.307.183-1.432-.079-.126-.289-.21-.603-.367z"/></svg>
        </button>
      `;
    }

    let dateBadgeHtml = '';
    if (note.date) {
      const todayDateStr = new Date().toLocaleDateString('en-CA');
      const taskDateStr = note.date;
      
      let dateBadgeStyle = 'color: var(--md-sys-color-on-surface-variant);';
      let dateIcon = '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style="vertical-align: middle; margin-right: 4px;"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/></svg>';
      
      const isCompleted = checklistArr.length > 0 && checklistArr.every(item => item.done);

      if (!isCompleted) {
        if (taskDateStr === todayDateStr) {
          dateBadgeStyle = 'color: #ffa726; font-weight: 700; background-color: rgba(255, 167, 38, 0.12); padding: 2px 6px; border-radius: var(--shape-small);';
          dateIcon = '<svg viewBox="0 0 24 24" width="12" height="12" fill="#ffa726" style="vertical-align: middle; margin-right: 4px; animation: pulse 2s infinite;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';
        } else if (taskDateStr < todayDateStr) {
          dateBadgeStyle = 'color: var(--md-sys-color-error); font-weight: 700; background-color: rgba(255, 180, 171, 0.15); padding: 2px 6px; border-radius: var(--shape-small);';
          dateIcon = '<svg viewBox="0 0 24 24" width="12" height="12" fill="var(--md-sys-color-error)" style="vertical-align: middle; margin-right: 4px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';
        }
      }

      dateBadgeHtml = `
        <span class="card-footer-date" style="${dateBadgeStyle} display: inline-flex; align-items: center;">
          ${dateIcon} ${note.date}
        </span>
      `;
    } else {
      dateBadgeHtml = `<span class="card-footer-date">Hoy</span>`;
    }

    card.innerHTML = `
      <div class="keep-card-header">
        <div style="display: flex; align-items: center;">
          <span class="keep-card-category">${note.office || 'General'}</span>
          ${priorityBadge}
        </div>
        <div class="card-action-dot">···</div>
      </div>
      <div class="keep-card-title">${note.title || '<em>Sin Título</em>'}</div>
      
      ${progressHtml}

      <ul class="card-checklist">
        ${checklistHtml}
      </ul>

      <div class="card-footer">
        <div class="card-footer-info">
          <span class="card-footer-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${assignedUsers.length > 0 ? assignedUsers.map(u => u.name).join(', ') : 'Sin Asignar'}</span>
          ${dateBadgeHtml}
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          ${waShareButtonHtml}
          <div class="assigned-avatars-container" style="display: flex;">
            ${avatarsHtml}
          </div>
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (!e.target.closest('.checklist-item')) {
        const userRoles = state.currentUser.roles || [state.currentUser.role];
        const isBoss = userRoles.includes('boss');
        const isPersonal = userRoles.includes('personal');
        if (isPersonal && !isBoss) {
          openCommentModal(note, false);
        } else {
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
    const contactInfo = `
      <div style="font-size:12px; opacity:0.8;">
        <div>${u.email || '<span style="opacity:0.4;">Sin correo</span>'}</div>
        <div style="font-weight:600; color:var(--md-sys-color-primary);">${u.phone || '<span style="opacity:0.4;">Sin WhatsApp</span>'}</div>
      </div>
    `;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.name}</strong></td>
      <td>${u.roles && u.roles.includes('boss') ? 'Administrador' : (u.roles || []).join(', ')}</td>
      <td>${contactInfo}</td>
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

window.shareTaskOnWhatsApp = function(event, noteId, userId) {
  event.stopPropagation(); // Prevent opening the note edit modal
  
  const note = state.notes.find(n => n.id === noteId) || state.privateNotes.find(n => n.id === noteId);
  const user = state.users.find(u => u.id === userId);
  
  if (!note || !user || !user.phone) return;
  
  const checklistText = note.checklist && note.checklist.length > 0
    ? '\n\n*Checklist:*\n' + note.checklist.map(item => `${item.done ? '✅' : '⬜'} ${item.text}`).join('\n')
    : '';
    
  const priorityText = note.priority === 'high' ? '🔴 ALTA' : (note.priority === 'medium' ? '🟡 MEDIA' : '🟢 BAJA');
  
  const message = `*Scriptura - Nueva Tarea Asignada*\n\n` +
                  `*Título:* ${note.title || 'Sin Título'}\n` +
                  `*Área/Categoría:* ${note.office || 'General'}\n` +
                  `*Prioridad:* ${priorityText}\n` +
                  `*Fecha Límite:* ${note.date || 'Hoy'}` +
                  `${checklistText}\n\n` +
                  `_Revisar en: https://ilicode-official.github.io/RegHector/_`;
                  
  const encodedText = encodeURIComponent(message);
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${user.phone}&text=${encodedText}`;
  
  window.open(whatsappUrl, '_blank');
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

function openCommentModal(note, isPrivate = false) {
  currentNoteIsPrivate = isPrivate;
  document.getElementById('comment-modal-note-id').value = note.id;
  document.getElementById('comment-modal-is-private').value = isPrivate ? 'true' : 'false';
  document.getElementById('comment-only-input').value = '';
  
  if (note.commentsList) {
    currentCommentsList = [...note.commentsList];
  } else if (note.comments) {
    currentCommentsList = [{ text: note.comments, authorName: 'Sistema', role: 'system', timestamp: Date.now() }];
  } else {
    currentCommentsList = [];
  }
  
  renderCommentOnlyList();
  document.getElementById('comment-modal').classList.add('active');
}

function renderCommentOnlyList() {
  const container = document.getElementById('comment-only-list');
  container.innerHTML = '';
  if (currentCommentsList.length === 0) {
    container.innerHTML = '<span style="opacity:0.5; font-size:13px; text-align:center;">No hay sugerencias aún...</span>';
    return;
  }
  
  currentCommentsList.forEach(c => {
    const bubble = document.createElement('div');
    const isBossComment = c.role === 'boss';
    bubble.style.padding = '10px 14px';
    bubble.style.borderRadius = '16px';
    bubble.style.maxWidth = '85%';
    bubble.style.fontSize = '14px';
    bubble.style.lineHeight = '1.4';
    bubble.style.position = 'relative';
    
    if (isBossComment) {
      bubble.style.backgroundColor = 'var(--md-sys-color-primary)';
      bubble.style.color = 'var(--md-sys-color-on-primary)';
      bubble.style.alignSelf = 'flex-end';
      bubble.style.borderBottomRightRadius = '4px';
    } else {
      bubble.style.backgroundColor = 'var(--md-sys-color-surface)';
      bubble.style.color = 'var(--md-sys-color-on-surface)';
      bubble.style.alignSelf = 'flex-start';
      bubble.style.borderBottomLeftRadius = '4px';
      bubble.style.border = '1px solid var(--md-sys-color-outline)';
    }
    
    const timeStr = new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    bubble.innerHTML = `
      <div style="font-size: 10px; opacity: 0.8; margin-bottom: 4px; font-weight: 600;">${c.authorName}  ${timeStr}</div>
      <div>${c.text}</div>
    `;
    container.appendChild(bubble);
  });
  container.scrollTop = container.scrollHeight;
}

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
    assignedContainer.querySelectorAll('.user-badge').forEach((badge) => {
      const uid = badge.getAttribute('data-uid');
      if (Array.isArray(note.assignedTo) ? note.assignedTo.includes(uid) : uid === note.assignedTo) {
        badge.classList.add('selected');
      } else {
        badge.classList.remove('selected');
      }
      badge.style.display = 'flex';
    });

    document.getElementById('note-office-input').value = note.office || '';
    document.getElementById('note-priority-input').value = note.priority || 'low';
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
    document.getElementById('note-priority-input').value = 'low';
    document.getElementById('note-date-input').value = '';
    document.getElementById('note-date-input').value = '';
    document.getElementById('note-add-calendar').checked = false;
    currentCommentsList = [];
    renderCommentsList();
    
    const assignedContainer = document.getElementById('note-assigned-input');
    const isPersonalUser = state.currentUser && state.currentUser.roles && state.currentUser.roles.includes('personal');
    assignedContainer.querySelectorAll('.user-badge').forEach(badge => {
      badge.classList.remove('selected');
      const uid = badge.getAttribute('data-uid');
      if (isPersonalUser) {
        if (uid === 'boss') badge.classList.add('selected');
      } else if (state.currentUser && uid === state.currentUser.id) {
        badge.classList.add('selected');
      }
      badge.style.display = 'flex';
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
    const userRoles = state.currentUser.roles || [state.currentUser.role];
    const role = userRoles.includes('boss') ? 'boss' : 'personal';
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

document.getElementById('comment-only-add-btn').addEventListener('click', () => {
  const input = document.getElementById('comment-only-input');
  const text = input.value.trim();
  if (text) {
    const userRoles = state.currentUser.roles || [state.currentUser.role];
    const role = userRoles.includes('boss') ? 'boss' : 'personal';
    currentCommentsList.push({
      text: text,
      authorName: state.currentUser.name,
      role: role,
      timestamp: Date.now()
    });
    input.value = '';
    renderCommentOnlyList();
    
    // Auto-save instantly for the comment-only modal
    const noteId = document.getElementById('comment-modal-note-id').value;
    const isPrivate = document.getElementById('comment-modal-is-private').value === 'true';
    const targetCollection = isPrivate ? state.privateNotes : state.notes;
    const matchedNote = targetCollection.find(n => n.id === noteId);
    
    if (matchedNote) {
      const data = { ...matchedNote, commentsList: currentCommentsList };
      if (isPrivate) {
        syncSave('private_notes', noteId, data);
      } else {
        syncSave('notes', noteId, data);
      }
    }
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
    document.getElementById('user-email-input').value = user.email || '';
    document.getElementById('user-phone-input').value = user.phone || '';
    
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
    document.getElementById('user-email-input').value = '';
    document.getElementById('user-phone-input').value = '';
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
  const priority = document.getElementById('note-priority-input').value;
  
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
  const userRoles = state.currentUser && (state.currentUser.roles || [state.currentUser.role]);
  const isBoss = userRoles && userRoles.includes('boss');
  let data = { id, title, assignedTo, office, color, checklist, date, priority, commentsList: currentCommentsList };
  
  if (!isBoss && matchedNote) {
    data = { ...matchedNote, checklist: checklist, commentsList: currentCommentsList }; // Guarda solo avances y comentarios
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
  const email = document.getElementById('user-email-input').value.trim();
  const phone = document.getElementById('user-phone-input').value.trim();
  const roleSelect = document.getElementById('user-role-input');
  const roles = Array.from(roleSelect.selectedOptions).map(opt => opt.value);

  const data = { id, name, roles, password, email, phone };
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
  sendCalendarEventEmail(data);
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
    
    // Beautiful pastel color palette for avatars
    const avatarColors = [
      '#ef5350', '#ec407a', '#ab47bc', '#7e57c2', 
      '#5c6bc0', '#29b6f6', '#26a69a', '#66bb6a', 
      '#ffca28', '#ffa726', '#8d6e63'
    ];

    const isPersonalUser = state.currentUser && state.currentUser.roles && state.currentUser.roles.includes('personal');

    state.users.forEach((u) => {
      // The user creating/editing the task (current logged-in user) should not appear in the assignment list
      if (state.currentUser && u.id === state.currentUser.id) {
        return;
      }

      // If logged-in user has 'personal' role, they can only assign tasks to Hector (boss/admin role)
      if (isPersonalUser) {
        const isHector = u.id === 'boss' || (u.roles && u.roles.includes('boss')) || u.name.toLowerCase().includes('hector');
        if (!isHector) return;
      }

      const charCodeSum = u.name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const avatarColor = avatarColors[charCodeSum % avatarColors.length];

      const badge = document.createElement('div');
      badge.className = 'user-badge';
      badge.setAttribute('data-uid', u.id);
      badge.innerHTML = `
        <div class="user-badge-avatar" style="background-color: ${avatarColor}; color: #fff;">${u.name.charAt(0).toUpperCase()}</div>
        <span class="user-badge-name" style="font-size: 13px; font-weight: 600;">${u.name}</span>
      `;
      badge.addEventListener('click', () => {
        badge.classList.toggle('selected');
      });
      assignContainer.appendChild(badge);
    });
    
    // Re-bind the search input listener to avoid stale closure references
    const searchInput = document.getElementById('note-user-search');
    if (searchInput) {
      const newSearchInput = searchInput.cloneNode(true);
      searchInput.parentNode.replaceChild(newSearchInput, searchInput);
      
      newSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const badges = assignContainer.querySelectorAll('.user-badge');
        badges.forEach(b => {
          const name = b.querySelector('.user-badge-name').textContent.toLowerCase();
          if (query === '') {
            b.style.display = 'flex';
          } else {
            if (name.includes(query)) {
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
  
  // Forzar contador inicial a 3 por única vez para Julio 2026
  const migrationDone = localStorage.getItem('scriptura_migration_stats_v1');
  if (!migrationDone) {
    state.emailStats = { sentCount: 3, lastResetMonthYear: "7-2026" };
    localStorage.setItem('scriptura_email_stats', JSON.stringify(state.emailStats));
    localStorage.setItem('scriptura_migration_stats_v1', 'true');
    setTimeout(() => {
      if (typeof firebase !== 'undefined' && db) {
        db.collection('config').doc('email_stats').set(state.emailStats)
          .then(() => console.log('Email stats force-migrated to 3 in Firestore.'))
          .catch(err => console.error(err));
      }
    }, 1200);
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
