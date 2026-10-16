import { Checkbox } from './ui/Checkbox';

export function FollowupOptIn() {
  return <div className="privacy-note">
    <Checkbox name="allowFollowup">Let the owner reply privately · optional</Checkbox>
    <p className="fine">Get a secret return link to check for replies and continue anonymously. No email or account needed. Save it before leaving; we cannot recover a lost link. Follow-ups stay private and the link expires after 90 days.</p>
  </div>;
}
