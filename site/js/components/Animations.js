export class Animations {
	init() {
		if (typeof gsap === 'undefined') return;
		gsap.registerPlugin(ScrollTrigger);

		this.setupScrollProgress();
		this.setupCursorSpotlight();
		this.setupHero();
		this.setupScrollAnimations();
	}

	setupScrollProgress() {
		const bar = document.createElement('div');
		bar.className = 'scroll-progress-bar';
		document.body.appendChild(bar);
		gsap.set(bar, { scaleX: 0, transformOrigin: 'left center' });

		const update = () => {
			const max = document.documentElement.scrollHeight - window.innerHeight;
			gsap.set(bar, { scaleX: max > 0 ? window.scrollY / max : 0 });
		};

		window.addEventListener('scroll', update, { passive: true });

		new ResizeObserver(update).observe(document.documentElement);
	}

	setupCursorSpotlight() {
		if (window.matchMedia('(hover: none)').matches) return;

		const el = document.createElement('div');
		el.className = 'cursor-spotlight';
		document.body.appendChild(el);

		document.addEventListener('mousemove', e => {
			gsap.to(el, { left: e.clientX, top: e.clientY, duration: 0.9, ease: 'power2.out' });
		});
	}

	setupHero() {
		const targets = ['.hero-badge', '.hero-title', '.hero-description', '.hero-actions'];
		gsap.set(targets, { y: 20 });

		gsap.timeline({ defaults: { ease: 'power3.out' } })
			.to('.hero-badge',       { autoAlpha: 1, y: 0, duration: 0.55 }, 0.15)
			.to('.hero-title',       { autoAlpha: 1, y: 0, duration: 0.75 }, 0.3)
			.to('.hero-description', { autoAlpha: 1, y: 0, duration: 0.65 }, 0.5)
			.to('.hero-actions',     { autoAlpha: 1, y: 0, duration: 0.6  }, 0.65);
	}

	setupScrollAnimations() {
		const toggle = 'play none none reverse';
		const trigger = (el, start = 'top 87%') => ({
			trigger: el,
			start,
			toggleActions: toggle
		});

		gsap.utils.toArray('.section-header').forEach(el => {
			gsap.from(el, {
				scrollTrigger: trigger(el),
				opacity: 0, y: 28, duration: 0.7, ease: 'power3.out'
			});
		});

		const stepsWrap = document.querySelector('.quickstart-steps');
		if (stepsWrap) {
			gsap.from('.step-card', {
				scrollTrigger: trigger(stepsWrap, 'top 82%'),
				opacity: 0, y: 36, stagger: 0.1, duration: 0.65, ease: 'power3.out'
			});
		}

		['.about-intro', '.about-why', '.version-history-title'].forEach(sel => {
			const el = document.querySelector(sel);
			if (el) {
				gsap.from(el, {
					scrollTrigger: trigger(el),
					opacity: 0, y: 24, duration: 0.65, ease: 'power3.out'
				});
			}
		});
	}

	animateTimeline() {
		if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
		const mobile = window.matchMedia('(max-width: 768px)').matches;
		const toggle = 'play none none reverse';

		gsap.utils.toArray('.timeline-item').forEach((item, i) => {
			const content = item.querySelector('.timeline-content');
			const marker  = item.querySelector('.timeline-marker');
			const xOff    = mobile ? 0 : (i % 2 === 0 ? -28 : 28);
			const yOff    = mobile ? 18 : 0;

			if (marker) {
				gsap.from(marker, {
					scrollTrigger: { trigger: item, start: 'top 88%', toggleActions: toggle },
					opacity: 0, scale: 0, duration: 0.4, ease: 'back.out(2)'
				});
			}
			if (content) {
				gsap.from(content, {
					scrollTrigger: { trigger: item, start: 'top 88%', toggleActions: toggle },
					opacity: 0, x: xOff, y: yOff,
					duration: 0.65, ease: 'power3.out', delay: 0.05
				});
			}
		});
	}
}
