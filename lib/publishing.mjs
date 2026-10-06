// Fail-closed product rules. Transport/authentication are separate concerns.
export function newQuestionState() {
  return { linkActive: true, acceptingResponses: true, publicVisible: false, discoverable: false };
}

export function canSubmit(question, account) {
  return account?.status === 'ACTIVE' && question?.linkActive === true && question?.acceptingResponses === true;
}

export function canViewQuestion(question, account) {
  return account?.status === 'ACTIVE' && account?.publicPageEnabled === true && question?.publicVisible === true && question?.linkActive === true;
}

export function canDiscover(question, account) {
  return canViewQuestion(question, account) && question.discoverable === true && question.discoveryApproved === true;
}

export function canViewResponse(response, question, account) {
  return canViewQuestion(question, account) && response?.status === 'APPROVED' && response?.publicVisible === true && response?.sharingPolicy === 'OWNER_MAY_SHARE';
}

export function canShareResponse(response) {
  return response?.sharingPolicy === 'OWNER_MAY_SHARE' && response?.status === 'APPROVED';
}

export function ownsResource(accountId, resource) {
  return typeof accountId === 'string' && accountId.length > 0 && resource?.accountId === accountId;
}
