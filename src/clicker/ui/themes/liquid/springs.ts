import type { SpringPreset } from '../../motion/springs';

export const SPRINGS = {
	snappy: { stiffness: 560, damping: 40, mass: 0.9 },
	soft: { stiffness: 300, damping: 32, mass: 1 },
	fade: { stiffness: 420, damping: 48, mass: 1 },
	lead: { stiffness: 760, damping: 46, mass: 0.8 },
	trail: { stiffness: 240, damping: 26, mass: 1 },
	unfold: { stiffness: 340, damping: 27, mass: 1 },
	fold: { stiffness: 620, damping: 52, mass: 0.9 },
	glide: { stiffness: 380, damping: 36, mass: 1 },
	windUp: { visualDuration: 0.3, bounce: 0.3 },
	spin: { visualDuration: 0.6, bounce: 0.2 },
} as const satisfies Record<string, SpringPreset>;
