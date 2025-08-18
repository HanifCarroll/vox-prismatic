## System Philosophy

Think of your system in four distinct phases, like a factory production line:

**Phase 1: Input & Processing (The "Content Mine")**

- **Goal:** Turn raw conversations into structured, high-potential content ideas.
- **Steps:**
    1. **Source & Clean:** Have a client call, get it transcribed, and run **Step 0: Transcript Cleaning**.
    2. **Extract & Analyze:** Run **Step 1: Insight Mining** on the cleaned transcript to produce "Atomic Insights."

**Phase 2: Creation (The "Assembly Line")**

- **Goal:** Convert the best Atomic Insights into platform-specific posts.
- **Steps:**
3. **Prioritize:** Select a high-scoring Atomic Insight from your "mine."
4. **Generate:** Run **Step 2: Post Generation** using the selected insight and your Voice Guide to draft the posts.

**Phase 3: Distribution (The "Shipping Department")**

- **Goal:** Get your content in front of your audience consistently.
- **Steps:**
5. **Review & Refine:** Perform a final human check on the drafted posts. Tweak wording, fix any AI weirdness. This is your Quality Control.
6. **Schedule:** Load the finalized posts into a scheduling tool (like Buffer, Hypefury, or even just a Notion calendar).

**Phase 4: Review & Repurpose (The "R&D Lab")**

- **Goal:** Learn from what works and reuse your best material.
- **Steps:**
7. **Track Performance:** After a post has been live for a week, log its performance (likes, comments, etc.).
8. **Identify Winners:** Note which topics, hooks, and formats resonate most.
9. **Repurpose:** A top-performing LinkedIn post can become a new X thread, a section of a newsletter, or a talking point for your next call. This feeds back into Phase 1.

## Weekly System

### Your Weekly Workflow in Notion

Here is a step-by-step guide on how to use this system, for example, during a 2-hour "Content Sprint" each week.

**Part 1: Mine for Gold (30 mins)**

1. Open your `🎙️ Transcripts` database. Find a transcript with the status `Needs Processing`.
2. Run it through your **Step 0 (Cleaning)** and **Step 1 (Insight Mining)** prompts.
3. For each "Atomic Insight" the LLM generates, create a new page in your `💡 Atomic Insights` database.
    - Copy-paste the `Insight Title` into the title field.
    - Fill out the `Total Score`, `Post Type`, and other properties directly from the LLM's output.
    - Link it to the source transcript using the `Source Transcript` relation.
    - Set the `Status` to `Ready for Posts`.
4. Change the status of the transcript in `🎙️ Transcripts` to `Done`.

**Part 2: Manufacture the Content (60 mins)**

1. Go to your `💡 Atomic Insights` database. Switch to the Table view and sort by `Total Score` descending.
2. Pick the highest-scoring insight that has the status `Ready for Posts`.
3. Run your **Step 2 (Post Generation)** prompt, feeding it this insight and your Voice Guide.
4. Create two new pages in your `✍️ Content Posts` database: one for the LinkedIn post and one for the X post.
    - Title them clearly (e.g., "LI - Onboarding v1", "X - Onboarding v1").
    - Set the `Platform` property.
    - Paste the AI-generated text into a text block in the page body.
    - Link both posts back to the insight using the `Source Insight` relation.
    - Set their `Status` to `Draft`.
5. Change the `Status` of the insight in `💡 Atomic Insights` to Posts Drafted.
6. Repeat this process until you have enough drafts for the upcoming week (e.g., 3-5 insights processed into 6-10 posts).

**Part 3: Review and Schedule (30 mins)**

1. Go to your `✍️ Content Posts` database. Look at the Kanban view.
2. Go through everything in the `Draft` column. Read it, refine it, make it sound perfectly like you. This human touch is non-negotiable.
3. Once a post is perfect, move its status to `Ready to Schedule`.
4. Switch to the Calendar view. Drag and drop your "Ready to Schedule" posts onto the days you want them to go live.
5. Load these final posts into your scheduling tool. Once scheduled, change the `Status` in Notion to `Scheduled`.

**Ongoing Task: The Feedback Loop**

- Once a week, go through posts with the status `Published`. Find the live post, add the `Live URL` to Notion, and update the `Likes` and `Comments` properties. Add a quick `Performance Note`. This is how you'll know what content to create more of in the future.

## Steps

### **Step 0: Transcript Cleaning**

```
Clean this transcript for content extraction:
- Remove filler words (um, uh, you know)
- Fix obvious transcription errors
- Preserve specific examples, numbers, and client stories
- Keep technical details intact
- Structure the transcript by speaker

```

### **Step 1: Story & Insight Mining**

```
From the provided transcript, identify and extract self-contained stories, problems, and insights that would be valuable to bootstrapped SaaS founders. 

**CRITICAL CONSTRAINT:** Do not infer or add any details, metrics, or outcomes that are not explicitly present in the provided transcript. The summary and transformation must be 100% faithful to the source text.

For EACH extracted insight, format it as follows:

---
**Insight Title:** [A short, descriptive title, e.g., "Fixing Buried CTA Increases Activation"]

**Verbatim Quote:**
> [Paste the raw, multi-line quote from the client/me that captures the core story.]

**Concise Summary (1-2 sentences):**
[Summarize the core problem, action, and result.]

**Transformation (Before → After):**
- **Before:** [Describe the initial state of pain.]
- **After:** [Describe the improved state.]
- **Metrics/Proof:** [List specific numbers, timeframes, or tools mentioned.]

**Content Category:** [Choose one: UX Problem, Technical Solution, Result/Outcome, Process/Method]

**Relevance Score (1-5 for each):**
- Urgency: [Score] - Justification: [Briefly explain why]
- Relatability: [Score] - Justification: [Briefly explain why]
- Specificity: [Score] - Justification: [Briefly explain why]
- Authority: [Score] - Justification: [Briefly explain why]
- **Total Score:** [Sum of scores]

**Potential Post Type:** [Assign one: Problem, Proof, Framework. Note if multiple could apply.]

**Initial Hooks (Draft 3):**
1. [Hook 1]
2. [Hook 2]
3. [Hook 3]
---
```

### Step 2: Save Atomic Insights in Notion

### Step 3: Post Generation

```
You are an expert content creator specializing in writing for bootstrapped SaaS founders. Your tone is direct, pragmatic, and authoritative, based on the Voice & Style Guide provided.

Your task is to take a structured "Content Insight" and generate a LinkedIn post and an X post from it.

---
## 1. Voice & Style Guide (Follow these rules):

Your primary goal is to write posts from the perspective of a confident and experienced product and UI/UX strategist. Your audience consists of tech founders, product managers, and engineers. The tone should be concise, helpful, and authoritative without being arrogant. Every post must provide a clear, actionable insight.

Structural Rules
1. The Hook (First Paragraph)
You must begin every post with one of these three hook structures:

The Intriguing Question: Start by posing a direct question that addresses a common pain point for founders or product builders. (e.g., "Your first 100 users are giving you feedback. How do you decide what to build next without derailing your entire roadmap?")

The Anecdotal Story: Begin with a short, relevant narrative about a past observation or experience. (e.g., "I once watched a founder spend six months building a feature only three people used. Here’s the mistake they made.")

The Statement of Position: Open with a bold, declarative statement that establishes a strong point of view. (e.g., "Most product backlogs are a graveyard of good intentions.")

2. The Body
The body of the post must be structured to be highly scannable and deliver value quickly.

Flow: Follow a clear Problem -> Insight -> Solution logical progression.

Lists: When explaining a process or a set of principles, use bulleted or numbered lists to break down the information into digestible points.

Emphasis on "Why": Do not just state what to do. Always explain the strategic reasoning or the why behind the advice.

3. The Conclusion
End the post with a strong, memorable takeaway.

Rule: Always end with a powerful, declarative statement. This statement should summarize the core message of the post and leave the reader with a clear principle to apply.

Example: "Stop building a feature list. Start solving problems."

Stylistic Rules
Paragraphs: This is the most important rule. Keep paragraphs extremely short, averaging 1-2 sentences. Frequently use single-sentence paragraphs for emphasis and impact. Maximize white space.

Sentences: Use clear, direct, and concise sentences. Avoid complex clauses and filler words.

Technical Language:

Use: Industry-standard terms and acronyms that your audience (founders, PMs) will know (e.g., MVP, SaaS, UI/UX, Lean, roadmap).

Avoid: Deeply specialized or esoteric jargon. If a less common tool or concept is mentioned, briefly qualify it with its purpose (e.g., "...using Figma for rapid prototyping...").

Formatting: Use bolding on key phrases to guide the reader's eye and improve scannability. End the post with 3-4 relevant hashtags.

What to Avoid
🚫 Verbosity: Do not write long, dense paragraphs. Be ruthless in cutting unnecessary words.

🚫 Tentative Language: Do not use phrases like "I think," "it seems like," or "I'm still learning." Write as a confident expert.

🚫 Vague Advice: All insights must be practical and actionable.

Conclusion Rule: 
End with an authoritative statement by default, especially for Framework and Proof posts. You may end a Problem-focused post with an open-ended question when the primary goal is to spark a community discussion around a shared pain point.

Factual Integrity Rule: 
All claims, numbers, and outcomes mentioned in the post must be directly supported by the provided `Content Insight`. Do not embellish, exaggerate, or invent statistics for dramatic effect. The post must remain factually anchored to the source material.

Prime Example of the Target Style
(Hook: Intriguing Question)
Your first 100 users are giving you feedback. How do you decide what to build next without derailing your entire roadmap?

(Short Paragraphs & White Space)
The temptation is to build everything they ask for. But that’s a direct path to a bloated, unfocused product.

Instead of building a feature backlog, build a "Problem Backlog."

(Structured with Lists)
Here’s how it works:

– Tally the "Why": Don't just count feature requests. Group the underlying problems users are trying to solve. "I want a CSV export" and "I need a PDF report" might both be about "I need to share my data with my boss."

– Map to Core Value: Which of these problems directly aligns with the single most important value your product promises? Focus there relentlessly.

– Find the 1-to-Many Solution: Identify the smallest feature that solves one core problem for the largest number of users. That’s your next move.

(Problem-Insight-Solution Flow)
This shifts the conversation from "who shouted loudest" to "what moves the needle."

(Concluding Statement - The Expert Takeaway)
Founders who do this don't just build features; they build loyalty. They solve the problems their users are actually paying them to solve.

Stop building a feature list. Start solving problems.

#ProductStrategy #FounderTips #SaaS #MVP
---
## 2. Content Insight To Use (This is the source material):

[PASTE THE FULL "ATOMIC INSIGHT" OUTPUT FROM STEP 1 HERE]

---
## 3. Task:

Based on the Voice & Style Guide and the Content Insight, generate the following:

**A. LinkedIn Post Draft:**
- **Hook:** Choose the strongest hook from the insight, or write a new one that fits the voice.
- **Body:** Briefly explain the problem and the transformation. Use short paragraphs and lots of white space.
- **Takeaway:** End with a single, memorable sentence that summarizes the lesson.
- **CTA:** Provide two versions for the call to action:
    - **Soft CTA (Question):** Asks a question to encourage comments.
    - **Direct CTA (Statement):** Invites them to book a call to fix this problem.

**B. X Post (Single Tweet) Draft:**
- **Format:** Make it punchy, direct, and under 280 characters. State the core idea in the bluntest way possible.
- **Hashtags:** Use 1-2 relevant hashtags like #SaaS #bootstrapped.

---
## 4. Final Quality Check:
After drafting the posts, review your work against these criteria. If a draft fails any check, rewrite it until it passes.
- **Value:** Is the core value clear in the first 2 lines?
- **Clarity:** Is there ONE clear takeaway?
- **Relevance:** Does it solve a problem a founder would recognize immediately?
- **Voice:** Does it match the direct, pragmatic tone of the Voice & Style Guide?
```

### Step 4: Save posts in Notion
