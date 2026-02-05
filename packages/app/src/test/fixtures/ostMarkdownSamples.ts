/**
 * Test fixtures for OST markdown parsing tests.
 * Organized by category for reusability.
 */

export const MINIMAL_SAMPLES = {
  outcome: `## [Outcome] Test Outcome @on-track
Description text
- start: 0
- current: 5
- target: 10
`,
  opportunity: `### [Opportunity] Test Opportunity @next
Description text
`,
  solution: `#### [Solution] Test Solution @done
Description text
`,
  experiment: `##### [Experiment] Test Experiment @at-risk
Description text
`,
};

export const STATUS_SAMPLES = {
  onTrack: `## [Outcome] Status Test @on-track
`,
  atRisk: `## [Outcome] Status Test @at-risk
`,
  next: `## [Outcome] Status Test @next
`,
  done: `## [Outcome] Status Test @done
`,
  none: `## [Outcome] Status Test
`,
};

export const EDGE_CASE_SAMPLES = {
  empty: '',
  whitespaceOnly: '   \n\n  \n',
  noValidCards: `# Just a title
Some text
This is not a card
`,
  unicodeTitle: `## [Outcome] 测试标题 🎯 @on-track
Unicode content with 中文 and emoji ✅
- start: 0
- current: 10
- target: 20
`,
  specialChars: `## [Outcome] Test's "quotes" & <html> @next
Special characters: <tag>, &amp;, 'single', "double"
`,
  legacyId: `## [Outcome] Test {#old-id} @next
Should strip ID tokens
`,
  multipleRoots: `## [Outcome] First Root
Description

## [Outcome] Second Root
Description
`,
  extraWhitespace: `## [Outcome] Test   @on-track
  Description with spaces
- start: 0
- current: 5
- target: 10
`,
};

export const HIERARCHY_SAMPLES = {
  twoLevel: `## [Outcome] Parent
Parent description

### [Opportunity] Child
Child description
`,
  fourLevel: `## [Outcome] L1
Level 1

### [Opportunity] L2
Level 2

#### [Solution] L3
Level 3

##### [Experiment] L4
Level 4
`,
  multipleSiblings: `## [Outcome] Outcome
Outcome description

### [Opportunity] Opp1
First opportunity

### [Opportunity] Opp2
Second opportunity
`,
  complexNesting: `## [Outcome] Root
Root description

### [Opportunity] Opp1
Opportunity 1

#### [Solution] Sol1
Solution 1

##### [Experiment] Exp1
Experiment 1

##### [Experiment] Exp2
Experiment 2

#### [Solution] Sol2
Solution 2

### [Opportunity] Opp2
Opportunity 2

#### [Solution] Sol3
Solution 3
`,
  skippedLevel: `## [Outcome] Outcome
Description

#### [Solution] Solution without Opportunity parent
This skips the Opportunity level
`,
};

export const METRICS_SAMPLES = {
  complete: `## [Outcome] Test
Description
- start: 0
- current: 50
- target: 100
`,
  partial: `## [Outcome] Test
Description
- start: 10
`,
  decimal: `## [Outcome] Test
Description
- start: 0.5
- current: 12.75
- target: 25.0
`,
  invalid: `## [Outcome] Test
Description
- start: invalid
- current: abc
- target: xyz
`,
  zeroValues: `## [Outcome] Test
Description
- start: 0
- current: 0
- target: 0
`,
  negativeValues: `## [Outcome] Test
Description
- start: -10
`,
  onlyStart: `## [Outcome] Test
Description
- start: 5
`,
  onlyCurrent: `## [Outcome] Test
Description
- current: 5
`,
  onlyTarget: `## [Outcome] Test
Description
- target: 5
`,
  mixedCase: `## [Outcome] Test
Description
- Start: 0
- CURRENT: 50
- TaRgEt: 100
`,
  metricsOnNonOutcome: `### [Opportunity] Test
Description
- start: 0
- current: 50
- target: 100
`,
  metricsWithExtraText: `## [Outcome] Test
Description
Some text
- start: 0
More text
- current: 50
Even more
- target: 100
`,
};

export const DESCRIPTION_SAMPLES = {
  noDescription: `## [Outcome] Test @on-track
`,
  multilineDescription: `## [Outcome] Test @on-track
First line
Second line
Third line
`,
  descriptionWithBullets: `## [Outcome] Test @on-track
Description with bullets:
- Not a metric
- Just text
- More text
`,
  descriptionWithCode: `## [Outcome] Test @on-track
Code example:
\`\`\`javascript
const x = 1;
\`\`\`
`,
  descriptionWithMarkdown: `## [Outcome] Test @on-track
**Bold text** and *italic text*
[Link](https://example.com)
> Quote
`,
};

export const TITLE_SAMPLES = {
  noTitle: `## [Outcome] @on-track
`,
  longTitle: `## [Outcome] This is a very long title that goes on and on and contains many words to test how the parser handles lengthy titles @on-track
`,
  titleWithNumbers: `## [Outcome] Q1 2026 Test #123 @on-track
`,
  titleWithSymbols: `## [Outcome] Test @ Work: Part 1 (v2.0) @on-track
`,
  titleWithEmoji: `## [Outcome] 🎯 Goal for Q1 🚀 @on-track
`,
};

export const FULL_EXAMPLES = {
  singleCard: `## [Outcome] Increase user engagement by 40% @on-track
Our primary goal for Q1 2026
- start: 0
- current: 28
- target: 40
`,
  simpleTree: `## [Outcome] Improve product @on-track
Main outcome
- start: 0
- current: 50
- target: 100

### [Opportunity] Users need better UX
Key opportunity

#### [Solution] Redesign interface @next
Proposed solution

##### [Experiment] A/B test new design @next
Test the solution
`,
  multipleOutcomes: `## [Outcome] First Outcome @on-track
First outcome description
- start: 0
- current: 10
- target: 20

### [Opportunity] First Opportunity
Related to first outcome

## [Outcome] Second Outcome @next
Second outcome description
- start: 5
- current: 5
- target: 15

### [Opportunity] Second Opportunity
Related to second outcome
`,
};
