import {OAuth2Client,GoogleAuth} from 'google-auth-library';
import {GoogleVault} from './google-vault.mjs';
import {createService} from './service.mjs';
import {startServer} from './http.mjs';
// Ningún secreto de proveedor se configura como variable del contenedor.
const {GOOGLE_CLOUD_PROJECT,EVA_GOOGLE_CLIENT_ID,EVA_ADMIN_GOOGLE_SUBS,EVA_PANEL_ORIGIN}=process.env;
if(!GOOGLE_CLOUD_PROJECT||!EVA_GOOGLE_CLIENT_ID||!EVA_ADMIN_GOOGLE_SUBS||!EVA_PANEL_ORIGIN)throw Error('Missing deployment configuration.');
const subjects=EVA_ADMIN_GOOGLE_SUBS.split(',').map(s=>s.trim());
if(subjects.some(s=>!/^\d{6,40}$/.test(s)))throw Error('Invalid administrator subjects.');
const verifier=new OAuth2Client(EVA_GOOGLE_CLIENT_ID);
const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']});
const vault=new GoogleVault({client:await auth.getClient(),project:GOOGLE_CLOUD_PROJECT});
const service=createService({
  allowedSubjects:subjects,vault,
  verifyIdentity:async token=>{
    const ticket=await verifier.verifyIdToken({idToken:token,audience:EVA_GOOGLE_CLIENT_ID});
    const p=ticket.getPayload();
    if(!p||!['accounts.google.com','https://accounts.google.com'].includes(p.iss)||!p.exp||p.exp*1000<=Date.now())throw Error('Invalid identity.');
    return {sub:p.sub};
  },
  audit:entry=>process.stdout.write(JSON.stringify(entry)+'\n')
});
const port=Number(process.env.PORT||8080);if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid port.');
startServer({service,origin:EVA_PANEL_ORIGIN},port);
