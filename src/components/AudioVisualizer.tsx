import React, { useEffect, useRef } from 'react';
import { AudioEngine } from '../lib/audio-player';

interface AudioVisualizerProps {
  status: 'idle' | 'listening' | 'thinking' | 'speaking';
  audioEngine: AudioEngine;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  status,
  audioEngine,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);
      phase += 0.04;

      const analyser = audioEngine.getAnalyser();
      const isSpeaking = status === 'speaking';
      let freqAverage = 0;

      if (analyser && isSpeaking) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < 32; i++) {
          sum += dataArray[i];
        }
        freqAverage = (sum / 32) / 255;
      }

      // Draw background ambient glow
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        10,
        centerX,
        centerY,
        110 + (isSpeaking ? freqAverage * 40 : 0)
      );

      if (status === 'speaking') {
        glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
        glowGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.15)');
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (status === 'listening') {
        glowGrad.addColorStop(0, 'rgba(52, 211, 153, 0.4)');
        glowGrad.addColorStop(0.6, 'rgba(16, 185, 129, 0.12)');
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (status === 'thinking') {
        glowGrad.addColorStop(0, 'rgba(192, 132, 252, 0.4)');
        glowGrad.addColorStop(0.6, 'rgba(147, 51, 234, 0.15)');
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        glowGrad.addColorStop(0, 'rgba(148, 163, 184, 0.15)');
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 120, 0, Math.PI * 2);
      ctx.fill();

      // Outer undulating waves
      const waveCount = status === 'speaking' ? 3 : 2;
      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        const baseRadius = 45 + w * 16 + (isSpeaking ? freqAverage * 28 : Math.sin(phase + w) * 4);
        const points = 40;

        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const wobble = status === 'speaking'
            ? Math.sin(angle * 5 + phase * 2 + w) * (6 + freqAverage * 12)
            : status === 'listening'
            ? Math.sin(angle * 3 + phase * 1.5) * 4
            : status === 'thinking'
            ? Math.sin(angle * 4 + phase * 3) * 3
            : Math.sin(angle * 2 + phase) * 2;

          const r = baseRadius + wobble;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        if (status === 'speaking') {
          ctx.strokeStyle = `rgba(56, 189, 248, ${0.7 - w * 0.2})`;
          ctx.lineWidth = 2.2;
        } else if (status === 'listening') {
          ctx.strokeStyle = `rgba(52, 211, 153, ${0.8 - w * 0.25})`;
          ctx.lineWidth = 2.5;
        } else if (status === 'thinking') {
          ctx.strokeStyle = `rgba(192, 132, 252, ${0.75 - w * 0.25})`;
          ctx.lineWidth = 2;
        } else {
          ctx.strokeStyle = `rgba(100, 116, 139, ${0.4 - w * 0.15})`;
          ctx.lineWidth = 1.5;
        }
        ctx.stroke();
      }

      // Center Core Orb
      const orbRadius = 32 + (isSpeaking ? freqAverage * 14 : Math.sin(phase * 1.5) * 2.5);
      const orbGrad = ctx.createRadialGradient(
        centerX - 8,
        centerY - 8,
        4,
        centerX,
        centerY,
        orbRadius
      );

      if (status === 'speaking') {
        orbGrad.addColorStop(0, '#38bdf8');
        orbGrad.addColorStop(0.5, '#6366f1');
        orbGrad.addColorStop(1, '#1e1b4b');
      } else if (status === 'listening') {
        orbGrad.addColorStop(0, '#34d399');
        orbGrad.addColorStop(0.6, '#059669');
        orbGrad.addColorStop(1, '#064e3b');
      } else if (status === 'thinking') {
        orbGrad.addColorStop(0, '#c084fc');
        orbGrad.addColorStop(0.6, '#9333ea');
        orbGrad.addColorStop(1, '#3b0764');
      } else {
        orbGrad.addColorStop(0, '#94a3b8');
        orbGrad.addColorStop(0.7, '#475569');
        orbGrad.addColorStop(1, '#0f172a');
      }

      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.fill();

      // Core rim highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [status, audioEngine]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="w-[260px] h-[260px] sm:w-[280px] sm:h-[280px]"
      />
    </div>
  );
};
