export type CardType = 'outcome' | 'opportunity' | 'solution' | 'experiment';

export type CardStatus = 'on-track' | 'at-risk' | 'next' | 'done' | 'none';

export interface OSTCard {
  id: string;
  type: CardType;
  title: string;
  description?: string;
  status?: CardStatus;
  parentId: string | null;
  children: string[];
  // For outcome cards with metrics
  metrics?: {
    start: number;
    target: number;
    current: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface OSTTree {
  id: string;
  name: string;
  cards: Record<string, OSTCard>;
  rootIds: string[];
}

export interface Position {
  x: number;
  y: number;
}

export interface CanvasState {
  zoom: number;
  offset: Position;
}
