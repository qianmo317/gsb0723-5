/**
 * 列表渲染模块
 * 负责奖品、参与者、中奖名单等区域的 DOM 渲染
 */

import { Logger } from '../core/logger.js';
import { LotteryStorage } from '../core/storage.js';
import { AppState } from '../core/state.js';
import { escapeHtml } from './dom.js';

/**
 * 渲染奖品列表
 */
export function renderPrizeList() {
    try {
        const prizes = LotteryStorage.getPrizes();
        const container = document.getElementById('prizeList');

        if (!container) {
            Logger.error('Prize list container not found');
            return;
        }

        if (prizes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎁</div>
                    <div class="empty-state-text">暂无奖品，点击上方按钮添加</div>
                </div>
            `;
            return;
        }

        container.innerHTML = prizes.map(prize => {
            const drawnCount = prize.drawnCount || 0;
            const totalCount = prize.count || 1;
            const isCompleted = drawnCount >= totalCount;
            const isActive = prize.id === AppState.currentPrizeId;
            const progress = Math.min((drawnCount / totalCount) * 100, 100);

            return `
                <div class="prize-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}"
                     data-action="select-prize"
                     data-prize-id="${escapeHtml(prize.id)}">
                    <button class="prize-delete" data-action="delete-prize" data-prize-id="${escapeHtml(prize.id)}">&times;</button>
                    <div class="prize-name">${escapeHtml(prize.name)}</div>
                    <div class="prize-info">中奖人数：${drawnCount} / ${totalCount}</div>
                    <div class="prize-progress">
                        <div class="prize-progress-bar" style="width: ${progress}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        Logger.debug('Prize list rendered', { count: prizes.length });
    } catch (error) {
        Logger.error('Failed to render prize list', { error: error.message });
    }
}

/**
 * 渲染参与者列表
 */
export function renderParticipantList() {
    try {
        const participants = LotteryStorage.getParticipants();
        const container = document.getElementById('participantList');
        const countEl = document.getElementById('participantCount');

        if (!container) {
            Logger.error('Participant list container not found');
            return;
        }

        const availableCount = participants.filter(p => !p.hasWon).length;

        if (countEl) {
            countEl.textContent = `${availableCount}/${participants.length}人`;
        }

        if (participants.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <div class="empty-state-text">暂无参与者，请导入或随机生成</div>
                </div>
            `;
            return;
        }

        // 只显示未中奖的参与者
        const availableList = participants.filter(p => !p.hasWon);

        if (availableList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎉</div>
                    <div class="empty-state-text">所有人员已中奖</div>
                </div>
            `;
            return;
        }

        container.innerHTML = availableList.map(p => `
            <div class="participant-item">
                <div class="participant-name">${escapeHtml(p.name || '')}</div>
                <div class="participant-dept">${escapeHtml(p.department || '')}</div>
            </div>
        `).join('');

        Logger.debug('Participant list rendered', { total: participants.length, available: availableCount });
    } catch (error) {
        Logger.error('Failed to render participant list', { error: error.message });
    }
}

/**
 * 渲染中奖名单弹窗内容
 */
export function renderWinnerList() {
    const winners = LotteryStorage.getWinners();
    const prizes = LotteryStorage.getPrizes();
    const container = document.getElementById('winnerListContainer');

    if (!container) {
        Logger.error('Winner list container not found');
        return;
    }

    const prizeIds = Object.keys(winners);

    if (prizeIds.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏆</div>
                <div class="empty-state-text">暂无中奖记录</div>
            </div>
        `;
        return;
    }

    container.innerHTML = prizeIds.map(prizeId => {
        const prize = prizes.find(p => p.id === prizeId);
        const prizeWinners = winners[prizeId] || [];

        return `
            <div class="winner-group">
                <div class="winner-group-header">
                    <span>${prize ? escapeHtml(prize.name) : '已删除的奖品'}</span>
                    <span>${prizeWinners.length}人</span>
                </div>
                <div class="winner-group-list">
                    ${prizeWinners.map((w, index) => `
                        <div class="winner-group-item">
                            <span>${index + 1}. ${escapeHtml(w.name || '未知')}</span>
                            <span style="color: var(--text-muted); font-size: 12px;">
                                ${w.department ? escapeHtml(w.department) : ''}
                            </span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}
