import { Logger } from '@utensilia/logger';
import { NAME } from '../config/config';

export const logger = new Logger(NAME);

document.addEventListener('diaphantium:log', () => {
	logger.enableLogging();
});

if (window.__DIAPHANTIUM__?.source) logger.enableLogging();
