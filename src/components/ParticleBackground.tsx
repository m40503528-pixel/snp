import { useCallback, useMemo } from 'react';
import Particles from '@tsparticles/react';
import type { ISourceOptions } from '@tsparticles/engine';

export default function ParticleBackground() {
  const particlesLoaded = useCallback(async () => {}, []);

  const options: ISourceOptions = useMemo(
    () => ({
      fullScreen: { enable: false },
      fpsLimit: 60,
      particles: {
        color: { value: ['#a855f7', '#6366f1', '#3b82f6', '#06b6d4'] },
        links: {
          enable: true,
          color: '#a855f7',
          distance: 150,
          opacity: 0.12,
          width: 1,
        },
        move: {
          enable: true,
          speed: 0.6,
          direction: 'none',
          random: true,
          straight: false,
          outModes: { default: 'bounce' },
        },
        number: {
          density: { enable: true, area: 900 },
          value: 40,
        },
        opacity: {
          value: { min: 0.1, max: 0.35 },
          animation: { enable: true, speed: 0.4, sync: false },
        },
        size: {
          value: { min: 1, max: 3 },
        },
        shape: { type: 'circle' },
      },
      interactivity: {
        events: {
          onHover: { enable: true, mode: 'grab' },
        },
        modes: {
          grab: { distance: 140, links: { opacity: 0.3 } },
        },
      },
      detectRetina: true,
      background: { color: 'transparent' },
    }),
    [],
  );

  return (
    <Particles
      id="tsparticles"
      particlesLoaded={particlesLoaded}
      options={options}
      className="absolute inset-0 z-0 pointer-events-none"
    />
  );
}
