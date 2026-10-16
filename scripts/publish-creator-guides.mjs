import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=process.env.UNSAIDBOX_EDITORIAL_ROOT||'/Users/tochukwunkwocha/projects/unsaidbox';
const require=createRequire(root+'/package.json');
require('@next/env').loadEnvConfig(root,true,{info(){},error(){}});
const {creatorGuides}=await import(root+'/docs/blog-creator-guides-20261009.mjs');
const {cleanBlogHtml,blogText,readBlogForm,validatePublication}=await import(root+'/lib/blog-policy.mjs');
const {runtimeDatabaseUrl}=await import(root+'/lib/runtime-database-url.mjs');
const {uploadBlogCover,readBlogCover}=await import(root+'/lib/blog-cloudinary.mjs');
const {PrismaClient}=require('./generated/prisma');const sharp=require('sharp');
const hash=x=>createHash('sha256').update(x).digest('hex');
if(new URL(process.env.UNSAIDBOX_DATABASE_URL).pathname!=='/unsaidbox')throw Error('Wrong database');
const db=new PrismaClient({datasources:{db:{url:runtimeDatabaseUrl(process.env.UNSAIDBOX_DATABASE_URL,{VERCEL:'1'},root)}}});
const confirm=process.argv.includes('--publish-now');
const manifest=JSON.parse(await readFile(root+'/docs/blog-creator-covers-20261009.json','utf8'));
const snapshot=p=>({id:p.id,slug:p.slug,revision:p.revision,published:p.published,publishAt:p.publishAt,updatedAt:p.updatedAt,contentHash:hash(p.contentHtml),imageVersion:p.image?.version,cloudinaryPublicId:p.image?.cloudinaryPublicId});
try{
 const before=await db.blogPost.findMany({include:{image:{select:{version:true,cloudinaryPublicId:true}}}});
 const prepared=[];
 for(const article of creatorGuides){
  const {cover,...fields}=article;const contentHtml=cleanBlogHtml(fields.contentHtml.trim());
  const form=new FormData();for(const[k,v]of Object.entries({...fields,contentHtml,authorName:'UnsaidBox Editorial'}))form.set(k,v);
  const post=readBlogForm(form);validatePublication(post);
  const words=blogText(contentHtml).split(/\s+/).length;
  if(words<1500||/<(?:script|iframe|img)\b|100% anonymous|guaranteed rankings|nkwochatochukwu@gmail/i.test(contentHtml))throw Error('Content validation failed');
  if(new Set(creatorGuides.map(x=>x.slug)).size!==5)throw Error('Expected five unique slugs');
  const item=manifest.find(x=>x.name===cover);if(!item)throw Error('Cover missing');
  const bytes=await sharp(item.source,{limitInputPixels:25_000_000}).rotate().resize(1600,900,{fit:'cover'}).webp({quality:84}).toBuffer();
  if(bytes.length>700000)throw Error('Cover too large');
  const id='blg'+hash(post.slug).slice(0,26),version=hash(bytes).slice(0,32);
  const existing=before.find(p=>p.slug===post.slug);
  if(existing&&(existing.id!==id||existing.contentHtml!==contentHtml||!existing.published||existing.publishAt>new Date()||existing.image?.version!==version||!existing.image?.cloudinaryPublicId))throw Error('Existing article differs; refusing overwrite');
  prepared.push({post,id,version,bytes,words,item,existing});
 }
 const hrefs=[...new Set(prepared.flatMap(p=>[...p.post.contentHtml.matchAll(/href="([^"#]+)"/g)].map(m=>m[1])))];
 for(const href of hrefs){
  if(href.startsWith('/blog/')&&!before.some(p=>'/blog/'+p.slug===href&&p.published&&p.publishAt<=new Date()))throw Error('Article links to unavailable article');
  if(!href.startsWith('/')&&!/^https:\/\/(www\.pewresearch\.org|teaching\.cornell\.edu)\//.test(href))throw Error('Unexpected external link');
 }
 console.log(JSON.stringify({mode:confirm?'publish-now':'dry-run',posts:prepared.map(p=>({slug:p.post.slug,words:p.words,coverBytes:p.bytes.length,existing:!!p.existing})),links:hrefs},null,2));
 if(!confirm)process.exitCode=0;
 else{
  const folder=resolve(root,'output/blog-creator-guides-20261009');await mkdir(folder,{recursive:true});
  await writeFile(resolve(folder,`before-${Date.now()}.json`),JSON.stringify(before.map(snapshot),null,2),{flag:'wx',mode:0o600});
  for(const p of prepared){
   await writeFile(resolve(root,p.item.output),p.bytes);
   if(p.existing)continue;
   p.reference=await uploadBlogCover(p.bytes,p.id,p.version);
   if(hash(await readBlogCover({...p.reference,image:p.bytes}))!==hash(p.bytes))throw Error('Cover round-trip verification failed');
   console.log('Cloudinary verified: '+p.post.slug);
  }
  const now=new Date();
  await db.$transaction(async tx=>{
   for(const p of prepared){if(p.existing)continue;
    if(await tx.blogSlug.findUnique({where:{slug:p.post.slug}}))throw Error('Slug reserved; refusing overwrite');
    await tx.blogPost.create({data:{...p.post,id:p.id,published:true,publishAt:now,image:{create:{image:p.bytes,version:p.version,...p.reference}},slugs:{create:{slug:p.post.slug}}}});
    await tx.auditEvent.create({data:{actorId:'system:creator-guides',action:'blog:publish',targetId:p.id}});
   }
  },{timeout:20000});
  const after=await db.blogPost.findMany({include:{image:{select:{version:true,cloudinaryPublicId:true}}}});
  for(const old of before){const fresh=after.find(p=>p.id===old.id);if(!fresh||JSON.stringify(snapshot(old))!==JSON.stringify(snapshot(fresh)))throw Error('Pre-existing post changed during release; inspect without rollback overwrite');}
  for(const p of prepared){const saved=after.find(x=>x.id===p.id);if(!saved||saved.contentHtml!==p.post.contentHtml||!saved.published||saved.publishAt>new Date()||saved.image?.version!==p.version||!saved.image?.cloudinaryPublicId)throw Error('Read-back verification failed');}
  const report={verifiedAt:new Date().toISOString(),previousPostsPreserved:before.length,newlyPublished:prepared.filter(p=>!p.existing).length,posts:prepared.map(p=>({slug:p.post.slug,url:'https://unsaidbox.com/blog/'+p.post.slug,words:p.words,...snapshot(after.find(x=>x.id===p.id))})),privacy:'No original responses, identities or private follow-up content published; examples are invented and labelled.'};
  await writeFile(resolve(root,'docs/blog-creator-release-20261009.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
 }
}catch(error){console.error('Editorial operation stopped ('+(error.code||error.name||'error')+'); no credentials printed.');process.exitCode=1;}finally{await db.$disconnect();}
