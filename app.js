(function(){
  const screens = Array.from(document.querySelectorAll(".screen"));
  const handleBtn = document.getElementById("handleBtn");
  const seeHowBtn = document.getElementById("seeHowBtn");
  const resetBtn = document.getElementById("resetBtn");
  const restartBtn = document.getElementById("restartBtn");
  const copyLinkBtn = document.getElementById("copyLinkBtn");

  // Hardcoded "tonight" rotation (still disposable)
  const meals = [
    { title: "Chicken & rice bowl", meta: "~12 minutes • one pan • no thinking" },
    { title: "Egg & veggie scramble", meta: "~10 minutes • one pan • low cleanup" },
    { title: "Yogurt + fruit + crunch", meta: "~2 minutes • no cook • zero effort" }
  ];

  function pickTonight(){
    const day = new Date().getDay(); // 0-6
    return meals[day % meals.length];
  }

  function goTo(i){
    screens.forEach(s => s.classList.remove("active"));
    const next = screens.find(s => Number(s.dataset.screen) === i);
    if(next) next.classList.add("active");

    // update hash for shareability
    window.location.hash = `#s${i}`;
  }

  function hydrateTonight(){
    const tonight = pickTonight();
    const mealTitle = document.getElementById("tonightMeal");
    const mealMeta = document.querySelector(".mealMeta");
    if(mealTitle) mealTitle.textContent = tonight.title;
    if(mealMeta) mealMeta.textContent = tonight.meta;
  }

  // Button wiring
  handleBtn?.addEventListener("click", () => {
    hydrateTonight();
    goTo(1);
  });

  seeHowBtn?.addEventListener("click", () => {
    hydrateTonight();
    goTo(1);
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-next]");
    if(!btn) return;
    const next = Number(btn.getAttribute("data-next"));
    goTo(next);
  });

  resetBtn?.addEventListener("click", () => goTo(0));
  restartBtn?.addEventListener("click", () => goTo(0));

  copyLinkBtn?.addEventListener("click", async () => {
    try{
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      copyLinkBtn.textContent = "Copied";
      setTimeout(() => (copyLinkBtn.textContent = "Copy share link"), 1100);
    }catch{
      alert("Couldn’t copy. You can manually copy the URL from the address bar.");
    }
  });

  // Load screen from hash if present
  function bootFromHash(){
    const m = window.location.hash.match(/#s(\d+)/);
    if(m){
      const i = Number(m[1]);
      if(!Number.isNaN(i) && i >= 0 && i <= 3){
        hydrateTonight();
        goTo(i);
        return;
      }
    }
    goTo(0);
  }

  bootFromHash();
})();
