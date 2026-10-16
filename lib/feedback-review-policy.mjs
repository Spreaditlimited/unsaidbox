export function reviewFilters(input) {
  const reviewStatus = ['NEW','REVIEWED','ACTION_NEEDED','RESOLVED'].includes(input.reviewStatus) ? input.reviewStatus : '';
  const starred = ['yes','no'].includes(input.starred) ? input.starred : '';
  const tag = typeof input.tag === 'string' ? input.tag.trim().slice(0,40) : '';
  return {reviewStatus,starred,tag};
}
export function reviewScope(input) {
  const {reviewStatus,starred,tag} = reviewFilters(input);
  const AND = [];
  if(reviewStatus==='NEW') AND.push({OR:[{review:{is:null}},{review:{is:{status:'NEW'}}}]});
  else if(reviewStatus) AND.push({review:{is:{status:reviewStatus}}});
  if(starred==='yes') AND.push({review:{is:{starred:true}}});
  if(starred==='no') AND.push({OR:[{review:{is:null}},{review:{is:{starred:false}}}]});
  if(tag) AND.push({review:{is:{tags:{array_contains:tag}}}});
  return AND;
}
