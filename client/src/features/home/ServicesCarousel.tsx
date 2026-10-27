import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import type { ServiceItem } from '@roman/shared';

import { NextIcon, PauseIcon, PlayIcon, PreviousIcon } from '@/features/audio/icons';
import { REDUCED_MOTION_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';

/** How long each card stays before the next one, while the carousel plays. */
const SLIDE_MS = 7000;

const control =
  'inline-flex size-11 items-center justify-center rounded-full border border-snow/20 text-snow transition-colors hover:border-crimson hover:text-crimson';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * "What I do": the owner's service cards one at a time (WAI-ARIA carousel pattern). It advances by
 * itself, but stops while the pointer or focus is on it, when the visitor pauses it, and never
 * starts for people who prefer reduced motion. Announcements are polite and only while it isn't
 * moving by itself.
 */
export function ServicesCarousel({ services }: { services: readonly ServiceItem[] }) {
  const count = services.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const canPlay = count > 1 && !reducedMotion;
  const playing = canPlay && !paused && !engaged;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, SLIDE_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [playing, count]);

  const service = services[Math.min(index, count - 1)];
  if (!service) return null;
  const position = `${pad(index + 1)} / ${pad(count)}`;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Services"
      onPointerEnter={() => {
        setEngaged(true);
      }}
      onPointerLeave={() => {
        setEngaged(false);
      }}
      onFocus={() => {
        setEngaged(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setEngaged(false);
      }}
      className="relative overflow-hidden service-stage"
    >
      <div aria-live={playing ? 'off' : 'polite'}>
        <div
          key={index}
          role="group"
          aria-roledescription="slide"
          aria-label={`${String(index + 1)} of ${String(count)}`}
          className="grid gap-10 p-6 motion-safe:animate-rise sm:p-10 lg:grid-cols-2 lg:items-center lg:gap-12 lg:p-16"
        >
          <div>
            <p className="flex items-center gap-3 label-caps text-fog">
              <span aria-hidden="true" className="h-px w-8 bg-crimson" />
              No. {pad(index + 1)}
              {service.kicker && ` · ${service.kicker}`}
            </p>
            {count > 1 && (
              <p aria-hidden="true" className="mt-8 flex items-baseline gap-3 font-display">
                <span className="text-[4rem] leading-none text-crimson sm:text-[5rem]">
                  {pad(index + 1)}
                </span>
                <span className="text-lg text-fog">/ {pad(count)}</span>
              </p>
            )}
            <h3 className="mt-6 font-display text-[2.5rem] leading-[1.05] font-semibold sm:text-[3.5rem]">
              {service.title}
            </h3>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-fog">{service.summary}</p>
          </div>

          <div className="relative min-h-24">
            <Staff />
            {(service.details.length > 0 || service.cta) && (
              <div className="relative z-10 mx-auto max-w-md glass-card p-6 sm:p-7">
                {count > 1 && (
                  <p className="label-caps text-crimson">{position.replace('/', 'of')}</p>
                )}
                <p className="mt-2 font-display text-[1.75rem] leading-tight">{service.title}</p>
                <dl className="mt-4 divide-y divide-snow/10 text-sm">
                  {service.details.map((detail) => (
                    <div key={detail.label} className="flex justify-between gap-6 py-3">
                      <dt className="text-fog">{detail.label}</dt>
                      <dd className="text-right font-medium">{detail.value}</dd>
                    </div>
                  ))}
                  {service.cta && (
                    <div className="flex items-center justify-between gap-6 py-3">
                      <dt className="text-fog">To book</dt>
                      <dd>
                        <Link
                          to={`/contact?type=${service.cta.inquiryType}`}
                          className="inline-flex min-h-11 items-center font-semibold underline decoration-crimson underline-offset-4 hover:text-crimson"
                        >
                          {service.cta.label}
                        </Link>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>

      {count > 1 && (
        <div className="flex items-center justify-center gap-3 pb-8 sm:pb-10">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => {
              setIndex((current) => (current - 1 + count) % count);
            }}
            className={control}
          >
            <PreviousIcon className="size-4" />
          </button>
          <p
            aria-hidden="true"
            className="min-w-16 text-center text-sm tracking-[0.12em] tabular-nums"
          >
            <span className="text-crimson">{pad(index + 1)}</span>
            <span className="text-fog"> / {pad(count)}</span>
          </p>
          {canPlay && (
            <button
              type="button"
              aria-label={paused ? 'Start automatic slides' : 'Stop automatic slides'}
              onClick={() => {
                setPaused((current) => !current);
              }}
              className={control}
            >
              {paused ? <PlayIcon className="size-4" /> : <PauseIcon className="size-4" />}
            </button>
          )}
          <button
            type="button"
            aria-label="Next"
            onClick={() => {
              setIndex((current) => (current + 1) % count);
            }}
            className={control}
          >
            <NextIcon className="size-4" />
          </button>
        </div>
      )}
      <Equaliser />
    </div>
  );
}

/** A stave with a few notes glowing in turn, behind the top of the details card. Decorative. */
function Staff() {
  const notes = [
    { x: 60, y: 66, colour: 'text-crimson', delay: '0s' },
    { x: 130, y: 48, colour: 'text-glow-blue', delay: '0.8s' },
    { x: 195, y: 36, colour: 'text-crimson', delay: '1.6s' },
    { x: 330, y: 54, colour: 'text-glow-blue', delay: '2.4s' },
  ];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 top-3 h-20 w-full text-crimson/40 motion-safe:animate-write"
    >
      {[18, 36, 54, 72, 90].map((y) => (
        <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="currentColor" strokeWidth="1" />
      ))}
      {notes.map((note) => (
        <g
          key={note.x}
          className={`note-twinkle ${note.colour}`}
          style={{ animationDelay: note.delay }}
        >
          <ellipse cx={note.x} cy={note.y} rx="7" ry="5" fill="currentColor" />
          <line
            x1={note.x + 6}
            x2={note.x + 6}
            y1={note.y}
            y2={note.y - 34}
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </g>
      ))}
    </svg>
  );
}

/** Equaliser bars along the bottom edge, as on the reference design. Decorative. */
function Equaliser() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none flex h-6 justify-center gap-12 overflow-hidden px-6 opacity-60"
    >
      {Array.from({ length: 8 }, (_, group) => (
        <span
          key={group}
          className={`flex h-full items-end gap-[3px] ${group % 3 === 2 ? 'text-glow-blue' : 'text-crimson'}`}
        >
          {[0, 1, 2].map((bar) => (
            <span
              key={bar}
              className="eq-bar"
              style={{ animationDelay: `${String((group * 3 + bar) * 0.13)}s` }}
            />
          ))}
        </span>
      ))}
    </div>
  );
}
