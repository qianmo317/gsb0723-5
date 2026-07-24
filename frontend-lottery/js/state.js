/**
 * 应用状态模块
 * 集中管理抽奖运行状态、当前选中奖品、待应用的背景图
 */
export const AppState = {
    currentPrizeId: null,
    isLotteryRunning: false,
    pendingBackgroundImage: null,

    reset() {
        this.currentPrizeId = null;
        this.isLotteryRunning = false;
        this.pendingBackgroundImage = null;
    }
};
