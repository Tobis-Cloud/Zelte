// ===================================================
// graph.js – D3.js Force-Directed Graph
// Visualisiert Wunschverbindungen zwischen Kindern
// ===================================================

const D3_CDN = "https://d3js.org/d3.v7.min.js";

let d3;

async function loadD3() {
  if (window.d3) { d3 = window.d3; return; }
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = D3_CDN; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
  d3 = window.d3;
}

// ── Farben für Zeltgruppen ─────────────────────────────
const COLORS = [
  '#E30613','#1d4ed8','#16a34a','#d97706','#7c3aed',
  '#0891b2','#be185d','#065f46','#92400e','#312e81'
];

window.initGraph = async function(data) {
  await loadD3();

  const container = document.getElementById('graph-container');
  if (!container || !data || data.length === 0) return;

  // Alten SVG entfernen
  d3.select('#graph-svg').selectAll('*').remove();

  const width  = container.clientWidth  || 800;
  const height = container.clientHeight || 520;

  // ── Nodes + Links aufbauen ───────────────────────────
  function normalize(str) {
    return (str || '').trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/\s+/g,'_');
  }
  function kindId(v, n) { return `${normalize(v)}_${normalize(n)}`; }

  const nodeMap = new Map();
  data.forEach(d => {
    const id = `${normalize(d.vorname)}_${normalize(d.nachname)}`;
    nodeMap.set(id, { id, label: `${d.vorname} ${d.nachname}`, group: null });
  });

  const links = [];
  data.forEach(d => {
    const sourceId = `${normalize(d.vorname)}_${normalize(d.nachname)}`;
    [[d.wunsch1_vorname, d.wunsch1_nachname],
     [d.wunsch2_vorname, d.wunsch2_nachname],
     [d.wunsch3_vorname, d.wunsch3_nachname]
    ].forEach(([wv, wn]) => {
      if (!wv || !wn) return;
      const targetId = kindId(wv, wn);
      if (nodeMap.has(targetId) && sourceId !== targetId) {
        links.push({ source: sourceId, target: targetId });
      }
    });
  });

  // Gegenseitige Wünsche markieren
  const linkSet = new Set(links.map(l => `${l.source}→${l.target}`));
  links.forEach(l => {
    l.mutual = linkSet.has(`${l.target}→${l.source}`);
  });

  const nodes = Array.from(nodeMap.values());

  // ── SVG aufbauen ────────────────────────────────────
  const svg = d3.select('#graph-svg')
    .attr('width', width).attr('height', height);

  // Zoom
  const g = svg.append('g');
  svg.call(d3.zoom().scaleExtent([0.3, 3]).on('zoom', e => g.attr('transform', e.transform)));

  // Pfeilmarker
  svg.append('defs').selectAll('marker')
    .data(['arrow', 'arrow-mutual'])
    .join('marker')
      .attr('id', d => d)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
    .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', d => d === 'arrow-mutual' ? '#E30613' : '#999');

  // Simulation
  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(120))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide(35));

  // Links
  const link = g.append('g').selectAll('line')
    .data(links).join('line')
      .attr('stroke',       d => d.mutual ? '#E30613' : '#ccc')
      .attr('stroke-width', d => d.mutual ? 2.5 : 1.5)
      .attr('stroke-opacity', 0.8)
      .attr('marker-end', d => `url(#${d.mutual ? 'arrow-mutual' : 'arrow'})`);

  // Node-Gruppen
  const node = g.append('g').selectAll('g')
    .data(nodes).join('g')
      .attr('class', 'graph-node')
      .style('cursor', 'grab')
      .call(d3.drag()
        .on('start', (e,d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
        .on('drag',  (e,d) => { d.fx=e.x; d.fy=e.y; })
        .on('end',   (e,d) => { if (!e.active) sim.alphaTarget(0); d.fx=null; d.fy=null; })
      );

  node.append('circle')
    .attr('r', 20)
    .attr('fill', d => d.group !== null ? COLORS[d.group % COLORS.length] : '#f1f5f9')
    .attr('stroke', d => d.group !== null ? '#fff' : '#94a3b8')
    .attr('stroke-width', 2)
    .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))');

  node.append('text')
    .text(d => {
      const parts = d.label.split(' ');
      return parts.length > 1
        ? parts[0][0].toUpperCase() + '. ' + parts.slice(1).join(' ')
        : d.label;
    })
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .attr('font-size', 9)
    .attr('font-family', 'Inter, sans-serif')
    .attr('font-weight', '600')
    .attr('fill', d => d.group !== null ? '#fff' : '#334155')
    .attr('pointer-events', 'none');

  // Tooltip
  node.append('title').text(d => d.label);

  // Tick
  sim.on('tick', () => {
    link
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });

  // Legende
  const legend = document.getElementById('graph-legend');
  if (legend) {
    legend.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:5px;font-size:0.75rem;color:var(--gray-400)">
        <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="#ccc" stroke-width="1.5"/></svg> Wunsch
      </span>
      <span style="display:inline-flex;align-items:center;gap:5px;font-size:0.75rem;color:var(--gray-400)">
        <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="#E30613" stroke-width="2.5"/></svg> Gegenseitiger Wunsch
      </span>
    `;
  }

  // Graph-Daten global bereitstellen (für Algorithmus)
  window._graphData = { nodes, links, nodeMap };
};

// ── PNG-Export ────────────────────────────────────────
window.exportGraphPNG = function() {
  const svg = document.getElementById('graph-svg');
  if (!svg) return;
  const s = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([s], { type: 'image/svg+xml;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'JULA2026_Graph.svg';
  a.click(); URL.revokeObjectURL(url);
};
