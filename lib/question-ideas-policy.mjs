export const ideaGoals = ['Understand my audience', 'Improve my course or product', 'Start a conversation', 'Find content ideas'];
export const ideaTones = ['Warm and conversational', 'Thoughtful and reflective', 'Direct and practical'];
export function ideaInput(form) {
  const niche = String(form.get('niche') ?? '').trim();
  const audience = String(form.get('audience') ?? '').trim();
  const goal = String(form.get('goal') ?? '');
  const tone = String(form.get('tone') ?? '');
  if (niche.length < 3 || niche.length > 160) throw new Error('Describe your niche in 3–160 characters.');
  if (audience.length > 240) throw new Error('Keep your audience description under 240 characters.');
  if (!ideaGoals.includes(goal) || !ideaTones.includes(tone)) throw new Error('Choose a goal and tone from the available options.');
  return { niche, audience, goal, tone };
}
export function validateIdeas(value) {
  if (!value || !Array.isArray(value.questions) || value.questions.length !== 5) throw new Error('Invalid AI questions');
  const questions = value.questions.map(item => {
    if (typeof item !== 'string' || item.trim().length < 10 || item.length > 350 || /[<>\u0000-\u0008]/.test(item)) throw new Error('Invalid AI question');
    return item.trim();
  });
  if (new Set(questions.map(item => item.toLowerCase())).size !== 5) throw new Error('Duplicate AI questions');
  return { questions };
}
