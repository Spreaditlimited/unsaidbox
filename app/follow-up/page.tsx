import {ThemePicker} from "@/components/ThemePicker";
import { FollowupUnlock } from './unlock';
import styles from '@/components/FollowupThread.module.css';
export const metadata = { title: 'Private conversation', robots: { index: false, follow: false } };
export default function FollowupPage() {
  return <main id="main" className="sender-shell"><section className={`sender-card ${styles.publicCard}`}><div className="standalone-appearance"><ThemePicker/></div>
    <p className="eyebrow">JUST BETWEEN YOU TWO</p><h1>Your private conversation.</h1>
    <p>Check for a reply without revealing your name or creating an account.</p>
    <FollowupUnlock />
  </section></main>;
}
