import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('./apps-script-adapter.gs',import.meta.url),'utf8');
const key=['rk','test','fixturevalue1234567890'].join('_');
function setup(properties,bundle={STRIPE_SECRET_KEY:key},status=200){
 const requests=[];
 const context=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties[k]??null})},ScriptApp:{getOAuthToken:()=>'fixture-google-token'},UrlFetchApp:{fetch:(url,options)=>{requests.push({url,options});return {getResponseCode:()=>status,getContentText:()=>JSON.stringify({payload:{data:Buffer.from(JSON.stringify(bundle)).toString('base64')}})};}},Utilities:{base64Decode:s=>Buffer.from(s,'base64'),newBlob:bytes=>({getDataAsString:()=>bytes.toString('utf8')})}});
 vm.runInContext(code,context);return {run:p=>vm.runInContext(`evaPaymentCredentialBundle_('${p}')`,context),requests};
}
const central={EVA_PAYMENT_CREDENTIALS_SOURCE:'VAULT',EVA_PAYMENT_GCP_PROJECT:'1234567890',EVA_PAYMENT_ENVIRONMENT:'sandbox',EVA_PAYMENT_STRIPE_VERSION:'3',EVA_PAYMENT_PAYPAL_VERSION:'4'};
test('LEGACY conserva las lecturas actuales y no llama a la bóveda',()=>{
 const f=setup({STRIPE_SECRET_KEY:'legacy-fixture',PAYPAL_CLIENT_ID:'client-fixture',PAYPAL_CLIENT_SECRET:'secret-fixture'});assert.equal(f.run('stripe').STRIPE_SECRET_KEY,'legacy-fixture');assert.equal(f.run('paypal').PAYPAL_ENV,'SANDBOX');assert.equal(f.requests.length,0);
});
test('VAULT usa la versión numérica aprobada y no latest ni secretos de otra mesa',()=>{
 const f=setup(central);assert.equal(f.run('stripe').STRIPE_SECRET_KEY,key);assert.match(f.requests[0].url,/eva-payments-stripe-sandbox\/versions\/3:access$/);assert(!f.requests[0].url.includes('latest'));assert.equal(f.requests[0].options.method,'get');
});
test('VAULT no vuelve a LEGACY cuando el acceso falla ni expone la respuesta',()=>{
 const f=setup({...central,STRIPE_SECRET_KEY:'legacy-fallback-forbidden'},{sensitive:'must-not-return'},403);assert.throws(()=>f.run('stripe'),/no está disponible/);assert.equal(f.requests.length,1);
});
test('rechaza versión flotante, ambiente inválido y cuenta de producción en sandbox',()=>{
 let f=setup({...central,EVA_PAYMENT_STRIPE_VERSION:'latest'});assert.throws(()=>f.run('stripe'));assert.equal(f.requests.length,0);
 f=setup({...central,EVA_PAYMENT_ENVIRONMENT:'arbitrary'});assert.throws(()=>f.run('stripe'));assert.equal(f.requests.length,0);
 f=setup(central,{STRIPE_SECRET_KEY:['rk','live','fixturevalue1234567890'].join('_')});assert.throws(()=>f.run('stripe'),/ambiente/);
});
test('PayPal devuelve un paquete consistente y rechaza ambiente cruzado',()=>{
 const f=setup(central,{PAYPAL_CLIENT_ID:'fixtureclient',PAYPAL_CLIENT_SECRET:'fixturesecret',PAYPAL_ENV:'SANDBOX'});assert.equal(f.run('paypal').PAYPAL_CLIENT_ID,'fixtureclient');assert.match(f.requests[0].url,/paypal-sandbox\/versions\/4:access$/);
 const invalid=setup(central,{PAYPAL_CLIENT_ID:'fixtureclient',PAYPAL_CLIENT_SECRET:'fixturesecret',PAYPAL_ENV:'LIVE'});assert.throws(()=>invalid.run('paypal'),/ambiente/);
});
