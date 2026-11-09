/* Atlas Eléctrico · Módulo 0 · Recursos energéticos
   Datos numéricos: datos/atlas-datos.json (validado en la Etapa 2).
   Textos conceptuales: física de conversión de energía (conocimiento estable). */
(function () {
  const css = getComputedStyle(document.documentElement);
  const v = (n) => css.getPropertyValue(n).trim();
  const fmt = (x, d = 0) => Number(x).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d });
  const $ = (s, r = document) => r.querySelector(s);
  const COL = { fosil: v('--r-fosil'), nuclear: v('--r-nuclear'), renovable: v('--r-renovable') };
  const NOM = { fosil: 'Fósil', nuclear: 'Nuclear', renovable: 'Renovable' };
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
  Chart.defaults.color = '#5B6B85';
  const TIP = { backgroundColor: '#0B2A5B', padding: 10, titleFont: { family: 'Poppins' } };

  // Recurso al que pertenece cada tecnología del Plan (Tabla 2.2)
  const REC_PLAN = {
    'Carboeléctrica': 'fosil', 'Térmica convencional': 'fosil', 'Combustión interna': 'fosil', 'Turbogás': 'fosil',
    'Ciclo combinado': 'fosil', 'Cogeneración eficiente': 'fosil', 'Nucleoeléctrica': 'nuclear',
    'Hidroeléctrica': 'renovable', 'Geotérmica': 'renovable', 'Eólica': 'renovable', 'Solar fotovoltaica': 'renovable', 'Bioenergía': 'renovable' };
  // Recurso de cada tecnología de la CFE (Informe 2024, p. 26)
  const REC_CFE = {
    'Ciclo combinado': 'fosil', 'Diésel (combustión interna)': 'fosil', 'Turbogás': 'fosil', 'Vapor convencional': 'fosil', 'Turbojet': 'fosil',
    'Carboeléctrica': 'fosil', 'Nucleoeléctrica': 'nuclear', 'Geotermoeléctrica': 'renovable', 'Hidroeléctrica': 'renovable',
    'Eoloeléctrica': 'renovable', 'Solar fotovoltaica': 'renovable' };

  /* ===================== 2. CLASIFICADOR ===================== */
  const CARTAS = [
    { n: 'Gas natural', t: 'Recurso', ok: ['fosil'], e: 'Hidrocarburo formado hace millones de años; no se regenera a escala humana. Es el combustible principal de los ciclos combinados.' },
    { n: 'Carbón mineral', t: 'Recurso', ok: ['fosil'], e: 'Roca sedimentaria de origen vegetal fosilizado. Se quema en las carboeléctricas.' },
    { n: 'Combustóleo', t: 'Combustible', ok: ['fosil'], e: 'Derivado pesado del petróleo; se quema en calderas de centrales de vapor convencional.' },
    { n: 'Diésel', t: 'Combustible', ok: ['fosil'], e: 'Derivado del petróleo. Se usa en motores de combustión interna y en algunas turbinas de gas.' },
    { n: 'Uranio', t: 'Recurso', ok: ['nuclear'], e: 'Mineral cuyo núcleo se divide por fisión. Es finito: no es renovable, aunque la ley considera limpia la energía nucleoeléctrica.' },
    { n: 'Fisión nuclear', t: 'Proceso', ok: ['nuclear'], e: 'Proceso de conversión: el núcleo de uranio se divide y libera calor. No es un recurso, es el fenómeno que aprovecha la central.' },
    { n: 'Radiación solar', t: 'Recurso', ok: ['renovable'], e: 'Llega todos los días; su disponibilidad depende de la hora, las nubes y la estación.' },
    { n: 'Viento', t: 'Recurso', ok: ['renovable'], e: 'Aire en movimiento por diferencias de temperatura y presión. Se regenera de forma continua, pero es variable.' },
    { n: 'Energía hidráulica', t: 'Recurso', ok: ['renovable'], e: 'El ciclo del agua recarga ríos y embalses. Renovable, aunque depende de la lluvia: en años secos baja mucho.' },
    { n: 'Calor geotérmico', t: 'Recurso', ok: ['renovable'], e: 'Calor interno de la Tierra. Se considera renovable si el yacimiento se explota sin agotarlo.' },
    { n: 'Biogás', t: 'Recurso', ok: ['renovable'], e: 'Metano producido por residuos orgánicos en rellenos sanitarios, granjas o plantas de tratamiento. Es renovable porque los residuos se generan continuamente.' },
    { n: 'Ciclo combinado', t: 'Tecnología', ok: ['fosil'], e: 'En México quema gas natural. El PRODESEN 2023-2037 plantea mezclarlo con hidrógeno en el futuro (p. 57), pero hoy su recurso es fósil.' },
    { n: 'Carboeléctrica', t: 'Tecnología', ok: ['fosil'], e: 'Central que quema carbón en una caldera para producir vapor.' },
    { n: 'Vapor convencional', t: 'Tecnología', ok: ['fosil'], e: 'Puede quemar combustóleo o gas natural. Con cualquiera de los dos el recurso es fósil.', multi: true },
    { n: 'Turbogás', t: 'Tecnología', ok: ['fosil'], e: 'Puede usar gas natural o diésel. Ambos son fósiles.', multi: true },
    { n: 'Combustión interna', t: 'Tecnología', ok: ['fosil', 'renovable'], matiz: true, e: 'Depende del combustible: con diésel, combustóleo o gas natural es fósil; con biogás es renovable. La tecnología no define el recurso.' },
    { n: 'Nucleoeléctrica', t: 'Tecnología', ok: ['nuclear'], e: 'Central que usa la fisión del uranio. En México solo existe Laguna Verde, en Veracruz.' },
    { n: 'Solar fotovoltaica', t: 'Tecnología', ok: ['renovable'], e: 'Paneles que convierten la radiación solar en corriente directa por efecto fotovoltaico.' },
    { n: 'Eólica', t: 'Tecnología', ok: ['renovable'], e: 'Aerogeneradores que convierten la energía cinética del viento en electricidad.' },
    { n: 'Hidroeléctrica', t: 'Tecnología', ok: ['renovable'], e: 'Turbinas movidas por agua almacenada en presas o por el caudal de un río.' },
    { n: 'Geotermoeléctrica', t: 'Tecnología', ok: ['renovable'], e: 'Usa vapor del subsuelo para mover turbinas. Ejemplos: Cerro Prieto y Los Azufres.' },
    { n: 'Bioenergía', t: 'Tecnología', ok: ['renovable'], matiz: true, e: 'Renovable cuando la biomasa se repone (cultivos, residuos). Quemarla sí emite CO₂ en la chimenea; el IPCC lo trata aparte porque las plantas lo absorbieron al crecer.' },
    { n: 'Cogeneración eficiente', t: 'Tecnología', ok: ['fosil'], matiz: true, e: 'Su recurso es fósil (gas natural), pero la ley la cuenta como energía limpia por su eficiencia (Ley del Sector Eléctrico, art. 3, fr. XXI, inciso k). Es limpia, no renovable.' },
  ];
  const estado = {};
  function pintaMazo() {
    const mazo = $('#mazo'); mazo.innerHTML = '';
    document.querySelectorAll('.caja ul').forEach((u) => (u.innerHTML = ''));
    CARTAS.forEach((c, i) => {
      const art = document.createElement('article');
      art.className = 'carta'; art.draggable = true; art.dataset.i = i;
      art.innerHTML = `<span class="tipo">${c.t}</span><h4>${c.n}</h4>` +
        `<div class="opciones" role="group" aria-label="Clasificar ${c.n}">` +
        ['fosil', 'nuclear', 'renovable'].map((k) => `<button type="button" data-cat="${k}">${NOM[k]}</button>`).join('') +
        `</div><div class="retro" aria-live="polite" hidden></div>`;
      art.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => clasifica(i, b.dataset.cat)));
      art.addEventListener('dragstart', (ev) => ev.dataTransfer.setData('text/plain', String(i)));
      mazo.appendChild(art);
    });
    Object.keys(estado).forEach((k) => delete estado[k]);
    puntaje();
  }
  function clasifica(i, cat) {
    if (estado[i]) return;
    const c = CARTAS[i];
    const acierto = c.ok.includes(cat);
    const clase = acierto ? (c.matiz ? 'matiz' : 'ok') : 'mal';
    estado[i] = { cat, acierto };
    const art = $(`.carta[data-i="${i}"]`);
    art.classList.add(clase); art.draggable = false;
    art.querySelectorAll('button').forEach((b) => (b.disabled = true));
    const r = art.querySelector('.retro'); r.hidden = false; r.className = `retro ${clase}`;
    const titulo = acierto ? (c.matiz ? 'Correcto, con un matiz' : 'Correcto') : `No: es ${c.ok.map((k) => NOM[k].toLowerCase()).join(' o ')}`;
    r.innerHTML = `<b>${titulo}</b>${c.e}`;
    const li = document.createElement('li'); li.textContent = `${acierto ? '✓' : '✗'} ${c.n}`;
    $(`.caja[data-cat="${cat}"] ul`).appendChild(li);
    puntaje();
  }
  function puntaje() {
    const hechos = Object.keys(estado).length, ok = Object.values(estado).filter((e) => e.acierto).length;
    $('#puntaje').textContent = `${hechos} de ${CARTAS.length} clasificadas · ${ok} aciertos` + (hechos === CARTAS.length ? ` · ${Math.round((100 * ok) / hechos)} %` : '');
  }
  document.querySelectorAll('.caja').forEach((caja) => {
    caja.addEventListener('dragover', (ev) => { ev.preventDefault(); caja.classList.add('sobre'); });
    caja.addEventListener('dragleave', () => caja.classList.remove('sobre'));
    caja.addEventListener('drop', (ev) => { ev.preventDefault(); caja.classList.remove('sobre'); clasifica(+ev.dataTransfer.getData('text/plain'), caja.dataset.cat); });
  });
  $('#reiniciar').addEventListener('click', pintaMazo);
  pintaMazo();

  /* ===================== 3. DIAGRAMAS ===================== */
  const DIAG = [
    { n: 'Gas natural', e: [
      ['Gas natural', 'Energía química', 'El metano del gas guarda energía en sus enlaces químicos. Llega a la central por gasoducto.'],
      ['Combustión', 'Química → térmica', 'El gas se quema con aire comprimido en la cámara de combustión. Se forman gases a más de 1,000 °C.'],
      ['Turbinas', 'Térmica → mecánica', 'En un ciclo combinado, los gases calientes mueven la turbina de gas; su escape aún caliente produce vapor en una caldera de recuperación y ese vapor mueve una segunda turbina.'],
      ['Generador', 'Mecánica → eléctrica', 'El eje de las turbinas gira el rotor del generador. Por inducción electromagnética (ley de Faraday) se induce tensión alterna en el estator.'],
      ['Electricidad', 'Energía eléctrica', 'Un transformador eleva la tensión para enviarla a la red de transmisión.'] ] },
    { n: 'Carbón', e: [
      ['Carbón', 'Energía química', 'El carbón se tritura hasta polvo para que se queme de forma rápida y completa.'],
      ['Combustión', 'Química → térmica', 'Se quema en la caldera; el calor se transfiere al agua que circula por los tubos de sus paredes.'],
      ['Vapor', 'Energía térmica', 'El agua se convierte en vapor a alta presión y temperatura (ciclo Rankine).'],
      ['Turbina', 'Térmica → mecánica', 'El vapor se expande en la turbina y la hace girar; después se condensa y regresa a la caldera.'],
      ['Generador', 'Mecánica → eléctrica', 'La turbina gira el generador, que induce la tensión alterna.'],
      ['Electricidad', 'Energía eléctrica', 'Se eleva la tensión y se envía a la red.'] ] },
    { n: 'Uranio', e: [
      ['Uranio', 'Energía nuclear', 'El combustible es uranio en pastillas, dentro de barras metálicas en el núcleo del reactor.'],
      ['Fisión', 'Nuclear → térmica', 'Cada fisión divide un núcleo de uranio y libera energía y neutrones que provocan nuevas fisiones de forma controlada.'],
      ['Calor', 'Energía térmica', 'La energía de los fragmentos calienta el combustible y el agua que lo rodea. No hay combustión.'],
      ['Vapor', 'Energía térmica', 'El agua hierve y produce vapor, igual que en una termoeléctrica.'],
      ['Turbina y generador', 'Térmica → mecánica → eléctrica', 'El vapor mueve la turbina, que gira el generador.'],
      ['Electricidad', 'Energía eléctrica', 'En México toda la generación nuclear viene de Laguna Verde (Veracruz).'] ] },
    { n: 'Radiación solar', e: [
      ['Radiación solar', 'Energía radiante', 'La luz del Sol llega como fotones.'],
      ['Efecto fotovoltaico', 'Radiante → eléctrica', 'En la celda de silicio, los fotones liberan electrones y el campo interno de la unión p-n los empuja: aparece una corriente directa. No hay turbina ni generador.'],
      ['Inversor', 'CD → CA', 'Convierte la corriente directa de los paneles en corriente alterna sincronizada con la red.'],
      ['Electricidad', 'Energía eléctrica', 'Solo se produce mientras hay luz; de noche la generación es cero si no hay almacenamiento.'] ] },
    { n: 'Viento', e: [
      ['Viento', 'Energía cinética', 'Masa de aire en movimiento. La potencia disponible crece con el cubo de la velocidad del viento.'],
      ['Rotor', 'Cinética → mecánica', 'Las aspas frenan parte del viento y convierten esa energía en giro del eje.'],
      ['Aerogenerador', 'Mecánica → eléctrica', 'Una caja de engranes (o un generador de muchos polos) adapta la velocidad y el generador produce electricidad.'],
      ['Electricidad', 'Energía eléctrica', 'La producción varía con el viento; por eso se combina con otras centrales.'] ] },
    { n: 'Agua', e: [
      ['Agua', 'Energía potencial o cinética', 'El agua almacenada en una presa tiene energía potencial por su altura; la de un río, energía cinética.'],
      ['Conducción', 'Potencial → cinética', 'Al bajar por la tubería de presión, el agua gana velocidad.'],
      ['Turbina', 'Cinética → mecánica', 'El chorro o el flujo de agua hace girar la turbina.'],
      ['Generador', 'Mecánica → eléctrica', 'La turbina gira el generador.'],
      ['Electricidad', 'Energía eléctrica', 'La producción depende de la lluvia: en años de estiaje baja.'] ] },
  ];
  let dSel = 0;
  function pintaDiag() {
    const tabs = $('#diag-tabs');
    tabs.innerHTML = DIAG.map((d, i) => `<button type="button" class="filtro" aria-pressed="${i === dSel}" data-d="${i}">${d.n}</button>`).join('');
    tabs.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { dSel = +b.dataset.d; pintaDiag(); }));
    const d = DIAG[dSel];
    $('#diagrama').innerHTML = d.e.map((e, i) => `${i ? '<span class="flecha" aria-hidden="true">→</span>' : ''}<button type="button" class="etapa" aria-pressed="${i === 0}" data-e="${i}">${e[0]}<small>${e[1]}</small></button>`).join('');
    $('#diagrama').querySelectorAll('.etapa').forEach((b) => b.addEventListener('click', () => {
      $('#diagrama').querySelectorAll('.etapa').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      explica(+b.dataset.e);
    }));
    explica(0);
  }
  function explica(i) {
    const e = DIAG[dSel].e[i];
    $('#explica').innerHTML = `<span class="forma">${e[1]}</span><h4>Etapa ${i + 1} de ${DIAG[dSel].e.length}: ${e[0]}</h4><p style="margin:0">${e[2]}</p>`;
  }
  pintaDiag();

  /* ===================== DATOS ===================== */
  fetch('datos/atlas-datos.json').then((r) => r.json()).then(conDatos).catch(() => {
    $('#kpis-limpia').innerHTML = '<div class="nodisp"><strong>No se pudieron cargar los datos.</strong>Abre el sitio desde un servidor (GitHub Pages o «python -m http.server»).</div>';
  });

  function conDatos(d) {
    const g = d.generacion.nacional_generacion_neta_gwh;
    const cap = d.generacion.nacional_capacidad_mw;
    const A = [2022, 2023, 2024], I = A.map((a) => g.anios.indexOf(a));
    const porRec = (i) => { const o = { fosil: 0, nuclear: 0, renovable: 0 }; Object.entries(g.datos).forEach(([k, s]) => (o[REC_PLAN[k]] += s[i])); return o; };
    const nac = I.map(porRec);
    const tot = I.map((i) => g.total[i]);
    const pct = (x, t) => (100 * x) / t;

    // KPIs de participación limpia
    const cfeH = d.generacion.cfe_hitos;
    const k22 = cfeH.find((h) => h.id === 'cfe22_limpia'), k23 = cfeH.find((h) => h.id === 'cfe23_limpia');
    $('#kpis-limpia').innerHTML = A.map((a, j) => `<article class="kpi"><div class="cab"><span class="nombre">Generación limpia ${a}</span><span class="alcance">Nacional</span></div>` +
      `<div class="valor">${fmt(pct(g.limpias[I[j]], tot[j]), 1)} <small>%</small></div><span class="sello calculo">Cálculo</span>` +
      `<div class="pie">${fmt(g.limpias[I[j]])} ÷ ${fmt(tot[j])} GWh · Plan, Tabla 2.2, p. 20</div></article>`).join('') +
      `<article class="kpi"><div class="cab"><span class="nombre">Generación limpia de la CFE</span><span class="alcance">CFE</span></div>` +
      `<div class="valor" style="font-size:1.5rem">${k22.valor} % <small>en 2022</small><br>${k23.valor} % <small>en 2023</small></div><span class="sello oficial">Dato oficial</span>` +
      `<div class="pie">Informe Anual 2022, p. 34; Informe Anual 2023, p. 18. Porcentajes de la propia CFE.</div></article>`;

    // Gráfica 1: nacional por recurso
    const REC = ['fosil', 'nuclear', 'renovable'];
    $('#ley-recurso').innerHTML = REC.map((r) => `<li><i style="background:${COL[r]}"></i>${NOM[r]}</li>`).join('');
    let u1 = 'gwh';
    const ds1 = () => REC.map((r) => ({ label: NOM[r], data: nac.map((o, j) => (u1 === 'pct' ? pct(o[r], tot[j]) : o[r])), backgroundColor: COL[r], borderColor: '#fff', borderWidth: { right: 2 }, borderSkipped: false, maxBarThickness: 90 }));
    const g1 = new Chart($('#g-recurso'), {
      type: 'bar', data: { labels: A.map(String), datasets: ds1() },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        scales: { x: { stacked: true, grid: { color: '#EEF3FB' }, border: { display: false }, ticks: { callback: (x) => (u1 === 'pct' ? x + ' %' : fmt(x / 1000) + ' TWh') } },
                  y: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { color: '#0B2A5B', font: { weight: 600 } } } },
        plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (c) => { const r = REC[c.datasetIndex], o = nac[c.dataIndex]; return ` ${NOM[r]}: ${fmt(o[r])} GWh (${fmt(pct(o[r], tot[c.dataIndex]), 1)} %)`; } } } } } });
    document.querySelectorAll('[data-u1]').forEach((b) => b.addEventListener('click', () => {
      u1 = b.dataset.u1; document.querySelectorAll('[data-u1]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      g1.data.datasets = ds1(); g1.options.scales.x.max = u1 === 'pct' ? 100 : undefined; g1.update(); }));
    $('#tabla-recurso').innerHTML = `<table><thead><tr><th>Recurso</th>${A.map((a) => `<th class="n">${a} (GWh)</th><th class="n">${a} (%)</th>`).join('')}</tr></thead><tbody>` +
      REC.map((r) => `<tr><td>${NOM[r]}</td>${nac.map((o, j) => `<td class="n">${fmt(o[r])}</td><td class="n">${fmt(pct(o[r], tot[j]), 1)}</td>`).join('')}</tr>`).join('') +
      `</tbody><tfoot><tr><td>Total</td>${tot.map((t) => `<td class="n">${fmt(t)}</td><td class="n">100</td>`).join('')}</tr></tfoot></table>`;
    document.querySelectorAll('[data-tabla]').forEach((bt) => bt.addEventListener('click', () => {
      const t = document.getElementById(bt.dataset.tabla); const ab = t.hidden; t.hidden = !ab;
      bt.setAttribute('aria-expanded', String(ab)); bt.textContent = ab ? 'Ocultar tabla' : 'Ver tabla'; }));

    // Gráfica 2: CFE contra nacional (porcentajes)
    const c = d.generacion.cfe_generacion_bruta_gwh;
    const cfe = [0, 1].map((j) => { const o = { fosil: 0, nuclear: 0, renovable: 0 }; Object.entries(c.datos).forEach(([k, s]) => (o[REC_CFE[k]] += s[j])); return o; });
    const cfeT = cfe.map((o) => o.fosil + o.nuclear + o.renovable);
    const filas = [['Nacional 2023', nac[1], tot[1]], ['CFE 2023', cfe[0], cfeT[0]], ['Nacional 2024', nac[2], tot[2]], ['CFE 2024', cfe[1], cfeT[1]]];
    new Chart($('#g-cfe'), {
      type: 'bar', data: { labels: filas.map((f) => f[0]), datasets: REC.map((r) => ({ label: NOM[r], data: filas.map((f) => pct(f[1][r], f[2])), backgroundColor: COL[r], borderColor: '#fff', borderWidth: { right: 2 }, borderSkipped: false, maxBarThickness: 46 })) },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        scales: { x: { stacked: true, max: 100, grid: { color: '#EEF3FB' }, border: { display: false }, ticks: { callback: (x) => x + ' %' } }, y: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { color: '#0B2A5B', font: { weight: 600 } } } },
        plugins: { legend: { position: 'top', align: 'start', labels: { boxWidth: 12, boxHeight: 12, color: '#101828' } }, tooltip: { ...TIP, callbacks: { label: (x) => ` ${x.dataset.label}: ${fmt(x.raw, 1)} % (${fmt(filas[x.dataIndex][1][REC[x.datasetIndex]])} GWh)` } } } } });

    // Gráfica 3: tecnologías 2024
    const i24 = I[2];
    const ranking = Object.keys(g.datos).map((k) => ({ k, v: g.datos[k][i24], p: pct(g.datos[k][i24], tot[2]), r: REC_PLAN[k] })).sort((a, b) => b.v - a.v);
    new Chart($('#g-top'), {
      type: 'bar', data: { labels: ranking.map((x) => (x.k === 'Cogeneración eficiente' ? 'Cogeneración eficiente*' : x.k)), datasets: [{ data: ranking.map((x) => x.p), backgroundColor: ranking.map((x) => COL[x.r]), borderRadius: { topRight: 4, bottomRight: 4 }, borderSkipped: false, maxBarThickness: 18 }] },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        scales: { x: { grid: { color: '#EEF3FB' }, border: { display: false }, ticks: { callback: (x) => x + ' %' } }, y: { grid: { display: false }, border: { display: false }, ticks: { color: '#101828', font: { size: 11 } } } },
        plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (x) => { const r = ranking[x.dataIndex]; return ` ${fmt(r.p, 1)} % · ${fmt(r.v)} GWh · ${NOM[r.r]}${r.k === 'Cogeneración eficiente' ? ' (limpia por ley)' : ''}`; } } } } },
      plugins: [{ id: 'etiquetas', afterDatasetsDraw(ch) { const ctx = ch.ctx; ctx.save(); ctx.font = '600 11px Inter, sans-serif'; ctx.fillStyle = '#101828'; ctx.textBaseline = 'middle';
        ch.getDatasetMeta(0).data.forEach((b, i) => ctx.fillText(fmt(ranking[i].p, 1) + ' %', b.x + 6, b.y)); ctx.restore(); } }] });

    comparador(d, g, cap, i24, tot[2]);
    conciencia(g, A, I, tot, nac);
    reflexion();
  }

  /* ===================== 5. COMPARADOR ===================== */
  function comparador(d, g, cap, i, total) {
    const E = d.emisiones.datos;
    const fp = (k) => (cap.datos[k] && cap.datos[k][i] ? (100 * g.datos[k][i] * 1000) / (cap.datos[k][i] * 8760) : null);
    const part = (k) => (100 * g.datos[k][i]) / total;
    const R = [
      { id: 'gas', n: 'Gas natural', cat: 'fosil', limpia: 'No (sí cuando es cogeneración eficiente)', comb: 'Gas natural (metano)', proc: 'Combustión → turbina de gas y de vapor', tec: 'Ciclo combinado', plan: 'Ciclo combinado', disp: 'Despachable: produce cuando se le pide', ipcc: 'Gas (ciclo combinado)' },
      { id: 'carbon', n: 'Carbón', cat: 'fosil', limpia: 'No', comb: 'Carbón mineral', proc: 'Combustión → vapor → turbina', tec: 'Carboeléctrica', plan: 'Carboeléctrica', disp: 'Despachable', ipcc: 'Carbón (PC)' },
      { id: 'combustoleo', n: 'Combustóleo', cat: 'fosil', limpia: 'No', comb: 'Combustóleo (derivado del petróleo)', proc: 'Combustión → vapor → turbina', tec: 'Vapor convencional (también usa gas)', plan: 'Térmica convencional', disp: 'Despachable', ipcc: null },
      { id: 'diesel', n: 'Diésel', cat: 'fosil', limpia: 'No', comb: 'Diésel (derivado del petróleo)', proc: 'Combustión en motor o turbina', tec: 'Combustión interna, turbogás (también usan gas)', plan: 'Combustión interna', disp: 'Despachable, arranque rápido', ipcc: null },
      { id: 'uranio', n: 'Uranio', cat: 'nuclear', limpia: 'Sí, por ley', comb: 'Uranio', proc: 'Fisión → calor → vapor → turbina', tec: 'Nucleoeléctrica', plan: 'Nucleoeléctrica', disp: 'Despachable, opera casi siempre a plena carga', ipcc: 'Nuclear' },
      { id: 'sol', n: 'Radiación solar', cat: 'renovable', limpia: 'Sí', comb: 'Ninguno', proc: 'Efecto fotovoltaico', tec: 'Solar fotovoltaica', plan: 'Solar fotovoltaica', disp: 'Variable: solo de día', ipcc: 'Solar FV (gran escala)' },
      { id: 'viento', n: 'Viento', cat: 'renovable', limpia: 'Sí', comb: 'Ninguno', proc: 'Energía cinética → rotor → generador', tec: 'Eólica', plan: 'Eólica', disp: 'Variable: depende del viento', ipcc: 'Eólica terrestre' },
      { id: 'agua', n: 'Agua', cat: 'renovable', limpia: 'Sí', comb: 'Ninguno', proc: 'Energía potencial → turbina', tec: 'Hidroeléctrica', plan: 'Hidroeléctrica', disp: 'Despachable mientras haya agua; depende de la lluvia', ipcc: 'Hidroeléctrica' },
      { id: 'geo', n: 'Calor geotérmico', cat: 'renovable', limpia: 'Sí', comb: 'Vapor del subsuelo', proc: 'Vapor → turbina', tec: 'Geotermoeléctrica', plan: 'Geotérmica', disp: 'Constante', ipcc: 'Geotérmica' },
      { id: 'bio', n: 'Biomasa y biogás', cat: 'renovable', limpia: 'Sí', comb: 'Residuos orgánicos, biogás', proc: 'Combustión → vapor o motor', tec: 'Bioenergía', plan: 'Bioenergía', disp: 'Despachable si hay combustible', ipcc: 'Biomasa dedicada' },
    ];
    const sel = new Set(['gas', 'carbon', 'uranio', 'viento']);
    let modo = 'vida';
    const chips = $('#comp-chips');
    chips.innerHTML = R.map((r) => `<button type="button" class="filtro" data-r="${r.id}" aria-pressed="${sel.has(r.id)}"><i style="background:${COL[r.cat]}"></i>${r.n}</button>`).join('');
    chips.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      sel.has(b.dataset.r) ? sel.delete(b.dataset.r) : sel.add(b.dataset.r);
      b.setAttribute('aria-pressed', String(sel.has(b.dataset.r))); pinta(); }));
    const nd = '<span class="sello nd">Dato no disponible</span>';
    const rango = (x) => (x ? `${fmt(x[1], x[1] < 10 ? 1 : 0)} <small style="color:#5B6B85">(${fmt(x[0], x[0] < 10 ? 1 : 0)}–${fmt(x[2], 0)})</small>` : nd);
    const emis = new Chart($('#g-emis'), {
      type: 'bar', data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderRadius: { topRight: 4, bottomRight: 4 }, borderSkipped: false, maxBarThickness: 22 }] },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        scales: { x: { beginAtZero: true, grid: { color: '#EEF3FB' }, border: { display: false }, title: { display: true, text: 'g CO₂eq/kWh (mediana)' } }, y: { grid: { display: false }, border: { display: false }, ticks: { color: '#101828' } } },
        plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (x) => { const r = emis._r[x.dataIndex]; const e = r.ipcc && E[r.ipcc]; const s = e && (modo === 'vida' ? e[1] : e[0]); return s ? ` Mediana ${fmt(s[1], 1)} · rango ${fmt(s[0], 1)}–${fmt(s[2], 0)} g CO₂eq/kWh` : ' Dato no disponible'; } } } } },
      plugins: [{ id: 'nd', afterDatasetsDraw(ch) { const ctx = ch.ctx; ctx.save(); ctx.font = '600 11px Inter, sans-serif'; ctx.textBaseline = 'middle';
        ch.getDatasetMeta(0).data.forEach((b, i) => { const val = ch.data.datasets[0].data[i]; ctx.fillStyle = val == null ? '#5B6B85' : '#101828'; ctx.fillText(val == null ? 'Dato no disponible' : fmt(val, val < 10 ? 1 : 0), (val == null ? ch.scales.x.left : b.x) + 6, b.y); }); ctx.restore(); } }] });
    document.querySelectorAll('[data-emis]').forEach((b) => b.addEventListener('click', () => {
      modo = b.dataset.emis; document.querySelectorAll('[data-emis]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); pinta(); }));
    function pinta() {
      const L = R.filter((r) => sel.has(r.id));
      $('#comp-aviso').hidden = L.length >= 2;
      const filas = [
        ['Categoría', (r) => `<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:10px;height:10px;border-radius:3px;background:${COL[r.cat]}"></i>${NOM[r.cat]}</span>`],
        ['¿Renovable?', (r) => (r.cat === 'renovable' ? 'Sí' : 'No')],
        ['¿Limpia por ley?', (r) => r.limpia],
        ['Combustible o fuente', (r) => r.comb],
        ['Proceso de conversión', (r) => r.proc],
        ['Tecnología en México', (r) => r.tec],
        ['Disponibilidad', (r) => r.disp],
        ['Factor de planta 2024 <span class="sello calculo">Cálculo</span>', (r) => { if (r.id === 'combustoleo' || r.id === 'diesel') return nd + '<br><small>La tabla oficial es por tecnología y esas tecnologías mezclan combustibles.</small>'; const f = fp(r.plan); return f == null ? nd : `${fmt(f, 1)} % <small style="color:#5B6B85">de ${r.plan.toLowerCase()}</small>`; }],
        ['Importancia en la matriz 2024 <span class="sello calculo">Cálculo</span>', (r) => `${fmt(part(r.plan), 1)} % <small style="color:#5B6B85">(${r.plan.toLowerCase()}${r.id === 'combustoleo' ? '; puede usar gas' : ''}${r.id === 'diesel' ? '; puede usar gas' : ''})</small>`],
        ['Emisiones directas (g CO₂eq/kWh)', (r) => { if (!r.ipcc) return nd; const e = E[r.ipcc][0]; return e ? (e[2] === 0 ? '0' : rango(e)) : nd + '<br><small>El IPCC no reporta valor directo para biomasa.</small>'; }],
        ['Emisiones de ciclo de vida (g CO₂eq/kWh)', (r) => (r.ipcc ? rango(E[r.ipcc][1]) : nd)],
      ];
      $('#comp-tabla').innerHTML = `<table><thead><tr><th>Atributo</th>${L.map((r) => `<th>${r.n}</th>`).join('')}</tr></thead><tbody>` +
        filas.map(([t, f]) => `<tr><td>${t}</td>${L.map((r) => `<td>${f(r)}</td>`).join('')}</tr>`).join('') + '</tbody></table>' +
        '<p class="fuente" style="margin:0;padding:10px 14px">Factor de planta = generación neta 2024 ÷ (capacidad instalada × 8,760 h), con Plan Tablas 2.1 (p. 19) y 2.2 (p. 20); es aproximado porque compara generación neta con capacidad instalada. Emisiones: IPCC AR5, Anexo III, p. 1335 (mediana y rango mínimo-máximo). Solar: valor de gran escala; en techos la mediana de ciclo de vida es 41.</p>';
      emis._r = L;
      emis.data.labels = L.map((r) => r.n);
      emis.data.datasets[0].data = L.map((r) => { const e = r.ipcc && E[r.ipcc]; const s = e && (modo === 'vida' ? e[1] : e[0]); return s ? s[1] : null; });
      emis.data.datasets[0].backgroundColor = L.map((r) => COL[r.cat]);
      emis.update();
    }
    pinta();
  }

  /* ===================== 6. CONCIENCIA ===================== */
  function conciencia(g, A, I, tot, nac) {
    const D = g.datos;
    const fosConv = I.map((i, j) => (100 * ['Carboeléctrica', 'Térmica convencional', 'Combustión interna', 'Turbogás', 'Ciclo combinado'].reduce((s, k) => s + D[k][i], 0)) / tot[j]);
    const ren = nac.map((o, j) => (100 * o.renovable) / tot[j]);
    const nuc = I.map((i, j) => (100 * D['Nucleoeléctrica'][i]) / tot[j]);
    const t = (x) => fmt(x, 1) + ' %';
    const cards = [
      ['1 · Dependencia fósil', t(fosConv[2]), `de la electricidad de 2024 salió de centrales fósiles convencionales (${t(fosConv[0])} en 2022). Solo el ciclo combinado aportó ${t((100 * D['Ciclo combinado'][I[2]]) / tot[2])}.`, 'Plan, p. 19 (76.6 %) y Tabla 2.2, p. 20', fosConv],
      ['2 · Participación renovable', t(ren[2]), `en 2024, contra ${t(ren[0])} en 2022. La caída se concentra en 2023, cuando la hidroeléctrica bajó 42 % por falta de lluvia.`, 'Plan, Tabla 2.2, p. 20; CFE, Informe Anual 2023, p. 18 (estiaje)', ren],
      ['3 · Participación nuclear', t(nuc[2]), `de la generación nacional de 2024 (${fmt(D['Nucleoeléctrica'][I[2]])} GWh), todo de una sola central: Laguna Verde. Es limpia por ley, no renovable.`, 'Plan, Tabla 2.2, p. 20', nuc],
      ['4 · Evolución de tecnologías', `${fmt(D['Solar fotovoltaica'][I[2]])} GWh`, 'generó la solar en 2024; en 2010 no inyectaba nada. El carbón bajó 63 % en el mismo periodo. Mira las gráficas pequeñas de abajo.', 'Plan, Tabla 2.2, p. 20', null],
      ['5 · Implicaciones', '≈ 45 veces', 'más emisiones de ciclo de vida tiene un kWh de gas en ciclo combinado (mediana 490 g) que uno eólico (11 g). A cambio, el gas está disponible cuando se necesita y el viento no.', 'IPCC AR5, Anexo III, p. 1335; Plan, Tablas 2.1 y 2.2', null],
    ];
    $('#ind-conciencia').innerHTML = cards.map((c, n) => `<article class="kpi"><div class="cab"><span class="nombre">${c[0]}</span><span class="alcance">${n === 4 ? 'Global / Nacional' : 'Nacional'}</span></div>` +
      `<div class="valor">${c[1]}</div><p style="margin:0;font-size:.92rem">${c[2]}</p>${c[4] ? `<div class="mini"><canvas id="mini-${n}" role="img" aria-label="Tendencia 2022 a 2024"></canvas></div>` : ''}` +
      `${n === 0 ? '<span class="sello oficial">Dato oficial</span>' : '<span class="sello calculo">Cálculo</span>'}<div class="pie">${c[3]}</div></article>`).join('');
    cards.forEach((c, n) => { if (!c[4]) return; new Chart($(`#mini-${n}`), { type: 'line', data: { labels: A.map(String), datasets: [{ data: c[4], borderColor: '#0F4DBC', backgroundColor: '#0F4DBC', borderWidth: 2, pointRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false }, border: { display: false } }, y: { grid: { color: '#EEF3FB' }, border: { display: false }, ticks: { maxTicksLimit: 3, callback: (x) => fmt(x, 0) + ' %' } } },
        plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (x) => ' ' + fmt(x.raw, 1) + ' %' } } } } }); });

    // Gráficas pequeñas 2010-2024
    const S = [['Solar fotovoltaica', 'Solar fotovoltaica'], ['Eólica', 'Eólica'], ['Hidroeléctrica', 'Hidroeléctrica'], ['Carboeléctrica', 'Carboeléctrica']];
    $('#multiples').innerHTML = S.map(([k, n], j) => `<div class="panel"><h4>${n}</h4><div class="cifra">${fmt(D[k][0])} GWh (2010) → ${fmt(D[k][14])} GWh (2024)</div><div class="mini" style="height:140px"><canvas id="mul-${j}" role="img" aria-label="${n} 2010 a 2024"></canvas></div></div>`).join('');
    S.forEach(([k], j) => new Chart($(`#mul-${j}`), { type: 'line', data: { labels: g.anios.map(String), datasets: [{ data: D[k], borderColor: '#0F4DBC', borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, fill: false }] },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        scales: { x: { grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 3, maxRotation: 0 } }, y: { beginAtZero: true, grid: { color: '#EEF3FB' }, border: { display: false }, ticks: { maxTicksLimit: 3, callback: (x) => fmt(x / 1000) + ' TWh' } } },
        plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (x) => ' ' + fmt(x.raw) + ' GWh' } } } } }));
  }

  /* ===================== 7. REFLEXIÓN ===================== */
  function reflexion() {
    const P = [
      { q: 'Entre 2022 y 2023 la participación renovable nacional bajó de 23.1 % a 18.5 %. Según las gráficas, ¿qué la explica principalmente?', ref: 'Usa: indicador 4 (gráficas pequeñas) y la gráfica por recurso.',
        o: ['La solar fotovoltaica dejó de crecer', 'La hidroeléctrica cayó de 35,561 a 20,609 GWh', 'La eólica se redujo a la mitad', 'La nuclear salió de operación'], c: 1,
        r: 'La hidroeléctrica perdió casi 15,000 GWh (−42 %) por el estiaje de 2023 (CFE, Informe 2023, p. 18). Solar y eólica crecieron o se mantuvieron. Lección: un recurso renovable no siempre es estable año con año.' },
      { q: 'En 2024 la nuclear fue 8.0 % de la generación de la CFE pero solo 3.4 % de la nacional. ¿Por qué?', ref: 'Usa: gráfica «CFE contra el país».',
        o: ['Porque la CFE opera reactores que el país no cuenta', 'Porque toda la nuclear es de la CFE (Laguna Verde), y la CFE genera solo una parte del total nacional', 'Porque la nuclear de los privados se resta', 'Porque los datos de la CFE están equivocados'], c: 1,
        r: 'La misma energía nuclear pesa más en un total más pequeño. Además, la CFE reporta generación bruta y el Plan generación neta, por eso se comparan porcentajes y no GWh.' },
      { q: 'Con las medianas de ciclo de vida del IPCC, ¿cuántas veces emite un kWh de gas en ciclo combinado respecto a uno eólico?', ref: 'Usa: comparador, con «Gas natural» y «Viento» en «Ciclo de vida».',
        o: ['Unas 4 veces', 'Unas 45 veces', 'Unas 450 veces', 'Lo mismo: ninguno emite en operación'], c: 1,
        r: '490 ÷ 11 ≈ 45. En emisiones directas la eólica marca 0, pero en ciclo de vida no: fabricar e instalar aerogeneradores también emite.' },
      { q: 'En 2024 la generación limpia fue 23.4 % y la renovable 18.9 %. ¿Qué explica la diferencia de 4.5 puntos?', ref: 'Usa: «Renovable no es lo mismo que limpia» y la gráfica de tecnologías 2024.',
        o: ['Un error de redondeo', 'La nuclear (3.4 %) y la cogeneración eficiente (1.1 %), que son limpias pero no renovables', 'Las importaciones de electricidad', 'La generación distribuida en techos'], c: 1,
        r: 'Limpia = renovables + nuclear + cogeneración eficiente. 18.9 + 3.4 + 1.1 = 23.4 %.' },
      { q: 'La nuclear (1,608 MW) generó 11,978 GWh en 2024 y la solar (7,961 MW) 18,640 GWh. Con 5 veces más capacidad, la solar no generó 5 veces más. ¿Por qué?', ref: 'Usa: fila «Factor de planta» del comparador con «Uranio» y «Radiación solar».',
        o: ['Porque los paneles solares están mal instalados', 'Porque la solar solo produce de día y con sol: su factor de planta fue ≈ 27 % contra ≈ 85 % de la nuclear', 'Porque la nuclear quema más combustible', 'Porque la solar se exporta'], c: 1,
        r: 'Capacidad (MW) no es lo mismo que energía (GWh). La energía depende de cuántas horas opera la central: la nuclear opera casi todo el año y la solar solo con sol.' },
    ];
    const resp = {};
    $('#preguntas').innerHTML = P.map((p, i) => `<article class="panel pregunta"><fieldset><legend>${i + 1}. ${p.q}</legend><p class="ref">${p.ref}</p>` +
      p.o.map((o, j) => `<label><input type="radio" name="p${i}" value="${j}"><span>${o}</span></label>`).join('') +
      `</fieldset><div class="retro" hidden aria-live="polite"></div></article>`).join('');
    document.querySelectorAll('.pregunta').forEach((art, i) => art.querySelectorAll('input').forEach((inp) => inp.addEventListener('change', () => {
      const j = +inp.value, p = P[i], bien = j === p.c; resp[i] = bien;
      art.querySelectorAll('label').forEach((l, k) => { l.classList.toggle('correcta', k === p.c); l.classList.toggle('incorrecta', k === j && !bien); });
      const r = art.querySelector('.retro'); r.hidden = false; r.className = `retro ${bien ? 'ok' : 'mal'}`;
      r.innerHTML = `<b>${bien ? 'Correcto' : 'No exactamente'}</b>${p.r}`;
      const n = Object.keys(resp).length, ok = Object.values(resp).filter(Boolean).length;
      $('#puntaje-ref').textContent = `${n} de 5 respondidas · ${ok} correctas`;
    })));
  }
})();
