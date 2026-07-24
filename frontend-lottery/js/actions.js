/**
 * 动作注册表
 * 将 DOM 上的 data-action 声明映射到具体功能函数，
 * 取代原先散落在 HTML 中的内联 onclick 全局函数。
 */

import { showModal, closeModal, closeConfirmModal, closePromptModal, submitPromptModal } from './ui/modals.js';
import { selectPrize, deletePrize, showAddPrizeModal, addPrize } from './features/prizes.js';
import {
    generateRandomParticipants,
    triggerFileUpload,
    downloadTemplate,
    clearParticipants
} from './features/participants.js';
import { showWinnerListModal, exportWinnerList } from './features/winners.js';
import {
    showSettingsModal,
    triggerBgUpload,
    clearBgPreview,
    saveSettings,
    resetAllData
} from './features/settings.js';
import { toggleLottery } from './features/lottery-control.js';

/**
 * 动作处理函数签名：(element, event) => void
 * element 为携带 data-action 的元素，可从 dataset 读取额外参数。
 */
export const actions = {
    // 奖品
    'add-prize-modal': () => showAddPrizeModal(),
    'add-prize': () => addPrize(),
    'select-prize': (el) => selectPrize(el.dataset.prizeId),
    'delete-prize': (el) => deletePrize(el.dataset.prizeId),

    // 抽奖
    'toggle-lottery': () => toggleLottery(),

    // 参与者
    'generate-participants': () => generateRandomParticipants(),
    'trigger-file-upload': () => triggerFileUpload(),
    'download-template': () => downloadTemplate(),
    'clear-participants': () => clearParticipants(),

    // 中奖名单
    'show-winner-list': () => showWinnerListModal(),
    'export-winners': () => exportWinnerList(),

    // 设置
    'show-settings': () => showSettingsModal(),
    'trigger-bg-upload': () => triggerBgUpload(),
    'clear-bg-preview': () => clearBgPreview(),
    'save-settings': () => saveSettings(),
    'reset-all': () => resetAllData(),

    // 通用弹窗
    'open-modal': (el) => showModal(el.dataset.modalId),
    'close-modal': (el) => closeModal(el.dataset.modalId),
    'confirm-ok': () => closeConfirmModal(true),
    'confirm-cancel': () => closeConfirmModal(false),
    'prompt-submit': () => submitPromptModal(),
    'prompt-cancel': () => closePromptModal(null)
};
