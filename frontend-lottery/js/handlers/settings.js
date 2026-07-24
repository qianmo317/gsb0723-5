/**
 * 系统设置处理器
 * 负责设置弹窗、背景图上传、保存设置、重置数据
 */
import { Logger } from '../utils/logger.js';
import { $, showToast, showConfirm, showModal, closeModal } from '../utils/dom.js';
import { LotteryStorage } from '../core/storage.js';
import { Lottery } from '../core/lottery.js';
import { AppState } from '../state.js';
import { renderPrizeList, renderParticipantList, applySettings, updateCurrentPrizeDisplay, setLotteryButtonState, clearBackgroundImage } from '../ui/renderer.js';

export function showSettingsModal() {
    try {
        const settings = LotteryStorage.getSettings();
        const speedSelect = $('lotterySpeed');

        if (speedSelect) {
            speedSelect.value = settings.lotterySpeed || 'normal';
        }

        showModal('settingsModal');
    } catch (error) {
        Logger.error('Failed to show settings', { error: error.message });
    }
}

export function triggerBgUpload() {
    const bgInput = $('bgInput');
    if (bgInput) {
        bgInput.click();
    }
}

export function handleBgUpload(event) {
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

            const previewContainer = $('bgPreviewContainer');
            const previewImg = $('bgPreviewImg');
            const uploadText = $('bgUploadText');

            if (previewContainer && previewImg) {
                previewImg.src = imageData;
                previewContainer.style.display = 'block';
            }
            if (uploadText) {
                uploadText.textContent = '重新选择图片';
            }

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

export function clearBgPreview() {
    AppState.pendingBackgroundImage = null;

    const previewContainer = $('bgPreviewContainer');
    const previewImg = $('bgPreviewImg');
    const uploadText = $('bgUploadText');

    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
    if (previewImg) {
        previewImg.src = '';
    }
    if (uploadText) {
        uploadText.textContent = '点击上传背景图片';
    }

    showToast('已移除选择的图片', 'info');
}

export function saveSettings() {
    try {
        const settings = LotteryStorage.getSettings();
        const speedSelect = $('lotterySpeed');

        if (speedSelect) {
            settings.lotterySpeed = speedSelect.value;
        }

        if (AppState.pendingBackgroundImage) {
            const bgLayer = $('background-layer');
            if (bgLayer) {
                bgLayer.style.backgroundImage = `url(${AppState.pendingBackgroundImage})`;
            }
            settings.backgroundImage = AppState.pendingBackgroundImage;
            Logger.action('UPDATE_BACKGROUND', { applied: true });
        }

        LotteryStorage.saveSettings(settings);

        AppState.pendingBackgroundImage = null;
        const previewContainer = $('bgPreviewContainer');
        if (previewContainer) {
            previewContainer.style.display = 'none';
        }

        closeModal('settingsModal');
        showToast('设置已保存', 'success');

    } catch (error) {
        Logger.error('Failed to save settings', { error: error.message });
        showToast('保存设置失败', 'error');
    }
}

export async function resetAllData() {
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

        updateCurrentPrizeDisplay('请先选择奖品', '点击左侧奖品开始抽奖');
        setLotteryButtonState(true, '开始抽奖');
        clearBackgroundImage();

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
