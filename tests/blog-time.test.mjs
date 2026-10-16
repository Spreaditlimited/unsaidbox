import test from "node:test";
import assert from "node:assert/strict";
import { scheduledInstant, publicationFields, publicationLabel } from "../lib/blog-time.mjs";
import { publicationDate, publicBlogWhere, blogStatus } from "../lib/blog-policy.mjs";
test("UK summer scheduling converts to UTC and round-trips in the editor",()=>{
  const value=scheduledInstant("2026-10-08","09:00");
  assert.equal(value.toISOString(),"2026-10-08T08:00:00.000Z");
  assert.deepEqual(publicationFields(value),{date:"2026-10-08",time:"09:00"});
  assert.match(publicationLabel(value),/09:00/);
  assert.equal(publicationDate("2026-10-08","09:00","Europe/London").getTime(),value.getTime());
  assert.equal(publicationDate("2026-10-08","09:00").toISOString(),"2026-10-08T09:00:00.000Z");
});
test("winter, DST gaps, repeated times and malformed dates are handled explicitly",()=>{
  assert.equal(scheduledInstant("2026-10-26","09:00").toISOString(),"2026-10-26T09:00:00.000Z");
  assert.throws(()=>scheduledInstant("2026-10-25","01:30"),/twice/);
  assert.throws(()=>scheduledInstant("2026-03-29","01:30"),/missing/);
  for(const pair of [["2026-02-30","09:00"],["2026-10-08","24:00"],["2026-10-08","9:00"]])assert.throws(()=>scheduledInstant(...pair));
  assert.throws(()=>scheduledInstant("2026-10-08","09:00","America/New_York"),/timezone/);
});
test("saved scheduled rows become public at the exact instant without a cron mutation",()=>{
  const publishAt=scheduledInstant("2026-10-08","09:00");
  const post={published:true,publishAt};
  const before=new Date(publishAt.getTime()-1),after=new Date(publishAt.getTime()+1);
  assert.equal(blogStatus(post,before),"SCHEDULED");
  assert.equal(blogStatus(post,publishAt),"PUBLISHED");
  assert.equal(blogStatus(post,after),"PUBLISHED");
  assert.ok(post.publishAt>publicBlogWhere(before).publishAt.lte);
  assert.ok(post.publishAt<=publicBlogWhere(publishAt).publishAt.lte);
});
