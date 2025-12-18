/* patch-v2.4.js
   Goal:
   - Make the two buttons DO different things:
     1) Decide my week  -> generates (or keeps) a meal set + picks tonight
     2) Decide tonight  -> picks tonight ONLY (prefers from current set), does NOT re-roll week
   - Works even if you didn’t add IDs (it will find buttons by text)
*/

(() => {
  const LS_SET_KEY = "fh_meal_set_v1";
  const LS_TONIGHT_KEY = "fh_tonight_pick_v1";
  const LS_TONIGHT_ONLY_KEY = "fh_tonight_only_v1";

  // ---- Helpers
  const safeJSON = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },
    del(key) {
      localStorage.removeItem(key);
    },
  };

  function uniq(arr) {
    return Array.from(new Set(arr));
  }

  function shuffle(a) {
    const arr = [...a];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function pickOne(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Try to pull your existing meals from anywhere you might already have them.
  // If your main code defines window.MEALS or window.APP_MEALS, we’ll use it.
  function getMealPool() {
    const pool =
      (Array.isArray(window.APP_MEALS) && window.APP_MEALS) ||
      (Array.isArray(window.MEALS) && window.MEALS) ||
      (Array.isArray(window.meals) && window.meals) ||
      null;

    if (pool && pool.length) return pool;

    // Fallback pool (won’t be used if your app already has meals)
    return [
      { id: "chicken_quesadillas", title: "Chicken quesadillas", meta: "≤12 min • pan + plate", do: ["Add tortilla", "Cheese + chicken", "Flip", "Eat"] },
      { id: "chicken_pesto_pasta", title: "Chicken pesto pasta", meta: "≤15 min • pot + bowl", do: ["Boil pasta", "Add pesto", "Add chicken", "Eat"] },
      { id: "meatball_subs", title: "Meatball subs (lazy)", meta: "≤12 min • tray + plate", do: ["Heat meatballs", "Add marinara", "Toast roll", "Eat"] },
    ];
  }

  function mealId(m) {
    return m.id || m.title || JSON.stringify(m);
  }

  function getCurrentSet() {
    return safeJSON.get(LS_SET_KEY, null);
  }

  function setCurrentSet(meals) {
    safeJSON.set(LS_SET_KEY, meals);
  }

  function setTonight(meal) {
    safeJSON.set(LS_TONIGHT_KEY, meal);
  }

  function go(hash) {
    // Keeps it compatible with your existing #s1 #s2 #s3 routing
    location.hash = hash;
  }

  // ---- Core behaviors
  function decideMyWeek({ forceReroll = false } = {}) {
    const pool = getMealPool();
    let set = getCurrentSet();

    if (!set || !Array.isArray(set) || set.length < 3 || forceReroll) {
      // default: pick 3 meals for the week
      const picked = shuffle(pool).slice(0, 3);
      set = picked;
      setCurrentSet(set);
    }

    // Tonight = one meal from the set
    const tonight = pickOne(set);
    setTonight(tonight);

    // This is a “week decision”, not “tonight only”
    safeJSON.del(LS_TONIGHT_ONLY_KEY);

    // Go straight to Tonight screen (your app already shows set + grocery behind buttons)
    go("#s3");
  }

  function decideTonightOnly() {
    const pool = getMealPool();
    const set = getCurrentSet();

    // Prefer choosing from existing set (so it feels consistent + less shopping)
    const tonight =
      (Array.isArray(set) && set.length ? pickOne(set) : null) ||
      pickOne(pool);

    setTonight(tonight);

    // Mark that user asked for “tonight only”
    safeJSON.set(LS_TONIGHT_ONLY_KEY, true);

    // IMPORTANT: do NOT reroll the week here
    go("#s3");
  }

  // ---- Wire up buttons (by id if present, else by visible text)
  function findButtonByText(possibleTexts) {
    const buttons = Array.from(document.querySelectorAll("button, a"));
    const normalized = (s) => (s || "").trim().toLowerCase();
    const targets = possibleTexts.map((t) => normalized(t));

    return buttons.find((el) => targets.includes(normalized(el.textContent)));
  }

  function bind() {
    // If you already have ids, we’ll use them first.
    const btnWeek =
      document.querySelector("#btnHandle, #btnWeek, [data-action='week']") ||
      findButtonByText(["Handle my food"]);

    const btnTonight =
      document.querySelector("#btnTonight, [data-action='tonight']") ||
      findButtonByText(["Show me tonight"]);

    if (btnWeek) {
      btnWeek.textContent = "Decide my week";
      btnWeek.addEventListener("click", (e) => {
        e.preventDefault();
        decideMyWeek({ forceReroll: false });
      });
    }

    if (btnTonight) {
      btnTonight.textContent = "Decide tonight";
      btnTonight.addEventListener("click", (e) => {
        e.preventDefault();
        decideTonightOnly();
      });
    }
  }

  // Ensure we bind after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }

  // Optional: expose for debugging in console
  window.FH_PATCH = { decideMyWeek, decideTonightOnly };
})();
