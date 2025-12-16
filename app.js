(function(){
  const screens = Array.from(document.querySelectorAll(".screen"));
  const primaryHandleBtn = document.getElementById("primaryHandleBtn");
  const startOverBtn = document.getElementById("startOverBtn");
  const copyLinkBtn = document.getElementById("copyLinkBtn");

  // Invisible constraint enforcement: <=15 minutes + <=2 tools
  // (We don't explain it. We just keep the UI consistent.)
  const meals = [
    {
      title: "Chicken & rice bowl",
      meta: "≤15 minutes • ≤2 tools • low cleanup",
      steps: ["Heat protein", "Add rice", "Throw in veg", "Eat"],
      tools: ["Pan", "Bowl"],
      minutes: 12
    },
    {
      title: "Egg & veggie scramble",
      meta: "≤15 minutes • ≤2 tools • low cleanup",
      steps: ["Heat pan", "Scramble eggs", "Add veg", "Eat"],
      tools: ["Pan", "Plate"],
      minutes: 10
    },
    {
      title: "Yogurt + fruit + crunch",
      meta: "≤15 minutes • ≤2 tools • low cleanup",
      steps: ["Add yogurt", "Add fruit", "Add crunch", "Eat"],
      tools: ["Bowl", "Spoon"],
      minutes: 2
    }
  ];

  function pickTonight(){
    const day = new Date().getDay(); // 0-6
    return meals[day % meals.length];
  }

  function hydrateTonight(){
    const tonight = pickTonight();

    const mealTitle = document.getElementById("tonightMeal");
    const mealMeta  = document.getElementById("tonightMeta");

    if(mealTitle) mealTitle.textContent = tonight.title;
    if(mealMeta)  mealMeta.textContent  = tonight.meta;

    // Keep "Do this" aligned with tonight (non-essential, but consistent)
    const doList = document.querySelectorAll('[data-screen="1"] .miniList')[0];
    if(doList){
      doList.innerHTML = tonight.steps.map(s => `<li>${s}</li>`).join("");
    }

    // (Not shown, but we enforce constraints by choosing meals that comply.)
    // If you add meals later, keep: minutes <= 15 and tools.length <= 2.
  }

  function setStartOverVisibility(screenIndex){
    if(!startOverBtn) return;
    startOverBtn.hidden = (screenIndex === 0);
  }

  function goTo(i){
    screens.forEach(s => s.classList.remove("active"));
    const next = screens.find(s => Number(s.dataset.screen) === i);
    if(next) next.classList.add("active");

    setStartOverVisibility(i);

    // Keep shareable hash, but return behavior stays calm
    window.location.hash = `#s${i}`;
  }

  function handleMyFood(){
    hydrateTonight();
    goTo(1);
  }

  // Primary CTA (landing)
  primaryHandleBtn?.addEventListener("click", handleMyFood);

  // Any element can invoke the same primary behavior
  document.addEventListener("click", (e) => {
    const actionBtn = e.target.closest("[data-action]");
    if(actionBtn && actionBtn.getAttribute("data-action") === "handle"){
      handleMyFood();
      return;
    }

    const gotoBtn = e.target.closest("[data-goto]");
    if(gotoBtn){
      const target = Number(gotoBtn.getAttribute("data-goto"));
      if(!Number.isNaN(target)) goTo(target);
      return;
    }
  });

  // Start over = calm return, no guilt
  startOverBtn?.addEventListener("click", () => goTo(0));

  // Copy link
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

  // Keyboard: Enter/Space on landing runs primary action; Esc returns to calm
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

  // Boot: respect share hash if present, otherwise always start calm
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
