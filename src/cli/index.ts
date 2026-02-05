#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseMarkdownToTree, serializeTreeToMarkdown, encodeMarkdownToUrlFragment } from '../lib/markdownOST';

interface CliOptions {
  inputPath?: string;
  share: boolean;
  shareBase: string;
  format: 'json' | 'markdown';
  pretty: boolean;
  name?: string;
}

const DEFAULT_SHARE_BASE = 'https://ost-builder.pages.dev/';

const printHelp = () => {
  console.log(`OST Builder CLI

Usage:
  ost-builder <file.md> [options]

Options:
  --format <json|markdown>  Output format (default: json).
  --pretty                  Pretty-print JSON output.
  --share                   Print a shareable link (base URL + encoded hash).
  --share-base <url>        Base URL for share links (default: ${DEFAULT_SHARE_BASE}).
  --name <name>             Override the tree name when serializing.
  --help, -h                Show this help message.
`);
};

const parseArgs = (args: string[]): CliOptions => {
  const options: CliOptions = {
    share: false,
    shareBase: DEFAULT_SHARE_BASE,
    format: 'json',
    pretty: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg) continue;

    switch (arg) {
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      case '--share':
        options.share = true;
        break;
      case '--pretty':
        options.pretty = true;
        break;
      case '--format': {
        const value = args[i + 1];
        if (!value || (value !== 'json' && value !== 'markdown')) {
          throw new Error('Expected --format json or markdown.');
        }
        options.format = value;
        i += 1;
        break;
      }
      case '--share-base': {
        const value = args[i + 1];
        if (!value) throw new Error('Expected a URL after --share-base.');
        options.shareBase = value;
        i += 1;
        break;
      }
      case '--name': {
        const value = args[i + 1];
        if (!value) throw new Error('Expected a name after --name.');
        options.name = value;
        i += 1;
        break;
      }
      default: {
        if (arg.startsWith('-')) {
          throw new Error(`Unknown option: ${arg}`);
        }
        if (!options.inputPath) {
          options.inputPath = arg;
        } else {
          throw new Error('Only one input markdown file is supported.');
        }
      }
    }
  }

  return options;
};

const formatTreeAsJson = (tree: unknown, pretty: boolean): string =>
  JSON.stringify(
    tree,
    (_key, value) => (value instanceof Date ? value.toISOString() : value),
    pretty ? 2 : 0,
  );

const main = async () => {
  const options = parseArgs(process.argv.slice(2));

  if (!options.inputPath) {
    printHelp();
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), options.inputPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Markdown file not found: ${resolvedPath}`);
  }

  const markdown = fs.readFileSync(resolvedPath, 'utf8');
  let tree = parseMarkdownToTree(markdown);
  const currentMarkdown = markdown;

  if (options.name) {
    tree.name = options.name;
  }

  if (options.format === 'markdown') {
    console.log(currentMarkdown);
  } else {
    console.log(formatTreeAsJson(tree, options.pretty));
  }

  if (options.share) {
    const base = options.shareBase.replace(/#.*$/, '');
    const shareMarkdown =
      options.format === 'markdown'
        ? currentMarkdown
        : serializeTreeToMarkdown(tree, options.name || tree.name);
    const fragment = encodeMarkdownToUrlFragment(shareMarkdown, options.name || tree.name);
    console.error(`Share link: ${base.replace(/\/?$/, '/')}#${fragment}`);
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
