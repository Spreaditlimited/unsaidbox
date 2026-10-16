import 'server-only';
import { v2 as cloudinary } from 'cloudinary';

function storage() {
  const cloud_name=process.env.UNSAIDBOX_CLOUDINARY_CLOUD_NAME;
  const api_key=process.env.UNSAIDBOX_CLOUDINARY_API_KEY;
  const api_secret=process.env.UNSAIDBOX_CLOUDINARY_API_SECRET;
  if(!cloud_name||!api_key||!api_secret)throw new Error('EXPORT_STORAGE_UNAVAILABLE');
  cloudinary.config({cloud_name,api_key,api_secret,secure:true});
  return cloudinary;
}
function valid(key:string){if(!/^unsaidbox\/exports\/[a-zA-Z0-9]{1,30}\/[a-f0-9]{32}\.csv$/.test(key))throw new Error('EXPORT_STORAGE_REFERENCE');}
export async function storeExport(key:string,bytes:Buffer){
  valid(key);
  if(bytes.length>25*1024*1024)throw new Error('EXPORT_TOO_LARGE');
  await new Promise<void>((resolve,reject)=>{
    storage().uploader.upload_stream({public_id:key,resource_type:'raw',type:'authenticated',overwrite:false,timeout:60000},(error,result)=>{
      if(error||result?.public_id!==key||result?.type!=='authenticated')reject(new Error('EXPORT_STORAGE_FAILED'));else resolve();
    }).end(bytes);
  });
}
export async function removeExport(key:string){
  valid(key);
  const result=await storage().uploader.destroy(key,{resource_type:'raw',type:'authenticated',invalidate:true});
  if(!['ok','not found'].includes(result.result))throw new Error('EXPORT_CLEANUP_FAILED');
}
export async function readExport(key:string){
  valid(key);
  const url=storage().utils.private_download_url(key,'csv',{resource_type:'raw',type:'authenticated',expires_at:Math.floor(Date.now()/1000)+60,attachment:false});
  const response=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)});
  if(!response.ok||!response.body)throw new Error('EXPORT_DOWNLOAD_FAILED');
  return response;
}
