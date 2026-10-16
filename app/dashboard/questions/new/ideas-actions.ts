'use server';
import { unstable_rethrow } from 'next/navigation';
import { requireAccount, rateLimit } from '@/lib/auth';
import { requirePlanFeature } from '@/lib/plans';
import { verifyCaptcha } from '@/lib/captcha.mjs';
import { InputError } from '@/lib/security.mjs';
import { ideaInput } from '@/lib/question-ideas-policy.mjs';
import { generateQuestionIdeas, questionAIReady } from '@/lib/question-ideas';

export async function suggestQuestions(form: FormData): Promise<{ questions?: string[]; error?: string }> {
  try {
    const account = await requireAccount();
    await verifyCaptcha(form, 'suggestQuestions');
    await requirePlanFeature(account.id, 'aiQuestions');
    let input;
    try { input = ideaInput(form); } catch (error) { throw new InputError((error as Error).message); }
    if (!questionAIReady()) throw new InputError('AI question suggestions are temporarily unavailable. You can still write your question below.');
    await rateLimit(`question-ai:minute:${account.id}`, 2, 60);
    await rateLimit(`question-ai:hour:${account.id}`, 10, 3600);
    await rateLimit(`question-ai:day:${account.id}`, 50, 86400);
    await rateLimit('question-ai:global:day', 1000, 86400);
    return { questions: await generateQuestionIdeas(input) };
  } catch (error) {
    unstable_rethrow(error);
    return { error: error instanceof InputError ? error.message : 'We couldn’t generate suggestions this time. Your draft is unchanged. Try again shortly or write your own question.' };
  }
}
