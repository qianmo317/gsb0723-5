/**
 * 奖品功能模块
 * 奖品的选择、添加、删除等业务逻辑
 */

import { Logger } from '../core/logger.js';
import { LotteryStorage } from '../core/storage.js';
import { AppState } from '../core/state.js';
import { Lottery } from './lottery-engine.js';
import { showToast } from '../ui/toast.js';
import { showModal, closeModal, showConfirm } from '../ui/modals.js';
import { renderPrizeList } from '../ui/render.js';

/**
 * 选择奖品
 */
export function selectPrize(prizeId) {
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

        // 更新UI
        const prizeNameEl = document.getElementById('currentPrizeName');
        const prizeInfoEl = document.getElementById('currentPrizeInfo');

        if (prizeNameEl) prizeNameEl.textContent = prize.name;
        if (prizeInfoEl) prizeInfoEl.textContent = `剩余 ${prize.count - drawnCount} 个名额`;

        // 启用抽奖按钮
        const lotteryBtn = document.getElementById('lotteryBtn');
        const availableParticipants = LotteryStorage.getAvailableParticipants();

        if (lotteryBtn) {
            if (availableParticipants.length === 0) {
                lotteryBtn.disabled = true;
                showToast('没有可参与抽奖的人员', 'warning');
            } else {
                lotteryBtn.disabled = false;
            }
        }

        // 更新奖品列表高亮
        renderPrizeList();

        // 重新初始化3D球体
        Lottery.initSphere(availableParticipants);

        Logger.info('Prize selected', { prizeId, prizeName: prize.name });
    } catch (error) {
        Logger.error('Failed to select prize', { error: error.message, prizeId });
        showToast('选择奖品失败', 'error');
    }
}

/**
 * 显示添加奖品弹窗
 */
export function showAddPrizeModal() {
    const nameInput = document.getElementById('prizeName');
    const countInput = document.getElementById('prizeCount');

    if (nameInput) nameInput.value = '';
    if (countInput) countInput.value = '';

    showModal('addPrizeModal');
}

/**
 * 添加奖品
 */
export function addPrize() {
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

/**
 * 删除奖品
 */
export async function deletePrize(prizeId) {
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
            const prizeNameEl = document.getElementById('currentPrizeName');
            const prizeInfoEl = document.getElementById('currentPrizeInfo');
            const lotteryBtn = document.getElementById('lotteryBtn');

            if (prizeNameEl) prizeNameEl.textContent = '请先选择奖品';
            if (prizeInfoEl) prizeInfoEl.textContent = '点击左侧奖品开始抽奖';
            if (lotteryBtn) lotteryBtn.disabled = true;
        }

        renderPrizeList();
        showToast('奖品已删除', 'success');

    } catch (error) {
        Logger.error('Failed to delete prize', { error: error.message, prizeId });
        showToast('删除奖品失败', 'error');
    }
}
