// ===================================================
// admin.js – Admin-Bereich: Login + Datenliste
// Tab-Steuerung, Firebase Auth, Einträge laden
// ===================================================

import { db, auth } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, getDocs, orderBy, query, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Tab-System ────────────────────────────────────────
let currentTab = 'tab-login';
window.switchTab = function(id) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === id));
  currentTab = id;
};

// ── Auth-State ────────────────────────────────────────
let allData = [];

onAuthStateChanged(auth, user => {
  const loginPanel  = document.getElementById('tab-login');
  const mainPanels  = document.getElementById('admin-tabs-bar');
  const logoutBtn   = document.getElementById('logout-btn');
  const userLabel   = document.getElementById('user-label');

  if (user) {
    // Eingeloggt → Login-Tab ausblenden
    document.querySelector('[data-tab="tab-login"]')?.remove();
    loginPanel?.classList.remove('active');
    document.getElementById('tab-eintraege')?.classList.add('active');
    document.querySelector('[data-tab="tab-eintraege"]')?.classList.add('active');

    if (logoutBtn) logoutBtn.classList.remove('hidden');
    if (userLabel) userLabel.textContent = user.email;

    loadEintraege();
  } else {
    // Nicht eingeloggt → nur Login zeigen
    switchTab('tab-login');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    if (userLabel) userLabel.textContent = '';
  }
});

// ── Login ─────────────────────────────────────────────
const loginForm = document.getElementById('login-form');
const loginBtn  = document.getElementById('login-btn');
const loginErr  = document.getElementById('login-error');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (loginErr) loginErr.classList.remove('visible');
    loginBtn.disabled = true;
    loginBtn.classList.add('loading');

    const email    = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      let msg = 'Anmeldung fehlgeschlagen. Bitte überprüfe deine Zugangsdaten.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Falsche E-Mail oder falsches Passwort.';
      }
      if (loginErr) {
        loginErr.querySelector('.alert-msg').textContent = msg;
        loginErr.classList.add('visible');
      }
      loginBtn.disabled = false;
      loginBtn.classList.remove('loading');
    }
  });
}

// ── Logout ────────────────────────────────────────────
document.getElementById('logout-btn')?.addEventListener('click', () => signOut(auth));

// ── Daten laden ───────────────────────────────────────
async function loadEintraege() {
  const q   = query(collection(db, 'wuensche'), orderBy('timestamp', 'desc'));
  const snap = await getDocs(q);

  allData = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderTable(allData);
  updateStats(allData);

  // Graph + Algorithmus initialisieren (falls Modul geladen)
  if (window.initGraph)     window.initGraph(allData);
  if (window.initAlgorithm) window.initAlgorithm(allData);
}

function updateStats(data) {
  const el = document.getElementById('stat-eintraege');
  if (el) el.textContent = data.length;

  // Wünsche zählen
  let wCount = 0;
  data.forEach(d => {
    if (d.wunsch1_vorname) wCount++;
    if (d.wunsch2_vorname) wCount++;
    if (d.wunsch3_vorname) wCount++;
  });
  const elW = document.getElementById('stat-wuensche');
  if (elW) elW.textContent = wCount;
}

// ── Tabelle rendern ───────────────────────────────────
function renderTable(data) {
  const tbody = document.getElementById('eintraege-tbody');
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--gray-400);padding:24px">Noch keine Einträge vorhanden.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(d => {
    const wuensche = [
      d.wunsch1_vorname ? `${d.wunsch1_vorname} ${d.wunsch1_nachname}` : null,
      d.wunsch2_vorname ? `${d.wunsch2_vorname} ${d.wunsch2_nachname}` : null,
      d.wunsch3_vorname ? `${d.wunsch3_vorname} ${d.wunsch3_nachname}` : null,
    ].filter(Boolean).join(', ') || '<span class="text-muted">–</span>';

    const datum = d.timestamp?.toDate
      ? d.timestamp.toDate().toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
      : '–';

    return `<tr>
      <td><strong>${d.vorname} ${d.nachname}</strong></td>
      <td style="font-size:0.8rem;color:var(--gray-400)">${d.email}</td>
      <td>${wuensche}</td>
      <td style="font-size:0.78rem;color:var(--gray-400)">${datum}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteEntry('${d.id}', '${d.vorname} ${d.nachname}')">
          🗑 Löschen
        </button>
      </td>
    </tr>`;
  }).join('');
}

// ── Eintrag löschen ───────────────────────────────────
window.deleteEntry = async function(kindId, name) {
  if (!confirm(`Eintrag von „${name}" wirklich löschen?`)) return;
  try {
    await deleteDoc(doc(db, 'wuensche', kindId));
    allData = allData.filter(d => d.id !== kindId);
    renderTable(allData);
    updateStats(allData);
    if (window.initGraph)     window.initGraph(allData);
    if (window.initAlgorithm) window.initAlgorithm(allData);
  } catch (err) {
    alert('Fehler beim Löschen: ' + err.message);
  }
};

// ── Suche ─────────────────────────────────────────────
document.getElementById('suche-input')?.addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  const filtered = allData.filter(d =>
    `${d.vorname} ${d.nachname}`.toLowerCase().includes(q) ||
    d.email?.toLowerCase().includes(q)
  );
  renderTable(filtered);
});

// ── Tab aus URL laden ─────────────────────────────────
const urlTab = new URLSearchParams(location.search).get('tab');
if (urlTab) switchTab(urlTab);
