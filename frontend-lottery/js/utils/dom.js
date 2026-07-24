/**
 * DOM 工具模块
 * 提供元素查询、HTML 转义、Toast 提示、弹窗系统
 */
import { Logger } from './logger.js';

export const $ = (id) => document.getElementById(id);

export function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

export function showToast(message, type = 'info') {
    try {
        const container = $('toastContainer');
        if (!container) {
            console.warn('Toast container not found');
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 3000);

        if (type === 'error') {
            Logger.warn('Toast error shown', { message });
        }
    } catch (error) {
        console.error('Failed to show toast:', error);
    }
}

export function showModal(modalId) {
    const modal = $(modalId);
    if (modal) {
        modal.classList.add('show');
        Logger.debug('Modal opened', { modalId });
    } else {
        Logger.warn('Modal not found', { modalId });
    }
}

export function closeModal(modalId) {
    const modal = $(modalId);
    if (modal) {
        modal.classList.remove('show');
        Logger.debug('Modal closed', { modalId });
    }
}

let confirmResolve = null;

export function showConfirm(message, title = '确认操作') {
    return new Promise((resolve) => {
        confirmResolve = resolve;

        const titleEl = $('confirmTitle');
        const messageEl = $('confirmMessage');

        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.innerHTML = message;

        showModal('confirmModal');
    });
}

export function closeConfirmModal(result) {
    closeModal('confirmModal');
    if (confirmResolve) {
        confirmResolve(result);
        confirmResolve = null;
    }
}

let promptResolve = null;

export function showPrompt(label, defaultValue = '', title = '请输入') {
    return new Promise((resolve) => {
        promptResolve = resolve;

        const titleEl = $('promptTitle');
        const labelEl = $('promptLabel');
        const inputEl = $('promptInput');

        if (titleEl) titleEl.textContent = title;
        if (labelEl) labelEl.textContent = label;
        if (inputEl) {
            inputEl.value = defaultValue;
            inputEl.placeholder = defaultValue;
        }

        showModal('promptModal');

        setTimeout(() => inputEl?.focus(), 100);
    });
}

export function closePromptModal(value) {
    closeModal('promptModal');
    if (promptResolve) {
        promptResolve(value);
        promptResolve = null;
    }
}

export function submitPromptModal() {
    const inputEl = $('promptInput');
    const value = inputEl?.value || '';
    closePromptModal(value);
}
