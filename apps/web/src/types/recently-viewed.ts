export interface RecentItem {
  id: string;
  type: 'post' | 'insight' | 'transcript';
  title: string;
  viewedAt: string;
  url: string;
  status?: string;
  platform?: string;
}

export interface RecentlyViewedState {
  items: RecentItem[];
  maxItems: number;
}