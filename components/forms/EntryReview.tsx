import { ActionForm } from '@/components/ActionForm';
import { Checkbox } from '@/components/ui/Checkbox';
import { Picker } from '@/components/ui/Picker';
import { reviewEntry } from '@/app/dashboard/forms/review-actions';

export function EntryReview({ entryId, review }: { entryId:string; review: {revision:number;status:string;starred:boolean;note:string|null;tags:unknown}|null }) {
  return <details><summary>Private review, tags & notes</summary><ActionForm key={review?.revision??0} action={reviewEntry.bind(null,entryId)} label="Save private review" captchaAction="reviewEntry">
    <input type="hidden" name="revision" value={review?.revision??0} />
    <Picker name="status" label="Review status" defaultValue={review?.status??'NEW'} options={[{value:'NEW',label:'New'},{value:'REVIEWED',label:'Reviewed'},{value:'ACTION_NEEDED',label:'Action needed'},{value:'RESOLVED',label:'Resolved'}]} />
    <Checkbox name="starred" defaultChecked={review?.starred??false}>Star this response</Checkbox>
    <label>Tags, separated by commas<input name="tags" maxLength={500} defaultValue={Array.isArray(review?.tags)?review.tags.filter(t=>typeof t==='string').join(', '):''} placeholder="Course pacing, examples, follow up" /></label>
    <label>Private note<textarea name="note" rows={3} maxLength={5000} defaultValue={review?.note??''} /></label>
    <p className="fine">For your own review only. Notes and tags are not sent to the respondent or included in public share cards.</p>
  </ActionForm></details>;
}
