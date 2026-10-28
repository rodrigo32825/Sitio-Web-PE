const assert=require('node:assert/strict');
const S=require('../js/mesa-viajera-sheets.js'),M=require('../js/mesa-viajera-panel.js');
const templateId='template-development-identifier-00001',copyId='new-mesa-spreadsheet-identifier-00001';
const config={...M.DEFAULTS,NOMBRES:'Alex y Dani',NOMBRE_MESA:'Celebración nueva',PREFIJO_FOLIO:'AD',COLOR_PRIMARIO:'#800020'};
const keys=[['CLAVE'],...S.KEYS.map(k=>[k]),['PAYPAL_ACTIVO'],['TARJETAS_ACTIVAS'],['TRANSFERENCIA_ACTIVA'],['MODO_PAGO'],['STRIPE_SECRET'],['CARPETA_CERTIFICADOS']];
const meta={sheets:['CONFIG','EXPERIENCIAS','REGALOS','TRANSACCIONES','PANEL_CAMPOS'].map((title,sheetId)=>({properties:{title,sheetId,gridProperties:{rowCount:100,columnCount:32}}}))};
const requests=S.cleanMesaRequests(meta,keys,config);
assert.equal(requests.length,4);assert(!requests.some(r=>r.updateCells.range.sheetId===4));
const cfg=requests[0].updateCells.rows.map(r=>r.values.map(v=>v.userEnteredValue.stringValue));
assert.equal(cfg.find(r=>r[0]==='COLOR_PRIMARIO')[1],config.COLOR_PRIMARIO);
assert.equal(cfg.find(r=>r[0]==='PAYPAL_ACTIVO')[1],'NO');assert.equal(cfg.find(r=>r[0]==='STRIPE_SECRET')[1],'');assert.equal(cfg.find(r=>r[0]==='CARPETA_CERTIFICADOS')[1],'');
assert(requests.slice(1).every(r=>r.updateCells.range.startRowIndex===1&&r.updateCells.rows.length===0&&r.updateCells.range.endColumnIndex===32));
assert.throws(()=>S.cleanMesaRequests({...meta,sheets:[...meta.sheets,{properties:{title:'OTROS_DATOS',sheetId:99,gridProperties:{rowCount:1,columnCount:1}}}]},keys,config),/pestañas/);
assert.throws(()=>S.cleanMesaRequests(meta,[...keys,['NOMBRES']],config),/claves/);
assert.throws(()=>S.cleanMesaRequests(meta,keys,{...config,NOMBRES:''}),/Completa/);
const settings={clientId:'fixture.apps.googleusercontent.com',pickerApiKey:'fixture',projectNumber:'123',allowedSpreadsheetIds:[templateId]};
let files=[],calls=[],configRows=[],failInitialize=false,loseCopyResponse=false,badVerification=false;
const response=data=>({ok:true,status:200,json:async()=>structuredClone(data)});
const fake=async(url,options)=>{
 const method=options.method||'GET';calls.push({url,method,body:options.body});assert(!url.includes('access_token'));assert.equal(options.credentials,'omit');
 if(url.includes('/drive/v3/files?'))return response({files});
 if(url.includes('/copy?')){
  const body=JSON.parse(options.body);assert.deepEqual(body.parents,['root']);assert(!('permissions'in body));assert.equal(body.appProperties.evaMesaState,'preparing');
  const file={id:copyId,name:body.name,mimeType:'application/vnd.google-apps.spreadsheet',appProperties:body.appProperties};files=[file];if(loseCopyResponse){loseCopyResponse=false;throw Error('connection lost');}return response(file);
 }
 if(url.includes('/drive/v3/files/'+copyId)){
  if(method==='PATCH'){files[0].appProperties=JSON.parse(options.body).appProperties;return response(files[0]);}
  return response({...files[0],capabilities:{canEdit:true}});
 }
 if(url.includes('/drive/v3/files/'))return response({id:'unrelated-spreadsheet-identifier-00001',mimeType:'application/vnd.google-apps.spreadsheet'});
 if(url.endsWith(':batchUpdate')){
  assert(url.includes(copyId));assert(!url.includes(templateId));if(failInitialize)throw Error('network');
  const body=JSON.parse(options.body);assert.equal(body.requests.length,4);configRows=body.requests[0].updateCells.rows.map(r=>r.values.map(v=>v.userEnteredValue.stringValue));return response({});
 }
 if(url.includes('/values:batchGet?'))return response({valueRanges:[{values:configRows},...Array.from({length:3},(_,i)=>({values:badVerification&&i===2?[['heredado']]:[]}))]});
 if(url.includes('/values/'))return response({values:url.includes(templateId)?keys:configRows});
 if(url.includes('fields=sheets'))return response(meta);
 throw Error('Unexpected URL '+url);
};
function client(){const c=new S.Client(settings,fake);c.acceptToken({access_token:'fixture-not-real',expires_in:3600},true);return c;}
const copies=()=>calls.filter(c=>c.url.includes('/copy?')).length;
(async()=>{
 let savedRef;const c=client();const result=await c.createMesa('draft-123',config,{onCreated:ref=>{savedRef=ref}});
 assert.equal(result.id,copyId);assert.equal(result.config.NOMBRES,config.NOMBRES);assert.equal(savedRef.state,'ready');assert.equal(copies(),1);
 assert(calls.filter(c=>['POST','PATCH'].includes(c.method)).every(c=>!c.url.includes('/spreadsheets/'+templateId)&&!c.url.includes('/drive/v3/files/'+templateId+'?')));
 // Un nuevo cliente abre una mesa creada sin registrar su ID en código público.
 await client().read(copyId);await assert.rejects(client().read('unrelated-spreadsheet-identifier-00001'),/no habilitada/);
 const count=copies();await c.createMesa('draft-123',config);assert.equal(copies(),count);
 files=[];failInitialize=true;let pending;
 await assert.rejects(client().createMesa('draft-456',config,{onCreated:ref=>{pending=ref}}),/No se pudo confirmar/);assert.equal(pending.id,copyId);assert.equal(pending.state,'preparing');
 await assert.rejects(client().read(copyId),/no habilitada/);
 failInitialize=false;const beforeResume=copies();await client().createMesa('draft-456',config,{pendingId:copyId});assert.equal(copies(),beforeResume);
 files=[];loseCopyResponse=true;await assert.rejects(client().createMesa('draft-789',config),e=>e.creationUncertain===true);
 const beforeRecovery=copies();await client().createMesa('draft-789',config,{uncertain:true});assert.equal(copies(),beforeRecovery);
 files=[];const noCopies=copies();await assert.rejects(client().createMesa('draft-unknown',config,{uncertain:true}),/No se creará otra copia/);assert.equal(copies(),noCopies);
 files=[];badVerification=true;await assert.rejects(client().createMesa('draft-bad',config),/No se confirmó la preparación/);assert.equal(files[0].appProperties.evaMesaState,'preparing');badVerification=false;
 await assert.rejects(client().createMesa('other-draft',config,{pendingId:copyId}),/no corresponde/);
 const ref={id:copyId,title:'Mesa',state:'ready',accessToken:'never'};const restored=M.restore({version:1,drafts:[{...M.newDraft('draft',1,config),sheetRef:ref}]});assert.equal(restored.drafts[0].sheetRef.id,copyId);assert.equal(restored.drafts[0].sheetRef.accessToken,undefined);
 assert.equal(M.exportDraft(restored.drafts[0]).sheetRef,undefined);assert.equal(M.cloneDesign(restored.drafts[0],'copy',2).sheetRef,undefined);
 assert.equal(M.cleanSheetRef({id:'bad<script>',state:'ready'}),undefined);
 console.log('OK: copia independiente, CONFIG segura, limpieza completa, pagos NO, recuperación sin duplicar, respuesta perdida, marca y reapertura, destino incorrecto y referencias sin secretos. API simulada.');
})().catch(e=>{console.error(e);process.exit(1)});
