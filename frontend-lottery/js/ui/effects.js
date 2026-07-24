/**
 * 视觉特效模块
 * 负责粒子装饰与中奖烟花效果
 */
export function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        container.appendChild(particle);
    }
}

export function createFireworks() {
    const colors = ['#ffd700', '#ff6b6b', '#4ade80', '#60a5fa', '#f472b6', '#a78bfa'];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const firework = document.createElement('div');
            firework.className = 'firework';
            firework.style.left = centerX + 'px';
            firework.style.top = centerY + 'px';
            firework.style.background = colors[Math.floor(Math.random() * colors.length)];
            firework.style.boxShadow = `0 0 6px ${firework.style.background}`;

            const angle = (Math.PI * 2 * i) / 50;
            const velocity = 100 + Math.random() * 150;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity;

            firework.style.setProperty('--tx', tx + 'px');
            firework.style.setProperty('--ty', ty + 'px');
            firework.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
            ], {
                duration: 1000 + Math.random() * 500,
                easing: 'cubic-bezier(0, 0.5, 0.5, 1)'
            });

            document.body.appendChild(firework);

            setTimeout(() => firework.remove(), 1500);
        }, Math.random() * 300);
    }
}
