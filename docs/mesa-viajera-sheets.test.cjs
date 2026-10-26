const assert=require('node:assert/strict');
const S=require('../js/mesa-viajera-sheets.js');
const M=require('../js/mesa-viajera-panel.js');
const sheetId='development-sheet-identifier-0001';
const settings={clientId:'example.apps.googleusercontent.com',pickerApiKey:'test-public-picker-key',projectNumber:'1234',allowedSpreadsheetIds:[sheetId]};
const base={...M.DEFAULTS,NOMBRES:'Alex y Dani',NOMBRE_MESA:'Mesa de Alex y Dani',PREFIJO_FOLIO:'AD'};
const makeRows=()=>[['CLAVE','VALOR'],['PAYPAL_ACTIVO','NO'],...Object.entries(base),['STRIPE_SECRET','private-value-not-for-export'],['TRANSFERENCIA_ACTIVA','NO']];
let rows=makeRows(),calls=[],readOnly=false,deny=false,postMismatch=false;
const fake=async(url,options)=>{
 calls.push({url,method:options.method||'GET',body:options.body});
 assert.match(options.headers.Authorization,/^Bearer /);assert.equal(options.credentials,'omit');assert(!url.includes('access_token'));
 if(deny)return {ok:false,status:401};
 if(url.includes('/drive/v3/files/'))return {ok:true,status:200,json:async()=>({id:sheetId,name:'Copia de desarrollo',mimeType:'application/vnd.google-apps.spreadsheet',capabilities:{canEdit:!readOnly}})};
 if(options.method==='POST'){
  const body=JSON.parse(options.body);assert.equal(body.valueInputOption,'RAW');
  for(const entry of body.data){assert.match(entry.range,/^'CONFIG'!B\d+$/);const n=Number(entry.range.match(/B(\d+)$/)[1])-1;rows[n][1]=postMismatch&&rows[n][0]==='NOMBRES'?'other':entry.values[0][0];}
  return {ok:true,status:200,json:async()=>({})};
 }
 return {ok:true,status:200,json:async()=>({values:structuredClone(rows)})};
};
const client=new S.Client(settings,fake);
client.acceptToken({access_token:'test-fixture-not-a-real-token',expires_in:3600},true);
(async()=>{
 const snapshot=await client.read(sheetId);
 const wanted={...base,NOMBRES:'=Literal seguro',COLOR_PRIMARIO:'#800020'};
 const result=await client.save(snapshot,wanted);
 assert.equal(result.config.NOMBRES,'=Literal seguro');
 const posts=calls.filter(call=>call.method==='POST');assert.equal(posts.length,1);assert.equal(JSON.parse(posts[0].body).data.length,2);
 assert.equal(rows.find(row=>row[0]==='PAYPAL_ACTIVO')[1],'NO');assert.equal(rows.find(row=>row[0]==='STRIPE_SECRET')[1],'private-value-not-for-export');
 assert(!posts[0].body.includes('STRIPE_SECRET'));assert(!posts[0].body.includes('PAYPAL_ACTIVO'));
 const conflict=await client.read(sheetId);rows[1][1]='SI';await assert.rejects(client.save(conflict,{...wanted,NOMBRES:'Otro nombre'}),/cambió/);assert.equal(calls.filter(c=>c.method==='POST').length,1);
 readOnly=true;const ro=await client.read(sheetId);await assert.rejects(client.save(ro,base),/lectura/);readOnly=false;
 await assert.rejects(client.read('not-allowed-sheet-identifier'),/no habilitada/);
 const duplicate=makeRows();duplicate.push(['NOMBRES','Dup']);assert.throws(()=>S.readConfig(duplicate),/duplicada/);
 assert.throws(()=>S.readConfig([['NOMBRES','A']]),/Faltan/);
 assert.throws(()=>S.planWrite(snapshot,{...base,COLOR_FONDO:'url(evil)'}),/Color/);
 const catalog=S.readCatalog([['ID','NOMBRE','IMAGEN_URL'],['one','Cena','https://proyectoeva.mx/cena.jpg'],['two','Tren','']]);assert.equal(catalog[0].image,'https://proyectoeva.mx/cena.jpg');assert.equal(catalog[1].image,'');
 assert.throws(()=>S.readCatalog([['ID','NOMBRE','FOTO'],['one','A',''],['one','B','']]),/duplicados/);
 assert.equal(S.safeImage('javascript:alert(1)'),'');assert.equal(S.safeImage('https://name:password@example.com/img.jpg'),'');assert.equal(S.safeImage('http://example.com/img.jpg'),'');assert.equal(S.safeImage('https://127.0.0.1/img.jpg'),'');
 const latest=await client.read(sheetId);postMismatch=true;await assert.rejects(client.save(latest,base),/lectura posterior/);postMismatch=false;
 deny=true;await assert.rejects(client.read(sheetId),/venció/);assert.equal(client.signedIn(),false);
 assert.equal(new S.Client({}).ready(),false);
 assert.throws(()=>client.acceptToken({access_token:'fixture',expires_in:3600},false),/no autorizó/);
 console.log('OK: autorización por archivo, escritura de campos permitidos en RAW, pagos intactos, lectura posterior, conflicto, solo lectura, token vencido y fotos por experiencia. Pruebas con API simulada.');
})().catch(error=>{console.error(error);process.exit(1);});
