import { toPng } from 'html-to-image';

type ExportBackground = 'grid' | 'transparent';
type ExportMode = 'current' | 'fit';

interface ExportOptions {
  background: ExportBackground;
  mode: ExportMode;
  fileName?: string;
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  link.click();
}

export async function exportOSTToPng({ background, mode, fileName }: ExportOptions) {
  const source = document.querySelector('[data-ost-export]') as HTMLElement | null;
  if (!source) {
    throw new Error('Export source not found.');
  }
  const content = source.querySelector('[data-ost-export-content]') as HTMLElement | null;
  if (!content) {
    throw new Error('Export content not found.');
  }

  const originalOverflow = source.style.overflow;
  const originalBackground = source.style.background;
  const originalBackgroundImage = source.style.backgroundImage;
  const originalBackgroundColor = source.style.backgroundColor;
  const originalWidth = source.style.width;
  const originalHeight = source.style.height;
  const originalContentTransform = content.style.transform;
  const originalContentOrigin = content.style.transformOrigin;
  const originalBodyClass = document.body.className;

  try {
    document.body.classList.add('ost-exporting');
    source.style.overflow = 'visible';

    if (background === 'transparent') {
      source.style.backgroundImage = 'none';
      source.style.backgroundColor = 'transparent';
      source.style.background = 'transparent';
    }

    if (mode === 'fit') {
      const sourceRect = source.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const padding = 64;
      const width = Math.ceil(contentRect.width + padding * 2);
      const height = Math.ceil(contentRect.height + padding * 2);
      const translateX = Math.round(-contentRect.left + sourceRect.left + padding);
      const translateY = Math.round(-contentRect.top + sourceRect.top + padding);

      source.style.width = `${width}px`;
      source.style.height = `${height}px`;
      content.style.transformOrigin = 'top left';
      content.style.transform = `translate(${translateX}px, ${translateY}px)`;
    }

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const dataUrl = await toPng(source, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: background === 'transparent' ? 'transparent' : undefined,
    });

    downloadDataUrl(dataUrl, fileName || 'ost-export.png');
  } finally {
    source.style.overflow = originalOverflow;
    source.style.background = originalBackground;
    source.style.backgroundImage = originalBackgroundImage;
    source.style.backgroundColor = originalBackgroundColor;
    source.style.width = originalWidth;
    source.style.height = originalHeight;
    content.style.transform = originalContentTransform;
    content.style.transformOrigin = originalContentOrigin;
    document.body.className = originalBodyClass;
  }
}
