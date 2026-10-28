// Preparación del servicio privado. No procesa pagos ni lee secretos hacia el navegador.
export class RequestError extends Error {
  constructor(status,code){super(code);this.status=status;this.code=code;}
}
export const PROVIDERS=Object.freeze({stripe:['STRIPE_SECRET_KEY'],paypal:['PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET']});
export function validateReplacement(provider,environment,input){
  if(!Object.hasOwn(PROVIDERS,provider)||!['sandbox','live'].includes(environment))throw new RequestError(404,'NOT_FOUND');
  if(!input||typeof input!=='object'||Array.isArray(input))throw new RequestError(400,'INVALID_INPUT');
  if(Object.keys(input).some(k=>!['credentials','expectedVersion','confirmLive'].includes(k)))throw new RequestError(400,'UNKNOWN_FIELD');
  if(environment==='live'&&input.confirmLive!==true)throw new RequestError(400,'LIVE_CONFIRMATION_REQUIRED');
  if(typeof input.expectedVersion!=='string'||!/^\d{1,20}$/.test(input.expectedVersion))throw new RequestError(400,'VERSION_REQUIRED');
  const keys=PROVIDERS[provider],c=input.credentials;
  if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).length!==keys.length||keys.some(k=>!Object.hasOwn(c,k)))throw new RequestError(400,'INVALID_CREDENTIAL_FIELDS');
  const clean={};
  for(const k of keys){if(typeof c[k]!=='string'||c[k].length<8||c[k].length>2048||!/^[\x21-\x7e]+$/.test(c[k]))throw new RequestError(400,'INVALID_CREDENTIAL_FORMAT');clean[k]=c[k];}
  if(provider==='stripe'){
    const prefix=environment==='live'?'live':'test';
    if(!new RegExp('^(rk|sk)_'+prefix+'_[A-Za-z0-9]{12,}$').test(clean.STRIPE_SECRET_KEY))throw new RequestError(400,'STRIPE_ENVIRONMENT_MISMATCH');
  }else{
    if(!/^[A-Za-z0-9_-]+$/.test(clean.PAYPAL_CLIENT_ID)||!/^[-A-Za-z0-9_]+$/.test(clean.PAYPAL_CLIENT_SECRET))throw new RequestError(400,'INVALID_PAYPAL_FORMAT');
    clean.PAYPAL_ENV=environment==='live'?'LIVE':'SANDBOX';
  }
  return {credentials:clean,expectedVersion:input.expectedVersion};
}
export function createService({verifyIdentity,vault,allowedSubjects,audit=()=>{}}){
  if(!Array.isArray(allowedSubjects)||!allowedSubjects.length)throw Error('Administrator subjects must be configured.');
  const allowed=new Set(allowedSubjects);
  // Serializa cambios dentro de esta instancia; no es un bloqueo distribuido.
  let queue=Promise.resolve();
  const serialized=task=>{const next=queue.then(task,task);queue=next.catch(()=>{});return next;};
  async function authorize(token){
    let identity;
    try{identity=await verifyIdentity(token);}catch{throw new RequestError(401,'SIGN_IN_REQUIRED');}
    if(!identity?.sub||!allowed.has(identity.sub))throw new RequestError(403,'ADMINISTRATOR_REQUIRED');
    return identity.sub;
  }
  async function describe(provider,environment){
    const metadata=await vault.describe(provider,environment);
    return {provider,environment,version:String(metadata.version),configured:metadata.enabled===true,
      credentialVerification:'not_performed',paymentActivation:'unchanged',updatedAt:metadata.createdAt||null};
  }
  return {
    async status(token){await authorize(token);const states=[];for(const provider of Object.keys(PROVIDERS))for(const environment of ['sandbox','live'])states.push(await describe(provider,environment));return {merchant:'Estudia Viaja y Aprende',providers:states};},
    async replace(token,provider,environment,input){
      const actor=await authorize(token);
      const {credentials,expectedVersion}=validateReplacement(provider,environment,input);
      return serialized(async()=>{
        const current=await vault.describe(provider,environment);
        if(String(current.version)!==expectedVersion)throw new RequestError(409,'CONFIGURATION_CHANGED');
        const result=await vault.write(provider,environment,credentials);
        // Emitir auditoría solo de metadatos seleccionados. Nunca del cuerpo ni errores del SDK.
        audit({action:'credential_version_added',actor,provider,environment,version:String(result.version)});
        return {provider,environment,version:String(result.version),configured:true,credentialVerification:'not_performed',paymentActivation:'unchanged'};
      });
    }
  };
}
