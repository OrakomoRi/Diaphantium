export class SmoothScroll {
	constructor() {
		this.init();
	}

	init() {
		this.handleAnchorClicks();
		this.handleScrollIndicator();
		this.handleScrollSpy();
	}

	handleAnchorClicks() {
		document.querySelectorAll('a[href^="#"]').forEach(anchor => {
			anchor.addEventListener('click', (e) => {
				const href = anchor.getAttribute('href');
				if (href === '#' || href === '#hero') return;

				e.preventDefault();

				const sectionName = href.substring(1);
				const target = document.querySelector(`[data-section="${sectionName}"]`);

				if (target) {
					const headerOffset = 80;
					const elementPosition = target.getBoundingClientRect().top;
					const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

					window.scrollTo({ top: offsetPosition, behavior: 'smooth' });

					document.querySelectorAll('.nav-link').forEach(link => {
						link.classList.remove('active');
					});
					anchor.classList.add('active');
				}
			});
		});
	}

	handleScrollIndicator() {
		const scrollIndicator = document.querySelector('.hero-scroll');
		if (!scrollIndicator) return;

		scrollIndicator.addEventListener('click', () => {
			const quickstart = document.querySelector('[data-section="quickstart"]');
			if (quickstart) {
				quickstart.scrollIntoView({ behavior: 'smooth' });
			}
		});
	}

	handleScrollSpy() {
		const sections = document.querySelectorAll('[data-section]');
		const navLinks = document.querySelectorAll('.nav-link[href^="#"]');

		if (sections.length === 0 || navLinks.length === 0) return;

		const observer = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					const sectionName = entry.target.getAttribute('data-section');
					navLinks.forEach(link => {
						link.classList.remove('active');
						if (link.getAttribute('href') === `#${sectionName}`) {
							link.classList.add('active');
						}
					});
				}
			});
		}, { root: null, rootMargin: '-100px 0px -66%', threshold: 0 });

		sections.forEach(section => observer.observe(section));
	}
}
