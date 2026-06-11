/* ============================================================
   visual-fx.js  â  MatemÃ¡ticas Activa  â  Visual Effects Module
   7 visual enhancements in a single IIFE
   ============================================================ */
(function () {
  'use strict';

  /* -------------------------------------------------------
     1. SCROLL-REVEAL ANIMATIONS
     Fade-in / slide-up for sections when they enter viewport
  ------------------------------------------------------- */
  function initScrollReveal() {
    var targets = document.querySelectorAll(
      '.section, .sobre-mi, .banner-juegos, .hero-content, .buscador-wrap'
    );
    if (!targets.length) return;

    // Inject reveal CSS once
    var style = document.createElement('style');
    style.textContent =
      '.vfx-hidden{opacity:0;transform:translateY(36px);transition:opacity .7s cubic-bezier(.22,1,.36,1),transform .7s cubic-bezier(.22,1,.36,1)}' +
      '.vfx-visible{opacity:1;transform:translateY(0)}';
    document.head.appendChild(style);

    targets.forEach(function (el) {
      el.classList.add('vfx-hidden');
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('vfx-visible');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* -------------------------------------------------------
     2. ANIMATED STAT COUNTERS
     Numbers count up from 0 when visible
  ------------------------------------------------------- */
  function initCounters() {
    var stats = document.querySelectorAll('.hero-stat strong');
    if (!stats.length) return;

    var counted = false;
    var observer = new IntersectionObserver(
      function (entries) {
        if (counted) return;
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          counted = true;
          animateCounters();
          observer.disconnect();
        });
      },
      { threshold: 0.5 }
    );

    var wrap =
      document.querySelector('.hero-stats') ||
      stats[0].parentElement;
    observer.observe(wrap);
  }

  function animateCounters() {
    var stats = document.querySelectorAll('.hero-stat strong');
    stats.forEach(function (el) {
      var raw = el.textContent.trim();
      // Skip emoji-only stats (like the trophy)
      var numMatch = raw.match(/(\d+)/);
      if (!numMatch) return;
      var target = parseInt(numMatch[1], 10);
      var suffix = raw.replace(/\d+/, ''); // e.g. "%" or "+"
      var duration = 1600;
      var start = performance.now();

      function tick(now) {
        var elapsed = now - start;
        var progress = Math.min(elapsed / duration, 1);
        // Ease-out quad
        var eased = 1 - (1 - progress) * (1 - progress);
        el.textContent = Math.round(target * eased) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      }

      el.textContent = '0' + suffix;
      requestAnimationFrame(tick);
    });
  }

  /* -------------------------------------------------------
     3. FLOATING MATH PARTICLES
     Animated math symbols drifting in the hero background
  ------------------------------------------------------- */
  function initParticles() {
    var hero = document.querySelector('.hero');
    if (!hero) return;

    var symbols = ['Ï', 'â', 'â«', 'Î¸', 'Î', 'â', 'Â±', 'â', 'â', 'Î±'];
    var container = document.createElement('div');
    container.className = 'vfx-particles';
    container.setAttribute('aria-hidden', 'true');

    var style = document.createElement('style');
    style.textContent =
      '.vfx-particles{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}' +
      '.vfx-p{position:absolute;font-size:clamp(14px,2.5vw,22px);opacity:0;animation:vfx-float linear infinite;color:rgba(255,255,255,.12);font-family:serif;will-change:transform,opacity}' +
      'body.dark .vfx-p{color:rgba(165,180,252,.15)}' +
      '@keyframes vfx-float{0%{opacity:0;transform:translateY(100%) rotate(0deg)}10%{opacity:1}90%{opacity:1}100%{opacity:0;transform:translateY(-120vh) rotate(360deg)}}';
    document.head.appendChild(style);

    for (var i = 0; i < 18; i++) {
      var span = document.createElement('span');
      span.className = 'vfx-p';
      span.textContent = symbols[i % symbols.length];
      span.style.left = Math.random() * 100 + '%';
      span.style.animationDuration = (12 + Math.random() * 16) + 's';
      span.style.animationDelay = (Math.random() * 14) + 's';
      span.style.fontSize = (14 + Math.random() * 12) + 'px';
      container.appendChild(span);
    }

    hero.style.position = 'relative';
    hero.insertBefore(container, hero.firstChild);
  }

  /* -------------------------------------------------------
     4. GLOWING CTA BUTTONS
     Pulsing glow animation on hero CTA buttons
  ------------------------------------------------------- */
  function initGlowCTA() {
    var style = document.createElement('style');
    style.textContent =
      '@keyframes vfx-glow{0%,100%{box-shadow:0 4px 18px rgba(37,99,235,.35)}50%{box-shadow:0 4px 30px rgba(37,99,235,.6),0 0 60px rgba(124,58,237,.25)}}' +
      '.btn-hero-main{animation:vfx-glow 2.5s ease-in-out infinite}' +
      '.btn-hero-main:hover{animation:none;box-shadow:0 8px 32px rgba(37,99,235,.5)}';
    document.head.appendChild(style);
  }

  /* -------------------------------------------------------
     5. SCROLL PROGRESS BAR
     Thin gradient bar at page top showing scroll position
  ------------------------------------------------------- */
  function initProgressBar() {
    var bar = document.createElement('div');
    bar.id = 'vfx-progress';
    var style = document.createElement('style');
    style.textContent =
      '#vfx-progress{position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,#2563eb,#7c3aed,#dc2626);width:0;z-index:99999;transition:width .1s linear;pointer-events:none}';
    document.head.appendChild(style);
    document.body.appendChild(bar);

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var scrollTop = window.scrollY || document.documentElement.scrollTop;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = docHeight > 0 ? ((scrollTop / docHeight) * 100) + '%' : '0';
        ticking = false;
      });
    }, { passive: true });
  }

  /* -------------------------------------------------------
     6. BACK-TO-TOP BUTTON
     Appears on scroll, smooth scroll to top
  ------------------------------------------------------- */
  function initBackToTop() {
    var btn = document.createElement('button');
    btn.id = 'vfx-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Volver arriba');
    btn.innerHTML = '&uarr;';

    var style = document.createElement('style');
    style.textContent =
      '#vfx-top{position:fixed;bottom:28px;right:28px;z-index:9998;width:46px;height:46px;border-radius:50%;border:none;cursor:pointer;font-size:20px;font-weight:700;color:white;background:linear-gradient(135deg,#2563eb,#7c3aed);box-shadow:0 4px 16px rgba(37,99,235,.35);opacity:0;visibility:hidden;transform:translateY(12px);transition:opacity .3s,visibility .3s,transform .3s,background .3s}' +
      '#vfx-top.vfx-show{opacity:1;visibility:visible;transform:translateY(0)}' +
      '#vfx-top:hover{background:linear-gradient(135deg,#1d4ed8,#6d28d9);transform:translateY(-2px);box-shadow:0 6px 24px rgba(37,99,235,.45)}';
    document.head.appendChild(style);
    document.body.appendChild(btn);

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        if (window.scrollY > 500) {
          btn.classList.add('vfx-show');
        } else {
          btn.classList.remove('vfx-show');
        }
        ticking = false;
      });
    }, { passive: true });
  }

  /* -------------------------------------------------------
     7. TESTIMONIAL CAROUSEL
     Auto-rotating testimonials with dots and pause on hover
  ------------------------------------------------------- */
  function initCarousel() {
    var grid = document.getElementById('testimonios-grid');
    if (!grid) return;

    var cards = grid.querySelectorAll('.testimonio-card');
    if (cards.length < 2) return;

    // Inject carousel CSS
    var style = document.createElement('style');
    style.textContent =
      '.vfx-carousel{position:relative;overflow:hidden;max-width:700px;margin:0 auto}' +
      '.vfx-carousel-track{display:flex;transition:transform .5s cubic-bezier(.22,1,.36,1)}' +
      '.vfx-carousel-slide{min-width:100%;box-sizing:border-box;padding:0 12px}' +
      '.vfx-carousel-slide .testimonio-card{margin:0;height:100%}' +
      '.vfx-dots{display:flex;justify-content:center;gap:8px;margin-top:20px}' +
      '.vfx-dot{width:10px;height:10px;border-radius:50%;border:2px solid #cbd5e1;background:none;cursor:pointer;padding:0;transition:all .3s}' +
      '.vfx-dot.active{background:#2563eb;border-color:#2563eb;transform:scale(1.2)}' +
      'body.dark .vfx-dot{border-color:#475569}' +
      'body.dark .vfx-dot.active{background:#818cf8;border-color:#818cf8}' +
      '.vfx-carousel-nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.9);border:1px solid #e2e8f0;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all .2s;z-index:2;padding:0;color:#334155}' +
      '.vfx-carousel-nav:hover{background:white;box-shadow:0 4px 12px rgba(0,0,0,.12)}' +
      'body.dark .vfx-carousel-nav{background:rgba(30,41,59,.9);border-color:#475569;color:#e2e8f0}' +
      'body.dark .vfx-carousel-nav:hover{background:#334155}' +
      '.vfx-prev{left:-4px}' +
      '.vfx-next{right:-4px}' +
      '@media(max-width:768px){.vfx-prev{left:2px}.vfx-next{right:2px}.vfx-carousel-nav{width:32px;height:32px;font-size:14px}}';
    document.head.appendChild(style);

    // Build carousel structure
    var wrapper = document.createElement('div');
    wrapper.className = 'vfx-carousel';

    var track = document.createElement('div');
    track.className = 'vfx-carousel-track';

    var clones = [];
    cards.forEach(function (card) {
      var slide = document.createElement('div');
      slide.className = 'vfx-carousel-slide';
      slide.appendChild(card.cloneNode(true));
      track.appendChild(slide);
      clones.push(slide);
    });

    wrapper.appendChild(track);

    // Navigation arrows
    var prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'vfx-carousel-nav vfx-prev';
    prevBtn.innerHTML = '&#8249;';
    prevBtn.setAttribute('aria-label', 'Anterior');

    var nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'vfx-carousel-nav vfx-next';
    nextBtn.innerHTML = '&#8250;';
    nextBtn.setAttribute('aria-label', 'Siguiente');

    wrapper.appendChild(prevBtn);
    wrapper.appendChild(nextBtn);

    // Dots
    var dotsWrap = document.createElement('div');
    dotsWrap.className = 'vfx-dots';
    var dots = [];
    for (var d = 0; d < clones.length; d++) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'vfx-dot' + (d === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Testimonio ' + (d + 1));
      dot.dataset.index = d;
      dotsWrap.appendChild(dot);
      dots.push(dot);
    }

    // Replace grid content
    grid.innerHTML = '';
    grid.style.display = 'block';
    grid.appendChild(wrapper);
    grid.appendChild(dotsWrap);

    // Carousel logic
    var current = 0;
    var total = clones.length;
    var paused = false;

    function goTo(idx) {
      current = ((idx % total) + total) % total;
      track.style.transform = 'translateX(-' + (current * 100) + '%)';
      dots.forEach(function (d, i) {
        d.classList.toggle('active', i === current);
      });
    }

    prevBtn.addEventListener('click', function () { goTo(current - 1); });
    nextBtn.addEventListener('click', function () { goTo(current + 1); });

    dotsWrap.addEventListener('click', function (e) {
      if (e.target.classList.contains('vfx-dot')) {
        goTo(parseInt(e.target.dataset.index, 10));
      }
    });

    // Auto-rotate
    var interval = setInterval(function () {
      if (!paused) goTo(current + 1);
    }, 5000);

    wrapper.addEventListener('mouseenter', function () { paused = true; });
    wrapper.addEventListener('mouseleave', function () { paused = false; });

    // Touch swipe support
    var touchStartX = 0;
    wrapper.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].clientX;
      paused = true;
    }, { passive: true });

    wrapper.addEventListener('touchend', function (e) {
      var diff = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) > 50) {
        goTo(diff > 0 ? current - 1 : current + 1);
      }
      paused = false;
    }, { passive: true });
  }

  /* -------------------------------------------------------
     INIT â Run all effects on DOMContentLoaded
  ------------------------------------------------------- */
  function init() {
    initProgressBar();
    initBackToTop();
    initGlowCTA();
    initParticles();
    initCarousel();
    initCounters();
    // Scroll reveal last so elements are positioned
    requestAnimationFrame(function () {
      initScrollReveal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.MA_VISUAL_FX = { version: '1.0' };
})();
