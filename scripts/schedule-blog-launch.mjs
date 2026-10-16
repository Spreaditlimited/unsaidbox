import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import sharp from "sharp";
import nextEnv from "@next/env";
import { remainingArticles } from "../docs/blog-remaining-content.mjs";
import { launchArticles } from "../docs/blog-launch-content.mjs";
import { cleanBlogHtml, blogText, validatePublication } from "../lib/blog-policy.mjs";
import { scheduledInstant, publicationLabel } from "../lib/blog-time.mjs";
import { runtimeDatabaseUrl } from "../lib/runtime-database-url.mjs";
import { uploadBlogCover, readBlogCover } from "../lib/blog-cloudinary.mjs";

const root=resolve(import.meta.dirname,"..");
nextEnv.loadEnvConfig(root,true,{info(){},error(){}});
const require=createRequire(import.meta.url);
const {PrismaClient}=require("../generated/prisma");
if(new URL(process.env.UNSAIDBOX_DATABASE_URL).pathname!=="/unsaidbox")throw Error("Only the dedicated unsaidbox database is permitted.");
const db=new PrismaClient({datasources:{db:{url:runtimeDatabaseUrl(process.env.UNSAIDBOX_DATABASE_URL)}}});
const confirm=process.argv.includes("--confirm-schedule");
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
const manifest=JSON.parse(await readFile(resolve(root,"docs/blog-cover-manifest.json"),"utf8"));
const schedule=[launchArticles[2],...remainingArticles].map((article,index)=>({slug:article.slug,date:`2026-10-${String(8+index).padStart(2,"0")}`,time:"09:00",timezone:"Europe/London"}));
try {
  const current=await db.blogPost.findMany({include:{image:true}});
  if(current.some(p=>![...launchArticles,...remainingArticles].some(a=>a.slug===p.slug)))throw Error("Unexpected blog entries: review before release.");
  if(remainingArticles.length!==12||manifest.length!==12)throw Error("Expected twelve new articles and covers.");
  for(const original of launchArticles)if(!current.some(p=>p.slug===original.slug&&p.image))throw Error("An existing launch article or cover is missing.");
  const prepared=[];
  for(let i=0;i<remainingArticles.length;i++) {
    const article=remainingArticles[i];
    const post={...article,contentHtml:cleanBlogHtml(article.contentHtml.trim()),authorName:"UnsaidBox Editorial"};
    validatePublication(post);
    if(blogText(post.contentHtml).split(/\s+/).length<700)throw Error(`Article needs more editorial depth: ${post.slug}`);
    const previous=current.find(p=>p.slug===post.slug);
    const item=schedule[i+1];
    const publishAt=scheduledInstant(item.date,item.time,item.timezone);
    if(publishAt<=new Date())throw Error("Release dates have passed; review the manifest instead of backdating.");
    if(previous&&(previous.contentHtml!==post.contentHtml||!previous.published||previous.publishAt?.getTime()!==publishAt.getTime()))throw Error(`Existing article differs; refusing to overwrite: ${post.slug}`);
    const bytes=await sharp(manifest[i].source,{limitInputPixels:25_000_000}).rotate().resize(1600,900,{fit:"cover"}).webp({quality:80}).toBuffer();
    if(bytes.length>700_000)throw Error("Cover too large.");
    const id=previous?.id||`blg${hash(post.slug).slice(0,26)}`;
    prepared.push({post,id,version:previous?.image?.version||hash(bytes).slice(0,32),bytes,publishAt,previous,output:manifest[i].output});
  }
  console.log(JSON.stringify({mode:confirm?"confirmed-editorial-release":"dry-run",existing:current.length,newArticles:prepared.filter(p=>!p.previous).length,queue:schedule.map(s=>({...s,publishAt:scheduledInstant(s.date,s.time,s.timezone).toISOString()})),words:prepared.map(p=>({slug:p.post.slug,words:blogText(p.post.contentHtml).split(/\s+/).length}))},null,2));
  if(confirm){
    const covers=[];
    for(const original of launchArticles){const p=current.find(p=>p.slug===original.slug);covers.push({id:p.id,version:p.image.version,bytes:Buffer.from(p.image.image),previous:p.image});}
    for(const p of prepared){await mkdir(dirname(resolve(root,p.output)),{recursive:true});await writeFile(resolve(root,p.output),p.bytes);covers.push({id:p.id,version:p.version,bytes:p.bytes,previous:p.previous?.image});}
    for(const cover of covers){
      cover.reference=cover.previous?.cloudinaryPublicId?{cloudinaryPublicId:cover.previous.cloudinaryPublicId,cloudinaryUrl:cover.previous.cloudinaryUrl}:await uploadBlogCover(cover.bytes,cover.id,cover.version);
      const fetched=await readBlogCover({...cover.reference,image:cover.bytes});
      if(hash(fetched)!==hash(cover.bytes))throw Error("Cloudinary round-trip mismatch; no publication changes applied.");
      console.log(`Cloudinary verified: ${cover.id}`);
    }
    await db.$transaction(async tx=>{
      for(const old of current){
        const fresh=await tx.blogPost.findUnique({where:{id:old.id},include:{image:true}});
        if(!fresh||fresh.revision!==old.revision||fresh.updatedAt.getTime()!==old.updatedAt.getTime()||fresh.image?.version!==old.image?.version)throw Error("Concurrent editorial change: publication aborted.");
      }
      for(const original of launchArticles){
        const old=current.find(p=>p.slug===original.slug),cover=covers.find(c=>c.id===old.id);
        await tx.blogImage.update({where:{postId:old.id},data:cover.reference});
        if(original.slug===schedule[0].slug){
          if(!old.published||old.publishAt<=new Date())throw Error("Course guide is no longer scheduled; review required.");
          const publishAt=scheduledInstant(schedule[0].date,schedule[0].time);
          if(old.publishAt.getTime()!==publishAt.getTime()){
            const result=await tx.blogPost.updateMany({where:{id:old.id,revision:old.revision},data:{publishAt,published:true,revision:{increment:1}}});
            if(result.count!==1)throw Error("Concurrent schedule update.");
            await tx.auditEvent.create({data:{actorId:"system:editorial-release",action:"blog:schedule",targetId:old.id}});
          }
        }
      }
      for(const p of prepared){
        if(p.previous)continue;
        const reference=covers.find(c=>c.id===p.id).reference;
        await tx.blogPost.create({data:{...p.post,id:p.id,published:true,publishAt:p.publishAt,image:{create:{image:p.bytes,version:p.version,...reference}}}});
        await tx.blogSlug.create({data:{slug:p.post.slug,postId:p.id}});
        await tx.auditEvent.create({data:{actorId:"system:editorial-release",action:"blog:schedule",targetId:p.id}});
      }
    },{timeout:20000});
    const saved=await db.blogPost.findMany({orderBy:{publishAt:"asc"},select:{id:true,slug:true,title:true,published:true,publishAt:true,image:{select:{version:true,cloudinaryPublicId:true}}}});
    const report={verifiedAt:new Date().toISOString(),timezone:"Europe/London",posts:saved.map(p=>({...p,ukTime:publicationLabel(p.publishAt)}))};
    await writeFile(resolve(root,"docs/blog-release-20261007.json"),JSON.stringify(report,null,2)+"\n");
    console.log(`Saved and verified ${saved.length} total posts; ${saved.filter(p=>p.publishAt>new Date()).length} scheduled. Existing published articles preserved.`);
  }
} catch(error){console.error(`Editorial release stopped: ${error.message}`);process.exitCode=1;}
finally{await db.$disconnect();}
