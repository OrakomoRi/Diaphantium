import { UPDATE_TOAST_READY, type ShowUpdateToast } from '@/shared/update-toast';
import { Bridge } from './Bridge';

export async function loadUpdateToast(url: string): Promise<ShowUpdateToast> {
	const code = await Bridge.fetch(url);

	let show: ShowUpdateToast | undefined;
	const receive = (event: Event) => {
		show = (event as CustomEvent<ShowUpdateToast>).detail;
	};

	const script = document.createElement('script');
	script.textContent = code;

	window.addEventListener(UPDATE_TOAST_READY, receive);
	try {
		(document.body || document.documentElement).appendChild(script);
	} finally {
		window.removeEventListener(UPDATE_TOAST_READY, receive);
		script.remove();
	}

	if (typeof show !== 'function') throw new Error(`The update toast did not start: ${url}`);
	return show;
}
