export class HeaderController {
    constructor() {
        this.header = document.querySelector('.header');
        this.logo = document.querySelector('.logo');
        this.menuToggle = document.querySelector('.menu-toggle');
        this.mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
        this.mobileMenuClose = document.querySelector('.mobile-menu-close');
        this.mobileMenuLinks = document.querySelectorAll('.mobile-menu-link');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.scrollPosition = 0;
        this.init();
    }

    init() {
        this.handleScroll();
        this.handleMobileMenu();
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

    closeMenu(restoreScroll = true) {
        this.mobileMenuOverlay.classList.remove('active');
        this.menuToggle.classList.remove('active');
        
        // Remove body lock first
        document.body.classList.remove('menu-open');
        document.body.style.top = '';
        
        // Restore scroll position only if not navigating
        if (restoreScroll) {
            // Use requestAnimationFrame to ensure body styles are applied first
            requestAnimationFrame(() => {
                window.scrollTo(0, this.scrollPosition);
            });
        }
    }

    openMenu() {
        this.scrollPosition = window.pageYOffset;
        this.mobileMenuOverlay.classList.add('active');
        this.menuToggle.classList.add('active');
        document.body.style.top = `-${this.scrollPosition}px`;
        document.body.classList.add('menu-open');
    }

    handleScroll() {
        let lastScroll = 0;

        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;

            if (currentScroll > 100) {
                this.header.classList.add('scrolled');
            } else {
                this.header.classList.remove('scrolled');
            }

            lastScroll = currentScroll;
        });
    }

    handleMobileMenu() {
        if (!this.menuToggle || !this.mobileMenuOverlay) return;

        // Open menu on toggle click
        this.menuToggle.addEventListener('click', () => {
            this.openMenu();
        });

        // Close menu on close button click
        if (this.mobileMenuClose) {
            this.mobileMenuClose.addEventListener('click', () => {
                this.closeMenu();
            });
        }

        // Close on overlay backdrop click
        this.mobileMenuOverlay.addEventListener('click', (e) => {
            if (e.target === this.mobileMenuOverlay) {
                this.closeMenu();
            }
        });

        // Mobile menu link clicks are now handled by SmoothScroll component
        // which will close the menu and navigate properly

        // Close menu on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.mobileMenuOverlay.classList.contains('active')) {
                this.closeMenu();
            }
        });
    }

    handleActiveLink() {
        const sections = document.querySelectorAll('section[data-section]');
        const allLinks = [...this.navLinks, ...this.mobileMenuLinks];

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionName = entry.target.getAttribute('data-section');
                    allLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${sectionName}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, {
            threshold: 0.3
        });

        sections.forEach(section => observer.observe(section));
    }
}
