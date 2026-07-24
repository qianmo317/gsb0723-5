import { Logger } from './core/logger.js';
import { initApp } from './app.js';
import './tests.js';

document.addEventListener('DOMContentLoaded', () => {
    Logger.info('Application starting (ES Module)');
    initApp();
});

Logger.info('Main module loaded');
