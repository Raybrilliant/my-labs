/**
 * Global scroll-triggered reveals for static Astro markup.
 * Opt in per element with data attributes:
 *
 *   data-reveal            -> fade + rise
 *   data-reveal="clip"     -> clip-path wipe (put inside overflow-hidden wrapper)
 *   data-reveal-delay="0.2"
 *   data-reveal-group      -> stagger direct [data-reveal-item] children
 *
 * Initial hidden state is set in CSS (gated behind html.js and
 * prefers-reduced-motion), so content is never lost without JS.
 */
import { gsap, ScrollTrigger, prefersReducedMotion } from '../utils/gsap';

function initReveals() {
  if (prefersReducedMotion()) return;

  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    const mode = el.dataset.reveal || 'up';
    const delay = parseFloat(el.dataset.revealDelay || '0');

    if (mode === 'clip') {
      gsap.fromTo(
        el,
        { clipPath: 'inset(0 0 100% 0)', y: 36, autoAlpha: 0 },
        {
          clipPath: 'inset(0 0 -8% 0)',
          y: 0,
          autoAlpha: 1,
          duration: 0.9,
          delay,
          ease: 'power4.out',
          scrollTrigger: { trigger: el, start: 'top 85%' },
        }
      );
    } else {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 32 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          delay,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
        }
      );
    }
  });

  document.querySelectorAll<HTMLElement>('[data-reveal-group]').forEach((group) => {
    gsap.fromTo(
      group.querySelectorAll('[data-reveal-item]'),
      { autoAlpha: 0, y: 44 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.09,
        ease: 'power3.out',
        scrollTrigger: { trigger: group, start: 'top 85%' },
      }
    );
  });

  // Recalculate once fonts/images settle
  ScrollTrigger.refresh();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initReveals);
} else {
  initReveals();
}
