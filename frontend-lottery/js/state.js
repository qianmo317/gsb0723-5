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
