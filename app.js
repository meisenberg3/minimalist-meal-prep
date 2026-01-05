/**
 * Minimalist Meal Prep — Claude-driven structure
 * Product first → Grocery list → Optional swaps → Philosophy last
 */

const STORAGE_KEY = "minimalist_meal_prep_v2";

const DEFAULTS = {
  lunchProtein: "Chicken",
  breakfastFruit: "Banana",
  dinner2Protein: "Salmon",
};

const elToast = document.getElementById("toast");
const elReset = document.getElementById("resetBtn");

const elCopyPlan = document.getElementById("copyPlanBtn");
const elCopyGrocery = document.getElementById("copyGroceryBtn");
const elPrint = document.getElementById("printBtn");
const elDownload = document.getElementById("downloadBtn");

const elGroceryText = document.getElementById("groceryText");

const elProteinChips = document.getElementById("proteinChips");
const elFruitChips = document.getElementById("fruitChips");
const elDinner2Chips = document.getElementById("dinner2Chips");

const mealBreakfast = document.querySelector('[data-key="breakfast"]');
const mealLunch = document.querySelector('[data-key="lunch"]');
const dinner1 = document.querySelector('[data-key="dinner1"]');
const dinner2 = document.querySelector('[data-key="dinner2"]');
const dinner3 = document.querySelector('[data-key="dinner3"]');

let state = loadState();

init();

function init() {
  // Render default plan based on state
  applyStateToPlan();

  // Render groceries
  renderGroceryList();

  // Mark active chips
  syncActiveChips();

  // Wire up chips (optional swaps)
  wireChips(elProteinChips, "lunchProtein", "protein");
  wireChips(elFruitChips, "breakfastFruit", "fruit");
  wireChips(elDinner2Chips, "dinner2Protein", "d2");

  // Copy / Print / Download
  elCopyPlan.addEventListener("click", copyMealPlan);
  elCopyGrocery.addEventListener("click", () => copyText(elGroceryText.innerText, "Grocery list copied"));
  elPrint.addEventListener("click", () => window.print());
  elDownload.addEventListener("click", downloadGroceryTxt);

  // Reset
  elReset.addEventListener("click", () => {
    state = { ...DEFAULTS };
    saveState(state);
    applyStateToPlan();
    renderGroceryList();
    syncActiveChips();
    toast("Reset to default plan");
    // bring user back to start
    location.hash = "#start";
  });
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
  // Breakfast
  mealBreakfast.textContent = `Greek yogurt + oats + ${state.breakfastFruit}`;

  // Lunch
  mealLunch.textContent = `${state.lunchProtein} + rice + frozen vegetables`;

  // Dinners (keep default structure, only swap dinner #2 protein optionally)
  dinner1.textContent = `Turkey chili (big pot)`;
  dinner2.textContent = `${state.dinner2Protein} + potatoes + vegetables (sheet pan)`;
  dinner3.textContent = `Eggs + beans + tortillas (10 minutes)`;
}

function renderGroceryList() {
  // Grocery list intentionally literal + simple
  // No “matrix”, no “framework”, just food.

  const lines = [
    "PROTEIN",
    `- ${state.lunchProtein} (lunch batch)`,
    "- Ground turkey (for chili)",
    `- ${state.dinner2Protein} (for sheet-pan dinner)`,
    "- Eggs",
    "- Canned beans (black or pinto)",
    "",
    "CARBS",
    "- Rice",
    "- Potatoes",
    "- Tortillas",
    "- Oats",
    "",
    "PRODUCE",
    `- ${state.breakfastFruit}`,
    "- Frozen vegetables (big bag)",
    "- Onion",
    "- Garlic",
    "- Optional: salsa or hot sauce",
    "",
    "DAIRY / OTHER",
    "- Greek yogurt",
    "- Olive oil",
    "- Salt + pepper",
    "- Chili seasoning (or cumin + paprika)",
    "",
    "OPTIONAL (if you want it nicer, not required)",
    "- Shredded cheese",
    "- Greek yogurt (extra, for topping chili)",
    "- Lemons (for sheet pan dinner)",
  ];

  elGroceryText.textContent = lines.join("\n");
}

function wireChips(container, key, datasetKey) {
  if (!container) return;
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;

    // Decide which data attribute to read based on container type
    let newVal = null;
    if (datasetKey === "protein") newVal = btn.getAttribute("data-protein");
    if (datasetKey === "fruit") newVal = btn.getAttribute("data-fruit");
    if (datasetKey === "d2") newVal = btn.getAttribute("data-d2");

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
  setActive(elDinner2Chips, "data-d2", state.dinner2Protein);
}

function setActive(container, attr, value) {
  if (!container) return;
  const chips = Array.from(container.querySelectorAll(".chip"));
  chips.forEach((c) => {
    const v = c.getAttribute(attr);
    c.classList.toggle("active", v === value);
  });
}

function copyMealPlan() {
  const text = [
    "Minimalist Meal Prep — Default Plan",
    "",
    `Breakfast (daily): Greek yogurt + oats + ${state.breakfastFruit}`,
    `Lunch (daily): ${state.lunchProtein} + rice + frozen vegetables`,
    "Dinner (rotate 3):",
    `- Turkey chili (big pot)`,
    `- ${state.dinner2Protein} + potatoes + vegetables (sheet pan)`,
    `- Eggs + beans + tortillas (10 minutes)`,
  ].join("\n");

  copyText(text, "Meal plan copied");
}

async function copyText(text, msg) {
  try {
    await navigator.clipboard.writeText(text);
    toast(msg);
  } catch {
    // fallback
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
  const blob = new Blob([elGroceryText.innerText], { type: "text/plain;charset=utf-8" });
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
