"use client";

/**
 * Celebration burst — confetti/sparkle particle burst triggered on signup.
 * MIOMIKA.md §8 Phase 3A (Block G).
 *
 * Fires 80 gold + pink particles from screen center, radial outward, 1.4s.
 * Uses a canvas overlay so no DOM pollution. Removes itself after animation.
 */

import { useCompanionStore } from "@/lib/companion/store";

export interface CelebrationOptions {
  /** Animation intensity */
  intensity?: "low" | "high";
  /** Companion state to set during celebration */
  miomi_state?: "excited" | "happy";
  /** How long (ms) the companion stays in miomi_state */
  duration_ms?: number;
  /** Optional Thai/English subtitle for Miomi to say */
  say_th?: string;
  say_en?: string;
  /** Fire a welcome email via /api/email/welcome */
  send_email?: boolean;
}

const PARTICLE_COUNT = 80;
const PARTICLE_COLORS = [
  "#C9A96E", "#E8C77A", "#FFD700", "#FFF0A0",
  "#F9A8D4", "#C9A96E", "#E8C77A", "#FFFFFF",
];

function randomColor() {
  return PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]!;
}

export function triggerCelebration(opts: CelebrationOptions = {}): void {
  const {
    miomi_state = "excited",
    duration_ms = 2400,
  } = opts;

  // Set companion to excited state
  useCompanionStore.getState().requestState(miomi_state);
  window.setTimeout(() => {
    useCompanionStore.getState().requestState("idle");
  }, duration_ms);

  // Canvas particle burst
  const canvas = document.createElement("canvas");
  canvas.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    pointer-events: none; width: 100vw; height: 100vh;
  `;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) { canvas.remove(); return; }

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const intensity = opts.intensity === "high" ? 1 : 0.6;

  type Particle = {
    x: number; y: number;
    vx: number; vy: number;
    radius: number;
    color: string;
    alpha: number;
    decay: number;
  };

  const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = (60 + Math.random() * 120) * intensity;
    return {
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      radius: 3 + Math.random() * 4,
      color: randomColor(),
      alpha: 1,
      decay: 0.018 + Math.random() * 0.012,
    };
  });

  let rafId: number;
  const startTime = performance.now();

  function draw(now: number) {
    const elapsed = (now - startTime) / 1000;
    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    let alive = 0;
    for (const p of particles) {
      if (p.alpha <= 0) continue;
      alive++;
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.vy += 9.8 * 0.8 * 0.016; // subtle gravity
      p.alpha -= p.decay;

      ctx!.save();
      ctx!.globalAlpha = Math.max(0, p.alpha);
      ctx!.fillStyle = p.color;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();
    }

    if (alive > 0 && elapsed < 2.0) {
      rafId = requestAnimationFrame(draw);
    } else {
      canvas.remove();
    }
  }

  rafId = requestAnimationFrame(draw);

  // Safety cleanup after 3s
  window.setTimeout(() => {
    cancelAnimationFrame(rafId);
    canvas.remove();
  }, 3000);
}
