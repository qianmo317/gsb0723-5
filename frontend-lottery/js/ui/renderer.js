/**
 * UI 渲染模块
 * 负责将数据层状态渲染到 DOM，不包含业务逻辑
 */
import { Logger } from '../utils/logger.js';
import { $, escapeHtml } from '../utils/dom.js';
import { LotteryStorage } from '../core/storage.js';
import { AppState } from '../state.js';

export function renderPrizeList() {
    try {
        const prizes = LotteryStorage.getPrizes();
        const container = $('prizeList');

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

export function renderParticipantList() {
    try {
        const participants = LotteryStorage.getParticipants();
        const container = $('participantList');
        const countEl = $('participantCount');

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

export function renderWinnerList() {
    try {
        const winners = LotteryStorage.getWinners();
        const prizes = LotteryStorage.getPrizes();
        const container = $('winnerListContainer');

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
        } else {
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
    } catch (error) {
        Logger.error('Failed to render winner list', { error: error.message });
    }
}

export function applySettings(settings) {
    try {
        if (settings.backgroundImage) {
            const bgLayer = $('background-layer');
            if (bgLayer) {
                bgLayer.style.backgroundImage = `url(${settings.backgroundImage})`;
            }
        }

        const speedSelect = $('lotterySpeed');
        if (speedSelect) {
            speedSelect.value = settings.lotterySpeed || 'normal';
        }

        Logger.debug('Settings applied', { speed: settings.lotterySpeed });
    } catch (error) {
        Logger.error('Failed to apply settings', { error: error.message });
    }
}

export function updateCurrentPrizeDisplay(prizeName, infoText) {
    const nameEl = $('currentPrizeName');
    const infoEl = $('currentPrizeInfo');
    if (nameEl) nameEl.textContent = prizeName;
    if (infoEl) infoEl.textContent = infoText;
}

export function setLotteryButtonState(disabled, text) {
    const btn = $('lotteryBtn');
    const btnText = $('lotteryBtnText');
    if (btn) btn.disabled = disabled;
    if (btnText && text) btnText.textContent = text;
}

export function clearBackgroundImage() {
    const bgLayer = $('background-layer');
    if (bgLayer) bgLayer.style.backgroundImage = '';
}
