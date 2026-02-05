# OST Markdown Reference

## Heading Syntax
Each card is a Markdown heading with a type prefix:

- Outcome: `## [Outcome] Title`
- Opportunity: `### [Opportunity] Title`
- Solution: `#### [Solution] Title`
- Experiment: `##### [Experiment] Title`

### Status (optional)
Add a status tag at the end of the heading line:

`@on-track | @at-risk | @next | @done | @none`

Example:
```
### [Opportunity] Improve onboarding @on-track
```

## Descriptions
Add free text on the lines immediately after the heading. It becomes the card description.

## Outcome Metrics
Only Outcome cards read metrics. Use list items directly under the Outcome heading:

```
- start: 50
- current: 80
- target: 120
```

## Full Example
```markdown
## [Outcome] Grow MAU from 80k to 120k by March 31st @next
Mission: Increase our user base
- start: 50
- current: 80
- target: 120

### [Opportunity] Improve onboarding
Reduce friction and improve completion of the onboarding flow

#### [Solution] Add questions to increase motivation

##### [Experiment] We can create compelling copy
Test variants of motivational copy in onboarding
```

## Validation Checklist
- Headings use the correct level and prefix.
- Status appears only at the end of heading line.
- Metrics are present only for Outcome cards.
- Child cards are nested by heading level.

## Visualizing In The Web App
Open `https://ost-builder.pages.dev/` to preview or edit your tree visually.

Ways to load your Markdown:
- Paste the Markdown into the editor.
- Upload a `.md` file (if the UI shows an upload action).
- Use the CLI to generate a share link:
  - `npx ost-builder your-file.md` (defaults to `--show`)
  - Options: `--show`, `--share`, `--share-base <url>`, `--format <json|markdown>`, `--pretty`, `--name <name>`
