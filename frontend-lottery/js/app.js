/**
 * 3D抽奖系统主入口
 * 负责初始化、事件绑定（data-action 事件委托）、键盘快捷键与生命周期
 */
import { Logger } from './utils/logger.js';
import { $, showToast, closeModal, closeConfirmModal, closePromptModal, submitPromptModal } from './utils/dom.js';
import { LotteryStorage } from './core/storage.js';
import { Lottery } from './core/lottery.js';
import { AppState } from './state.js';
import { initParticles } from './ui/effects.js';
import { renderPrizeList, renderParticipantList, applySettings } from './ui/renderer.js';
import { showAddPrizeModal, addPrize, deletePrize, selectPrize } from './handlers/prize.js';
import { toggleLottery } from './handlers/draw.js';
import { generateRandomParticipants, triggerFileUpload, handleFileUpload, downloadTemplate, clearParticipants } from './handlers/participants.js';
import { showWinnerListModal, exportWinnerList } from './handlers/winners.js';
import { showSettingsModal, triggerBgUpload, handleBgUpload, clearBgPreview, saveSettings, resetAllData } from './handlers/settings.js';

function initApp() {
    try {
        initParticles();

        const integrity = LotteryStorage.validateIntegrity();
        if (!integrity.valid) {
            Logger.warn('Data integrity issues detected on startup');
        }

        const settings = LotteryStorage.getSettings();
        applySettings(settings);

        renderPrizeList();
        renderParticipantList();

        const participants = LotteryStorage.getAvailableParticipants();
        Lottery.initSphere(participants);

        bindEvents();

        const stats = LotteryStorage.getStats();
        Logger.info('Application initialized', stats);

    } catch (error) {
        Logger.error('Application initialization failed', { error: error.message, stack: error.stack });
        showToast('应用初始化失败，请刷新页面重试', 'error');
    }
}

const actionHandlers = {
    'show-add-prize': showAddPrizeModal,
    'add-prize': addPrize,
    'delete-prize': (el) => deletePrize(el.dataset.prizeId),
    'select-prize': (el) => selectPrize(el.dataset.prizeId),
    'show-winners': showWinnerListModal,
    'export-winners': exportWinnerList,
    'show-settings': showSettingsModal,
    'save-settings': saveSettings,
    'reset-data': resetAllData,
    'toggle-lottery': toggleLottery,
    'generate-random': generateRandomParticipants,
    'trigger-upload': triggerFileUpload,
    'download-template': downloadTemplate,
    'clear-participants': clearParticipants,
    'trigger-bg-upload': triggerBgUpload,
    'clear-bg-preview': clearBgPreview,
    'close-modal': (el) => closeModal(el.dataset.modalId),
    'confirm-cancel': () => closeConfirmModal(false),
    'confirm-ok': () => closeConfirmModal(true),
    'prompt-cancel': () => closePromptModal(null),
    'prompt-submit': submitPromptModal,
    'close-winner-result': () => closeModal('winnerResultModal')
};

function handleActionClick(event) {
    // 忽略隐藏 file input 的程序化 click 事件冒泡，避免重复触发上传
    if (event.target.tagName === 'INPUT' && event.target.type === 'file') return;

    const el = event.target.closest('[data-action]');
    if (!el) return;

    const action = el.dataset.action;
    const handler = actionHandlers[action];
    if (handler) {
        event.preventDefault();
        handler(el, event);
    }
}

function bindEvents() {
    document.addEventListener('click', handleActionClick);

    const fileInput = $('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    const bgInput = $('bgInput');
    if (bgInput) {
        bgInput.addEventListener('change', handleBgUpload);
    }

    const promptInput = $('promptInput');
    if (promptInput) {
        promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitPromptModal();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
            e.preventDefault();
            const lotteryBtn = $('lotteryBtn');
            if (lotteryBtn && !lotteryBtn.disabled) {
                toggleLottery();
            }
        }

        if (e.code === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(modal => {
                modal.classList.remove('show');
            });
        }

        if (e.ctrlKey && e.code === 'KeyD') {
            e.preventDefault();
            console.log('=== Debug Info ===');
            console.log('Storage Stats:', LotteryStorage.getStats());
            console.log('Lottery State:', Lottery.getState());
            console.log('Current Prize ID:', AppState.currentPrizeId);
            console.log('Is Running:', AppState.isLotteryRunning);
            console.log('Recent Logs:', Logger.getLogs().slice(-20));
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && AppState.isLotteryRunning) {
            Logger.warn('Page hidden while lottery running');
        }
    });

    window.addEventListener('beforeunload', (e) => {
        if (AppState.isLotteryRunning) {
            e.preventDefault();
            e.returnValue = '抽奖正在进行中，确定要离开吗？';
            return e.returnValue;
        }
    });
}

window.LotteryDebug = {
    getStats: () => LotteryStorage.getStats(),
    getLogs: () => Logger.getLogs(),
    exportLogs: () => Logger.export(),
    validateData: () => LotteryStorage.validateIntegrity(),
    getState: () => ({
        currentPrizeId: AppState.currentPrizeId,
        isLotteryRunning: AppState.isLotteryRunning,
        lotteryState: Lottery.getState()
    })
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

Logger.info('App.js loaded successfully');
