document.addEventListener("DOMContentLoaded", () => {
  const screens = Array.from(document.querySelectorAll(".screen"));
  const startOverBtn = document.getElementById("startOverBtn");

  function goTo(i) {
    screens.forEach(s => s.classList.remove("active"));
    const target = screens[i];
    if (target) target.classList.add("active");
    if (startOverBtn) startOverBtn.hidden = (i === 0);
  }

  // Universal navigation: any element with data-goto works
  document.addEventListener("click", (e) => {
    const gotoEl = e.target.closest("[data-goto]");
    if (gotoEl) {
      const idx = Number(gotoEl.dataset.goto);
      if (!Number.isNaN(idx)) goTo(idx);
      return;
    }

    // Start over button
    const so = e.target.closest("#startOverBtn");
    if (so) goTo(0);
  });

  // Ensure we start on screen 0
  goTo(0);
});
