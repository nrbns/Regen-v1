export interface FilterList {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

export const DEFAULT_FILTER_LISTS: FilterList[] = [
  {
    id: 'easylist',
    name: 'EasyList',
    url: 'https://easylist.to/easylist/easylist.txt',
    enabled: true,
  },
  {
    id: 'easyprivacy',
    name: 'EasyPrivacy',
    url: 'https://easylist.to/easylist/easyprivacy.txt',
    enabled: true,
  },
];

export async function parseFilterList(url: string): Promise<string[]> {
  try {
    const response = await fetch(url);
    const text = await response.text();
    return text
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('!'))
      .map(line => line.trim());
  } catch (error) {
    console.error('[Adblocker] Failed to parse filter list:', error);
    return [];
  }
}
