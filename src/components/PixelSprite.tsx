import React, { useEffect, useState } from 'react';

interface PixelSpriteProps {
  src: string;
  frames?: number;
  width: number;
  height: number;
  fps?: number;
  playing?: boolean;
  responsive?: boolean;
  className?: string;
  alt?: string;
}

export const PixelSprite: React.FC<PixelSpriteProps> = ({
  src,
  frames = 4,
  width,
  height,
  fps = 6,
  playing = true,
  responsive = false,
  className = '',
  alt,
}) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!playing || frames <= 1) return;
    const ms = Math.max(40, Math.round(1000 / fps));
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % frames);
    }, ms);
    return () => window.clearInterval(id);
  }, [frames, fps, playing]);

  const pct = frames > 1 ? (frame / (frames - 1)) * 100 : 0;

  return (
    <span
      role={alt ? 'img' : undefined}
      aria-label={alt}
      className={`inline-block shrink-0 select-none ${className}`}
      style={
        responsive
          ? {
              width: '100%',
              aspectRatio: `${width} / ${height}`,
              backgroundImage: `url(${src})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${frames * 100}% 100%`,
              backgroundPosition: `${pct}% 0%`,
              imageRendering: 'pixelated',
            }
          : {
              width: `${width}px`,
              height: `${height}px`,
              backgroundImage: `url(${src})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${width * frames}px ${height}px`,
              backgroundPosition: `-${frame * width}px 0px`,
              imageRendering: 'pixelated',
            }
      }
    />
  );
};
