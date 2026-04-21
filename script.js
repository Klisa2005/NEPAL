/* ============================================================
   DIGITAL BROCHURE — script.js
   ============================================================ */

'use strict';

/* ── CONFIG ─────────────────────────────────────────────────
   Add your image paths here.  The label is shown in the
   counter and used as the downloaded filename.
   ---------------------------------------------------------- */
const SLIDES = [
  { src: 'images/1.jpg', label: 'Page 1' },
  { src: 'images/2.jpg', label: 'Page 2' },
  { src: 'images/3.jpg', label: 'Page 3' },
  { src: 'images/4.jpg', label: 'Page 4' },
];

/* ── STATE ── */
let current = 0;
let isScrolling = false;      // debounce flag
let touchStartY = 0;

/* ── DOM REFS ── */
const slideshow    = document.getElementById('slideshow');
const counterEl    = document.getElementById('slide-counter');
const dotsEl       = document.getElementById('dots');
const btnPrev      = document.getElementById('btn-prev');
const btnNext      = document.getElementById('btn-next');
const btnDownload  = document.getElementById('btn-download');
const btnPrint     = document.getElementById('btn-print');
const toastEl      = document.getElementById('toast');

/* ==============================================================
   BUILD SLIDES DYNAMICALLY
   ============================================================== */
function buildSlides() {
  SLIDES.forEach((slide, i) => {
    const section = document.createElement('section');
    section.className = 'slide';
    section.dataset.index = i;
    section.setAttribute('aria-label', slide.label);

    /* Loading spinner */
    const loader = document.createElement('div');
    loader.className = 'slide-loader';
    loader.innerHTML = '<div class="spinner"></div>';
    section.appendChild(loader);

    /* Image */
    const img = document.createElement('img');
    img.alt   = slide.label;
    img.src   = slide.src;

    img.onload = () => {
      loader.classList.add('hidden');
      // Wait one frame so CSS transition plays
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (parseInt(section.dataset.index) === current) {
          section.classList.add('visible');
        }
      }));
    };

    img.onerror = () => {
      loader.innerHTML = `
        <div style="text-align:center;color:rgba(255,255,255,.4);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <p style="margin-top:10px;font-size:12px;font-family:inherit;">${slide.label}</p>
        </div>`;
    };

    section.appendChild(img);
    slideshow.appendChild(section);
  });

  buildDots();
  updateUI();
}

/* ==============================================================
   DOT INDICATORS
   ============================================================== */
function buildDots() {
  dotsEl.innerHTML = '';
  SLIDES.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'dot';
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(dot);
  });
}

/* ==============================================================
   NAVIGATION
   ============================================================== */
function goTo(index, smooth = true) {
  if (index < 0 || index >= SLIDES.length) return;

  /* Fade out current */
  const slides = slideshow.querySelectorAll('.slide');
  slides[current].classList.remove('visible');

  current = index;

  /* Scroll */
  slides[current].scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });

  /* Fade in after a short delay (let scroll complete) */
  setTimeout(() => {
    slides[current].classList.add('visible');
  }, smooth ? 350 : 50);

  updateUI();
}

function prev() { goTo(current - 1); }
function next() { goTo(current + 1); }

/* ==============================================================
   UI UPDATE
   ============================================================== */
function updateUI() {
  /* Counter */
  counterEl.textContent = `${current + 1} / ${SLIDES.length}`;

  /* Dots */
  dotsEl.querySelectorAll('.dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === current);
  });

  /* Nav button states */
  btnPrev.disabled = current === 0;
  btnNext.disabled = current === SLIDES.length - 1;
  btnPrev.style.opacity = current === 0 ? '0.38' : '1';
  btnNext.style.opacity = current === SLIDES.length - 1 ? '0.38' : '1';
}

/* ==============================================================
   INTERSECTION OBSERVER — passive slide detection on real scroll
   ============================================================== */
function setupObserver() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
        const idx = parseInt(entry.target.dataset.index);
        if (idx !== current) {
          /* Remove class from old, add to new */
          slideshow.querySelectorAll('.slide').forEach(s => s.classList.remove('visible'));
          current = idx;
          entry.target.classList.add('visible');
          updateUI();
        }
      }
    });
  }, { threshold: 0.55 });

  slideshow.querySelectorAll('.slide').forEach(s => observer.observe(s));
}

/* ==============================================================
   KEYBOARD NAVIGATION
   ============================================================== */
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
    e.preventDefault();
    next();
  }
  if (e.key === 'ArrowUp' || e.key === 'PageUp') {
    e.preventDefault();
    prev();
  }
  if (e.key === 'Home') { e.preventDefault(); goTo(0); }
  if (e.key === 'End')  { e.preventDefault(); goTo(SLIDES.length - 1); }
});

/* ==============================================================
   MOUSE WHEEL — debounced snap
   ============================================================== */
slideshow.addEventListener('wheel', e => {
  e.preventDefault();
  if (isScrolling) return;

  isScrolling = true;
  if (e.deltaY > 0) next();
  else              prev();

  setTimeout(() => { isScrolling = false; }, 900);
}, { passive: false });

/* ==============================================================
   TOUCH / SWIPE
   ============================================================== */
slideshow.addEventListener('touchstart', e => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

slideshow.addEventListener('touchend', e => {
  const delta = touchStartY - e.changedTouches[0].clientY;
  if (Math.abs(delta) < 40) return;      // ignore tiny taps

  if (delta > 0) next();
  else           prev();
}, { passive: true });

/* ==============================================================
   DOWNLOAD CURRENT SLIDE
   ============================================================== */
btnDownload.addEventListener('click', async () => {
  const slide = SLIDES[current];
  const url   = slide.src;
  const name  = url.split('/').pop() || `slide-${current + 1}.jpg`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('fetch failed');
    const blob = await response.blob();
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(`📥 Downloading ${name}`);
  } catch {
    /* Fallback — works for same-origin */
    const a    = document.createElement('a');
    a.href     = url;
    a.download = name;
    a.target   = '_blank';
    a.click();
    showToast(`📥 Saving ${name}…`);
  }
});

/* ==============================================================
   PRINT
   ============================================================== */
btnPrint.addEventListener('click', () => {
  showToast('🖨️ Opening print dialog…');
  setTimeout(() => window.print(), 350);
});

/* ==============================================================
   TOAST
   ============================================================== */
let toastTimer;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
}

/* ==============================================================
   BUTTON WIRING
   ============================================================== */
btnPrev.addEventListener('click', prev);
btnNext.addEventListener('click', next);

/* ==============================================================
   INIT
   ============================================================== */
buildSlides();
setupObserver();

/* Show first slide */
requestAnimationFrame(() => {
  const firstSlide = slideshow.querySelector('.slide');
  if (firstSlide) firstSlide.classList.add('visible');
});