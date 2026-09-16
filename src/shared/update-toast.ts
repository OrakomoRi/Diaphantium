export const UPDATE_TOAST_READY = 'diaphantium:update-toast:ready';

export type UpdateToastResult = 'skip' | boolean | null;

export interface UpdateToastOptions {
	name: string;
	version: string;
	date?: string;
	duration: number;
}

export type ShowUpdateToast = (options: UpdateToastOptions) => Promise<UpdateToastResult>;
