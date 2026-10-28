const assert=require('node:assert/strict');
const P=require('../js/mesa-viajera-payments.js'),S=require('../js/mesa-viajera-sheets.js');
const id='private-mesa-spreadsheet-identifier-001';
const input=Object.fromEntries(P.FIELDS.map(([k])=>[k,'']));input.MONEDA='MXN';input.STRIPE_CONNECTED_ACCOUNT_ID='acct_fixtureaccount12345';input.PAYPAL_ME='https://paypal.me/Ejemplo';input.TRANSFERENCIA_CLABE='000000000000000000';input.TRANSFERENCIA_BENEFICIARIO='Titular de ejemplo';input.TRANSFERENCIA_HORAS_RESERVA='24';
const original=[['CLAVE','VALOR'],...P.FIELDS.map(([k])=>[k,'']),...P.FLAGS.map(k=>[k,'NO']),...P.FEES.map(k=>[k,'0']),['NOMBRES','Conservar nombres'],['PRIVATE_SECRET','never-copy']];
let rows=structuredClone(original),calls=[],publicAccess=false,readOnly=false,conflict=false,mismatch=false;
const fake=async(url,options)=>{
 const method=options.method||'GET';calls.push({url,method,body:options.body});assert(!url.includes('access_token'));assert.equal(options.credentials,'omit');
 if(url.includes('/drive/v3/'))return {ok:true,status:200,json:async()=>({id,name:'Mesa privada de prueba',mimeType:'application/vnd.google-apps.spreadsheet',capabilities:{canEdit:!readOnly},permissions:[{type:publicAccess?'anyone':'user'}]})};
 if(method==='POST'){
  const body=JSON.parse(options.body);assert.equal(body.valueInputOption,'RAW');
  for(const c of body.data){const n=Number(c.range.match(/!B(\d+)$/)[1])-1;assert(P.FIELDS.some(([k])=>k===rows[n][0]));rows[n][1]=mismatch?'wrong':c.values[0][0];}
  return {ok:true,status:200,json:async()=>({})};
 }
 if(conflict)rows.find(r=>r[0]==='STRIPE_FEE_PCT')[1]='changed';
 return {ok:true,status:200,json:async()=>({values:structuredClone(rows)})};
};
const client=new S.Client({clientId:'fixture.apps.googleusercontent.com',pickerApiKey:'fixture',projectNumber:'123',allowedSpreadsheetIds:[id]},fake);
client.acceptToken({access_token:'fixture-not-a-real-token',expires_in:3600},true);
(async()=>{
 let snapshot=await client.paymentState(id);assert.equal(snapshot.values.PRIVATE_SECRET,undefined);assert(!JSON.stringify(snapshot).includes('never-copy'));
 let saved=await client.savePayments(snapshot,{...input,STRIPE_SECRET:'ignored',TARJETAS_ACTIVAS:'SI'});
 assert.equal(saved.values.MONEDA,'MXN');assert.equal(rows.find(r=>r[0]==='NOMBRES')[1],'Conservar nombres');assert(P.FLAGS.every(k=>rows.find(r=>r[0]===k)[1]==='NO'));assert(P.FEES.every(k=>rows.find(r=>r[0]===k)[1]==='0'));
 assert.equal(rows.find(r=>r[0]==='PRIVATE_SECRET')[1],'never-copy');
 const posts=()=>calls.filter(c=>c.method==='POST').length;let n=posts();
 conflict=true;await assert.rejects(client.savePayments(saved,{...input,TRANSFERENCIA_BANCO:'Banco de ejemplo'}),/cambió/);assert.equal(posts(),n);conflict=false;
 readOnly=true;snapshot=await client.paymentState(id);await assert.rejects(client.savePayments(snapshot,input),/lectura/);readOnly=false;
 publicAccess=true;n=calls.filter(c=>c.url.includes('/values/')).length;await assert.rejects(client.paymentState(id),/copia privada/);assert.equal(calls.filter(c=>c.url.includes('/values/')).length,n);publicAccess=false;
 snapshot=await client.paymentState(id);mismatch=true;await assert.rejects(client.savePayments(snapshot,{...input,TRANSFERENCIA_BANCO:'Otro banco'}),/No se confirmó/);mismatch=false;
 assert.throws(()=>P.validate({...input,STRIPE_CONNECTED_ACCOUNT_ID:'sk_live_not-an-account'}),/acct_/);
 for(const url of ['https://evil.test/destinatario','https://paypal.me/Ejemplo/500','https://paypal.me/Ejemplo?amount=100','http://paypal.me/Ejemplo'])assert.throws(()=>P.validate({...input,PAYPAL_ME:url}),/PayPal.Me/);
 assert.throws(()=>P.validate({...input,TRANSFERENCIA_CLABE:'123'}),/18 dígitos/);assert.throws(()=>P.validate({...input,TRANSFERENCIA_HORAS_RESERVA:'0'}),/entre 1 y 720/);
 const base=P.parse(original);base.values.TARJETAS_ACTIVAS='SI';assert.throws(()=>P.plan(base,input),/desactivados/);
 const formula=P.parse(original);formula.values.PAYPAL_ME='=A2';assert.throws(()=>P.plan(formula,input),/fórmula/);
 assert.throws(()=>P.parse([...original,['MONEDA','USD']]),/duplicada/);
 console.log('OK: configuración de pagos en Sheets privada, escrituras RAW limitadas, medios NO, fees intactas, solo lectura, conflictos, lectura posterior y validaciones. No se ejecutan cobros.');
})().catch(e=>{console.error(e);process.exit(1)});
