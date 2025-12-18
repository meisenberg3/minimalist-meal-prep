/* patch.js — v1.1
   Fixes:
   1) "Decide tonight" must go straight to TONIGHT (no grocery-first).
   2) "Decide my week" must go to MEAL SET (week context).
   3) Grocery list must NEVER auto-open (only opens when user taps it).

   Works by:
   - Finding your existing section ids (#s1/#s2/#s3 etc)
   - Overriding the two home buttons’ click behavior
   - Preventing accidental redirects to grocery for "tonight"
   - Forcing any grocery accordion/details to be closed unless user explicitly opens it
*/

(() => {
  // ---- Persistent flags (lightweight)
  const LS_ENTRY = "fh_entry_mode";   // "tonight" | "week"
  const LS_GROC  = "fh_grocery_open"; // "1" only when user explicitly opens it

  const norm = (s) => (s || "").trim().toLowerCase();

  const $all = (sel) => Array.from(document.querySelectorAll(sel));

  function setEntry(mode) {
    try { localStorage.setItem(LS_ENTRY, mode); } catch {}
  }
  function getEntry() {
    try { return localStorage.getItem(LS_ENTRY) || ""; } catch { return ""; }
  }
  function setGroceryOpened(v) {
    try { localStorage.setItem(LS_GROC, v ? "1" : ""); } catch {}
  }
  function groceryWasOpened() {
    try { return localStorage.getItem(LS_GROC) === "1"; } catch { return false; }
  }

  // ---- Find page IDs robustly
  function findPageIdByHeading(text) {
    const t = norm(text);
    const headings = $all("h1,h2,h3");
    const hit = headings.find(h => norm(h.textContent) === t);
    if (!hit) return null;

    // Walk up to parent with id s#
    let el = hit;
    for (let i = 0; i < 10; i++) {
      if (!el) break;
      const id = el.getAttribute && el.getAttribute("id");
      if (id && /^s\d+$/i.test(id)) return id;
      el = el.parentElement;
    }
    return null;
  }

  function resolveIds() {
    // In your newer builds: s1=Tonight, s2=Meal set, s3=Grocery
    const tonightId =
      (document.getElementById("s1") && "s1") ||
      findPageIdByHeading("Tonight") ||
      "s1";

    const mealSetId =
      (document.getElementById("s2") && "s2") ||
      findPageIdByHeading("The meal set") ||
      findPageIdByHeading("Meal set") ||
      "s2";

    const groceryId =
      (document.getElementById("s3") && "s3") ||
      findPageIdByHeading("What to buy") ||
      "s3";

    return { tonightId, mealSetId, groceryId };
  }

  function goTo(id) {
    // Keep using your hash router
    location.hash = `#${id}`;
  }

  // ---- Grocery: force closed unless user explicitly opens it
  function closeGroceryUI(force = false) {
    // details pattern
    $all("details").forEach(d => {
      // Only force-close if not explicitly opened or if force requested
      if (force || !groceryWasOpened()) d.open = false;
    });

    // accordion pattern (your v2.3 uses #groceryContent with class "show")
    const groceryContent = document.getElementById("groceryContent");
    if (groceryContent) {
      if (force || !groceryWasOpened()) groceryContent.classList.remove("show");
    }

    // If you have any other “open” patterns, keep them closed too
    const maybeOpenPanels = $all(".accordionContent.show");
    if (maybeOpenPanels.length) {
      if (force || !groceryWasOpened()) {
        maybeOpenPanels.forEach(p => p.classList.remove("show"));
      }
    }
  }

  // When user explicitly opens grocery, we mark it as opened.
  function bindExplicitGroceryOpenTracking() {
    // Common explicit open buttons
    const explicitTriggers = [
      "#groceryToggle",
      "summary",
      "button",
      "a"
    ];

    document.addEventListener("click", (e) => {
      const el = e.target.closest(explicitTriggers.join(","));
      if (!el) return;

      const txt = norm(el.textContent);

      // Explicit grocery intents
      if (
        txt.includes("open grocery") ||
        txt.includes("grocery list") ||
        txt.includes("if i need to shop") ||
        txt.includes("need to shop") ||
        el.id === "groceryToggle"
      ) {
        setGroceryOpened(true);
      }
    }, true);
  }

  // ---- Button binding (find by id if possible, else by text)
  function findButtonByText(texts) {
    const candidates = $all("button,a");
    const targets = texts.map(norm);
    return candidates.find(el => targets.includes(norm(el.textContent)));
  }

  function bindButtons() {
    const { tonightId, mealSetId, groceryId } = resolveIds();

    // Try find your home buttons by ID first (if you have them), else by text.
    const btnWeek =
      document.querySelector("#btnWeek, #btnHandle, [data-action='week']") ||
      findButtonByText(["Decide my week", "Handle my food"]);

    const btnTonight =
      document.querySelector("#btnTonight, #btnShowTonight, [data-action='tonight']") ||
      findButtonByText(["Decide tonight", "Show me tonight"]);

    // Update visible labels (so it’s consistent even if old text is present)
    if (btnWeek) btnWeek.textContent = "Decide my week";
    if (btnTonight) btnTonight.textContent = "Decide tonight";

    // IMPORTANT:
    // - Decide tonight MUST go to Tonight screen (not grocery)
    // - Decide my week MUST go to Meal Set screen (not Tonight)
    if (btnWeek) {
      btnWeek.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        setEntry("week");
        setGroceryOpened(false);       // never auto-open grocery on entry
        closeGroceryUI(true);

        goTo(mealSetId);
      }, true);
    }

    if (btnTonight) {
      btnTonight.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        setEntry("tonight");
        setGroceryOpened(false);       // never auto-open grocery on entry
        closeGroceryUI(true);

        goTo(tonightId);
      }, true);
    }

    // Safety net:
    // If user intent is "tonight" and we ever land on grocery, auto-redirect to Tonight.
    function enforceTonightFirst() {
      const entry = getEntry();
      const hash = (location.hash || "").replace("#", "");
      if (entry === "tonight" && hash === groceryId) {
        closeGroceryUI(true);
        goTo(tonightId);
      }
    }

    window.addEventListener("hashchange", () => {
      // Always keep grocery closed unless explicitly opened
      closeGroceryUI(false);
      enforceTonightFirst();
    });

    // Initial enforcement on load
    closeGroceryUI(false);
    enforceTonightFirst();
  }

  // ---- Boot
  function init() {
    bindExplicitGroceryOpenTracking();
    bindButtons();
    // Always default grocery to closed on boot (unless user explicitly opened it)
    closeGroceryUI(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
