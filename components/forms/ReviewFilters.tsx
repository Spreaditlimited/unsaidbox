import { Picker } from '@/components/ui/Picker';
export function ReviewFilters({filters}:{filters:{reviewStatus:string;starred:string;tag:string}}){
  return <>
    <Picker name="reviewStatus" label="Private review status" defaultValue={filters.reviewStatus||'all'} options={[{value:'all',label:'All review states'},{value:'NEW',label:'New / not reviewed'},{value:'REVIEWED',label:'Reviewed'},{value:'ACTION_NEEDED',label:'Action needed'},{value:'RESOLVED',label:'Resolved'}]} />
    <Picker name="starred" label="Starred responses" defaultValue={filters.starred||'all'} options={[{value:'all',label:'All responses'},{value:'yes',label:'Starred only'},{value:'no',label:'Not starred'}]} />
    <label>Exact review tag<input name="tag" defaultValue={filters.tag} maxLength={40} placeholder="Course pacing" /></label>
  </>;
}
