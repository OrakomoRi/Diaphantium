export class VersionTimeline {
	constructor(i18nInstance) {
		this.i18n = i18nInstance;
		this.versions = [];
		this.container = document.querySelector('.timeline');
	}

	async init() {
		if (!this.container) return;

		try {
			const res = await fetch('./site/config/versions.json');
			if (!res.ok) throw new Error('Failed to load versions.json');
			const data = await res.json();
			this.versions = data.versions || [];
			this.render();
		} catch (e) {
			console.warn('VersionTimeline: could not load versions', e);
		}
	}

	getLocale() {
		return this.i18n?.locale || localStorage.getItem('diaphantium_lang') || 'en';
	}

	getText(field) {
		if (!field) return '';
		const locale = this.getLocale();
		return field[locale] || field['en'] || '';
	}

	buildItem(v) {
		const date = this.getText(v.date);
		const title = this.getText(v.title);
		const description = this.getText(v.description);

		const imageHtml = v.image
			? `<div class="timeline-image">
				<img src="${v.image}" alt="${title}" loading="lazy"
					onerror="this.closest('.timeline-image').style.display='none'">
			</div>`
			: '';

		return `<div class="timeline-item">
			<div class="timeline-marker"></div>
			<div class="timeline-content">
				<span class="timeline-date">${date}</span>
				<h4 class="timeline-title">${title}</h4>
				<p class="timeline-description">${description}</p>
				${imageHtml}
			</div>
		</div>`;
	}

	render() {
		if (!this.container || !this.versions.length) return;
		this.container.innerHTML = this.versions.map(v => this.buildItem(v)).join('');
	}

	updateLanguage() {
		this.render();
	}
}
