"use client";

import { useEffect, useRef } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Mode = "ambient" | "magic";

interface AmbientBackgroundProps {
  mode?: Mode;
  className?: string;
}

// ─── PALETTE ─────────────────────────────────────────────────────────────────

const PAL = [
  { r: 249, g: 168, b: 212 }, // pink
  { r: 251, g: 207, b: 232 }, // blush
  { r: 201, g: 169, b: 110 }, // gold
  { r: 196, g: 181, b: 253 }, // lavender
  { r: 252, g: 165, b: 165 }, // coral
  { r: 167, g: 243, b: 208 }, // mint
  { r: 253, g: 186, b: 116 }, // peach
  { r: 244, g: 114, b: 182 }, // hot pink
];

const rc = () => PAL[Math.floor(Math.random() * PAL.length)]!;

// ─── CATMULL-ROM ORGANIC BLOB DRAW ───────────────────────────────────────────
// True irregular bezier blob — never an ellipse

function drawOrganic(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  pts: { x: number; y: number }[]
) {
  const n = pts.length;
  if (n < 3) return;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    if (i === 0) ctx.moveTo(p1.x + cx, p1.y + cy);
    const cp1x = p1.x + (p2.x - p0.x) / 5.5;
    const cp1y = p1.y + (p2.y - p0.y) / 5.5;
    const cp2x = p2.x - (p3.x - p1.x) / 5.5;
    const cp2y = p2.y - (p3.y - p1.y) / 5.5;
    ctx.bezierCurveTo(
      cp1x + cx, cp1y + cy,
      cp2x + cx, cp2y + cy,
      p2.x + cx, p2.y + cy
    );
  }
  ctx.closePath();
}

// ─── BLOB CLASS ───────────────────────────────────────────────────────────────

class Blob {
  x = 0; y = 0;
  vx = 0; vy = 0;
  wander = 0;
  baseR = 0;
  c = rc();
  age = 0;
  life = 0;
  maxAlpha = 0;
  alpha = 0;
  nPts = 0;
  pts: { baseAng: number; angOffset: number; rMult: number; rSpeed: number; rPhase: number; angSpeed: number }[] = [];
  rot = 0;
  rotSpeed = 0;
  t = 0;
  // 0 = filled, 1 = hollow stroke, 2 = thick donut
  formSeq: [number, number, number] = [0, 0, 0];
  strokeW = 0;
  repelVx = 0;
  repelVy = 0;
  W: number;
  H: number;

  constructor(W: number, H: number, onscreen: boolean) {
    this.W = W;
    this.H = H;
    this.reset(onscreen);
  }

  reset(onscreen: boolean) {
    const { W, H } = this;
    if (onscreen) {
      // Distribute across entire screen for initial fill
      this.x = Math.random() * W;
      this.y = Math.random() * H;
    } else {
      // Spawn from a random edge
      const edge = Math.floor(Math.random() * 4);
      const m = 140;
      if (edge === 0) { this.x = Math.random() * W; this.y = -m; }
      else if (edge === 1) { this.x = W + m; this.y = Math.random() * H; }
      else if (edge === 2) { this.x = Math.random() * W; this.y = H + m; }
      else { this.x = -m; this.y = Math.random() * H; }
    }

    const ang = Math.random() * Math.PI * 2;
    // Slower speed = blobs feel large and weighty
    const spd = 0.10 + Math.random() * 0.20;
    this.vx = Math.cos(ang) * spd;
    this.vy = Math.sin(ang) * spd;
    this.wander = (Math.random() - 0.5) * 0.011;

    // Wide size range — small accent blobs AND large sweeping ones
    this.baseR = 50 + Math.random() * 130;
    this.c = rc();
    this.age = 0;
    // 360–660 frames = ~6–11 seconds at 60fps
    this.life = 360 + Math.random() * 300;
    // Larger blobs more transparent — layering reads naturally
    this.maxAlpha = Math.max(0.04, 0.22 - (this.baseR / 130) * 0.12);
    this.alpha = onscreen ? this.maxAlpha * (0.3 + Math.random() * 0.7) : 0;

    // 6–9 vertices — more points = more organic deformation
    this.nPts = 6 + Math.floor(Math.random() * 4);
    this.pts = Array.from({ length: this.nPts }, (_, i) => {
      const baseAng = (i / this.nPts) * Math.PI * 2;
      return {
        baseAng,
        // Irregular angular spacing — breaks circular symmetry
        angOffset: (Math.random() - 0.5) * 0.9,
        // Each vertex has its own radius multiplier (0.5–1.3)
        rMult: 0.5 + Math.random() * 0.8,
        // Each vertex oscillates at its own rate — true amoeba effect
        rSpeed: 0.006 + Math.random() * 0.016,
        rPhase: Math.random() * Math.PI * 2,
        angSpeed: (Math.random() - 0.5) * 0.006,
      };
    });

    this.rot = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.003;
    this.t = Math.random() * 200;

    // Each blob sequences through 3 forms over its lifetime
    const f = () => Math.floor(Math.random() * 3);
    this.formSeq = [f(), f(), f()];
    // Hollow stroke thickness varies per blob
    this.strokeW = 3 + Math.random() * 8;

    this.repelVx = 0;
    this.repelVy = 0;
  }

  getForm(): number {
    const p = this.age / this.life;
    if (p < 0.33) return this.formSeq[0];
    if (p < 0.66) return this.formSeq[1];
    return this.formSeq[2];
  }

  buildPts(): { x: number; y: number }[] {
    this.t += 0.010;
    return this.pts.map((p) => {
      // Independent oscillation per vertex — the core of the organic feel
      const r = this.baseR * p.rMult * (0.72 + 0.30 * Math.sin(this.t * p.rSpeed * 60 + p.rPhase));
      const ang = p.baseAng + p.angOffset + this.t * p.angSpeed * 60;
      return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
    });
  }

  update(mouseX: number, mouseY: number, mouseInside: boolean) {
    this.age++;
    this.t += 0;

    // Gentle direction wander
    const ang = Math.atan2(this.vy, this.vx) + this.wander;
    const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    this.vx = Math.cos(ang) * spd;
    this.vy = Math.sin(ang) * spd;
    this.rot += this.rotSpeed;

    // Mouse / touch repulsion
    if (mouseInside) {
      const dx = this.x - mouseX;
      const dy = this.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const repR = 100 + this.baseR * 0.8;
      if (dist < repR) {
        const force = Math.pow(1 - dist / repR, 2) * 5;
        this.repelVx += (dx / dist) * force;
        this.repelVy += (dy / dist) * force;
      }
    }
    this.repelVx *= 0.87;
    this.repelVy *= 0.87;
    this.x += this.vx + this.repelVx;
    this.y += this.vy + this.repelVy;

    // Smooth fade in / fade out over 90 frames each end
    const fi = Math.min(1, this.age / 90);
    const fo = Math.min(1, (this.life - this.age) / 90);
    this.alpha = this.maxAlpha * fi * fo;

    const pad = 180;
    if (
      this.age > this.life ||
      this.x < -pad || this.x > this.W + pad ||
      this.y < -pad || this.y > this.H + pad
    ) {
      this.reset(false);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const pts = this.buildPts();
    const form = this.getForm();
    const { r, g, b } = this.c;
    const maxR = this.baseR * 1.35;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);

    if (form === 0) {
      // Filled organic blob — radial gradient: bright core, transparent edge
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxR);
      grad.addColorStop(0,    `rgba(${r},${g},${b},1)`);
      grad.addColorStop(0.45, `rgba(${r},${g},${b},0.55)`);
      grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      drawOrganic(ctx, 0, 0, pts);
      ctx.fill();

    } else if (form === 1) {
      // Hollow organic outline — glowing stroke, no fill
      const lw = this.strokeW * (0.7 + 0.4 * Math.sin(this.t * 7));
      ctx.strokeStyle = `rgba(${r},${g},${b},0.85)`;
      ctx.lineWidth = lw;
      ctx.shadowColor = `rgba(${r},${g},${b},0.5)`;
      ctx.shadowBlur = lw * 3.5;
      drawOrganic(ctx, 0, 0, pts);
      ctx.stroke();
      ctx.shadowBlur = 0;

    } else {
      // Thick organic donut — inner path scaled, evenodd clip
      const innerScale = 0.40 + 0.14 * Math.sin(this.t * 4.5);
      const innerPts = pts.map((p) => ({ x: p.x * innerScale, y: p.y * innerScale }));
      const grad = ctx.createRadialGradient(
        0, 0, this.baseR * innerScale * 0.6,
        0, 0, maxR * 0.9
      );
      grad.addColorStop(0,    `rgba(${r},${g},${b},0)`);
      grad.addColorStop(0.25, `rgba(${r},${g},${b},0.8)`);
      grad.addColorStop(0.65, `rgba(${r},${g},${b},0.4)`);
      grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      drawOrganic(ctx, 0, 0, pts);
      drawOrganic(ctx, 0, 0, innerPts);
      ctx.fill("evenodd");
    }

    ctx.restore();
  }
}

// ─── MOTE (tiny drifting sparkle) ────────────────────────────────────────────

class Mote {
  x = 0; y = 0;
  r = 0;
  c = rc();
  age = 0; life = 0;
  maxAlpha = 0; alpha = 0;
  vx = 0; vy = 0;
  W: number; H: number;

  constructor(W: number, H: number) {
    this.W = W; this.H = H;
    this.reset();
  }

  reset() {
    this.x = Math.random() * this.W;
    this.y = Math.random() * this.H;
    // Varied sizes — some tiny dots, some small circles
    this.r = 1.0 + Math.random() * 3.5;
    this.c = rc();
    this.age = 0;
    this.life = 100 + Math.random() * 160;
    this.maxAlpha = 0.25 + Math.random() * 0.40;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
  }

  update() {
    this.age++;
    this.x += this.vx;
    this.y += this.vy;
    const fi = Math.min(1, this.age / 30);
    const fo = Math.min(1, (this.life - this.age) / 30);
    this.alpha = this.maxAlpha * fi * fo;
    if (this.age > this.life) this.reset();
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { r, g, b } = this.c;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── MAGIC BURST PARTICLE ─────────────────────────────────────────────────────
// Used in mode="magic" — bursts outward from Miomi center

class MagicParticle {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  c: { r: number; g: number; b: number };
  age: number;
  life: number;
  alpha: number;
  isRing: boolean;

  constructor(cx: number, cy: number) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 1.5 + Math.random() * 3.5;
    this.x = cx; this.y = cy;
    this.vx = Math.cos(ang) * spd;
    this.vy = Math.sin(ang) * spd;
    this.r = 4 + Math.random() * 18;
    this.c = rc();
    this.age = 0;
    this.life = 45 + Math.random() * 55;
    this.alpha = 0;
    this.isRing = Math.random() > 0.5;
  }

  update() {
    this.age++;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.x += this.vx;
    this.y += this.vy;
    const fi = Math.min(1, this.age / 10);
    const fo = Math.min(1, (this.life - this.age) / 20);
    this.alpha = 0.7 * fi * fo;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { r, g, b } = this.c;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    if (this.isRing) {
      ctx.strokeStyle = `rgb(${r},${g},${b})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = `rgba(${r},${g},${b},0.6)`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  isDead() { return this.age >= this.life; }
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function AmbientBackground({ mode = "ambient", className }: AmbientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -999, y: -999, inside: false });
  const magicRef = useRef<MagicParticle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    // Resize handler
    const ro = new ResizeObserver(() => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    });
    ro.observe(parent);

    // Mouse / touch
    const onMouseEnter = () => (mouseRef.current.inside = true);
    const onMouseLeave = () => { mouseRef.current.inside = false; mouseRef.current.x = -999; mouseRef.current.y = -999; };
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.touches[0]!.clientX - rect.left;
      mouseRef.current.y = e.touches[0]!.clientY - rect.top;
      mouseRef.current.inside = true;
    };
    const onTouchEnd = () => { mouseRef.current.inside = false; mouseRef.current.x = -999; mouseRef.current.y = -999; };

    canvas.addEventListener("mouseenter", onMouseEnter);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);

    // Particles
    // 11 blobs: 6 start onscreen for instant visual warmth, 5 spawn from edges
    const blobs = Array.from({ length: 11 }, (_, i) => new Blob(W, H, i < 6));
    const motes = Array.from({ length: 14 }, () => new Mote(W, H));

    let raf: number;

    function loop() {
      ctx.clearRect(0, 0, W, H);

      const { x: mx, y: my, inside } = mouseRef.current;

      blobs.forEach((b) => { b.W = W; b.H = H; b.update(mx, my, inside); b.draw(ctx); });
      motes.forEach((m) => { m.W = W; m.H = H; m.update(); m.draw(ctx); });

      // Magic burst particles (mode="magic" or triggered externally)
      if (mode === "magic" || magicRef.current.length > 0) {
        magicRef.current = magicRef.current.filter((p) => !p.isDead());
        magicRef.current.forEach((p) => { p.update(); p.draw(ctx); });
      }

      raf = requestAnimationFrame(loop);
    }

    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("mouseenter", onMouseEnter);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "auto",
        zIndex: 1,
      }}
      className={className}
    />
  );
}

// ─── MAGIC TRIGGER ────────────────────────────────────────────────────────────
// Call this from anywhere to burst particles from Miomi's center.
// Usage: triggerMagic(ref, centerX, centerY, count)
// The ref is the AmbientBackground's magicRef — expose via forwardRef if needed.
// Simpler approach: use the global event below.

export function useMagicTrigger() {
  return (centerX: number, centerY: number, count = 24) => {
    const event = new CustomEvent("miomika:magic", {
      detail: { cx: centerX, cy: centerY, count },
    });
    window.dispatchEvent(event);
  };
}
