'use strict';

const MesaSheets = (() => {
  const SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const KEYS = ['NOMBRES','NOMBRE_MESA','PREFIJO_FOLIO','CERT_TITULO','CERT_SUBTITULO','COLOR_PRIMARIO','COLOR_FONDO','COLOR_SECUNDARIO','COLOR_ACENTO','COLOR_DORADO','FUENTE_NOMBRES','FUENTE_TITULOS','FUENTE_CATEGORIAS','FUENTE_CUERPO'];
  const FONTS = ['Poppins','Great Vibes','Bodoni Moda','Roboto'];
  const LIMITS = {NOMBRES:100,NOMBRE_MESA:120,PREFIJO_FOLIO:16,CERT_TITULO:80,CERT_SUBTITULO:180};
  const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{20,150}$/.test(value);
  function readConfig(rows) {
    if (!Array.isArray(rows)) throw new Error('CONFIG no contiene una tabla legible.');
    const config = {}, positions = {};
    rows.forEach((row, index) => {
      const key = String(row?.[0] || '').trim();
      if (!KEYS.includes(key)) return;
      if (Object.hasOwn(positions,key)) throw new Error('CONFIG tiene una clave duplicada: ' + key + '. No se guardó ningún cambio.');
      positions[key] = index + 1; config[key] = String(row[1] ?? '');
    });
    const missing = KEYS.filter(key => !Object.hasOwn(positions,key));
    if (missing.length) throw new Error('Esta hoja no tiene la estructura V2 completa. Faltan: ' + missing.join(', ') + '.');
    validate(config,false);
    return {config, positions, signature:JSON.stringify(rows)};
  }
  function validate(config, requireBasics = true) {
    for (const key of KEYS) {
      const value = config[key];
      if (typeof value !== 'string') throw new Error('Falta el campo ' + key + '.');
      if (key.startsWith('COLOR_') && !/^#[A-Fa-f0-9]{6}$/.test(value)) throw new Error('Color no válido en ' + key + '.');
      if (key.startsWith('FUENTE_') && !FONTS.includes(value)) throw new Error('Fuente pendiente de compatibilidad: ' + value + '.');
      if (LIMITS[key] && (value.length > LIMITS[key] || /[\u0000-\u001f\u007f]/.test(value))) throw new Error('Texto no válido en ' + key + '.');
    }
    if (requireBasics && (!config.NOMBRES.trim() || !config.NOMBRE_MESA.trim() || !config.CERT_TITULO.trim() || !config.CERT_SUBTITULO.trim() || !/^[A-Z0-9]{1,16}$/.test(config.PREFIJO_FOLIO))) throw new Error('Completa nombres, nombre de mesa, prefijo y textos del certificado antes de guardar en Sheets.');
  }
  function planWrite(snapshot, config) {
    validate(config);
    return KEYS.filter(key => snapshot.config[key] !== config[key]).map(key => ({key,before:snapshot.config[key],after:config[key],range:"'CONFIG'!B"+snapshot.positions[key],values:[[config[key]]]}));
  }
  function safeImage(value) {
    try {
      if (typeof value !== 'string' || value.length > 2048) return '';
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|\[)/i.test(url.hostname)) return '';
      return url.href;
    } catch { return ''; }
  }
  function readCatalog(rows) {
    if (!Array.isArray(rows) || rows.length < 2) return [];
    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
    const headers = rows[0].map(normalize);
    const column = aliases => {
      const found = headers.map((h,i) => aliases.includes(h) ? i : -1).filter(i => i >= 0);
      if (found.length !== 1) throw new Error('No se pudo identificar de forma única ID, nombre y foto en EXPERIENCIAS. Revisar los encabezados del catálogo.');
      return found[0];
    };
    const idCol = column(['ID','IDEXPERIENCIA','EXPERIENCIAID']);
    const nameCol = column(['NOMBRE','TITULO','NOMBREEXPERIENCIA']);
    const imageCol = column(['IMAGEN','IMAGENURL','URLIMAGEN','FOTO','FOTOURL','URLFOTO','IMAGEURL']);
    const seen = new Set();
    return rows.slice(1).filter(row => String(row[idCol] || '').trim()).map(row => {
      const id = String(row[idCol]).trim();
      if (seen.has(id)) throw new Error('Hay IDs de experiencia duplicados. Revisar el catálogo antes de emitir certificados.');
      seen.add(id);
      return {id, name:String(row[nameCol] || id).slice(0,200), image:safeImage(String(row[imageCol] || '').trim())};
    });
  }
  class Client {
    #token = ''; #expires = 0; #fetch; #settings;
    constructor(settings, fetcher = globalThis.fetch.bind(globalThis)) { this.#settings = settings || {}; this.#fetch = fetcher; }
    ready() { const s=this.#settings; return /^[\w-]+\.apps\.googleusercontent\.com$/.test(s.clientId || '') && !!s.pickerApiKey && /^\d+$/.test(s.projectNumber || '') && Array.isArray(s.allowedSpreadsheetIds) && s.allowedSpreadsheetIds.length > 0 && s.allowedSpreadsheetIds.every(validId); }
    signedIn() { return !!this.#token && Date.now() < this.#expires; }
    clearSession() { this.#token=''; this.#expires=0; }
    // En pruebas, sustituir la autorización por la respuesta de GIS sin acceder a credenciales reales.
    acceptToken(response, granted) {
      if (!granted || response.error || typeof response.access_token !== 'string' || !Number.isFinite(Number(response.expires_in)) || Number(response.expires_in) <= 60) { this.clearSession(); throw new Error('Google no autorizó el acceso a los archivos seleccionados.'); }
      this.#token=response.access_token; this.#expires=Date.now()+(Number(response.expires_in)-60)*1000;
    }
    async authorize() {
      if (!this.ready()) throw new Error('La conexión con Google está pendiente de configuración inicial por Rodrigo.');
      if (!globalThis.google?.accounts?.oauth2) throw new Error('La biblioteca de acceso de Google aún no está lista. Vuelve a pulsar Conectar.');
      const oauth=globalThis.google.accounts.oauth2;
      return new Promise((resolve,reject) => {
        const client=oauth.initTokenClient({client_id:this.#settings.clientId,scope:SCOPE,include_granted_scopes:false,
          callback:response => { try {this.acceptToken(response,oauth.hasGrantedAllScopes(response,SCOPE));resolve();} catch(error){reject(error);} },
          error_callback:() => reject(new Error('No se completó el acceso a Google. Puedes volver a intentarlo.'))});
        client.requestAccessToken({prompt:'select_account'});
      });
    }
    async choose() {
      if (!this.signedIn()) throw new Error('Conecta tu cuenta de Google antes de elegir una hoja.');
      if (!globalThis.google?.picker) throw new Error('El selector de Google todavía no está disponible.');
      const p=globalThis.google.picker;
      return new Promise((resolve,reject) => {
        new p.PickerBuilder().addView(new p.DocsView(p.ViewId.SPREADSHEETS)).setOAuthToken(this.#token).setDeveloperKey(this.#settings.pickerApiKey).setAppId(this.#settings.projectNumber).setOrigin(location.origin).setLocale('es').setTitle('Selecciona la copia de desarrollo de Mesa Viajera').setCallback(data => {
          if (data.action === p.Action.CANCEL) resolve(null);
          if (data.action === p.Action.PICKED) { const doc=data.docs?.[0]; if (!doc || !this.#settings.allowedSpreadsheetIds.includes(doc.id)) reject(new Error('Esta hoja no está habilitada para el panel. Selecciona la copia de desarrollo autorizada.')); else resolve({id:doc.id,name:doc.name}); }
        }).build().setVisible(true);
      });
    }
    checkId(id) { if (!this.ready() || !validId(id) || !this.#settings.allowedSpreadsheetIds.includes(id)) throw new Error('Hoja no habilitada para este editor.'); }
    async #request(url, options = {}) {
      if (!this.signedIn()) {this.clearSession();throw new Error('La sesión de Google venció. Vuelve a conectar; los borradores locales se conservan.');}
      let response;
      const controller=new AbortController(), timeout=setTimeout(() => controller.abort(),20000);
      try { response=await this.#fetch(url,{...options,headers:{'Content-Type':'application/json',Authorization:'Bearer '+this.#token},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal}); }
      catch {throw new Error(options.method === 'POST' ? 'No se pudo confirmar el guardado. Vuelve a leer la hoja antes de intentar guardar otra vez.' : 'No se pudo leer Google Sheets. Revisa la conexión y vuelve a intentarlo.');}
      finally {clearTimeout(timeout);}
      if (response.status === 401) {this.clearSession();throw new Error('La sesión de Google venció. Vuelve a conectar.');}
      if (!response.ok) throw new Error(response.status === 403 ? 'Google no permite esta operación. Revisa los permisos de la hoja o la activación de la aplicación.' : 'Google no completó la operación (HTTP '+response.status+').');
      return response.json();
    }
    async read(id) {
      this.checkId(id);
      const [file,values]=await Promise.all([
        this.#request('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?fields=id,name,mimeType,capabilities(canEdit)'),
        this.#request('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(id)+'/values/'+encodeURIComponent("'CONFIG'!A1:B500")+'?valueRenderOption=UNFORMATTED_VALUE')
      ]);
      if (file.mimeType !== 'application/vnd.google-apps.spreadsheet') throw new Error('El archivo seleccionado no es una hoja de Google Sheets.');
      const parsed=readConfig(values.values || []);
      return {...parsed,id,title:file.name,canEdit:file.capabilities?.canEdit === true};
    }
    async catalog(id) {
      this.checkId(id);
      const values=await this.#request('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(id)+'/values/'+encodeURIComponent("'EXPERIENCIAS'!A1:Z1000")+'?valueRenderOption=UNFORMATTED_VALUE');
      return readCatalog(values.values || []);
    }
    async save(snapshot, config) {
      this.checkId(snapshot.id);
      const changes=planWrite(snapshot,config);
      if (!changes.length) return snapshot;
      if (!snapshot.canEdit) throw new Error('Tu cuenta solo tiene acceso de lectura a esta hoja.');
      const fresh=await this.read(snapshot.id);
      if (fresh.signature !== snapshot.signature) throw new Error('La hoja cambió desde la última lectura. Vuelve a cargarla y revisa las diferencias antes de guardar.');
      await this.#request('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(snapshot.id)+'/values:batchUpdate',{method:'POST',body:JSON.stringify({valueInputOption:'RAW',data:changes.map(({range,values}) => ({range,values}))})});
      const verified=await this.read(snapshot.id);
      if (changes.some(change => verified.config[change.key] !== change.after)) throw new Error('Google recibió el cambio, pero la lectura posterior no coincide. Revisa la hoja antes de continuar.');
      return verified;
    }
  }
  let loading;
  function loadGoogle() {
    if (loading) return loading;
    const script = src => new Promise((resolve,reject) => {const node=document.createElement('script');node.src=src;node.async=true;node.onload=resolve;node.onerror=() => reject(new Error('No se pudo cargar el acceso de Google.'));document.head.append(node);});
    loading=Promise.all([script('https://accounts.google.com/gsi/client'),script('https://apis.google.com/js/api.js')]).then(() => new Promise((resolve,reject) => globalThis.gapi.load('picker',{callback:resolve,onerror:() => reject(new Error('No se pudo cargar el selector de Google.')),timeout:15000,ontimeout:() => reject(new Error('El selector de Google tardó demasiado.'))}))).catch(error => {loading=undefined;throw error;});
    return loading;
  }
  return {SCOPE,KEYS,Client,readConfig,planWrite,readCatalog,safeImage,loadGoogle};
})();
if (typeof module !== 'undefined' && module.exports) module.exports=MesaSheets;
