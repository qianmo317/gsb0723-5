/**
 * 3D抽奖系统主入口
 * 初始化错误处理、绑定事件、加载数据并渲染首屏。
 */

import { Logger, ErrorHandler } from './core/logger.js';
import { LotteryStorage } from './core/storage.js';
import { AppState } from './core/state.js';
import { Lottery } from './features/lottery-engine.js';
import { initParticles } from './ui/effects.js';
import { renderPrizeList, renderParticipantList } from './ui/render.js';
import { loadSettings } from './features/settings.js';
import { bindEvents } from './events.js';

// 初始化全局错误处理器
ErrorHandler.init();

/**
 * 页面初始化
 */
function initApp() {
    try {
        // 初始化粒子效果
        initParticles();

        // 数据完整性检查
        const integrity = LotteryStorage.validateIntegrity();
        if (!integrity.valid) {
            Logger.warn('Data integrity issues detected on startup');
        }

        // 加载设置
        loadSettings();

        // 渲染奖品列表
        renderPrizeList();

        // 渲染参与者列表
        renderParticipantList();

        // 初始化3D球体
        const participants = LotteryStorage.getAvailableParticipants();
        Lottery.initSphere(participants);

        // 输出统计信息
        const stats = LotteryStorage.getStats();
        Logger.info('Application initialized', stats);

    } catch (error) {
        Logger.error('Application initialization failed', { error: error.message, stack: error.stack });
        // showToast 依赖 DOM，此处降级为 console
        console.error('应用初始化失败，请刷新页面重试');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    Logger.info('Application starting');
    bindEvents();
    initApp();
});

// 导出调试接口（保留原全局 LotteryDebug）
window.LotteryDebug = {
    getStats: () => LotteryStorage.getStats(),
    getLogs: () => Logger.getLogs(),
    exportLogs: () => Logger.export(),
    validateData: () => LotteryStorage.validateIntegrity(),
    getState: () => ({
        currentPrizeId: AppState.currentPrizeId,
        isLotteryRunning: AppState.isLotteryRunning,
        lotteryState: Lottery.getState()
    })
};

Logger.info('main.js loaded successfully');
