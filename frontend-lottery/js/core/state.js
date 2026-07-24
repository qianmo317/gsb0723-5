/**
 * 应用共享状态
 * 收敛原先散落在全局作用域的可变状态，供各功能模块读写
 */

const state = {
    currentPrizeId: null,
    isLotteryRunning: false,
    // 临时存储待应用的背景图片（仅在设置弹窗中使用）
    pendingBackgroundImage: null
};

export const AppState = {
    get currentPrizeId() {
        return state.currentPrizeId;
    },
    set currentPrizeId(value) {
        state.currentPrizeId = value;
    },

    get isLotteryRunning() {
        return state.isLotteryRunning;
    },
    set isLotteryRunning(value) {
        state.isLotteryRunning = value;
    },

    get pendingBackgroundImage() {
        return state.pendingBackgroundImage;
    },
    set pendingBackgroundImage(value) {
        state.pendingBackgroundImage = value;
    }
};
