// Synthetic data only. Never reads customer records or prints signed URLs.
import {v2 as cloudinary} from 'cloudinary';
import {randomBytes} from 'node:crypto';
const cloud_name=process.env.UNSAIDBOX_CLOUDINARY_CLOUD_NAME;
const api_key=process.env.UNSAIDBOX_CLOUDINARY_API_KEY;
const api_secret=process.env.UNSAIDBOX_CLOUDINARY_API_SECRET;
if(!cloud_name||!api_key||!api_secret)throw new Error('Export storage configuration missing.');
cloudinary.config({cloud_name,api_key,api_secret,secure:true});
const key=`unsaidbox/exports/verification/${randomBytes(16).toString('hex')}.csv`;
const bytes=Buffer.from('\uFEFF"Record","Response"\r\n"synthetic","Storage verification only"\r\n');
let attempted=false;
try{
  attempted=true;
  const uploaded=await new Promise((resolve,reject)=>cloudinary.uploader.upload_stream({public_id:key,resource_type:'raw',type:'authenticated',overwrite:false,timeout:30000},(e,r)=>e?reject(new Error('Synthetic upload failed.')):resolve(r)).end(bytes));
  if(uploaded.public_id!==key||uploaded.type!=='authenticated')throw new Error('Unexpected storage response.');
  // Upload responses may already contain signed delivery URLs. Construct an
  // explicitly unsigned URL instead of treating secure_url as unsigned.
  const unsignedUrl=cloudinary.url(key,{resource_type:'raw',type:'authenticated',secure:true,sign_url:false});
  const unsigned=await fetch(unsignedUrl,{redirect:'error',signal:AbortSignal.timeout(15000)});
  if(unsigned.ok)throw new Error('SECURITY FAILURE: unsigned asset is accessible.');
  const signed=cloudinary.utils.private_download_url(key,'csv',{resource_type:'raw',type:'authenticated',expires_at:Math.floor(Date.now()/1000)+60,attachment:false});
  const response=await fetch(signed,{redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`Signed private download failed: HTTP ${response.status}.`);
  if(!Buffer.from(await response.arrayBuffer()).equals(bytes))throw new Error('Download bytes differ.');
  console.log('PASS: unsigned access denied; authenticated CSV download matches synthetic input.');
}finally{
  if(attempted){const removed=await cloudinary.uploader.destroy(key,{resource_type:'raw',type:'authenticated',invalidate:true});if(!['ok','not found'].includes(removed.result))throw new Error('Synthetic test asset cleanup failed.');console.log('Synthetic test asset removed.');}
}
