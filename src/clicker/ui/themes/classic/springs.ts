import type { SpringPreset } from '../../motion/springs';

export const SPRINGS = {
	fade: { visualDuration: 0.25, bounce: 0 },
	knob: { visualDuration: 0.35, bounce: 0.2 },
	slide: { visualDuration: 0.3, bounce: 0.15 },
	pane: { visualDuration: 0.35, bounce: 0.05 },
	paneFade: { visualDuration: 0.3, bounce: 0 },
	windUp: { visualDuration: 0.3, bounce: 0.3 },
	spin: { visualDuration: 0.6, bounce: 0.2 },
	glide: { visualDuration: 0.28, bounce: 0.05 },
	height: { visualDuration: 0.35, bounce: 0 },
} as const satisfies Record<string, SpringPreset>;
