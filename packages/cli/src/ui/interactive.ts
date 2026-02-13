import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export async function promptText(question: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    const result = await rl.question(question);
    return result.trim();
  } finally {
    rl.close();
  }
}

export async function promptYesNo(question: string, defaultYes = true): Promise<boolean> {
  const suffix = defaultYes ? ' [Y/n] ' : ' [y/N] ';
  const raw = (await promptText(`${question}${suffix}`)).toLowerCase();
  if (!raw) return defaultYes;
  return raw === 'y' || raw === 'yes';
}

export async function promptSelect<T extends { label: string }>(
  title: string,
  options: T[],
): Promise<T | null> {
  if (!options.length) return null;
  output.write(`${title}\n`);
  options.forEach((option, index) => {
    output.write(`  ${index + 1}. ${option.label}\n`);
  });
  const answer = await promptText('Select number: ');
  const index = Number(answer) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= options.length) {
    return null;
  }
  return options[index] || null;
}
