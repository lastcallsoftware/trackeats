(function() {
  "use strict";

  function getBackendBaseUrl() {
    const configuredBaseUrl = document
      .querySelector('meta[name="backend-base-url"]')
      ?.getAttribute('content')
      ?.trim();

    if (!configuredBaseUrl) {
      throw new Error('Missing required backend-base-url meta tag content. Contact form cannot be submitted.');
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(configuredBaseUrl);
    } catch (_) {
      throw new Error('Invalid backend-base-url meta tag content. Expected an absolute URL.');
    }

    return parsedUrl.href.replace(/\/$/, '');
  }

  /**
   * Header toggle
   */
  const headerToggleBtn = document.querySelector('.header-toggle');

  function headerToggle() {
    document.querySelector('#header').classList.toggle('header-show');
    headerToggleBtn.classList.toggle('bi-list');
    headerToggleBtn.classList.toggle('bi-x');
  }
  headerToggleBtn.addEventListener('click', headerToggle);

  /**
   * Hide mobile nav on same-page/hash links
   */
  document.querySelectorAll('#navmenu a').forEach(navmenu => {
    navmenu.addEventListener('click', () => {
      if (document.querySelector('.header-show')) {
        headerToggle();
      }
    });

  });

  /**
   * Toggle mobile nav dropdowns
   */
  document.querySelectorAll('.navmenu .toggle-dropdown').forEach(navmenu => {
    navmenu.addEventListener('click', function(e) {
      e.preventDefault();
      this.parentNode.classList.toggle('active');
      this.parentNode.nextElementSibling.classList.toggle('dropdown-active');
      e.stopImmediatePropagation();
    });
  });

  /**
   * Preloader
   */
  const preloader = document.querySelector('#preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      preloader.remove();
    });
  }

  /**
   * Scroll top button
   */
  let scrollTop = document.querySelector('.scroll-top');

  function toggleScrollTop() {
    if (scrollTop) {
      window.scrollY > 100 ? scrollTop.classList.add('active') : scrollTop.classList.remove('active');
    }
  }
  scrollTop.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });

  window.addEventListener('load', toggleScrollTop);
  document.addEventListener('scroll', toggleScrollTop);

  /**
   * Animation on scroll function and init
   */
  function aosInit() {
    if (typeof AOS === 'undefined') {
      console.warn('AOS library is not available. Check assets/vendor/aos/aos.js loading.');
      return;
    }

    AOS.init({
      duration: 600,
      easing: 'ease-in-out',
      once: true,
      mirror: false
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(aosInit, 0);
  }

  document.addEventListener('DOMContentLoaded', aosInit);
  window.addEventListener('load', aosInit);

  /**
   * Init typed.js
   */
  const selectTyped = document.querySelector('.typed');
  if (selectTyped) {
    let typed_strings = selectTyped.getAttribute('data-typed-items');
    typed_strings = typed_strings.split(',');
    new Typed('.typed', {
      strings: typed_strings,
      loop: true,
      typeSpeed: 100,
      backSpeed: 50,
      backDelay: 2000
    });
  }

  /**
   * Animate the skills items on reveal
   */
  let skillsAnimation = document.querySelectorAll('.skills-animation');
  skillsAnimation.forEach((item) => {
    new Waypoint({
      element: item,
      offset: '80%',
      handler: function(direction) {
        let progress = item.querySelectorAll('.progress .progress-bar');
        progress.forEach(el => {
          el.style.width = el.getAttribute('aria-valuenow') + '%';
        });
      }
    });
  });

  /**
   * Initiate glightbox
   */
  const glightbox = GLightbox({
    selector: '.glightbox'
  });

  const glightboxMobile = GLightbox({
    selector: '.glightbox-mobile',
    onOpen: () => {
      document.body.classList.add('trackeats-mobile-lightbox-open');
    },
    onClose: () => {
      document.body.classList.remove('trackeats-mobile-lightbox-open');
    }
  });

  /**
   * Init isotope layout and filters
   */
  document.querySelectorAll('.isotope-layout').forEach(function(isotopeItem) {
    let layout = isotopeItem.getAttribute('data-layout') ?? 'masonry';
    let filter = isotopeItem.getAttribute('data-default-filter') ?? '*';
    let sort = isotopeItem.getAttribute('data-sort') ?? 'original-order';

    let initIsotope;
    imagesLoaded(isotopeItem.querySelector('.isotope-container'), function() {
      initIsotope = new Isotope(isotopeItem.querySelector('.isotope-container'), {
        itemSelector: '.isotope-item',
        layoutMode: layout,
        filter: filter,
        sortBy: sort
      });
    });

    isotopeItem.querySelectorAll('.isotope-filters li').forEach(function(filters) {
      filters.addEventListener('click', function() {
        isotopeItem.querySelector('.isotope-filters .filter-active').classList.remove('filter-active');
        this.classList.add('filter-active');
        initIsotope.arrange({
          filter: this.getAttribute('data-filter')
        });
        if (typeof aosInit === 'function') {
          aosInit();
        }
      }, false);
    });

  });

  /**
   * Init swiper sliders
   */
  function initSwiper() {
    document.querySelectorAll(".init-swiper").forEach(function(swiperElement) {
      let config = JSON.parse(
        swiperElement.querySelector(".swiper-config").innerHTML.trim()
      );

      if (swiperElement.classList.contains("swiper-tab")) {
        initSwiperWithCustomPagination(swiperElement, config);
      } else {
        new Swiper(swiperElement, config);
      }
    });
  }

  window.addEventListener("load", initSwiper);

  /**
   * Correct scrolling position upon page load for URLs containing hash links.
   */
  window.addEventListener('load', function(e) {
    if (window.location.hash) {
      if (document.querySelector(window.location.hash)) {
        setTimeout(() => {
          let section = document.querySelector(window.location.hash);
          let scrollMarginTop = getComputedStyle(section).scrollMarginTop;
          window.scrollTo({
            top: section.offsetTop - parseInt(scrollMarginTop),
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  });

  /**
   * Navmenu Scrollspy
   */
  let navmenulinks = document.querySelectorAll('.navmenu a');

  function navmenuScrollspy() {
    navmenulinks.forEach(navmenulink => {
      if (!navmenulink.hash) return;
      let section = document.querySelector(navmenulink.hash);
      if (!section) return;
      let position = window.scrollY + 200;
      if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
        document.querySelectorAll('.navmenu a.active').forEach(link => link.classList.remove('active'));
        navmenulink.classList.add('active');
      } else {
        navmenulink.classList.remove('active');
      }
    })
  }
  window.addEventListener('load', navmenuScrollspy);
  document.addEventListener('scroll', navmenuScrollspy);

  /**
   * Contact form submission
   */
  const contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    let contactApiUrl = '';
    try {
      contactApiUrl = `${getBackendBaseUrl()}/api/contact`;
    } catch (error) {
      const errorEl = contactForm.querySelector('.error-message');
      if (errorEl) {
        errorEl.textContent = error instanceof Error ? error.message : 'Contact form configuration error.';
        errorEl.style.display = 'block';
      }
      console.error(error);
      return;
    }

    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const form = event.currentTarget;
      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      const nameInput = form.querySelector('#name-field');
      const emailInput = form.querySelector('#email-field');
      const subjectInput = form.querySelector('#subject-field');
      const messageInput = form.querySelector('#message-field');
      const loadingEl = form.querySelector('.loading');
      const errorEl = form.querySelector('.error-message');
      const sentEl = form.querySelector('.sent-message');
      const submitButton = form.querySelector('button[type="submit"]');

      if (!(nameInput instanceof HTMLInputElement)
        || !(emailInput instanceof HTMLInputElement)
        || !(subjectInput instanceof HTMLInputElement)
        || !(messageInput instanceof HTMLTextAreaElement)) {
        return;
      }

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const subject = subjectInput.value.trim();
      const message = messageInput.value.trim();

      if (!name || !email || !subject || !message) {
        if (errorEl) {
          errorEl.textContent = 'Please provide your name, email, subject, and message.';
          errorEl.style.display = 'block';
        }
        if (sentEl) {
          sentEl.style.display = 'none';
        }
        return;
      }

      if (!emailInput.checkValidity()) {
        if (errorEl) {
          errorEl.textContent = 'Please provide a valid email address.';
          errorEl.style.display = 'block';
        }
        if (sentEl) {
          sentEl.style.display = 'none';
        }
        return;
      }

      if (loadingEl) {
        loadingEl.style.display = 'block';
      }
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
      }
      if (sentEl) {
        sentEl.style.display = 'none';
      }
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
      }

      try {
        const response = await fetch(contactApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            email,
            subject,
            message,
          }),
        });

        if (!response.ok) {
          let backendMessage = '';
          try {
            const payload = await response.json();
            if (payload && typeof payload.msg === 'string') {
              backendMessage = payload.msg;
            }
          } catch (_) {
            backendMessage = '';
          }
          throw new Error(backendMessage || `Request failed with status ${response.status}`);
        }

        form.reset();
        if (sentEl) {
          sentEl.style.display = 'block';
        }
      } catch (error) {
        if (errorEl) {
          errorEl.textContent = error instanceof Error ? error.message : 'Unable to send message right now.';
          errorEl.style.display = 'block';
        }
      } finally {
        if (loadingEl) {
          loadingEl.style.display = 'none';
        }
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
        }
      }
    });
  }

})();