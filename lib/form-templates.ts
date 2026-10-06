export type FormQuestion = {
  id: string;
  label: string;
  type: "TEXT" | "CHOICE" | "RATING";
  required: boolean;
  options: string[];
};
export type FeedbackDefinition = {
  title: string;
  description: string;
  thankYou: string;
  questions: FormQuestion[];
  theme: string;
  allowSharing: boolean;
  templateId: string;
};
const question = (
  id: string,
  label: string,
  type: FormQuestion["type"] = "TEXT",
  required = false,
  options: string[] = [],
): FormQuestion => ({ id, label, type, required, options });
export const formTemplates: (FeedbackDefinition & {
  name: string;
  category: string;
  summary: string;
})[] = [
  {
    templateId: "course-feedback",
    name: "Course feedback",
    category: "Education",
    summary: "Find out what landed, what didn’t, and what to teach next.",
    theme: "lavender",
    allowSharing: false,
    title: "Help shape the next chapter",
    description:
      "Your honest feedback helps me make this course better. Please leave out names and identifying details.",
    thankYou: "Thank you for helping me make the next course even better.",
    questions: [
      question(
        "experience",
        "How would you rate your experience?",
        "RATING",
        true,
      ),
      question(
        "useful",
        "What was the most useful thing you learned?",
        "TEXT",
        true,
      ),
      question("improve", "What could I do better?"),
      question("next", "What would you like to learn next?"),
    ],
  },
  {
    templateId: "ask-anything",
    name: "Ask me anything",
    category: "Creators",
    summary: "Open the door to the questions your audience hasn’t asked yet.",
    theme: "sand",
    allowSharing: true,
    title: "What have you always wanted to ask?",
    description:
      "A little curiosity goes a long way. Ask your question without adding your name.",
    thankYou: "Your question is in. Thank you for asking.",
    questions: [
      question("question", "What would you like to ask me?", "TEXT", true),
      question("topic", "What is your question about?", "CHOICE", false, [
        "My work",
        "Life and experiences",
        "Advice",
        "Something else",
      ]),
    ],
  },
  {
    templateId: "community-suggestions",
    name: "Community suggestions",
    category: "Community",
    summary:
      "A welcoming suggestion box for the people who make your community.",
    theme: "sage",
    allowSharing: false,
    title: "Make this space better, together",
    description:
      "What is working for you, and what would you change? We’re listening.",
    thankYou: "Thank you. Your suggestion has been received privately.",
    questions: [
      question(
        "feeling",
        "How is your experience in the community?",
        "RATING",
        true,
      ),
      question(
        "suggestion",
        "What is one thing we could improve?",
        "TEXT",
        true,
      ),
      question("keep", "What should we keep doing?"),
    ],
  },
  {
    templateId: "audience-questions",
    name: "Know your audience",
    category: "Creators",
    summary: "Let your audience help you decide what to create next.",
    theme: "lavender",
    allowSharing: true,
    title: "What should we talk about next?",
    description:
      "Help me create something useful for you. Honest answers are welcome.",
    thankYou: "Thanks for helping shape what comes next.",
    questions: [
      question("next", "What would you love me to cover next?", "TEXT", true),
      question("format", "How do you prefer to learn?", "CHOICE", false, [
        "Short videos",
        "Longer videos",
        "Written guides",
        "Live conversations",
      ]),
      question("challenge", "What are you finding difficult right now?"),
    ],
  },
  {
    templateId: "workshop-review",
    name: "Workshop check-in",
    category: "Education",
    summary: "A quick pulse check after a session, workshop or coaching call.",
    theme: "sage",
    allowSharing: false,
    title: "How was our session?",
    description: "A quick check-in to help make the next session more useful.",
    thankYou: "Thank you for your time and thoughtful feedback.",
    questions: [
      question("rating", "How useful was the session?", "RATING", true),
      question("pace", "How did the pace feel?", "CHOICE", true, [
        "Too slow",
        "About right",
        "Too fast",
      ]),
      question("takeaway", "What is your biggest takeaway?"),
      question("change", "What would you change next time?"),
    ],
  },
  {
    templateId: "blank",
    name: "Start with a blank page",
    category: "Your idea",
    summary: "One thoughtful question can be the start of something good.",
    theme: "sand",
    allowSharing: false,
    title: "A space for your thoughts",
    description: "Share what is on your mind. No account or name needed.",
    thankYou: "Thank you. Your response has been received.",
    questions: [
      question("thoughts", "What would you like to share?", "TEXT", true),
    ],
  },
];
export function getFormTemplate(id?: string) {
  return formTemplates.find((t) => t.templateId === id) ?? formTemplates[0];
}
