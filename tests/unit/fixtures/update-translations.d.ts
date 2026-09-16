export const TRANSLATIONS: Record<string, {
	title: string;
	text: (version: string, date?: string) => string;
	skip: string;
	later: string;
	update: string;
}>;
