import { Logger } from '../core/logger.js';
import { LotteryStorage } from '../core/storage.js';
import { escapeHtml } from '../utils/helpers.js';
import { AppState } from '../state.js';

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

export function updateCurrentPrizeDisplay(prize, drawnCount) {
    const prizeNameEl = document.getElementById('currentPrizeName');
    const prizeInfoEl = document.getElementById('currentPrizeInfo');

    if (prize) {
        if (prizeNameEl) prizeNameEl.textContent = prize.name;
        if (prizeInfoEl) prizeInfoEl.textContent = `剩余 ${prize.count - drawnCount} 个名额`;
    } else {
        if (prizeNameEl) prizeNameEl.textContent = '请先选择奖品';
        if (prizeInfoEl) prizeInfoEl.textContent = '点击左侧奖品开始抽奖';
    }
}

export function updateLotteryButtonState(disabled, isRunning) {
    const lotteryBtn = document.getElementById('lotteryBtn');
    const lotteryBtnText = document.getElementById('lotteryBtnText');

    if (lotteryBtn) {
        lotteryBtn.disabled = disabled;
        if (isRunning) {
            lotteryBtn.classList.add('running');
        } else {
            lotteryBtn.classList.remove('running');
        }
    }
    if (lotteryBtnText) {
        lotteryBtnText.textContent = isRunning ? '停止抽奖' : '开始抽奖';
    }
}

export function showWinnerResultDisplay(prizeName, winnerName) {
    const prizeNameEl = document.getElementById('resultPrizeName');
    const winnerInfoEl = document.getElementById('resultWinnerInfo');

    if (prizeNameEl) prizeNameEl.textContent = prizeName || '未知奖品';
    if (winnerInfoEl) winnerInfoEl.textContent = winnerName || '未知';
}

export function applyBackgroundImage(imageData) {
    const bgLayer = document.getElementById('background-layer');
    if (bgLayer) {
        bgLayer.style.backgroundImage = imageData ? `url(${imageData})` : '';
    }
}

export function updateBgPreview(imageData, hasImage) {
    const previewContainer = document.getElementById('bgPreviewContainer');
    const previewImg = document.getElementById('bgPreviewImg');
    const uploadText = document.getElementById('bgUploadText');

    if (previewContainer) {
        previewContainer.style.display = hasImage ? 'block' : 'none';
    }
    if (previewImg && imageData) {
        previewImg.src = imageData;
    }
    if (uploadText) {
        uploadText.textContent = hasImage ? '重新选择图片' : '点击上传背景图片';
    }
}
