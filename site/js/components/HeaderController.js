export class HeaderController {
	constructor() {
		this.header = document.querySelector('.header');
		this.logo = document.querySelector('.logo');
		this.navLinks = document.querySelectorAll('.nav-link');
		this.init();
	}

	init() {
		this.handleScroll();
		this.handleActiveLink();
		this.handleLogoClick();
	}

	handleLogoClick() {
		if (this.logo) {
			this.logo.addEventListener('click', (e) => {
				e.preventDefault();
				location.reload();
			});
		}
	}

	handleScroll() {
		window.addEventListener('scroll', () => {
			this.header.classList.toggle('scrolled', window.pageYOffset > 100);
		}, { passive: true });
	}

	handleActiveLink() {
		const sections = document.querySelectorAll('section[data-section]');

		const observer = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					const sectionName = entry.target.getAttribute('data-section');
					this.navLinks.forEach(link => {
						link.classList.toggle('active', link.getAttribute('href') === `#${sectionName}`);
					});
				}
			});
		}, { threshold: 0.3 });

		sections.forEach(section => observer.observe(section));
	}
}
