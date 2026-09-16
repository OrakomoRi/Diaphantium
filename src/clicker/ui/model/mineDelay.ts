import { ref } from 'vue';
import { DEFAULT_MINE_DELAY, MAX_MINE_DELAY, MIN_MINE_DELAY } from '../../config/config';
import { getStorage, setStorage } from '../../storage/storage';

export type CommitResult = 'saved' | 'unchanged' | 'invalid';

export interface Sanitized {
	value: string;
	caret: number;
}

export function sanitizeDigits(text: string, caret: number = text.length): Sanitized {
	const value = text.replace(/\D+/g, '');
	const removedBeforeCaret = text.slice(0, caret).replace(/\d+/g, '').length;
	return { value, caret: Math.max(0, caret - removedBeforeCaret) };
}

export function parseDelay(text: string): number | null {
	if (!/^\d+$/.test(text)) return null;
	const value = Number(text);
	return Number.isSafeInteger(value) && value >= MIN_MINE_DELAY && value <= MAX_MINE_DELAY ? value : null;
}

export function useMineDelay() {
	const saved = getStorage('mineDelay');
	let committed = saved ?? DEFAULT_MINE_DELAY;
	const draft = ref(String(committed));

	function rollback(): void {
		draft.value = String(committed);
	}

	function commit(): CommitResult {
		const value = parseDelay(draft.value);
		if (value === null) return 'invalid';
		draft.value = String(value);
		if (value === committed) return 'unchanged';
		committed = value;
		setStorage('mineDelay', value);
		return 'saved';
	}

	return { draft, commit, rollback };
}
