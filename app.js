(function(){
  const screens = Array.from(document.querySelectorAll(".screen"));
  const handleBtn = document.getElementById("handleBtn");
  const resetBtn = document.getElementById("resetBtn");
  const againBtn = document.getElementById("againBtn");
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const backToMealsBtn = document.getElementById("backToMealsBtn");

  // Hardcoded "tonight" rotation (still disposable)
  const meals = [
    { title: "Chicken & rice bowl", meta: "~12 minutes • one pan • low cleanup" },
    { title: "Egg & veggie scramble", meta: "~10 minutes • one pan • low cleanup" },
    { title: "Yogurt + fruit + crunch", meta: "~2 minutes • no cook • zero effort" }
  ];

  function pickTonight(){
    const day = new Date().getDay(); // 0-6
    return meals[day % meals.length];
  }

  function hydrateTonight(){
    const tonight = pickTonight();
    const mealTitle = document.getElementById("tonightMeal");
    const mealMeta = document.getElementById("tonightMeta");
    if(mealTitle) mealTitle.textContent = tonight.title;
    if(mealMeta) mealMeta.textContent = tonight.meta;
  }

  function setResetVisibility(screenIndex){
    if(!resetBtn) return;
    resetBtn.hidden = (screenIndex === 0);
  }

  function goTo(i){
    screens.forEach(s => s.classList.remove("active"));
    const next = screens.find(s => Number(s.dataset.screen) === i);
    if(next) next.classList.add("active");

    setResetVisibility(i);

    // keep hash for shareability, but default return still starts fresh
    window.location.hash = `#s${i}`;
  }

  // Primary action always works the same
  function handleMyFood(){
    hydrateTonight();
    goTo(1);
  }

  // Wiring
  handleBtn?.addEventListener("click", handleMyFood);
  againBtn?.addEventListener("click", handleMyFood);

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-next]");
    if(!btn) return;
    const next = Number(btn.getAttribute("data-next"));
    if(!Number.isNaN(next)) goTo(next);
  });

  resetBtn?.addEventListener("click", () => goTo(0));

  backToMealsBtn?.addEventListener("click", () => goTo(2));

  copyLinkBtn?.addEventListener("click", async () => {
    try{
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      const prev = copyLinkBtn.textContent;
      copyLinkBtn.textContent = "Copied";
      setTimeout(() => (copyLinkBtn.textContent = prev), 1100);
    }catch{
      alert("Couldn’t copy. You can manually copy the URL from the address bar.");
    }
  });

  // Optional: allow space/enter to run primary action on landing (less thinking)
  document.addEventListener("keydown", (e) => {
    const active = screens.find(s => s.classList.contains("active"));
    if(!active) return;
    const i = Number(active.dataset.screen);

    if(i === 0 && (e.key === "Enter" || e.key === " ")){
      e.preventDefault();
      handleMyFood();
    }

    if(e.key === "Escape"){
      goTo(0);
    }
  });

  // Boot (respect hash for share links; otherwise always start calm at 0)
  function boot(){
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

  boot();
})();
