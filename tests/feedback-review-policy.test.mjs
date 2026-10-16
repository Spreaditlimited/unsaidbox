import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewFilters,reviewScope} from '../lib/feedback-review-policy.mjs';
test('review filtering includes untouched entries as new and unstarred',()=>{
  assert.deepEqual(reviewScope({reviewStatus:'NEW',starred:'no'}),[
    {OR:[{review:{is:null}},{review:{is:{status:'NEW'}}}]},
    {OR:[{review:{is:null}},{review:{is:{starred:false}}}]},
  ]);
});
test('review filters whitelist states and use exact JSON tag matching',()=>{
  assert.deepEqual(reviewFilters({reviewStatus:'DROP',starred:'true',tag:' pacing '}),{reviewStatus:'',starred:'',tag:'pacing'});
  assert.deepEqual(reviewScope({tag:'pacing'}),[{review:{is:{tags:{array_contains:'pacing'}}}}]);
});
