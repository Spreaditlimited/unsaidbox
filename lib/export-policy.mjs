import { insightRange } from './insight-policy.mjs';
import { reviewFilters, reviewScope } from './feedback-review-policy.mjs';
export const exportColumns = ['recordId','entryId','received','sourceId','sourceTitle','questionId','question','response'];
export function parseExportFilters(input) {
  const range = insightRange(input);
  const source = input.source;
  const purpose = input.purpose === 'ANALYSIS' ? 'ANALYSIS' : 'SHARING';
  if (!['messages','forms'].includes(source)) throw new Error('Choose messages or forms.');
  const sourceId = input.sourceId === 'all' ? '' : String(input.sourceId||'');
  if (sourceId && !/^[a-zA-Z0-9]{1,30}$/.test(sourceId)) throw new Error('Choose a valid collection link.');
  const layout = input.layout === 'WIDE' ? 'WIDE' : 'LONG';
  if (layout==='WIDE' && (source!=='forms'||!sourceId)) throw new Error('Select one form for a submission-per-row export.');
  const q = String(input.q||'').trim();
  if (q.length>200) throw new Error('Search text must be at most 200 characters.');
  const columns = Array.isArray(input.columns) ? [...new Set(input.columns)].filter(c=>exportColumns.includes(c)) : exportColumns;
  if (!columns.length) throw new Error('Select at least one column.');
  return { source, sourceId, purpose, layout, from:range.from, to:range.to, timezone:range.timezone, q, columns, ...reviewFilters(input) };
}
export function exportScope(accountId, filters, snapshotAt, eligible=true) {
  const range=insightRange(filters);
  const createdAt={gte:range.start,lt:new Date(Math.min(range.end.getTime(),new Date(snapshotAt).getTime()))};
  if (eligible && filters.purpose === 'ANALYSIS') {
    const matching = exportScope(accountId, filters, snapshotAt, false);
    // Private analysis includes existing responses without a consent record.
    // Public-sharing permissions are enforced separately below.
    return {...matching, ...(filters.source==='forms'?{form:{...matching.form,blocked:false}}:{status:{not:'SPAM'}})};
  }
  if (filters.source==='messages') return {accountId,createdAt,...(filters.sourceId?{questionId:filters.sourceId}:{}),...(filters.q?{OR:[{publicBody:{contains:filters.q}},{publicBody:null,body:{contains:filters.q}}]}:{}),...(eligible?{sharingPolicy:'OWNER_MAY_SHARE',status:'APPROVED'}:{})};
  return {createdAt,AND:reviewScope(filters),form:{accountId,...(filters.sourceId?{id:filters.sourceId}:{}),...(eligible?{allowSharing:true,blocked:false}:{})},...(filters.q?{answers:{some:{textValue:{contains:filters.q}}}}:{}),...(eligible?{shareAllowed:true}:{})};
}
