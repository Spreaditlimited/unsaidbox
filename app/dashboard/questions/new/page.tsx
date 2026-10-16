import { requireAccount } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { accountPlan } from '@/lib/plans';
import { questionAIReady } from '@/lib/question-ideas';
import { QuestionComposer } from './QuestionComposer';
import Link from 'next/link';
import styles from './questions.module.css';
export default async function NewQuestion() {
  const a = await requireAccount();
  let pro = false;
  try { const plan = await accountPlan(a.id); pro = plan.enforced && plan.limits.aiQuestions; } catch { /* AI fails closed; manual composer remains available. */ }
  return (
    <DashboardShell
      accountId={a.id}
      name={a.displayName}
    >
      <header className={styles.pageHeader}>
        <Link href="/dashboard?view=questions" className={styles.backLink}>← All questions</Link>
        <p className="eyebrow">YOUR AUDIENCE, THEIR HONEST ANSWERS</p>
        <h1>Create a question</h1>
        <p>Ask something meaningful. Share one link. Give your audience space to answer honestly.</p>
      </header>
      <QuestionComposer pro={pro} ready={questionAIReady()} />
    </DashboardShell>
  );
}
