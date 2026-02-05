#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  parseMarkdownToTree,
  serializeTreeToMarkdown,
  encodeMarkdownToUrlFragment,
} from '@ost-builder/shared';

interface CliOptions {
  inputPath?: string;
  share: boolean;
  show: boolean;
  shareBase: string;
  format: 'json' | 'markdown';
  formatExplicit: boolean;
  pretty: boolean;
  name?: string;
}

const DEFAULT_SHARE_BASE = 'https://ost-builder.pages.dev/';

const printHelp = () => {
  console.log(`Opportunity Solution Tree (OST) Builder CLI ✨

Usage:
  ost-builder <file.md> [options]

Options:
  --show                    Open the shareable link in your browser. 🚀
  --share                   Print a shareable link that can be copied. 🔗
  --name <name>             Override the tree name with a new name.
  --format <json|markdown>  Output format (default: json).
  --pretty                  Pretty-print JSON output.
  --share-base <url>        Base URL for share links (default: ${DEFAULT_SHARE_BASE}).
  --help, -h                Show this help message.
`);
};

const parseArgs = (args: string[]): CliOptions => {
  const options: CliOptions = {
    share: false,
    show: false,
    shareBase: DEFAULT_SHARE_BASE,
    format: 'json',
    formatExplicit: false,
    pretty: false,
  };
  let sawFlag = false;

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
        sawFlag = true;
        break;
      case '--show':
        options.show = true;
        options.share = true;
        sawFlag = true;
        break;
      case '--pretty':
        options.pretty = true;
        sawFlag = true;
        break;
      case '--format': {
        const value = args[i + 1];
        if (!value || (value !== 'json' && value !== 'markdown')) {
          throw new Error('Expected --format json or markdown.');
        }
        options.format = value;
        options.formatExplicit = true;
        sawFlag = true;
        i += 1;
        break;
      }
      case '--share-base': {
        const value = args[i + 1];
        if (!value) throw new Error('Expected a URL after --share-base.');
        options.shareBase = value;
        sawFlag = true;
        i += 1;
        break;
      }
      case '--name': {
        const value = args[i + 1];
        if (!value) throw new Error('Expected a name after --name.');
        options.name = value;
        sawFlag = true;
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

  if (!sawFlag && options.inputPath) {
    options.show = true;
    options.share = true;
  }

  return options;
};

const openUrl = (url: string) => {
  if (process.platform === 'darwin') {
    spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
    return;
  }

  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
    return;
  }

  spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
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

  const shouldPrint =
    !(options.share && options.format === 'json') &&
    !(options.show && !options.formatExplicit);

  if (shouldPrint) {
    if (options.format === 'markdown') {
      console.log(currentMarkdown);
    } else {
      console.log(formatTreeAsJson(tree, options.pretty));
    }
  }

  if (options.share) {
    const base = options.shareBase.replace(/#.*$/, '');
    const shareMarkdown =
      options.format === 'markdown'
        ? currentMarkdown
        : serializeTreeToMarkdown(tree, options.name || tree.name);
    const fragment = encodeMarkdownToUrlFragment(shareMarkdown, options.name || tree.name);
    const shareLink = `${base.replace(/\/?$/, '/')}#${fragment}`;
    if (options.show) {
      console.error(`🚀 Opening "${options.name || tree.name}" in your browser... `);
      openUrl(shareLink);
    }
    console.error(`🔗 Copy the following Share link:\n${shareLink} \n`);
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
