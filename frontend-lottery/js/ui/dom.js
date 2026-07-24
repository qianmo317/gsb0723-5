/**
 * DOM 工具模块
 * 提供通用的 DOM 辅助函数
 */

/**
 * HTML转义（防XSS）
 */
export function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/**
 * 快捷获取元素
 */
export function $(id) {
    return document.getElementById(id);
}
