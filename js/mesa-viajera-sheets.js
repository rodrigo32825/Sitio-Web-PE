'use strict';

const MesaSheets = (() => {
  const CATALOG = typeof module !== 'undefined' && module.exports ? require('./mesa-viajera-catalog.js') : MesaCatalog;
  const SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const KEYS = ['NOMBRES','NOMBRE_MESA','PREFIJO_FOLIO','CERT_TITULO','CERT_SUBTITULO','COLOR_PRIMARIO','COLOR_FONDO','COLOR_SECUNDARIO','COLOR_ACENTO','COLOR_DORADO','FUENTE_NOMBRES','FUENTE_TITULOS','FUENTE_CATEGORIAS','FUENTE_CUERPO'];
  const FONTS = ['Poppins','Great Vibes','Cormorant Garamond', 'Bodoni Moda','Roboto'];
  const LIMITS = {NOMBRES:100,NOMBRE_MESA:120,PREFIJO_FOLIO:16,CERT_TITULO:80,CERT_SUBTITULO:180};
  const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{20,150}$/.test(value);
  const MESA_MARKER='mesa-viajera-v2';
  const MESA_TABS=['CONFIG','EXPERIENCIAS','REGALOS','TRANSACCIONES','PANEL_CAMPOS'];
  function cleanMesaRequests(meta,keys,config){
    validate(config);
    if(!Array.isArray(meta.sheets)||!meta.sheets.length)throw Error('La plantilla no contiene pestañas legibles.');
    const seen=new Set();
    for(const sheet of meta.sheets){const p=sheet.properties;if(!MESA_TABS.includes(p?.title)||seen.has(p.title)||!Number.isInteger(p.sheetId)||!p.gridProperties?.rowCount||!p.gridProperties.columnCount)throw Error('Rodrigo debe revisar las pestañas de la plantilla antes de duplicarla.');seen.add(p.title);}
    if(!['CONFIG','EXPERIENCIAS','REGALOS','TRANSACCIONES'].every(t=>seen.has(t)))throw Error('La plantilla no tiene la estructura V2 completa.');
    const configKeys=keys.map(row=>String(row?.[0]||'').trim());
    if(!['CLAVE','KEY'].includes(configKeys[0]))throw Error('Revisa el encabezado de CONFIG en la plantilla.');
    const names=configKeys.slice(1).filter(Boolean);
    if(new Set(names).size!==names.length||names.some(k=>!/^[_A-Z0-9]{1,100}$/.test(k))||![...KEYS,'PAYPAL_ACTIVO','TARJETAS_ACTIVAS','TRANSFERENCIA_ACTIVA'].every(k=>names.includes(k)))throw Error('Revisa las claves de CONFIG antes de crear una mesa.');
    const off=new Set(['PAYPAL_ACTIVO','TARJETAS_ACTIVAS','TRANSFERENCIA_ACTIVA']);
    const rows=configKeys.map((key,i)=>({values:[{userEnteredValue:{stringValue:key}},{userEnteredValue:{stringValue:i===0?'VALOR':KEYS.includes(key)?config[key]:off.has(key)?'NO':key==='MODO_PAGO'?'ONLINE':''}}]}));
    return meta.sheets.filter(s=>s.properties.title!=='PANEL_CAMPOS').map(s=>{
      const p=s.properties;
      return {updateCells:{range:{sheetId:p.sheetId,startRowIndex:p.title==='CONFIG'?0:1,endRowIndex:p.gridProperties.rowCount,startColumnIndex:0,endColumnIndex:p.gridProperties.columnCount},rows:p.title==='CONFIG'?rows:[],fields:'userEnteredValue,note'}};
    });
  }
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
  function driveImage(value) {
    try {
      const url=new URL(value);
      if(url.protocol!=='https:'||url.username||url.password||!['drive.google.com','docs.google.com'].includes(url.hostname))return null;
      const match=url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)(?:\/|$)/);
      const id=match?.[1]||(/^\/(?:open|uc|thumbnail)\/?$/.test(url.pathname)?url.searchParams.get('id'):null);
      if(!validId(id))return null;
      const resourceKey=url.searchParams.get('resourcekey');
      const key=resourceKey&&/^[A-Za-z0-9_-]{1,200}$/.test(resourceKey)?resourceKey:'';
      return {id,resourceKey:key,link:'https://drive.google.com/file/d/'+id+'/view'+(key?'?resourcekey='+key:''),preview:'https://drive.google.com/thumbnail?id='+id+'&sz=w1600'+(key?'&resourcekey='+key:'')};
    } catch{return null;}
  }
  function safeImage(value) {
    try {
      if (typeof value !== 'string' || value.length > 2048) return '';
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|\[)/i.test(url.hostname)) return '';
      if(['drive.google.com','docs.google.com'].includes(url.hostname))return driveImage(value)?.preview||'';
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
    #token = ''; #expires = 0; #fetch; #settings; #mesaIds=new Set();
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
        new p.PickerBuilder().addView(new p.DocsView(p.ViewId.SPREADSHEETS)).setOAuthToken(this.#token).setDeveloperKey(this.#settings.pickerApiKey).setAppId(this.#settings.projectNumber).setOrigin(location.origin).setLocale('es').setTitle('Selecciona una mesa de Mesa Viajera').setCallback(data => {
          if (data.action === p.Action.CANCEL) resolve(null);
          if (data.action === p.Action.PICKED) { const doc=data.docs?.[0];if(!doc){reject(Error('Google no devolvió una hoja válida.'));return;}this.checkId(doc.id).then(()=>resolve({id:doc.id,name:doc.name}),reject); }
        }).build().setVisible(true);
      });
    }
    async chooseImage() {
      if(!this.signedIn())throw Error('La sesión venció. Abre de nuevo la mesa para conectar Google; conserva antes los cambios pendientes.');
      if(!globalThis.google?.picker)throw Error('El selector de Google todavía no está disponible.');
      const p=globalThis.google.picker;
      const selected=await new Promise((resolve,reject)=>{
        const view=new p.DocsView(p.ViewId.DOCS).setMimeTypes('image/jpeg,image/png,image/webp').setMode(p.DocsViewMode.LIST).setIncludeFolders(true).setSelectFolderEnabled(false);
        new p.PickerBuilder().addView(view).setOAuthToken(this.#token).setDeveloperKey(this.#settings.pickerApiKey).setAppId(this.#settings.projectNumber).setOrigin(location.origin).setLocale('es').setTitle('Selecciona la foto de esta experiencia').setCallback(data=>{
          if(data.action===p.Action.CANCEL)resolve(null);
          if(data.action===p.Action.PICKED){const doc=data.docs?.[0];if(!validId(doc?.id))reject(Error('Google no devolvió una foto válida.'));else resolve({id:doc.id,resourceKey:doc.resourceKey});}
        }).build().setVisible(true);
      });
      if(!selected)return null;
      const link='https://drive.google.com/file/d/'+selected.id+'/view'+(selected.resourceKey?'?resourcekey='+encodeURIComponent(selected.resourceKey):'');
      return this.drivePhoto(link);
    }
    async drivePhoto(value) {
      const image=driveImage(value);
      if(!image)throw Error('Usa el enlace de un archivo de imagen de Drive, no el de una carpeta.');
      let file;
      try{file=await this.#request('https://www.googleapis.com/drive/v3/files/'+image.id+'?supportsAllDrives=true&fields=id,name,mimeType,trashed,resourceKey,permissions(type,role,deleted,expirationTime)',{headers:image.resourceKey?{'X-Goog-Drive-Resource-Keys':image.id+'/'+image.resourceKey}:{}});}
      catch(error){
        if(error.status===404||error.status===403)throw Error('Google no permitió comprobar la foto de Drive. Puede verse en la vista previa y aun faltar autorización para el panel. Pulsa Seleccionar foto de Drive y elige el archivo con la misma cuenta de la mesa; después vuelve a guardar. Si ya lo seleccionaste, revisa que el archivo exista y siga accesible. No se guardó esta experiencia.');
        throw error;
      }
      if(file.trashed||!['image/jpeg','image/png','image/webp'].includes(file.mimeType))throw Error('Selecciona una imagen JPG, PNG o WebP que no esté en la papelera.');
      const visible=file.permissions?.some(p=>p.type==='anyone'&&!p.deleted&&['reader','commenter','writer'].includes(p.role)&&(!p.expirationTime||Date.parse(p.expirationTime)>Date.now()));
      if(!visible)throw Error('No se confirmó acceso para los invitados. En Drive abre Compartir → Acceso general → Cualquier persona con el enlace → Lector. Después vuelve a seleccionar la foto. El panel no cambia permisos.');
      const key=file.resourceKey||image.resourceKey;
      return {...driveImage('https://drive.google.com/file/d/'+image.id+'/view'+(key?'?resourcekey='+encodeURIComponent(key):'')),name:String(file.name||'Foto de Drive')};
    }
    async checkId(id) {
      if(!this.ready()||!validId(id))throw Error('Hoja no habilitada para este editor.');
      if(this.#settings.allowedSpreadsheetIds.includes(id)||this.#mesaIds.has(id))return;
      const file=await this.#request('https://www.googleapis.com/drive/v3/files/'+id+'?fields=id,mimeType,appProperties');
      if(file.mimeType!=='application/vnd.google-apps.spreadsheet'||file.appProperties?.evaMesa!==MESA_MARKER||file.appProperties?.evaMesaState!=='ready')throw Error('Hoja no habilitada para el panel. Elige la plantilla autorizada o una mesa creada desde este panel.');
      this.#mesaIds.add(id);
    }
    async createMesa(draftId,config,{onCreated=()=>{},pendingId='',uncertain=false}={}) {
      validate(config);
      if(!this.ready()||!this.signedIn())throw Error('Conecta Google para crear la mesa.');
      if(typeof draftId!=='string'||!/^[-A-Za-z0-9]{1,80}$/.test(draftId))throw Error('El borrador no tiene un identificador válido.');
      const templateId=this.#settings.allowedSpreadsheetIds[0];
      const marker={evaMesa:MESA_MARKER,evaMesaDraft:draftId,evaMesaState:'preparing'};
      let target=null;
      if(pendingId){
        if(!validId(pendingId)||this.#settings.allowedSpreadsheetIds.includes(pendingId))throw Error('El destino pendiente no es una copia nueva válida.');
        target=await this.#request('https://www.googleapis.com/drive/v3/files/'+pendingId+'?fields=id,name,mimeType,appProperties');
        if(target.appProperties?.evaMesa!==MESA_MARKER||target.appProperties?.evaMesaDraft!==draftId)throw Error('La copia pendiente no corresponde a este borrador.');
      }else{
        const q="trashed = false and appProperties has { key='evaMesaDraft' and value='"+draftId+"' } and appProperties has { key='evaMesa' and value='"+MESA_MARKER+"' }";
        const found=await this.#request('https://www.googleapis.com/drive/v3/files?q='+encodeURIComponent(q)+'&pageSize=2&fields=files(id,name,mimeType,appProperties)');
        if(found.files?.length>1)throw Error('Hay más de una copia para este borrador. Rodrigo debe revisar el destino antes de continuar.');
        target=found.files?.[0]||null;
        if(!target&&uncertain)throw Error('La creación anterior no pudo confirmarse. No se creará otra copia automáticamente. Revisa tu Drive y vuelve a intentar continuar para localizarla.');
      }
      if(target&&(!validId(target.id)||this.#settings.allowedSpreadsheetIds.includes(target.id)||target.mimeType!=='application/vnd.google-apps.spreadsheet'||target.appProperties?.evaMesa!==MESA_MARKER||target.appProperties?.evaMesaDraft!==draftId))throw Error('La copia localizada no corresponde a este borrador.');
      if(target?.appProperties?.evaMesaState==='ready'){await onCreated({id:target.id,title:target.name,state:'ready'});return this.read(target.id);}
      let meta,keys;
      try{
        [meta,keys]=await Promise.all([
          this.#request('https://sheets.googleapis.com/v4/spreadsheets/'+templateId+'?fields=sheets(properties(sheetId,title,gridProperties))'),
          this.#request('https://sheets.googleapis.com/v4/spreadsheets/'+templateId+'/values/'+encodeURIComponent("'CONFIG'!A1:A2000")+'?valueRenderOption=UNFORMATTED_VALUE')
        ]);
      }catch(error){if(error.status===403||error.status===404)throw Object.assign(Error('Selecciona Mesa Viajera Maestra V2 - Desarrollo para autorizar la plantilla. Tu diseño actual se conserva.'),{templateAccess:true});throw error;}
      if(meta.sheets.find(s=>s.properties?.title==='CONFIG')?.properties?.gridProperties?.rowCount>2000)throw Error('CONFIG excede el tamaño admitido para la plantilla.');
      cleanMesaRequests(meta,keys.values||[],config);
      if(!target){
        // La marca se guarda en la misma creación. Permite localizar la copia tras una respuesta perdida.
        try{target=await this.#request('https://www.googleapis.com/drive/v3/files/'+templateId+'/copy?fields=id,name,mimeType,appProperties',{method:'POST',body:JSON.stringify({name:'Mesa Viajera · '+config.NOMBRE_MESA,parents:['root'],appProperties:marker})});}
        catch(error){if(error.status>=400&&error.status<500)throw Error('Google rechazó la copia de la plantilla (HTTP '+error.status+'). Comprueba la cuenta y que permita crear copias; puedes volver a intentarlo.');throw Object.assign(Error('Google no confirmó la creación. Conservamos este intento para buscar la copia antes de crear otra.'),{creationUncertain:true});}
      }
      if(!validId(target.id)||this.#settings.allowedSpreadsheetIds.includes(target.id))throw Error('Google no devolvió una copia nueva válida.');
      await onCreated({id:target.id,title:target.name,state:'preparing'});
      const targetMeta=await this.#request('https://sheets.googleapis.com/v4/spreadsheets/'+target.id+'?fields=sheets(properties(sheetId,title,gridProperties))');
      const requests=cleanMesaRequests(targetMeta,keys.values||[],config);
      await this.#request('https://sheets.googleapis.com/v4/spreadsheets/'+target.id+':batchUpdate',{method:'POST',body:JSON.stringify({requests})});
      // No se habilita la mesa hasta verificar configuración, operaciones vacías y pagos apagados.
      const columnName=index=>{let name='';for(let n=index;n;n=Math.floor((n-1)/26))name=String.fromCharCode(65+(n-1)%26)+name;return name;};
      const ranges=["'CONFIG'!A1:B2000",...['EXPERIENCIAS','REGALOS','TRANSACCIONES'].map(title=>{const grid=targetMeta.sheets.find(s=>s.properties.title===title).properties.gridProperties;return "'"+title+"'!A2:"+columnName(grid.columnCount)+grid.rowCount;})];
      const check=await this.#request('https://sheets.googleapis.com/v4/spreadsheets/'+target.id+'/values:batchGet?'+ranges.map(r=>'ranges='+encodeURIComponent(r)).join('&')+'&valueRenderOption=UNFORMATTED_VALUE');
      const values=check.valueRanges?.[0]?.values||[];const parsed=readConfig(values);
      if(KEYS.some(k=>parsed.config[k]!==config[k])||['PAYPAL_ACTIVO','TARJETAS_ACTIVAS','TRANSFERENCIA_ACTIVA'].some(k=>!values.some(r=>r[0]===k&&r[1]==='NO'))||check.valueRanges?.length!==4||check.valueRanges.slice(1).some(r=>r.values?.some(row=>row.some(v=>String(v)!==''))))throw Error('No se confirmó la preparación completa. La copia queda pendiente; usa Continuar preparación.');
      await this.#request('https://www.googleapis.com/drive/v3/files/'+target.id+'?fields=id,appProperties',{method:'PATCH',body:JSON.stringify({appProperties:{...marker,evaMesaState:'ready'}})});
      this.#mesaIds.add(target.id);
      await onCreated({id:target.id,title:target.name,state:'ready'});
      return this.read(target.id);
    }
    async #request(url, options = {}) {
      if (!this.signedIn()) {this.clearSession();throw new Error('La sesión de Google venció. Vuelve a conectar; los borradores locales se conservan.');}
      let response;
      const controller=new AbortController(), timeout=setTimeout(() => controller.abort(),20000);
      try { response=await this.#fetch(url,{...options,headers:{'Content-Type':'application/json',...options.headers,Authorization:'Bearer '+this.#token},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal}); }
      catch {throw new Error(options.method === 'POST' ? 'No se pudo confirmar el guardado. Vuelve a leer la hoja antes de intentar guardar otra vez.' : 'No se pudo leer Google Sheets. Revisa la conexión y vuelve a intentarlo.');}
      finally {clearTimeout(timeout);}
      if (response.status === 401) {this.clearSession();throw new Error('La sesión de Google venció. Vuelve a conectar.');}
      if (!response.ok) {
        const message=response.status===404?'Google no encontró la hoja o el archivo solicitado, o tu cuenta no tiene acceso (HTTP 404). Comprueba la cuenta y vuelve a abrir la mesa. Si ya confirmaste un guardado, actualiza el catálogo antes de repetirlo.':response.status===403?'Google no permite esta operación. Revisa los permisos del archivo o la activación de la aplicación.':'Google no completó la operación (HTTP '+response.status+').';
        throw Object.assign(new Error(message),{status:response.status});
      }
      return response.json();
    }
    async read(id) {
      await this.checkId(id);
      const [file,values]=await Promise.all([
        this.#request('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?fields=id,name,mimeType,capabilities(canEdit)'),
        this.#request('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(id)+'/values/'+encodeURIComponent("'CONFIG'!A1:B500")+'?valueRenderOption=UNFORMATTED_VALUE')
      ]);
      if (file.mimeType !== 'application/vnd.google-apps.spreadsheet') throw new Error('El archivo seleccionado no es una hoja de Google Sheets.');
      const parsed=readConfig(values.values || []);
      return {...parsed,id,title:file.name,canEdit:file.capabilities?.canEdit === true};
    }
    async catalog(id) {
      await this.checkId(id);
      const values=await this.#request('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(id)+'/values/'+encodeURIComponent("'EXPERIENCIAS'!A1:Z1000")+'?valueRenderOption=UNFORMATTED_VALUE');
      return readCatalog(values.values || []);
    }
    async catalogState(id) {
      await this.checkId(id);
      const [file,meta,values]=await Promise.all([
        this.#request('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?fields=id,name,mimeType,capabilities(canEdit)'),
        this.#request('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(id)+'?fields=sheets(properties(title,gridProperties))'),
        this.#request('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(id)+'/values/'+encodeURIComponent("'EXPERIENCIAS'!A1:Z1000")+'?valueRenderOption=FORMULA')
      ]);
      if(file.mimeType !== 'application/vnd.google-apps.spreadsheet')throw Error('El archivo no es una hoja de Google Sheets.');
      const grid=meta.sheets?.find(sheet=>sheet.properties?.title==='EXPERIENCIAS')?.properties?.gridProperties;
      if(!grid?.rowCount)throw Error('No se encontró la pestaña EXPERIENCIAS.');
      return {...CATALOG.parse(values.values||[],grid.rowCount),id,title:file.name,canEdit:file.capabilities?.canEdit===true};
    }
    async saveExperience(snapshot,input) {
      await this.checkId(snapshot.id);
      if(!snapshot.canEdit)throw Error('Tu cuenta solo tiene acceso de lectura.');
      const planned=CATALOG.plan(snapshot,input,safeImage);
      if(!planned.changes.length)return snapshot;
      if(planned.changes.some(change=>change.key==='image')&&driveImage(input.image))await this.drivePhoto(input.image);
      const fresh=await this.catalogState(snapshot.id);
      if(!fresh.canEdit)throw Error('Tu cuenta solo tiene acceso de lectura.');
      if(fresh.signature!==snapshot.signature||fresh.gridRows!==snapshot.gridRows)throw Error('El catálogo cambió. Actualízalo y revisa la experiencia antes de guardar.');
      await this.#request('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(snapshot.id)+'/values:batchUpdate',{method:'POST',body:JSON.stringify({valueInputOption:'RAW',data:planned.changes.map(({range,values})=>({range,values}))})});
      const verified=await this.catalogState(snapshot.id);
      if(planned.changes.some(change=>{const col=verified.columns[change.key];return String(verified.rows[planned.row-1]?.[col]??'')!==change.after;}))throw Error('No se confirmó el resultado del guardado. Actualiza el catálogo antes de repetir.');
      return verified;
    }
    async save(snapshot, config) {
      await this.checkId(snapshot.id);
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
  return {SCOPE,KEYS,Client,readConfig,planWrite,readCatalog,driveImage,safeImage,cleanMesaRequests,validateConfig:validate,loadGoogle};
})();
if (typeof module !== 'undefined' && module.exports) module.exports=MesaSheets;
