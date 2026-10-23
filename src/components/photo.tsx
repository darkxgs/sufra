"use client";

import { useId, useState } from "react";
import { cn } from "./ui";

// Menu photos are pre-sized at build time (scripts/photos.sh): a 400 px and a
// 900 px square WebP per dish, and two widths of the cover. While they're
// missing (or if one fails), the slot shows a plate on slate, the same props
// the photographs use, rather than a broken image.

export function Photo({
  slug,
  alt,
  className,
  sizes = "96px",
  priority = false,
  cover = false,
}: {
  slug: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  cover?: boolean;
}) {
  const [failed, setFailed] = useState(!slug);
  const src = (w: number) => `/photos/${slug}-${w}.webp`;
  const set = cover ? `${src(800)} 800w, ${src(1600)} 1600w` : `${src(400)} 400w, ${src(900)} 900w`;
  return (
    <span className={cn("relative block overflow-hidden bg-slate", className)}>
      <Plate wide={cover} />
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP files; no optimiser needed
        <img
          src={cover ? src(1600) : src(900)}
          srcSet={set}
          sizes={sizes}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
          onError={() => setFailed(true)}
          // An image that failed before hydration never fires onError for React; check once mounted.
          ref={(el) => {
            if (el && el.complete && el.naturalWidth === 0) setFailed(true);
          }}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <span className="sr-only">{alt}</span>
      )}
    </span>
  );
}

function Plate({ wide }: { wide: boolean }) {
  const id = useId();
  return (
    <svg viewBox={wide ? "0 0 300 200" : "0 0 100 100"} className="absolute inset-0 size-full" aria-hidden preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="90%">
          <stop offset="0" stopColor="#30373a" />
          <stop offset="1" stopColor="#1d2224" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      {wide ? (
        <>
          <circle cx="70" cy="70" r="42" fill="#4b5a3c" stroke="#6b5a45" strokeWidth="3" />
          <circle cx="190" cy="120" r="52" fill="#4b5a3c" stroke="#6b5a45" strokeWidth="3" />
          <circle cx="250" cy="45" r="26" fill="#4b5a3c" stroke="#6b5a45" strokeWidth="3" />
        </>
      ) : (
        <>
          <circle cx="50" cy="50" r="34" fill="#4b5a3c" stroke="#6b5a45" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="22" fill="none" stroke="#5c6b4b" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}
