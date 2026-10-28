'use strict';
const MesaPayments=(()=>{
  const FIELDS=[
    ['MONEDA','Moneda de la mesa','common',3],
    ['STRIPE_CONNECTED_ACCOUNT_ID','Cuenta destinataria de Stripe','stripe',80],
    ['PAYPAL_ME','Enlace PayPal.Me del destinatario','paypal',180],
    ['TRANSFERENCIA_BENEFICIARIO','Beneficiario','transfer',160],
    ['TRANSFERENCIA_BANCO','Banco','transfer',100],
    ['TRANSFERENCIA_CLABE','CLABE','transfer',18],
    ['TRANSFERENCIA_CUENTA','Número de cuenta','transfer',30],
    ['TRANSFERENCIA_HORAS_RESERVA','Horas de reserva para transferencia','transfer',3]
  ];
  const FLAGS=['TARJETAS_ACTIVAS','PAYPAL_ACTIVO','TRANSFERENCIA_ACTIVA'];
  const FEES=['COMISION_EVA_PCT','STRIPE_FEE_PCT','STRIPE_FEE_FIJO_MXN','IVA_PCT'];
  const KEYS=[...FIELDS.map(f=>f[0]),...FLAGS,...FEES];
  function parse(rows){
    const values={},positions={};
    if(!Array.isArray(rows))throw Error('CONFIG no contiene datos legibles.');
    rows.forEach((row,i)=>{const key=String(row?.[0]||'');if(!KEYS.includes(key))return;if(Object.hasOwn(values,key))throw Error('Clave de pagos duplicada: '+key+'. Rodrigo debe revisar CONFIG.');values[key]=String(row[1]??'');positions[key]=i+1;});
    if([...FIELDS.map(f=>f[0]),...FLAGS].some(k=>!Object.hasOwn(values,k)))throw Error('Esta mesa no tiene todos los campos de pagos V2. Rodrigo debe revisar CONFIG.');
    return {values,positions,signature:JSON.stringify(KEYS.map(k=>[k,values[k],positions[k]]))};
  }
  function validate(input){
    const clean={};
    for(const[key,label,,max]of FIELDS){const raw=input[key];if(typeof raw!=='string'||raw.length>max||/[\u0000-\u001f\u007f]/.test(raw))throw Error('Revisa '+label+'.');clean[key]=raw.trim();}
    if(clean.MONEDA&&!/^[A-Z]{3}$/.test(clean.MONEDA))throw Error('Usa una moneda de tres letras mayúsculas, por ejemplo MXN.');
    if(clean.STRIPE_CONNECTED_ACCOUNT_ID&&!/^acct_[A-Za-z0-9]{10,60}$/.test(clean.STRIPE_CONNECTED_ACCOUNT_ID))throw Error('El identificador de Stripe debe comenzar con acct_. No introduzcas claves API.');
    if(clean.PAYPAL_ME){let u;try{u=new URL(clean.PAYPAL_ME);}catch{throw Error('Usa el enlace HTTPS completo de PayPal.Me.');}if(u.protocol!=='https:'||!['paypal.me','www.paypal.me'].includes(u.hostname)||u.username||u.password||u.port||u.search||u.hash||!/^\/[A-Za-z0-9_.-]{1,80}\/?$/.test(u.pathname))throw Error('Usa un enlace PayPal.Me del destinatario, sin importe ni parámetros.');}
    if(clean.TRANSFERENCIA_CLABE&&!/^\d{18}$/.test(clean.TRANSFERENCIA_CLABE))throw Error('La CLABE debe contener 18 dígitos. Este formato no confirma su titularidad.');
    if(clean.TRANSFERENCIA_CUENTA&&!/^\d{5,30}$/.test(clean.TRANSFERENCIA_CUENTA))throw Error('Revisa el número de cuenta; usa solo dígitos.');
    if(clean.TRANSFERENCIA_HORAS_RESERVA&&(!/^\d{1,3}$/.test(clean.TRANSFERENCIA_HORAS_RESERVA)||Number(clean.TRANSFERENCIA_HORAS_RESERVA)<1||Number(clean.TRANSFERENCIA_HORAS_RESERVA)>720))throw Error('Las horas de reserva deben ser un entero entre 1 y 720.');
    if(!clean.MONEDA&&Object.entries(clean).some(([k,v])=>k!=='MONEDA'&&v))throw Error('Define la moneda de la mesa antes de guardar datos de cobro.');
    return clean;
  }
  function plan(snapshot,input){
    if(FLAGS.some(k=>snapshot.values[k]!=='NO'))throw Error('Esta sección prepara mesas con pagos desactivados. Rodrigo debe revisar los medios que ya estén activos antes de cambiar destinatarios.');
    const clean=validate(input);
    return FIELDS.flatMap(([key,label])=>{
      const before=snapshot.values[key];if(before.startsWith('='))throw Error('El campo '+label+' contiene una fórmula; el panel no la reemplazará.');
      return before===clean[key]?[]:[{key,label,before,after:clean[key],range:"'CONFIG'!B"+snapshot.positions[key],values:[[clean[key]]]}];
    });
  }
  class Editor{
    constructor({client,onBusy,review}){
      this.client=client;this.onBusy=onBusy;this.review=review;this.source=null;this.snapshot=null;this.busy=false;this.$=id=>document.getElementById(id);
      for(const[key,label,group,max]of FIELDS){const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.id='payment-'+key;input.name=key;input.maxLength=max;input.autocomplete='off';input.spellcheck=false;if(key==='PAYPAL_ME')input.type='url';if(/CLABE|CUENTA|HORAS/.test(key))input.inputMode='numeric';if(key==='MONEDA')input.placeholder='MXN';if(key==='STRIPE_CONNECTED_ACCOUNT_ID')input.placeholder='acct_…';wrap.append(input);this.$('payment-'+group).append(wrap);}
      this.$('payment-form').addEventListener('submit',event=>{event.preventDefault();void this.save();});
      this.$('payment-refresh').addEventListener('click',()=>this.load(true));this.clear();
    }
    message(text,error=false){this.$('payment-status').textContent=text;this.$('payment-status').classList.toggle('error',error);}
    clear(){this.source=null;this.snapshot=null;this.$('payment-form').reset();this.$('payment-fields').disabled=true;this.$('payment-save').disabled=true;this.$('payment-refresh').disabled=true;this.$('payment-current').textContent='Abre la mesa que deseas configurar.';this.$('payment-flags').textContent='Estados pendientes de leer desde Sheets.';this.$('payment-fees').textContent='Comisiones pendientes de leer.';this.message('Selecciona Abrir mesa o crea la hoja de tu borrador.');}
    setSource(source){if(this.source?.id!==source.id)this.clear();this.source=source;this.$('payment-current').textContent=source.title;this.$('payment-refresh').disabled=false;}
    setBusy(value){this.busy=value;this.onBusy(value);const editable=this.snapshot?.canEdit&&FLAGS.every(k=>this.snapshot.values[k]==='NO');this.$('payment-fields').disabled=value||!editable;this.$('payment-save').disabled=value||!editable;this.$('payment-refresh').disabled=value||!this.source;}
    fill(){for(const[key]of FIELDS)this.$('payment-'+key).value=this.snapshot.values[key];this.$('payment-flags').textContent='Estado en Sheets · Tarjetas: '+this.snapshot.values.TARJETAS_ACTIVAS+' · PayPal: '+this.snapshot.values.PAYPAL_ACTIVO+' · Transferencia: '+this.snapshot.values.TRANSFERENCIA_ACTIVA;this.$('payment-fees').textContent=FEES.map(k=>k+': '+(this.snapshot.values[k]||'Sin definir')).join(' · ');}
    async load(confirm=false){
      if(!this.source||this.busy)return;
      if(confirm&&this.snapshot){const accept=await this.review('Actualizar configuración de pagos','Se volverán a leer los datos guardados en esta mesa. Los cambios que aún no guardaste en este formulario se reemplazarán.',[],'Actualizar pagos');if(!accept)return;}
      this.setBusy(true);this.message('Leyendo configuración de pagos…');
      try{this.snapshot=await this.client.paymentState(this.source.id);this.fill();this.message(FLAGS.every(k=>this.snapshot.values[k]==='NO')?'Datos cargados. Puedes preparar los destinatarios; la conexión con los proveedores y la activación siguen pendientes.':'Esta mesa tiene medios activos. Los datos se muestran solo para consulta; Rodrigo debe revisar su operación antes de cambiar destinatarios.');}
      catch(error){this.snapshot=null;this.$('payment-form').reset();this.message(error.message,true);}finally{this.setBusy(false);}
    }
    async save(){
      if(!this.snapshot||this.busy||!this.snapshot.canEdit)return;
      this.setBusy(true);
      try{
        const input=Object.fromEntries(FIELDS.map(([k])=>[k,this.$('payment-'+k).value]));
        const changes=plan(this.snapshot,input);if(!changes.length){this.message('No hay cambios para guardar.');return;}
        const mask=(k,v)=>/CLABE|CUENTA/.test(k)&&v?'•••• '+v.slice(-4):v;
        const accepted=await this.review('Guardar datos de cobro','Mesa: '+this.source.title+'. Se actualizarán solo los campos indicados en CONFIG. Los tres medios permanecen en NO. Guardar un ID de Stripe no conecta ni verifica una cuenta.',changes.map(c=>({...c,key:c.label,before:mask(c.key,c.before),after:mask(c.key,c.after)})),'Guardar datos de cobro');if(!accepted)return;
        this.snapshot=await this.client.savePayments(this.snapshot,input);this.fill();this.message('Datos de cobro guardados y verificados en Sheets. Conexión de Stripe, comisiones, pruebas y activación pendientes.');
      }catch(error){this.message(error.message,true);}finally{this.setBusy(false);}
    }
  }
  return {FIELDS,FLAGS,FEES,KEYS,parse,validate,plan,Editor};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=MesaPayments;
