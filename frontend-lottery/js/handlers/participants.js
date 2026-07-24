/**
 * 参与者管理处理器
 * 负责随机生成名单、Excel 导入、清空名单、模板下载
 */
import { Logger } from '../utils/logger.js';
import { $, showToast, showConfirm, showPrompt } from '../utils/dom.js';
import { LotteryStorage } from '../core/storage.js';
import { Lottery } from '../core/lottery.js';
import { AppState } from '../state.js';
import { SURNAMES, NAMES, DEPARTMENTS } from '../names.js';
import { renderParticipantList } from '../ui/renderer.js';
import { downloadTemplate as downloadTemplateFile, parseParticipantsFromFile } from '../excel.js';

export async function generateRandomParticipants() {
    try {
        const countStr = await showPrompt('请输入要生成的人数（1-100）：', '20', '随机生成名单');

        if (countStr === null || countStr === '') return;

        const num = parseInt(countStr);

        if (isNaN(num) || num < 1 || num > 100) {
            showToast('请输入1-100之间的数字', 'error');
            return;
        }

        const participants = [];
        const usedNames = new Set();

        for (let i = 0; i < num; i++) {
            let fullName;
            let attempts = 0;

            do {
                const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
                const name = NAMES[Math.floor(Math.random() * NAMES.length)];
                fullName = surname + name;
                attempts++;
            } while (usedNames.has(fullName) && attempts < 100);

            usedNames.add(fullName);

            const department = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];

            let phone = '';
            if (Math.random() > 0.3) {
                phone = '1' + ['3', '5', '7', '8', '9'][Math.floor(Math.random() * 5)] +
                        Math.random().toString().slice(2, 11);
            }

            participants.push({
                name: fullName,
                phone,
                department
            });
        }

        LotteryStorage.addParticipants(participants);
        renderParticipantList();

        const available = LotteryStorage.getAvailableParticipants();
        Lottery.initSphere(available);

        showToast(`成功生成 ${num} 名参与者`, 'success');

    } catch (error) {
        Logger.error('Failed to generate participants', { error: error.message });
        showToast('生成参与者失败', 'error');
    }
}

export function triggerFileUpload() {
    const fileInput = $('fileInput');
    if (fileInput) {
        fileInput.click();
    }
}

export async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    Logger.info('File upload started', { fileName: file.name, fileSize: file.size });

    try {
        const { participants, errors } = await parseParticipantsFromFile(file);

        LotteryStorage.addParticipants(participants);
        renderParticipantList();

        const available = LotteryStorage.getAvailableParticipants();
        Lottery.initSphere(available);

        let message = `成功导入 ${participants.length} 名参与者`;
        if (errors.length > 0) {
            message += `，${errors.length} 条数据被跳过`;
            Logger.warn('Some rows skipped during import', { errors });
        }

        showToast(message, 'success');
    } catch (error) {
        showToast(error.message || '文件解析失败', 'error');
    } finally {
        event.target.value = '';
    }
}

export function downloadTemplate() {
    try {
        downloadTemplateFile();
        showToast('模板下载成功', 'success');
    } catch (error) {
        Logger.error('Failed to download template', { error: error.message });
        showToast(error.message || '模板下载失败', 'error');
    }
}

export async function clearParticipants() {
    try {
        if (AppState.isLotteryRunning) {
            showToast('抽奖进行中，无法清空', 'warning');
            return;
        }

        const count = LotteryStorage.getParticipants().length;
        if (count === 0) {
            showToast('名单已经是空的', 'warning');
            return;
        }

        const confirmed = await showConfirm(`确定要清空所有 <strong>${count}</strong> 名参与者吗？`, '清空名单');
        if (!confirmed) {
            return;
        }

        LotteryStorage.clearParticipants();
        renderParticipantList();
        Lottery.initSphere([]);
        showToast('参与者已清空', 'success');

    } catch (error) {
        Logger.error('Failed to clear participants', { error: error.message });
        showToast('清空参与者失败', 'error');
    }
}
