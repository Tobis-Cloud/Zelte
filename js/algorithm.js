// ===================================================
// algorithm.js – Greedy-Gruppierungsalgorithmus
// Zeltgruppen aus Wunschverbindungen berechnen
// ===================================================

function normalize(str) {
  return (str || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,'_');
}
function kindId(v, n) { return `${normalize(v)}_${normalize(n)}`; }

// ── Union-Find ────────────────────────────────────────
class UnionFind {
  constructor(ids) {
    this.parent = {};
    this.rank   = {};
    ids.forEach(id => { this.parent[id] = id; this.rank[id] = 0; });
  }
  find(x) {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }
  union(x, y) {
    const rx = this.find(x), ry = this.find(y);
    if (rx === ry) return;
    if (this.rank[rx] < this.rank[ry]) this.parent[rx] = ry;
    else if (this.rank[rx] > this.rank[ry]) this.parent[ry] = rx;
    else { this.parent[ry] = rx; this.rank[rx]++; }
  }
}

// ── Hauptalgorithmus ──────────────────────────────────
function berechneZeltgruppen(data, zeltGroesse) {
  if (!data || data.length === 0) return [];

  const nameMap = {};
  data.forEach(d => {
    const id = `${normalize(d.vorname)}_${normalize(d.nachname)}`;
    nameMap[id] = `${d.vorname} ${d.nachname}`;
  });

  const ids = Object.keys(nameMap);
  const uf  = new UnionFind(ids);

  // Verbindungen verknüpfen (nur wenn beide Kinder in der Liste)
  data.forEach(d => {
    const src = `${normalize(d.vorname)}_${normalize(d.nachname)}`;
    [[d.wunsch1_vorname, d.wunsch1_nachname],
     [d.wunsch2_vorname, d.wunsch2_nachname],
     [d.wunsch3_vorname, d.wunsch3_nachname]
    ].forEach(([wv, wn]) => {
      if (!wv || !wn) return;
      const tgt = kindId(wv, wn);
      if (nameMap[tgt]) uf.union(src, tgt);
    });
  });

  // Komponenten sammeln
  const compMap = {};
  ids.forEach(id => {
    const root = uf.find(id);
    if (!compMap[root]) compMap[root] = [];
    compMap[root].push(id);
  });

  const components = Object.values(compMap);
  // Größte Komponenten zuerst
  components.sort((a, b) => b.length - a.length);

  const zelte = [];
  const zugewiesen = new Set();

  components.forEach(comp => {
    if (comp.every(id => zugewiesen.has(id))) return;

    if (comp.length <= zeltGroesse) {
      // Komplett als Zelt
      zelte.push(comp.filter(id => !zugewiesen.has(id)));
      comp.forEach(id => zugewiesen.add(id));
    } else {
      // Zu groß → aufteilen in Blöcke
      const ungezwiesene = comp.filter(id => !zugewiesen.has(id));
      for (let i = 0; i < ungezwiesene.length; i += zeltGroesse) {
        zelte.push(ungezwiesene.slice(i, i + zeltGroesse));
        ungezwiesene.slice(i, i + zeltGroesse).forEach(id => zugewiesen.add(id));
      }
    }
  });

  // Nicht zugewiesene auffüllen
  const rest = ids.filter(id => !zugewiesen.has(id));
  if (rest.length > 0) {
    // Versuche in bestehende Zelte mit Platz aufzufüllen
    let ri = 0;
    for (let zi = 0; zi < zelte.length && ri < rest.length; zi++) {
      while (zelte[zi].length < zeltGroesse && ri < rest.length) {
        zelte[zi].push(rest[ri++]);
      }
    }
    // Verbleibende als eigenes Zelt
    if (ri < rest.length) {
      zelte.push(rest.slice(ri));
    }
  }

  // Leere Zelte entfernen
  const result = zelte.filter(z => z.length > 0).map((z, i) => ({
    name: `Zelt ${i + 1}`,
    mitglieder: z.map(id => nameMap[id] || id),
    ids: z,
  }));

  return result;
}

// ── Rendern ───────────────────────────────────────────
function renderZeltgruppen(zelte) {
  const container = document.getElementById('zelt-result');
  if (!container) return;

  if (!zelte || zelte.length === 0) {
    container.innerHTML = `<p class="text-muted text-center mt-24">Noch keine Daten vorhanden.</p>`;
    return;
  }

  const colors = [
    '#E30613','#1d4ed8','#16a34a','#d97706','#7c3aed',
    '#0891b2','#be185d','#065f46','#92400e','#312e81'
  ];

  container.innerHTML = `<div class="zelt-grid">${
    zelte.map((z, i) => `
      <div class="zelt-card">
        <div class="zelt-card-header" style="background:${colors[i % colors.length]}">
          <span>${z.name}</span>
          <span class="badge" style="background:rgba(255,255,255,0.2);color:#fff">${z.mitglieder.length} Kinder</span>
        </div>
        <div class="zelt-card-body">
          ${z.mitglieder.map(m => `
            <div class="zelt-member">
              <div class="zelt-member-dot" style="background:${colors[i % colors.length]}"></div>
              <span>${m}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')
  }</div>`;

  // Stat
  const statZelte = document.getElementById('stat-zelte');
  if (statZelte) statZelte.textContent = zelte.length;

  // Graph-Farben aktualisieren
  if (window._graphData && window.d3) {
    const colorMap = {};
    zelte.forEach((z, i) => z.ids.forEach(id => colorMap[id] = i));
    window.d3.selectAll('.graph-node circle')
      .attr('fill', d => colorMap[d.id] !== undefined ? colors[colorMap[d.id] % colors.length] : '#f1f5f9');
    window.d3.selectAll('.graph-node text')
      .attr('fill', d => colorMap[d.id] !== undefined ? '#fff' : '#334155');
  }
}

// ── Global init ───────────────────────────────────────
window.initAlgorithm = function(data) {
  window._algoData = data;

  const btn   = document.getElementById('algo-btn');
  const input = document.getElementById('zelt-groesse');

  if (btn) {
    btn.addEventListener('click', () => {
      const groesse = parseInt(input?.value || '6', 10);
      if (isNaN(groesse) || groesse < 2 || groesse > 20) {
        alert('Bitte eine Zeltgröße zwischen 2 und 20 eingeben.');
        return;
      }
      const zelte = berechneZeltgruppen(window._algoData || data, groesse);
      renderZeltgruppen(zelte);
      window._letzteZelte = zelte;
    });
  }
};
