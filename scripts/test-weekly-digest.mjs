import {PrismaClient} from '../generated/prisma/index.js';
import {validateDatabaseUrl} from '../lib/database-url.mjs';
import {digestPosts,buildDigest,digestAuthor} from '../lib/weekly-digest.mjs';
import {renderCampaign} from '../lib/marketing-policy.mjs';
import {assertSender,sendBrevoMail} from '../lib/brevo.mjs';
import {writeFile} from 'node:fs/promises';
const client=new PrismaClient({datasources:{db:{url:validateDatabaseUrl(process.env.UNSAIDBOX_DATABASE_URL)}}});
try {
 const posts=await digestPosts(client);
 const draft={...buildDigest(posts),createdBy:digestAuthor};
 const html=renderCampaign(draft,process.env.UNSAIDBOX_MARKETING_POSTAL_ADDRESS);
 await writeFile('docs/email/weekly-digest-preview.html',html);
 await writeFile('docs/email/weekly-digest-preview.json',JSON.stringify({generatedAt:new Date().toISOString(),...draft},null,2)+'\n');
 if(!process.argv.includes('--preview-only')) {
 await assertSender();
 const receipt=await sendBrevoMail({to:'nkwochatochukwu@gmail.com',subject:'[TEST] '+draft.subject,html:html.replace('{{ unsubscribe }}','https://unsaidbox.com/dashboard/settings').replace('You opted in to UnsaidBox tips, product updates and occasional offers.','Requested test preview. This test does not subscribe you.'),text:draft.body+'\n\nTest preview. No subscription was created.\n'+process.env.UNSAIDBOX_MARKETING_POSTAL_ADDRESS,tag:'unsaidbox-weekly-digest-test'});
 await writeFile('docs/email/weekly-digest-test.json',JSON.stringify({submittedAt:new Date().toISOString(),recipient:'nkwochatochukwu@gmail.com',receipt,posts:posts.map(p=>p.slug),status:'accepted'},null,2)+'\n');
 console.log('Brevo accepted the requested digest test for nkwochatochukwu@gmail.com; delivery is not yet confirmed.');
 } else console.log('Digest preview saved. No email submitted.');
} catch(error){console.error('DIGEST_TEST_FAILED',/^[A-Z_]+$/.test(error?.message??'')?error.message:'CHECK_CONFIGURATION');process.exitCode=1;} finally {await client.$disconnect();}
