/**
 * 奖品管理处理器
 * 处理奖品的选择、添加、删除
 */
import { Logger } from '../utils/logger.js';
import { $, showToast, showConfirm, showModal, closeModal } from '../utils/dom.js';
import { LotteryStorage } from '../core/storage.js';
import { Lottery } from '../core/lottery.js';
import { AppState } from '../state.js';
import { renderPrizeList, updateCurrentPrizeDisplay, setLotteryButtonState } from '../ui/renderer.js';

export function showAddPrizeModal() {
    const nameInput = $('prizeName');
    const countInput = $('prizeCount');

    if (nameInput) nameInput.value = '';
    if (countInput) countInput.value = '';

    showModal('addPrizeModal');
}

export function addPrize() {
    try {
        const nameInput = $('prizeName');
        const countInput = $('prizeCount');

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
            updateCurrentPrizeDisplay('请先选择奖品', '点击左侧奖品开始抽奖');
            setLotteryButtonState(true, '开始抽奖');
        }

        renderPrizeList();
        showToast('奖品已删除', 'success');

    } catch (error) {
        Logger.error('Failed to delete prize', { error: error.message, prizeId });
        showToast('删除奖品失败', 'error');
    }
}

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

        updateCurrentPrizeDisplay(prize.name, `剩余 ${prize.count - drawnCount} 个名额`);

        const availableParticipants = LotteryStorage.getAvailableParticipants();

        if (availableParticipants.length === 0) {
            setLotteryButtonState(true, '开始抽奖');
            showToast('没有可参与抽奖的人员', 'warning');
        } else {
            setLotteryButtonState(false, '开始抽奖');
        }

        renderPrizeList();
        Lottery.initSphere(availableParticipants);

        Logger.info('Prize selected', { prizeId, prizeName: prize.name });
    } catch (error) {
        Logger.error('Failed to select prize', { error: error.message, prizeId });
        showToast('选择奖品失败', 'error');
    }
}
