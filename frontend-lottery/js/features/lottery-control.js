/**
 * 抽奖控制模块
 * 编排开始/停止抽奖的完整流程，串联存储、动画引擎与 UI
 */

import { Logger } from '../core/logger.js';
import { LotteryStorage } from '../core/storage.js';
import { AppState } from '../core/state.js';
import { Lottery } from './lottery-engine.js';
import { showToast } from '../ui/toast.js';
import { renderPrizeList, renderParticipantList } from '../ui/render.js';
import { showWinnerResult } from './winners.js';

/**
 * 切换抽奖状态
 */
export async function toggleLottery() {
    try {
        if (!AppState.currentPrizeId) {
            showToast('请先选择奖品', 'warning');
            return;
        }

        const lotteryBtn = document.getElementById('lotteryBtn');
        const lotteryBtnText = document.getElementById('lotteryBtnText');

        if (!lotteryBtn || !lotteryBtnText) {
            Logger.error('Lottery button elements not found');
            return;
        }

        if (!AppState.isLotteryRunning) {
            // 开始抽奖
            const availableParticipants = LotteryStorage.getAvailableParticipants();

            if (availableParticipants.length === 0) {
                showToast('没有可参与抽奖的人员', 'warning');
                return;
            }

            const settings = LotteryStorage.getSettings();
            const started = Lottery.start(AppState.currentPrizeId, availableParticipants, settings.lotterySpeed);

            if (started) {
                AppState.isLotteryRunning = true;
                lotteryBtn.classList.add('running');
                lotteryBtnText.textContent = '停止抽奖';
            } else {
                showToast('抽奖启动失败', 'error');
            }
        } else {
            // 停止抽奖
            lotteryBtn.disabled = true;
            lotteryBtnText.textContent = '抽取中...';

            const availableParticipants = LotteryStorage.getAvailableParticipants();
            const winner = await Lottery.stop(availableParticipants);

            if (winner) {
                try {
                    // 记录中奖
                    LotteryStorage.addWinner(AppState.currentPrizeId, winner);

                    // 显示中奖结果
                    const prizes = LotteryStorage.getPrizes();
                    const prize = prizes.find(p => p.id === AppState.currentPrizeId);

                    if (prize) {
                        showWinnerResult(prize.name, winner);
                    }

                    // 更新UI
                    renderPrizeList();
                    renderParticipantList();

                    // 检查奖品是否抽完
                    const updatedPrize = LotteryStorage.getPrizes().find(p => p.id === AppState.currentPrizeId);
                    const prizeInfoEl = document.getElementById('currentPrizeInfo');
                    const prizeNameEl = document.getElementById('currentPrizeName');

                    if (updatedPrize && updatedPrize.drawnCount >= updatedPrize.count) {
                        AppState.currentPrizeId = null;
                        if (prizeNameEl) prizeNameEl.textContent = '请选择下一个奖品';
                        if (prizeInfoEl) prizeInfoEl.textContent = '当前奖品已抽完';
                        lotteryBtn.disabled = true;
                    } else if (updatedPrize && prizeInfoEl) {
                        prizeInfoEl.textContent = `剩余 ${updatedPrize.count - updatedPrize.drawnCount} 个名额`;
                    }

                    // 重新初始化3D球体（移除已中奖者）
                    const newAvailable = LotteryStorage.getAvailableParticipants();
                    Lottery.initSphere(newAvailable);

                    if (newAvailable.length === 0) {
                        lotteryBtn.disabled = true;
                        showToast('所有人员已中奖', 'success');
                    }
                } catch (error) {
                    Logger.error('Failed to record winner', { error: error.message });
                    showToast('记录中奖信息失败: ' + error.message, 'error');
                }
            }

            AppState.isLotteryRunning = false;
            lotteryBtn.classList.remove('running');
            lotteryBtnText.textContent = '开始抽奖';

            // 重新检查按钮状态
            const newAvailable = LotteryStorage.getAvailableParticipants();
            if (AppState.currentPrizeId && newAvailable.length > 0) {
                lotteryBtn.disabled = false;
            }
        }
    } catch (error) {
        Logger.error('Lottery toggle failed', { error: error.message, stack: error.stack });
        showToast('抽奖操作失败', 'error');

        // 重置状态
        AppState.isLotteryRunning = false;
        Lottery.reset();

        const lotteryBtn = document.getElementById('lotteryBtn');
        const lotteryBtnText = document.getElementById('lotteryBtnText');
        if (lotteryBtn) {
            lotteryBtn.classList.remove('running');
            lotteryBtn.disabled = false;
        }
        if (lotteryBtnText) {
            lotteryBtnText.textContent = '开始抽奖';
        }
    }
}
