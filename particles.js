class ParticleSystem {
  constructor(container) {
    this.container = container;
    this.particles = [];
    this.maxParticles = 100;
    this.quality = 2;
  }

  emit(x, y, color, count) {
    if (this.quality === 0) return;
    const particlesCount = this.quality === 1 ? count / 2 : count;
    for (let i = 0; i < particlesCount && this.particles.length < this.maxParticles; i++) {
      const size = Math.random() * 5 + 2;
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.cssText = `width:${size}px;height:${size}px;background-color:${color};left:${x}px;top:${y}px;`;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      const velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
      const life = Math.random() * 1000 + 500;
      this.particles.push({ element: particle, x, y, velocity, life, maxLife: life, size });
      this.container.appendChild(particle);
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= 16;
      if (p.life <= 0) {
        p.element.remove();
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.velocity.x;
      p.y += p.velocity.y;
      p.velocity.y += 0.1;
      const lifeRatio = p.life / p.maxLife;
      p.element.style.opacity = lifeRatio;
      p.element.style.transform = `scale(${lifeRatio})`;
      p.element.style.left = `${p.x}px`;
      p.element.style.top = `${p.y}px`;
    }
  }
}