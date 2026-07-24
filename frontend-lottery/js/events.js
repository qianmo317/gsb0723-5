/**
 * 事件绑定模块
 * 使用事件委托统一处理 data-action 点击，
 * 并集中注册文件输入、键盘快捷键等全局监听。
 */

import { Logger } from './core/logger.js';
import { LotteryStorage } from './core/storage.js';
import { AppState } from './core/state.js';
import { Lottery } from './features/lottery-engine.js';
import { actions } from './actions.js';
import { handleFileUpload } from './features/participants.js';
import { handleBgUpload } from './features/settings.js';
import { submitPromptModal, closeConfirmModal, closePromptModal } from './ui/modals.js';
import { toggleLottery } from './features/lottery-control.js';

/**
 * 绑定所有事件监听器
 */
export function bindEvents() {
    bindActionDelegation();
    bindFileInputs();
    bindPromptInput();
    bindKeyboardShortcuts();
    bindLifecycleGuards();
}

/**
 * data-action 点击委托
 * 从事件目标向上查找最近的 [data-action] 元素并执行对应动作，
 * 天然处理了删除按钮嵌套在奖品项内部的冒泡问题。
 */
function bindActionDelegation() {
    document.addEventListener('click', (event) => {
        const el = event.target.closest('[data-action]');
        if (!el) return;

        const actionName = el.dataset.action;
        const handler = actions[actionName];
        if (!handler) {
            Logger.warn('No handler for action', { actionName });
            return;
        }

        handler(el, event);
    });
}

/**
 * 文件选择输入（名单导入 / 背景图片）
 */
function bindFileInputs() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    const bgInput = document.getElementById('bgInput');
    if (bgInput) {
        bgInput.addEventListener('change', handleBgUpload);
    }
}

/**
 * 输入弹窗支持回车提交
 */
function bindPromptInput() {
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

/**
 * 键盘快捷键
 */
function bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // 空格键开始/停止抽奖
        if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
            e.preventDefault();
            const lotteryBtn = document.getElementById('lotteryBtn');
            if (lotteryBtn && !lotteryBtn.disabled) {
                toggleLottery();
            }
        }

        // ESC关闭弹窗
        if (e.code === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(modal => {
                // confirm / prompt 弹窗需要 resolve 其 Promise（取消结果），
                // 否则 await showConfirm / showPrompt 的调用路径会永远挂起。
                if (modal.id === 'confirmModal') {
                    closeConfirmModal(false);
                } else if (modal.id === 'promptModal') {
                    closePromptModal(null);
                } else {
                    modal.classList.remove('show');
                }
            });
        }

        // Ctrl+D 调试信息
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
}

/**
 * 页面生命周期保护
 */
function bindLifecycleGuards() {
    // 页面可见性变化处理
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && AppState.isLotteryRunning) {
            Logger.warn('Page hidden while lottery running');
        }
    });

    // 页面卸载前保存状态
    window.addEventListener('beforeunload', (e) => {
        if (AppState.isLotteryRunning) {
            e.preventDefault();
            e.returnValue = '抽奖正在进行中，确定要离开吗？';
            return e.returnValue;
        }
    });
}
