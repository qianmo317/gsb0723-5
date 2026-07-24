/**
 * 设置功能模块
 * 系统设置弹窗、背景图片、抽奖速度、重置所有数据
 */

import { Logger } from '../core/logger.js';
import { LotteryStorage } from '../core/storage.js';
import { AppState } from '../core/state.js';
import { Lottery } from './lottery-engine.js';
import { showToast } from '../ui/toast.js';
import { showModal, closeModal, showConfirm } from '../ui/modals.js';
import { renderPrizeList, renderParticipantList } from '../ui/render.js';

/**
 * 加载设置（应用背景与抽奖速度）
 */
export function loadSettings() {
    try {
        const settings = LotteryStorage.getSettings();

        // 应用背景图片
        if (settings.backgroundImage) {
            const bgLayer = document.getElementById('background-layer');
            if (bgLayer) {
                bgLayer.style.backgroundImage = `url(${settings.backgroundImage})`;
            }
        }

        // 设置抽奖速度选项
        const speedSelect = document.getElementById('lotterySpeed');
        if (speedSelect) {
            speedSelect.value = settings.lotterySpeed || 'normal';
        }

        Logger.debug('Settings loaded', { speed: settings.lotterySpeed });
    } catch (error) {
        Logger.error('Failed to load settings', { error: error.message });
    }
}

/**
 * 显示设置弹窗
 */
export function showSettingsModal() {
    try {
        const settings = LotteryStorage.getSettings();
        const speedSelect = document.getElementById('lotterySpeed');

        if (speedSelect) {
            speedSelect.value = settings.lotterySpeed || 'normal';
        }

        showModal('settingsModal');
    } catch (error) {
        Logger.error('Failed to show settings', { error: error.message });
    }
}

/**
 * 触发背景图片上传
 */
export function triggerBgUpload() {
    const bgInput = document.getElementById('bgInput');
    if (bgInput) {
        bgInput.click();
    }
}

/**
 * 处理背景图片上传 - 只预览，不立即应用
 */
export function handleBgUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    // 文件类型检查
    if (!file.type.startsWith('image/')) {
        showToast('请选择图片文件', 'error');
        event.target.value = '';
        return;
    }

    // 文件大小检查（最大2MB）
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

            // 存储待应用的图片
            AppState.pendingBackgroundImage = imageData;

            // 显示预览
            const previewContainer = document.getElementById('bgPreviewContainer');
            const previewImg = document.getElementById('bgPreviewImg');
            const uploadText = document.getElementById('bgUploadText');

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

/**
 * 清除背景预览
 */
export function clearBgPreview() {
    AppState.pendingBackgroundImage = null;

    const previewContainer = document.getElementById('bgPreviewContainer');
    const previewImg = document.getElementById('bgPreviewImg');
    const uploadText = document.getElementById('bgUploadText');

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

/**
 * 保存设置
 */
export function saveSettings() {
    try {
        const settings = LotteryStorage.getSettings();
        const speedSelect = document.getElementById('lotterySpeed');

        if (speedSelect) {
            settings.lotterySpeed = speedSelect.value;
        }

        // 应用待保存的背景图片
        if (AppState.pendingBackgroundImage) {
            const bgLayer = document.getElementById('background-layer');
            if (bgLayer) {
                bgLayer.style.backgroundImage = `url(${AppState.pendingBackgroundImage})`;
            }
            settings.backgroundImage = AppState.pendingBackgroundImage;
            Logger.action('UPDATE_BACKGROUND', { applied: true });
        }

        LotteryStorage.saveSettings(settings);

        // 重置预览状态
        AppState.pendingBackgroundImage = null;
        const previewContainer = document.getElementById('bgPreviewContainer');
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

/**
 * 重置所有数据
 */
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
        AppState.currentPrizeId = null;

        // 重置UI
        const prizeNameEl = document.getElementById('currentPrizeName');
        const prizeInfoEl = document.getElementById('currentPrizeInfo');
        const lotteryBtn = document.getElementById('lotteryBtn');
        const bgLayer = document.getElementById('background-layer');

        if (prizeNameEl) prizeNameEl.textContent = '请先选择奖品';
        if (prizeInfoEl) prizeInfoEl.textContent = '点击左侧奖品开始抽奖';
        if (lotteryBtn) lotteryBtn.disabled = true;
        if (bgLayer) bgLayer.style.backgroundImage = '';

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
