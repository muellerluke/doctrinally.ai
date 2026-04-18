"use client";

interface DiffusionRevealProps {
  text: string;
}

const CHUNK_BOUNDARY = "\u200B\u200B";

export function DiffusionReveal({ text }: DiffusionRevealProps) {
  if (!text) return null;

  const cleaned = text.split(CHUNK_BOUNDARY).join("");
  const words = cleaned.split(/(\s+)/);

  return (
    <span className="diffusion-reveal">
      {words.map((w, i) =>
        /^\s+$/.test(w) ? (
          <span key={i}>{w}</span>
        ) : (
          <span
            key={i}
            className="diffusion-word"
            style={{ animationDelay: `${Math.min(i * 10, 180)}ms` }}
          >
            {w}
          </span>
        )
      )}
      <style>{`
        .diffusion-reveal {
          display: inline;
        }
        .diffusion-word {
          display: inline-block;
          animation: diffuse-in 320ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
          will-change: filter, opacity, transform;
        }
        @keyframes diffuse-in {
          0% {
            filter: blur(6px);
            opacity: 0;
            transform: translateY(2px);
          }
          60% {
            filter: blur(1.5px);
            opacity: 0.85;
          }
          100% {
            filter: blur(0);
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .diffusion-word {
            animation: none;
          }
        }
      `}</style>
    </span>
  );
}
