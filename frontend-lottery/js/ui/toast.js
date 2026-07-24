/**
 * Toast 提示模块
 */

import { Logger } from '../core/logger.js';

/**
 * 显示Toast提示
 */
export function showToast(message, type = 'info') {
    try {
        const container = document.getElementById('toastContainer');
        if (!container) {
            console.warn('Toast container not found');
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // 自动移除
        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 3000);

        // 记录日志
        if (type === 'error') {
            Logger.warn('Toast error shown', { message });
        }
    } catch (error) {
        console.error('Failed to show toast:', error);
    }
}
