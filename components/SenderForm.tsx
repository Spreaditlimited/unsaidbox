import {ThemePicker} from "@/components/ThemePicker";
import { Checkbox } from "@/components/ui/Checkbox";
import Link from "next/link";
import { ActionForm } from "./ActionForm";
import { submitMessage } from "@/app/actions";
import { followupsReady } from '@/lib/followups';
import { FollowupOptIn } from './FollowupOptIn';
export async function SenderForm({
  username,
  name,
  questionId = null,
  prompt,
  policy,
  open,
}: {
  username: string;
  name: string;
  questionId?: string | null;
  prompt: string;
  policy: string;
  open: boolean;
}) {
  return (
    <main id="main" className="sender-shell">
      <section className="sender-card"><div className="standalone-appearance"><ThemePicker/></div>
        <p className="eyebrow">TO {name}</p>
        <h1 className="message-text">{prompt}</h1>
        {open ? (
          <ActionForm
            action={submitMessage.bind(null, username, questionId)}
            label="Send anonymously"
            sentScreen
            captchaAction="submitMessage"
          >
            <input type="hidden" name="policy" value={policy} />
            <label>
              Your {questionId ? "answer" : "message"}
              <textarea
                name="body"
                required
                maxLength={5000}
                rows={7}
                placeholder="Say what’s on your mind…"
              />
            </label>
            <div className="honeypot" aria-hidden="true">
              <label>
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <p className="privacy-note">
              {policy === "PRIVATE_ONLY"
                ? "Private-only: this message cannot be published or exported for sharing through UnsaidBox. The recipient can review and download it for their own private analysis."
                : "The owner may publish or share your words, but your name is not attached. Avoid including identifying details."}
            </p>
            <Checkbox name="consent" required>
              I am 18 or older and understand how my message may be used.
            </Checkbox>
            <p className="fine">The recipient may download responses for private analysis. Downloaded copies cannot be recalled by UnsaidBox. Avoid including identifying or sensitive personal details.</p>
            {await followupsReady() ? <FollowupOptIn /> : null}
            <p className="fine">
              Do not send threats, harassment or someone else’s private
              information. No account is needed.
            </p>
          </ActionForm>
        ) : (
          <p className="notice">This link is not accepting new messages.</p>
        )}
      </section>
      <footer className="sender-bottom">
        <span>Anonymous to the recipient</span>
        <Link href="/safety">Privacy & safety</Link>
      </footer>
    </main>
  );
}
