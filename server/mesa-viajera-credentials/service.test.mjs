import test from 'node:test';
import assert from 'node:assert/strict';
import {createService,validateReplacement} from './service.mjs';
import {GoogleVault} from './google-vault.mjs';
import {handler} from './http.mjs';
import {createServer} from 'node:http';
const token='fixture-token-'.repeat(5);
const fakeKey=['rk','test','fixturevalue1234567890'].join('_');
const replacement={credentials:{STRIPE_SECRET_KEY:fakeKey},expectedVersion:'0'};
function fixture(){
 const entries=new Map(),writes=[],audits=[];let reads=0;
 const vault={describe:async(p,e)=>{reads++;return entries.get(p+e)||{version:'0',enabled:false};},write:async(p,e,credentials)=>{const version=String(Number(entries.get(p+e)?.version||0)+1);entries.set(p+e,{version,enabled:true,createdAt:'2026-10-28T00:00:00Z'});writes.push({p,e,credentials});return {version};}};
 const service=createService({vault,allowedSubjects:['1234567890'],verifyIdentity:async t=>{if(t==='invalid')throw Error('invalid token');return {sub:t==='other'?'9999999999':'1234567890'};},audit:x=>audits.push(x)});
 return {service,entries,writes,audits,reads:()=>reads};
}
test('rechaza usuarios sin permiso antes de consultar o escribir',async()=>{
 const f=fixture();await assert.rejects(f.service.status('invalid'),{status:401});await assert.rejects(f.service.replace('other','stripe','sandbox',replacement),{status:403});assert.equal(f.reads(),0);assert.equal(f.writes.length,0);
});
test('el estado no devuelve credenciales y separa cuatro ambientes',async()=>{
 const f=fixture();const r=await f.service.status(token);assert.equal(r.providers.length,4);assert.equal(r.providers.filter(x=>x.configured).length,0);assert.equal(f.writes.length,0);assert(!JSON.stringify(r).includes('credentials'));
});
test('agrega versión sin exponer claves, activar pagos ni modificar el otro proveedor',async()=>{
 const f=fixture();const r=await f.service.replace(token,'stripe','sandbox',replacement);assert.equal(r.version,'1');assert.equal(r.credentialVerification,'not_performed');assert.equal(r.paymentActivation,'unchanged');assert.equal(f.entries.size,1);assert(!JSON.stringify(r).includes(fakeKey));assert(!JSON.stringify(f.audits).includes(fakeKey));assert.equal(f.audits[0].actor,'1234567890');await assert.rejects(f.service.replace(token,'stripe','sandbox',replacement),{status:409});
});
test('rechaza ambiente cruzado, claves públicas, campos extra, secretos parciales y live sin confirmación',()=>{
 assert.throws(()=>validateReplacement('stripe','live',replacement));
 assert.throws(()=>validateReplacement('stripe','live',{...replacement,confirmLive:true}));
 assert.throws(()=>validateReplacement('stripe','sandbox',{...replacement,credentials:{STRIPE_SECRET_KEY:['pk','test','fixture1234567890'].join('_')}}));
 assert.throws(()=>validateReplacement('stripe','sandbox',{...replacement,activate:true}));
 assert.throws(()=>validateReplacement('paypal','sandbox',{credentials:{PAYPAL_CLIENT_ID:'fixtureclient'},expectedVersion:'0'}));
 assert.throws(()=>validateReplacement('paypal','sandbox',{credentials:{PAYPAL_CLIENT_ID:'fixtureclient',PAYPAL_CLIENT_SECRET:'fixture-secret',PAYPAL_ENV:'LIVE'},expectedVersion:'0'}));
});
test('PayPal guarda ID y secret en una sola versión, con ambiente derivado del servidor',async()=>{
 const f=fixture();await f.service.replace(token,'paypal','sandbox',{expectedVersion:'0',credentials:{PAYPAL_CLIENT_ID:'fixtureclient',PAYPAL_CLIENT_SECRET:'fixture-secret'}});assert.equal(f.writes[0].credentials.PAYPAL_ENV,'SANDBOX');const r=await f.service.status(token);assert.equal(r.providers.filter(x=>x.configured).length,1);assert(!JSON.stringify(r).includes('fixture-secret'));
});
test('escrituras concurrentes con la misma versión: una sola gana dentro de la instancia',async()=>{
 const f=fixture();const r=await Promise.allSettled([f.service.replace(token,'stripe','sandbox',replacement),f.service.replace(token,'stripe','sandbox',replacement)]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(f.writes.length,1);
});
test('el adaptador Google solo consulta metadatos y agrega versiones, nunca accede al valor',async()=>{
 const requests=[];const client={request:async r=>{requests.push(r);return {data:{name:'projects/123456/secrets/eva-payments-stripe-sandbox/versions/1',state:'ENABLED'}};}};
 const v=new GoogleVault({client,project:'123456'});assert.equal((await v.describe('stripe','sandbox')).enabled,true);await v.write('stripe','sandbox',{STRIPE_SECRET_KEY:fakeKey});assert(requests.every(r=>!r.url.includes(':access')));assert.equal(requests[1].method,'POST');assert.equal(requests[1].retry,false);assert.throws(()=>v.resource('paypal','arbitrary'));
});
test('fallos del proveedor no exponen cuerpos, tokens ni datos de la solicitud',async()=>{
 const v=new GoogleVault({project:'123456',client:{request:async()=>{throw Error(fakeKey);}}});await assert.rejects(v.write('stripe','sandbox',replacement.credentials),e=>!e.message.includes(fakeKey));
});
test('API: origen exacto, sin cookies, bearer explícito, límites y respuesta sin caché',async()=>{
 const f=fixture();const server=createServer(handler({service:f.service,origin:'https://proyectoeva.mx'}));await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 try{
  let r=await fetch(url+'/v1/admin/providers');assert.equal(r.status,403);
  r=await fetch(url+'/v1/admin/providers',{headers:{origin:'https://proyectoeva.mx'}});assert.equal(r.status,401);
  const headers={origin:'https://proyectoeva.mx',authorization:'Bearer '+token,'content-type':'application/json'};
  r=await fetch(url+'/v1/admin/providers',{headers});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('set-cookie'),null);
  r=await fetch(url+'/v1/admin/providers/stripe/sandbox?key=fixture',{method:'PUT',headers,body:JSON.stringify(replacement)});assert.equal(r.status,400);
  r=await fetch(url+'/v1/admin/providers/stripe/sandbox',{method:'PUT',headers,body:JSON.stringify(replacement)});assert.equal(r.status,200);assert(!(await r.text()).includes(fakeKey));
  r=await fetch(url+'/v1/admin/providers/stripe/sandbox',{method:'PUT',headers,body:'x'.repeat(10001)});assert.equal(r.status,413);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
