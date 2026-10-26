'use strict';

// El editor de personalización todavía no escribe en Sheets ni procesa pagos.
const MesaModel = (() => {
  const VERSION = 1;
  const KEY = 'eva.mesa-viajera.drafts.v1';
  const FONTS = ['Poppins', 'Great Vibes', 'Bodoni Moda', 'Roboto'];
  const COLORS = [
    ['COLOR_PRIMARIO', 'Principal', 'Nombres y títulos', '#073F4C'],
    ['COLOR_FONDO', 'Fondo', 'Página y certificado', '#FFFFFF'],
    ['COLOR_SECUNDARIO', 'Secundario', 'Frases y textos de apoyo', '#007B91'],
    ['COLOR_ACENTO', 'Acento', 'Detalles y elementos destacados', '#BDE54D'],
    ['COLOR_DORADO', 'Dorado', 'Adornos de la página', '#B89B5E']
  ];
  const FONT_FIELDS = [['FUENTE_NOMBRES', 'Nombres'], ['FUENTE_TITULOS', 'Títulos'], ['FUENTE_CATEGORIAS', 'Categorías'], ['FUENTE_CUERPO', 'Cuerpo']];
  const DEFAULTS = Object.freeze({
    NOMBRES: '', NOMBRE_MESA: '', PREFIJO_FOLIO: '',
    CERT_TITULO: 'Certificado de regalo', CERT_SUBTITULO: 'Un detalle para celebrar lo que viene',
    ...Object.fromEntries(COLORS.map(([key, , , value]) => [key, value])),
    FUENTE_NOMBRES: 'Great Vibes', FUENTE_TITULOS: 'Poppins', FUENTE_CATEGORIAS: 'Poppins', FUENTE_CUERPO: 'Poppins'
  });
  const LIMITS = { NOMBRES: 100, NOMBRE_MESA: 120, PREFIJO_FOLIO: 16, CERT_TITULO: 80, CERT_SUBTITULO: 180 };
  function cleanText(value, max) { return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max) : ''; }
  function cleanDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    const date = new Date(value + 'T12:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : '';
  }
  function cleanConfig(raw) {
    const result = { ...DEFAULTS };
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;
    for (const [key, max] of Object.entries(LIMITS)) {
      if (Object.hasOwn(raw, key)) result[key] = cleanText(raw[key], max);
    }
    result.PREFIJO_FOLIO = result.PREFIJO_FOLIO.toUpperCase().replace(/[^A-Z0-9]/g, '');
    for (const [key] of COLORS) if (typeof raw[key] === 'string' && /^#[0-9a-f]{6}$/i.test(raw[key])) result[key] = raw[key].toUpperCase();
    for (const [key] of FONT_FIELDS) if (FONTS.includes(raw[key])) result[key] = raw[key];
    return result;
  }
  function newDraft(id, time, config) { return { id, updatedAt: time, fechaCelebracion: '', config: cleanConfig(config) }; }
  function cloneDesign(source, id, time) {
    const config = cleanConfig(source.config);
    config.NOMBRES = ''; config.NOMBRE_MESA = ''; config.PREFIJO_FOLIO = '';
    return newDraft(id, time, config);
  }
  function importDraft(raw, id, time) {
    if (!raw || raw.type !== 'eva.mesa-viajera.personalizacion' || raw.version !== VERSION || !raw.config || typeof raw.config !== 'object' || Array.isArray(raw.config)) throw new Error('Este archivo no es un borrador compatible de Mesa Viajera.');
    return { ...newDraft(id, time, raw.config), fechaCelebracion: cleanDate(raw.fechaCelebracion) };
  }
  function exportDraft(draft) { return { type: 'eva.mesa-viajera.personalizacion', version: VERSION, fechaCelebracion: cleanDate(draft.fechaCelebracion), config: cleanConfig(draft.config) }; }
  function completeCount(config) { return [config.NOMBRES.trim(), config.NOMBRE_MESA.trim(), /^[A-Z0-9]{1,16}$/.test(config.PREFIJO_FOLIO)].filter(Boolean).length; }
  function restore(raw) {
    if (!raw || raw.version !== VERSION || !Array.isArray(raw.drafts)) return { drafts: [], activeId: null };
    const seen = new Set();
    const drafts = raw.drafts.slice(0, 100).filter(d => {
      if (!d || typeof d.id !== 'string' || !/^[A-Za-z0-9-]{1,80}$/.test(d.id) || seen.has(d.id)) return false;
      seen.add(d.id); return true;
    }).map(d => ({ id: d.id, updatedAt: Number.isFinite(d.updatedAt) ? d.updatedAt : 0, fechaCelebracion: cleanDate(d.fechaCelebracion), config: cleanConfig(d.config) }));
    return { drafts, activeId: drafts.some(d => d.id === raw.activeId) ? raw.activeId : drafts[0]?.id || null };
  }
  return { VERSION, KEY, FONTS, COLORS, FONT_FIELDS, DEFAULTS, cleanConfig, newDraft, cloneDesign, importDraft, exportDraft, completeCount, restore };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = MesaModel;

if (typeof document !== 'undefined') (() => {
  const M = MesaModel;
  const $ = id => document.getElementById(id);
  const form = $('table-form');
  const status = $('status');
  const sheets = new MesaSheets.Client(window.EVA_MESA_GOOGLE);
  let sheetSnapshot = null;
  let catalog = [];
  let googleLoaded = false;
  let busy = false;
  let state = { drafts: [], activeId: null };
  let previewMode = 'table';
  let saveTimer;
  let diskAvailable = true;
  let recoveryWarning = '';
  const now = () => Date.now();
  const id = () => {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'mesa-' + [...crypto.getRandomValues(new Uint8Array(16))].map(n => n.toString(16).padStart(2, '0')).join('');
  };
  const active = () => state.drafts.find(d => d.id === state.activeId);
  function announce(message, error = false) { status.textContent = message; status.classList.toggle('error', error); }
  try {
    const stored = localStorage.getItem(M.KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.version !== M.VERSION || !Array.isArray(parsed.drafts)) throw new Error('Formato incompatible');
      state = M.restore(parsed);
    }
  } catch { recoveryWarning = 'No se pudo recuperar el guardado anterior. Puedes cargar un respaldo descargado.'; }
  if (!state.drafts.length) {
    const example = M.newDraft(id(), now(), { ...M.DEFAULTS, NOMBRES: 'Alex y Dani', NOMBRE_MESA: 'Mesa de Alex y Dani', PREFIJO_FOLIO: 'AD' });
    state = { drafts: [example], activeId: example.id };
  }
  function persist() {
    clearTimeout(saveTimer);
    try {
      localStorage.setItem(M.KEY, JSON.stringify({ version: M.VERSION, ...state }));
      diskAvailable = true;
      const time = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date());
      announce('Borrador guardado en este navegador · ' + time + ' · Sin sincronizar con Sheets');
      return true;
    } catch {
      diskAvailable = false;
      announce('El navegador no permite guardar. Descarga el borrador antes de salir; los cambios siguen en esta sesión.', true);
      return false;
    }
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    if (sheetSnapshot) { $('connection-progress').textContent='Cambios locales'; $('sheets-check').textContent='Revisar y guardar los cambios locales.'; }
    announce('Guardando borrador…'); saveTimer = setTimeout(persist, 400);
  }
  function renderList() {
    const list = $('draft-list'); list.replaceChildren();
    state.drafts.forEach(draft => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'draft-button';
      button.disabled = busy;
      button.classList.toggle('active', draft.id === state.activeId);
      button.setAttribute('aria-current', draft.id === state.activeId ? 'true' : 'false');
      const title = document.createElement('strong'); title.textContent = draft.config.NOMBRE_MESA.trim() || draft.config.NOMBRES.trim() || 'Nueva celebración';
      const sub = document.createElement('small'); sub.textContent = M.completeCount(draft.config) + '/3 datos básicos · Borrador local';
      button.append(title, sub);
      button.addEventListener('click', () => { if (busy) return; persist(); state.activeId = draft.id; clearSheetLink(); renderForm(); persist(); });
      list.append(button);
    });
  }
  function renderPreview() {
    const draft = active(), c = draft.config, surface = $('preview-surface');
    const colors = { COLOR_PRIMARIO: 'primary', COLOR_FONDO: 'bg', COLOR_SECUNDARIO: 'secondary', COLOR_ACENTO: 'accent', COLOR_DORADO: 'gold' };
    for (const [key, variable] of Object.entries(colors)) surface.style.setProperty('--wedding-' + variable, c[key]);
    const fonts = { FUENTE_NOMBRES: 'names', FUENTE_TITULOS: 'titles', FUENTE_CATEGORIAS: 'categories', FUENTE_CUERPO: 'body' };
    for (const [key, variable] of Object.entries(fonts)) surface.style.setProperty('--font-' + variable, '"' + c[key] + '"');
    document.querySelectorAll('[data-names]').forEach(el => { el.textContent = c.NOMBRES.trim() || '¿Quiénes celebran?'; });
    $('certificate-title').textContent = c.CERT_TITULO || 'Certificado de regalo';
    $('certificate-subtitle').textContent = c.CERT_SUBTITULO;
    $('example-folio').textContent = (c.PREFIJO_FOLIO || 'MV') + ' · EJEMPLO';
    $('preview-date').textContent = draft.fechaCelebracion ? new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(draft.fechaCelebracion + 'T12:00:00Z')) : 'Una historia que apenas comienza.';
    const count = M.completeCount(c);
    $('progress-count').textContent = count + ' de 3 datos básicos';
    $('identity-check').textContent = count === 3 ? '✓' : '○';
  }
  function renderForm() {
    const draft = active();
    for (const [key, value] of Object.entries(draft.config)) {
      const control = form.elements.namedItem(key);
      if (control) control.value = value;
      const hex = $('hex-' + key); if (hex) { hex.value = value; hex.setCustomValidity(''); }
    }
    form.elements.namedItem('fechaCelebracion').value = draft.fechaCelebracion;
    renderList(); renderPreview();
  }
  function setPreview(mode) {
    previewMode = mode;
    $('table-preview').hidden = mode !== 'table'; $('certificate-preview').hidden = mode !== 'certificate';
    $('view-table').setAttribute('aria-pressed', String(mode === 'table'));
    $('view-certificate').setAttribute('aria-pressed', String(mode === 'certificate'));
  }
  function setSection(section, focus = false) {
    document.querySelectorAll('[role=tab]').forEach(tab => {
      const selected = tab.dataset.section === section;
      tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
      $(tab.getAttribute('aria-controls')).hidden = !selected;
      if (selected && focus) tab.focus();
    });
    if (section === 'certificate') setPreview('certificate');
  }
  function buildControls() {
    for (const [key, name, description, initial] of M.COLORS) {
      const row = document.createElement('div'); row.className = 'color-row';
      const picker = document.createElement('input'); picker.type = 'color'; picker.name = key; picker.id = 'color-' + key; picker.value = initial; picker.setAttribute('aria-label', name + ': selector de color');
      const label = document.createElement('label'); label.htmlFor = picker.id; label.textContent = name;
      const help = document.createElement('small'); help.textContent = description; label.append(help);
      const hex = document.createElement('input'); hex.type = 'text'; hex.id = 'hex-' + key; hex.value = initial; hex.maxLength = 7; hex.pattern = '#[A-Fa-f0-9]{6}'; hex.setAttribute('aria-label', name + ': código hexadecimal'); hex.spellcheck = false;
      hex.addEventListener('input', () => {
        const value = hex.value.trim();
        if (!/^#[0-9a-f]{6}$/i.test(value)) { hex.setCustomValidity('Usa un color de seis dígitos, por ejemplo #073F4C.'); return; }
        hex.setCustomValidity(''); active().config[key] = value.toUpperCase(); picker.value = value;
        active().updatedAt = now(); renderPreview(); scheduleSave();
      });
      hex.addEventListener('blur', () => { if (!hex.checkValidity()) { hex.value = active().config[key]; hex.setCustomValidity(''); announce('El color no era válido. Se conservó el último color válido.'); } });
      row.append(picker, label, hex); $('color-fields').append(row);
    }
    for (const [key, name] of M.FONT_FIELDS) {
      const label = document.createElement('label'); label.textContent = name;
      const select = document.createElement('select'); select.name = key;
      M.FONTS.forEach(font => { const option = document.createElement('option'); option.value = font; option.textContent = font; select.append(option); });
      label.append(select); $('font-fields').append(label);
    }
  }
  buildControls();
  form.addEventListener('submit', e => e.preventDefault());
  form.addEventListener('input', event => {
    const control = event.target, key = control.name;
    if (!key) return;
    const draft = active();
    if (key === 'fechaCelebracion') draft.fechaCelebracion = control.value;
    else if (Object.hasOwn(M.DEFAULTS, key)) {
      draft.config = M.cleanConfig({ ...draft.config, [key]: control.value });
      if (key === 'PREFIJO_FOLIO') control.value = draft.config[key];
      const hex = $('hex-' + key); if (hex) { hex.value = draft.config[key]; hex.setCustomValidity(''); }
    } else return;
    draft.updatedAt = now(); renderPreview(); renderList(); scheduleSave();
  });
  document.querySelectorAll('[role=tab]').forEach(tab => {
    tab.addEventListener('click', () => setSection(tab.dataset.section));
    tab.addEventListener('keydown', event => {
      const tabs = [...document.querySelectorAll('[role=tab]')]; let next;
      if (event.key === 'ArrowRight') next = (tabs.indexOf(tab) + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (tabs.indexOf(tab) + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); setSection(tabs[next].dataset.section, true); }
    });
  });
  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => setSection(button.dataset.next, true)));
  document.querySelectorAll('[data-preview]').forEach(button => button.addEventListener('click', () => setPreview(button.dataset.preview)));
  $('view-table').addEventListener('click', () => setPreview('table'));
  $('view-certificate').addEventListener('click', () => setPreview('certificate'));
  function addDraft(draft) {
    if (busy) return false;
    if (state.drafts.length >= 100) { announce('Este navegador tiene 100 borradores. Descarga un respaldo y utiliza otro navegador para continuar.', true); return false; }
    persist(); state.drafts.unshift(draft); state.activeId = draft.id; clearSheetLink();
    renderForm(); setSection('data', true); setPreview('table'); persist();
    form.elements.namedItem('NOMBRES').focus();
    return true;
  }
  $('new-table').addEventListener('click', () => addDraft(M.newDraft(id(), now())));
  $('duplicate').addEventListener('click', () => {
    if (addDraft(M.cloneDesign(active(), id(), now()))) announce('Diseño duplicado. Escribe los nombres, la fecha y un nuevo prefijo. ' + (diskAvailable ? 'Guardado en este navegador.' : 'Descarga el borrador antes de salir.'));
  });
  $('download').addEventListener('click', () => {
    persist();
    const draft = active();
    const blob = new Blob([JSON.stringify(M.exportDraft(draft), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    const suffix = (draft.config.PREFIJO_FOLIO || 'borrador').replace(/[^A-Z0-9a-z-]/g, '');
    link.href = url; link.download = 'Mesa-Viajera-' + suffix + '.json'; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce('Descarga solicitada. El archivo contiene la personalización; no crea una mesa en Sheets.');
  });
  $('import-draft').addEventListener('change', async event => {
    if (busy) return;
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 100000) throw new Error('El borrador debe pesar menos de 100 KB.');
      const draft = M.importDraft(JSON.parse(await file.text()), id(), now());
      addDraft(draft);
    } catch (error) { announce(error instanceof SyntaxError ? 'El archivo no contiene JSON válido.' : error.message || 'No se pudo cargar el borrador.', true); }
    finally { event.target.value = ''; }
  });
  window.addEventListener('pagehide', () => { if (saveTimer) persist(); });

  function setBusy(value) {
    busy=value; form.inert=value;
    for (const key of ['new-table','duplicate','download','import-draft','connect-sheets','disconnect-sheets','load-sheets','save-sheets']) $(key).disabled=value;
    if (!value && sheetSnapshot) $('save-sheets').disabled=!sheetSnapshot.canEdit;
    renderList();
  }
  function setExampleExperience() {
    const selected=catalog.find(item => item.id === $('preview-experience').value);
    const name=selected?.name || 'Un momento para recordar';
    document.querySelectorAll('[data-experience-name]').forEach(el => {el.textContent=name;});
    const photo=$('experience-photo');
    const source=selected ? selected.image : './assets/Mesa/regalo-meta.webp';
    const missing=!!selected && !source;
    photo.hidden=missing; $('photo-error').hidden=!missing;
    photo.alt='Foto de la experiencia: '+name;
    if (source) photo.src=source; else photo.removeAttribute('src');
    $('photo-source').textContent=selected ? (missing ? 'Esta experiencia no tiene una URL de foto válida. Roberto debe corregirla antes de emitir el certificado.' : 'Foto tomada de la experiencia seleccionada en el catálogo. Comprueba que corresponda al regalo comprado.') : 'Foto y regalo de ejemplo. Al conectar el catálogo podrás elegir una experiencia y revisar su propia imagen.';
    $('photo-source').classList.toggle('photo-missing',missing);
  }
  $('experience-photo').addEventListener('error',() => { $('experience-photo').hidden=true; $('photo-error').hidden=false; $('photo-source').textContent='No se pudo cargar la foto de esta experiencia. Revisarla antes de emitir el certificado.'; $('photo-source').classList.add('photo-missing'); });
  $('experience-photo').addEventListener('load',() => { $('experience-photo').hidden=false; $('photo-error').hidden=true; });
  $('preview-experience').addEventListener('change',setExampleExperience);
  function clearSheetLink() {
    sheetSnapshot=null; catalog=[];
    $('sheet-link').hidden=true;
    $('preview-experience').replaceChildren(new Option('Experiencia de ejemplo',''));
    $('sheets-state').textContent=sheets.signedIn() ? 'Google conectado · elige una hoja' : 'Sheets: pendiente de conexión';
    $('sheets-help').textContent=sheets.ready() ? 'Selecciona la hoja autorizada para esta celebración.' : 'Falta la activación inicial de Google. Los borradores locales siguen disponibles.';
    $('connection-progress').textContent='Pendiente'; $('sheets-check').textContent='Pendiente de conectar y verificar.';
    $('disconnect-sheets').hidden=!sheets.signedIn();
    setExampleExperience();
  }
  function showReview(title,message,changes,confirmText) {
    const dialog=$('sheets-dialog');
    if (dialog.open) return Promise.resolve(false);
    $('sheets-dialog-title').textContent=title; $('sheets-dialog-message').textContent=message;
    $('confirm-sheets').hidden=!confirmText; $('confirm-sheets').textContent=confirmText || '';
    const list=$('sheets-changes'); list.replaceChildren();
    changes.forEach(change => {const item=document.createElement('li'), label=document.createElement('strong'), value=document.createElement('span');label.textContent=change.key;value.textContent=(change.before || '(vacío)')+' → '+(change.after || '(vacío)');item.append(label,value);list.append(item);});
    dialog.returnValue='';
    return new Promise(resolve => {dialog.addEventListener('close',() => resolve(dialog.returnValue === 'confirm'),{once:true});dialog.showModal();});
  }
  function describeSheet(snapshot) {
    $('sheet-link').hidden=false; $('sheet-title').textContent=snapshot.title;
    $('sheet-link-note').textContent=(snapshot.canEdit ? 'Revisa y guarda únicamente la personalización. ' : 'Tu cuenta tiene acceso de lectura. ')+'La fecha permanece en el borrador; catálogo, pagos y operaciones no se modifican.';
    $('sheets-state').textContent='Hoja conectada · '+(snapshot.canEdit ? 'lectura y edición' : 'solo lectura');
    $('sheets-help').textContent='La hoja se leyó correctamente. Los cambios locales se guardan en Sheets solo cuando los confirmas.';
    $('connection-progress').textContent='Hoja leída'; $('save-sheets').disabled=!snapshot.canEdit;
    $('disconnect-sheets').hidden=false;
  }
  $('connect-sheets').addEventListener('click',async () => {
    if (busy) return;
    if (!sheets.ready()) { await showReview('Activación inicial pendiente','Rodrigo debe registrar primero la aplicación de Google para proyectoeva.mx y habilitar la copia de desarrollo. Esta preparación es una sola vez; Omar usará su cuenta de Google y elegirá una hoja.',[],null); return; }
    setBusy(true);
    try {
      if (!googleLoaded) {await MesaSheets.loadGoogle();googleLoaded=true;announce('Acceso de Google preparado. Pulsa Conectar con Sheets para elegir tu cuenta y la hoja.');return;}
      if (!sheets.signedIn()) await sheets.authorize();
      const chosen=await sheets.choose(); if (!chosen) {announce('Selección cancelada. El borrador local se conserva.');return;}
      const snapshot=await sheets.read(chosen.id); sheetSnapshot=snapshot; describeSheet(snapshot);
      catalog=[];$('preview-experience').replaceChildren(new Option('Experiencia de ejemplo',''));setExampleExperience();
      try {catalog=await sheets.catalog(chosen.id);catalog.forEach(item => $('preview-experience').append(new Option(item.name,item.id)));announce('Hoja leída. Revisa su configuración o prepara los cambios antes de guardar.');}
      catch(error) {catalog=[];announce('La configuración se leyó, pero no se cargó el catálogo: '+error.message,true);}
    } catch(error) {announce(error.message,true);}
    finally {setBusy(false);}
  });
  $('disconnect-sheets').addEventListener('click',() => {sheets.clearSession();clearSheetLink();announce('Sesión cerrada en este editor. Los borradores locales se conservan.');});
  $('load-sheets').addEventListener('click',async () => {
    if (!sheetSnapshot || busy) return;
    setBusy(true); persist();
    try {
      const snapshot=await sheets.read(sheetSnapshot.id);
      const changes=MesaSheets.KEYS.filter(key => active().config[key] !== snapshot.config[key]).map(key => ({key,before:active().config[key],after:snapshot.config[key]}));
      const accepted=await showReview('Cargar la configuración de Sheets','Hoja: '+snapshot.title+'. Estos datos reemplazarán la personalización del borrador actual. La fecha local se conserva.',changes,'Cargar estos datos');
      if (!accepted) {announce('Carga cancelada. El borrador local se conserva.');return;}
      active().config=M.cleanConfig(snapshot.config);active().updatedAt=now();sheetSnapshot=snapshot;renderForm();describeSheet(snapshot);persist();
      $('sheets-check').textContent='Configuración leída desde Sheets; sin publicar la mesa.';announce('Configuración cargada desde Sheets y conservada en el borrador local.');
    } catch(error) {announce(error.message,true);}
    finally {setBusy(false);}
  });
  $('save-sheets').addEventListener('click',async () => {
    if (!sheetSnapshot || busy) return;
    setBusy(true);persist();
    try {
      const snapshot=await sheets.read(sheetSnapshot.id), config={...active().config};
      const changes=MesaSheets.planWrite(snapshot,config);
      if (!changes.length) {sheetSnapshot=snapshot;announce('La personalización ya coincide con la hoja leída.');return;}
      const accepted=await showReview('Guardar personalización en Sheets','Hoja: '+snapshot.title+'. Se actualizarán solo estos campos de CONFIG. Catálogo, operaciones y pagos conservan sus valores.',changes,'Guardar estos cambios');
      if (!accepted) {announce('Guardado cancelado. El borrador local se conserva.');return;}
      sheetSnapshot=await sheets.save(snapshot,config);describeSheet(sheetSnapshot);
      $('connection-progress').textContent='Guardado verificado';$('sheets-check').textContent='Personalización guardada y comprobada por lectura posterior.';
      announce('Guardado en Sheets y verificado por una nueva lectura. La mesa todavía no está publicada.');
    } catch(error) {announce(error.message,true);}
    finally {setBusy(false);}
  });
  renderForm();
  clearSheetLink();
  // No sobrescribir un guardado ilegible hasta que el usuario haga un cambio.
  if (recoveryWarning) announce(recoveryWarning, true); else persist();
})();
