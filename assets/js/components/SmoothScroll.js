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

				// Close mobile menu if link is inside it
				const isMobileMenuLink = anchor.classList.contains('mobile-menu-link');
				if (isMobileMenuLink) {
					const menuOverlay = document.querySelector('.mobile-menu-overlay');
					const menuToggle = document.querySelector('.menu-toggle');
					if (menuOverlay) {
						menuOverlay.classList.remove('active');
					}
					if (menuToggle) {
						menuToggle.classList.remove('active');
					}
					document.body.classList.remove('menu-open');
					document.body.style.top = '';
				}

				// Extract section name from href (e.g., "#quickstart" -> "quickstart")
				const sectionName = href.substring(1);

				// Find element by data-section attribute
				const target = document.querySelector(`[data-section="${sectionName}"]`);

				if (target) {
					// Small delay for mobile menu to close
					setTimeout(() => {
						const headerOffset = 80;
						const elementPosition = target.getBoundingClientRect().top;
						const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

						window.scrollTo({
							top: offsetPosition,
							behavior: 'smooth'
						});
					}, isMobileMenuLink ? 100 : 0);

					// Update active nav link
					document.querySelectorAll('.nav-link, .mobile-menu-link').forEach(link => {
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

		const observerOptions = {
			root: null,
			rootMargin: '-100px 0px -66%',
			threshold: 0
		};

		const observerCallback = (entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					const sectionName = entry.target.getAttribute('data-section');

					// Update active nav link
					navLinks.forEach(link => {
						link.classList.remove('active');
						const href = link.getAttribute('href');
						if (href === `#${sectionName}`) {
							link.classList.add('active');
						}
					});
				}
			});
		};

		const observer = new IntersectionObserver(observerCallback, observerOptions);

		sections.forEach(section => {
			observer.observe(section);
		});
	}
}