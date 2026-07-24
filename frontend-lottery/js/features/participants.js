/**
 * 参与者功能模块
 * 随机生成、Excel 导入、模板下载、清空名单等逻辑
 * 依赖全局 XLSX（由 js/lib/xlsx.full.min.js 提供）
 */

import { Logger } from '../core/logger.js';
import { LotteryStorage } from '../core/storage.js';
import { AppState } from '../core/state.js';
import { SURNAMES, NAMES, DEPARTMENTS } from '../core/constants.js';
import { Lottery } from './lottery-engine.js';
import { showToast } from '../ui/toast.js';
import { showConfirm, showPrompt } from '../ui/modals.js';
import { renderParticipantList } from '../ui/render.js';

/**
 * 随机生成参与者
 */
export async function generateRandomParticipants() {
    try {
        const countStr = await showPrompt('请输入要生成的人数（1-100）：', '20', '随机生成名单');

        if (countStr === null || countStr === '') return; // 用户取消

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

            // 避免重名
            do {
                const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
                const name = NAMES[Math.floor(Math.random() * NAMES.length)];
                fullName = surname + name;
                attempts++;
            } while (usedNames.has(fullName) && attempts < 100);

            usedNames.add(fullName);

            const department = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];

            // 随机生成手机号（可能为空）
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

        // 更新3D球体
        const available = LotteryStorage.getAvailableParticipants();
        Lottery.initSphere(available);

        showToast(`成功生成 ${num} 名参与者`, 'success');

    } catch (error) {
        Logger.error('Failed to generate participants', { error: error.message });
        showToast('生成参与者失败', 'error');
    }
}

/**
 * 触发文件上传
 */
export function triggerFileUpload() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.click();
    }
}

/**
 * 下载导入模板
 */
export function downloadTemplate() {
    try {
        // 检查XLSX库
        if (typeof XLSX === 'undefined') {
            showToast('模板生成功能不可用', 'error');
            return;
        }

        // 模板数据
        const templateData = [
            ['姓名', '手机号码', '部门'],
            ['张三', '13800138001', '技术部'],
            ['李四', '13900139002', '产品部'],
            ['王五', '', '运营部'],
            ['赵六', '15800158003', '市场部']
        ];

        // 创建工作簿
        const ws = XLSX.utils.aoa_to_sheet(templateData);

        // 设置列宽
        ws['!cols'] = [
            { wch: 15 },  // 姓名
            { wch: 15 },  // 手机号码
            { wch: 12 }   // 部门
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '抽奖名单');

        // 下载文件
        XLSX.writeFile(wb, '抽奖名单导入模板.xlsx');

        showToast('模板下载成功', 'success');
        Logger.action('DOWNLOAD_TEMPLATE');

    } catch (error) {
        Logger.error('Failed to download template', { error: error.message });
        showToast('模板下载失败', 'error');
    }
}

/**
 * 处理文件上传
 */
export function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    Logger.info('File upload started', { fileName: file.name, fileSize: file.size });

    // 文件大小检查（最大5MB）
    if (file.size > 5 * 1024 * 1024) {
        showToast('文件大小不能超过5MB', 'error');
        event.target.value = '';
        return;
    }

    // 文件类型检查
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'application/vnd.ms-excel'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.xlsx?$/i)) {
        showToast('请选择Excel文件（.xlsx或.xls）', 'error');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
        Logger.error('File read error', { fileName: file.name });
        showToast('文件读取失败', 'error');
        event.target.value = '';
    };

    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                showToast('Excel文件中没有工作表', 'error');
                return;
            }

            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            if (!jsonData || jsonData.length < 2) {
                showToast('文件内容为空或格式不正确', 'error');
                return;
            }

            // 解析表头
            const headers = jsonData[0].map(h => String(h || '').toLowerCase().trim());
            const nameIndex = headers.findIndex(h =>
                h.includes('姓名') || h.includes('name') || h === '名字' || h === '姓名'
            );
            const phoneIndex = headers.findIndex(h =>
                h.includes('手机') || h.includes('电话') || h.includes('phone') || h.includes('mobile')
            );
            const deptIndex = headers.findIndex(h =>
                h.includes('部门') || h.includes('department') || h.includes('dept')
            );

            if (nameIndex === -1) {
                showToast('未找到姓名列，请确保表头包含"姓名"', 'error');
                Logger.warn('Name column not found', { headers });
                return;
            }

            const participants = [];
            const errors = [];

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;

                const name = row[nameIndex];

                if (!name || String(name).trim() === '') {
                    errors.push(`第${i + 1}行：姓名为空`);
                    continue;
                }

                // 过滤掉模板示例数据
                const nameStr = String(name).trim();
                if (nameStr.includes('在此添加') || nameStr.includes('...') || nameStr.startsWith('（') || nameStr.startsWith('(')) {
                    continue;
                }

                participants.push({
                    name: nameStr,
                    phone: phoneIndex !== -1 ? String(row[phoneIndex] || '').trim() : '',
                    department: deptIndex !== -1 ? String(row[deptIndex] || '').trim() : ''
                });
            }

            if (participants.length === 0) {
                showToast('未解析到有效数据', 'error');
                Logger.warn('No valid participants parsed', { errors });
                return;
            }

            LotteryStorage.addParticipants(participants);
            renderParticipantList();

            // 更新3D球体
            const available = LotteryStorage.getAvailableParticipants();
            Lottery.initSphere(available);

            let message = `成功导入 ${participants.length} 名参与者`;
            if (errors.length > 0) {
                message += `，${errors.length} 条数据被跳过`;
                Logger.warn('Some rows skipped during import', { errors });
            }

            showToast(message, 'success');
            Logger.info('File import completed', { imported: participants.length, skipped: errors.length });

        } catch (error) {
            Logger.error('File parse error', { error: error.message, fileName: file.name });
            showToast('文件解析失败，请检查格式', 'error');
        }
    };

    reader.readAsArrayBuffer(file);
    event.target.value = ''; // 清空input，允许重复上传同一文件
}

/**
 * 清空参与者
 */
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
