import { Logger } from '../core/logger.js';

let confirmResolve = null;
let promptResolve = null;

function isModalOpen(modalId) {
    const modal = document.getElementById(modalId);
    return modal && modal.classList.contains('show');
}

export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        Logger.debug('Modal opened', { modalId });
    } else {
        Logger.warn('Modal not found', { modalId });
    }
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        Logger.debug('Modal closed', { modalId });
    }
}

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

export function initPromptKeyboard() {
    const promptInput = document.getElementById('promptInput');
    if (promptInput) {
        promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitPromptModal();
            }
        });
    }
}

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

export function closeAllModals() {
    if (isModalOpen('confirmModal')) {
        closeConfirmModal(false);
        return;
    }
    if (isModalOpen('promptModal')) {
        closePromptModal(null);
        return;
    }
    if (isModalOpen('winnerResultModal')) {
        closeModal('winnerResultModal');
        return;
    }
    if (isModalOpen('winnerListModal')) {
        closeModal('winnerListModal');
        return;
    }
    if (isModalOpen('settingsModal')) {
        closeModal('settingsModal');
        return;
    }
    if (isModalOpen('addPrizeModal')) {
        closeModal('addPrizeModal');
        return;
    }
}
