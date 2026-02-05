import type { ReactNode } from 'react';

const LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

export function renderMarkdownLinks(text: string): ReactNode[] {
  if (!text) return [];

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = LINK_REGEX.exec(text)) !== null) {
    const [full, label, href] = match;
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      nodes.push(text.slice(lastIndex, matchIndex));
    }

    nodes.push(
      <a
        key={`${href}-${matchIndex}`}
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline underline-offset-2"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {label}
      </a>,
    );

    lastIndex = matchIndex + full.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length ? nodes : [text];
}
