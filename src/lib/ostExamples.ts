export interface OSTExample {
  id: string;
  name: string;
  description: string;
  markdown: string;
}

export const DEFAULT_OST_TEMPLATE = `# My Opportunity Solution Tree

## [Outcome] Increase user engagement by 40% @on-track
Our primary goal for Q1 2026
- start: 0
- current: 28
- target: 40

### [Opportunity] Users struggle to find relevant content quickly @next
Discovered through user interviews

#### [Solution] Add personalized content recommendations @on-track
ML-based recommendation engine

##### [Experiment] A/B test recommendation widget placement @next
Test sidebar vs. inline placement

### [Opportunity] Onboarding flow is too complex
High drop-off rate at step 3
`;

export const OST_EXAMPLES: OSTExample[] = [
  {
    id: 'example-default',
    name: 'Default example',
    description: 'The standard OST sample with outcome, opportunities, and solutions.',
    markdown: DEFAULT_OST_TEMPLATE,
  },
  {
    id: 'example-onboarding',
    name: 'Improve onboarding completion',
    description: 'Outcome with clear metric and a few early opportunities/solutions.',
    markdown: `# Improve onboarding completion

## [Outcome] Increase onboarding completion from 85% to 92% by May 31 @on-track
Focus on new users completing the core setup flow
- start: 85
- current: 88
- target: 92

### [Opportunity] Users drop after account verification
Confusion about next steps after verification

#### [Solution] Guided checklist on first login @next
Show required steps with progress

### [Opportunity] Setup feels too long on mobile
Too many steps on small screens

#### [Solution] Progressive disclosure in setup @next
Split steps and reduce form density
`,
  },
  {
    id: 'example-customer-segments',
    name: 'Increase revenue via customer segments',
    description: 'Segmented opportunities for prospects and existing customers.',
    markdown: `# Increase revenue via customer segments

## [Outcome] Increase revenue by 15% this half @on-track
Balance acquisition and retention initiatives
- start: 0
- current: 6
- target: 15

### [Opportunity] Prospective customers can’t evaluate value quickly
Trial users struggle to reach aha moment

#### [Solution] Time-to-value onboarding path @next
Personalized setup based on use case

### [Opportunity] Existing customers churn after 90 days
Drop in activation of advanced features

#### [Solution] Lifecycle nudges for advanced features @next
Targeted education and prompts
`,
  },
  {
    id: 'example-ai-chatbot',
    name: 'Improve AI chatbot resolution',
    description: 'Reduce escalation rate while improving user satisfaction.',
    markdown: `# Improve AI chatbot resolution

## [Outcome] Increase first-contact resolution from 42% to 60% by Q3 @next
Lower escalation rate while preserving satisfaction
- start: 42
- current: 48
- target: 60

### [Opportunity] Users abandon after the first bot response
Initial responses feel generic or miss intent

#### [Solution] Intent-aware opening prompts @next
Ask a targeted clarifying question based on detected intent

### [Opportunity] Users don’t trust the bot’s answers
Lack of citations and uncertainty messaging

#### [Solution] Add sources and confidence cues @next
Show cited links and explain uncertainty
`,
  },
];
