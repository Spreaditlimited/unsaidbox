import test from "node:test";
import assert from "node:assert/strict";
import { remainingArticles, revisedCourseArticle } from "../docs/blog-remaining-content.mjs";
import { launchArticles } from "../docs/blog-launch-content.mjs";
import { blogText, cleanBlogHtml, readBlogForm } from "../lib/blog-policy.mjs";
test("the launch has fifteen distinct articles with substantive content and complete metadata",()=>{
  const all=[...launchArticles,...remainingArticles];assert.equal(all.length,15);assert.equal(new Set(all.map(p=>p.slug)).size,15);
  for(const post of remainingArticles){
    assert.ok(blogText(post.contentHtml).split(/\s+/).length>=1500,post.slug);
    const form=new FormData();for(const [k,v]of Object.entries({...post,authorName:"UnsaidBox Editorial"}))form.set(k,v);
    assert.equal(readBlogForm(form).slug,post.slug);
    assert.ok(post.excerpt&&post.seoTitle&&post.seoDescription&&post.imageAlt);
    assert.equal((cleanBlogHtml(post.contentHtml).match(/<li>/g)||[]).length,(post.contentHtml.match(/<li>/g)||[]).length);
    assert.doesNotMatch(post.contentHtml,/href="\/dashboard|guaranteed engagement|100% anonymous|<script|<iframe/i);
    for(const [,href] of post.contentHtml.matchAll(/href="(\/blog\/[^"#]+)"/g)){const target=all.findIndex(p=>`/blog/${p.slug}`===href);assert.ok(target>=0&&target<all.indexOf(post),`${post.slug}: link must already be published: ${href}`);}
  }
});
test("all thirteen scheduled guides include worked examples and relevant product guidance", () => {
  for (const post of [revisedCourseArticle, ...remainingArticles]) {
    assert.ok(blogText(post.contentHtml).split(/\s+/).length >= 1500, post.slug);
    assert.match(post.contentHtml, /example/i);
    assert.match(post.contentHtml, /Pro/);
    assert.doesNotMatch(post.contentHtml, /(?:gives|offers|includes) unlimited responses|automatically posts to Facebook/i);
  }
});
test("numbered question-bank titles match the original prompt count",()=>{
  for(const [slug,count]of [["anonymous-questions-to-ask-your-followers",50],["open-ended-course-evaluation-questions",20],["training-feedback-questions-after-a-workshop",25],["questions-to-ask-followers-for-feedback",30],["relationship-questions-for-audience-qa",30]]){
    const p=remainingArticles.find(p=>p.slug===slug);const banks=[...p.contentHtml.matchAll(/<h2>(?:Ten|Five)[^<]*questions[^<]*<\/h2><ul>([\s\S]*?)<\/ul>/g)];
    assert.equal(banks.reduce((n,m)=>n+(m[1].match(/<li>/g)||[]).length,0),count,slug);
  }
});
