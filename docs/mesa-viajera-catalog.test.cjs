const assert=require('node:assert/strict');
const C=require('../js/mesa-viajera-catalog.js'),S=require('../js/mesa-viajera-sheets.js');
const id='pilot-sheet-identifier-00001';
const settings={clientId:'test.apps.googleusercontent.com',pickerApiKey:'fixture',projectNumber:'1234',allowedSpreadsheetIds:[id]};
const original=[['ID','PRECIO','NOMBRE','DESCRIPCIÓN','URL_IMAGEN','PAYPAL_LINK','FORMULA_INTERNA','ESTADO'],['EXP-1',2500,'Cena','Para dos','https://proyectoeva.mx/cena.jpg','keep-payment-link','=B2*2','DISPONIBLE']];
let rows=structuredClone(original),readOnly=false,calls=[],conflict=false,mismatch=false;
const fake=async(url,options)=>{
 calls.push({url,method:options.method||'GET',body:options.body});
 assert(!url.includes('access_token'));assert.equal(options.credentials,'omit');
 if(url.includes('/drive/v3/'))return {ok:true,status:200,json:async()=>({id,name:'Mesa piloto',mimeType:'application/vnd.google-apps.spreadsheet',capabilities:{canEdit:!readOnly}})};
 if(url.includes('?fields=sheets'))return {ok:true,status:200,json:async()=>({sheets:[{properties:{title:'EXPERIENCIAS',gridProperties:{rowCount:970,columnCount:26}}}]})};
 if(options.method==='POST'){
  const body=JSON.parse(options.body);assert.equal(body.valueInputOption,'RAW');
  for(const entry of body.data){const m=entry.range.match(/^'EXPERIENCIAS'!([A-Z])(\d+)$/);assert(m);const col=m[1].charCodeAt(0)-65,row=Number(m[2])-1;assert([0,2,3,4,7].includes(col));rows[row]??=[];rows[row][col]=mismatch?'bad':entry.values[0][0];}
  return {ok:true,status:200,json:async()=>({})};
 }
 assert(url.includes('valueRenderOption=FORMULA'));
 if(conflict)rows[1][1]=2600;
 return {ok:true,status:200,json:async()=>({values:structuredClone(rows)})};
};
const client=new S.Client(settings,fake);client.acceptToken({access_token:'fixture-token',expires_in:3600},true);
const input={id:'EXP-1',isNew:false,name:'Cena al atardecer',description:'Para dos personas',image:'https://proyectoeva.mx/cena-nueva.jpg',price:1};
(async()=>{
 let snapshot=await client.catalogState(id);assert.equal(snapshot.columns.name,2);assert.equal(snapshot.items[0].price,'2500');
 let saved=await client.saveExperience(snapshot,input);assert.equal(saved.items[0].name,input.name);assert.equal(rows[1][1],2500);assert.equal(rows[1][5],'keep-payment-link');assert.equal(rows[1][6],'=B2*2');assert.equal(rows[1][0],'EXP-1');assert.equal(rows[1][7],'DISPONIBLE');
 const newInput={...input,id:'EXP-2',isNew:true,name:'Globo',description:'Otra experiencia'};
 saved=await client.saveExperience(saved,newInput);assert.equal(rows[2][0],'EXP-2');assert.equal(rows[2][1],undefined);assert.equal(rows[2][5],undefined);assert.equal(rows[2][7],'BORRADOR');
 assert.throws(()=>C.plan(saved,newInput,S.safeImage),/ya existe/);
 const posts=()=>calls.filter(x=>x.method==='POST').length;const n=posts();
 conflict=true;await assert.rejects(client.saveExperience(saved,{...input,name:'Otro'}),/cambió/);assert.equal(posts(),n);conflict=false;
 readOnly=true;const ro=await client.catalogState(id);await assert.rejects(client.saveExperience(ro,input),/lectura/);assert.equal(posts(),n);readOnly=false;
 let formula=C.parse([original[0],['EXP-1',2500,'=A2','Texto','https://proyectoeva.mx/cena.jpg']],970);assert.throws(()=>C.plan(formula,input,S.safeImage),/fórmula/);
 assert.throws(()=>C.parse([['ID','NOMBRE','FOTO'],['same','Uno',''],['same','Dos','']],970),/duplicados/);
 assert.throws(()=>C.parse([['ID','NOMBRE','FOTO','IMAGEN']],970),/más de una/);
 assert.throws(()=>C.parse([['ID','NOMBRE','FOTO']],1001),/tamaño/);
 const noDesc=C.parse([['ID','NOMBRE','FOTO','ESTADO']],970);assert.throws(()=>C.plan(noDesc,{...newInput,description:'Texto'},S.safeImage),/descripción/);
 assert.equal(C.plan(noDesc,{...newInput,description:''},S.safeImage).changes.length,4);
 assert.throws(()=>C.plan(saved,{...input,image:'javascript:alert(1)'},S.safeImage),/HTTPS/);
 const snap=await client.catalogState(id);mismatch=true;await assert.rejects(client.saveExperience(snap,{...input,name:'Lectura distinta'}),/No se confirmó/);mismatch=false;
 assert(calls.filter(x=>x.method==='POST').every(x=>!x.body.includes('PAYPAL')&&!x.body.includes('TRANSACCIONES')&&!x.body.includes('REGALOS')&&!x.body.includes('PRECIO')));
 console.log('OK: catálogo con columnas reordenadas, altas y cambios puntuales en RAW, precios/pagos/fórmulas intactos, IDs estables, conflictos, solo lectura, encabezados ambiguos y verificación posterior. API simulada.');
})().catch(e=>{console.error(e);process.exit(1)});
