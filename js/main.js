/**
 * main.js — весь интерактив сайта:
 * - Мобильное меню (бургер)
 * - Карусель портфолио (свайпы, точки, ресайз)
 * - Плавное появление секций при скролле (Intersection Observer)
 */

(function() {
  'use strict';

  // ---------- МОБИЛЬНОЕ МЕНЮ ----------
  const initMobileMenu = () => {
    const toggle = document.querySelector('.mobile-toggle');
    const nav = document.querySelector('.nav');
    if (!toggle || !nav) return;

    const closeMenu = () => {
      nav.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
    };

    const openMenu = () => {
      nav.classList.add('active');
      toggle.setAttribute('aria-expanded', 'true');
    };

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      nav.classList.contains('active') ? closeMenu() : openMenu();
    });

    // Закрытие по клику вне меню
    document.addEventListener('click', (e) => {
      if (!nav.classList.contains('active')) return;
      if (!nav.contains(e.target) && !toggle.contains(e.target)) {
        closeMenu();
      }
    });

    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('active')) {
        closeMenu();
      }
    });
  };

  // ---------- КАРУСЕЛЬ ПОРТФОЛИО ----------
  class Carousel {
    constructor(element) {
      this.root = element;
      this.track = element.querySelector('[data-carousel-track]');
      this.slides = [...this.track.children];
      this.nextBtn = element.querySelector('[data-carousel-next]');
      this.prevBtn = element.querySelector('[data-carousel-prev]');
      this.dotsContainer = element.querySelector('[data-carousel-dots]');

      this.slidesPerView = this.getSlidesPerView();
      this.currentIndex = 0;
      this.totalSlides = this.slides.length;

      this.init();
      this.bindEvents();
      this.update();
    }

    getSlidesPerView() {
      const width = window.innerWidth;
      if (width < 640) return 1;
      if (width < 1024) return 2;
      return 3;
    }

    get maxIndex() {
      return Math.max(0, this.totalSlides - this.slidesPerView);
    }

    init() {
      // Создаём точки
      for (let i = 0; i <= this.maxIndex; i++) {
        const dot = document.createElement('button');
        dot.classList.add('carousel__dot');
        dot.setAttribute('aria-label', `Перейти к слайду ${i + 1}`);
        dot.addEventListener('click', () => this.goTo(i));
        this.dotsContainer.appendChild(dot);
      }
      this.dots = [...this.dotsContainer.children];
      this.updateSlideWidth();
    }

    updateSlideWidth() {
      const slideWidth = this.root.clientWidth / this.slidesPerView;
      this.slides.forEach(slide => slide.style.width = `${slideWidth}px`);
      this.track.style.width = `${slideWidth * this.totalSlides}px`;
    }

    goTo(index, smooth = true) {
      this.currentIndex = Math.max(0, Math.min(index, this.maxIndex));
      const slideWidth = this.root.clientWidth / this.slidesPerView;
      const translateX = -this.currentIndex * slideWidth;
      this.track.style.transition = smooth ? 'transform 0.4s ease-out' : 'none';
      this.track.style.transform = `translateX(${translateX}px)`;
      this.update();
    }

    next() {
      this.goTo(this.currentIndex + 1);
    }

    prev() {
      this.goTo(this.currentIndex - 1);
    }

    update() {
      if (this.prevBtn) {
        this.prevBtn.disabled = this.currentIndex === 0;
      }
      if (this.nextBtn) {
        this.nextBtn.disabled = this.currentIndex >= this.maxIndex;
      }

      this.dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === this.currentIndex);
      });
    }

    bindEvents() {
      if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.next());
      if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.prev());

      // Ресайз
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          const newSlidesPerView = this.getSlidesPerView();
          if (newSlidesPerView !== this.slidesPerView) {
            this.slidesPerView = newSlidesPerView;
            this.dotsContainer.innerHTML = '';
            this.init();
          }
          this.updateSlideWidth();
          this.goTo(this.currentIndex, false);
        }, 100);
      });

      // Свайпы (Pointer Events)
      let startX = 0;
      let currentTranslate = 0;
      let isDragging = false;

      const dragStart = (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        startX = e.clientX;
        isDragging = true;
        this.track.style.transition = 'none';
      };

      const dragMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const dx = e.clientX - startX;
        const slideWidth = this.root.clientWidth / this.slidesPerView;
        const baseTranslate = -this.currentIndex * slideWidth;
        currentTranslate = Math.max(
          -this.maxIndex * slideWidth,
          Math.min(0, baseTranslate + dx)
        );
        this.track.style.transform = `translateX(${currentTranslate}px)`;
      };

      const dragEnd = (e) => {
        if (!isDragging) return;
        isDragging = false;
        this.track.style.transition = 'transform 0.4s ease-out';
        const slideWidth = this.root.clientWidth / this.slidesPerView;
        const moved = e.clientX - startX;
        const threshold = slideWidth * 0.2;

        let newIndex = this.currentIndex;
        if (moved < -threshold && this.currentIndex < this.maxIndex) newIndex++;
        if (moved > threshold && this.currentIndex > 0) newIndex--;

        this.goTo(newIndex);
      };

      this.track.addEventListener('pointerdown', dragStart);
      this.track.addEventListener('pointermove', dragMove);
      this.track.addEventListener('pointerup', dragEnd);
      this.track.addEventListener('pointercancel', dragEnd);
      this.track.addEventListener('dragstart', (e) => e.preventDefault());
    }
  }

  // ---------- ПЛАВНОЕ ПОЯВЛЕНИЕ СЕКЦИЙ (Intersection Observer) ----------
  const initRevealSections = () => {
    // Если браузер поддерживает animation-timeline, нативный эффект уже работает — JS не нужен
    if (window.CSS && CSS.supports('animation-timeline', 'view()')) return;

    const sections = document.querySelectorAll('.about-master, .features, .services-preview, .portfolio-preview, .testimonials, .contact-cta');
    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // достаточно один раз
        }
      });
    }, { threshold: 0.15 });

    sections.forEach(section => observer.observe(section));
  };

  // ---------- ЗАПУСК ВСЕГО ----------
  const carouselElement = document.querySelector('[data-carousel]');
  if (carouselElement) new Carousel(carouselElement);

  initMobileMenu();
  initRevealSections();
})();