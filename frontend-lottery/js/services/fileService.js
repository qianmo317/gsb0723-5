import { Logger } from '../core/logger.js';

function getXLSX() {
    return window.XLSX;
}

export function downloadTemplate() {
    try {
        const XLSX = getXLSX();
        if (!XLSX) {
            throw new Error('XLSX library not loaded');
        }

        const templateData = [
            ['姓名', '手机号码', '部门'],
            ['张三', '13800138001', '技术部'],
            ['李四', '13900139002', '产品部'],
            ['王五', '', '运营部'],
            ['赵六', '15800158003', '市场部']
        ];

        const ws = XLSX.utils.aoa_to_sheet(templateData);
        ws['!cols'] = [
            { wch: 15 },
            { wch: 15 },
            { wch: 12 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '抽奖名单');
        XLSX.writeFile(wb, '抽奖名单导入模板.xlsx');

        Logger.action('DOWNLOAD_TEMPLATE');
        return { success: true };
    } catch (error) {
        Logger.error('Failed to download template', { error: error.message });
        return { success: false, error: error.message };
    }
}

export function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const XLSX = getXLSX();
        if (!XLSX) {
            reject(new Error('XLSX library not loaded'));
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            reject(new Error('文件大小不能超过5MB'));
            return;
        }

        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        if (!validTypes.includes(file.type) && !file.name.match(/\.xlsx?$/i)) {
            reject(new Error('请选择Excel文件（.xlsx或.xls）'));
            return;
        }

        const reader = new FileReader();

        reader.onerror = () => {
            reject(new Error('文件读取失败'));
        };

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                    reject(new Error('Excel文件中没有工作表'));
                    return;
                }

                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

                if (!jsonData || jsonData.length < 2) {
                    reject(new Error('文件内容为空或格式不正确'));
                    return;
                }

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
                    reject(new Error('未找到姓名列，请确保表头包含"姓名"'));
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
                    reject(new Error('未解析到有效数据'));
                    return;
                }

                Logger.info('File import completed', { imported: participants.length, skipped: errors.length });
                resolve({ participants, errors });

            } catch (error) {
                Logger.error('File parse error', { error: error.message, fileName: file.name });
                reject(new Error('文件解析失败，请检查格式'));
            }
        };

        reader.readAsArrayBuffer(file);
    });
}

export function exportWinnerList(winners, prizes) {
    try {
        const XLSX = getXLSX();
        if (!XLSX) {
            throw new Error('XLSX library not loaded');
        }

        const prizeIds = Object.keys(winners);
        if (prizeIds.length === 0) {
            return { success: false, error: '暂无中奖记录可导出' };
        }

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

        const ws = XLSX.utils.aoa_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '中奖名单');

        const fileName = `中奖名单_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
        XLSX.writeFile(wb, fileName);

        Logger.action('EXPORT_WINNERS', { fileName, recordCount: exportData.length - 1 });
        return { success: true };
    } catch (error) {
        Logger.error('Failed to export winner list', { error: error.message });
        return { success: false, error: error.message };
    }
}
