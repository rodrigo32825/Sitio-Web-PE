// Los cuatro contenedores deben crearse por administración antes del despliegue.
// Este servicio solo agrega versiones y consulta metadatos: no tiene ruta de lectura de valores.
export class GoogleVault {
  constructor({client,project}){
    if(!/^([a-z][a-z0-9-]{4,61}[a-z0-9]|[0-9]{6,20})$/.test(project))throw Error('Invalid project.');
    this.client=client;this.project=project;
  }
  resource(provider,environment){
    if(!['stripe','paypal'].includes(provider)||!['sandbox','live'].includes(environment))throw Error('Invalid resource.');
    return `projects/${this.project}/secrets/eva-payments-${provider}-${environment}`;
  }
  async describe(provider,environment){
    const resource=this.resource(provider,environment);
    try{
      const {data}=await this.client.request({url:`https://secretmanager.googleapis.com/v1/${resource}/versions/latest`,method:'GET',timeout:15000,retry:false});
      const version=String(data.name||'').split('/').pop();if(!/^\d+$/.test(version))throw Error('Invalid version response.');
      return {version,enabled:data.state==='ENABLED',createdAt:data.createTime||null};
    }catch(error){if(Number(error?.response?.status)===404)return {version:'0',enabled:false,createdAt:null};throw Error('Credential metadata unavailable.');}
  }
  async write(provider,environment,credentials){
    const resource=this.resource(provider,environment);
    try{
      const {data}=await this.client.request({url:`https://secretmanager.googleapis.com/v1/${resource}:addVersion`,method:'POST',data:{payload:{data:Buffer.from(JSON.stringify(credentials),'utf8').toString('base64')}},timeout:15000,retry:false});
      const version=String(data.name||'').split('/').pop();if(!/^\d+$/.test(version))throw Error('Invalid version response.');
      return {version};
    }catch{throw Error('Credential write not confirmed. Refresh status before retrying.');}
  }
}
