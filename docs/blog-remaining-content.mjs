// Original launch articles, October 2026. Imported only by an explicitly confirmed editorial operation.
// Dates are assigned by the release manifest, never as a side effect of importing this module.
import { articleDepth, courseEvaluationDepth } from './blog-depth-content.mjs';
import { launchArticles } from './blog-launch-content.mjs';
const list = items => `<ul>${items.map(x => `<li>${x}</li>`).join("")}</ul>`;
const questions = (heading, items) => `<h2>${heading}</h2>${list(items)}`;
export const originalRemainingArticles = [
{
  title: '50 Anonymous Questions to Ask Your Followers',
  slug: 'anonymous-questions-to-ask-your-followers', category: 'Question ideas',
  excerpt: 'Fifty original prompts for adult audiences, organised by purpose, plus a simple way to choose a question, invite answers and follow up without exposing anyone.',
  seoTitle: '50 Anonymous Questions to Ask Your Followers',
  seoDescription: 'Find anonymous questions for your followers: light-hearted prompts, learning, opinions, community and reflection. Includes invitations and a follow-up plan.',
  imageAlt: 'Colourful question cards arranged in five small groups around an open ivory box.',
  contentHtml: `
<p>A good anonymous question is easy to understand, safe to skip and interesting enough to answer without a public identity attached. Start with one prompt that fits your audience, rather than posting a long questionnaire or asking people to reveal their deepest secret.</p>
<p>Below are fifty original questions for adult audiences. They are a question bank, not a form to send in full. Choose one for a social post, give people a dedicated answer link and explain whether you may share selected responses. The aim is a worthwhile exchange, not disclosure for its own sake.</p>
<h2>Choose a question by the conversation you want</h2>
<p>For a new audience, begin with preferences or everyday experiences. For a learning community, ask about a small obstacle. For an established audience, reflection can work, but give people permission to stay general. Avoid questions about diagnoses, identifiable disputes, financial account details or experiences you are not equipped to handle.</p>
<p>If you want people to ask <em>you</em> questions, use an inbox invitation instead. These prompts are for questions <em>you ask them</em>. That distinction determines which collection link to share.</p>
${questions('Ten light-hearted questions to get started', [
 'What everyday task would you happily let someone else do forever?', 'Which small purchase made your day-to-day life noticeably easier?', 'What popular hobby have you tried and decided is not for you?', 'Which harmless opinion would you defend more strongly than necessary?', 'What is your favourite way to spend an unexpectedly free hour?', 'Which skill would you choose if you could learn it overnight?', 'What is one thing you liked before it became fashionable?', 'Which ordinary achievement deserves more celebration?', 'What is your most useful low-effort shortcut for a busy day?', 'Which kind of content do you save but rarely return to?'])}
<p>These work well when the goal is participation, not research. Share a few contrasting answers without ranking people as sensible or foolish. A playful question should not become an invitation to mock a minority preference.</p>
${questions('Ten questions about learning and starting something new', [
 'What would you like to learn but keep putting off?', 'Which word in this topic does everyone seem to understand except you?', 'What is the first step you wish someone would demonstrate slowly?', 'When you stop halfway through a tutorial, what usually causes it?', 'Which example would make this subject feel relevant to your life?', 'What advice sounds simple until you actually try it?', 'What would make asking for help feel easier?', 'Which beginner mistake taught you something useful?', 'What does a manageable first week of learning look like for you?', 'What is one thing you understand now that confused you a month ago?'])}
<p>Use these to find the next helpful explanation. If somebody says the first step is confusing, publish that first step. Do not turn every learning obstacle into a sales pitch; people should receive value from answering even if they never buy anything.</p>
${questions('Ten questions about opinions and changing your mind', [
 'What advice have you stopped following?', 'What did you once think was essential that now feels optional?', 'Which common claim about this topic needs more explanation?', 'What is one belief you changed after trying something yourself?', 'When is doing less the better choice?', 'Which trade-off do people overlook when discussing success?', 'What is a reasonable disagreement you wish people could have calmly?', 'Which trend would you be happy to see disappear?', 'What question would you ask before accepting popular advice?', 'What does progress mean to you when nobody else sees it?'])}
${questions('Ten questions about belonging and community', [
 'What makes you feel welcome in a new online community?', 'What makes it difficult to join a conversation already in progress?', 'Which community habit helps quieter people participate?', 'What would you like newcomers to know on their first day?', 'What kind of event would you attend without needing to prepare?', 'What is one unwritten rule that should be explained clearly?', 'How do you prefer a host to handle disagreement?', 'What makes a group feel useful rather than noisy?', 'Which small act of encouragement do you remember?', 'What would make you comfortable contributing for the first time?'])}
${questions('Ten reflective questions that do not require a confession', [
 'What are you learning to give yourself more time for?', 'Which small boundary has made everyday life easier?', 'What is something you are proud of that you rarely mention?', 'What would you tell your past self before starting a new project?', 'Which expectation have you chosen to let go of?', 'What helps you begin again after losing momentum?', 'What is a kind thing someone said that stayed with you?', 'What does a good ordinary day look like to you?', 'Which habit supports you when motivation is low?', 'What are you looking forward to that does not need to impress anyone?'])}
<h2>A copyable invitation</h2>
<blockquote><p>One question for today: [your prompt]. You can answer without giving your name or creating an account. Please leave out names and identifying details. I may share selected answers only where sharing is permitted, and I will review them first. You can keep your answer general or skip the question. Answer here: [dedicated answer link].</p></blockquote>
<p>Match that wording to your actual settings. If collection is private-only, say so and do not share individual answers later. A name-free submission is not a promise that the wording could never identify its author.</p>
<h2>Turn a question into a useful weekly habit</h2>
<ol><li>Pick one prompt and decide why it is worth asking.</li><li>Create the question in UnsaidBox and activate its answer link.</li><li>Open the link while signed out on your phone.</li><li>Share a short invitation where your audience already spends time.</li><li>Read responses privately before choosing anything to publish.</li><li>Follow up with an observation, an answer or a change you will make.</li></ol>
<p>For example, a creator could ask which beginner term needs explaining on Monday, collect answers through Wednesday and publish a plain-language explanation on Friday. That is a suggested routine, not an automatic scheduling feature or a promise of more engagement.</p>
<h2>What if nobody answers?</h2>
<p>First check the link and whether collection is open. Then consider the invitation: is the topic clear, does it demand too much personal detail, and have you explained what happens next? Try a narrower prompt before assuming the audience is uninterested. Do not invent submissions to make the activity appear popular.</p>
<p>For setup details, read <a href="/blog/ask-me-an-anonymous-question-link">the guide to anonymous question and answer links</a>. Start with the question you would be comfortable answering yourself.</p>`
},
{
  title: 'How to Create an Anonymous Question Box',
  slug: 'how-to-create-an-anonymous-question-box', category: 'Creator guides',
  excerpt: 'Set up a standing question box for your audience, choose clear privacy boundaries and build a simple routine for collecting and answering questions.',
  seoTitle: 'How to Create an Anonymous Question Box for Your Audience',
  seoDescription: 'Create an anonymous question box, choose the right link, explain privacy and sharing, and manage questions without publishing everything you receive.',
  imageAlt: 'An open ivory question box on a desk with a single navy card and a coral ribbon.',
  contentHtml: `
<p>An anonymous question box is a standing invitation for people to send you questions without attaching a name. It works well when your audience has different things to ask and you want to review them privately before answering.</p>
<p>To create one, set up an owner account, open your anonymous inbox, decide what sharing you will permit, and copy the submission link. Put that link in a place people can find again. Then establish a realistic routine for reading and responding. The box is only the collection point; trust comes from how you handle what arrives.</p>
<h2>Question box, answer link or feedback form?</h2>
<p>Choose by the direction and shape of the conversation. A question box lets visitors choose what they ask. A dedicated answer link collects responses to one question you wrote. A feedback form collects several structured answers about a session or experience.</p>
<p>For example, “Ask me about starting a small business” belongs in a question box. “What stopped you launching your first product?” belongs on a dedicated question. “How was the workshop?” may need a short form covering usefulness, pace and one improvement.</p>
<p>Combining these into one general inbox makes sorting harder and confuses respondents. If you already know exactly what you want to ask, you probably need an answer link instead. See our <a href="/blog/how-to-create-an-anonymous-feedback-form">feedback form guide</a> when several questions are necessary.</p>
<h2>Set the boundaries before you share the box</h2>
<p>Write down the topics you welcome, the topics you cannot responsibly answer, and where answers will appear. A course creator might welcome questions about lessons and learning obstacles, while directing billing problems to a private support address.</p>
<p>Decide whether the inbox is private-only or whether submitters may permit public sharing. Those are different expectations. Do not invite private feedback and later treat every message as content for a social post.</p>
<blockquote><p>This box is for questions about [topic]. You do not need to give your name. Please do not include account details, names or information that identifies anyone else. I read questions privately and answer selected topics on [channel]. This is not an emergency or confidential professional advice service.</p></blockquote>
<p>Add an accurate statement about sharing permission. Keep the wording short enough that someone opening the page on a phone will actually read it.</p>
<h2>Create your box in UnsaidBox</h2>
<ol><li>Create an account and complete email verification.</li><li>Choose the username you want people to recognise in your link.</li><li>Review your inbox settings and open collection.</li><li>Check the sharing permission shown to respondents.</li><li>Copy your personal ask link from the dashboard. Its route ends in <code>/u/your-username/ask</code>.</li><li>Open it while signed out and submit a clearly labelled test question.</li><li>Confirm the test reaches your private inbox before you announce the box.</li></ol>
<p>The owner dashboard is not the submission page. A URL beginning with <code>/dashboard</code> is not a link to send your audience. Also distinguish the ask link from a public profile: a profile is for browsing whatever you have chosen to make public, while the ask link is for sending a message.</p>
<h2>Choose where the link should live</h2>
<p>For an ongoing box, use a stable place such as your profile introduction, a pinned community announcement or a course resource page. For a themed session, include it in the invitation to that session. Always explain what the link does beside the link itself.</p>
<p>Do not make people reply publicly with “sent” or reveal which question was theirs. Avoid personalised links or tracking conventions intended to identify a sender after promising anonymity. If you need an identified support conversation, offer a separate contact route.</p>
<h2>Build a routine you can maintain</h2>
<p>Choose a review cadence you can honour. For a small creator audience, that might mean two inbox reviews each week and one public answer post. A busy launch may need more frequent review. Say what you can realistically do; do not imply someone monitors the box continuously if nobody does.</p>
<p>During each review, separate answerable questions, repeated themes, requests for support and content you should not publish. Keep a private note of the themes you intend to address. You do not need to answer each submission individually, and anonymous collection may not provide a private reply route.</p>
<p>A useful answer explains the question, gives a concrete example and states any limits. If several submissions raise the same issue, write a clearly labelled summary rather than presenting a composite as a verbatim quote.</p>
<h2>What anonymity does and does not mean</h2>
<p>UnsaidBox does not attach a sender name, email or account to an anonymous submission. That does not mean no technical connection information can exist in infrastructure logs, or that a detailed story cannot identify someone. Ask people to omit identifying details and review responses before any sharing.</p>
<p>A box owner should not promise “nobody could ever trace this” or encourage disclosures they are not prepared to handle. Read the <a href="/safety">safety guidance</a> and use a suitable specialist channel for formal complaints, safeguarding or urgent concerns.</p>
<h2>When to pause or close the box</h2>
<p>Pause collection when you have more questions than you can responsibly review. If a campaign has ended, update or remove the invitation so people do not expect a response. Closing a link does not recall screenshots or posts already shared elsewhere.</p>
<p>If participation is low, narrow the invitation instead of escalating to more intrusive questions. “What part of lesson two needs another example?” is easier to answer than “tell me everything you are struggling with”. A small number of useful questions is a better starting point than a large inbox you cannot act on.</p>
<p><a href="/start">Create your own box</a>, test the submission link and invite one focused round of questions before making it a permanent fixture.</p>`
},
{
  title: 'How to Run an Anonymous Q&A with Your Audience',
  slug: 'how-to-run-an-anonymous-qa', category: 'Creator guides',
  excerpt: 'A practical runbook for collecting questions, preparing thoughtful answers, moderating safely and following up after an anonymous Q&A.',
  seoTitle: 'How to Run an Anonymous Q&A: A Practical Runbook',
  seoDescription: 'Plan an anonymous Q&A for an adult audience with an invitation template, moderation rules, an answer structure and a useful follow-up routine.',
  imageAlt: 'Question cards moving from an open box to a simple navy presentation board.',
  contentHtml: `
<p>To run an anonymous Q&A, define a topic, collect questions through a private submission link, review them before the session, and answer selected questions on a channel your audience already uses. End by explaining what you will follow up on. You do not need to build a public discussion thread around every submission.</p>
<p>This guide is for adult creator audiences, communities and course groups. It treats anonymity as a way to lower the barrier to asking, not as permission to publish unreviewed claims or give specialist advice outside your competence.</p>
<h2>Decide what a successful session would achieve</h2>
<p>A Q&A is easier to plan when it has a job. You might want to clarify the first week of a course, explain a new process or answer common beginner questions. “Anything at all” can work for an established audience, but it leaves both you and the participants guessing about scope.</p>
<p>Choose the format too: a written Facebook post, a recorded video, a live session or a short series of answers. Pick one primary destination and tell people where to look. UnsaidBox can collect the questions while the actual conversation remains on your social channel.</p>
<h2>Use a collection window you can actually manage</h2>
<p>Here is a suggested timetable for a Friday session: invite questions on Monday, post one reminder on Wednesday, review on Thursday and answer on Friday. It is an example workflow, not a built-in automation. Adjust it to how often your audience checks that channel.</p>
<p>State a date, time and timezone if you are closing collection at a deadline. “Tomorrow evening” becomes ambiguous when a post is shared later or read in another country. If the link remains open after the session, say that late questions may be used for a future round.</p>
<h2>A ready-to-adapt invitation</h2>
<blockquote><p>I’m hosting a Q&A about [specific topic] on [date and channel]. What would you like explained? Send your question here: [ask link]. No name or account is needed to submit. Please leave out identifying details about yourself or others. I’ll review questions privately and answer a selection; I cannot promise to answer every submission. Questions close at [time and timezone].</p></blockquote>
<p>Include truthful sharing information matching your collection settings. If individual messages are private-only, answer a general topic without reproducing the message. If you request permission to share, review that permission and the content before using a quote or share card.</p>
<h2>Prepare the collection link</h2>
<ol><li>Use an anonymous inbox link if participants are asking you questions.</li><li>Use a dedicated answer link if you are asking participants one prompt.</li><li>Use a short form only when you need additional structure.</li><li>Test while signed out, including inside a phone browser.</li><li>Check that submissions reach the correct private inbox or results page.</li></ol>
<p>If the distinction is unclear, our <a href="/blog/ask-me-an-anonymous-question-link">question-link guide</a> shows which link belongs to each invitation. The collection link must not lead to your signed-in dashboard.</p>
<h2>Review questions before going live</h2>
<p>Make four working groups: ready to answer, needs a broader explanation, outside scope and not safe to share. These can be private editorial notes; they are not a claim that the app automatically classifies questions.</p>
<p>Look for names, recognisable stories, private contact information, threats and allegations about identifiable people. Do not read a question on air before checking the whole message. A harmless opening sentence can be followed by details that should never be broadcast.</p>
<p>Combine repeated themes only as a labelled summary. “Several submissions asked about finding time to practise” is different from inventing one quote assembled from different people. Also remember that several messages are not necessarily several distinct respondents.</p>
<h2>A simple answer structure</h2>
<ol><li><strong>State the question or theme.</strong> Preserve its meaning without unnecessary personal detail.</li><li><strong>Give the direct answer.</strong> Do not make the audience wait through a long introduction.</li><li><strong>Show one example.</strong> Explain what someone could do next.</li><li><strong>Name the limitation.</strong> Say where the answer depends on context or needs professional advice.</li><li><strong>Offer a next step.</strong> Link to a relevant lesson, guide or separate support route.</li></ol>
<p>For example, for “How do I practise when I only have twenty minutes?”, suggest one small repeatable task, demonstrate what a finished attempt looks like and invite people to adapt the duration. Avoid presenting one personal routine as a guaranteed solution for everyone.</p>
<h2>Handle difficult questions without punishing the audience</h2>
<p>You can decline a question without ridiculing its sender. “That needs information I cannot assess here” is better than speculating. When someone raises reasonable criticism, answer the substance and explain any action. When a message targets a person, do not amplify the attack to prove you are transparent.</p>
<p>If you do not know, say so and give a realistic follow-up commitment. Anonymous participation does not create an obligation to answer intimate questions about your life or anyone else’s.</p>
<h2>Close the loop after the session</h2>
<p>Share where the answers can be found, list unresolved topics and say whether another round is planned. If you promised to change something, report the decision. The most useful measure is not just how many messages arrived, but whether the session resolved confusion or helped you choose a better next step.</p>
<p>Keep the original submissions private unless publication is permitted and appropriate. <a href="/start">Set up your collection link</a> first, then build a small, repeatable Q&A routine around it.</p>`
},
{
  title: '20 Open-Ended Course Evaluation Questions That Get Useful Answers',
  slug: 'open-ended-course-evaluation-questions', category: 'Audience feedback',
  excerpt: 'Go beyond satisfaction scores with twenty specific written-feedback prompts, a five-question short form and examples of turning comments into course improvements.',
  seoTitle: '20 Open-Ended Course Evaluation Questions + Short Template',
  seoDescription: 'Use open-ended course evaluation questions to find confusing lessons, useful examples and practical improvements. Includes a focused five-question template.',
  imageAlt: 'An open workbook beside several handwritten-style blank feedback cards and a coral pencil.',
  contentHtml: `
<p>Open-ended course evaluation questions ask learners to explain an experience in their own words. They are most useful when a score would leave you asking “why?”: what made a lesson confusing, which activity helped, or what prevented someone applying a skill.</p>
<p>Ask for a specific experience rather than a general verdict. “Where did you need another example?” is usually more actionable than “Any comments?” Below are twenty original prompts for adult learning, followed by a short version and a practical way to use the answers.</p>
<h2>What makes an open-ended question useful?</h2>
<p>A useful prompt has a clear subject, asks about something the learner can recall and does not assume the experience was positive or negative. Avoid “Why did you love the exercises?” and “What was wrong with the instructor?” Both push the answer before the learner has given it.</p>
<p>Ask about one main concept at a time. Pew Research Center explains why questions combining multiple concepts can be difficult to answer and interpret in its <a href="https://www.pewresearch.org/writing-survey-questions/">question-writing guidance</a>. In practice, separate pace from clarity: a course can be clear and still move too quickly.</p>
${questions('Five questions about understanding the material', [
 'Which idea needs another explanation before you feel comfortable using it?', 'Where would a worked example have helped you most?', 'Which term should we explain earlier in the course?', 'What connection between two lessons was difficult to follow?', 'Which explanation made a previously confusing idea click?'])}
<p>These reveal where to improve sequencing, examples and vocabulary. Ask learners not to identify classmates or quote private group discussions. You need the learning obstacle, not a personal history of everyone involved.</p>
${questions('Five questions about activities and resources', [
 'Which activity helped you practise something you want to use?', 'What made an exercise difficult to complete?', 'Which resource did you return to outside the lesson?', 'What instruction would have made the assignment easier to start?', 'What would you change about the feedback you received on your work?'])}
<p>Look for distinctions between useful challenge and avoidable friction. “The exercise required thinking” is not the same problem as “the instructions omitted the file we needed”. The first may be intentional; the second is something to fix.</p>
${questions('Five questions about participation and access', [
 'What made it easier or harder to ask a question during the course?', 'Where did the course format get in the way of learning?', 'Which part of the workload was hardest to fit around your other commitments?', 'What would have helped you catch up after missing a session?', 'What change would make the materials easier for you to use?'])}
<p>Let learners describe a barrier without requiring a diagnosis or other sensitive detail. For example, they can request clearer written instructions without explaining a medical condition. If a person needs an individual accommodation, offer a separate private contact route.</p>
${questions('Five questions about applying learning and improving the next version', [
 'What is one task you feel better prepared to attempt?', 'What might prevent you from using what you learned?', 'Which realistic scenario should we add to the next version?', 'What would you keep exactly as it is?', 'If we changed one thing for the next group, what should it be?'])}
<h2>A five-question short form</h2>
<p>Do not send all twenty prompts at once. Choose questions you have time to read and a decision you are prepared to make. For a general end-of-course review, this combination covers understanding, usefulness, obstacles and priorities:</p>
<ol><li>Which explanation made a previously confusing idea click?</li><li>Where would a worked example have helped you most?</li><li>Which activity helped you practise something you want to use?</li><li>What might prevent you from using what you learned?</li><li>If we changed one thing for the next group, what should it be?</li></ol>
<p>Make written answers optional where possible. A required paragraph can encourage filler from someone who has nothing to add. Explain that a short, specific answer is welcome; respondents do not need to write an essay to be helpful.</p>
<h2>Introduce the form without influencing the answers</h2>
<blockquote><p>I’m reviewing this course before the next group begins. What should stay, and what needs to change? You can answer without a name or account. Please describe the lesson or activity rather than identifying people. Short answers are welcome, and you can skip questions. I’ll use the feedback privately to prioritise improvements.</p></blockquote>
<p>Use that introduction only for private-only collection. If you want quotes for marketing, ask through a separate, clearly explained process. Course evaluation is not an automatic testimonial request.</p>
<h2>Read comments without losing their meaning</h2>
<p>First read everything once. Then group observations by topic: instructions, examples, pace, practice, access or application. Keep each original comment available while you summarise so that you do not turn “more advanced examples” into “more examples for beginners”.</p>
<p>Separate the observation from the proposed solution. A learner might request longer lessons because demonstrations feel rushed. You could instead shorten the topic list and add a practice checklist. The request is evidence of a need, not necessarily the only suitable response.</p>
<p>Do not treat the volume of anonymous messages as a verified count of unique learners. Present the results as themes in the responses received, especially if participation is small or self-selected.</p>
<h2>A worked improvement example</h2>
<p>Suppose comments say that learners knew what the final assignment should achieve but did not know how to begin. A practical change is to add a blank starter file, a first-step demonstration and one complete worked example. Record the reason for that change, then ask the next group whether the starting instructions were usable.</p>
<p>That follow-up is more informative than announcing that feedback was “overwhelmingly positive”. Share what changed, what you are still investigating and what will remain the same.</p>
<p>For rating and single-choice questions alongside written feedback, use the broader <a href="/blog/course-evaluation-questions">course evaluation question bank</a>. To build the collection, start with <a href="/templates">a course feedback template</a> and keep only the prompts you will act on.</p>`
},
{
  title: 'How to Set Up an Anonymous Suggestion Box for Your Community',
  slug: 'anonymous-suggestion-box-for-your-community', category: 'Audience feedback',
  excerpt: 'Create a suggestion box that leads to decisions, not a forgotten pile of messages. Includes a short form, review process and copyable community updates.',
  seoTitle: 'Anonymous Suggestion Box: Setup, Questions and Follow-Up',
  seoDescription: 'Set up an anonymous suggestion box for an adult community with clear boundaries, useful questions and a fair way to review and respond to ideas.',
  imageAlt: 'An ivory suggestion box surrounded by small paper houses, with a coral idea card above its slot.',
  contentHtml: `
<p>An anonymous suggestion box gives community members a way to propose improvements without putting their name beside the suggestion. To make it useful, define what you are asking about, provide a simple submission link, assign someone to review responses and tell members how decisions will be communicated.</p>
<p>The most important design choice is not the colour of the box. It is what happens after someone sends an idea. A collection channel without a review routine can create an expectation of being heard that the organiser never fulfils.</p>
<h2>Give the box a specific purpose</h2>
<p>Start with a decision area you can influence: community events, onboarding, learning resources or communication. Do not ask for suggestions about a policy you have no authority to change without explaining that limitation.</p>
<p>For example, “Help us make monthly meetups easier to attend” is more useful than “Tell us anything”. The focused version can lead to changes in timing, format and preparation. The broad version may attract support requests, complaints and unrelated personal messages that need different handling.</p>
<p>Make the intended audience clear. This guide concerns adult creator and community groups, not regulated whistleblowing, safeguarding or emergency reporting. Those processes need appropriate specialist arrangements.</p>
<h2>Choose a simple collection format</h2>
<p>Use a single dedicated question when you need one suggestion per answer. Use a short feedback form when a little context will help you decide. A general inbox is suitable for ongoing open-ended messages, but it gives you less structure.</p>
<p>In UnsaidBox, a form can combine text, single-choice and rating questions. Start with <a href="/templates">the community suggestions template</a> or a blank form. Keep the first version short; a longer form is not automatically a better listening process.</p>
<h2>A practical suggestion form</h2>
<ol><li><strong>What would you like us to improve?</strong> A short text answer naming one issue.</li><li><strong>What would be different if we solved it?</strong> An optional text answer describing the benefit.</li><li><strong>What change would you suggest?</strong> Optional, because a person can notice a problem without knowing the solution.</li></ol>
<p>If you genuinely need a category, add a single-choice question with plain labels such as events, resources, communication and something else. Do not ask for role, location and attendance history unless they are needed; combinations of details can make people recognisable in a small group.</p>
<p>Keep complaints about individuals out of a public suggestion process. Provide a separate, suitable route for concerns that need an identified conversation, evidence or confidential handling.</p>
<h2>Explain privacy and publication separately</h2>
<blockquote><p>Use this box to suggest improvements to [community activity]. No name or account is needed to respond. Please leave out names and identifying details. We will review submissions privately every [cadence] and share decisions about themes, not individual messages. This is not an urgent support channel.</p></blockquote>
<p>Use private-only collection if that is your promise. If you intend to quote messages, request appropriate sharing permission and still review for identifying details. “Anonymous” does not make every story safe to publish. See <a href="/safety">UnsaidBox’s safety explanation</a> before writing your own assurance.</p>
<h2>Test before announcing</h2>
<p>Open the link in a signed-out browser. Check that the introduction is clear, required questions are justified and submitting does not require an owner account. Send a labelled test suggestion and verify it appears in the correct results page.</p>
<p>For forms, check the question structure and sharing setting before publication because these lock once published. If your first trial reveals a wording problem, create a corrected version rather than mixing answers to different questions into the same results.</p>
<h2>Use a fair review process</h2>
<p>Review suggestions against three practical questions: does this address a real obstacle, is it within the community’s purpose, and can we reasonably do something about it? These are editorial decision aids, not an automated scoring system.</p>
<p>Separate the need from the suggested fix. “Run every event twice” may reveal that the current time excludes some members. A recording, rotating schedule or occasional alternative session might address that need with less work.</p>
<p>Do not treat repeated anonymous submissions as verified votes from different people. Use them as a signal to investigate. Similarly, an idea mentioned once may deserve attention if it reveals a serious access barrier.</p>
<h2>Close the loop with three clear outcomes</h2>
<p>Give each theme a decision: doing now, investigating, or not doing with a reason. You can keep this in private notes and publish a short summary; the product does not need to expose every submitted idea.</p>
<blockquote><p>We heard that newcomers struggle to find the introductory resources. We are adding a single getting-started page this week. We are also reviewing the meetup time. We will not open a second chat group for now because it would split support across two places.</p></blockquote>
<p>That update demonstrates consideration without claiming every request will be accepted. Avoid identifying details or exact quotes when you promised private-only feedback.</p>
<h2>Keep the box healthy over time</h2>
<p>Review the invitation when the community changes. Remove outdated deadlines, pause collection when you cannot review it, and keep the alternative support route visible. If submissions become repetitive, publish the current decision before asking for more ideas.</p>
<p>A small, well-maintained suggestion box can be more useful than a large unmoderated public board. Start with one decision area, three questions and a date for your first update. Our <a href="/blog/how-to-create-an-anonymous-feedback-form">feedback form setup guide</a> covers the collection steps in more detail.</p>`
},
{
  title: '25 Training Feedback Questions to Ask After a Workshop',
  slug: 'training-feedback-questions-after-a-workshop', category: 'Question ideas',
  excerpt: 'Twenty-five workshop feedback prompts covering relevance, delivery, practice and application, plus separate immediate and follow-up evaluation templates.',
  seoTitle: '25 Training Feedback Questions for Workshops + Templates',
  seoDescription: 'Choose useful training feedback questions for the end of a workshop and a later follow-up. Separate satisfaction, learning and practical application.',
  imageAlt: 'A small workshop workspace with blank exercise cards, a notebook and a coral pencil.',
  contentHtml: `
<p>Good training feedback questions help you decide what to keep, what to improve and what support participants need next. Ask about the workshop experience immediately afterwards, then ask about real-world use after participants have had a reasonable opportunity to try the skill.</p>
<p>Do not treat a high satisfaction score as proof that learning happened. The CDC distinguishes learning from applying learning and explains that satisfaction alone does not determine training effectiveness in its <a href="https://www.cdc.gov/training-development/php/about/evaluate-training-measuring-effectiveness.html">training evaluation guidance</a>. Feedback is one source of evidence, not a substitute for an appropriate skills assessment.</p>
<h2>Use the right question at the right time</h2>
<p>Immediately after a workshop, people can describe the instructions, pace, examples and practice. They may be able to report confidence, but they cannot yet tell you how the skill worked in a situation they have not encountered.</p>
<p>At a later follow-up, ask what they attempted, what happened and what got in the way. Choose the interval based on the skill, not a universal rule. Someone learning a daily software task may try it tomorrow; someone learning a quarterly planning process may need longer.</p>
${questions('Five questions about relevance and expectations', [
 'How closely did the workshop match the topic described in the invitation?', 'Which part was most relevant to a task you need to do?', 'What did you expect to cover that was missing?', 'Which example felt least relevant to your situation?', 'What should we explain more clearly before people book?'])}
${questions('Five questions about delivery and access', [
 'How did the pace of the session feel?', 'Where did an instruction need to be clearer?', 'What made the materials easier or harder to use?', 'What helped you participate in the session?', 'What change to the format would improve your experience?'])}
<p>For pace, use choices such as too slow, about right and too fast, with a not-applicable option where appropriate. For accessibility, let people describe what would help without asking for medical information.</p>
${questions('Five questions about exercises and practice', [
 'Which exercise helped you understand the process?', 'Where did you need help to complete an activity?', 'How well did the practice task reflect something you might actually do?', 'What would have helped you get started sooner?', 'Which step would you like another chance to practise?'])}
${questions('Five questions about next steps immediately after training', [
 'What is the first task you intend to try using this skill?', 'How confident do you feel attempting that task without step-by-step help?', 'What could prevent you from trying it?', 'Which supporting resource would be most useful next?', 'What is one change we should make before running the workshop again?'])}
<p>Keep confidence separate from demonstrated ability. Someone may feel confident but make mistakes, or feel hesitant despite performing the task well. If you need to assess competence, design an appropriate practical exercise rather than relying on a self-rating.</p>
${questions('Five questions for a later follow-up', [
 'Have you had an opportunity to use what the workshop covered?', 'What task did you try?', 'Which part of the method was useful in practice?', 'What obstacle did you encounter when applying it?', 'What follow-up support would help you make another attempt?'])}
<h2>A short end-of-workshop template</h2>
<p>Select five questions rather than sending the entire bank. A balanced version asks about relevance, pace, useful practice, one barrier and one improvement. For a rating question, label the endpoints explicitly. “1 = not relevant, 5 = very relevant” is clearer than an unexplained row of numbers.</p>
<ol><li>How relevant was this workshop to the task you wanted to learn?</li><li>How did the pace feel?</li><li>Which exercise helped you most?</li><li>What could prevent you from trying the skill?</li><li>What should we change before the next workshop?</li></ol>
<p>These questions are original examples, not a validated measurement scale. Adapt them to your purpose and test the wording with someone unfamiliar with your course terminology.</p>
<h2>A separate follow-up invitation</h2>
<blockquote><p>Have you had a chance to use the workshop material? I’m interested in what you tried, what helped and what got in the way. It is fine if you have not had an opportunity yet. You can answer without giving your name. Please avoid details that identify clients, colleagues or other participants.</p></blockquote>
<p>Share a new form link for this round. Do not imply that anonymous answers from two rounds can be matched to the same person. If matched before-and-after data is essential, you need a different, clearly explained evaluation design.</p>
<h2>How to interpret what comes back</h2>
<p>Look for patterns without flattening important differences. “Too fast” from a beginner and “too slow” from an experienced learner may indicate that the invitation did not clearly state the intended level. The answer may be a prerequisite guide or separate sessions, not an average pace that suits nobody.</p>
<p>When people report difficulty applying a method, distinguish between missing understanding and a missing opportunity. Lack of software access, manager approval or time can prevent use even when the lesson itself was clear.</p>
<p>Anonymous submissions are not verified unique participants, and respondents may not represent everyone who attended. Report themes honestly and use them alongside appropriate observation or assessment.</p>
<h2>Make one visible improvement</h2>
<p>Choose a concrete change: clearer setup instructions, a downloadable checklist, a more realistic exercise or more practice time. Tell participants what you decided and why. “We added a starter file because people lost time setting up” is a more useful response than “we value your feedback”.</p>
<p>Build a short private-only evaluation using <a href="/templates">a workshop feedback template</a>. For longer courses, see the <a href="/blog/course-evaluation-questions">course evaluation question bank</a> and choose the questions that match the learning experience.</p>`
},
{
  title: '30 Questions to Ask Your Followers for Honest Feedback',
  slug: 'questions-to-ask-followers-for-feedback', category: 'Audience feedback',
  excerpt: 'Thirty decision-focused questions for creators who want to improve content, resources and community experiences—not just collect compliments.',
  seoTitle: '30 Questions to Ask Your Followers for Honest Feedback',
  seoDescription: 'Ask followers useful feedback questions about content, clarity, formats and community. Includes a short survey and examples of turning answers into decisions.',
  imageAlt: 'Three neat stacks of audience feedback cards beside a small editorial planning notebook.',
  contentHtml: `
<p>If you want honest feedback from followers, ask about a specific experience and a decision you can change. “Which explanation was difficult to follow?” gives you more to work with than “Do you like my content?” The second invites a compliment or a general judgement; the first points towards an improvement.</p>
<p>Use the thirty questions below as a menu. Choose one for a focused post or a few for a short form. These prompts are for improving your work, rather than entertainment or personal confessions.</p>
<h2>Choose the decision before the question</h2>
<p>Suppose you are choosing between making shorter tutorials and adding downloadable examples. Ask where people lose the thread and what helps them practise. Do not simply ask which format sounds attractive: stated preferences and actual use are not the same thing.</p>
<p>A useful feedback cycle has a decision, a question, a collection window and a follow-up. Without that structure, you may receive many requests but have no fair way to decide what to do next.</p>
${questions('Five questions about why people follow you', [
 'What were you hoping to learn when you first followed this page?', 'What task do you usually want help with when you open my content?', 'Which topic brought you here?', 'What kind of problem would you expect this page to help solve?', 'What is one useful thing you found here that you were not expecting?'])}
${questions('Five questions about clarity', [
 'Which recent explanation needed another example?', 'What term do I use without explaining enough?', 'Where do I tend to skip a step?', 'Which explanation was easiest to put into practice?', 'What would make the instructions easier to follow on a phone?'])}
${questions('Five questions about format and pace', [
 'When you stop watching a tutorial, what usually causes it?', 'Which part of a longer post do you find most useful?', 'What information belongs in a checklist rather than a video?', 'When does a short answer leave you needing more detail?', 'What would help you return to a resource you saved?'])}
${questions('Five questions about applying the content', [
 'What have you tried after reading or watching something here?', 'What stopped you from completing that attempt?', 'Which example would be closer to your own situation?', 'What supporting resource would help you take the next step?', 'What is one task you can do now that you could not do before?'])}
${questions('Five questions about the community experience', [
 'What makes you comfortable asking a question here?', 'What makes it difficult to join the conversation?', 'Which recurring community activity is useful to you?', 'What should a newcomer be able to find more easily?', 'What is one change that would make this space more welcoming?'])}
${questions('Five questions about what to do next', [
 'Which unresolved question should I explain next?', 'What topic have I repeated enough for now?', 'What would you like me to demonstrate from beginning to end?', 'If I improved one existing resource, which should it be?', 'What should I keep doing even if I change other things?'])}
<h2>Turn the bank into a short feedback form</h2>
<p>For a first round, choose a question about the audience’s goal, a question about a recent experience and a question about the next improvement. That is enough to begin a useful conversation without demanding a detailed review of everything you have ever published.</p>
<blockquote><p>I’m planning the next set of resources. What are you trying to learn, where has my explanation left a gap, and what should I improve first? You can answer without a name or account. Please do not include identifying details. I’ll review the feedback privately and share the changes I choose to make.</p></blockquote>
<p>Use private-only collection if you promise private review without individual sharing. If you want to share specific answers, explain that separately and respect the submission’s permission setting.</p>
<h2>Avoid questions that steer people towards praise</h2>
<p>“How valuable are my amazing tutorials?” embeds the conclusion in the question. “What was useful, if anything?” leaves room for a different experience. “Should I make more videos and improve the group?” combines two decisions; split it into two prompts.</p>
<p>Keep the language familiar. You may think in terms of a content funnel or a learning pathway, but followers may simply want to find the next lesson. Use their task as the reference point, not your internal marketing vocabulary.</p>
<h2>What to do with conflicting answers</h2>
<p>Do not average away a real difference in needs. If beginners want slower explanations and experienced followers want advanced material, clarify the level at the start of each resource. You might create a beginner sequence while keeping occasional advanced posts, rather than trying to make every post serve everyone.</p>
<p>Look for the underlying obstacle. “Make shorter videos” might mean the introduction is too long, not that the demonstration needs to be cut. Check the detail before choosing a fix.</p>
<h2>Feedback is evidence, not a vote on your whole business</h2>
<p>Anonymous responses can be candid, but they are self-selected and not necessarily from unique people. A request is not a purchase commitment. Do not announce that a particular percentage of your entire audience wants something based on a small anonymous inbox.</p>
<p>Use the responses to choose a modest experiment: rewrite one explanation, add one checklist or reorganise one resource page. Then ask whether the change helped. This keeps decisions reversible and gives the audience a visible result.</p>
<h2>Publish a follow-up people can recognise</h2>
<blockquote><p>You told me it was difficult to find the starting point. I have grouped the beginner resources into a clear sequence and added a short checklist. I’m still reviewing requests for more advanced examples. Thank you for helping me choose what to fix first.</p></blockquote>
<p>Start with <a href="/templates">a feedback form</a> if you need several answers, or use a dedicated question link for one prompt. The <a href="/blog/how-to-create-an-anonymous-feedback-form">setup guide</a> explains how to test the collection and write clear privacy wording.</p>`
},
{
  title: 'How to Collect Anonymous Questions from Facebook and WhatsApp',
  slug: 'anonymous-questions-facebook-whatsapp', category: 'Creator guides',
  excerpt: 'Keep your audience on the social channels they know while using a simple link to collect questions privately. Includes Facebook and WhatsApp invitation templates.',
  seoTitle: 'Collect Anonymous Questions from Facebook and WhatsApp',
  seoDescription: 'Share an anonymous question link on Facebook or WhatsApp, test the mobile experience and answer selected questions on your usual social channel.',
  imageAlt: 'A phone showing a blank message card connected by a coral ribbon to an ivory collection box.',
  contentHtml: `
<p>You can collect anonymous questions from a Facebook or WhatsApp audience by sharing a separate submission link. People open the link, write their question and submit without attaching a name to the message. You review the questions privately and answer selected topics on the social channel where your audience already follows you.</p>
<p>The link is the collection method. It does not turn a Facebook comment or WhatsApp reply into an anonymous message. If somebody answers directly in a social conversation, that platform’s normal identity and visibility rules still apply.</p>
<h2>Choose the right link before writing the post</h2>
<p>For “Ask me a question about this topic”, copy your personal UnsaidBox ask link. For “Tell me your answer to this question”, create that question and copy its dedicated answer link. For a structured evaluation, use a form link.</p>
<p>This distinction matters in a comment section. If your post asks “What is the hardest part of starting a course?”, the link should open that prompt and an answer field. A general inbox may lead people to send answers as unrelated questions, making the collection harder to manage.</p>
<p>Our <a href="/blog/ask-me-an-anonymous-question-link">anonymous link guide</a> explains the three collection types. Never share a dashboard URL; it is for you, not your respondents.</p>
<h2>A Facebook invitation for questions</h2>
<blockquote><p>I’m answering questions about [topic] this week. What would you like me to explain? Use this link to send a question without giving your name or creating an account: [ask link]. Please leave out identifying details. I’ll review submissions privately and answer selected topics here on my profile.</p></blockquote>
<p>Add accurate sharing-permission wording. If you only intend to answer themes without displaying the original messages, say so. If you want to share individual responses, use the appropriate collection setting and review each message before publication.</p>
<p>Put the link somewhere easy to find in the invitation. If you also place it in a comment, repeat the purpose beside it so somebody arriving through a shared post understands what it opens. Follow the rules of any group where you post; a useful tool is not a reason to disregard a group’s promotion policy.</p>
<h2>A WhatsApp invitation for a community</h2>
<blockquote><p>For our next Q&A, send your questions about [topic] using this link: [ask link]. You do not need to reply in the group or tell us which question is yours. Please leave out names and private details. We’ll answer selected topics in [announced place] on [date and timezone].</p></blockquote>
<p>Share only where the invitation is welcome. Do not repeatedly message people who have not asked to participate. If the question is sensitive, avoid posting a list of people you believe have or have not responded.</p>
<p>For a one-question discussion, change the wording to “Answer this question” and use the dedicated answer link. For example: “What would make the next workshop easier to follow?” Explain whether you will summarise the responses privately or share permitted individual answers.</p>
<h2>Test the actual tap-through experience</h2>
<ol><li>Copy the public collection link from UnsaidBox.</li><li>Open it while signed out on a phone.</li><li>Check that the correct question or inbox form appears.</li><li>Check that collection is open and the privacy wording is clear.</li><li>Send one clearly labelled test response.</li><li>Confirm it reaches the correct private collection.</li></ol>
<p>Then test the link from the social app where you will share it. An in-app browser can behave differently from your desktop browser. If a device cannot complete submission, check the connection and try the phone’s normal browser; do not ask the person to send a sensitive answer publicly as a workaround.</p>
<h2>Keep collection and public visibility separate</h2>
<p>A question can accept answers through its active link without appearing in public listings. You decide which permitted content to make visible. Publishing a social invitation does not require you to publish every response you receive.</p>
<p>That separation is useful for Q&A preparation. You can gather questions before a session, remove identifying details from your own thematic summary and prepare thoughtful answers rather than reacting to a live stream of unreviewed messages.</p>
<h2>Share answers without exposing the inbox</h2>
<p>For eligible responses, use UnsaidBox’s share-card tools instead of taking a screenshot of your dashboard. Review the card, download it or use device sharing where supported, then attach it to your social post. You still choose the destination and complete the social posting step.</p>
<p>UnsaidBox does not automatically publish comments to your Facebook profile or send WhatsApp messages on your behalf through this workflow. Do not promise that pressing a share button silently posts to every platform.</p>
<p>If a message is private-only or contains recognisable details, keep it out of share cards. A short original answer to a general theme can be safer than reproducing a sensitive story.</p>
<h2>Use a follow-up that rewards participation</h2>
<p>After the collection window, say where the answers are and what topics remain. A creator could publish one answer each day for a week, but only commit to a cadence they can maintain. If a question is outside your expertise, explain that rather than improvising personal, medical or legal advice.</p>
<p>Low participation does not necessarily mean the tool failed. Check the link, topic and invitation first. “What part of the first lesson needs another example?” may be easier to answer than “Ask me anything”.</p>
<p><a href="/start">Create your own box</a>, test one link and try a focused invitation with the audience you already have.</p>`
},
{
  title: '30 Relationship Questions for Your Next Audience Q&A',
  slug: 'relationship-questions-for-audience-qa', category: 'Question ideas',
  excerpt: 'Thirty thoughtful prompts for adult audience discussions about communication, values and boundaries, with guidance on avoiding intrusive or identifiable stories.',
  seoTitle: '30 Relationship Questions for an Adult Audience Q&A',
  seoDescription: 'Find thoughtful relationship questions about communication, values, boundaries and everyday care, plus a safer way to invite anonymous audience answers.',
  imageAlt: 'Two abstract paper speech bubbles facing each other above a small coral heart on ivory.',
  contentHtml: `
<p>Relationship questions can start thoughtful audience conversations when they invite reflection rather than pressure people into confessions. Ask about values, communication and everyday experiences, give people permission to skip, and review answers before sharing them.</p>
<p>These thirty original prompts are for adult audiences. They are discussion starters, not counselling, diagnostic questions or a way to assess whether a specific relationship is healthy. Avoid asking people to identify partners or describe private disputes in a public setting.</p>
<h2>Set a respectful frame first</h2>
<p>Tell participants that they can answer generally or hypothetically. Someone should not need to reveal their relationship status, sexual history, experience of harm or a partner’s private information to join a conversation.</p>
<p>Make your role clear too. If you are hosting a discussion rather than providing professional support, say so. You can explore different perspectives without telling an unknown person what major decision to make from a short anonymous message.</p>
${questions('Five questions about communication', [
 'What helps you feel heard during an important conversation?', 'How do you prefer someone to raise a difficult subject?', 'What makes an apology feel meaningful to you?', 'What is a small sign that someone is listening carefully?', 'How can people disagree without turning the conversation into a competition?'])}
<p>These prompts focus on practices rather than assigning blame. When sharing answers, avoid framing one preference as the only mature or correct way to communicate. Context matters, and a short response rarely provides all of it.</p>
${questions('Five questions about values and expectations', [
 'Which shared value matters most to you in a close relationship?', 'What expectation should people discuss earlier rather than assume?', 'What does reliability look like in everyday life?', 'Which difference between people can be enriching rather than a problem?', 'What does fairness mean when two people have different responsibilities?'])}
${questions('Five questions about boundaries and independence', [
 'What is a respectful way to ask for time alone?', 'How can someone support a goal without taking it over?', 'What helps people maintain friendships outside a relationship?', 'Which everyday boundary is easier to respect when it is explained clearly?', 'How can people discuss privacy without treating it as secrecy?'])}
<p>Do not use these questions to normalise control or pressure someone to justify a boundary. If a discussion turns towards threats, coercion or immediate danger, stop treating it as audience entertainment and direct the person towards appropriate local support.</p>
${questions('Five questions about everyday care', [
 'What small action makes you feel appreciated?', 'How can someone show support during an ordinary stressful week?', 'Which shared routine can make life feel more connected?', 'What is a thoughtful way to celebrate a small achievement?', 'What kind of help is useful only when someone asks first?'])}
${questions('Five questions about learning and change', [
 'What have you learned about expressing your needs clearly?', 'Which relationship expectation has changed as you have grown older?', 'What does making room for another person’s growth look like?', 'What is one lesson from friendship that also helps other relationships?', 'How can people revisit an old agreement when circumstances change?'])}
${questions('Five lighter questions for a warm opening', [
 'What low-cost activity makes a good shared afternoon?', 'Which small tradition would you enjoy creating with someone?', 'What is your favourite way to show appreciation without buying a gift?', 'Which everyday task is more enjoyable with company?', 'What makes a thoughtful message different from a generic one?'])}
<h2>Choose one theme instead of all thirty questions</h2>
<p>A discussion about everyday care has a different emotional weight from one about boundaries. Do not start with a light prompt and unexpectedly turn the session into an invitation to disclose painful experiences. Choose the scope in advance and keep the invitation consistent.</p>
<p>For a first session, ask one lighter question, then one about communication. Read what people actually submit before deciding whether a deeper follow-up is appropriate. Participation is optional; silence is not evidence that someone has something to hide.</p>
<h2>A copyable anonymous invitation</h2>
<blockquote><p>Today’s question is [prompt]. You can answer generally or hypothetically; you do not need to share your personal history. No name or account is needed. Please leave out names and details that could identify anyone. I’ll review the answers before sharing any permitted responses. This is an audience discussion, not professional relationship advice.</p></blockquote>
<p>Use a dedicated answer link so the prompt appears beside the answer field. A general inbox is better when people are asking you their own questions. See the <a href="/blog/ask-me-an-anonymous-question-link">link guide</a> if you are unsure which to use.</p>
<h2>Review for recognisable details, not just names</h2>
<p>A job title, exact date, unusual incident or small community reference can make a story recognisable even without a name. Do not publish a response simply because the sender selected a sharing permission. Other people mentioned in the story may not have agreed to be discussed.</p>
<p>When a response is too identifying, keep it private. If you discuss a broad theme in your own words, label it as a general discussion rather than implying it is a verbatim anonymous quote.</p>
<h2>Respond without turning vulnerability into a spectacle</h2>
<p>Avoid guessing who wrote a message, inviting followers to investigate or ranking personal experiences for entertainment. You can thank people for contributing and reflect on themes without selecting the most dramatic story.</p>
<p>If someone requests urgent help, a public Q&A is not the right support route. Do not promise continuous monitoring or private follow-up when an anonymous message gives you no contact details. Keep <a href="/safety">safety guidance</a> visible and stay within what you can responsibly offer.</p>
<p>A successful session leaves participants with something useful to consider, not a feeling that they had to expose themselves to be heard. Start with one thoughtful question and a clear promise you can keep.</p>`
},
{
  title: 'How to Share Anonymous Responses Without Taking Screenshots',
  slug: 'share-anonymous-responses-without-screenshots', category: 'Product guides',
  excerpt: 'Turn eligible responses into clean share cards, handle longer messages and post them to social channels without exposing your dashboard or private feedback.',
  seoTitle: 'Share Anonymous Responses Without Taking Screenshots',
  seoDescription: 'Use UnsaidBox share cards to download and share eligible anonymous responses. Review permissions, handle long text and keep private inbox details out of posts.',
  imageAlt: 'A single clean response card lifted from a layered dashboard-like stack into a simple phone frame.',
  contentHtml: `
<p>You do not need to screenshot your inbox to share an anonymous response. In UnsaidBox, eligible messages and answers can be opened in the share-card tools, presented as a clean image and downloaded for posting on your social channel. Where your device supports file sharing, you can also use its share sheet.</p>
<p>The important first step is permission, not design. Private-only responses must remain private. Even a shareable response needs a review for identifying details, misleading context and information about other people.</p>
<h2>Why a share card is better than a dashboard screenshot</h2>
<p>A dashboard screenshot can include navigation, moderation controls, account information or another message accidentally visible at the edge. It also tends to produce small text and awkward cropping on a phone.</p>
<p>A purpose-built card isolates the response and gives it a deliberate layout. It does not remove the owner’s responsibility to check the words. The safest-looking design can still expose somebody if the content includes a recognisable story.</p>
<h2>Check whether the response is eligible</h2>
<p>Open the message or response in your dashboard and look for the share-card action. In-app sharing is not available for private-only feedback. For forms, the collection’s sharing setting is part of the promise made when people submitted; it is not something to reinterpret after seeing a useful quote.</p>
<p>If you cannot see a share action, check the original sharing permission and the type of response. Do not bypass the restriction by taking a screenshot. If an eligible response still cannot be shared, contact support with the page and issue—not a public copy of someone’s private message.</p>
<h2>Create and review the card</h2>
<ol><li>Open the eligible response from the inbox, question responses or form results.</li><li>Choose the share-card action.</li><li>Select from the presentation options currently available in the share studio.</li><li>Read the complete preview, including any question context.</li><li>For a long response, check every card page before exporting.</li><li>Download the card, or use device sharing where supported.</li></ol>
<p>Keep the original meaning intact. Do not crop away a sentence that changes the point, or present a summary as the sender’s exact words. If you need to discuss only a theme, write your own labelled summary instead of manufacturing a quote.</p>
<h2>Handle long responses without tiny text</h2>
<p>A long answer may need more than one card. Review the sequence so a reader can follow it in order, and avoid sharing only a middle page that lacks essential context. If the destination makes multi-image reading awkward, consider a shorter thematic discussion instead of forcing the whole story into one image.</p>
<p>Check the exported result at phone size. A card that is legible on a large monitor can still be tiring in a social feed. The aim is a readable response, not simply fitting every character into a rectangle.</p>
<h2>Post to Facebook, WhatsApp or another channel</h2>
<p>Downloading creates an image file; it does not publish it. Attach the file to the social post, comment or message where you want the conversation to happen. Device sharing opens the destinations supported by that device, and you still complete the destination’s posting steps.</p>
<p>UnsaidBox does not automatically comment on your Facebook profile through this workflow. If a browser does not support file sharing, use download and attach the image manually. The app should not claim a post was published merely because a share sheet opened.</p>
<p>Add a short caption that explains the question and your response. If you want others to contribute, include the correct dedicated answer link. For an open invitation to ask you questions, use your personal ask link instead.</p>
<h2>A caption that adds value</h2>
<blockquote><p>One response to this week’s question raised an important point about getting started. My suggestion is to choose one small task and repeat it before adding more tools. What has helped you begin? You can answer anonymously here: [answer link].</p></blockquote>
<p>Adapt that to what the response actually says. Do not imply a collection represents the entire audience or that each anonymous message comes from a different person. Be particularly careful when discussing sensitive experiences.</p>
<h2>Make image-based posts more accessible</h2>
<p>Where the destination supports image descriptions, add a useful description or the relevant response text after confirming it is appropriate to share. Do not rely on colour alone to distinguish the question from the answer. A short explanatory caption also helps people understand why you are sharing the card.</p>
<p>If the message is too sensitive to reproduce as text, reconsider whether it should be shared as an image at all. An image is not a privacy barrier; people can copy, photograph or transcribe it.</p>
<h2>What happens if you hide the response later?</h2>
<p>UnsaidBox visibility controls affect UnsaidBox’s public surfaces. They cannot recall an image you already downloaded, a social post you published or a copy somebody else saved. Review carefully before export, and remove external posts yourself if you later decide they should not remain public.</p>
<p>Likewise, do not assume a share card is automatically a public thread. The card, the collection link and public visibility are separate things. Choose each deliberately.</p>
<h2>A final pre-share checklist</h2>
<ul><li>The response permits sharing.</li><li>The text does not expose the sender or another person.</li><li>The question and answer are not taken out of context.</li><li>Every page is readable and in the intended order.</li><li>The caption adds a useful answer or next step.</li><li>The destination is the one you intended.</li></ul>
<p>For help collecting the right kind of response first, read <a href="/blog/ask-me-an-anonymous-question-link">the anonymous link guide</a>. Good sharing begins with a clear invitation and a promise you honour.</p>`
},
{
  title: 'Anonymous vs Confidential Feedback: What’s the Difference?',
  slug: 'anonymous-vs-confidential-feedback', category: 'Privacy and safety',
  excerpt: 'Understand the difference between identity, access and publication before promising privacy. Includes practical examples and wording for an anonymous feedback invitation.',
  seoTitle: 'Anonymous vs Confidential Feedback: A Practical Guide',
  seoDescription: 'Learn how anonymous and confidential feedback differ, why removing names is not enough, and how to explain collection and sharing without overpromising.',
  imageAlt: 'An unlabelled message card beside a closed envelope, separated by a quiet navy divider.',
  contentHtml: `
<p>Anonymous feedback aims to avoid attaching an identifiable sender to a response. Confidential feedback may be linked to a known person, but access and use are restricted. The practical question is not just “is there a name field?” It is who can identify the person, who can read the content and what happens to it afterwards.</p>
<p>These terms are often used loosely. Before inviting feedback, explain the actual collection process in plain language. This guide helps creators and adult communities make accurate promises; it is not legal advice or a certification of any particular survey’s compliance.</p>
<h2>Identity, access and publication are different decisions</h2>
<p>Think about three separate dimensions. Identity concerns whether a response is connected to a person. Access concerns who can read it. Publication concerns whether the words are shared beyond the original recipient.</p>
<p>A message can omit a name but be publicly visible. A named support request can remain private. An anonymous submission can be read by an owner and authorised service administrators without being published to an audience. None of those situations should be described by a vague promise that “everything is private”.</p>
<h2>Three everyday examples</h2>
<h3>A name-free course feedback form</h3>
<p>The form asks no name or email and the owner receives no sender account with the answer. That supports anonymous collection to the owner. However, a comment mentioning a unique project or incident might still reveal who wrote it. The owner should avoid asking for unnecessary identifying detail.</p>
<h3>A confidential support email</h3>
<p>The support team can see the sender’s email and may need account details to resolve the issue. It is not anonymous. The relevant promise concerns who can access the email, how it will be used and whether it will be shared further.</p>
<h3>A public anonymous quote</h3>
<p>The quote has no author name, but readers may recognise the event described. Removing the name does not automatically make publication harmless. Permission to share and a review of the content still matter.</p>
<h2>Why removing a name may not be enough</h2>
<p>The UK Information Commissioner’s Office explains that identifiability depends on context and other available information, not only direct identifiers. See its guidance on <a href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/how-do-we-ensure-anonymisation-is-effective/">assessing effective anonymisation</a>.</p>
<p>For a practical example, imagine a six-person workshop where only one attendee demonstrated a particular project. A response describing that demonstration may be recognisable to the group. Asking for an exact role, date and location can increase that risk even when each detail seems ordinary on its own.</p>
<p>You can reduce unnecessary exposure by asking about the experience rather than the person, avoiding small identifying categories, and summarising themes instead of publishing detailed stories. These are practical precautions, not a guarantee that re-identification is impossible.</p>
<h2>What UnsaidBox’s anonymous collection means</h2>
<p>Anonymous submissions do not have a sender name, email address or account attached for the recipient. Respondents do not need an account to submit through an active public collection link.</p>
<p>That is not a promise that technical connection information never exists. Server and infrastructure logs can contain connection information, and authorised administrators with database access can access stored content. A sender can also identify themselves through what they write.</p>
<p>Read the current <a href="/privacy">privacy policy</a> and <a href="/safety">safety explanation</a> before describing the service to your audience. Do not promise absolute untraceability, end-to-end encryption or that no administrator could ever access a response unless the service actually provides those guarantees.</p>
<h2>How to write a clear invitation</h2>
<p>Answer four questions in your introduction: what you collect, who reads it, whether individual answers may be shared, and what people should leave out. Keep the wording consistent with your settings and behaviour.</p>
<blockquote><p>You can answer without providing your name or creating an account. I will read the responses privately to improve [specific activity]. Please leave out names and identifying details about yourself or others. This collection is private-only, and I will report general themes rather than quote individual answers publicly.</p></blockquote>
<p>Use that wording only when you have selected private-only collection and intend to honour it. If you want public sharing, explain that clearly before submission instead of changing the expectation after receiving a compelling answer.</p>
<h2>When confidential feedback is the more honest choice</h2>
<p>If you need to investigate an account problem, contact someone for clarification or give an individual response, anonymous collection may not fit the job. Offer a separate support route where people understand they are identifying themselves.</p>
<p>Do not add a required email field to an “anonymous” form merely to make follow-up easier. If identity is necessary, say so. If it is optional, explain why you request it and how it changes the privacy of that response.</p>
<p>For regulated reporting, safeguarding, workplace complaints or sensitive professional matters, use an appropriate process and obtain qualified advice where needed. A general audience feedback tool should not be presented as a substitute.</p>
<h2>Questions to ask before choosing a feedback tool</h2>
<ul><li>Does the respondent need to sign in?</li><li>What identity or technical information can the recipient see?</li><li>Who else can access stored content?</li><li>Can the owner publish answers, and what permission is requested?</li><li>How are retention, deletion and support explained?</li><li>What happens if someone includes identifying information in the text?</li></ul>
<p>Look for answers in the actual product and policies, not just the word “anonymous” on a marketing page. Privacy is easier to respect when everyone understands the boundaries before they write.</p>
<p>For a practical setup, use our <a href="/blog/how-to-create-an-anonymous-feedback-form">anonymous feedback form guide</a> and choose the smallest collection that meets your purpose.</p>`
},
{
  title: 'How to Moderate Anonymous Questions and Responses Safely',
  slug: 'moderate-anonymous-questions-and-responses', category: 'Privacy and safety',
  excerpt: 'A practical moderation routine for creators: review privately, distinguish criticism from abuse, protect identities and share only what is appropriate.',
  seoTitle: 'How to Moderate Anonymous Questions and Responses Safely',
  seoDescription: 'Build a moderation routine for anonymous questions: clear boundaries, private review, sharing checks, difficult messages and realistic follow-up promises.',
  imageAlt: 'A small stack of message cards passing through a navy review frame with one approved coral card.',
  contentHtml: `
<p>Moderating anonymous questions means reviewing submissions before sharing them, applying consistent boundaries and protecting people mentioned in the content. You do not need to publish everything to prove you welcome honest feedback. You do need to distinguish uncomfortable criticism from material that is abusive, identifying or unsafe to amplify.</p>
<p>This guide is for adult creator audiences and communities. It is not a substitute for a formal safeguarding, emergency or regulated reporting process. Set expectations that match your capacity and do not promise continuous monitoring if you cannot provide it.</p>
<h2>Write the boundaries before opening collection</h2>
<p>Explain which topics belong in the box, what you will not publish and where urgent or account-specific requests should go. A short, visible policy is more useful than a long list nobody sees until after submitting.</p>
<blockquote><p>Questions and constructive criticism are welcome. Please do not include names, contact details or information that identifies other people. I review submissions privately and may decline to share content that is abusive, outside scope or unsafe to publish. This box is not monitored continuously and is not an emergency support service.</p></blockquote>
<p>Pair this with accurate sharing-permission wording. A moderation policy does not override a private-only promise. Something can be suitable for your private consideration and still be unsuitable for public quotation.</p>
<h2>Use a two-pass review</h2>
<p>In the first pass, look for immediate concerns: threats, private information, targeted abuse, allegations about identifiable people and requests requiring specialist support. Do not begin making share cards before reading the full submission.</p>
<p>In the second pass, decide what is useful and within scope. Group repeated questions into themes, note issues that need an answer and separate requests that require an identified support conversation. Keep this as a private editorial process; no automatic classification is implied.</p>
<h2>Distinguish criticism from abuse</h2>
<p>“The instructions were confusing and I could not finish the exercise” is criticism you can investigate. “The course was not worth the price” may also be legitimate feedback, even if it is unpleasant to read. Neither becomes abusive simply because it is negative.</p>
<p>Threats, personal attacks and attempts to expose someone are different. You can decline to amplify them while still addressing a general underlying issue where appropriate. Do not post an abusive message merely to invite the audience to attack its presumed author.</p>
<p>A useful test is whether you can describe the issue without repeating the attack. If the actionable issue is unclear, you are not obliged to create a public spectacle around the message.</p>
<h2>Check for identity clues beyond names</h2>
<p>Review roles, workplaces, unusual events, dates, locations and details that a small community may recognise. Also consider the people described in a response, not just the sender. A person can consent to sharing their own words without having permission to expose someone else’s private life.</p>
<p>When the risk is unclear, keep the message private. If you discuss a broad theme, write an original summary and label it as such. Do not silently alter a quote until it appears to say something the sender did not mean.</p>
<h2>Choose the right outcome for each submission</h2>
<ul><li><strong>Answer privately in your planning:</strong> use the feedback to improve something without reproducing it.</li><li><strong>Answer a general theme publicly:</strong> explain the issue in your own words without identifiable detail.</li><li><strong>Share an eligible response:</strong> only after checking permission, context and safety.</li><li><strong>Hold for review:</strong> investigate before making a claim or decision.</li><li><strong>Decline or remove:</strong> use the available controls for material that does not belong.</li></ul>
<p>These are moderation decisions, not promises that an anonymous sender can receive a private reply. If a response has no contact information, you may have no way to ask that person for clarification.</p>
<h2>Handle serious concerns without improvising</h2>
<p>If a submission appears to describe immediate danger, do not treat it as ordinary audience content. Follow an appropriate safety process and use relevant local emergency or specialist support channels where warranted. Avoid promising confidentiality or a rescue response you cannot provide.</p>
<p>Do not ask the public to identify the sender. Do not publish sensitive details to solicit crowdsourced investigation. The right action depends on the circumstances and your responsibilities; seek qualified guidance rather than treating a general blog checklist as a complete procedure.</p>
<p>For platform-related concerns, use <a href="/contact">UnsaidBox support</a> and provide only the information needed to explain the issue. Keep the <a href="/safety">safety guidance</a> accessible to your audience.</p>
<h2>Remember that visibility controls have boundaries</h2>
<p>Collecting through an active link is separate from making a question or response public. Keep content hidden until you have made a deliberate decision. Private-only submissions should not be exported or shared through workarounds.</p>
<p>Hiding something in UnsaidBox does not delete a card already posted to Facebook, an image saved to a phone or a screenshot made by someone else. Review before sharing and take responsibility for removing your external posts if needed.</p>
<h2>Create a sustainable review routine</h2>
<p>Choose a realistic review time, keep a short note of unresolved themes and pause collection if you cannot manage the volume. You can announce that questions will be considered for a later session rather than leaving people expecting an immediate response.</p>
<p>Use consistent standards regardless of whether a message praises or criticises you. A positive testimonial containing identifying details needs review too. Explain important decisions at the level of policy or theme without exposing private submissions.</p>
<h2>Close the loop without exposing people</h2>
<blockquote><p>Several submissions raised confusion about where to start. I have added a clearer introduction and a short checklist. I am keeping individual messages private, but I wanted you to know that the feedback led to a change.</p></blockquote>
<p>A respectful moderation process protects the opportunity for honest questions. Start with clear limits, review privately, share selectively and never confuse an anonymous message with permission to publish everything it contains.</p>`
},
];
// Keep the first expansion layout as an exact migration precondition, so the
// final structural pass never overwrites an unrelated CMS edit.
export const previousExpandedArticles = originalRemainingArticles.map(article => {
  const finalParagraph = article.contentHtml.lastIndexOf('<p>');
  if (!articleDepth[article.slug] || finalParagraph < 0) throw new Error('Missing editorial expansion');
  return { ...article, contentHtml: article.contentHtml.slice(0, finalParagraph) + articleDepth[article.slug] + article.contentHtml.slice(finalParagraph) };
});
export const remainingArticles = originalRemainingArticles.map(article => {
  const closingSection = article.contentHtml.lastIndexOf('<h2>');
  if (!articleDepth[article.slug] || closingSection < 0) throw new Error('Missing editorial expansion');
  return { ...article, contentHtml: article.contentHtml.slice(0, closingSection) + articleDepth[article.slug] + article.contentHtml.slice(closingSection) };
});
export const revisedCourseArticle = { ...launchArticles[2], contentHtml: launchArticles[2].contentHtml + courseEvaluationDepth };
