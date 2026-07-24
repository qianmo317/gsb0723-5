/**
 * 弹窗模块
 * 通用弹窗显隐，以及替代原生 confirm / prompt 的 Promise 弹窗
 */

import { Logger } from '../core/logger.js';

/**
 * 显示弹窗
 */
export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        Logger.debug('Modal opened', { modalId });
    } else {
        Logger.warn('Modal not found', { modalId });
    }
}

/**
 * 关闭弹窗
 */
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        Logger.debug('Modal closed', { modalId });
    }
}

// ========================================
// 自定义确认弹窗（替代 confirm）
// ========================================
let confirmResolve = null;

export function showConfirm(message, title = '确认操作') {
    return new Promise((resolve) => {
        confirmResolve = resolve;

        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');

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

// ========================================
// 自定义输入弹窗（替代 prompt）
// ========================================
let promptResolve = null;

export function showPrompt(label, defaultValue = '', title = '请输入') {
    return new Promise((resolve) => {
        promptResolve = resolve;

        const titleEl = document.getElementById('promptTitle');
        const labelEl = document.getElementById('promptLabel');
        const inputEl = document.getElementById('promptInput');

        if (titleEl) titleEl.textContent = title;
        if (labelEl) labelEl.textContent = label;
        if (inputEl) {
            inputEl.value = defaultValue;
            inputEl.placeholder = defaultValue;
        }

        showModal('promptModal');

        // 自动聚焦输入框
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
    const inputEl = document.getElementById('promptInput');
    const value = inputEl?.value || '';
    closePromptModal(value);
}
