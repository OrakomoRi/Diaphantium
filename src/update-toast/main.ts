import { toast } from 'nuntaria';
import { detectLanguage } from '@/shared/utils/detectLanguage';
import { UPDATE_TOAST_READY, type ShowUpdateToast } from '@/shared/update-toast';
import { updateStrings, updateText } from './locales';

const showUpdateToast: ShowUpdateToast = ({ name, version, date, duration }) => {
	const strings = updateStrings(detectLanguage());

	return toast<'skip' | boolean>({
		type: 'info',
		title: `${name}: ${strings.title}`,
		text: updateText(strings, version, date),
		theme: 'dark',
		size: 'small',
		position: 'top-right',
		duration,
		pauseOnHover: true,
		buttons: [
			{ label: strings.skip, value: 'skip', variant: 'cancel' },
			{ label: strings.later, value: false, variant: 'cancel' },
			{ label: strings.update, value: true, variant: 'primary' },
		],
	});
};

window.dispatchEvent(new CustomEvent<ShowUpdateToast>(UPDATE_TOAST_READY, { detail: showUpdateToast }));
