/**
 * 抽奖流程处理器
 * 负责开始/停止抽奖、中奖结果展示
 */
import { Logger } from '../utils/logger.js';
import { $, showToast, showModal } from '../utils/dom.js';
import { LotteryStorage } from '../core/storage.js';
import { Lottery } from '../core/lottery.js';
import { AppState } from '../state.js';
import { createFireworks } from '../ui/effects.js';
import { renderPrizeList, renderParticipantList, updateCurrentPrizeDisplay, setLotteryButtonState } from '../ui/renderer.js';

export function showWinnerResult(prizeName, winner) {
    try {
        const prizeNameEl = $('resultPrizeName');
        const winnerInfoEl = $('resultWinnerInfo');

        if (prizeNameEl) prizeNameEl.textContent = prizeName || '未知奖品';
        if (winnerInfoEl) winnerInfoEl.textContent = winner?.name || '未知';

        createFireworks();
        showModal('winnerResultModal');
    } catch (error) {
        Logger.error('Failed to show winner result', { error: error.message });
    }
}

export async function toggleLottery() {
    const lotteryBtn = $('lotteryBtn');
    const lotteryBtnText = $('lotteryBtnText');

    try {
        if (!AppState.currentPrizeId) {
            showToast('请先选择奖品', 'warning');
            return;
        }

        if (!lotteryBtn || !lotteryBtnText) {
            Logger.error('Lottery button elements not found');
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
                lotteryBtn.classList.add('running');
                lotteryBtnText.textContent = '停止抽奖';
            } else {
                showToast('抽奖启动失败', 'error');
            }
        } else {
            lotteryBtn.disabled = true;
            lotteryBtnText.textContent = '抽取中...';

            const availableParticipants = LotteryStorage.getAvailableParticipants();
            const winner = await Lottery.stop(availableParticipants);

            if (winner) {
                try {
                    LotteryStorage.addWinner(AppState.currentPrizeId, winner);

                    const prizes = LotteryStorage.getPrizes();
                    const prize = prizes.find(p => p.id === AppState.currentPrizeId);

                    if (prize) {
                        showWinnerResult(prize.name, winner);
                    }

                    renderPrizeList();
                    renderParticipantList();

                    const updatedPrize = LotteryStorage.getPrizes().find(p => p.id === AppState.currentPrizeId);

                    if (updatedPrize && updatedPrize.drawnCount >= updatedPrize.count) {
                        AppState.currentPrizeId = null;
                        updateCurrentPrizeDisplay('请选择下一个奖品', '当前奖品已抽完');
                        lotteryBtn.disabled = true;
                    } else if (updatedPrize) {
                        updateCurrentPrizeDisplay(updatedPrize.name, `剩余 ${updatedPrize.count - updatedPrize.drawnCount} 个名额`);
                    }

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

            const newAvailable = LotteryStorage.getAvailableParticipants();
            if (AppState.currentPrizeId && newAvailable.length > 0) {
                lotteryBtn.disabled = false;
            }
        }
    } catch (error) {
        Logger.error('Lottery toggle failed', { error: error.message, stack: error.stack });
        showToast('抽奖操作失败', 'error');

        AppState.isLotteryRunning = false;
        Lottery.reset();

        if (lotteryBtn) {
            lotteryBtn.classList.remove('running');
            lotteryBtn.disabled = false;
        }
        if (lotteryBtnText) {
            lotteryBtnText.textContent = '开始抽奖';
        }
    }
}
