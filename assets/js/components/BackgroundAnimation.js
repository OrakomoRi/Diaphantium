/**
 * Background Animation Component
 * Uses CSS Custom Properties for better performance and cleaner code.
 * Implements orb system with optimized movement and resource management.
 */

class Orb {
	constructor(index, options) {
		this.index = index;
		this.options = options;

		// Random initial position
		this.x = Math.random() * 100;
		this.y = Math.random() * 100;

		// Random initial direction (angle)
		this.angle = Math.random() * Math.PI * 2;

		// Target direction for smooth transitions
		this.targetAngle = this.angle;

		// Constant speed - never changes
		this.speed = this.options.constantSpeed;

		this.speedMultiplier = 1;
		this.cssPropertyX = `--orb-${index}-x`;
		this.cssPropertyY = `--orb-${index}-y`;

		// Time offset for unique behavior per orb
		this.timeOffset = Math.random() * Math.PI * 2;
		this.directionChangeTimer = 0;
		this.directionChangeInterval = 60 + Math.random() * 120; // 1-3 seconds at 60fps
	}

	update() {
		// Smooth random direction changes
		this.directionChangeTimer++;

		if (this.directionChangeTimer >= this.directionChangeInterval) {
			// Set new target direction
			this.targetAngle = Math.random() * Math.PI * 2;
			this.directionChangeTimer = 0;
			this.directionChangeInterval = 60 + Math.random() * 120; // New random interval
		}

		// Smoothly interpolate to target angle
		let angleDiff = this.targetAngle - this.angle;

		// Handle angle wrapping (shortest path)
		if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
		if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

		// Smooth interpolation
		this.angle += angleDiff * this.options.directionChangeRate;

		// Add subtle continuous direction variation
		this.angle += (Math.random() - 0.5) * 0.005;

		// Calculate velocity from angle and constant speed
		const currentSpeed = this.speed * this.speedMultiplier;
		const vx = Math.cos(this.angle) * currentSpeed;
		const vy = Math.sin(this.angle) * currentSpeed;

		// Update position
		this.x += vx;
		this.y += vy;

		// Boundary handling with direction change (no energy loss)
		if (this.x <= 0 || this.x >= 100) {
			this.x = Math.max(0, Math.min(100, this.x));
			// Reflect angle horizontally and add small random variation
			this.angle = Math.PI - this.angle + (Math.random() - 0.5) * 0.2;
			this.targetAngle = this.angle; // Reset target to current
		}

		if (this.y <= 0 || this.y >= 100) {
			this.y = Math.max(0, Math.min(100, this.y));
			// Reflect angle vertically and add small random variation
			this.angle = -this.angle + (Math.random() - 0.5) * 0.2;
			this.targetAngle = this.angle; // Reset target to current
		}

		// Normalize angle to 0-2π range
		this.angle = this.angle % (Math.PI * 2);
		if (this.angle < 0) this.angle += Math.PI * 2;
	}

	updateCSS(root) {
		// Update CSS custom properties for smooth animation
		root.style.setProperty(this.cssPropertyX, `${this.x.toFixed(2)}%`);
		root.style.setProperty(this.cssPropertyY, `${this.y.toFixed(2)}%`);
	}
}

export class BackgroundAnimation {
	constructor(options = {}) {
		this.options = {
			orbCount: 4,
			constantSpeed: 0.08,
			directionChangeRate: 0.02,
			enableVisibilityOptimization: true,
			enableReducedMotion: true,
			targetFPS: 60,
			...options
		};

		this.orbs = [];
		this.particles = [];
		this.isRunning = false;
		this.animationId = null;
		this.documentRoot = document.documentElement;
		this.lastFrameTime = 0;
		this.frameInterval = 1000 / this.options.targetFPS; // 16.67ms for 60fps

		this.init();
	}

	/**
	 * Initialize animation
	 * @private
	 */
	init() {
		// Check for reduced motion preference
		if (this.options.enableReducedMotion && this.prefersReducedMotion()) {
			return;
		}

		// Check if CSS custom properties are supported
		if (!this.supportsCSSCustomProperties()) {
			console.warn('CSS Custom Properties not supported. Background animation disabled.');
			return;
		}

		this.createOrbs();
		this.createParticles();
		this.setupVisibilityOptimization();
		this.start();
	}

	/**
	 * Create orb instances
	 * @private
	 */
	createOrbs() {
		const container = document.querySelector('.hero-background');
		if (!container) return;

		// Create orb elements dynamically
		for (let i = 1; i <= this.options.orbCount; i++) {
			const orbElement = document.createElement('div');
			orbElement.className = `hero-orb hero-orb-${i}`;
			container.appendChild(orbElement);
			
			this.orbs.push(new Orb(i, this.options));
		}

		// Show orbs with fade-in effect after spawn
		setTimeout(() => {
			const orbElements = document.querySelectorAll('.hero-orb');
			orbElements.forEach((orb, index) => {
				setTimeout(() => {
					orb.classList.add('active');
				}, index * 200); // Stagger the appearance
			});
		}, 500);
	}

	/**
	 * Create particle elements
	 * @private
	 */
	createParticles() {
		const container = document.querySelector('.hero-particles');
		if (!container) return;

		const particleCount = 50;
		for (let i = 0; i < particleCount; i++) {
			const particle = document.createElement('div');
			particle.className = 'particle';
			
			const startX = Math.random() * 100;
			const delay = Math.random() * 15;
			const duration = 15 + Math.random() * 10;
			
			particle.style.left = `${startX}%`;
			particle.style.bottom = '0';
			particle.style.animationDelay = `${delay}s`;
			particle.style.animationDuration = `${duration}s`;
			
			container.appendChild(particle);
			this.particles.push(particle);
		}

		// Activate particles with delay
		setTimeout(() => {
			this.particles.forEach(particle => particle.classList.add('active'));
		}, 800);
	}

	/**
	 * Start animation
	 */
	start() {
		if (this.isRunning) return;

		this.isRunning = true;
		this.animate();
	}

	/**
	 * Stop animation
	 */
	stop() {
		this.isRunning = false;
		if (this.animationId) {
			cancelAnimationFrame(this.animationId);
			this.animationId = null;
		}
	}

	/**
	 * Animation loop with FPS throttling
	 * @private
	 */
	animate() {
		if (!this.isRunning) return;

		const currentTime = performance.now();
		const deltaTime = currentTime - this.lastFrameTime;

		// Frame rate limiting for smooth 60fps
		if (deltaTime >= this.frameInterval) {
			// Batch CSS updates for better performance
			this.orbs.forEach(orb => orb.update());
			
			// Use single style update batch
			requestAnimationFrame(() => {
				this.orbs.forEach(orb => orb.updateCSS(this.documentRoot));
			});

			this.lastFrameTime = currentTime - (deltaTime % this.frameInterval);
		}

		this.animationId = requestAnimationFrame(() => this.animate());
	}

	/**
	 * Setup visibility optimization
	 * @private
	 */
	setupVisibilityOptimization() {
		if (!this.options.enableVisibilityOptimization) return;

		// Pause animation when tab is not visible
		document.addEventListener('visibilitychange', () => {
			if (document.hidden) {
				this.stop();
			} else {
				this.start();
			}
		});

		// Pause animation when window loses focus
		window.addEventListener('blur', () => this.stop());
		window.addEventListener('focus', () => this.start());
	}

	/**
	 * Check if user prefers reduced motion
	 * @returns {boolean}
	 * @private
	 */
	prefersReducedMotion() {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	/**
	 * Check if CSS custom properties are supported
	 * @returns {boolean}
	 * @private
	 */
	supportsCSSCustomProperties() {
		return window.CSS && CSS.supports('color', 'var(--fake-var)');
	}

	/**
	 * Destroy animation and cleanup
	 */
	destroy() {
		this.stop();
		this.orbs = [];
		this.particles.forEach(particle => particle.remove());
		this.particles = [];
	}
}
