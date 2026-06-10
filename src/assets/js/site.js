/* WI-PF1 — progressive enhancement only. Content works with JS disabled. */
(function () {
  "use strict";
  var rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- mobile nav ---- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("primary-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.getAttribute("data-open") === "true";
      nav.setAttribute("data-open", String(!open));
      toggle.setAttribute("aria-expanded", String(!open));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.setAttribute("data-open", "false");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---- calibration reveal ---- */
  var cals = Array.prototype.slice.call(document.querySelectorAll("[data-cal]"));
  var regs = Array.prototype.slice.call(document.querySelectorAll(".reg"));
  if (rm || !("IntersectionObserver" in window)) {
    cals.forEach(function (el) { el.classList.add("in"); });
    regs.forEach(function (el) { el.classList.add("in"); });
  } else {
    regs.forEach(function (el, i) { setTimeout(function () { el.classList.add("in"); }, 120 + i * 90); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
    cals.forEach(function (el) { io.observe(el); });
    cals.slice(0, 5).forEach(function (el, i) { setTimeout(function () { el.classList.add("in"); }, 180 + i * 110); });
  }

  /* ---- capability map (reads descriptions from inline data attributes) ---- */
  var nodes = Array.prototype.slice.call(document.querySelectorAll(".node"));
  if (nodes.length) {
    var traces = Array.prototype.slice.call(document.querySelectorAll(".trace"));
    var bind = {
      k: document.querySelector("[data-bind=k]"),
      h: document.querySelector("[data-bind=h]"),
      p: document.querySelector("[data-bind=p]")
    };
    var activate = function (node) {
      if (!bind.k || !node) return;
      var key = node.getAttribute("data-key");
      bind.k.textContent = node.getAttribute("data-code");
      bind.h.textContent = node.getAttribute("data-title");
      bind.p.textContent = node.getAttribute("data-body");
      nodes.forEach(function (n) { n.classList.toggle("on", n === node); });
      traces.forEach(function (t) { t.classList.toggle("on", t.getAttribute("data-for") === key); });
    };
    nodes.forEach(function (n) {
      n.addEventListener("mouseenter", function () { activate(n); });
      n.addEventListener("focus", function () { activate(n); });
      n.addEventListener("click", function () { activate(n); });
      n.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(n); }
      });
    });
  }
})();
