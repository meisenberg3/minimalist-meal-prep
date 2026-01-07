/**
 * Minimalist Meal Prep — UI surgery edition
 * Core loop:
 * 1) See plan
 * 2) Click "Get grocery list"
 * 3) Grocery list reveals + copy/download
 * Optional swaps are hidden behind a drawer (closed by default).
 */

const STORAGE_KEY = "minimalist_meal_prep_v3";

const DEFAULTS = {
  lunchProtein: "Chicken",
  breakfastFruit: "Banana",
};

const elToast = document.getElementById("toast");

const elGoTop = document.getElementById("goGroceriesTop");
const elGoHero = document.getElementById("goGroceriesHero");

const elGroceriesLocked = document.getElementById("groceriesLocked");
const elGroceriesContent = document.getElementById("groceriesContent");

const elCopyPlan = document.getElementById("copyPlanBtn");
const elCopyGrocery = document.getElementById("copyGroceryBtn");
const elDownload = document.getElementById("downloadBtn");
const elReset = document.getElementById("resetBtn");

const elGroceryText = document.getElementById("groceryText");

const elProteinChips = document.getElementById("proteinChips");
const elFruitChips = document.getElementById("fruitChips");

// Plan elements (now exist in HTML)
const mealBreakfast = document.querySelector('[data-key="breakfast"]');
const dinner1 = document.querySelector('[data-key="dinner1"]');
const dinner2 = document.querySelector('[data-key="dinner2"]');
const dinner3 = document.querySelector('[data-key="dinner3"]');

let state = loadState();

init();

function init() {
  applyStateToPlan();
  renderGroceryList();
  syncActiveChips();

  // One action to reveal groceries (top + hero button do the same thing)
  elGoTop?.addEventListener("click", revealGroceries);
  elGoHero?.addEventListener("click", revealGroceries);

  // Copy / Download
  elCopyPlan?.addEventListener("click", copyMealPlan);
  elCopyGrocery?.addEventListener("click", () => copyText(elGroceryText.innerText, "Grocery list copied"));
  elDownload?.addEventListener("click", downloadGroceryTxt);

  // Optional swaps chips
  wireChips(elProteinChips, "lunchProtein", "protein");
  wireChips(elFruitChips, "breakfastFruit", "fruit");

  // Reset
  elReset?.addEventListener("click", () => {
    state = { ...DEFAULTS };
    saveState(state);
    applyStateToPlan();
    renderGroceryList();
    syncActiveChips();
    toast("Reset to default");
  });

  // If user lands on #groceries directly, reveal it
  if (location.hash === "#groceries") revealGroceries({ noScroll: true });
}

function revealGroceries(opts = {}) {
  // Reveal content
  elGroceriesLocked?.classList.add("hide");
  elGroceriesContent?.classList.remove("hide");

  // Navigate + scroll
  if (!opts.noScroll) {
    location.hash = "#groceries";
    document.getElementById("groceries")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...(parsed || {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveState(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function applyStateToPlan() {
  // Only touch what exists + what matters
  if (mealBreakfast) mealBreakfast.textContent = `Greek yogurt + oats + ${state.breakfastFruit}`;

  // Keep dinners constant (identity), swaps only affect grocery list + breakfast fruit
  if (dinner1) dinner1.textContent = "Chicken thighs + rice + broccoli";
  if (dinner2) dinner2.textContent = "Ground beef + sweet potatoes + green beans";
  if (dinner3) dinner3.textContent = "Eggs + toast + beans";
}

function renderGroceryList() {
  const lines = [
    "PROTEIN",
    "- Chicken thighs (3 lbs)",
    "- Ground beef (2 lbs)",
    "- Eggs (1 dozen)",
    `- ${state.lunchProtein} (optional swap for lunches)`,
    "",
    "CARBS",
    "- Rice",
    "- Sweet potatoes",
    "- Bread / toast",
    "- Oats",
    "",
    "PRODUCE",
    "- Broccoli",
    "- Green beans",
    `- ${state.breakfastFruit}s`,
    "",
    "DAIRY",
    "- Greek yogurt",
    "",
    "BASICS",
    "- Salt + pepper",
    "- Olive oil (optional)",
  ];

  if (elGroceryText) elGroceryText.textContent = lines.join("\n");
}

function wireChips(container, key, datasetKey) {
  if (!container) return;
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;

    let newVal = null;
    if (datasetKey === "protein") newVal = btn.getAttribute("data-protein");
    if (datasetKey === "fruit") newVal = btn.getAttribute("data-fruit");
    if (!newVal) return;

    state[key] = newVal;
    saveState(state);

    applyStateToPlan();
    renderGroceryList();
    syncActiveChips();

    toast("Swap saved");
  });
}

function syncActiveChips() {
  setActive(elProteinChips, "data-protein", state.lunchProtein);
  setActive(elFruitChips, "data-fruit", state.breakfastFruit);
}

function setActive(container, attr, value) {
  if (!container) return;
  const chips = Array.from(container.querySelectorAll(".chip"));
  chips.forEach((c) => c.classList.toggle("active", c.getAttribute(attr) === value));
}

function copyMealPlan() {
  const text = [
    "Minimalist Meal Prep — Default Plan",
    "",
    `Breakfast (daily): Greek yogurt + oats + ${state.breakfastFruit}`,
    "Lunch (daily): leftover dinner",
    "Dinner (rotate 3):",
    "- Chicken thighs + rice + broccoli",
    "- Ground beef + sweet potatoes + green beans",
    "- Eggs + toast + beans",
  ].join("\n");

  copyText(text, "Meal plan copied");
}

async function copyText(text, msg) {
  try {
    await navigator.clipboard.writeText(text);
    toast(msg);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    toast(msg);
  }
}

function downloadGroceryTxt() {
  const blob = new Blob([elGroceryText?.innerText || ""], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "minimalist-meal-prep-grocery-list.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("Downloaded grocery list");
}

let toastTimer = null;
function toast(message) {
  if (!elToast) return;
  elToast.textContent = message;
  elToast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elToast.classList.remove("show"), 1600);
}
