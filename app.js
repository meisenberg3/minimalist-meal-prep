document.addEventListener("DOMContentLoaded", () => {
  const screens = Array.from(document.querySelectorAll(".screen"));
  const startOverBtn = document.getElementById("startOverBtn");
  const copyLinkBtn = document.getElementById("copyLinkBtn");

  const hashToIndex = (hash) => {
    const h = (hash || "").replace("#", "").trim().toLowerCase();
    if (h === "s0") return 0;
    if (h === "s1") return 1;
    if (h === "s2") return 2;
    if (h === "s3") return 3;
    return 0;
  };

  const indexToHash = (i) => `#s${i}`;

  function goTo(i, pushHash = true) {
    screens.forEach(s => s.classList.remove("active"));
    const target = screens[i] || screens[0];
    target.classList.add("active");

    // show Start over only after leaving home
    if (startOverBtn) startOverBtn.style.visibility = (i === 0) ? "hidden" : "visible";

    if (pushHash) {
      const newHash = indexToHash(i);
      if (location.hash !== newHash) history.replaceState(null, "", newHash);
    }
  }

  // initial state from hash
  goTo(hashToIndex(location.hash), false);

  // click navigation: any element with data-goto
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-goto]");
    if (!el) return;

    const idx = Number(el.dataset.goto);
    if (Number.isNaN(idx)) return;
    goTo(idx, true);
  });

  // hash navigation (back/forward)
  window.addEventListener("hashchange", () => {
    goTo(hashToIndex(location.hash), false);
  });

  // copy link button
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        copyLinkBtn.textContent = "Copied";
        setTimeout(() => (copyLinkBtn.textContent = "Copy link"), 1200);
      } catch {
        // fallback
        const temp = document.createElement("textarea");
        temp.value = location.href;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        temp.remove();
        copyLinkBtn.textContent = "Copied";
        setTimeout(() => (copyLinkBtn.textContent = "Copy link"), 1200);
      }
    });
  }
});
