/* =========================================================
   Food, Handled — Golden Rule App
   One obvious action per screen. Everything else fades.
   ========================================================= */

const STORAGE_KEY = "food_handled_v23";

const DEFAULT_STATE = {
  bias: "balanced",           // balanced | healthier | comfort
  keywords: [],               // optional user keywords
  refreshesUsed: 0,           // per session run
  refreshLimit: 2,
  mealSet: null,              // array of meal ids
  tonightPair: null,          // array of 2 meal ids
  chosenMeal: null            // meal id
};

const MEALS = [
  // Balanced
  { id:"pasta_red_protein", name:"Pasta + red sauce + protein", tags:["balanced","comfort","italian"], grocery:["pasta","jarred marinara","chicken or turkey","salad kit"], short:["pasta","marinara","protein"] },
  { id:"wrap_salad", name:"Wrap + salad", tags:["balanced","quick"], grocery:["tortillas","deli turkey or chicken","salad kit","dressing"], short:["tortillas","protein","salad kit"] },
  { id:"chili_bowl", name:"Chili bowl", tags:["balanced","comfort","one-pot"], grocery:["ground turkey","beans","tomato base","spices"], short:["ground turkey","beans","tomato base"] },
  { id:"fried_rice", name:"Fried rice (leftover-friendly)", tags:["comfort","quick"], grocery:["rice","frozen veg mix","eggs","soy sauce"], short:["rice","frozen veg","eggs"] },
  { id:"pizza_night", name:"Pizza night (simple)", tags:["comfort"], grocery:["flatbread","sauce","cheese","toppings"], short:["flatbread","sauce","cheese"] },

  // Healthier
  { id:"salmon_rice_greens", name:"Salmon + rice + greens", tags:["healthier","balanced","quick"], grocery:["salmon","rice","broccoli or greens","lemon"], short:["salmon","rice","greens"] },
  { id:"chicken_bowl", name:"Chicken bowl", tags:["healthier","balanced","quick"], grocery:["chicken","rice","salsa","greens"], short:["chicken","rice","greens"] },
  { id:"egg_scramble_plate", name:"Egg scramble plate", tags:["healthier","quick"], grocery:["eggs","spinach","fruit","toast"], short:["eggs","greens","fruit"] },

  // Comfort
  { id:"tacos_simple", name:"Tacos (simple)", tags:["comfort","quick"], grocery:["tortillas","ground meat","cheese","salsa"], short:["tortillas","meat","salsa"] },
  { id:"mac_plus_protein", name:"Mac + protein", tags:["comfort"], grocery:["mac kit","chicken nuggets or rotisserie","hot sauce"], short:["mac","protein"] },

  // Neutral quick fallback
  { id:"soup_side_salad", name:"Soup + side salad", tags:["healthier","balanced","one-pot"], grocery:["soup","salad kit"], short:["soup","salad kit"] },
];

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  }catch{
    return { ...DEFAULT_STATE };
  }
}
function saveState(s){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}
function clearState(){
  localStorage.removeItem(STORAGE_KEY);
}
function hasAnyState(s){
  return !!(s.mealSet || s.tonightPair || s.chosenMeal || (s.keywords && s.keywords.length) || s.bias !== "balanced");
}

let state = loadState();

const elApp = document.getElementById("app");
const btnResetTop = document.getElementById("btnResetTop");

function setResetVisibility(){
  if(hasAnyState(state)){
    btnResetTop.style.visibility = "visible";
  } else {
    btnResetTop.style.visibility = "hidden";
  }
}

btnResetTop.addEventListener("click", () => {
  clearState();
  state = { ...DEFAULT_STATE };
  saveState(state);
  location.hash = "#top";
  render();
});

window.addEventListener("hashchange", render);

function route(){
  const h = (location.hash || "#top").toLowerCase();
  if(h.startsWith("#result")) return "result";
  if(h.startsWith("#set")) return "set";
  if(h.startsWith("#tonight")) return "tonight";
  return "top";
}

function pick(arr){
  return arr[Math.floor(Math.random()*arr.length)];
}
function shuffle(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function biasWeight(meal){
  // weight matching bias + keyword hits; keep simple and explainable
  let w = 1;

  if(state.bias === "healthier" && meal.tags.includes("healthier")) w += 2;
  if(state.bias === "comfort" && meal.tags.includes("comfort")) w += 2;
  if(state.bias === "balanced" && meal.tags.includes("balanced")) w += 1;

  if(state.keywords && state.keywords.length){
    const hay = (meal.name + " " + meal.tags.join(" ")).toLowerCase();
    const hits = state.keywords.reduce((acc,k)=> acc + (hay.includes(k.toLowerCase()) ? 1 : 0), 0);
    w += Math.min(3, hits); // cap
  }

  return w;
}

function weightedPick(meals){
  const pool = [];
  meals.forEach(m=>{
    const w = biasWeight(m);
    for(let i=0;i<w;i++) pool.push(m);
  });
  return pick(pool.length ? pool : meals);
}

function ensureMealSet(){
  if(state.mealSet && state.mealSet.length) return;

  // meal set: small, repeatable ingredients, mix of tags
  const preferred = shuffle(MEALS);
  const chosen = [];

  // seed by bias
  const biasTag = state.bias === "healthier" ? "healthier" : state.bias === "comfort" ? "comfort" : "balanced";
  const biasMeals = preferred.filter(m=>m.tags.includes(biasTag));
  if(biasMeals.length) chosen.push(pick(biasMeals));

  while(chosen.length < 5){
    const candidate = weightedPick(preferred);
    if(!chosen.find(x=>x.id === candidate.id)) chosen.push(candidate);
  }

  state.mealSet = chosen.map(m=>m.id);
  saveState(state);
}

function buildTonightPair(){
  ensureMealSet();
  const setMeals = state.mealSet.map(id => MEALS.find(m=>m.id===id)).filter(Boolean);

  // pick two distinct options from set, weighted
  const a = weightedPick(setMeals);
  let b = weightedPick(setMeals);
  let guard = 0;
  while(b.id === a.id && guard++ < 10) b = weightedPick(setMeals);

  state.tonightPair = [a.id, b.id];
  saveState(state);
}

function chooseMeal(id){
  state.chosenMeal = id;
  saveState(state);
  location.hash = "#result";
}

function refreshTonight(){
  if(state.refreshesUsed >= state.refreshLimit) return;
  state.refreshesUsed += 1;
  state.tonightPair = null;
  state.chosenMeal = null;
  saveState(state);
  buildTonightPair();
}

function setBias(newBias){
  state.bias = newBias;
  saveState(state);
}

function addKeyword(k){
  const clean = (k || "").trim().toLowerCase();
  if(!clean) return;
  if(state.keywords.includes(clean)) return;
  state.keywords.push(clean);
  saveState(state);
}

function removeKeyword(k){
  state.keywords = state.keywords.filter(x=>x !== k);
  saveState(state);
}

function resetRefreshCounter(){
  state.refreshesUsed = 0;
  saveState(state);
}

function topScreen(){
  // Primary action: Handle my food
  return `
    <div>
      <h1>Food, Handled</h1>
      <p>You don’t have to think about food.</p>
      <p>Tap once. Dinner shows up.</p>

      <div class="actions">
        <button id="goTonight" class="btn primary" type="button">Handle my food</button>
        <button id="showTonight" class="btn secondary" type="button">Show me tonight</button>
      </div>

      <p class="kicker">No account. No setup. Nothing to remember.</p>

      <details class="advanced">
        <summary>Advanced (ignore this)</summary>

        <div class="panel" style="margin-top:10px;">
          <div class="panel-title">Bias (saved)</div>
          <p class="kicker">Optional. If you ignore this, it still works.</p>
          <div class="pills" role="group" aria-label="Bias">
            <button class="pill ${state.bias==="balanced"?"active":""}" data-bias="balanced" type="button">Balanced</button>
            <button class="pill ${state.bias==="healthier"?"active":""}" data-bias="healthier" type="button">Healthier</button>
            <button class="pill ${state.bias==="comfort"?"active":""}" data-bias="comfort" type="button">Comfort</button>
          </div>

          <div style="margin-top:14px;">
            <div class="panel-title">Foods I like (optional keywords)</div>
            <div class="fieldrow">
              <input id="kwInputTop" class="input" placeholder="e.g., tacos, bowls, italian, chicken" />
              <button id="kwAddTop" class="btn secondary" type="button">Add</button>
              <button id="kwClearTop" class="btn quiet" type="button">Clear</button>
            </div>
            <div class="chips">
              ${state.keywords.length ? state.keywords.map(k=>`
                <span class="chip">${escapeHtml(k)} <button class="x" data-k="${escapeHtml(k)}" type="button">×</button></span>
              `).join("") : `<span class="kicker">Nothing yet.</span>`}
            </div>
          </div>
        </div>
      </details>
    </div>
  `;
}

function tonightScreen(){
  // Ensure tonight options exist
  if(!state.tonightPair) buildTonightPair();
  const [aId, bId] = state.tonightPair;
  const a = MEALS.find(m=>m.id===aId);
  const b = MEALS.find(m=>m.id===bId);

  const remaining = Math.max(0, state.refreshLimit - state.refreshesUsed);

  return `
    <div>
      <div class="badge">Tonight is handled</div>
      <h2 style="margin-top:10px;">Tonight</h2>

      <div class="panel">
        <div class="panel-title">Do this</div>
        <p class="kicker">Choose one. Or let it choose for you.</p>

        <div class="panel-title" style="margin-top:12px;">Not this</div>
        <ul class="list">
          <li>No planning</li>
          <li>No recipe hunting</li>
          <li>No prep marathon</li>
          <li>No spiral</li>
        </ul>

        <div class="actions">
          <button id="pickForMe" class="btn primary" type="button">Pick for me</button>
          <button id="chooseMyself" class="btn quiet" type="button">Choose myself</button>
          <button id="seeSet" class="btn quiet" type="button">See the meal set</button>
        </div>

        <div class="footerline">
          You can refresh <b>${remaining}</b> time${remaining===1?"":"s"} — then we stop.
        </div>

        <details class="advanced">
          <summary>Advanced (ignore this)</summary>

          <div class="panel" style="margin-top:10px;">
            <div class="panel-title">Bias (saved)</div>
            <div class="pills">
              <button class="pill ${state.bias==="balanced"?"active":""}" data-bias="balanced" type="button">Balanced</button>
              <button class="pill ${state.bias==="healthier"?"active":""}" data-bias="healthier" type="button">Healthier</button>
              <button class="pill ${state.bias==="comfort"?"active":""}" data-bias="comfort" type="button">Comfort</button>
            </div>

            <div style="margin-top:14px;">
              <div class="panel-title">Foods I like (optional keywords)</div>
              <div class="fieldrow">
                <input id="kwInputTonight" class="input" placeholder="e.g., tacos, bowls, italian, chicken" />
                <button id="kwAddTonight" class="btn secondary" type="button">Add</button>
                <button id="kwClearTonight" class="btn quiet" type="button">Clear</button>
              </div>
              <div class="chips">
                ${state.keywords.length ? state.keywords.map(k=>`
                  <span class="chip">${escapeHtml(k)} <button class="x" data-k="${escapeHtml(k)}" type="button">×</button></span>
                `).join("") : `<span class="kicker">Nothing yet.</span>`}
              </div>
            </div>

            <div class="footerline">Golden Rule stays intact: no profiles, no onboarding, no spiraling.</div>
          </div>
        </details>
      </div>

      <div id="choiceArea" style="margin-top:14px;">
        <div class="grid2">
          ${mealCard(a)}
          ${mealCard(b)}
        </div>

        <div class="actions" style="margin-top:14px;">
          <button id="differentTonight" class="btn secondary" type="button" ${remaining===0 ? "disabled" : ""}>
            Pick a different tonight
          </button>
          <button id="backTop" class="btn quiet" type="button">Back</button>
        </div>

        <div class="footerline">You can stop here.</div>
      </div>
    </div>
  `;
}

function resultScreen(){
  const chosen = MEALS.find(m=>m.id===state.chosenMeal) || (state.tonightPair ? MEALS.find(m=>m.id===state.tonightPair[0]) : null);

  if(!chosen){
    location.hash = "#tonight";
    return "";
  }

  return `
    <div>
      <div class="badge">That’s it.</div>
      <h2 style="margin-top:10px;">Dinner decided</h2>
      <p>Close the tab whenever.</p>

      <div class="panel">
        <div class="meal-name">${escapeHtml(chosen.name)}</div>
        <div class="meal-tags">${escapeHtml(chosen.tags.join(" • "))}</div>

        <div class="actions">
          <button id="lockThis" class="btn primary" type="button">Lock this (I liked it)</button>
          <button id="newDecision" class="btn secondary" type="button">New decision</button>
          <button id="backTonight" class="btn quiet" type="button">Back</button>
        </div>

        <div class="footerline">Optional memory. No profiles. No thinking.</div>
      </div>
    </div>
  `;
}

function setScreen(){
  ensureMealSet();
  const setMeals = state.mealSet.map(id => MEALS.find(m=>m.id===id)).filter(Boolean);

  return `
    <div>
      <div class="badge">Small set</div>
      <h2 style="margin-top:10px;">The meal set</h2>
      <p>Familiar food. Minimal cleanup. Same effort.</p>
      <p>Ingredients repeat so shopping stays short.</p>

      <div class="panel">
        ${setMeals.map(m=>`
          <div style="margin-bottom:12px;">
            <div class="meal-name">${escapeHtml(m.name)}</div>
            <div class="meal-tags">${escapeHtml(m.tags.join(" • "))}</div>
          </div>
        `).join("")}

        <div class="actions">
          <button id="openGrocery" class="btn primary" type="button">Open grocery list (short)</button>
          <button id="backTonight2" class="btn secondary" type="button">Back to tonight</button>
          <button id="rechooseSet" class="btn quiet" type="button">Rechoose my meals</button>
        </div>

        <div id="groceryArea" style="margin-top:12px; display:none;">
          <hr />
          <div class="panel-title">What to buy</div>
          <p class="kicker">Stays closed unless you open it.</p>
          <ul class="list">
            ${groceryShortList(setMeals).map(x=>`<li>${escapeHtml(x)}</li>`).join("")}
          </ul>
        </div>

        <div class="footerline">You can stop here.</div>
      </div>
    </div>
  `;
}

function groceryShortList(setMeals){
  // Merge short lists, keep it tight
  const items = [];
  setMeals.forEach(m => (m.short || []).forEach(i => items.push(i)));
  const uniq = [...new Set(items.map(x=>x.toLowerCase()))];

  // Convert into a minimal universal list
  // Keep it short and generic; this is a prototype.
  const normalized = uniq.map(x=>{
    if(x.includes("protein")) return "Protein (chicken / turkey / eggs)";
    if(x.includes("tortillas")) return "Carb base (tortillas / rice / pasta)";
    if(x.includes("rice")) return "Carb base (rice / tortillas / pasta)";
    if(x.includes("pasta")) return "Carb base (rice / tortillas / pasta)";
    if(x.includes("greens") || x.includes("salad")) return "Veg (frozen mix or salad kit)";
    if(x.includes("marinara") || x.includes("salsa") || x.includes("sauce")) return "Sauce/toppings (salsa, dressing, etc.)";
    if(x.includes("eggs")) return "Protein (chicken / turkey / eggs)";
    return x;
  });

  // De-dupe again after normalization
  return [...new Set(normalized)].slice(0, 7);
}

function mealCard(m){
  if(!m) return "";
  return `
    <div class="meal-card">
      <div class="meal-name">${escapeHtml(m.name)}</div>
      <div class="meal-tags">${escapeHtml(m.tags.join(" • "))}</div>
      <button class="btn secondary" data-choose="${escapeHtml(m.id)}" type="button">Choose</button>
    </div>
  `;
}

function render(){
  setResetVisibility();

  const r = route();
  if(r === "top") elApp.innerHTML = topScreen();
  if(r === "tonight") elApp.innerHTML = tonightScreen();
  if(r === "result") elApp.innerHTML = resultScreen();
  if(r === "set") elApp.innerHTML = setScreen();

  wire();
}

function wire(){
  // TOP
  const goTonight = document.getElementById("goTonight");
  if(goTonight){
    goTonight.addEventListener("click", () => {
      resetRefreshCounter();
      state.tonightPair = null;
      state.chosenMeal = null;
      saveState(state);
      location.hash = "#tonight";
    });
  }

  const showTonight = document.getElementById("showTonight");
  if(showTonight){
    showTonight.addEventListener("click", () => {
      resetRefreshCounter();
      location.hash = "#tonight";
    });
  }

  // Bias pills
  document.querySelectorAll("[data-bias]").forEach(btn=>{
    btn.addEventListener("click", () => {
      setBias(btn.getAttribute("data-bias"));
      // changing bias should refresh tonight options
      state.tonightPair = null;
      state.chosenMeal = null;
      saveState(state);
      render();
    });
  });

  // Keywords add/remove/clear (top)
  const kwInputTop = document.getElementById("kwInputTop");
  const kwAddTop = document.getElementById("kwAddTop");
  const kwClearTop = document.getElementById("kwClearTop");
  if(kwInputTop && kwAddTop){
    kwAddTop.addEventListener("click", () => {
      addKeyword(kwInputTop.value);
      kwInputTop.value = "";
      state.tonightPair = null;
      saveState(state);
      render();
    });
  }
  if(kwClearTop){
    kwClearTop.addEventListener("click", () => {
      state.keywords = [];
      saveState(state);
      render();
    });
  }

  // Keywords add/remove/clear (tonight)
  const kwInputTonight = document.getElementById("kwInputTonight");
  const kwAddTonight = document.getElementById("kwAddTonight");
  const kwClearTonight = document.getElementById("kwClearTonight");
  if(kwInputTonight && kwAddTonight){
    kwAddTonight.addEventListener("click", () => {
      addKeyword(kwInputTonight.value);
      kwInputTonight.value = "";
      state.tonightPair = null;
      saveState(state);
      render();
    });
  }
  if(kwClearTonight){
    kwClearTonight.addEventListener("click", () => {
      state.keywords = [];
      saveState(state);
      render();
    });
  }

  // Keyword chip remove
  document.querySelectorAll(".chip .x").forEach(x=>{
    x.addEventListener("click", () => {
      const k = x.getAttribute("data-k");
      if(k) removeKeyword(k);
      state.tonightPair = null;
      saveState(state);
      render();
    });
  });

  // TONIGHT actions
  const pickForMe = document.getElementById("pickForMe");
  if(pickForMe){
    pickForMe.addEventListener("click", () => {
      // choose one of the pair, weighted
      const pairMeals = (state.tonightPair || []).map(id=>MEALS.find(m=>m.id===id)).filter(Boolean);
      const chosen = weightedPick(pairMeals.length ? pairMeals : MEALS);
      chooseMeal(chosen.id);
    });
  }

  const chooseMyself = document.getElementById("chooseMyself");
  if(chooseMyself){
    chooseMyself.addEventListener("click", () => {
      // no change needed; cards are already visible
      // but we keep this as a "permission" tap for anxious users
      // Golden Rule: it does nothing except reassure.
      flashBadge("You can choose. Or let it choose.");
    });
  }

  const seeSet = document.getElementById("seeSet");
  if(seeSet){
    seeSet.addEventListener("click", () => {
      location.hash = "#set";
    });
  }

  // Choose card
  document.querySelectorAll("[data-choose]").forEach(btn=>{
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-choose");
      chooseMeal(id);
    });
  });

  // Different tonight
  const differentTonight = document.getElementById("differentTonight");
  if(differentTonight){
    differentTonight.addEventListener("click", () => {
      if(state.refreshesUsed >= state.refreshLimit) return;
      refreshTonight();
      render();
    });
  }

  const backTop = document.getElementById("backTop");
  if(backTop){
    backTop.addEventListener("click", () => {
      location.hash = "#top";
    });
  }

  // RESULT
  const lockThis = document.getElementById("lockThis");
  if(lockThis){
    lockThis.addEventListener("click", () => {
      // simple memory: push chosen into front of meal set and keep it
      ensureMealSet();
      const id = state.chosenMeal;
      if(id){
        const next = [id, ...state.mealSet.filter(x=>x!==id)].slice(0,5);
        state.mealSet = next;
        saveState(state);
      }
      flashBadge("Locked.");
    });
  }

  const newDecision = document.getElementById("newDecision");
  if(newDecision){
    newDecision.addEventListener("click", () => {
      resetRefreshCounter();
      state.tonightPair = null;
      state.chosenMeal = null;
      saveState(state);
      location.hash = "#tonight";
    });
  }

  const backTonight = document.getElementById("backTonight");
  if(backTonight){
    backTonight.addEventListener("click", () => {
      location.hash = "#tonight";
    });
  }

  // SET
  const openGrocery = document.getElementById("openGrocery");
  const groceryArea = document.getElementById("groceryArea");
  if(openGrocery && groceryArea){
    openGrocery.addEventListener("click", () => {
      groceryArea.style.display = groceryArea.style.display === "none" ? "block" : "none";
      openGrocery.textContent = groceryArea.style.display === "none"
        ? "Open grocery list (short)"
        : "Close grocery list";
    });
  }

  const backTonight2 = document.getElementById("backTonight2");
  if(backTonight2){
    backTonight2.addEventListener("click", () => location.hash = "#tonight");
  }

  const rechooseSet = document.getElementById("rechooseSet");
  if(rechooseSet){
    rechooseSet.addEventListener("click", () => {
      state.mealSet = null;
      state.tonightPair = null;
      state.chosenMeal = null;
      saveState(state);
      ensureMealSet();
      render();
    });
  }
}

function flashBadge(text){
  // lightweight, non-modal reassurance (Golden Rule: no extra work)
  const el = document.querySelector(".badge");
  if(!el) return;
  const original = el.textContent;
  el.textContent = text;
  el.style.opacity = "1";
  setTimeout(()=>{ el.textContent = original; }, 900);
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// Boot
(function init(){
  setResetVisibility();

  // If user lands mid-flow and has no pair, build it.
  if(route() === "tonight" && !state.tonightPair) buildTonightPair();
  render();
})();
