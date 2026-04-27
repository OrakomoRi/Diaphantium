import { Bridge } from './Bridge.js';
import { CONFIG } from '../config/config.js';
import { compareVersions } from '../libs/loader/compareversions.min.js';
import { _detectLanguage } from '../utils/_detectLanguage.js';

export class UpdateChecker {
	constructor(logger) {
		this.version = CONFIG.SCRIPT_VERSION;
		this.logger = logger;
		this.translations = this._getTranslations();
	}

	_getTranslations() {
		const t = {
			en: { title: 'New version available!', text: (v, d) => `Version ${v} is available${d ? ` (${d})` : ''}. Update now?`, skip: 'Skip', later: 'Later', update: 'Update' },
			ru: { title: 'Доступна новая версия!', text: (v, d) => `Версия ${v} доступна${d ? ` (${d})` : ''}. Обновить сейчас?`, skip: 'Пропустить', later: 'Позже', update: 'Обновить' },
			uk: { title: 'Доступна нова версія!', text: (v, d) => `Версія ${v} доступна${d ? ` (${d})` : ''}. Оновити зараз?`, skip: 'Пропустити', later: 'Пізніше', update: 'Оновити' },
			nl: { title: 'Nieuwe versie beschikbaar!', text: (v, d) => `Versie ${v} is beschikbaar${d ? ` (${d})` : ''}. Nu updaten?`, skip: 'Overslaan', later: 'Later', update: 'Updaten' },
			pl: { title: 'Dostępna nowa wersja!', text: (v, d) => `Wersja ${v} jest dostępna${d ? ` (${d})` : ''}. Zaktualizować teraz?`, skip: 'Pomiń', later: 'Później', update: 'Aktualizuj' },
			pt: { title: 'Nova versão disponível!', text: (v, d) => `A versão ${v} está disponível${d ? ` (${d})` : ''}. Atualizar agora?`, skip: 'Pular', later: 'Depois', update: 'Atualizar' },
			de: { title: 'Neue Version verfügbar!', text: (v, d) => `Version ${v} ist verfügbar${d ? ` (${d})` : ''}. Jetzt aktualisieren?`, skip: 'Überspringen', later: 'Später', update: 'Aktualisieren' },
			ja: { title: '新しいバージョンが利用可能です！', text: (v, d) => `バージョン ${v} が利用可能です${d ? ` (${d})` : ''}。今すぐ更新しますか？`, skip: 'スキップ', later: '後で', update: '更新' },
			es: { title: '¡Nueva versión disponible!', text: (v, d) => `La versión ${v} está disponible${d ? ` (${d})` : ''}. ¿Actualizar ahora?`, skip: 'Omitir', later: 'Después', update: 'Actualizar' },
			fr: { title: 'Nouvelle version disponible !', text: (v, d) => `La version ${v} est disponible${d ? ` (${d})` : ''}. Mettre à jour maintenant ?`, skip: 'Ignorer', later: 'Plus tard', update: 'Mettre à jour' },
			tr: { title: 'Yeni sürüm mevcut!', text: (v, d) => `${v} sürümü mevcut${d ? ` (${d})` : ''}. Şimdi güncellensin mi?`, skip: 'Atla', later: 'Sonra', update: 'Güncelle' },
			cs: { title: 'Nová verze je k dispozici!', text: (v, d) => `Verze ${v} je k dispozici${d ? ` (${d})` : ''}. Aktualizovat nyní?`, skip: 'Přeskočit', later: 'Později', update: 'Aktualizovat' },
			hi: { title: 'नया संस्करण उपलब्ध है!', text: (v, d) => `संस्करण ${v} उपलब्ध है${d ? ` (${d})` : ''}। अभी अपडेट करें?`, skip: 'छोड़ें', later: 'बाद में', update: 'अपडेट करें' },
		};
		return t[_detectLanguage()] || t.en;
	}

	async check() {
		if (!this.version) return;

		try {
			const stableData = await Bridge.fetch(CONFIG.STABLE_JSON_URL(this.version), 'json');

			if (!stableData?.versions?.length) {
				this.logger?.log('No stable versions found', 'warn');
				return;
			}

			const latest = this._getLatestVersion(stableData.versions);
			if (!latest) {
				this.logger?.log('Failed to determine latest version', 'warn');
				return;
			}

			const comparison = compareVersions(latest.version, this.version);

			switch (comparison) {
				case 1:
					this.logger?.log(`A new version is available: ${latest.version}.`, 'info');
					break;
				case 0:
					this.logger?.log(/[-+]/.test(this.version)
						? 'You are using some version that is based on the latest stable.'
						: 'You are using the latest stable version.', 'info');
					break;
				case -1:
					this.logger?.log('You are using a version newer than the latest stable.', 'warn');
					break;
			}

			this.logger?.log(`Your × Stable:\n${this.version} × ${latest.version}`, 'info');

			if (comparison === 1) {
				await this._showUpdateModal(latest);
			}
		} catch (error) {
			const isDevVersion = /[-+]/.test(this.version);
			if (!isDevVersion) {
				this.logger?.log(`Update check failed: ${error}`, 'error');
			}
		}
	}

	_getLatestVersion(versions) {
		if (!Array.isArray(versions) || versions.length === 0) return null;
		return versions.reduce((latest, current) =>
			compareVersions(current.version, latest.version) > 0 ? current : latest
		);
	}

	async _showUpdateModal({ version, hash, date }) {
		const skipped = await Bridge.getValue('skippedVersion', '');
		if (skipped === version) return;

		try {
			const t = this.translations;
			const result = await window.Nuntaria.fire({
				type: 'info',
				title: `${CONFIG.SCRIPT_NAME}: ${t.title}`,
				text: t.text(version, date),
				theme: 'dark',
				position: 'top-right',
				timer: CONFIG.UPDATE_MODAL_TIMER,
				timerPause: true,
				buttons: [
					{ label: t.skip, value: 'skip', variant: 'cancel' },
					{ label: t.later, value: false, variant: 'cancel' },
					{ label: t.update, value: true, variant: 'primary' },
				],
			});

			if (result === true) {
				Bridge.updateScript(hash);
			} else if (result === 'skip') {
				await Bridge.setValue('skippedVersion', version);
			}
		} catch (error) {
			this.logger?.log(`Failed to show update modal: ${error}`, 'error');
		}
	}
}
