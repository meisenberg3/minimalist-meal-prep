/* Decision Offloader — Golden Rule: end the decision, not help the user think. */

const STORAGE_KEY = "decision_offloader_v1";

const DEFAULT_STATE = {
  bias: "balanced",            // "balanced" | "healthier" | "comfort"
  myFoods: [],                 // array of user keywords (strings)
  likedMeals: [],              // array of meal ids
  refreshUsed: 0,              // counts refreshes on current decision
  currentPair: null,           // [mealIdA, mealIdB]
  lastResult: null,            // mealId
};

const REFRESH_LIMIT = 2;       // after this, no more refresh — forced decision.

const MEALS = [
  // Balanced
  { id:"tacos", name:"Tacos (protein + toppings)", tags:["balanced","comfort","mexican"] },
  { id:"chicken_bowl", name:"Chicken rice bowl", tags:["balanced","healthier","bowls"] },
  { id:"stirfry", name:"Stir-fry (veg + protein)", tags:["balanced","healthier","quick"] },
  { id:"pasta_red", name:"Pasta + red sauce + protein", tags:["balanced","comfort","italian"] },
  { id:"salmon", name:"Salmon + rice + greens", tags:["healthier","balanced","quick"] },
  { id:"turkey_burger", name:"Turkey burgers + side", tags:["balanced","comfort"] },
  { id:"chili", name:"Chili bowl", tags:["balanced","comfort","one-pot"] },
  { id:"wrap", name:"Wrap + salad", tags:["balanced","quick"] },

  // Healthier
  { id:"greek_bowl", name:"Greek bowl (chicken, feta, veg)", tags:["healthier","balanced","mediterranean"] },
  { id:"egg_scramble", name:"Egg scramble + fruit", tags:["healthier","quick"] },
  { id:"tuna_salad", name:"Tuna salad bowl", tags:["healthier","quick"] },
  { id:"soup_salad", name:"Soup + side salad", tags:["healthier","balanced","one-pot"] },
  { id:"lean_turkey", name:"Lean turkey + veg + carb", tags:["healthier","balanced"] },

  // Comfort
  { id:"pizza_night", name:"Pizza night (simple)", tags:["comfort"] },
  { id:"burger_fries", name:"Burger + oven fries", tags:["comfort"] },
  { id:"mac_protein", name:"Mac & cheese + protein", tags:["comfort"] },
  { id:"fried_rice", name:"Fried rice (leftover-friendly)", tags:["comfort","quick"] },
  { id:"wings", name:"Wings + easy side", tags:["comfort"] },
];

const MEAL_BY_ID = Object.fromEntries(MEALS.map(m => [m.id, m]));

// ---------- State ----------
let state = loadState();

// ---------- DOM ----------
const elApp = document.getElementById("app");
const elModalRoot = document.getElementById("modalRoot");
const elResetAllBtn = document.getElementById("resetAllBtn");

elResetAllBtn.addEventListener("click", () => {
  if (!confirm("Reset everything? This clears bias, foods you like, and likes.")) return;
  state = { ...DEFAULT_STATE };
  saveState();
  navigate("#home");
});

// ---------- Routing ----------
window.addEventListener("hashchange", render);

function getRoute() {
  const h = (location.hash || "#home").toLowerCase();
  // Support your existing pattern: .../#s2
  if (h === "#s2" || h.startsWith("#decide")) return "decide";
  return "home";
}

function navigate(hash) {
  location.hash = hash;
}

function render() {
  const route = getRoute();
  if (route === "decide") renderDecide();
  else renderHome();
}

render(); // initial

// ---------- Screens ----------
function renderHome() {
  elApp.innerHTML = `
    <div class="stack">
      <div>
        <h1 class="h1">Dinner, decided.</h1>
        <p class="p">No planning. No browsing. No thinking.</p>
      </div>

      <div class="card stack">
        <div class="row">
          ${renderBiasPills()}
        </div>

        <div class="row">
          <button class="btn btn-primary" id="goDecideBtn" type="button">Decide dinner</button>
          <button class="btn" id="editPrefsBtn" type="button">Foods I like (optional)</button>
        </div>

        <div class="small">
          This app follows one rule: <b>end the decision</b>. It will not let you spiral.
        </div>
      </div>

      ${renderPrefsSummary()}
    </div>
  `;

  document.getElementById("goDecideBtn").addEventListener("click", () => {
    // Start a fresh decision session (not a browsing loop)
    state.refreshUsed = 0;
    state.lastResult = null;
    state.currentPair = makePair();
    saveState();
    navigate("#s2");
  });

  document.getElementById("editPrefsBtn").addEventListener("click", () => openPrefsModal());
  wireBiasButtons();
}

function renderDecide() {
  if (!state.currentPair || state.currentPair.length !== 2) {
    state.currentPair = makePair();
    saveState();
  }

  const [aId, bId] = state.currentPair;
  const a = MEAL_BY_ID[aId];
  const b = MEAL_BY_ID[bId];

  const refreshRemaining = Math.max(0, REFRESH_LIMIT - state.refreshUsed);
  const forced = refreshRemaining === 0;

  elApp.innerHTML = `
    <div class="stack">
      <div>
        <h1 class="h1">Here’s dinner.</h1>
        <p class="p">${forced
          ? `More options won’t help. Pick one — or I’ll pick.`
          : `You can refresh <b>${refreshRemaining}</b> time${refreshRemaining === 1 ? "" : "s"} — then we finish.`
        }</p>
      </div>

      <div class="row">
        ${renderBiasPills(true)}
        <button class="btn" id="editPrefsBtn" type="button">Foods I like</button>
      </div>

      <div class="split">
        ${renderChoiceCard("left", a)}
        ${renderChoiceCard("right", b)}
      </div>

      <div class="row">
        <button class="btn btn-primary" id="pickForMeBtn" type="button">Pick for me</button>
        ${forced ? "" : `<button class="btn" id="refreshBtn" type="button">Give me different ones</button>`}
        <button class="btn btn-ghost" id="backHomeBtn" type="button">Back</button>
      </div>

      <hr class="hr"/>

      <div class="small">
        Refresh used: <b>${state.refreshUsed}</b> / ${REFRESH_LIMIT}
      </div>
    </div>
  `;

  document.getElementById("editPrefsBtn").addEventListener("click", () => openPrefsModal(() => render()));
  document.getElementById("backHomeBtn").addEventListener("click", () => navigate("#home"));

  wireBiasButtons();

  document.getElementById("choose_left").addEventListener("click", () => finalizeChoice(a.id));
  document.getElementById("choose_right").addEventListener("click", () => finalizeChoice(b.id));
  document.getElementById("pickForMeBtn").addEventListener("click", () => {
    const picked = Math.random() < 0.5 ? a.id : b.id;
    finalizeChoice(picked);
  });

  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      // Guardrail: refresh is limited by design
      state.refreshUsed += 1;
      state.currentPair = makePair();
      saveState();
      renderDecide();
    });
  }
}

function renderResult(mealId) {
  const meal = MEAL_BY_ID[mealId];
  const liked = state.likedMeals.includes(mealId);

  elApp.innerHTML = `
    <div class="stack">
      <div>
        <h1 class="h1">Done.</h1>
        <p class="p">No more thinking. This is dinner.</p>
      </div>

      <div class="card stack">
        <div class="row">
          <span class="pill">Bias: <b>${labelBias(state.bias)}</b></span>
          ${state.myFoods.length ? `<span class="pill">My foods: <b>${state.myFoods.length}</b></span>` : `<span class="pill">My foods: <b>none</b></span>`}
        </div>

        <div class="choice">
          <h3>${escapeHtml(meal.name)}</h3>
          <div class="meta">${escapeHtml(meal.tags.join(" • "))}</div>
        </div>

        <div class="row">
          <button class="btn btn-primary" id="lockBtn" type="button">${liked ? "Locked" : "Lock this (I liked it)"}</button>
          <button class="btn" id="newDecisionBtn" type="button">New decision</button>
          <button class="btn btn-ghost" id="homeBtn" type="button">Home</button>
        </div>

        <div class="small">
          Locking improves future picks automatically (no profiles, no setup).
        </div>
      </div>
    </div>
  `;

  document.getElementById("homeBtn").addEventListener("click", () => navigate("#home"));
  document.getElementById("newDecisionBtn").addEventListener("click", () => {
    // New decision session (fresh pair, refresh count reset)
    state.refreshUsed = 0;
    state.currentPair = makePair();
    saveState();
    navigate("#s2");
  });

  document.getElementById("lockBtn").addEventListener("click", () => {
    if (!state.likedMeals.includes(mealId)) {
      state.likedMeals.push(mealId);
      saveState();
    }
    renderResult(mealId);
  });
}

// ---------- Components ----------
function renderChoiceCard(side, meal) {
  return `
    <div class="choice">
      <h3>${escapeHtml(meal.name)}</h3>
      <div class="meta">${escapeHtml(meal.tags.join(" • "))}</div>
      <div class="row">
        <button class="btn btn-primary" id="choose_${side}" type="button">Choose</button>
      </div>
    </div>
  `;
}

function renderBiasPills(clickable = true) {
  const mk = (key, label) => {
    const active = state.bias === key;
    const cls = active ? "pill" : "pill";
    const data = clickable ? `data-bias="${key}"` : "";
    return `<span class="${cls}" ${data} style="${active ? 'color:var(--text); border-color:rgba(233,237,245,.22); background:rgba(233,237,245,.06);' : ''}">
      ${label}${active ? " ✓" : ""}
    </span>`;
  };

  return `
    ${mk("balanced", "Balanced")}
    ${mk("healthier", "Healthier")}
    ${mk("comfort", "Comfort")}
  `;
}

function wireBiasButtons() {
  const biasEls = elApp.querySelectorAll("[data-bias]");
  biasEls.forEach(el => {
    el.style.cursor = "pointer";
    el.addEventListener("click", () => {
      const next = el.getAttribute("data-bias");
      if (!next) return;
      state.bias = next;
      // Do NOT re-ask later. Save once.
      saveState();
      // If currently deciding, regenerate pair to reflect new bias immediately
      if (getRoute() === "decide") {
        state.refreshUsed = Math.min(state.refreshUsed, REFRESH_LIMIT); // keep count
        state.currentPair = makePair();
        saveState();
        renderDecide();
      } else {
        renderHome();
      }
    });
  });
}

function renderPrefsSummary() {
  const foods = state.myFoods || [];
  const liked = state.likedMeals || [];
  const likedNames = liked.map(id => MEAL_BY_ID[id]?.name).filter(Boolean);

  return `
    <div class="card stack">
      <div class="row">
        <span class="pill">Bias: <b>${labelBias(state.bias)}</b></span>
        <span class="pill">Foods I like: <b>${foods.length}</b></span>
        <span class="pill">Locked meals: <b>${liked.length}</b></span>
      </div>

      ${foods.length ? `
        <div>
          <div class="label">Foods I like</div>
          <div class="row">${foods.map(f => `<span class="chip">${escapeHtml(f)}</span>`).join("")}</div>
        </div>
      ` : `
        <div class="small">Tip: add 3–6 foods you actually enjoy to reduce “meh” results.</div>
      `}

      ${likedNames.length ? `
        <div>
          <div class="label">Locked meals</div>
          <div class="small">${escapeHtml(likedNames.join(" • "))}</div>
        </div>
      ` : ""}
    </div>
  `;
}

function labelBias(b) {
  if (b === "healthier") return "Healthier";
  if (b === "comfort") return "Comfort";
  return "Balanced";
}

// ---------- Modal: Foods I Like ----------
function openPrefsModal(onClose) {
  const foods = [...(state.myFoods || [])];

  const close = () => {
    elModalRoot.innerHTML = "";
    if (typeof onClose === "function") onClose();
  };

  elModalRoot.innerHTML = `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Foods I like">
      <div class="modal">
        <div class="modal-header">
          <h2>Foods I like (optional)</h2>
          <button class="btn btn-ghost" id="closeModalBtn" type="button">Close</button>
        </div>

        <p class="p" style="margin-top:0;">
          Add a few keywords. Examples: <span class="pill">tacos</span> <span class="pill">bowls</span> <span class="pill">italian</span> <span class="pill">chicken</span>
        </p>

        <label class="label" for="foodInput">Add one</label>
        <div class="row">
          <input id="foodInput" class="input" type="text" placeholder="e.g., mexican, pasta, chicken bowls" />
          <button class="btn btn-primary" id="addFoodBtn" type="button">Add</button>
        </div>

        <div class="hr"></div>

        <div class="label">Your list</div>
        <div class="row" id="foodsRow"></div>

        <div class="hr"></div>

        <div class="row">
          <button class="btn btn-primary" id="savePrefsBtn" type="button">Save</button>
          <button class="btn" id="clearPrefsBtn" type="button">Clear</button>
        </div>

        <div class="small" style="margin-top:10px;">
          This is lightweight on purpose. No profiles. No onboarding. Just fewer “meh” picks.
        </div>
      </div>
    </div>
  `;

  const foodsRow = document.getElementById("foodsRow");
  const input = document.getElementById("foodInput");

  function drawFoods() {
    foodsRow.innerHTML = foods.length
      ? foods.map((f, idx) => `
          <span class="chip">
            ${escapeHtml(f)}
            <button type="button" data-remove="${idx}" aria-label="Remove">×</button>
          </span>
        `).join("")
      : `<span class="small">Nothing yet.</span>`;

    foodsRow.querySelectorAll("[data-remove]").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = Number(btn.getAttribute("data-remove"));
        if (!Number.isFinite(i)) return;
        foods.splice(i, 1);
        drawFoods();
      });
    });
  }

  function addFood() {
    const raw = (input.value || "").trim();
    if (!raw) return;

    // allow comma-separated adds
    raw.split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(item => {
        const cleaned = item.toLowerCase();
        if (!foods.includes(cleaned)) foods.push(cleaned);
      });

    input.value = "";
    drawFoods();
  }

  document.getElementById("closeModalBtn").addEventListener("click", close);
  document.getElementById("addFoodBtn").addEventListener("click", addFood);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addFood();
    }
  });

  document.getElementById("savePrefsBtn").addEventListener("click", () => {
    state.myFoods = foods.slice(0, 30); // hard cap to prevent overthinking
    saveState();

    // If in decision mode, regenerate to reflect new prefs immediately
    if (getRoute() === "decide") {
      state.currentPair = makePair();
      saveState();
    }
    close();
  });

  document.getElementById("clearPrefsBtn").addEventListener("click", () => {
    foods.splice(0, foods.length);
    drawFoods();
  });

  // click outside modal closes
  elModalRoot.querySelector(".modal-backdrop").addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) close();
  });

  drawFoods();
}

// ---------- Decision Engine ----------
function makePair() {
  const a = weightedPick();
  let b = weightedPick([a]);
  // ultra-safety: ensure distinct
  if (a === b) b = MEALS.find(m => m.id !== a)?.id || a;
  return [a, b];
}

function weightedPick(excludeIds = []) {
  const exclude = new Set(excludeIds);
  const foods = (state.myFoods || []).map(s => s.toLowerCase());
  const liked = new Set(state.likedMeals || []);

  // score each meal
  const scored = MEALS
    .filter(m => !exclude.has(m.id))
    .map(m => {
      let w = 1;

      // Bias weight (small — enough to guide, not enough to browse)
      if (state.bias === "healthier") w += m.tags.includes("healthier") ? 1.1 : 0.0;
      else if (state.bias === "comfort") w += m.tags.includes("comfort") ? 1.1 : 0.0;
      else w += m.tags.includes("balanced") ? 0.7 : 0.2;

      // Foods I like weight (keyword match against name + tags)
      if (foods.length) {
        const hay = (m.name + " " + m.tags.join(" ")).toLowerCase();
        let hits = 0;
        for (const kw of foods) {
          if (kw && hay.includes(kw)) hits += 1;
        }
        w += Math.min(1.6, hits * 0.6);
      }

      // Liked meals weight
      if (liked.has(m.id)) w += 1.4;

      // Tiny randomness so it doesn't feel stuck
      w += Math.random() * 0.08;

      return { id: m.id, w };
    });

  return weightedRandom(scored);
}

function weightedRandom(items) {
  const total = items.reduce((sum, x) => sum + x.w, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.w;
    if (r <= 0) return it.id;
  }
  return items[items.length - 1]?.id || MEALS[0].id;
}

function finalizeChoice(mealId) {
  state.lastResult = mealId;
  saveState();
  renderResult(mealId);
}

// ---------- Storage ----------
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      myFoods: Array.isArray(parsed.myFoods) ? parsed.myFoods : [],
      likedMeals: Array.isArray(parsed.likedMeals) ? parsed.likedMeals : [],
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------- Utils ----------
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;",
  }[s]));
}
