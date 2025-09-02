export interface CategoryRecord {
	name: string;
	color: string;
}

export const CategoriesStore = {
	async getAll(): Promise<CategoryRecord[]> {
		const res = await chrome.storage.local.get('categories');
		return (res['categories'] as CategoryRecord[] | undefined) ?? [];
	},
	async upsert(record: CategoryRecord): Promise<void> {
		const all = await CategoriesStore.getAll();
		const idx = all.findIndex((c) => c.name === record.name);
		if (idx >= 0) all[idx] = record; else all.push(record);
		await chrome.storage.local.set({ categories: all });
	}
};
























