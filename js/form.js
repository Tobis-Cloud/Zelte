// ===================================================
// form.js – Formular-Logik für index.html
// Duplikatcheck, Validierung, Firebase-Schreibzugriff
// ===================================================

import { db }           from './firebase-config.js';
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Hilfsfunktionen ──────────────────────────────────
function normalize(str) {
  return str.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

function buildKindId(vorname, nachname) {
  return `${normalize(vorname)}_${normalize(nachname)}`;
}

function showAlert(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.querySelector('.alert-msg').textContent = msg;
  el.classList.add('visible');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('visible');
}

function setFieldError(fieldId, msg) {
  const err = document.getElementById(fieldId + '-err');
  const inp = document.getElementById(fieldId);
  if (err) { err.textContent = msg; err.classList.add('visible'); }
  if (inp) inp.classList.add('is-error');
}

function clearFieldError(fieldId) {
  const err = document.getElementById(fieldId + '-err');
  const inp = document.getElementById(fieldId);
  if (err) err.classList.remove('visible');
  if (inp) inp.classList.remove('is-error');
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.classList.toggle('loading', loading);
}

// ── DOM-Elemente ──────────────────────────────────────
const form       = document.getElementById('anmelde-form');
const submitBtn  = document.getElementById('submit-btn');

// ── Validierung ───────────────────────────────────────
function validateForm() {
  let valid = true;

  const pflichtfelder = ['email', 'vorname', 'nachname'];
  pflichtfelder.forEach(id => {
    clearFieldError(id);
    const val = document.getElementById(id)?.value.trim();
    if (!val) {
      setFieldError(id, 'Dieses Feld ist erforderlich.');
      valid = false;
    }
  });

  // E-Mail-Format
  const emailVal = document.getElementById('email')?.value.trim();
  if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
    setFieldError('email', 'Bitte eine gültige E-Mail-Adresse eingeben.');
    valid = false;
  }

  return valid;
}

// ── Duplikatcheck ─────────────────────────────────────
async function checkDuplicate(kindId) {
  const ref = doc(db, 'wuensche', kindId);
  const snap = await getDoc(ref);
  return snap.exists();
}

// ── Formular absenden ─────────────────────────────────
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('alert-error');
    hideAlert('alert-success');

    if (!validateForm()) return;

    const email    = document.getElementById('email').value.trim();
    const vorname  = document.getElementById('vorname').value.trim();
    const nachname = document.getElementById('nachname').value.trim();
    const kindId   = buildKindId(vorname, nachname);

    // Wunschpartner-Felder
    const wunsch = [];
    for (let i = 1; i <= 3; i++) {
      wunsch.push({
        vorname:  (document.getElementById(`wunsch${i}_vorname`)?.value.trim()  || null),
        nachname: (document.getElementById(`wunsch${i}_nachname`)?.value.trim() || null),
      });
    }

    setLoading(submitBtn, true);

    try {
      // Duplikatcheck
      const exists = await checkDuplicate(kindId);
      if (exists) {
        setFieldError('vorname', ' ');
        setFieldError('nachname', ' ');
        showAlert('alert-error',
          `„${vorname} ${nachname}" ist bereits eingetragen. ` +
          `Falls das ein Fehler ist, wende dich an die Lagerleitung.`
        );
        setLoading(submitBtn, false);
        return;
      }

      // Daten speichern
      await setDoc(doc(db, 'wuensche', kindId), {
        email,
        vorname,
        nachname,
        wunsch1_vorname:  wunsch[0].vorname,
        wunsch1_nachname: wunsch[0].nachname,
        wunsch2_vorname:  wunsch[1].vorname,
        wunsch2_nachname: wunsch[1].nachname,
        wunsch3_vorname:  wunsch[2].vorname,
        wunsch3_nachname: wunsch[2].nachname,
        timestamp: serverTimestamp(),
      });

      // Weiterleitung zur Erfolgsseite mit Daten
      const params = new URLSearchParams({
        vorname, nachname, email,
        w1v: wunsch[0].vorname || '', w1n: wunsch[0].nachname || '',
        w2v: wunsch[1].vorname || '', w2n: wunsch[1].nachname || '',
        w3v: wunsch[2].vorname || '', w3n: wunsch[2].nachname || '',
      });
      window.location.href = `success.html?${params.toString()}`;

    } catch (err) {
      console.error('Fehler beim Speichern:', err);
      showAlert('alert-error',
        'Ein Fehler ist aufgetreten. Bitte versuche es erneut oder kontaktiere die Lagerleitung.'
      );
      setLoading(submitBtn, false);
    }
  });
}

// ── Live-Validierung ──────────────────────────────────
['email', 'vorname', 'nachname'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', () => clearFieldError(id));
});
