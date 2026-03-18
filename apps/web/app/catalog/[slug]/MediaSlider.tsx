"use client";

import { useState } from "react";

type Slide =
  | { type: "video"; embedUrl: string | null; directUrl: string | null }
  | { type: "image"; url: string };

interface Props {
  slides: Slide[];
}

export default function MediaSlider({ slides }: Props) {
  const [active, setActive] = useState(0);

  if (slides.length === 0) return null;

  const prev = () => setActive((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setActive((i) => (i + 1) % slides.length);

  const current = slides[active];

  return (
    <div className="space-y-3">
      {/* Main viewer */}
      <div className="relative w-full rounded-2xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
        {current.type === "video" ? (
          current.embedUrl ? (
            <iframe
              src={current.embedUrl}
              title="Game trailer"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : current.directUrl ? (
            <video src={current.directUrl} controls className="w-full h-full object-cover" />
          ) : null
        ) : (
          <img src={current.url} alt="" className="w-full h-full object-cover" />
        )}

        {/* Gradient edges */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(8,8,16,0.15) 0%, transparent 20%, transparent 80%, rgba(8,8,16,0.4) 100%)" }}
        />

        {/* Arrows */}
        {slides.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-200 hover:scale-110"
              style={{
                background: "rgba(8,8,16,0.6)",
                borderColor: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(8px)",
              }}
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-200 hover:scale-110"
              style={{
                background: "rgba(8,8,16,0.6)",
                borderColor: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(8px)",
              }}
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Slide counter */}
        {slides.length > 1 && (
          <div
            className="absolute bottom-3 right-3 z-10 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
            style={{ background: "rgba(8,8,16,0.65)", backdropFilter: "blur(8px)" }}
          >
            {active + 1} / {slides.length}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {slides.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {slides.map((slide, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="flex-shrink-0 rounded-lg overflow-hidden transition-all duration-200"
              style={{
                width: "80px",
                height: "50px",
                border: i === active ? "2px solid #fbbf24" : "2px solid rgba(255,255,255,0.12)",
                boxShadow: i === active ? "0 0 12px rgba(251,191,36,0.5)" : "none",
                opacity: i === active ? 1 : 0.5,
              }}
            >
              {slide.type === "video" ? (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: "#12121e" }}
                >
                  <svg className="w-5 h-5 text-white opacity-80" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              ) : (
                <img src={slide.url} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
