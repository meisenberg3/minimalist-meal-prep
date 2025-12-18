document.addEventListener("DOMContentLoaded", () => {
  const screens = Array.from(document.querySelectorAll(".screen"));
  const startOverBtn = document.getElementById("startOverBtn");
  const copyLinkBtn = document.getElementById("copyLinkBtn");

  // Minimal “Tonight” hydration (hardcoded set, consistent effort)
  const meals = [
    {
      title: "Yogurt + fruit + crunch",
      meta: "≤15 minutes • ≤2 tools • low cleanup",
      steps: ["Add yogurt", "Add fruit", "Add crunch", "Eat"],
    },
    {
      title: "Egg & veggie scramble",
      meta: "≤15 minutes • ≤2 tools • low cleanup",
      steps: ["Heat pan", "Scramble eggs", "Add veg", "Eat"],
    },
    {
      title: "Chicken & rice bowl",
      meta: "≤15 minutes • ≤2 tools • low cleanup",
      steps: ["Heat protein", "Add rice", "Add veg", "Eat"],
    },
  ];

  function pickTonight() {
    // stable rotation by day; works offline
    const d = new Date().getDay(); // 0-6
    return meals[d % meals.length];
  }

  function hydrateTonight() {
    const m = pickTonight();
    const titleEl = document.getElementById("mealTitle");
    const metaEl = document.getElementById("mealMeta");
    const doList = document.getElementById("doList");

    if (titleEl) titleEl.textContent = m.title;
    if (metaEl) metaEl.textContent = m.meta;
    if (doList) doList.innerHTML = m.steps.map(s => `<li>${s}</li>`).join("");
  }

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

    // startOver visible only off home
    if (startOverBtn) startOverBtn.style.visibility = (i === 0) ? "hidden" : "visible";

    // Keep Tonight content fresh whenever we might see it
    if (i === 1) hydrateTonight();

    if (pushHash) {
      const newHash = indexToHash(i);
      if (location.hash !== newHash) history.replaceState(null, "", newHash);
    }
  }

  // Initial screen from hash
  goTo(hashToIndex(location.hash), false);

  // Click navigation: any element with data-goto
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-goto]");
    if (!el) return;

    const idx = Number(el.dataset.goto);
    if (Number.isNaN(idx)) return;
    goTo(idx, true);
  });

  // Back/forward hash nav
  window.addEventListener("hashchange", () => {
    goTo(hashToIndex(location.hash), false);
  });

  // Copy link
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        copyLinkBtn.textContent = "Copied";
        setTimeout(() => (copyLinkBtn.textContent = "Copy link"), 1200);
      } catch {
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

  // Service worker registration (PWA/offline)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
});
