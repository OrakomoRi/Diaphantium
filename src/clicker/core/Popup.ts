import { createApp, h, reactive } from 'vue';
import { AUTHOR, NAME, POPUP_OPEN_CLASS } from '../config/config';
import { clickerLocale, createClickerI18n } from '../locales';
import { FEATURE_TOGGLE, type FeatureToggle } from '../ui/featureToggle';
import { deepActiveElement } from '../ui/dom';
import { vTooltip } from '../ui/tooltip/tooltip';
import PopupLayer from '../ui/PopupLayer.vue';

export default class Popup {
	readonly host: HTMLElement;

	private lockedElement: Element | null = null;
	private readonly view = reactive({ open: false });
	private readonly i18n = createClickerI18n();

	constructor(styles: string, toggleFeature: FeatureToggle) {
		this.host = document.createElement('div');
		this.host.className = NAME.toLowerCase();
		this.host.setAttribute('author', AUTHOR);
		const root = this.host.attachShadow({ mode: 'open' });

		const style = document.createElement('style');
		style.textContent = styles;
		const mountPoint = document.createElement('div');
		root.append(style, mountPoint);
		document.body.append(this.host);

		createApp({
			render: () => h(PopupLayer, {
				open: this.view.open,
				onClose: () => this.hide(),
				onToggle: () => this.toggle(),
				onClosed: () => this.restorePointerLock(),
			}),
		})
			.use(this.i18n)
			.directive('tooltip', vTooltip)
			.provide(FEATURE_TOGGLE, toggleFeature)
			.mount(mountPoint);
	}

	get isOpen(): boolean {
		return this.view.open;
	}

	show(): void {
		if (this.isOpen) return;

		const locked = document.pointerLockElement;
		if (locked) {
			this.lockedElement = locked;
			document.exitPointerLock();
		}

		this.i18n.global.locale.value = clickerLocale();
		this.setPageScrollLocked(true);
		this.view.open = true;
	}

	hide(): void {
		if (!this.isOpen) return;

		const root = this.host.shadowRoot;
		const active = root ? deepActiveElement(root) : null;
		if (active instanceof HTMLElement) active.blur();

		this.setPageScrollLocked(false);
		this.view.open = false;
	}

	toggle(): void {
		if (this.isOpen) this.hide();
		else this.show();
	}

	private restorePointerLock(): void {
		const locked = this.lockedElement;
		this.lockedElement = null;
		if (this.isOpen || !locked || !document.contains(locked)) return;
		Promise.resolve((locked as HTMLElement).requestPointerLock()).catch(() => {});
	}

	private setPageScrollLocked(locked: boolean): void {
		document.documentElement.classList.toggle(POPUP_OPEN_CLASS, locked);
		document.body.classList.toggle(POPUP_OPEN_CLASS, locked);
	}
}
