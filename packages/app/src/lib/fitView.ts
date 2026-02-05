export interface FitViewResult {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export function computeFitView(
  containerRect: DOMRect,
  contentRect: DOMRect,
  currentZoom: number,
  currentOffsetX: number,
  currentOffsetY: number,
  padding = 80,
): FitViewResult {
  const contentWidth = contentRect.width / currentZoom;
  const contentHeight = contentRect.height / currentZoom;

  const availableWidth = Math.max(0, containerRect.width - padding * 2);
  const availableHeight = Math.max(0, containerRect.height - padding * 2);

  const fitZoom = Math.min(
    availableWidth / Math.max(1, contentWidth),
    availableHeight / Math.max(1, contentHeight),
    2,
  );
  const nextZoom = Math.max(0.25, Math.min(2, fitZoom));

  const contentCenterScreenX = contentRect.left - containerRect.left + contentRect.width / 2;
  const contentCenterScreenY = contentRect.top - containerRect.top + contentRect.height / 2;

  const contentCenterLocalX = (contentCenterScreenX - currentOffsetX) / currentZoom;
  const contentCenterLocalY = (contentCenterScreenY - currentOffsetY) / currentZoom;

  const offsetX = containerRect.width / 2 - contentCenterLocalX * nextZoom;
  const offsetY = containerRect.height / 2 - contentCenterLocalY * nextZoom;

  return { zoom: nextZoom, offsetX, offsetY };
}
