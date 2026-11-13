/* ============================================================
   Aula — Glossário
   Wires the .termo glossary popovers. Click (or Enter/Space on
   the focused <button>) toggles the definition; Escape or a
   click outside closes it. Only one term is open at a time.
   Self-contained, no dependencies — drop the <script> anywhere
   after the .termo markup (it also handles nodes added later).
   ============================================================ */
(function () {
  "use strict";

  function closeAll(except) {
    document.querySelectorAll('.termo[aria-expanded="true"]').forEach(function (t) {
      if (t !== except) {
        t.setAttribute("aria-expanded", "false");
        t.classList.remove("termo--below");
      }
    });
  }

  // Flip the popover below the term when there isn't room above.
  function place(t) {
    var pop = t.querySelector(".termo__pop");
    if (!pop) return;
    t.classList.remove("termo--below");
    var rect = t.getBoundingClientRect();
    var needed = pop.offsetHeight + 28;
    if (rect.top < needed) t.classList.add("termo--below");
  }

  document.addEventListener("click", function (e) {
    var target = e.target;
    // Don't hijack clicks while the author is editing text in the builder
    // (the .termo is just dotted-underline text there; clicking should edit).
    if (target.closest && target.closest('[contenteditable="true"]')) return;
    // clicks inside an open definition shouldn't toggle it
    if (target.closest && target.closest(".termo__pop")) return;

    var t = target.closest && target.closest(".termo");
    if (t) {
      var isOpen = t.getAttribute("aria-expanded") === "true";
      closeAll(t);
      if (isOpen) {
        t.setAttribute("aria-expanded", "false");
        t.classList.remove("termo--below");
      } else {
        t.setAttribute("aria-expanded", "true");
        place(t);
      }
      e.stopPropagation();
      return;
    }
    closeAll(null);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeAll(null);
      return;
    }
    // span[role=button] doesn't fire click on Enter/Space — do it here
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      var t = e.target.closest && e.target.closest(".termo");
      if (t) {
        e.preventDefault();
        t.click();
      }
    }
  });

  // Re-flip open popovers if the viewport changes.
  window.addEventListener(
    "resize",
    function () {
      document.querySelectorAll('.termo[aria-expanded="true"]').forEach(place);
    },
    { passive: true }
  );
})();
