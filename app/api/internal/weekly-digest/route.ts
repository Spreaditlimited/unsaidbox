import {db} from '@/lib/db';
import {cronAuthorized,runWeeklyDigest} from '@/lib/weekly-digest.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;
export async function GET(request:Request) {
  if(!cronAuthorized(request.headers.get('authorization'),process.env.CRON_SECRET))
    return Response.json({error:'Unauthorized'},{status:401});
  try {return Response.json(await runWeeklyDigest(db()),{headers:{'Cache-Control':'no-store'}});}
  catch {console.error('UnsaidBox weekly digest requires review in Admin Email');return Response.json({error:'Digest requires review'},{status:503});}
}
