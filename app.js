/* Food, Handled — Golden Rule: end the decision, not help the user think. */

const STORAGE_KEY = "minimalist_meal_prep_v23";

const DEFAULT = {
  bias: "balanced",       // balanced | healthier | comfort
  myFoods: [],            // keywords
  likedMeals: [],         // meal ids
  refreshUsed: 0,
  currentPair: null,      // [idA, idB]
  lastResult: null,       // id
};

const REFRESH_LIMIT = 2;

// Small, hardcoded library (expand later, without breaking the golden rule)
const MEALS = [
  { id:"tacos", name:"Tacos (protein + toppings)", tags:["balanced","comfort","mexican"] },
  { id:"chicken_bowl", name:"Chicken rice bowl", tags:["balanced","healthier","bowls"] },
  { id:"stirfry", name:"Stir-fry (veg + protein)", tags:["balanced","healthier","quick"] },
  { id:"pasta_red", name:"Pasta + red sauce + protein", tags:["balanced","comfort","italian"] },
  { id:"salmon", name:"Salmon + rice + greens", tags:["healthier","balanced","quick"] },
  { id:"turkey_burger", name:"Turkey burgers + side", tags:["balanced","comfort"] },
  { id:"chili", name:"Chili bowl", tags:["balanced","comfort","one-pot"] },
  { id:"wrap", name:"Wrap + salad", tags:["balanced","quick"] },
  { id:"greek_bowl", name:"Greek bowl (chicken, feta, veg)", tags:["healthier","balanced","mediterranean"] },
  { id:"egg_scramble", name:"Egg scramble + fruit", tags:["healthier","quick"] },
  { id:"tuna_salad", name:"Tuna salad bowl", tags:["healthier","quick"] },
  { id:"soup_salad", name:"Soup + side salad", tags:["healthier","balanced","one-pot"] },
  { id:"pizza_night", name:"Pizza night (simple)", tags:["comfort"] },
  { id:"burger_fries", name:"Burger + oven fries", tags:["comfort"] },
  { id:"fried_rice", name:"Fried rice (leftover-friendly)", tags:["comfort","quick"] },
  { id:"wings", name:"Wings + easy side", tags:["comfort"] },
];

const BY_ID = Object.fromEntries(MEALS.map(m => [m.id, m]));

let state = load();

const elApp = document.getElementById("app");
const elModalRoot = document.getElementById("modalRoot");
document.getElementById("resetAll").addEventListener("click", () => {
  state = { ...DEFAULT };
  save();
  location.hash = "#top";
  render();
});

window.addEventListener("hashchange", render);
render();

function route(){
  const h = (location.hash || "").toLowerCase();
  // preserve your existing pattern
  if (h === "#s2" || h.startsWith("#tonight")) return "tonight";
  if (h.startsWith("#set")) return "set";
  if (h.startsWith("#result")) return "result";
  return "home";
}

function render(){
  const r = route();
  if (r === "tonight") return renderTonight();
  if (r === "set") return renderSet();
  if (r === "result") return renderResult();
  return renderHome();
}

/* ---------------- Screens ---------------- */

function renderHome(){
  elApp.innerHTML = `
    <h1>Food, Handled</h1>
    <p>You don’t have to think about food.</p>
    <p>Tap once. Dinner shows up.</p>

    <div class="actions">
      <button class="btn btn-primary" id="goSet">Handle my food</button>
      <button class="btn" id="goTonight">Show me tonight</button>
    </div>

    <p class="small">No account. No setup. Nothing to remember.</p>
  `;

  document.getElementById("goSet").addEventListener("click", () => {
    startFreshDecision();
    location.hash = "#set";
  });

  document.getElementById("goTonight").addEventListener("click", () => {
    startFreshDecision();
    location.hash = "#s2";
  });
}

function renderTonight(){
  ensurePair();

  const remaining = Math.max(0, REFRESH_LIMIT - state.refreshUsed);
  const forced = remaining === 0;

  const [aId,bId] = state.currentPair;
  const a = BY_ID[aId], b = BY_ID[bId];

  elApp.innerHTML = `
    <div class="badge">Tonight is handled</div>
    <h2>Tonight</h2>

    <div class="card">
      <div class="small"><b>Do this</b></div>
      <div class="small">Choose one. Or let it choose for you.</div>

      <hr>

      <div class="small"><b>Not this</b></div>
      <ul class="list">
        <li>No planning</li>
        <li>No recipe hunting</li>
        <li>No prep marathon</li>
        <li>No spiral</li>
      </ul>

      <hr>

      <div class="actions">
        <button class="btn" id="openPrefs">Optional settings</button>
        <button class="btn btn-primary" id="seeSet">See the meal set</button>
        <button class="btn" id="imGood">I’m good</button>
      </div>

      <div class="small" style="margin-top:10px;">
        ${forced ? `You can stop here.` : `You can refresh <b>${remaining}</b> time${remaining===1?"":"s"} — then we stop.`}
      </div>
    </div>

    <div class="choicegrid">
      ${choiceCard("left", a)}
      ${choiceCard("right", b)}
    </div>

    <div class="actions" style="margin-top:14px;">
      <button class="btn btn-primary" id="pickForMe">Pick for me</button>
      ${forced ? "" : `<button class="btn" id="refresh">Pick a different tonight</button>`}
      <button class="btn" id="backHome">Back</button>
    </div>

    <p class="small">You can stop here.</p>
  `;

  document.getElementById("openPrefs").addEventListener("click", () => openPrefsModal(() => renderTonight()));
  document.getElementById("seeSet").addEventListener("click", () => location.hash = "#set");
  document.getElementById("imGood").addEventListener("click", () => location.hash = "#top");
  document.getElementById("backHome").addEventListener("click", () => location.hash = "#top");

  document.getElementById("choose_left").addEventListener("click", () => finalize(a.id));
  document.getElementById("choose_right").addEventListener("click", () => finalize(b.id));
  document.getElementById("pickForMe").addEventListener("click", () => finalize(Math.random()<0.5 ? a.id : b.id));

  const refreshBtn = document.getElementById("refresh");
  if (refreshBtn){
    refreshBtn.addEventListener("click", () => {
      state.refreshUsed += 1;
      state.currentPair = makePair();
      save();
      renderTonight();
    });
  }
}

function renderSet(){
  // keep copy + feel minimal, no heavy UI
  const picks = getMealSet();

  elApp.innerHTML = `
    <div class="badge">Small set</div>
    <h2>The meal set</h2>
    <p>Familiar food. Minimal cleanup. Same effort.</p>
    <p>Ingredients repeat so shopping stays short.</p>

    <div class="card">
      ${picks.map(m => `
        <div style="margin-bottom:10px;">
          <div class="choiceTitle">${escapeHtml(m.name)}</div>
          <div class="meta">${escapeHtml(m.tags.join(" • "))}</div>
        </div>
      `).join("")}

      <hr>

      <div class="actions">
        <button class="btn" id="openList">Open grocery list (short)</button>
        <button class="btn btn-primary" id="backTonight">Back to tonight</button>
        <button class="btn" id="rechoose">Rechoose my meals</button>
      </div>

      <div id="grocery" style="display:none; margin-top:10px;">
        <hr>
        <div class="small"><b>What to buy</b></div>
        <div class="small">Stays closed unless you open it.</div>
        <ul class="list">
          <li>Protein (chicken / turkey / eggs)</li>
          <li>Carb base (rice / tortillas / pasta)</li>
          <li>Veg (frozen mix or salad kit)</li>
          <li>Sauce/toppings (salsa, dressing, etc.)</li>
        </ul>
      </div>
    </div>

    <p class="small">You can stop here.</p>
  `;

  document.getElementById("backTonight").addEventListener("click", () => location.hash = "#s2");
  document.getElementById("rechoose").addEventListener("click", () => {
    startFreshDecision();
    location.hash = "#set";
  });
  document.getElementById("openList").addEventListener("click", () => {
    const el = document.getElementById("grocery");
    el.style.display = (el.style.display === "none") ? "block" : "none";
  });
}

function renderResult(){
  const mealId = state.lastResult;
  const meal = mealId ? BY_ID[mealId] : null;

  if (!meal){
    location.hash = "#s2";
    return;
  }

  const locked = state.likedMeals.includes(mealId);

  elApp.innerHTML = `
    <div class="badge">That’s it.</div>
    <h2>Dinner decided</h2>
    <p>Close the tab whenever.</p>

    <div class="card">
      <div class="choiceTitle">${escapeHtml(meal.name)}</div>
      <div class="meta">${escapeHtml(meal.tags.join(" • "))}</div>

      <hr>

      <div class="actions">
        <button class="btn btn-primary" id="lock">${locked ? "Locked" : "Lock this (I liked it)"}</button>
        <button class="btn" id="new">New decision</button>
        <button class="btn" id="back">Back</button>
      </div>

      <div class="small" style="margin-top:10px;">
        Optional memory. No profiles. No thinking.
      </div>
    </div>
  `;

  document.getElementById("lock").addEventListener("click", () => {
    if (!state.likedMeals.includes(mealId)){
      state.likedMeals.push(mealId);
      save();
    }
    renderResult();
  });

  document.getElementById("new").addEventListener("click", () => {
    startFreshDecision();
    location.hash = "#s2";
  });

  document.getElementById("back").addEventListener("click", () => location.hash = "#s2");
}

/* ---------------- Components ---------------- */

function choiceCard(side, meal){
  return `
    <div class="card">
      <div class="choiceTitle">${escapeHtml(meal.name)}</div>
      <div class="meta">${escapeHtml(meal.tags.join(" • "))}</div>
      <div class="actions" style="margin-top:12px;">
        <button class="btn btn-primary" id="choose_${side}">Choose</button>
      </div>
    </div>
  `;
}

/* ---------------- Golden-rule engine ---------------- */

function startFreshDecision(){
  state.refreshUsed = 0;
  state.lastResult = null;
  state.currentPair = makePair();
  save();
}

function ensurePair(){
  if (!state.currentPair || state.currentPair.length !== 2){
    state.currentPair = makePair();
    save();
  }
}

function makePair(){
  const a = weightedPick([]);
  const b = weightedPick([a]);
  return [a,b];
}

function weightedPick(excludeIds){
  const exclude = new Set(excludeIds);
  const foods = (state.myFoods || []).map(s => s.toLowerCase());
  const liked = new Set(state.likedMeals || []);

  const scored = MEALS
    .filter(m => !exclude.has(m.id))
    .map(m => {
      let w = 1;

      // bias: small nudge only
      if (state.bias === "healthier") w += m.tags.includes("healthier") ? 1.1 : 0;
      else if (state.bias === "comfort") w += m.tags.includes("comfort") ? 1.1 : 0;
      else w += m.tags.includes("balanced") ? 0.7 : 0.2;

      // foods I like: keyword nudges
      if (foods.length){
        const hay = (m.name + " " + m.tags.join(" ")).toLowerCase();
        let hits = 0;
        for (const kw of foods) if (kw && hay.includes(kw)) hits += 1;
        w += Math.min(1.6, hits * 0.6);
      }

      // liked memory: strong nudge
      if (liked.has(m.id)) w += 1.4;

      // tiny randomness so it doesn't feel stuck
      w += Math.random() * 0.06;

      return { id: m.id, w };
    });

  return weightedRandom(scored);
}

function weightedRandom(items){
  const total = items.reduce((s,x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const it of items){
    r -= it.w;
    if (r <= 0) return it.id;
  }
  return items[items.length - 1]?.id || MEALS[0].id;
}

function finalize(mealId){
  state.lastResult = mealId;
  save();
  location.hash = "#result";
}

/* ---------------- Optional settings modal ---------------- */

function openPrefsModal(onClose){
  const foods = [...(state.myFoods || [])];
  let bias = state.bias;

  const close = () => {
    elModalRoot.innerHTML = "";
    if (typeof onClose === "function") onClose();
  };

  elModalRoot.innerHTML = `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal">
        <div class="modalTop">
          <h3>Optional settings</h3>
          <button class="linkbtn" id="close">Close</button>
        </div>

        <p class="small">These are optional. The app still works if you ignore this.</p>

        <hr>

        <div class="small"><b>Bias</b> (saved)</div>
        <div class="actions">
          <button class="btn ${bias==="balanced"?"btn-primary":""}" data-b="balanced">Balanced</button>
          <button class="btn ${bias==="healthier"?"btn-primary":""}" data-b="healthier">Healthier</button>
          <button class="btn ${bias==="comfort"?"btn-primary":""}" data-b="comfort">Comfort</button>
        </div>

        <hr>

        <div class="small"><b>Foods I like</b> (optional keywords)</div>
        <div class="field">
          <input class="input" id="foodInput" placeholder="e.g., tacos, bowls, italian, chicken" />
          <button class="btn btn-primary" id="add">Add</button>
          <button class="btn" id="clear">Clear</button>
        </div>
        <div class="chips" id="chips"></div>

        <hr>

        <div class="actions">
          <button class="btn btn-primary" id="save">Save</button>
        </div>

        <div class="small" style="margin-top:10px;">
          Golden Rule stays intact: no profiles, no onboarding, no spiraling.
        </div>
      </div>
    </div>
  `;

  const chipsEl = document.getElementById("chips");
  const inputEl = document.getElementById("foodInput");

  function draw(){
    chipsEl.innerHTML = foods.length
      ? foods.map((f,i)=>`
          <span class="chip">${escapeHtml(f)} <button data-x="${i}" aria-label="Remove">×</button></span>
        `).join("")
      : `<span class="small">Nothing yet.</span>`;

    chipsEl.querySelectorAll("[data-x]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const i = Number(btn.getAttribute("data-x"));
        if (!Number.isFinite(i)) return;
        foods.splice(i,1);
        draw();
      });
    });

    document.querySelectorAll("[data-b]").forEach(b=>{
      b.addEventListener("click", ()=>{
        bias = b.getAttribute("data-b");
        // re-render button emphasis without rebuilding entire modal
        document.querySelectorAll("[data-b]").forEach(x=>{
          x.classList.toggle("btn-primary", x.getAttribute("data-b") === bias);
        });
      });
    });
  }

  function add(){
    const raw = (inputEl.value || "").trim();
    if (!raw) return;
    raw.split(",")
      .map(s=>s.trim())
      .filter(Boolean)
      .forEach(item=>{
        const cleaned = item.toLowerCase();
        if (!foods.includes(cleaned)) foods.push(cleaned);
      });
    inputEl.value = "";
    draw();
  }

  document.getElementById("close").addEventListener("click", close);
  document.getElementById("add").addEventListener("click", add);
  inputEl.addEventListener("keydown", (e)=>{
    if (e.key === "Enter"){
      e.preventDefault();
      add();
    }
  });

  document.getElementById("clear").addEventListener("click", ()=>{
    foods.splice(0, foods.length);
    draw();
  });

  document.getElementById("save").addEventListener("click", ()=>{
    state.bias = bias || "balanced";
    state.myFoods = foods.slice(0, 30);
    // keep decision-ending: if user changes settings mid-session, regenerate quietly
    state.currentPair = makePair();
    save();
    close();
  });

  // click outside closes
  elModalRoot.querySelector(".modal-backdrop").addEventListener("click", (e)=>{
    if (e.target.classList.contains("modal-backdrop")) close();
  });

  draw();
}

/* ---------------- Storage + utils ---------------- */

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT,
      ...parsed,
      myFoods: Array.isArray(parsed.myFoods) ? parsed.myFoods : [],
      likedMeals: Array.isArray(parsed.likedMeals) ? parsed.likedMeals : [],
    };
  }catch{
    return { ...DEFAULT };
  }
}

function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[s]));
}

function getMealSet(){
  // small “set” derived from weights, but still calm + not a browsing UI
  const picked = new Set();
  const out = [];
  let safety = 0;
  while (out.length < 5 && safety < 80){
    const id = weightedPick([...picked]);
    picked.add(id);
    out.push(BY_ID[id]);
    safety++;
  }
  return out;
}
