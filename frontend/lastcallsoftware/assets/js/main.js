(function () {
  "use strict";

  // Footer year
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav toggle
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Scroll reveal for service cards
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    reveals.forEach(function (el) { observer.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in-view"); });
  }

  // Contact form submission
  var form = document.getElementById("contact-form");
  if (!form) return;

  var loadingEl = form.querySelector(".loading");
  var errorEl = form.querySelector(".error-message");
  var sentEl = form.querySelector(".sent-message");
  var backendBase = (document.querySelector('meta[name="backend-base-url"]') || {}).content || "";

  function showStatus(el) {
    [loadingEl, errorEl, sentEl].forEach(function (node) {
      if (node) node.style.display = "none";
    });
    if (el) el.style.display = "block";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    showStatus(loadingEl);

    var data = new FormData(form);
    var payload = Object.fromEntries(data.entries());

    fetch(backendBase + "/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed");
        showStatus(sentEl);
        form.reset();
      })
      .catch(function () {
        showStatus(errorEl);
      });
  });
})();
