'use strict';
const MesaCatalog = (() => {
  const aliases={id:['ID','IDEXPERIENCIA','EXPERIENCIAID'],name:['NOMBRE','TITULO','NOMBREEXPERIENCIA','EXPERIENCIA'],description:['DESCRIPCION','DESCRIPCIONEXPERIENCIA','DESCRIPCIONCORTA','DETALLE','DETALLES'],image:['IMAGEN','IMAGENURL','URLIMAGEN','FOTO','FOTOURL','URLFOTO','IMAGEURL'],price:['PRECIO','PRECIOMXN','PRECIOSUGERIDO','MONTO','IMPORTE'],state:['ESTADO'],currency:['MONEDA']};
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const columnName=n=>String.fromCharCode(65+n);
  function parse(rows,gridRows=1000) {
    if(!Array.isArray(rows)||!rows[0]?.length)throw Error('La pestaña EXPERIENCIAS no tiene encabezados. Rodrigo debe revisar su estructura.');
    if(gridRows>1000||rows[0].length>26)throw Error('El catálogo supera el tamaño admitido por este piloto. Rodrigo debe revisar la estructura antes de editar.');
    const headers=rows[0].map(String),normalized=headers.map(normalize),columns={};
    for(const [key,names]of Object.entries(aliases)){
      const found=normalized.map((v,i)=>names.includes(v)?i:-1).filter(i=>i>=0);
      if(found.length>1)throw Error('Hay más de una columna posible para '+key+'. Encabezados: '+headers.join(', '));
      if(!found.length&&['id','name','image'].includes(key))throw Error('No se identificó la columna '+key+'. Encabezados: '+headers.join(', ')+'. Rodrigo debe revisar el mapeo.');
      columns[key]=found[0]??null;
    }
    const seen=new Set(),items=[];
    rows.slice(1).forEach((row,index)=>{
      const id=String(row[columns.id]??'').trim();if(!id)return;
      if(id.startsWith('=')||seen.has(id))throw Error('El catálogo tiene IDs duplicados o calculados. No se habilitará la edición.');
      seen.add(id);
      const get=key=>columns[key]===null?'':String(row[columns[key]]??'');
      const price=get('price');
      items.push({id,name:get('name'),description:get('description'),image:get('image'),price:price.startsWith('=')?'Calculado en Sheets':price,state:get('state'),currency:get('currency'),row:index+2});
    });
    return {headers,columns,items,rows,gridRows,signature:JSON.stringify(rows)};
  }
  function plan(snapshot,input,imageValidator) {
    if(!input||typeof input.id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(input.id))throw Error('El ID debe contener solo letras, números, guion o guion bajo.');
    for(const[key,max]of [['name',200],['description',3000],['image',2048]])if(typeof input[key]!=='string'||input[key].length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(input[key]))throw Error('Revisa el campo '+key+'.');
    if(!input.name.trim())throw Error('Escribe el nombre de la experiencia.');
    if(!imageValidator(input.image.trim()))throw Error('Añade una URL de imagen HTTPS válida para esta experiencia.');
    const existing=snapshot.items.find(i=>i.id===input.id);
    if(input.isNew&&existing)throw Error('Ese ID ya existe. Vuelve a cargar el catálogo.');
    if(!input.isNew&&!existing)throw Error('La experiencia ya no está en la hoja. Actualiza el catálogo.');
    if(input.isNew && snapshot.columns.state===null)throw Error('Falta la columna ESTADO para crear la experiencia como BORRADOR. Rodrigo debe revisar la hoja.');
    let row=existing?.row;
    if(!row){let last=1;snapshot.rows.forEach((r,i)=>{if(r.some(v=>v!==''&&v!==null&&v!==undefined))last=i+1});row=last+1;}
    if(row>snapshot.gridRows||row>1000)throw Error('No hay una fila libre dentro del catálogo admitido. Rodrigo debe ampliar o revisar la hoja.');
    const changes=[];
    for(const key of ['id','name','description','image']){
      const col=snapshot.columns[key];
      if(col===null){if(input[key])throw Error('La hoja no tiene una columna de descripción compatible. No se guardó nada.');continue;}
      if(key==='id'&&existing)continue;
      const before=String(snapshot.rows[row-1]?.[col]??'');
      if(before.startsWith('='))throw Error('El campo '+key+' contiene una fórmula. Rodrigo debe revisarlo; el panel no la reemplazará.');
      const after=key==='id'?input.id:input[key].trim();
      if(before!==after)changes.push({key,before,after,range:"'EXPERIENCIAS'!"+columnName(col)+row,values:[[after]]});
    }
    if(input.isNew){const col=snapshot.columns.state;changes.push({key:'state',before:'',after:'BORRADOR',range:"'EXPERIENCIAS'!"+columnName(col)+row,values:[['BORRADOR']]});}
    return {id:input.id,row,changes};
  }
  class Editor {
    constructor({client,onBusy,onUpdated,review}){
      this.client=client;this.onBusy=onBusy;this.onUpdated=onUpdated;this.review=review;this.source=null;this.snapshot=null;this.busy=false;this.item=null;
      this.$=id=>document.getElementById(id);
      this.$('catalog-refresh').addEventListener('click',()=>this.load());
      this.$('catalog-add').addEventListener('click',()=>this.edit(null));
      this.$('catalog-search').addEventListener('input',()=>this.render());
      this.$('experience-form').addEventListener('submit',e=>{e.preventDefault();void this.save();});
      this.$('experience-close').addEventListener('click',()=>{if(!this.busy)this.$('experience-dialog').close()});
      this.$('experience-dialog').addEventListener('cancel',e=>{if(this.busy)e.preventDefault()});
      this.$('experience-image').addEventListener('input',()=>this.photo());
      this.$('experience-image-preview').addEventListener('error',()=>{this.$('experience-image-preview').hidden=true;this.$('experience-image-state').textContent='La imagen no cargó. Usa un enlace directo a una imagen disponible.';this.photoLoaded=false;});
      this.$('experience-image-preview').addEventListener('load',()=>{this.photoLoaded=true;this.$('experience-image-state').textContent='Imagen cargada. Comprueba que corresponda a esta experiencia.';});
      this.clear();
    }
    clear(){this.source=null;this.snapshot=null;this.item=null;this.$('catalog-current').textContent='Abre una mesa para ver sus experiencias.';this.message('Selecciona Abrir mesa en el menú.');this.render();}
    setSource(source){if(this.source?.id!==source.id)this.snapshot=null;this.source=source;this.$('catalog-current').textContent=source.title;this.render();}
    message(text,error=false){this.$('catalog-status').textContent=text;this.$('catalog-status').classList.toggle('error',error);}
    setBusy(value){this.busy=value;this.onBusy(value);this.$('experience-save').disabled=value;this.$('experience-close').disabled=value;this.$('experience-fields').disabled=value;this.render();}
    async load(){
      if(!this.source||this.busy)return;
      this.setBusy(true);this.message('Leyendo experiencias…');
      try{this.snapshot=await this.client.catalogState(this.source.id);this.onUpdated(this.snapshot.items);this.message('Catálogo cargado. Precios solo para consulta; no se modifican desde esta sección.');}
      catch(e){this.snapshot=null;this.message(e.message,true);}finally{this.setBusy(false)}
    }
    render(){
      this.$('catalog-refresh').disabled=!this.source||this.busy;
      this.$('catalog-add').disabled=!this.snapshot||!this.snapshot.canEdit||this.busy;
      this.$('catalog-search').disabled=!this.snapshot||this.busy;
      const list=this.$('catalog-list');list.replaceChildren();
      const items=this.snapshot?.items||[],filter=this.$('catalog-search').value.trim().toLocaleLowerCase('es');
      this.$('catalog-count').textContent=this.snapshot?items.length+' experiencias en esta mesa':'Sin catálogo cargado';
      const shown=items.filter(i=>(i.name+' '+i.id).toLocaleLowerCase('es').includes(filter));
      if(!shown.length){const p=document.createElement('p');p.className='catalog-empty';p.textContent=this.snapshot?(items.length?'No hay coincidencias.':'Todavía no hay experiencias. Agrega la primera para preparar el catálogo.'):'Abre una mesa y entra a Experiencias para cargar su catálogo.';list.append(p);}
      for(const item of shown){
        const card=document.createElement('article');card.className='experience-row';
        const image=document.createElement('img');const url=MesaSheets.safeImage(item.image);image.alt='Foto de '+item.name;image.loading='lazy';image.hidden=!url;if(url)image.src=url;
        const badge=document.createElement('span');badge.className='photo-badge';badge.textContent=url?'Foto vinculada':'Falta foto';
        image.addEventListener('error',()=>{image.hidden=true;badge.textContent='Revisar foto'});
        const info=document.createElement('div'),name=document.createElement('strong'),id=document.createElement('small'),price=document.createElement('small');
        name.textContent=item.name||'Sin nombre';id.textContent='ID: '+item.id;price.textContent=item.price?'Precio en hoja: '+item.price+(item.currency?' '+item.currency:''):'Precio pendiente de Rodrigo';const state=document.createElement('small');state.textContent='Estado en hoja: '+(item.state||'Sin configurar');info.append(name,id,price,state,badge);
        const button=document.createElement('button');button.className='secondary';button.type='button';button.textContent=this.snapshot.canEdit?'Editar':'Ver';button.disabled=this.busy;button.addEventListener('click',()=>this.edit(item));card.append(image,info,button);list.append(card);
      }
    }
    edit(item){
      if(!this.snapshot||this.busy)return;
      this.item={id:item?.id||'EXP-'+Array.from(crypto.getRandomValues(new Uint8Array(8)),v=>v.toString(16).padStart(2,'0')).join(''),isNew:!item};
      this.$('experience-dialog-title').textContent=item?'Editar experiencia':'Nueva experiencia';
      this.$('experience-id').textContent=this.item.id;
      this.$('experience-name').value=item?.name||'';this.$('experience-description').value=item?.description||'';this.$('experience-image').value=item?.image||'';
      this.$('experience-description').disabled=this.snapshot.columns.description===null;
      this.$('experience-description-note').textContent=this.snapshot.columns.description===null?'No se identificó una columna de descripción; este campo queda sin editar.':'Texto que acompaña a esta experiencia.';
      this.$('experience-price').textContent=item?.price ? item.price+(item.currency?' '+item.currency:'') : 'Pendiente de configuración por Rodrigo';
      this.$('experience-save').hidden=!this.snapshot.canEdit;this.$('experience-fields').disabled=!this.snapshot.canEdit;
      this.$('experience-save-state').textContent='';this.photo();this.$('experience-dialog').showModal();
    }
    photo(){
      const url=MesaSheets.safeImage(this.$('experience-image').value.trim()),img=this.$('experience-image-preview');this.photoLoaded=false;img.hidden=!url;
      this.$('experience-image-state').textContent=url?'Cargando imagen…':'Pega una URL HTTPS directa. Un enlace a la página de Drive puede no funcionar como imagen.';
      if(url)img.src=url;else img.removeAttribute('src');
    }
    async save(){
      if(this.busy||!this.snapshot||!this.item||!this.snapshot.canEdit)return;
      const input={...this.item,name:this.$('experience-name').value,description:this.$('experience-description').value,image:this.$('experience-image').value};
      this.setBusy(true);
      try{
        const plan=MesaCatalog.plan(this.snapshot,input,MesaSheets.safeImage);
        if(!this.photoLoaded)throw Error('Espera a que cargue la foto o corrige el enlace antes de guardar.');
        if(!plan.changes.length){this.$('experience-save-state').textContent='No hay cambios para guardar.';return;}
        const accepted=await this.review('Guardar experiencia','Mesa: '+this.source.title+'. Solo se guardan ID nuevo, nombre, descripción y foto; las altas quedan en BORRADOR. Precio, pagos y movimientos conservan sus valores.',plan.changes.map(change=>({...change,key:({id:'ID permanente',name:'Nombre',description:'Descripción',image:'Foto',state:'Estado'})[change.key]})),'Guardar experiencia');
        if(!accepted)return;
        this.snapshot=await this.client.saveExperience(this.snapshot,input);
        this.onUpdated(this.snapshot.items);this.$('experience-dialog').close();this.message('Experiencia guardada y verificada en Sheets. Requiere revisión de Rodrigo antes de habilitar su venta.');
      }catch(e){this.$('experience-save-state').textContent=e.message;}finally{this.setBusy(false)}
    }
  }
  return {parse,plan,Editor};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=MesaCatalog;
