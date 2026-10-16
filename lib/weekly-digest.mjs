import {createHash,timingSafeEqual} from 'node:crypto';
import {scheduledInstant} from './blog-time.mjs';
import {blogText} from './blog-policy.mjs';
import {publicBlogWhere} from './blog-policy.mjs';
import {validateCampaign,marketingEnabled} from './marketing-policy.mjs';
import {withAudienceLock,submitCampaign} from './marketing-store.mjs';

export const digestAuthor='system:weekly-digest';
export function cronAuthorized(header,secret) {
  const a=Buffer.from(header??''),b=Buffer.from(`Bearer ${secret??''}`);
  return Boolean(secret?.length>=32&&a.length===b.length&&timingSafeEqual(a,b));
}
export function digestSlot(now=new Date()) {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
  return {due:parts.weekday==='Sun'&&parts.hour==='18',date:`${parts.year}-${parts.month}-${parts.day}`};
}
export const digestId=date=>'wd_'+createHash('sha256').update(date).digest('hex').slice(0,24);
export async function digestPosts(client,now=new Date()) {
  const slot=digestSlot(now);
  const end=slot.due?scheduledInstant(slot.date,'18:00','Europe/London'):now;
  const priorDate=new Date(Date.parse(slot.date+'T12:00:00Z')-7*86400000).toISOString().slice(0,10);
  const start=slot.due?scheduledInstant(priorDate,'18:00','Europe/London'):new Date(now.getTime()-7*86400000);
  return client.blogPost.findMany({where:{...publicBlogWhere(end),publishAt:{gt:start,lte:end}},orderBy:[{publishAt:'desc'},{id:'asc'}],take:1,select:{id:true,slug:true,title:true,excerpt:true,contentHtml:true,publishAt:true}});
}
export function buildDigest(posts) {
  if(!posts.length)throw Error('NO_NEW_POSTS');
  const clean=s=>String(s).replace(/[\r\n]+/g,' ').replace(/https?:\/\/\S+/g,'').replace(/\{[{%]/g,'').trim();
  const post=posts[0];
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug))throw Error('INVALID_BLOG_SLUG');
  // Take actual explanatory passages from the article, never invent lessons.
  const candidates=[...String(post.contentHtml||'').matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)].map(m=>clean(blogText(m[1]))).filter(p=>p.length>=60&&p.length<=360&&!/[?]$/.test(p));
  const lessons=[...new Set(candidates)].slice(1,3);
  if(!lessons.length&&candidates.length)lessons.push(candidates[0]);
  const source=blogText(post.contentHtml||'');
  const workshopLessons=post.slug==='training-feedback-questions-after-a-workshop'&&source.includes('satisfaction alone')&&source.includes('Immediately after a workshop')?[
    'A good satisfaction score doesn’t tell you everything. Someone can enjoy a workshop and still need more practice. Use feedback to understand what landed and where people need help; don’t treat it as proof that they’ve learned the skill.',
    'Timing matters, too. Right after a session, ask about the pace, instructions and examples. Give people time to try the skill before asking how it worked in real life. Those are two different conversations, and both are useful.',
  ]:null;
  const takeaway=workshopLessons?`Here are two things I’d take from it:\n\n${workshopLessons.join('\n\n')}`:lessons.length?lessons.map((lesson,i)=>`${i===0?'One idea worth sitting with':'Another point to take into your week'}:\n“${lesson}”`).join('\n\n'):`Here’s what the post explores: ${clean(post.excerpt).slice(0,450)}`;
  return validateCampaign({subject:'Your Sunday read: '+clean(post.title).slice(0,170),preheader:'One useful read, a couple of lessons, and something to try this week.',heading:clean(post.title).slice(0,200),body:`Hi there,\n\nLet’s spend a few minutes on one idea this Sunday. This week’s read is “${clean(post.title).slice(0,200)}”.\n\n${takeaway}\n\nAs you read, think about one thing you could try with your own audience. You don’t need to change everything at once. Start with the part that feels useful to you.\n\nThere’s more context and practical detail in the full post. Have a read, and see what you’d like to try:\n\nhttps://unsaidbox.com/blog/${post.slug}\n\nEnjoy your Sunday,\nThe UnsaidBox team`});
}
export async function runWeeklyDigest(client,{now=new Date(),env=process.env,send=submitCampaign}={}) {
  if(!marketingEnabled(env)||env.UNSAIDBOX_WEEKLY_DIGEST_ENABLED!=='true')return {status:'disabled'};
  const slot=digestSlot(now);
  if(!slot.due)return {status:'outside-schedule'};
  const posts=await digestPosts(client,now);
  if(!posts.length)return {status:'no-new-posts'};
  const content=buildDigest(posts),id=digestId(slot.date);
  // The shared lock and deterministic primary key serialize duplicate cron runs.
  const created=await withAudienceLock(client,async tx=>{
    if(await tx.marketingCampaign.findUnique({where:{id}}))return false;
    await tx.marketingCampaign.create({data:{id,...content,createdBy:digestAuthor}});
    return true;
  });
  if(!created)return {status:'already-recorded',id};
  try {await send(client,id,{env});return {status:'accepted',id};}
  catch(error) {
    // Never retry a weekly edition automatically, including after an uncertain send.
    if(error?.message==='EMPTY_AUDIENCE'){
      await client.marketingCampaign.updateMany({where:{id,status:'DRAFT'},data:{status:'SKIPPED'}});
      return {status:'no-subscribers',id};
    }
    throw error;
  }
}
