const assert=require('node:assert/strict');
const S=require('../js/mesa-viajera-sheets.js');
const id='image-file-identifier-0000001';
const link='https://drive.google.com/file/d/'+id+'/view';
const preview='https://drive.google.com/thumbnail?id='+id+'&sz=w1600';
for(const value of [link,link+'?usp=sharing','https://drive.google.com/open?id='+id,'https://drive.google.com/uc?export=view&id='+id,preview]){
 assert.equal(S.driveImage(value).id,id);assert.equal(S.safeImage(value),preview);
}
assert.equal(S.driveImage(link+'?resourcekey=abc_123').link,link+'?resourcekey=abc_123');
assert.equal(S.safeImage(link+'?resourcekey=abc_123'),preview+'&resourcekey=abc_123');
for(const value of ['https://drive.google.com/drive/folders/'+id,'https://drive.google.com/file/d/no/view','https://drive.google.com/?id='+id,'https://drive.google.com.evil.test/file/d/'+id+'/view','http://drive.google.com/file/d/'+id+'/view'])assert.equal(S.driveImage(value),null);
assert.equal(S.safeImage('https://drive.google.com/drive/folders/'+id),'');
assert.equal(S.safeImage(link+'?access_token=should-never-persist'),preview);
const settings={clientId:'example.apps.googleusercontent.com',pickerApiKey:'test-key',projectNumber:'1234',allowedSpreadsheetIds:['development-sheet-identifier-0001']};
let permissions=[{type:'anyone',role:'reader'}],mime='image/png',trashed=false,calls=[],failure=0;
const client=new S.Client(settings,async(url,options)=>{
 calls.push({url,options});assert.equal(options.method,undefined);assert(!url.includes('access_token'));assert.equal(options.credentials,'omit');
 if(failure)return {ok:false,status:failure};
 return {ok:true,status:200,json:async()=>({id,name:'Foto de prueba.png',mimeType:mime,trashed,resourceKey:'abc_123',permissions})};
});
client.acceptToken({access_token:'fixture-not-a-real-token',expires_in:3600},true);
(async()=>{
 const file=await client.drivePhoto(link);assert.equal(file.name,'Foto de prueba.png');assert.equal(file.link,link+'?resourcekey=abc_123');
 for(const code of [403,404]){failure=code;await assert.rejects(client.drivePhoto(link),/Seleccionar foto de Drive/);}
 failure=404;await assert.rejects(client.read(settings.allowedSpreadsheetIds[0]),e=>e.status===404&&/cuenta/.test(e.message));failure=0;
 await client.drivePhoto(link+'?resourcekey=abc_123');assert.equal(calls.at(-1).options.headers['X-Goog-Drive-Resource-Keys'],id+'/abc_123');
 assert(calls.at(-1).options.headers.Authorization.startsWith('Bearer '));
 for(const p of [undefined,[],[{type:'user',role:'owner'}],[{type:'domain',role:'reader'}],[{type:'anyone',role:'reader',deleted:true}],[{type:'anyone',role:'reader',expirationTime:'2000-01-01T00:00:00Z'}]]){
  permissions=p;await assert.rejects(client.drivePhoto(link),/No se confirmó acceso/);
 }
 permissions=[{type:'anyone',role:'reader'}];mime='application/pdf';await assert.rejects(client.drivePhoto(link),/JPG, PNG o WebP/);mime='image/png';trashed=true;await assert.rejects(client.drivePhoto(link),/papelera/);trashed=false;
 const count=calls.length;await assert.rejects(client.drivePhoto('https://drive.google.com/drive/folders/'+id),/archivo de imagen/);assert.equal(calls.length,count);
 // Picker: un archivo, filtro de imágenes, cancelación y ausencia de escrituras.
 global.location={origin:'https://proyectoeva.mx'};let callback,pickData,selectedView;
 class View{constructor(){selectedView=this}setMimeTypes(v){this.mimes=v;return this}setMode(){return this}setIncludeFolders(){return this}setSelectFolderEnabled(){return this}}
 class Picker{addView(){return this}setOAuthToken(){return this}setDeveloperKey(){return this}setAppId(){return this}setOrigin(){return this}setLocale(){return this}setTitle(){return this}setCallback(v){callback=v;return this}build(){return this}setVisible(){callback(pickData)}}
 global.google={picker:{DocsView:View,PickerBuilder:Picker,ViewId:{DOCS:'docs'},DocsViewMode:{LIST:'list'},Action:{CANCEL:'cancel',PICKED:'picked'}}};
 pickData={action:'cancel'};assert.equal(await client.chooseImage(),null);
 pickData={action:'picked',docs:[{id}]};const picked=await client.chooseImage();assert.equal(picked.id,id);assert.equal(selectedView.mimes,'image/jpeg,image/png,image/webp');
 permissions=[];await assert.rejects(client.chooseImage(),/No se confirmó acceso/);
 client.clearSession();await assert.rejects(client.chooseImage(),/sesión venció/);
 console.log('OK: enlaces Drive, claves de recurso, selector, cancelación, foto pública/privada, MIME, papelera y solo lecturas de Drive. API y Picker simulados.');
})().catch(e=>{console.error(e);process.exit(1)});
