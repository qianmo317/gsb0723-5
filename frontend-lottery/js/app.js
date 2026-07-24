import { Logger } from './core/logger.js';
import { LotteryStorage } from './core/storage.js';
import { Lottery } from './core/lottery.js';
import { AppState } from './state.js';
import { generateRandomParticipants } from './utils/helpers.js';
import {
    showModal, closeModal, showConfirm, closeConfirmModal,
    showPrompt, closePromptModal, submitPromptModal,
    initPromptKeyboard, showToast, closeAllModals
} from './ui/modals.js';
import {
    renderPrizeList, renderParticipantList, renderWinnerList,
    updateCurrentPrizeDisplay, updateLotteryButtonState,
    showWinnerResultDisplay, applyBackgroundImage, updateBgPreview
} from './ui/renderer.js';
import { initParticles, createFireworks } from './ui/effects.js';
import { downloadTemplate, parseExcelFile, exportWinnerList } from './services/fileService.js';

function initApp() {
    try {
        initParticles();

        const integrity = LotteryStorage.validateIntegrity();
        if (!integrity.valid) {
            Logger.warn('Data integrity issues detected on startup');
        }

        loadSettings();
        renderPrizeList();
        renderParticipantList();

        const participants = LotteryStorage.getAvailableParticipants();
        Lottery.initSphere(participants);

        bindEvents();
        initPromptKeyboard();

        const stats = LotteryStorage.getStats();
        Logger.info('Application initialized', stats);

    } catch (error) {
        Logger.error('Application initialization failed', { error: error.message, stack: error.stack });
        showToast('应用初始化失败，请刷新页面重试', 'error');
    }
}

function loadSettings() {
    try {
        const settings = LotteryStorage.getSettings();

        if (settings.backgroundImage) {
            applyBackgroundImage(settings.backgroundImage);
        }

        const speedSelect = document.getElementById('lotterySpeed');
        if (speedSelect) {
            speedSelect.value = settings.lotterySpeed || 'normal';
        }

        Logger.debug('Settings loaded', { speed: settings.lotterySpeed });
    } catch (error) {
        Logger.error('Failed to load settings', { error: error.message });
    }
}

function bindEvents() {
    document.getElementById('lotteryBtn')?.addEventListener('click', toggleLottery);

    document.getElementById('prizeList')?.addEventListener('click', handlePrizeListClick);

    document.getElementById('participantList')?.addEventListener('click', (e) => e.stopPropagation());

    document.querySelectorAll('[data-action="show-add-prize"]').forEach(btn => {
        btn.addEventListener('click', showAddPrizeModal);
    });

    document.querySelectorAll('[data-action="add-prize"]').forEach(btn => {
        btn.addEventListener('click', addPrize);
    });

    document.querySelectorAll('[data-action="show-winner-list"]').forEach(btn => {
        btn.addEventListener('click', showWinnerListModal);
    });

    document.querySelectorAll('[data-action="show-settings"]').forEach(btn => {
        btn.addEventListener('click', showSettingsModal);
    });

    document.querySelectorAll('[data-action="export-winners"]').forEach(btn => {
        btn.addEventListener('click', handleExportWinners);
    });

    document.querySelectorAll('[data-action="save-settings"]').forEach(btn => {
        btn.addEventListener('click', saveSettings);
    });

    document.querySelectorAll('[data-action="reset-all-data"]').forEach(btn => {
        btn.addEventListener('click', resetAllData);
    });

    document.querySelectorAll('[data-action="close-modal"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.dataset.modal || e.target.closest('.modal')?.id;
            if (modalId) closeModal(modalId);
        });
    });

    document.querySelectorAll('[data-action="confirm-ok"]').forEach(btn => {
        btn.addEventListener('click', () => closeConfirmModal(true));
    });

    document.querySelectorAll('[data-action="confirm-cancel"]').forEach(btn => {
        btn.addEventListener('click', () => closeConfirmModal(false));
    });

    document.querySelectorAll('[data-action="prompt-submit"]').forEach(btn => {
        btn.addEventListener('click', submitPromptModal);
    });

    document.querySelectorAll('[data-action="prompt-cancel"]').forEach(btn => {
        btn.addEventListener('click', () => closePromptModal(null));
    });

    document.querySelectorAll('[data-action="close-result"]').forEach(btn => {
        btn.addEventListener('click', () => closeModal('winnerResultModal'));
    });

    document.querySelectorAll('[data-action="generate-random"]').forEach(btn => {
        btn.addEventListener('click', handleGenerateRandom);
    });

    document.querySelectorAll('[data-action="trigger-upload"]').forEach(btn => {
        btn.addEventListener('click', triggerFileUpload);
    });

    document.querySelectorAll('[data-action="download-template"]').forEach(btn => {
        btn.addEventListener('click', handleDownloadTemplate);
    });

    document.querySelectorAll('[data-action="clear-participants"]').forEach(btn => {
        btn.addEventListener('click', clearParticipants);
    });

    document.querySelectorAll('[data-action="trigger-bg-upload"]').forEach(btn => {
        btn.addEventListener('click', triggerBgUpload);
    });

    document.querySelectorAll('[data-action="clear-bg-preview"]').forEach(btn => {
        btn.addEventListener('click', clearBgPreview);
    });

    document.getElementById('fileInput')?.addEventListener('change', handleFileUpload);
    document.getElementById('bgInput')?.addEventListener('change', handleBgUpload);

    document.addEventListener('keydown', handleKeyboard);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
}

function handlePrizeListClick(e) {
    const deleteBtn = e.target.closest('[data-action="delete-prize"]');
    if (deleteBtn) {
        e.stopPropagation();
        deletePrize(deleteBtn.dataset.prizeId);
        return;
    }

    const prizeItem = e.target.closest('[data-action="select-prize"]');
    if (prizeItem) {
        selectPrize(prizeItem.dataset.prizeId);
    }
}

function selectPrize(prizeId) {
    try {
        if (AppState.isLotteryRunning) {
            showToast('抽奖进行中，请先停止', 'warning');
            return;
        }

        if (!prizeId) {
            Logger.warn('selectPrize called without prizeId');
            return;
        }

        const prizes = LotteryStorage.getPrizes();
        const prize = prizes.find(p => p.id === prizeId);

        if (!prize) {
            showToast('奖品不存在', 'error');
            Logger.warn('Prize not found', { prizeId });
            return;
        }

        const drawnCount = prize.drawnCount || 0;
        if (drawnCount >= prize.count) {
            showToast('该奖品已抽完', 'warning');
            return;
        }

        AppState.currentPrizeId = prizeId;

        updateCurrentPrizeDisplay(prize, drawnCount);

        const availableParticipants = LotteryStorage.getAvailableParticipants();

        if (availableParticipants.length === 0) {
            updateLotteryButtonState(true, false);
            showToast('没有可参与抽奖的人员', 'warning');
        } else {
            updateLotteryButtonState(false, false);
        }

        renderPrizeList();
        Lottery.initSphere(availableParticipants);

        Logger.info('Prize selected', { prizeId, prizeName: prize.name });
    } catch (error) {
        Logger.error('Failed to select prize', { error: error.message, prizeId });
        showToast('选择奖品失败', 'error');
    }
}

async function toggleLottery() {
    try {
        if (!AppState.currentPrizeId) {
            showToast('请先选择奖品', 'warning');
            return;
        }

        if (!AppState.isLotteryRunning) {
            const availableParticipants = LotteryStorage.getAvailableParticipants();

            if (availableParticipants.length === 0) {
                showToast('没有可参与抽奖的人员', 'warning');
                return;
            }

            const settings = LotteryStorage.getSettings();
            const started = Lottery.start(AppState.currentPrizeId, availableParticipants, settings.lotterySpeed);

            if (started) {
                AppState.isLotteryRunning = true;
                updateLotteryButtonState(false, true);
            } else {
                showToast('抽奖启动失败', 'error');
            }
        } else {
            const lotteryBtn = document.getElementById('lotteryBtn');
            const lotteryBtnText = document.getElementById('lotteryBtnText');

            if (lotteryBtn) lotteryBtn.disabled = true;
            if (lotteryBtnText) lotteryBtnText.textContent = '抽取中...';

            const availableParticipants = LotteryStorage.getAvailableParticipants();
            const winner = await Lottery.stop(availableParticipants);

            if (winner) {
                try {
                    LotteryStorage.addWinner(AppState.currentPrizeId, winner);

                    const prizes = LotteryStorage.getPrizes();
                    const prize = prizes.find(p => p.id === AppState.currentPrizeId);

                    if (prize) {
                        showWinnerResultDisplay(prize.name, winner.name);
                        createFireworks();
                        showModal('winnerResultModal');
                    }

                    renderPrizeList();
                    renderParticipantList();

                    const updatedPrize = LotteryStorage.getPrizes().find(p => p.id === AppState.currentPrizeId);

                    if (updatedPrize && updatedPrize.drawnCount >= updatedPrize.count) {
                        AppState.currentPrizeId = null;
                        updateCurrentPrizeDisplay(null);
                        updateLotteryButtonState(true, false);
                    } else if (updatedPrize) {
                        const prizeNameEl = document.getElementById('currentPrizeName');
                        const prizeInfoEl = document.getElementById('currentPrizeInfo');
                        if (prizeNameEl) prizeNameEl.textContent = updatedPrize.name;
                        if (prizeInfoEl) prizeInfoEl.textContent = `剩余 ${updatedPrize.count - updatedPrize.drawnCount} 个名额`;
                    }

                    const newAvailable = LotteryStorage.getAvailableParticipants();
                    Lottery.initSphere(newAvailable);

                    if (newAvailable.length === 0) {
                        updateLotteryButtonState(true, false);
                        showToast('所有人员已中奖', 'success');
                    }
                } catch (error) {
                    Logger.error('Failed to record winner', { error: error.message });
                    showToast('记录中奖信息失败: ' + error.message, 'error');
                }
            }

            AppState.isLotteryRunning = false;
            updateLotteryButtonState(
                AppState.currentPrizeId && LotteryStorage.getAvailableParticipants().length > 0 ? false : true,
                false
            );
        }
    } catch (error) {
        Logger.error('Lottery toggle failed', { error: error.message, stack: error.stack });
        showToast('抽奖操作失败', 'error');

        AppState.isLotteryRunning = false;
        Lottery.reset();
        updateLotteryButtonState(false, false);
    }
}

function showAddPrizeModal() {
    const nameInput = document.getElementById('prizeName');
    const countInput = document.getElementById('prizeCount');

    if (nameInput) nameInput.value = '';
    if (countInput) countInput.value = '';

    showModal('addPrizeModal');
}

function addPrize() {
    try {
        const nameInput = document.getElementById('prizeName');
        const countInput = document.getElementById('prizeCount');

        const name = (nameInput?.value || '').trim();
        const count = parseInt(countInput?.value || '0');

        if (!name) {
            showToast('请输入奖品名称', 'error');
            nameInput?.focus();
            return;
        }

        if (name.length > 20) {
            showToast('奖品名称不能超过20个字符', 'error');
            return;
        }

        if (!count || count < 1) {
            showToast('请输入有效的中奖人数', 'error');
            countInput?.focus();
            return;
        }

        if (count > 100) {
            showToast('单个奖品中奖人数不能超过100', 'error');
            return;
        }

        LotteryStorage.addPrize({ name, count });
        renderPrizeList();
        closeModal('addPrizeModal');
        showToast('奖品添加成功', 'success');

    } catch (error) {
        Logger.error('Failed to add prize', { error: error.message });
        showToast(error.message || '添加奖品失败', 'error');
    }
}

async function deletePrize(prizeId) {
    try {
        if (AppState.isLotteryRunning) {
            showToast('抽奖进行中，无法删除', 'warning');
            return;
        }

        const confirmed = await showConfirm('确定要删除该奖品吗？<br>相关中奖记录也会被删除。', '删除奖品');
        if (!confirmed) {
            return;
        }

        LotteryStorage.deletePrize(prizeId);

        if (AppState.currentPrizeId === prizeId) {
            AppState.currentPrizeId = null;
            updateCurrentPrizeDisplay(null);
            updateLotteryButtonState(true, false);
        }

        renderPrizeList();
        showToast('奖品已删除', 'success');

    } catch (error) {
        Logger.error('Failed to delete prize', { error: error.message, prizeId });
        showToast('删除奖品失败', 'error');
    }
}

async function handleGenerateRandom() {
    try {
        const countStr = await showPrompt('请输入要生成的人数（1-100）：', '20', '随机生成名单');

        if (countStr === null || countStr === '') return;

        const num = parseInt(countStr);

        if (isNaN(num) || num < 1 || num > 100) {
            showToast('请输入1-100之间的数字', 'error');
            return;
        }

        const participants = generateRandomParticipants(num);

        LotteryStorage.addParticipants(participants);
        renderParticipantList();

        const available = LotteryStorage.getAvailableParticipants();
        Lottery.initSphere(available);

        showToast(`成功生成 ${num} 名参与者`, 'success');

    } catch (error) {
        Logger.error('Failed to generate participants', { error: error.message });
        showToast('生成参与者失败', 'error');
    }
}

function triggerFileUpload() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.click();
    }
}

function handleDownloadTemplate() {
    const result = downloadTemplate();
    if (result.success) {
        showToast('模板下载成功', 'success');
    } else {
        showToast(result.error || '模板下载失败', 'error');
    }
}

async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    Logger.info('File upload started', { fileName: file.name, fileSize: file.size });

    try {
        const { participants, errors } = await parseExcelFile(file);

        LotteryStorage.addParticipants(participants);
        renderParticipantList();

        const available = LotteryStorage.getAvailableParticipants();
        Lottery.initSphere(available);

        let message = `成功导入 ${participants.length} 名参与者`;
        if (errors.length > 0) {
            message += `，${errors.length} 条数据被跳过`;
            Logger.warn('Some rows skipped during import', { errors });
        }

        showToast(message, 'success');
    } catch (error) {
        showToast(error.message || '文件解析失败', 'error');
    }

    event.target.value = '';
}

async function clearParticipants() {
    try {
        if (AppState.isLotteryRunning) {
            showToast('抽奖进行中，无法清空', 'warning');
            return;
        }

        const count = LotteryStorage.getParticipants().length;
        if (count === 0) {
            showToast('名单已经是空的', 'warning');
            return;
        }

        const confirmed = await showConfirm(`确定要清空所有 <strong>${count}</strong> 名参与者吗？`, '清空名单');
        if (!confirmed) {
            return;
        }

        LotteryStorage.clearParticipants();
        renderParticipantList();
        Lottery.initSphere([]);
        showToast('参与者已清空', 'success');

    } catch (error) {
        Logger.error('Failed to clear participants', { error: error.message });
        showToast('清空参与者失败', 'error');
    }
}

function showWinnerListModal() {
    renderWinnerList();
    showModal('winnerListModal');
}

function handleExportWinners() {
    const winners = LotteryStorage.getWinners();
    const prizes = LotteryStorage.getPrizes();
    const result = exportWinnerList(winners, prizes);

    if (result.success) {
        showToast('导出成功', 'success');
    } else {
        showToast(result.error || '导出失败', 'error');
    }
}

function showSettingsModal() {
    try {
        const settings = LotteryStorage.getSettings();
        const speedSelect = document.getElementById('lotterySpeed');

        if (speedSelect) {
            speedSelect.value = settings.lotterySpeed || 'normal';
        }

        AppState.pendingBackgroundImage = null;
        updateBgPreview(null, false);

        showModal('settingsModal');
    } catch (error) {
        Logger.error('Failed to show settings', { error: error.message });
    }
}

function triggerBgUpload() {
    const bgInput = document.getElementById('bgInput');
    if (bgInput) {
        bgInput.click();
    }
}

function handleBgUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('请选择图片文件', 'error');
        event.target.value = '';
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        showToast('图片大小不能超过2MB', 'error');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
        showToast('图片读取失败', 'error');
        event.target.value = '';
    };

    reader.onload = (e) => {
        try {
            const imageData = e.target.result;
            AppState.pendingBackgroundImage = imageData;

            updateBgPreview(imageData, true);
            showToast('图片已选择，点击保存设置生效', 'info');
            Logger.action('PREVIEW_BACKGROUND', { fileSize: file.size });

        } catch (error) {
            Logger.error('Failed to preview background', { error: error.message });
            showToast('预览背景失败', 'error');
        }
    };

    reader.readAsDataURL(file);
    event.target.value = '';
}

function clearBgPreview() {
    AppState.pendingBackgroundImage = null;
    updateBgPreview(null, false);
    showToast('已移除选择的图片', 'info');
}

function saveSettings() {
    try {
        const settings = LotteryStorage.getSettings();
        const speedSelect = document.getElementById('lotterySpeed');

        if (speedSelect) {
            settings.lotterySpeed = speedSelect.value;
        }

        if (AppState.pendingBackgroundImage) {
            applyBackgroundImage(AppState.pendingBackgroundImage);
            settings.backgroundImage = AppState.pendingBackgroundImage;
            Logger.action('UPDATE_BACKGROUND', { applied: true });
        }

        LotteryStorage.saveSettings(settings);

        AppState.pendingBackgroundImage = null;
        updateBgPreview(null, false);

        closeModal('settingsModal');
        showToast('设置已保存', 'success');

    } catch (error) {
        Logger.error('Failed to save settings', { error: error.message });
        showToast('保存设置失败', 'error');
    }
}

async function resetAllData() {
    try {
        if (AppState.isLotteryRunning) {
            showToast('抽奖进行中，无法重置', 'warning');
            return;
        }

        const stats = LotteryStorage.getStats();

        const message = `确定要重置所有数据吗？<br><br>将清除：<br>• <strong>${stats.prizesCount}</strong> 个奖品<br>• <strong>${stats.participantsCount}</strong> 名参与者<br>• <strong>${stats.winnersCount}</strong> 条中奖记录`;

        const confirmed = await showConfirm(message, '⚠️ 重置所有数据');
        if (!confirmed) {
            return;
        }

        LotteryStorage.resetAll();
        AppState.reset();

        updateCurrentPrizeDisplay(null);
        updateLotteryButtonState(true, false);
        applyBackgroundImage(null);

        renderPrizeList();
        renderParticipantList();
        Lottery.initSphere([]);

        closeModal('settingsModal');
        showToast('所有数据已重置', 'success');

    } catch (error) {
        Logger.error('Failed to reset data', { error: error.message });
        showToast('重置数据失败', 'error');
    }
}

function handleKeyboard(e) {
    if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
        e.preventDefault();
        const lotteryBtn = document.getElementById('lotteryBtn');
        if (lotteryBtn && !lotteryBtn.disabled) {
            toggleLottery();
        }
    }

    if (e.code === 'Escape') {
        closeAllModals();
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
}

function handleVisibilityChange() {
    if (document.hidden && AppState.isLotteryRunning) {
        Logger.warn('Page hidden while lottery running');
    }
}

function handleBeforeUnload(e) {
    if (AppState.isLotteryRunning) {
        e.preventDefault();
        e.returnValue = '抽奖正在进行中，确定要离开吗？';
        return e.returnValue;
    }
}

export function getDebugInterface() {
    return {
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
}

export { initApp };
