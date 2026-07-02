// ===================================================
// export.js – XLSX + SVG Export
// Benötigt SheetJS (CDN)
// ===================================================

const XLSX_CDN = 'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js';

async function loadXLSX() {
  if (window.XLSX) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = XLSX_CDN; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ── XLSX Export ───────────────────────────────────────
window.exportXLSX = async function() {
  const data = window._algoData;
  if (!data || data.length === 0) {
    alert('Keine Daten zum Exportieren vorhanden.');
    return;
  }

  await loadXLSX();

  // Einträge-Sheet
  const rows = data.map(d => ({
    'Vorname':           d.vorname || '',
    'Nachname':          d.nachname || '',
    'E-Mail Eltern':     d.email || '',
    'Wunsch 1':          d.wunsch1_vorname ? `${d.wunsch1_vorname} ${d.wunsch1_nachname}` : '',
    'Wunsch 2':          d.wunsch2_vorname ? `${d.wunsch2_vorname} ${d.wunsch2_nachname}` : '',
    'Wunsch 3':          d.wunsch3_vorname ? `${d.wunsch3_vorname} ${d.wunsch3_nachname}` : '',
    'Eingetragen am':    d.timestamp?.toDate ? d.timestamp.toDate().toLocaleString('de-DE') : '',
  }));

  const wb = window.XLSX.utils.book_new();
  const ws1 = window.XLSX.utils.json_to_sheet(rows);
  window.XLSX.utils.book_append_sheet(wb, ws1, 'Einträge');

  // Zeltgruppen-Sheet (falls vorhanden)
  if (window._letzteZelte && window._letzteZelte.length > 0) {
    const zeltRows = [];
    window._letzteZelte.forEach(z => {
      z.mitglieder.forEach(m => {
        zeltRows.push({ 'Zelt': z.name, 'Kind': m });
      });
    });
    const ws2 = window.XLSX.utils.json_to_sheet(zeltRows);
    window.XLSX.utils.book_append_sheet(wb, ws2, 'Zeltgruppen');
  }

  window.XLSX.writeFile(wb, 'JULA2026_Zelteinteilung.xlsx');
};

// ── SVG/PNG Export (bereits in graph.js) ─────────────
// window.exportGraphPNG ist in graph.js definiert
