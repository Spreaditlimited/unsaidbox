import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import { validBlogAssetId } from "../lib/blog-cloudinary.mjs";
const bytes=Buffer.from("RIFF0000WEBPtest");
async function fixture({failUpload=false,failRead=false}={}){
  const calls=[];
  const sdk={config(){},uploader:{upload_stream(options,done){calls.push(options);return {end(){done(failUpload?Error("secret provider details"):null,{public_id:options.public_id,format:"webp",type:"authenticated",secure_url:"https://res.cloudinary.com/example/image/authenticated/asset.webp"});}};}},utils:{private_download_url(id,format,options){calls.push({id,format,...options});return "https://api.cloudinary.com/signed-test-only";}}};
  const exports={};
  const source=await readFile("lib/blog-cloudinary.mjs","utf8");
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports,require:n=>{assert.equal(n,"cloudinary");return {v2:sdk};},process:{env:{UNSAIDBOX_CLOUDINARY_CLOUD_NAME:"example",UNSAIDBOX_CLOUDINARY_API_KEY:"test",UNSAIDBOX_CLOUDINARY_API_SECRET:"test"}},Buffer,AbortSignal,fetch:async(url,opts)=>{calls.push({url,opts});return failRead?new Response(null,{status:500}):new Response(bytes);},Date});
  return {...exports,calls};
}
test("Cloudinary asset IDs are isolated to UnsaidBox blog covers",()=>{
  assert.ok(validBlogAssetId(`unsaidbox/blog/post1/${"a".repeat(32)}`));
  for(const value of ["sureimports/blog/example","https://evil.test","unsaidbox/blog/../secret",null])assert.equal(validBlogAssetId(value),false);
});
test("uploads use authenticated storage, bounded bytes and no destructive overwrite",async()=>{
  const f=await fixture();
  const result=await f.uploadBlogCover(bytes,"post1","a".repeat(32));
  assert.equal(result.cloudinaryPublicId,`unsaidbox/blog/post1/${"a".repeat(32)}`);
  assert.equal(f.calls[0].type,"authenticated");assert.equal(f.calls[0].overwrite,false);
  await assert.rejects(f.uploadBlogCover(Buffer.alloc(700001),"post1","a".repeat(32)),/Invalid/);
  const bad=await fixture({failUpload:true});await assert.rejects(bad.uploadBlogCover(bytes,"post1","a".repeat(32)),/^Error: Cloudinary cover upload failed\.$/);
});
test("migrated cover delivery uses a short-lived server-side download without exposing its URL",async()=>{
  const f=await fixture();
  assert.deepEqual(await f.readBlogCover({cloudinaryPublicId:`unsaidbox/blog/post1/${"a".repeat(32)}`,image:bytes}),bytes);
  assert.equal(f.calls[0].type,"authenticated");assert.ok(f.calls[0].expires_at<=Date.now()/1000+60);
  assert.equal(f.calls[1].opts.cache,"no-store");assert.equal(f.calls[1].opts.redirect,"error");
  const bad=await fixture({failRead:true});await assert.rejects(bad.readBlogCover({cloudinaryPublicId:`unsaidbox/blog/post1/${"a".repeat(32)}`,image:bytes}),/temporarily unavailable/);
});
test("legacy bytes remain readable only for records not migrated",async()=>{
  const f=await fixture();assert.deepEqual(await f.readBlogCover({image:bytes}),bytes);assert.equal(f.calls.length,0);
});
test("publication and administrator checks precede Cloudinary access",async()=>{
  for(const [file,allowed] of [["app/blog/media/[id]/route.ts",false],["app/admin/blog/[id]/image/route.ts",false]]){
    let reads=0;const exports={};
    const source=await readFile(file,"utf8");
    const modules={"@/lib/db":{db:()=>({blogImage:{findFirst:async()=>null,findUnique:async()=>{throw Error("must authenticate first");}}})},"@/lib/blog-policy.mjs":{publicBlogWhere:()=>({published:true,publishAt:{lte:new Date()}})},"@/lib/blog-cloudinary.mjs":{readBlogCover:async()=>{reads++;return bytes;}},"@/lib/admin-auth":{currentAdministrator:async()=>allowed},"next/cache":{},"@/lib/auth":{},"@/lib/captcha.mjs":{},"@/lib/security.mjs":{},"@/lib/blog-image":{}};
    vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>modules[n],Response,Uint8Array});
    const response=await exports.GET(new Request("https://unsaidbox.com/test"),{params:Promise.resolve({id:"post1"})});
    assert.equal(response.status,file.startsWith("app/admin")?401:404);assert.equal(reads,0);
  }
});
