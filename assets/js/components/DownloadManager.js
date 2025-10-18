export class DownloadManager {
	constructor() {
		this.init();
	}

	init() {
		this.setupDownloadButtons();
	}

	setupDownloadButtons() {
		const downloadButtons = document.querySelectorAll('[data-download]');

		downloadButtons.forEach(button => {
			button.addEventListener('click', (e) => {
				e.preventDefault();
				const file = button.dataset.download;
				this.downloadFile(file);
			});
		});
	}

	downloadFile(filename) {
		const downloadUrl = `./release/${filename}`;

		const link = document.createElement('a');
		link.href = downloadUrl;
		link.download = filename;
		link.style.display = 'none';

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		this.showDownloadNotification(filename);
	}

	showDownloadNotification(filename) {
		console.log(`✓ Downloaded: ${filename}`);
	}
}
