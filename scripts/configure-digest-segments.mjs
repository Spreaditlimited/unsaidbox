import {brevo} from '../lib/brevo.mjs';
import {digestStageAttribute,verifyDigestAttribute} from '../lib/marketing-segments.mjs';
try{
 const current=await brevo('contacts/attributes');
 const existing=current?.attributes?.find(a=>a.name===digestStageAttribute);
 if(!existing)await brevo('contacts/attributes/normal/'+digestStageAttribute,'POST',{type:'text'});
 await verifyDigestAttribute(brevo);
 console.log('Dedicated UnsaidBox audience-stage attribute verified; no contacts enrolled.');
}catch{console.error('DIGEST_SEGMENT_CONFIG_FAILED');process.exitCode=1;}
