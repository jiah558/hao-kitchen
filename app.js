/**
 * 豪の小锅小灶 — pure static
 * Local (file://): localStorage key home-menu-v2
 * Hosted (http/https): shared data/menu.json + admin password edit
 * Primary UX: 我的菜谱 list → detail recipe editor
 */
(function () {
  "use strict";

  const STORAGE_KEY = "home-menu-v2";
  const ADMIN_SESSION_KEY = "home-menu-admin";
  const GH_TOKEN_KEY = "home-menu-gh-token";
  const CFG = window.HOME_MENU_CONFIG || {};
  const isHosted =
    location.protocol === "http:" || location.protocol === "https:";
  let isAdmin = !isHosted;
  if (isHosted) {
    try {
      isAdmin = sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
    } catch (e) {
      isAdmin = false;
    }
  }

  function canEdit() {
    return !isHosted || isAdmin;
  }
  const CATEGORIES = ["荤菜炒菜", "小菜素菜", "特色主食", "饮品"];

  const CATEGORY_ALIASES = {
    "荤菜": "荤菜炒菜",
    "素菜": "小菜素菜",
    "汤羹": "小菜素菜",
    "主食": "特色主食",
    "小吃": "小菜素菜",
    "荤菜炒菜": "荤菜炒菜",
    "小菜素菜": "小菜素菜",
    "特色主食": "特色主食",
    "饮品": "饮品",
  };

  function migrateCategory(cat) {
    if (CATEGORY_ALIASES[cat]) return CATEGORY_ALIASES[cat];
    if (CATEGORIES.indexOf(cat) !== -1) return cat;
    return "荤菜炒菜";
  }

  const MEALS = [
    { key: "breakfast", label: "早餐" },
    { key: "lunch", label: "午餐" },
    { key: "dinner", label: "晚餐" },
  ];
  const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

  function nowIso() {
    return new Date().toISOString();
  }

  function makeDish(partial) {
    return {
      id: partial.id,
      name: partial.name,
      category: partial.category || "荤菜炒菜",
      rating: typeof partial.rating === "number" ? partial.rating : 3,
      notes: partial.notes || "",
      ingredients: Array.isArray(partial.ingredients) ? partial.ingredients : [],
      recipe: partial.recipe || "",
      keypoints: partial.keypoints || "",
      tags: Array.isArray(partial.tags) ? partial.tags : [],
      updatedAt: partial.updatedAt || nowIso(),
    };
  }

  // ——— Seed: user's dishes only (no demo tomato-egg set) ———
  const SEED_DISHES = [
    makeDish({ id: "seed-01", name: "辣椒炒肉", category: "荤菜炒菜", rating: 3, notes: "开源自@" }),
    makeDish({
      id: "seed-02",
      name: "韭黄炒蛋炒肉",
      category: "荤菜炒菜",
      rating: 4,
      notes: "可选盖码饭or汤粉",
    }),
    makeDish({
      id: "seed-03",
      name: "农家一碗香",
      category: "荤菜炒菜",
      rating: 2.5,
      notes: "测试版2.0",
    }),
    makeDish({ id: "seed-04", name: "生烧排骨", category: "荤菜炒菜", rating: 4, notes: "开源自@" }),
    makeDish({ id: "seed-05", name: "西芹炒牛肉", category: "荤菜炒菜", rating: 3.5, notes: "开源自@" }),
    makeDish({ id: "seed-06", name: "香菜牛肉", category: "荤菜炒菜", rating: 3, notes: "开源自@" }),
    makeDish({
      id: "seed-07",
      name: "豪牌鸡公煲",
      category: "荤菜炒菜",
      rating: 2.5,
      notes: "测试版3.0",
    }),
    makeDish({
      id: "seed-08",
      name: "衡阳茶油小炒鸡",
      category: "荤菜炒菜",
      rating: 2.5,
      notes: "待升级",
    }),
    makeDish({
      id: "seed-09",
      name: "临沂炒鸡",
      category: "荤菜炒菜",
      rating: 3,
      notes: "贾冰版",
    }),
    makeDish({ id: "seed-10", name: "可乐鸡翅", category: "荤菜炒菜", rating: 4, notes: "开源自@" }),
    makeDish({ id: "seed-11", name: "红烧肉", category: "荤菜炒菜", rating: 4, notes: "开源自@" }),
    makeDish({ id: "seed-12", name: "丝瓜蛋汤", category: "小菜素菜", rating: 3, notes: "开源自@" }),
    makeDish({
      id: "seed-13",
      name: "炒时蔬",
      category: "小菜素菜",
      rating: 2.5,
      notes: "油麦菜/娃娃菜/上海青",
    }),
    makeDish({ id: "seed-14", name: "豪牌炒方便面", category: "特色主食", rating: 3, notes: "开源自@" }),
    makeDish({
      id: "seed-15",
      name: "豪牌蛋炒饭",
      category: "特色主食",
      rating: 3,
      notes: "金包银/经典/酱香型",
    }),
    makeDish({ id: "seed-16", name: "胖东来葡萄汁", category: "饮品", rating: 3.5, notes: "" }),
    makeDish({ id: "seed-17", name: "胖东来橙汁", category: "饮品", rating: 2.5, notes: "" }),
    makeDish({
      id: "seed-18",
      name: "港版可乐",
      category: "饮品",
      rating: 3,
      notes: "无糖/柠檬",
    }),
    makeDish({ id: "seed-19", name: "保拉纳白啤", category: "饮品", rating: 3, notes: "" }),
  ];

  // ——— State ———
  /** @type {{ dishes: any[], weeks: Record<string, any>, shoppingDone: Record<string, boolean> }} */
  let state = { dishes: [], weeks: {}, shoppingDone: {} };
  let currentWeekStart = getMonday(new Date());
  let pickCtx = null;
  let toastTimer = null;
  let currentDetailId = null;
  let detailDirty = false;
  let loadError = null;

  // ——— Utils ———
  function uid() {
    return "d-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function formatDate(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function parseDate(str) {
    const [y, m, day] = str.split("-").map(Number);
    return new Date(y, m - 1, day);
  }

  function getMonday(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return formatDate(d);
  }

  function addDays(dateStr, n) {
    const d = parseDate(dateStr);
    d.setDate(d.getDate() + n);
    return formatDate(d);
  }

  function weekDates(mondayStr) {
    return WEEKDAY_LABELS.map(function (label, i) {
      return {
        label: label,
        dateKey: addDays(mondayStr, i),
        date: parseDate(addDays(mondayStr, i)),
      };
    });
  }

  function prevWeekStart(mondayStr) {
    return addDays(mondayStr, -7);
  }

  function nextWeekStart(mondayStr) {
    return addDays(mondayStr, 7);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showToast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.hidden = true;
    }, 2200);
  }

  function clampRating(n) {
    const x = Math.round(Number(n) * 2) / 2;
    if (isNaN(x)) return 3;
    return Math.max(0, Math.min(5, x));
  }

  function formatRating(n) {
    const r = clampRating(n);
    return Number.isInteger(r) ? String(r) : r.toFixed(1);
  }

  /** Render read-only half-star display */
  function renderStarsHtml(rating, sizeClass) {
    const r = clampRating(rating);
    let html = '<span class="stars' + (sizeClass ? " " + sizeClass : "") + '" aria-label="' + formatRating(r) + ' 星">';
    for (let i = 1; i <= 5; i++) {
      let cls = "star";
      if (r >= i) cls += " full";
      else if (r >= i - 0.5) cls += " half";
      html += '<span class="' + cls + '"></span>';
    }
    html += "</span>";
    return html;
  }

  function formatUpdatedAt(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return (
        "上次更新 " +
        d.getFullYear() +
        "-" +
        pad(d.getMonth() + 1) +
        "-" +
        pad(d.getDate()) +
        " " +
        pad(d.getHours()) +
        ":" +
        pad(d.getMinutes())
      );
    } catch (e) {
      return "";
    }
  }

  function normalizeDish(raw) {
    if (!raw || typeof raw !== "object") return null;
    const cat = migrateCategory(raw.category);
    return makeDish({
      id: raw.id || uid(),
      name: String(raw.name || "").trim() || "未命名",
      category: cat,
      rating: clampRating(raw.rating != null ? raw.rating : 3),
      notes: String(raw.notes || raw.subtitle || ""),
      ingredients: typeof raw.ingredients === "string" || (!Array.isArray(raw.ingredients) && typeof raw.ingredientsText === "string")
        ? parseIngredientsText(typeof raw.ingredients === "string" ? raw.ingredients : raw.ingredientsText)
        : Array.isArray(raw.ingredients)
        ? raw.ingredients
            .map(function (i) {
              if (typeof i === "string") return { name: i, amount: "" };
              return { name: String((i && i.name) || ""), amount: String((i && i.amount) || "") };
            })
            .filter(function (i) {
              return i.name;
            })
        : [],
      recipe: String(raw.recipe || ""),
      keypoints: String(raw.keypoints || ""),
      tags: Array.isArray(raw.tags)
        ? raw.tags.map(String)
        : typeof raw.tags === "string"
          ? raw.tags.split(/[,，、]/).map(function (t) { return t.trim(); }).filter(Boolean)
          : [],
      updatedAt: raw.updatedAt || nowIso(),
    });
  }


  // 开源自@ 缩写：长的 key 必须排在前面（dao 先于 d）
  var SOURCE_SHORT = [
    { key: "dao", name: "刀哥拿手菜" },
    { key: "d", name: "大庆是个厨" },
    { key: "f", name: "fish吃了没" },
    { key: "c", name: "村驴" },
    { key: "z", name: "自创" },
  ];

  function expandSourceNote(notes) {
    var s = String(notes || "").trim();
    if (!s) return s;
    var i, item, reExact, reHead;
    for (i = 0; i < SOURCE_SHORT.length; i++) {
      item = SOURCE_SHORT[i];
      reExact = new RegExp("^开源自@\\s*" + item.key + "\\s*$", "i");
      if (reExact.test(s)) return "开源自@" + item.name;
    }
    for (i = 0; i < SOURCE_SHORT.length; i++) {
      item = SOURCE_SHORT[i];
      reHead = new RegExp("^开源自@\\s*" + item.key + "(?=\\s|[·,，、]|$)", "i");
      if (reHead.test(s)) {
        return s.replace(reHead, "开源自@" + item.name);
      }
    }
    return s;
  }

  function isDrinkCategory(cat) {
    return migrateCategory(cat || "") === "饮品";
  }

  function ensureDefaultNotes() {
    var changed = false;
    state.dishes.forEach(function (d) {
      if (!d) return;
      // 饮品不需要「开源自@」小字：空着就保持空；旧的默认占位清掉
      if (isDrinkCategory(d.category)) {
        var n = String(d.notes || "").trim();
        if (!n || n === "开源自@" || /^开源自@\s*$/.test(n)) {
          if (d.notes) {
            d.notes = "";
            changed = true;
          }
        }
        return;
      }
      if (!String(d.notes || "").trim()) {
        d.notes = "开源自@";
        changed = true;
      }
      var expanded = expandSourceNote(d.notes);
      if (expanded !== d.notes) {
        d.notes = expanded;
        changed = true;
      }
    });
    return changed;
  }

  // ——— Persistence ———
  function applyParsedState(parsed) {
    state = {
      dishes: Array.isArray(parsed.dishes)
        ? parsed.dishes.map(normalizeDish).filter(Boolean)
        : [],
      weeks: parsed.weeks && typeof parsed.weeks === "object" ? parsed.weeks : {},
      shoppingDone:
        parsed.shoppingDone && typeof parsed.shoppingDone === "object"
          ? parsed.shoppingDone
          : {},
    };
    state.dishes.forEach(function (d) {
      if (d.name === "豪牌炒方便面" || d.name === "豪牌蛋炒饭") {
        d.category = "特色主食";
      }
    });
    ensureDefaultNotes();
  }

  function seedState() {
    return {
      dishes: SEED_DISHES.map(function (d) {
        return JSON.parse(JSON.stringify(d));
      }),
      weeks: {},
      shoppingDone: {},
    };
  }

  function payloadFromState() {
    return {
      version: 2,
      updatedAt: nowIso(),
      dishes: state.dishes,
      weeks: state.weeks,
      shoppingDone: state.shoppingDone,
    };
  }

  function cacheStateLocally(payload) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload || payloadFromState()));
    } catch (e) {
      console.warn("cacheStateLocally failed", e);
    }
  }

  function loadStateLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        state = seedState();
        ensureDefaultNotes();
        cacheStateLocally(payloadFromState());
        return;
      }
      applyParsedState(JSON.parse(raw));
      cacheStateLocally(payloadFromState());
    } catch (e) {
      console.warn("loadStateLocal failed, reseeding", e);
      state = seedState();
      ensureDefaultNotes();
      cacheStateLocally(payloadFromState());
    }
  }

  function showLoadError(msg) {
    loadError = msg;
    let banner = document.getElementById("load-error-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "load-error-banner";
      banner.className = "load-error-banner";
      const main = document.querySelector(".main");
      if (main) main.insertBefore(banner, main.firstChild);
      else document.body.prepend(banner);
    }
    banner.textContent = msg;
    banner.hidden = false;
  }

  function clearLoadError() {
    loadError = null;
    const banner = document.getElementById("load-error-banner");
    if (banner) banner.hidden = true;
  }

  async function loadStateShared() {
    clearLoadError();
    const base = CFG.sharedDataUrl || "./data/menu.json";
    const url = base + (base.indexOf("?") === -1 ? "?" : "&") + "t=" + Date.now();
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      applyParsedState(data);
      cacheStateLocally(payloadFromState());
    } catch (e) {
      console.warn("loadStateShared failed", e);
      showLoadError("无法加载共享菜单（" + (e && e.message ? e.message : "网络错误") + "）。请稍后刷新。");
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          applyParsedState(JSON.parse(raw));
          showToast("已暂时使用本地缓存");
          return;
        }
      } catch (e2) {}
      state = { dishes: [], weeks: {}, shoppingDone: {} };
    }
  }

  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  async function publishToGitHub(payload) {
    const gh = CFG.github || {};
    const owner = gh.owner;
    const repo = gh.repo;
    const branch = gh.branch || "main";
    const dataPath = gh.dataPath || "data/menu.json";
    const token = localStorage.getItem(GH_TOKEN_KEY);
    if (!token) throw new Error("未设置 GitHub Token");
    if (!owner || !repo) throw new Error("缺少仓库配置");

    const apiBase =
      "https://api.github.com/repos/" +
      encodeURIComponent(owner) +
      "/" +
      encodeURIComponent(repo) +
      "/contents/" +
      dataPath.split("/").map(encodeURIComponent).join("/");

    let sha = null;
    const getRes = await fetch(apiBase + "?ref=" + encodeURIComponent(branch), {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + token,
      },
    });
    if (getRes.status === 200) {
      const meta = await getRes.json();
      sha = meta.sha;
    } else if (getRes.status !== 404) {
      const errText = await getRes.text();
      throw new Error("读取线上文件失败 (" + getRes.status + ")");
    }

    const body = {
      message: "chore: update menu",
      content: utf8ToBase64(JSON.stringify(payload, null, 2) + "\n"),
      branch: branch,
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(apiBase, {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!putRes.ok) {
      let detail = "";
      try {
        const j = await putRes.json();
        detail = j.message || "";
      } catch (e) {}
      throw new Error("发布失败 (" + putRes.status + ")" + (detail ? ": " + detail : ""));
    }
    return putRes.json();
  }

  /**
   * @param {{ needPublishHint?: boolean, quiet?: boolean }} [opts]
   */
  function saveState(opts) {
    opts = opts || {};
    const payload = payloadFromState();
    cacheStateLocally(payload);

    if (!isHosted) return;

    if (!isAdmin) return;

    const token = localStorage.getItem(GH_TOKEN_KEY);
    if (token) {
      publishToGitHub(payload)
        .then(function () {
          if (!opts.quiet) showToast("已发布到线上");
        })
        .catch(function (e) {
          showToast(
            "发布失败：" +
              (e && e.message ? e.message : "未知错误") +
              "（已暂存本地）"
          );
        });
    } else if (opts.needPublishHint) {
      showToast(
        "已暂存。请在管理里粘贴 GitHub Token 后点发布，或把导出 JSON 发给助手帮你上线。"
      );
    }
  }

  async function publishNow() {
    if (!canEdit()) {
      showToast("请先进入管理模式");
      return;
    }
    const token = localStorage.getItem(GH_TOKEN_KEY);
    if (!token) {
      showToast("请先粘贴并保存 GitHub Token");
      return;
    }
    const payload = payloadFromState();
    cacheStateLocally(payload);
    try {
      showToast("正在发布…");
      await publishToGitHub(payload);
      showToast("已发布到线上");
    } catch (e) {
      showToast("发布失败：" + (e && e.message ? e.message : "未知错误"));
    }
  }

  function getWeekData(mondayStr) {
    if (!state.weeks[mondayStr]) {
      state.weeks[mondayStr] = {};
    }
    return state.weeks[mondayStr];
  }

  function ensureDayMeal(mondayStr, dateKey, mealKey) {
    const week = getWeekData(mondayStr);
    if (!week[dateKey]) week[dateKey] = {};
    if (!Array.isArray(week[dateKey][mealKey])) week[dateKey][mealKey] = [];
    return week[dateKey][mealKey];
  }

  function findDish(id) {
    for (let i = 0; i < state.dishes.length; i++) {
      if (state.dishes[i].id === id) return state.dishes[i];
    }
    return null;
  }

  // ——— Tabs / views ———
  function closeMoreMenu() {
    const menu = document.getElementById("more-menu");
    const btn = document.getElementById("btn-more");
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  }

  function switchTab(name) {
    closeMoreMenu();
    currentDetailId = null;
    detailDirty = false;

    document.querySelectorAll(".tab[data-tab]").forEach(function (t) {
      const on = t.dataset.tab === name;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    // "更多" itself is never the active primary tab highlight for week/shopping —
    // highlight 我的菜谱 only when on dishes; dim when on secondary
    const dishesTab = document.getElementById("tab-dishes");
    if (name === "dishes") {
      dishesTab.classList.add("active");
      dishesTab.setAttribute("aria-selected", "true");
    } else if (name === "week" || name === "shopping") {
      dishesTab.classList.remove("active");
      dishesTab.setAttribute("aria-selected", "false");
    }

    document.querySelectorAll(".panel").forEach(function (p) {
      const on = p.id === "panel-" + name;
      p.classList.toggle("active", on);
      p.hidden = !on;
    });

    if (name === "week") renderWeek();
    if (name === "shopping") renderShopping();
    if (name === "dishes") renderDishes();
  }

  function openDetail(id) {
    const dish = findDish(id);
    if (!dish) return;
    closeMoreMenu();
    currentDetailId = id;
    detailDirty = false;

    document.querySelectorAll(".tab[data-tab]").forEach(function (t) {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    document.getElementById("tab-dishes").classList.add("active");
    document.getElementById("tab-dishes").setAttribute("aria-selected", "true");

    document.querySelectorAll(".panel").forEach(function (p) {
      const on = p.id === "panel-detail";
      p.classList.toggle("active", on);
      p.hidden = !on;
    });

    fillDetailForm(dish);
    applyDetailReadOnly();
    window.scrollTo({ top: 0, behavior: "smooth" });
    // 记一条浏览历史，让浏览器左上角「返回」也能回到菜单
    try {
      if (!(history.state && history.state.hmDetail)) {
        history.pushState({ hmDetail: id }, "", location.href);
      } else {
        history.replaceState({ hmDetail: id }, "", location.href);
      }
    } catch (e) {}
  }

  let skipNextPop = false;
  window.addEventListener("popstate", function () {
    if (skipNextPop) {
      skipNextPop = false;
      return;
    }
    if (!currentDetailId) return;
    const id = currentDetailId;
    if (!backToList({ fromPop: true })) {
      try { history.pushState({ hmDetail: id }, "", location.href); } catch (e) {}
    }
  });

  function fillDetailForm(dish) {
    document.getElementById("detail-form-error").classList.add("hidden");
    document.getElementById("detail-id").value = dish.id;
    document.getElementById("detail-name").value = dish.name;
    document.getElementById("detail-category").value =
      CATEGORIES.indexOf(dish.category) !== -1 ? dish.category : "荤菜炒菜";
    document.getElementById("detail-recipe").value = dish.recipe || "";
    setDetailRating(dish.rating != null ? dish.rating : 3);
    renderIngredientRows(dish.ingredients && dish.ingredients.length ? dish.ingredients : []);
    document.getElementById("detail-keypoints").value = dish.keypoints || "";
    (function () {
      const cr = document.getElementById("detail-credit");
      const kp = document.getElementById("detail-keypoints");
      if (!cr) return;
      const m = /开源自\s*@\s*([^\s，,。；;]+)/.exec(dish.notes || "");
      if (m) {
        cr.textContent = "再次鸣谢@" + m[1] + "开源";
        cr.classList.remove("hidden");
        if (kp) kp.classList.add("has-credit");
      } else {
        cr.textContent = "";
        cr.classList.add("hidden");
        if (kp) kp.classList.remove("has-credit");
      }
    })();
    growDetailTextareas();
    document.getElementById("detail-updated").textContent = formatUpdatedAt(dish.updatedAt);
  }

  // ——— Star picker ———
  function setDetailRating(value) {
    const r = clampRating(value);
    document.getElementById("detail-rating").value = String(r);
    document.getElementById("detail-rating-label").textContent = formatRating(r);
    const picker = document.getElementById("detail-star-picker");
    picker.setAttribute("aria-valuenow", String(r));
    let html = "";
    for (let i = 1; i <= 5; i++) {
      let cls = "star-hit";
      if (r >= i) cls += " full";
      else if (r >= i - 0.5) cls += " half";
      html +=
        '<span class="' +
        cls +
        '" data-full="' +
        i +
        '" data-half="' +
        (i - 0.5) +
        '" role="presentation"></span>';
    }
    picker.innerHTML = html;
  }

  function getDetailRating() {
    return clampRating(document.getElementById("detail-rating").value);
  }


  function saveDishNoteFromInput(input) {
    if (!canEdit() || !input) return;
    const id = input.getAttribute("data-id");
    const d = findDish(id);
    if (!d) return;
    var next = expandSourceNote(String(input.value || "").trim());
    if (input.value !== next) input.value = next;
    const wrap = input.closest(".dish-note-wrap");
    if (wrap) wrap.classList.toggle("is-empty", !next);
    const row = input.closest(".dish-card-row");
    const card = row && row.querySelector(".dish-card");
    if (card) card.title = (d.name || "") + (next ? " · " + next : "");
    if ((d.notes || "") === next) return;
    d.notes = next;
    d.updatedAt = nowIso();
    saveState({ needPublishHint: true, quiet: true });
    if (currentDetailId === id) {
      const el = document.getElementById("detail-notes");
      if (el) el.value = next;
    }
  }

  // ——— Dishes list ———
  function renderDishes() {
    const q = (document.getElementById("dish-search").value || "").trim().toLowerCase();
    const cat = document.getElementById("dish-filter-category").value;
    const list = document.getElementById("dish-list");
    const empty = document.getElementById("dish-empty");

    let dishes = state.dishes.slice();
    if (cat) {
      dishes = dishes.filter(function (d) {
        return d.category === cat;
      });
    }
    if (q) {
      dishes = dishes.filter(function (d) {
        const hay =
          d.name +
          " " +
          (d.notes || "") +
          " " +
          (d.recipe || "") +
          " " +
          (d.keypoints || "") +
          " " +
          (d.tags || []).join(" ") +
          " " +
          (d.ingredients || [])
            .map(function (i) {
              return i.name + " " + (i.amount || "");
            })
            .join(" ");
        return hay.toLowerCase().indexOf(q) !== -1;
      });
    }

    function sortByRating(a, b) {
      const ra = clampRating(a.rating);
      const rb = clampRating(b.rating);
      if (rb !== ra) return rb - ra;
      return String(a.name).localeCompare(String(b.name), "zh");
    }

    if (!dishes.length) {
      list.innerHTML = "";
      empty.classList.remove("hidden");
      if (state.dishes.length && (q || cat)) {
        empty.querySelector("h3").textContent = "没有匹配的菜品";
        empty.querySelector("p").textContent = "试试换个关键词或清空筛选条件。";
      } else {
        empty.querySelector("h3").textContent = "还没有菜品";
        empty.querySelector("p").textContent = canEdit()
          ? "点击「添加菜品」开始建立你的菜谱库，或导入之前的备份。"
          : "共享菜单暂时为空，请联系管理员添加。";
      }
      return;
    }

    empty.classList.add("hidden");

    function cardHtml(d) {
      const hasRecipe = !!(d.recipe && String(d.recipe).trim());
      const editable = canEdit();
      const menu =
        editable
          ? '<div class="dish-card-actions">' +
            '<button type="button" class="btn-dish-more" data-id="' +
            escapeHtml(d.id) +
            '" aria-label="更多操作" aria-haspopup="true" aria-expanded="false" title="更多">⋮</button>' +
            '<div class="dish-card-menu" hidden>' +
            '<button type="button" class="dish-card-menu-item dish-card-menu-danger" data-action="delete" data-id="' +
            escapeHtml(d.id) +
            '">删除</button>' +
            "</div>" +
            "</div>"
          : "";
      const noteLine = isDrinkCategory(d.category)
        ? ""
        : editable
          ? '<div class="dish-note-wrap' +
            (d.notes ? "" : " is-empty") +
            '" data-id="' +
            escapeHtml(d.id) +
            '">' +
            '<input type="text" class="dish-note-input" data-id="' +
            escapeHtml(d.id) +
            '" maxlength="80" list="source-note-list" placeholder="添加小字，可写 d/dao/f/c/z" value="' +
            escapeHtml(d.notes || "") +
            '" aria-label="' +
            escapeHtml(d.name) +
            '的备注" autocomplete="off" />' +
            "</div>"
          : d.notes
            ? '<p class="dish-notes">' + escapeHtml(d.notes) + "</p>"
            : "";
      return (
        '<div class="dish-card-row" data-id="' +
        escapeHtml(d.id) +
        '">' +
        '<div class="dish-card-body">' +
        '<button type="button" class="dish-card dish-card-compact" data-id="' +
        escapeHtml(d.id) +
        '" title="' +
        escapeHtml(d.name) +
        (d.notes ? " · " + d.notes : "") +
        '">' +
        '<div class="dish-card-main">' +
        "<h3>" +
        escapeHtml(d.name) +
        "</h3>" +
        '<div class="dish-card-rating">' +
        renderStarsHtml(d.rating, "stars-sm") +
        '<span class="rating-num">' +
        formatRating(d.rating) +
        "</span>" +
        (hasRecipe ? "" : '<span class="recipe-dot" title="制作过程待写"></span>') +
        "</div>" +
        "</div>" +
        "</button>" +
        noteLine +
        "</div>" +
        menu +
        "</div>"
      );
    }

    function sectionHtml(section) {
      const group = dishes
        .filter(function (d) {
          return d.category === section;
        })
        .sort(sortByRating);
      return (
        '<div class="dish-section" data-category="' +
        escapeHtml(section) +
        '">' +
        '<h2 class="dish-section-title">' +
        escapeHtml(section) +
        '<span class="dish-section-count">' +
        group.length +
        "</span></h2>" +
        '<div class="dish-section-list">' +
        (group.length
          ? group.map(cardHtml).join("")
          : '<p class="dish-section-empty">暂无</p>') +
        "</div>" +
        (canEdit()
          ? '<button type="button" class="btn-section-add" data-category="' +
            escapeHtml(section) +
            '" title="添加' +
            escapeHtml(section) +
            '" aria-label="添加' +
            escapeHtml(section) +
            '">' +
            '<span class="btn-section-add-icon" aria-hidden="true">＋</span>' +
            "<span>新菜</span>" +
            "</button>"
          : "") +
        "</div>"
      );
    }

    // Two columns: 荤菜 | 小菜+饮品 stacked (or single when filtered)
    const boardMode = !cat;
    list.classList.toggle("dish-board", boardMode);
    list.classList.toggle("dish-board-single", !boardMode);

    if (!boardMode) {
      list.innerHTML = sectionHtml(cat);
      return;
    }

    list.innerHTML =
      '<div class="dish-col dish-col-main">' +
      sectionHtml("荤菜炒菜") +
      "</div>" +
      '<div class="dish-col dish-col-side">' +
      sectionHtml("小菜素菜") +
      sectionHtml("特色主食") +
      sectionHtml("饮品") +
      "</div>";
  }

  // 食材：一个多行文本框，一行一样（"名称 用量"）。数据仍存为 [{name, amount}]，
  // 以兼容购物清单汇总、搜索、旧版本与已发布数据。
  function ingredientsToText(items) {
    return (items || [])
      .map(function (i) {
        if (!i) return "";
        if (typeof i === "string") return i.trim();
        const name = String(i.name || "").trim();
        const amount = String(i.amount || "").trim();
        return amount ? name + " " + amount : name;
      })
      .filter(Boolean)
      .map(function (line) {
        return ING_BULLET + line;
      })
      .join("\n");
  }

  var ING_BULLET = "· ";
  var ING_BULLET_RE = /^[\s\u3000]*[·•・][\s\u3000]*/;

  // 给缺少圆点的非空行补上 "· "，尽量保持光标位置
  function normalizeIngredientBullets(ta) {
    if (!ta) return;
    const val = ta.value;
    if (!val.replace(ING_BULLET_RE, "").trim() && val.indexOf("\n") === -1) return;
    const caret = typeof ta.selectionStart === "number" ? ta.selectionStart : val.length;
    let pos = 0;
    let newCaret = caret;
    const out = val.split("\n").map(function (line) {
      const start = pos;
      pos += line.length + 1;
      if (!line.trim() || ING_BULLET_RE.test(line)) return line;
      if (caret >= start) newCaret += ING_BULLET.length;
      return ING_BULLET + line;
    });
    const next = out.join("\n");
    if (next === val) return;
    ta.value = next;
    if (document.activeElement === ta && ta.setSelectionRange) ta.setSelectionRange(newCaret, newCaret);
  }

  function parseIngredientsText(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map(function (line) {
        const t = line.replace(ING_BULLET_RE, "").trim();
        if (!t) return null;
        const m = t.match(/^(\S+)[\s\u3000]+(.+)$/);
        if (m) return { name: m[1], amount: m[2].trim() };
        return { name: t, amount: "" };
      })
      .filter(Boolean);
  }

  function autoGrowTextarea(el) {
    if (!el || !el.style) return;
    el.style.height = "auto";
    if (el.scrollHeight) el.style.height = el.scrollHeight + 2 + "px";
  }

  function growDetailTextareas() {
    const ids = ["detail-recipe", "detail-keypoints", "detail-ingredients"];
    const run = function () {
      ids.forEach(function (id) { autoGrowTextarea(document.getElementById(id)); });
    };
    run();
    if (window.requestAnimationFrame) window.requestAnimationFrame(run);
    setTimeout(run, 60);
  }

  function renderIngredientRows(items) {
    const ta = document.getElementById("detail-ingredients");
    if (!ta) return;
    ta.value = ingredientsToText(items);
    ta.disabled = !canEdit();
    autoGrowTextarea(ta);
  }

  function collectIngredients() {
    const ta = document.getElementById("detail-ingredients");
    return ta ? parseIngredientsText(ta.value) : [];
  }

  function markDirty() {
    detailDirty = true;
  }

  function saveDetailForm(e) {
    var opts = e && typeof e === "object" && !e.target ? e : null;
    if (e && e.preventDefault) e.preventDefault();
    if (!canEdit()) {
      showToast("当前为只读，请先点「管理」解锁");
      return false;
    }
    const err = document.getElementById("detail-form-error");
    const name = document.getElementById("detail-name").value.trim();
    if (!name) {
      err.textContent = "请填写菜名。";
      err.classList.remove("hidden");
      return false;
    }
    err.classList.add("hidden");

    const id = document.getElementById("detail-id").value;
    // 备注 / 标签 已从详情页移除：保存时保留原值，不覆盖
    const prevDish = id ? findDish(id) : null;
    const tags = prevDish && Array.isArray(prevDish.tags) ? prevDish.tags.slice() : [];

    const payload = {
      name: name,
      category: document.getElementById("detail-category").value,
      rating: getDetailRating(),
      notes: prevDish ? prevDish.notes || "" : "",
      ingredients: collectIngredients(),
      recipe: document.getElementById("detail-recipe").value,
      keypoints: document.getElementById("detail-keypoints").value,
      tags: tags,
      updatedAt: nowIso(),
    };

    let existing = id ? findDish(id) : null;
    if (existing) {
      Object.assign(existing, payload);
    } else {
      payload.id = uid();
      state.dishes.unshift(payload);
      currentDetailId = payload.id;
      document.getElementById("detail-id").value = payload.id;
    }

    var quiet = !!(opts && opts.quiet);
    saveState({ needPublishHint: true, quiet: quiet });
    detailDirty = false;
    document.getElementById("detail-updated").textContent = formatUpdatedAt(payload.updatedAt);
    if (!quiet && !isHosted) showToast("已保存");
    return true;
  }

  function addNewDish(category) {
    if (!canEdit()) {
      showToast("当前为只读，请先点「管理」解锁");
      return;
    }
    const cat = migrateCategory(category || "荤菜炒菜");
    const dish = makeDish({
      id: uid(),
      name: "新菜品",
      category: cat,
      rating: 3,
      notes: isDrinkCategory(cat) ? "" : "开源自@",
      ingredients: [],
      recipe: "",
      keypoints: "",
      tags: [],
    });
    state.dishes.unshift(dish);
    saveState({ needPublishHint: true, quiet: true });
    openDetail(dish.id);
    const nameInput = document.getElementById("detail-name");
    nameInput.focus();
    nameInput.select();
    detailDirty = true;
  }

  function deleteDishById(id, opts) {
    opts = opts || {};
    if (!canEdit()) {
      showToast("当前为只读，请先点「管理」解锁");
      return false;
    }
    const d = findDish(id);
    if (!d) return false;
    if (!confirm('确定删除「' + d.name + '」？此操作不可撤销。')) return false;
    state.dishes = state.dishes.filter(function (x) {
      return x.id !== id;
    });
    // Also strip from week menus
    Object.keys(state.weeks || {}).forEach(function (monday) {
      const week = state.weeks[monday];
      if (!week || typeof week !== "object") return;
      Object.keys(week).forEach(function (dateKey) {
        const day = week[dateKey];
        if (!day || typeof day !== "object") return;
        Object.keys(day).forEach(function (mealKey) {
          if (!Array.isArray(day[mealKey])) return;
          day[mealKey] = day[mealKey].filter(function (dishId) {
            return dishId !== id;
          });
        });
      });
    });
    saveState({ needPublishHint: true });
    if (currentDetailId === id) {
      currentDetailId = null;
      detailDirty = false;
      switchTab("dishes");
    } else {
      renderDishes();
      renderWeek();
    }
    showToast("已删除");
    return true;
  }

  function deleteCurrentDish() {
    const id = document.getElementById("detail-id").value || currentDetailId;
    deleteDishById(id);
  }

  function closeAllDishMenus() {
    document.querySelectorAll(".dish-card-menu").forEach(function (el) {
      el.hidden = true;
    });
    document.querySelectorAll(".btn-dish-more").forEach(function (el) {
      el.setAttribute("aria-expanded", "false");
    });
  }

  function backToList(opts) {
    const fromPop = !!(opts && opts.fromPop);
    if (detailDirty && canEdit()) {
      // 点返回 / 离开详情时自动保存，不再弹窗催你按保存
      if (!saveDetailFormQuiet()) return false;
    }
    currentDetailId = null;
    detailDirty = false;
    switchTab("dishes");
    if (!fromPop) {
      try {
        if (history.state && history.state.hmDetail) {
          skipNextPop = true;
          history.back();
        }
      } catch (e) {}
    }
    return true;
  }

  /** 失焦自动保存用：成功返回 true；菜名为空时提示并返回 false */
  function saveDetailFormQuiet() {
    const name = document.getElementById("detail-name").value.trim();
    if (!name) {
      showToast("请先填写菜名再离开");
      return false;
    }
    const ok = saveDetailForm({ quiet: true });
    return ok !== false;
  }

  function autosaveDetailFromField() {
    if (!canEdit() || !detailDirty) return;
    if (!document.getElementById("detail-name").value.trim()) return;
    saveDetailForm({ quiet: true });
  }

  // ——— Admin / edit mode ———
  async function sha256Hex(text) {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const bytes = new Uint8Array(digest);
    let hex = "";
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, "0");
    }
    return hex;
  }

  function setAdmin(flag) {
    isAdmin = !!flag;
    if (isHosted) {
      try {
        if (isAdmin) sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
        else sessionStorage.removeItem(ADMIN_SESSION_KEY);
      } catch (e) {}
    }
    applyEditModeUI();
    if (!document.getElementById("panel-detail").hidden && currentDetailId) {
      const dish = findDish(currentDetailId);
      if (dish) fillDetailForm(dish);
    }
    renderDishes();
    renderWeek();
    updateFooter();
  }

  function updateFooter() {
    const el = document.querySelector(".footer span");
    if (!el) return;
    if (isHosted) {
      el.textContent = isAdmin
        ? "共享菜单 · 管理模式（可编辑并发布）"
        : "共享菜单 · 公开可看，管理可改";
    } else {
      el.textContent = "数据仅保存在本机浏览器（localStorage）";
    }
  }

  function applyEditModeUI() {
    const editable = canEdit();
    document.body.classList.toggle("is-readonly", isHosted && !editable);
    document.body.classList.toggle("is-admin", editable && isHosted);
    document.body.classList.toggle("is-local", !isHosted);

    const addBtn = document.getElementById("btn-add-dish");
    if (addBtn) addBtn.hidden = !editable;

    const importBtn = document.getElementById("btn-import");
    if (importBtn) importBtn.hidden = !editable;

    const adminBtn = document.getElementById("btn-admin");
    if (adminBtn) {
      adminBtn.textContent = isHosted && isAdmin ? "管理中" : "管理";
      adminBtn.classList.toggle("btn-admin-on", isHosted && isAdmin);
    }

    const weekMutators = [
      "btn-copy-prev-week",
      "btn-clear-week",
      "btn-uncheck-all",
    ];
    weekMutators.forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.hidden = !editable;
    });

    applyDetailReadOnly();
  }

  function applyDetailReadOnly() {
    const editable = canEdit();
    const form = document.getElementById("detail-form");
    if (!form) return;
    form.classList.toggle("detail-readonly", !editable);

    [
      "detail-name",
      "detail-recipe",
      "detail-ingredients",
      "detail-keypoints",
      "detail-category",
    ].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.disabled = !editable;
    });

    const picker = document.getElementById("detail-star-picker");
    if (picker) {
      picker.classList.toggle("star-picker-disabled", !editable);
      picker.tabIndex = editable ? 0 : -1;
    }

    ["btn-detail-delete", "btn-detail-save"].forEach(
      function (id) {
        const el = document.getElementById(id);
        if (el) el.hidden = !editable;
      }
    );

    const footerSubmit = form.querySelector('.detail-footer button[type="submit"]');
    if (footerSubmit) footerSubmit.hidden = !editable;

  }

  function ensureAdminModal() {
    if (document.getElementById("admin-modal")) return;
    const wrap = document.createElement("div");
    wrap.id = "admin-modal";
    wrap.className = "modal";
    wrap.hidden = true;
    wrap.innerHTML =
      '<div class="modal-backdrop" data-close="admin"></div>' +
      '<div class="modal-card" role="dialog" aria-labelledby="admin-modal-title">' +
      '<header class="modal-header">' +
      '<h2 id="admin-modal-title">管理</h2>' +
      '<button type="button" class="btn btn-icon" data-close="admin" aria-label="关闭">×</button>' +
      "</header>" +
      '<div class="modal-body admin-modal-body">' +
      '<div id="admin-login-section">' +
      "<p class=\"admin-hint\">输入管理密码后可编辑共享菜单，并发布到 GitHub Pages。</p>" +
      '<label class="field"><span>管理密码</span>' +
      '<input type="password" id="admin-password" class="input" autocomplete="current-password" /></label>' +
      '<p id="admin-login-error" class="form-error hidden"></p>' +
      '<button type="button" class="btn btn-primary" id="btn-admin-login">进入管理</button>' +
      "</div>" +
      '<div id="admin-panel-section" hidden>' +
      "<p class=\"admin-hint\">已进入管理模式。保存菜品时若已配置 Token 会自动发布；也可手动发布。</p>" +
      '<label class="field"><span>GitHub PAT（仅 Contents 写权限，存本机）</span>' +
      '<input type="password" id="admin-gh-token" class="input" autocomplete="off" placeholder="github_pat_… 或 ghp_…" /></label>' +
      '<div class="admin-actions">' +
      '<button type="button" class="btn btn-ghost" id="btn-save-token">保存 Token</button>' +
      '<button type="button" class="btn btn-primary" id="btn-publish">发布到线上</button>' +
      '<button type="button" class="btn btn-danger-ghost" id="btn-admin-logout">退出管理</button>' +
      "</div>" +
      '<p class="admin-repo-hint" id="admin-repo-hint"></p>' +
      "</div>" +
      "</div>" +
      "</div>";
    document.body.appendChild(wrap);

    wrap.querySelectorAll("[data-close='admin']").forEach(function (el) {
      el.addEventListener("click", closeAdminModal);
    });
    document.getElementById("btn-admin-login").addEventListener("click", tryAdminLogin);
    document.getElementById("admin-password").addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        tryAdminLogin();
      }
    });
    document.getElementById("btn-save-token").addEventListener("click", saveGhToken);
    document.getElementById("btn-publish").addEventListener("click", publishNow);
    document.getElementById("btn-admin-logout").addEventListener("click", function () {
      setAdmin(false);
      refreshAdminModal();
      showToast("已退出管理");
    });
  }

  function openAdminModal() {
    ensureAdminModal();
    refreshAdminModal();
    document.getElementById("admin-modal").hidden = false;
    const pw = document.getElementById("admin-password");
    if (pw && !isAdmin) {
      pw.value = "";
      setTimeout(function () {
        pw.focus();
      }, 50);
    }
  }

  function closeAdminModal() {
    const modal = document.getElementById("admin-modal");
    if (modal) modal.hidden = true;
  }

  function refreshAdminModal() {
    ensureAdminModal();
    const login = document.getElementById("admin-login-section");
    const panel = document.getElementById("admin-panel-section");
    const err = document.getElementById("admin-login-error");
    if (err) err.classList.add("hidden");
    if (isHosted && isAdmin) {
      login.hidden = true;
      panel.hidden = false;
      document.getElementById("btn-publish").disabled = false;
      document.getElementById("btn-admin-logout").hidden = false;
      const tokenInput = document.getElementById("admin-gh-token");
      const existing = localStorage.getItem(GH_TOKEN_KEY) || "";
      tokenInput.value = existing;
      tokenInput.placeholder = existing ? "已保存（可覆盖）" : "github_pat_… 或 ghp_…";
      const gh = CFG.github || {};
      document.getElementById("admin-repo-hint").textContent =
        "仓库：" +
        (gh.owner || "?") +
        "/" +
        (gh.repo || "?") +
        " · " +
        (gh.branch || "main") +
        " · " +
        (gh.dataPath || "data/menu.json");
    } else if (!isHosted) {
      login.hidden = true;
      panel.hidden = false;
      document.getElementById("admin-repo-hint").textContent =
        "当前为本地模式（file://），数据在 localStorage；发布功能需在线上站点使用。";
      document.getElementById("btn-publish").disabled = true;
      document.getElementById("btn-admin-logout").hidden = true;
    } else {
      login.hidden = false;
      panel.hidden = true;
    }
  }

  async function tryAdminLogin() {
    const input = document.getElementById("admin-password");
    const err = document.getElementById("admin-login-error");
    const pw = (input && input.value) || "";
    if (!pw) {
      err.textContent = "请输入密码";
      err.classList.remove("hidden");
      return;
    }
    const expected = (CFG.adminPasswordSha256 || "").toLowerCase();
    if (!expected || !window.crypto || !crypto.subtle) {
      err.textContent = "当前环境无法校验密码";
      err.classList.remove("hidden");
      return;
    }
    try {
      const hex = await sha256Hex(pw);
      if (hex !== expected) {
        err.textContent = "密码不正确";
        err.classList.remove("hidden");
        return;
      }
      setAdmin(true);
      refreshAdminModal();
      showToast("已进入管理模式");
    } catch (e) {
      err.textContent = "校验失败";
      err.classList.remove("hidden");
    }
  }

  function saveGhToken() {
    const input = document.getElementById("admin-gh-token");
    const val = (input && input.value.trim()) || "";
    if (!val) {
      localStorage.removeItem(GH_TOKEN_KEY);
      showToast("已清除 Token");
      return;
    }
    localStorage.setItem(GH_TOKEN_KEY, val);
    showToast("Token 已保存到本机");
  }

  // ——— Week (secondary, kept) ———
  function renderWeek() {
    const days = weekDates(currentWeekStart);
    const end = days[6].dateKey;
    document.getElementById("week-label").textContent =
      currentWeekStart.replace(/-/g, "/") + " – " + end.slice(5).replace("-", "/");

    const todayStr = formatDate(new Date());
    const grid = document.getElementById("week-grid");
    const weekData = getWeekData(currentWeekStart);

    grid.innerHTML = days
      .map(function (day) {
        const isToday = day.dateKey === todayStr;
        const mealsHtml = MEALS.map(function (meal) {
          const ids = (weekData[day.dateKey] && weekData[day.dateKey][meal.key]) || [];
          let dishesHtml;
          if (!ids.length) {
            dishesHtml = '<div class="meal-empty">未安排</div>';
          } else {
            dishesHtml =
              '<div class="meal-dishes">' +
              ids
                .map(function (id) {
                  const dish = findDish(id);
                  const label = dish ? dish.name : "（已删除）";
                  return (
                    '<div class="meal-dish" data-dish-id="' +
                    escapeHtml(id) +
                    '">' +
                    "<span>" +
                    escapeHtml(label) +
                    "</span>" +
                    (canEdit()
                      ? '<button type="button" class="btn-rm-meal-dish" aria-label="移除" data-date="' +
                        escapeHtml(day.dateKey) +
                        '" data-meal="' +
                        escapeHtml(meal.key) +
                        '" data-id="' +
                        escapeHtml(id) +
                        '">×</button>'
                      : "") +
                    "</div>"
                  );
                })
                .join("") +
              "</div>";
          }
          return (
            '<div class="meal-block">' +
            '<div class="meal-label">' +
            meal.label +
            "</div>" +
            dishesHtml +
            (canEdit()
              ? '<button type="button" class="btn-add-meal" data-date="' +
                escapeHtml(day.dateKey) +
                '" data-meal="' +
                escapeHtml(meal.key) +
                '">＋ 选菜</button>'
              : "") +
            "</div>"
          );
        }).join("");

        return (
          '<div class="day-card' +
          (isToday ? " today" : "") +
          '">' +
          '<div class="day-card-header">' +
          "<span>" +
          day.label +
          "</span>" +
          '<span class="date-num">' +
          (day.date.getMonth() + 1) +
          "/" +
          day.date.getDate() +
          "</span>" +
          "</div>" +
          mealsHtml +
          "</div>"
        );
      })
      .join("");
  }

  function openPickModal(dateKey, mealKey) {
    if (!canEdit()) {
      showToast("当前为只读，请先点「管理」解锁");
      return;
    }
    const existing = ensureDayMeal(currentWeekStart, dateKey, mealKey).slice();
    pickCtx = {
      dateKey: dateKey,
      mealKey: mealKey,
      selected: new Set(existing),
    };
    const mealLabel = MEALS.find(function (m) {
      return m.key === mealKey;
    });
    const dayIdx = weekDates(currentWeekStart).findIndex(function (d) {
      return d.dateKey === dateKey;
    });
    document.getElementById("pick-modal-title").textContent =
      "选择菜品 · " +
      (WEEKDAY_LABELS[dayIdx] || "") +
      " " +
      (mealLabel ? mealLabel.label : "");
    document.getElementById("pick-search").value = "";
    renderPickList();
    document.getElementById("pick-modal").hidden = false;
    document.getElementById("pick-search").focus();
  }

  function closePickModal() {
    document.getElementById("pick-modal").hidden = true;
    pickCtx = null;
  }

  function renderPickList() {
    const q = (document.getElementById("pick-search").value || "").trim().toLowerCase();
    const list = document.getElementById("pick-list");
    let dishes = state.dishes.slice().sort(function (a, b) {
      return clampRating(b.rating) - clampRating(a.rating);
    });
    if (q) {
      dishes = dishes.filter(function (d) {
        return d.name.toLowerCase().indexOf(q) !== -1 || d.category.indexOf(q) !== -1;
      });
    }
    if (!dishes.length) {
      list.innerHTML =
        '<div class="pick-empty">菜谱为空或没有匹配项，请先去「我的菜谱」添加。</div>';
      return;
    }
    list.innerHTML = dishes
      .map(function (d) {
        const checked = pickCtx && pickCtx.selected.has(d.id);
        return (
          '<label class="pick-item' +
          (checked ? " selected" : "") +
          '">' +
          '<input type="checkbox" data-id="' +
          escapeHtml(d.id) +
          '"' +
          (checked ? " checked" : "") +
          " />" +
          "<span>" +
          escapeHtml(d.name) +
          "</span>" +
          '<span class="pick-meta">' +
          escapeHtml(d.category) +
          " · " +
          formatRating(d.rating) +
          "★</span>" +
          "</label>"
        );
      })
      .join("");
  }

  function confirmPick() {
    if (!canEdit()) {
      showToast("当前为只读，请先点「管理」解锁");
      return;
    }
    if (!pickCtx) return;
    const ids = Array.from(pickCtx.selected);
    const arr = ensureDayMeal(currentWeekStart, pickCtx.dateKey, pickCtx.mealKey);
    arr.length = 0;
    ids.forEach(function (id) {
      arr.push(id);
    });
    saveState({ quiet: true });
    closePickModal();
    renderWeek();
    showToast("已更新菜单");
  }

  function removeMealDish(dateKey, mealKey, dishId) {
    if (!canEdit()) return;
    const arr = ensureDayMeal(currentWeekStart, dateKey, mealKey);
    const idx = arr.indexOf(dishId);
    if (idx !== -1) arr.splice(idx, 1);
    saveState({ quiet: true });
    renderWeek();
  }

  function clearWeek() {
    if (!canEdit()) {
      showToast("当前为只读，请先点「管理」解锁");
      return;
    }
    if (!confirm("确定清空本周全部三餐安排？")) return;
    state.weeks[currentWeekStart] = {};
    saveState({ quiet: true });
    renderWeek();
    showToast("本周已清空");
  }

  function copyPrevWeek() {
    if (!canEdit()) {
      showToast("当前为只读，请先点「管理」解锁");
      return;
    }
    const prev = prevWeekStart(currentWeekStart);
    const src = state.weeks[prev];
    if (!src || !Object.keys(src).length) {
      showToast("上周没有菜单可复制");
      return;
    }
    if (!confirm("将用上周安排覆盖本周，是否继续？")) return;
    const next = {};
    for (let i = 0; i < 7; i++) {
      const srcDate = addDays(prev, i);
      const dstDate = addDays(currentWeekStart, i);
      if (src[srcDate]) {
        next[dstDate] = JSON.parse(JSON.stringify(src[srcDate]));
      }
    }
    state.weeks[currentWeekStart] = next;
    saveState({ quiet: true });
    renderWeek();
    showToast("已复制上周菜单");
  }

  // ——— Shopping (secondary) ———
  function aggregateShopping() {
    const weekData = getWeekData(currentWeekStart);
    /** @type {Record<string, { name: string, amounts: string[], sources: string[] }>} */
    const map = {};
    const days = weekDates(currentWeekStart);

    days.forEach(function (day) {
      MEALS.forEach(function (meal) {
        const ids = (weekData[day.dateKey] && weekData[day.dateKey][meal.key]) || [];
        ids.forEach(function (id) {
          const dish = findDish(id);
          if (!dish) return;
          const source = day.label + meal.label + "·" + dish.name;
          (dish.ingredients || []).forEach(function (ing) {
            const key = ing.name.trim();
            if (!key) return;
            if (!map[key]) {
              map[key] = { name: key, amounts: [], sources: [] };
            }
            if (ing.amount && map[key].amounts.indexOf(ing.amount) === -1) {
              map[key].amounts.push(ing.amount);
            }
            if (map[key].sources.indexOf(source) === -1) {
              map[key].sources.push(source);
            }
          });
        });
      });
    });

    return Object.keys(map)
      .sort(function (a, b) {
        return a.localeCompare(b, "zh");
      })
      .map(function (k) {
        return map[k];
      });
  }

  function shoppingDoneKey(name) {
    return currentWeekStart + "::" + name;
  }

  function renderShopping() {
    const days = weekDates(currentWeekStart);
    document.getElementById("shopping-week-hint").textContent =
      "对应周菜单：" +
      currentWeekStart.replace(/-/g, "/") +
      " – " +
      days[6].dateKey.slice(5).replace("-", "/");

    const items = aggregateShopping();
    const list = document.getElementById("shopping-list");
    const empty = document.getElementById("shopping-empty");

    if (!items.length) {
      list.innerHTML = "";
      list.classList.add("hidden");
      empty.classList.remove("hidden");
      return;
    }

    empty.classList.add("hidden");
    list.classList.remove("hidden");
    list.innerHTML = items
      .map(function (item) {
        const key = shoppingDoneKey(item.name);
        const done = !!state.shoppingDone[key];
        const amountText = item.amounts.length ? item.amounts.join(" / ") : "";
        return (
          '<label class="shop-item' +
          (done ? " done" : "") +
          '">' +
          '<input type="checkbox" data-name="' +
          escapeHtml(item.name) +
          '"' +
          (done ? " checked" : "") +
          (canEdit() ? "" : " disabled") +
          " />" +
          '<div class="shop-body">' +
          '<div class="shop-name">' +
          escapeHtml(item.name) +
          "</div>" +
          (amountText
            ? '<div class="shop-amount">' + escapeHtml(amountText) + "</div>"
            : "") +
          '<div class="shop-sources">' +
          escapeHtml(item.sources.slice(0, 4).join(" · ")) +
          (item.sources.length > 4 ? " …" : "") +
          "</div>" +
          "</div>" +
          "</label>"
        );
      })
      .join("");
  }

  function toggleShoppingItem(name, checked) {
    if (!canEdit()) {
      showToast("当前为只读，请先点「管理」解锁");
      renderShopping();
      return;
    }
    const key = shoppingDoneKey(name);
    if (checked) state.shoppingDone[key] = true;
    else delete state.shoppingDone[key];
    saveState({ quiet: true });
    const input = document.querySelector(
      '#shopping-list input[data-name="' + CSS.escape(name) + '"]'
    );
    if (input) {
      input.closest(".shop-item").classList.toggle("done", checked);
    }
  }

  function uncheckAllShopping() {
    if (!canEdit()) {
      showToast("当前为只读，请先点「管理」解锁");
      return;
    }
    const items = aggregateShopping();
    items.forEach(function (item) {
      delete state.shoppingDone[shoppingDoneKey(item.name)];
    });
    saveState({ quiet: true });
    renderShopping();
    showToast("已取消全部勾选");
  }

  function copyShopping() {
    const items = aggregateShopping();
    if (!items.length) {
      showToast("清单为空");
      return;
    }
    const lines = items.map(function (item) {
      const key = shoppingDoneKey(item.name);
      const mark = state.shoppingDone[key] ? "☑" : "☐";
      const amt = item.amounts.length ? "（" + item.amounts.join(" / ") + "）" : "";
      return mark + " " + item.name + amt;
    });
    const text = "采购清单\n" + lines.join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          showToast("已复制到剪贴板");
        },
        function () {
          fallbackCopy(text);
        }
      );
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast("已复制到剪贴板");
    } catch (e) {
      showToast("复制失败，请手动选择");
    }
    document.body.removeChild(ta);
  }

  // ——— Import / Export ———
  function exportJson() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            version: 2,
            exportedAt: new Date().toISOString(),
            dishes: state.dishes,
            weeks: state.weeks,
            shoppingDone: state.shoppingDone,
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "home-menu-backup-" + formatDate(new Date()) + ".json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("已导出备份");
  }

  function importJson(file) {
    if (!canEdit()) {
      showToast("当前为只读，请先点「管理」解锁");
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.dishes)) {
          showToast("无效的备份文件");
          return;
        }
        if (!confirm("导入将覆盖当前本地数据，是否继续？")) return;
        state = {
          dishes: data.dishes.map(normalizeDish).filter(Boolean),
          weeks: data.weeks && typeof data.weeks === "object" ? data.weeks : {},
          shoppingDone:
            data.shoppingDone && typeof data.shoppingDone === "object"
              ? data.shoppingDone
              : {},
        };
        saveState({ needPublishHint: true });
        switchTab("dishes");
        showToast("导入成功（" + state.dishes.length + " 道菜）");
      } catch (e) {
        showToast("解析失败，请检查文件");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  // ——— Events ———
  function bindEvents() {
    document.getElementById("tab-dishes").addEventListener("click", function () {
      if (!document.getElementById("panel-detail").hidden) {
        backToList();
        return;
      }
      switchTab("dishes");
    });

    document.getElementById("btn-more").addEventListener("click", function (e) {
      e.stopPropagation();
      const menu = document.getElementById("more-menu");
      const open = menu.hidden;
      menu.hidden = !open;
      document.getElementById("btn-more").setAttribute("aria-expanded", open ? "true" : "false");
    });

    document.getElementById("more-menu").addEventListener("click", function (e) {
      const item = e.target.closest(".more-item");
      if (!item) return;
      switchTab(item.dataset.tab);
    });

    document.addEventListener("click", function () {
      closeMoreMenu();
    });

    document.getElementById("dish-search").addEventListener("input", renderDishes);
    document.getElementById("dish-filter-category").addEventListener("change", renderDishes);
    document.getElementById("btn-add-dish").addEventListener("click", addNewDish);

        document.getElementById("dish-list").addEventListener("click", function (e) {
      const addBtn = e.target.closest(".btn-section-add");
      if (addBtn) {
        e.preventDefault();
        closeAllDishMenus();
        addNewDish(addBtn.getAttribute("data-category"));
        return;
      }
      const menuItem = e.target.closest(".dish-card-menu-item");
      if (menuItem) {
        e.preventDefault();
        e.stopPropagation();
        const action = menuItem.getAttribute("data-action");
        const id = menuItem.getAttribute("data-id");
        closeAllDishMenus();
        if (action === "delete") deleteDishById(id);
        return;
      }
      const moreBtn = e.target.closest(".btn-dish-more");
      if (moreBtn) {
        e.preventDefault();
        e.stopPropagation();
        const menu = moreBtn.parentElement.querySelector(".dish-card-menu");
        const open = menu && menu.hidden;
        closeAllDishMenus();
        if (open && menu) {
          menu.hidden = false;
          moreBtn.setAttribute("aria-expanded", "true");
        }
        return;
      }
      if (e.target.closest(".dish-note-input") || e.target.closest(".dish-note-wrap")) {
        e.stopPropagation();
        closeAllDishMenus();
        return;
      }
      const card = e.target.closest(".dish-card");
      if (!card) return;
      closeAllDishMenus();
      var activeNote = document.activeElement;
      if (activeNote && activeNote.classList && activeNote.classList.contains("dish-note-input")) {
        saveDishNoteFromInput(activeNote);
      }
      openDetail(card.dataset.id);
    });

    document.addEventListener("click", function (e) {
      if (e.target.closest(".dish-card-row")) return;
      closeAllDishMenus();
    });

    document.getElementById("dish-list").addEventListener("mousedown", function (e) {
      if (e.target.closest(".dish-note-input") || e.target.closest(".dish-note-wrap")) {
        e.stopPropagation();
      }
    });

    document.getElementById("dish-list").addEventListener("keydown", function (e) {
      const input = e.target.closest(".dish-note-input");
      if (!input) return;
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        input.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        const id = input.getAttribute("data-id");
        const d = findDish(id);
        input.value = d ? d.notes || "" : "";
        input.blur();
      }
    });

    document.getElementById("dish-list").addEventListener("focusin", function (e) {
      if (e.target.closest(".dish-note-input")) closeAllDishMenus();
    });

    document.getElementById("dish-list").addEventListener("blur", function (e) {
      const input = e.target.closest(".dish-note-input");
      if (input) saveDishNoteFromInput(input);
    }, true);

    // datalist 点选、改完内容都会触发 change；不必再按回车
    document.getElementById("dish-list").addEventListener("change", function (e) {
      const input = e.target.closest(".dish-note-input");
      if (input) saveDishNoteFromInput(input);
    });

    // 点页面任意空白/其他区域：先把焦点里的小字存掉
    document.addEventListener(
      "pointerdown",
      function (e) {
        const active = document.activeElement;
        if (!active || !active.classList || !active.classList.contains("dish-note-input")) return;
        if (e.target === active || (active.contains && active.contains(e.target))) return;
        saveDishNoteFromInput(active);
      },
      true
    );

    document.getElementById("btn-detail-back").addEventListener("click", function () { backToList(); });
    document.getElementById("btn-detail-back-2").addEventListener("click", function () { backToList(); });
    document.getElementById("btn-detail-delete").addEventListener("click", deleteCurrentDish);
    document.getElementById("btn-detail-save").addEventListener("click", function () {
      saveDetailForm();
    });
    document.getElementById("detail-form").addEventListener("submit", saveDetailForm);

    ["detail-name", "detail-recipe", "detail-ingredients", "detail-keypoints", "detail-category"].forEach(
      function (id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("input", markDirty);
        if (id === "detail-recipe" || id === "detail-keypoints") {
          el.addEventListener("input", function () { autoGrowTextarea(el); });
        }
        el.addEventListener("change", function () {
          markDirty();
          if (id === "detail-category") {
            autosaveDetailFromField();
          }
        });
        el.addEventListener("blur", function () {
          autosaveDetailFromField();
        });
      }
    );

    const ingTa = document.getElementById("detail-ingredients");
    if (ingTa) {
      ingTa.addEventListener("input", function () {
        autoGrowTextarea(ingTa);
      });
      ingTa.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" || e.isComposing || e.keyCode === 229) return;
        if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
        e.preventDefault();
        if (ingTa.disabled || ingTa.readOnly) return;
        const v = ingTa.value;
        const a = ingTa.selectionStart;
        const b = ingTa.selectionEnd;
        const lineStart = v.lastIndexOf("\n", a - 1) + 1;
        let lineEnd = v.indexOf("\n", b);
        if (lineEnd === -1) lineEnd = v.length;
        const curLine = v.slice(lineStart, lineEnd);
        // 当前行只有圆点：不再追加空行
        if (a === b && !curLine.replace(ING_BULLET_RE, "").trim()) return;
        const ins = "\n" + ING_BULLET;
        ingTa.value = v.slice(0, a) + ins + v.slice(b);
        const c = a + ins.length;
        ingTa.setSelectionRange(c, c);
        ingTa.dispatchEvent(new Event("input", { bubbles: true }));
      });
      ingTa.addEventListener("focus", function () {
        if (ingTa.disabled || ingTa.readOnly) return;
        if (!ingTa.value.trim()) {
          ingTa.value = ING_BULLET;
          const c = ingTa.value.length;
          ingTa.setSelectionRange(c, c);
        }
      });
      ingTa.addEventListener("paste", function () {
        setTimeout(function () {
          normalizeIngredientBullets(ingTa);
          autoGrowTextarea(ingTa);
        }, 0);
      });
      ingTa.addEventListener("blur", function () {
        if (!ingTa.value.replace(/[·•・\s\u3000]/g, "")) {
          ingTa.value = "";
        } else {
          normalizeIngredientBullets(ingTa);
        }
        autoGrowTextarea(ingTa);
      });
    }

    // Star picker: left half = n-0.5, right half = n
    document.getElementById("detail-star-picker").addEventListener("click", function (e) {
      if (!canEdit()) return;
      const hit = e.target.closest(".star-hit");
      if (!hit) return;
      const rect = hit.getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      const val = e.clientX < mid ? Number(hit.dataset.half) : Number(hit.dataset.full);
      setDetailRating(val);
      markDirty();
    });
    document.getElementById("detail-star-picker").addEventListener("keydown", function (e) {
      if (!canEdit()) return;
      let r = getDetailRating();
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        setDetailRating(r + 0.5);
        markDirty();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        setDetailRating(r - 0.5);
        markDirty();
      }
    });

    document.querySelectorAll("[data-close='pick']").forEach(function (el) {
      el.addEventListener("click", closePickModal);
    });

    document.getElementById("btn-week-prev").addEventListener("click", function () {
      currentWeekStart = prevWeekStart(currentWeekStart);
      renderWeek();
    });
    document.getElementById("btn-week-next").addEventListener("click", function () {
      currentWeekStart = nextWeekStart(currentWeekStart);
      renderWeek();
    });
    document.getElementById("btn-week-today").addEventListener("click", function () {
      currentWeekStart = getMonday(new Date());
      renderWeek();
    });
    document.getElementById("btn-clear-week").addEventListener("click", clearWeek);
    document.getElementById("btn-copy-prev-week").addEventListener("click", copyPrevWeek);

    document.getElementById("week-grid").addEventListener("click", function (e) {
      const addBtn = e.target.closest(".btn-add-meal");
      if (addBtn) {
        openPickModal(addBtn.dataset.date, addBtn.dataset.meal);
        return;
      }
      const rm = e.target.closest(".btn-rm-meal-dish");
      if (rm) {
        removeMealDish(rm.dataset.date, rm.dataset.meal, rm.dataset.id);
      }
    });

    document.getElementById("pick-search").addEventListener("input", renderPickList);
    document.getElementById("pick-list").addEventListener("change", function (e) {
      if (!pickCtx || e.target.type !== "checkbox") return;
      const id = e.target.dataset.id;
      if (e.target.checked) pickCtx.selected.add(id);
      else pickCtx.selected.delete(id);
      e.target.closest(".pick-item").classList.toggle("selected", e.target.checked);
    });
    document.getElementById("btn-confirm-pick").addEventListener("click", confirmPick);

    document.getElementById("shopping-list").addEventListener("change", function (e) {
      if (e.target.type !== "checkbox") return;
      toggleShoppingItem(e.target.dataset.name, e.target.checked);
    });
    document.getElementById("btn-uncheck-all").addEventListener("click", uncheckAllShopping);
    document.getElementById("btn-copy-shopping").addEventListener("click", copyShopping);
    document.getElementById("btn-print-shopping").addEventListener("click", function () {
      window.print();
    });

    document.getElementById("btn-export").addEventListener("click", exportJson);
    document.getElementById("btn-import").addEventListener("click", function () {
      document.getElementById("import-file").click();
    });
    document.getElementById("import-file").addEventListener("change", function (e) {
      const file = e.target.files && e.target.files[0];
      if (file) importJson(file);
      e.target.value = "";
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        const adminModal = document.getElementById("admin-modal");
        if (adminModal && !adminModal.hidden) {
          closeAdminModal();
          return;
        }
        if (!document.getElementById("pick-modal").hidden) {
          closePickModal();
          return;
        }
        if (!document.getElementById("panel-detail").hidden) {
          backToList();
        }
        closeMoreMenu();
      }
    });

    const adminBtn = document.getElementById("btn-admin");
    if (adminBtn) {
      adminBtn.addEventListener("click", function () {
        openAdminModal();
      });
    }
  }

  async function init() {
    bindEvents();
    ensureAdminModal();
    applyEditModeUI();
    updateFooter();
    if (isHosted) {
      await loadStateShared();
    } else {
      loadStateLocal();
    }
    setDetailRating(3);
    applyEditModeUI();
    renderDishes();
    renderWeek();
  }

  init();
})();
