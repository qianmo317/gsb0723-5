export const SURNAMES = ['张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '何', '林', '罗', '高'];
export const NAMES = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀英', '华', '平'];
export const DEPARTMENTS = ['技术部', '产品部', '运营部', '市场部', '人事部', '财务部', '行政部', '销售部', '客服部', '研发部'];

export function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

export function generateRandomParticipants(count) {
    const participants = [];
    const usedNames = new Set();

    for (let i = 0; i < count; i++) {
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

    return participants;
}

export function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
