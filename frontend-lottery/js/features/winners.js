/**
 * 中奖记录功能模块
 * 中奖名单展示、导出，以及中奖结果弹窗
 * 依赖全局 XLSX（由 js/lib/xlsx.full.min.js 提供）
 */

import { Logger } from '../core/logger.js';
import { LotteryStorage } from '../core/storage.js';
import { showToast } from '../ui/toast.js';
import { showModal } from '../ui/modals.js';
import { renderWinnerList } from '../ui/render.js';
import { createFireworks } from '../ui/effects.js';

/**
 * 显示中奖名单弹窗
 */
export function showWinnerListModal() {
    try {
        renderWinnerList();
        showModal('winnerListModal');
    } catch (error) {
        Logger.error('Failed to show winner list', { error: error.message });
        showToast('显示中奖名单失败', 'error');
    }
}

/**
 * 导出中奖名单
 */
export function exportWinnerList() {
    try {
        const winners = LotteryStorage.getWinners();
        const prizes = LotteryStorage.getPrizes();

        const prizeIds = Object.keys(winners);
        if (prizeIds.length === 0) {
            showToast('暂无中奖记录可导出', 'warning');
            return;
        }

        // 检查XLSX库是否可用
        if (typeof XLSX === 'undefined') {
            showToast('导出功能不可用，请刷新页面重试', 'error');
            Logger.error('XLSX library not loaded');
            return;
        }

        // 构建导出数据
        const exportData = [];
        exportData.push(['奖品名称', '中奖者姓名', '手机号码', '部门', '中奖时间']);

        prizeIds.forEach(prizeId => {
            const prize = prizes.find(p => p.id === prizeId);
            const prizeWinners = winners[prizeId] || [];

            prizeWinners.forEach(w => {
                exportData.push([
                    prize ? prize.name : '已删除的奖品',
                    w.name || '',
                    w.phone || '',
                    w.department || '',
                    w.wonAt ? new Date(w.wonAt).toLocaleString('zh-CN') : ''
                ]);
            });
        });

        // 创建工作簿并导出
        const ws = XLSX.utils.aoa_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '中奖名单');

        const fileName = `中奖名单_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
        XLSX.writeFile(wb, fileName);

        showToast('导出成功', 'success');
        Logger.action('EXPORT_WINNERS', { fileName, recordCount: exportData.length - 1 });

    } catch (error) {
        Logger.error('Failed to export winner list', { error: error.message });
        showToast('导出失败: ' + error.message, 'error');
    }
}

/**
 * 显示中奖结果弹窗
 */
export function showWinnerResult(prizeName, winner) {
    try {
        const prizeNameEl = document.getElementById('resultPrizeName');
        const winnerInfoEl = document.getElementById('resultWinnerInfo');

        if (prizeNameEl) prizeNameEl.textContent = prizeName || '未知奖品';
        if (winnerInfoEl) winnerInfoEl.textContent = winner?.name || '未知';

        // 触发烟花效果
        createFireworks();

        showModal('winnerResultModal');
    } catch (error) {
        Logger.error('Failed to show winner result', { error: error.message });
    }
}
