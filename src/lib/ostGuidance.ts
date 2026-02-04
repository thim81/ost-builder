export type GuidanceField = 'title' | 'description' | 'status' | 'metrics';
export type GuidanceType = 'outcome' | 'opportunity' | 'solution' | 'assumption' | 'experiment';

export interface GuidanceContent {
  title: string;
  description: string;
  source?: string;
}

export const OST_GUIDANCE: Record<GuidanceType, Record<GuidanceField, GuidanceContent>> = {
  outcome: {
    title: {
      title: 'What measurable business or customer outcome are we trying to improve?',
      description: 'This should be a metric you can track over time. Avoid solutions here.',
      source: 'Teresa Torres',
    },
    description: {
      title: 'Why does this outcome matter now?',
      description: 'Add context, constraints, or the time frame for the outcome.',
      source: 'Teresa Torres',
    },
    status: {
      title: 'What is the current state of this outcome?',
      description: 'Use status to communicate progress or risk at a glance.',
      source: 'Hustle Badger',
    },
    metrics: {
      title: 'How will we measure progress toward this outcome?',
      description: 'Define start, current, and target so progress is visible.',
      source: 'Teresa Torres',
    },
  },
  opportunity: {
    title: {
      title: 'What unmet user need, pain, or desire did we observe?',
      description:
        'Phrase this as a user problem, not a feature request. Multiple opportunities can support one outcome.',
      source: 'Teresa Torres',
    },
    description: {
      title: 'What evidence supports this opportunity?',
      description: 'Cite interviews, analytics, or observations that validate the need.',
      source: 'Hustle Badger',
    },
    status: {
      title: 'What is the current state of this opportunity?',
      description: 'Use status to reflect confidence or urgency.',
      source: 'Hustle Badger',
    },
    metrics: {
      title: 'How will we validate this opportunity?',
      description: 'Add measurable signals to track if needed.',
      source: 'Teresa Torres',
    },
  },
  solution: {
    title: {
      title: 'What could we build or change to address this opportunity?',
      description: 'This is a hypothesis, not a commitment. Expect many solutions per opportunity.',
      source: 'Teresa Torres',
    },
    description: {
      title: 'What is the simplest version to test?',
      description: 'Keep it small enough to validate quickly.',
      source: 'Hustle Badger',
    },
    status: {
      title: 'What is the current state of this solution?',
      description: 'Track whether it’s next, at risk, or done.',
      source: 'Hustle Badger',
    },
    metrics: {
      title: 'What metrics will show this solution worked?',
      description: 'Tie solution progress to outcomes where possible.',
      source: 'Teresa Torres',
    },
  },
  assumption: {
    title: {
      title: 'What must be true for this solution to work?',
      description: 'Assumptions are risks. If it’s wrong, the solution fails.',
      source: 'Teresa Torres',
    },
    description: {
      title: 'Why is this assumption risky?',
      description: 'Explain what would break or how value would be lost.',
      source: 'Hustle Badger',
    },
    status: {
      title: 'What is the current state of this assumption?',
      description: 'Use status to track validation progress.',
      source: 'Hustle Badger',
    },
    metrics: {
      title: 'What evidence would validate this assumption?',
      description: 'Define the signals you need to see.',
      source: 'Teresa Torres',
    },
  },
  experiment: {
    title: {
      title: 'How can we quickly test this assumption?',
      description: 'Prefer cheap, fast experiments that generate learning over certainty.',
      source: 'Teresa Torres',
    },
    description: {
      title: 'What will we measure to learn?',
      description: 'Define the signal or metric that will confirm or refute the idea.',
      source: 'Hustle Badger',
    },
    status: {
      title: 'What is the current state of this experiment?',
      description: 'Use status to track whether it’s planned, running, or done.',
      source: 'Hustle Badger',
    },
    metrics: {
      title: 'What metric decides the experiment?',
      description: 'Define a success threshold before running.',
      source: 'Teresa Torres',
    },
  },
};
