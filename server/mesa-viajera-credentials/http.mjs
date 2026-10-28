import {createServer} from 'node:http';
import {RequestError} from './service.mjs';
export function handler({service,origin}){
  if(!/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/.test(origin))throw Error('Exact HTTPS origin required.');
  return async(req,res)=>{
    const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"};
    const send=(status,body)=>{res.writeHead(status,headers);res.end(JSON.stringify(body));};
    // Es una API JSON con bearer explícito, sin cookies ni login POST de GIS.
    // Origin y preflight restringidos; jamás aceptar tokens por URL/cuerpo.
    if(req.headers.origin!==origin){send(403,{error:'ORIGIN_DENIED'});return;}
    headers['Access-Control-Allow-Origin']=origin;
    headers['Access-Control-Allow-Methods']='GET, PUT, OPTIONS';
    headers['Access-Control-Allow-Headers']='Authorization, Content-Type';
    if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return;}
    try{
      if(req.url?.includes('?'))throw new RequestError(400,'QUERY_NOT_ALLOWED');
      const match=/^Bearer ([A-Za-z0-9_.-]{40,8192})$/.exec(req.headers.authorization||'');
      if(!match)throw new RequestError(401,'SIGN_IN_REQUIRED');
      if(req.method==='GET'&&req.url==='/v1/admin/providers'){send(200,await service.status(match[1]));return;}
      const route=/^\/v1\/admin\/providers\/(stripe|paypal)\/(sandbox|live)$/.exec(req.url||'');
      if(req.method!=='PUT'||!route)throw new RequestError(404,'NOT_FOUND');
      if(!/^application\/json(?:\s*;.*)?$/i.test(req.headers['content-type']||''))throw new RequestError(415,'JSON_REQUIRED');
      let size=0;const chunks=[];
      for await(const chunk of req){size+=chunk.length;if(size>10000)throw new RequestError(413,'BODY_TOO_LARGE');chunks.push(chunk);}
      let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new RequestError(400,'INVALID_JSON');}
      send(200,await service.replace(match[1],route[1],route[2],input));
    }catch(error){send(error instanceof RequestError?error.status:503,{error:error instanceof RequestError?error.code:'PRIVATE_SERVICE_UNAVAILABLE'});}
  };
}
export function startServer(options,port){const server=createServer(handler(options));server.requestTimeout=20000;server.headersTimeout=10000;server.listen(port,'0.0.0.0');return server;}
