'use client';

import React, { useEffect, useRef } from 'react';

const FITNESS_WORDS = [
  'GYMAI', 'COACH', 'HYPERTROPHY', 'OVERLOAD', 'STRENGTH',
  'PUSH', 'PULL', 'LEGS', 'UPPER', 'LOWER', 'RIR', 'RPE',
  '1RM', 'GAINS', 'RECOVERY', 'VOLUME', 'SETS', 'REPS',
  'TEMPO', 'DUMBBELL', 'BARBELL', 'CABLE', 'MACHINE', 'CREATINE',
  'NEURAL', 'PLANNER', 'PROGRESS', 'OPTIMAL', 'DELOAD', 'PEAK',
];

const HIGHLIGHT_CHARS = new Set(['G', 'Y', 'M', 'A', 'I', 'V', 'P', 'R']);

export default function CyberSpotlightBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number; active: boolean }>({
    x: -1000,
    y: -1000,
    targetX: -1000,
    targetY: -1000,
    active: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Grid layout constants (Compact Lens: ~5 cells diameter)
    const CELL_SIZE = 40;
    const SPOTLIGHT_RADIUS = 110;
    const CORE_RADIUS = 45;

    let cols = 0;
    let rows = 0;
    let gridChars: string[][] = [];

    function generateGrid() {
      cols = Math.ceil(width / CELL_SIZE) + 2;
      rows = Math.ceil(height / CELL_SIZE) + 2;
      gridChars = [];

      let wordIndex = 0;
      let charIndex = 0;

      for (let r = 0; r < rows; r++) {
        const row: string[] = [];
        for (let c = 0; c < cols; c++) {
          const currentWord = FITNESS_WORDS[wordIndex % FITNESS_WORDS.length];
          const char = currentWord[charIndex % currentWord.length];
          row.push(char);
          charIndex++;
          if (charIndex >= currentWord.length) {
            charIndex = 0;
            wordIndex++;
          }
        }
        gridChars.push(row);
      }
    }

    function resize() {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx?.scale(dpr, dpr);
      generateGrid();
    }

    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    let lastTime = performance.now();

    function render(time: number) {
      if (!ctx || !canvas) return;

      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Smooth lerp mouse position
      const mouse = mouseRef.current;
      const lerpFactor = Math.min(dt * 14, 1);
      mouse.x += (mouse.targetX - mouse.x) * lerpFactor;
      mouse.y += (mouse.targetY - mouse.y) * lerpFactor;

      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.classList.contains('dark') ||
        (!document.documentElement.classList.contains('light') &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (mouse.x > -500 && mouse.y > -500) {
        const mx = mouse.x;
        const my = mouse.y;

        // Determine visible grid bounds around spotlight for performance
        const minCol = Math.max(0, Math.floor((mx - SPOTLIGHT_RADIUS) / CELL_SIZE));
        const maxCol = Math.min(cols - 1, Math.ceil((mx + SPOTLIGHT_RADIUS) / CELL_SIZE));
        const minRow = Math.max(0, Math.floor((my - SPOTLIGHT_RADIUS) / CELL_SIZE));
        const maxRow = Math.min(rows - 1, Math.ceil((my + SPOTLIGHT_RADIUS) / CELL_SIZE));

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '700 13px ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace';

        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            const cellX = c * CELL_SIZE;
            const cellY = r * CELL_SIZE;
            const centerX = cellX + CELL_SIZE / 2;
            const centerY = cellY + CELL_SIZE / 2;

            const dx = centerX - mx;
            const dy = centerY - my;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > SPOTLIGHT_RADIUS) continue;

            const proximity = 1 - dist / SPOTLIGHT_RADIUS; // 0 to 1
            const easedProximity = Math.pow(proximity, 1.8); // smooth cubic curve

            const char = gridChars[r]?.[c] || '•';
            const isHighlightLetter = HIGHLIGHT_CHARS.has(char);

            // 1. Grid cell border (soft subtle cyber wireframe)
            const borderAlpha = easedProximity * (isDark ? 0.12 : 0.10);
            ctx.strokeStyle = isDark
              ? `rgba(255, 255, 255, ${borderAlpha})`
              : `rgba(0, 0, 0, ${borderAlpha})`;
            ctx.lineWidth = 1;
            ctx.strokeRect(cellX + 0.5, cellY + 0.5, CELL_SIZE, CELL_SIZE);

            // 2. High-focus center tile fill (Like the red/orange pixel blocks in reference image)
            if (dist < CORE_RADIUS && isHighlightLetter) {
              const coreAlpha = (1 - dist / CORE_RADIUS) * 0.45;
              ctx.fillStyle = `rgba(249, 115, 22, ${coreAlpha})`;
              // Rounded subtle square inside cell
              const padding = 4;
              ctx.beginPath();
              ctx.roundRect(
                cellX + padding,
                cellY + padding,
                CELL_SIZE - padding * 2,
                CELL_SIZE - padding * 2,
                6,
              );
              ctx.fill();
            } else if (dist < CORE_RADIUS * 0.7) {
              // Subtle soft ambient cell background
              const cellBgAlpha = (1 - dist / (CORE_RADIUS * 0.7)) * 0.12;
              ctx.fillStyle = isDark
                ? `rgba(255, 255, 255, ${cellBgAlpha})`
                : `rgba(0, 0, 0, ${cellBgAlpha})`;
              ctx.fillRect(cellX + 2, cellY + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            }

            // 3. Grid corner crosshair '+' marks
            if (easedProximity > 0.4) {
              const crossSize = 2.5;
              const crossAlpha = easedProximity * 0.25;
              ctx.strokeStyle = `rgba(249, 115, 22, ${crossAlpha})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              // Top-left corner
              ctx.moveTo(cellX - crossSize, cellY);
              ctx.lineTo(cellX + crossSize, cellY);
              ctx.moveTo(cellX, cellY - crossSize);
              ctx.lineTo(cellX, cellY + crossSize);
              ctx.stroke();
            }

            // 4. Character rendering with dynamic intensity
            if (dist < CORE_RADIUS && isHighlightLetter) {
              // Highlight letter glows orange
              ctx.fillStyle = isDark ? '#f97316' : '#ea580c';
            } else {
              const charAlpha = easedProximity * (isDark ? 0.85 : 0.75);
              ctx.fillStyle = isDark
                ? `rgba(240, 246, 252, ${charAlpha})`
                : `rgba(30, 41, 59, ${charAlpha})`;
            }

            ctx.fillText(char, centerX, centerY);
          }
        }

        // 5. Ambient center spotlight glow
        const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, SPOTLIGHT_RADIUS);
        gradient.addColorStop(0, 'rgba(249, 115, 22, 0.08)');
        gradient.addColorStop(0.5, 'rgba(249, 115, 22, 0.03)');
        gradient.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(mx, my, SPOTLIGHT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500"
    />
  );
}
