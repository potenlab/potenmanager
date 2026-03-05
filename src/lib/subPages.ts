export interface SubPage {
  id: string;
  title: string;
  content: string;
  parentType: string;
  parentId: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "poten_sub_pages";

export function loadSubPages(): SubPage[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export function saveSubPages(pages: SubPage[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
}

export function getSubPage(id: string): SubPage | undefined {
  return loadSubPages().find((p) => p.id === id);
}

export function createSubPage(parentType: string, parentId: string): SubPage {
  const now = new Date().toISOString();
  const page: SubPage = {
    id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: "",
    content: "",
    parentType,
    parentId,
    createdAt: now,
    updatedAt: now,
  };
  const all = loadSubPages();
  all.push(page);
  saveSubPages(all);
  return page;
}

export function updateSubPage(id: string, updates: Partial<SubPage>): void {
  const all = loadSubPages();
  const idx = all.findIndex((p) => p.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    saveSubPages(all);
  }
}

export function deleteSubPage(id: string): void {
  saveSubPages(loadSubPages().filter((p) => p.id !== id));
}
