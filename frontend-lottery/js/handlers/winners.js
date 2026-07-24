/**
 * 中奖名单处理器
 * 负责查看中奖名单、导出 Excel
 */
import { Logger } from '../utils/logger.js';
import { showToast, showModal, closeModal } from '../utils/dom.js';
import { LotteryStorage } from '../core/storage.js';
import { renderWinnerList } from '../ui/renderer.js';
import { exportWinnersToExcel } from '../excel.js';

export function showWinnerListModal() {
    try {
        renderWinnerList();
        showModal('winnerListModal');
    } catch (error) {
        Logger.error('Failed to show winner list', { error: error.message });
        showToast('显示中奖名单失败', 'error');
    }
}

export function exportWinnerList() {
    try {
        const winners = LotteryStorage.getWinners();
        const prizes = LotteryStorage.getPrizes();
        exportWinnersToExcel(winners, prizes);
        showToast('导出成功', 'success');
    } catch (error) {
        Logger.error('Failed to export winner list', { error: error.message });
        showToast('导出失败: ' + error.message, 'error');
    }
}
