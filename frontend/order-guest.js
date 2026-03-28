/**
 * PostPlate customer order flow — store menu API, cart, checkout, receipt, status.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "pp_order_guest_v1";
  var LAST_ORDER_KEY = "pp_order_guest_last_order";
  var FIXTURE_PATH = "assets/order-guest/fixture-menu.json";
  var INTRO_KEY_PREFIX = "pp_intro_seen_";

  function getQuery() {
    var p = new URLSearchParams(window.location.search);
    return {
      store: p.get("store") || "demo-store",
      restaurant: p.get("restaurant") || "",
      offer: p.get("offer") || "",
      offerId: p.get("offerId") || "",
      session: p.get("session") || "",
      useFixture: p.get("useFixture") === "1",
    };
  }

  function queryStringFrom(obj) {
    var p = new URLSearchParams();
    if (obj.store) p.set("store", obj.store);
    if (obj.restaurant) p.set("restaurant", obj.restaurant);
    if (obj.offer) p.set("offer", obj.offer);
    if (obj.offerId) p.set("offerId", obj.offerId);
    if (obj.session) p.set("session", obj.session);
    var s = p.toString();
    return s ? "?" + s : "";
  }

  function shouldUseFixture(q) {
    return q.store === "demo-store" || q.useFixture === true;
  }

  function ensureSessionId(state) {
    if (!state.sessionId) {
      state.sessionId =
        "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    }
    return state.sessionId;
  }

  function defaultState(q) {
    return {
      store: q.store,
      restaurant: q.restaurant,
      offer: q.offer,
      offerId: q.offerId,
      sessionId: q.session || null,
      lines: [],
      complementsDismissed: false,
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var q = getQuery();
      if (!raw) return defaultState(q);
      var state = JSON.parse(raw);
      if (state.store !== q.store) return defaultState(q);
      state.restaurant = q.restaurant || state.restaurant;
      state.offer = q.offer || state.offer;
      state.offerId = q.offerId || state.offerId;
      if (q.session) state.sessionId = q.session;
      if (!Array.isArray(state.lines)) state.lines = [];
      if (typeof state.complementsDismissed !== "boolean") state.complementsDismissed = false;
      ensureSessionId(state);
      return state;
    } catch (e) {
      return defaultState(getQuery());
    }
  }

  function saveState(state) {
    ensureSessionId(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function clearCartState() {
    var s = loadState();
    s.lines = [];
    s.complementsDismissed = false;
    saveState(s);
  }

  function emitAnalytics(eventName, props) {
    var payload = Object.assign(
      { event: eventName, ts: new Date().toISOString() },
      props || {}
    );
    try {
      if (typeof global.dispatchEvent === "function") {
        global.dispatchEvent(new CustomEvent("pp-order-guest", { detail: payload }));
      }
    } catch (e) {}
    if (global.__PP_ORDER_GUEST_DEBUG__) console.debug("[pp-order-guest]", payload);
    try {
      fetch("/api/public/order-guest/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () {});
    } catch (e) {}
  }

  function escapeHtml(s) {
    if (!s) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatMoney(n) {
    return "$" + Number(n).toFixed(2);
  }

  function formatItemPrice(item) {
    if (item.displayPrice) return item.displayPrice;
    if (item.price != null && Number.isFinite(item.price) && item.price > 0) return formatMoney(item.price);
    return "—";
  }

  function apiResponseToCanonical(api, q) {
    var cats = (api.categories || []).slice();
    var items = (api.menuItems || []).map(function (row) {
      var price =
        row.price != null && Number.isFinite(Number(row.price)) ? Number(row.price) : 0;
      return {
        id: row.id,
        name: row.name,
        price: price,
        priceCents: row.priceCents,
        displayPrice: row.displayPrice || "",
        categoryId: row.categoryId || row.category || "main",
        imageUrl: row.imageUrl || "",
        tags: row.tags || [],
        offerBadge: row.offerEligibleTag === "featured",
        description: row.description || "",
      };
    });
    if (cats.length === 0 && items.length) {
      cats = [{ id: "all", name: "Menu", accent: "coral" }];
      items.forEach(function (it) {
        it.categoryId = "all";
      });
    }
    cats = [{ id: "__all", name: "All", accent: "" }].concat(cats);
    return {
      restaurant: {
        name: api.restaurantName || q.restaurant || "Restaurant",
        logoUrl: api.logoUrl || "",
        initials: api.businessInitials || "PP",
      },
      offer: api.offer || null,
      categories: cats,
      items: items,
      fulfillmentModes: api.fulfillmentModes || ["pickup"],
      defaultFulfillment: api.defaultFulfillment || "pickup",
      emptyMessage: api.message || null,
    };
  }

  function mergeMenuWithQuery(menu, q) {
    var m = JSON.parse(JSON.stringify(menu));
    if (q.restaurant) m.restaurant.name = q.restaurant;
    if (q.offer && m.offer) m.offer.title = q.offer;
    if (!m.restaurant.initials)
      m.restaurant.initials = String(m.restaurant.name || "PP")
        .split(/\s+/)
        .map(function (w) {
          return w[0];
        })
        .join("")
        .slice(0, 2)
        .toUpperCase() || "PP";
    if (!m.fulfillmentModes) m.fulfillmentModes = ["pickup"];
    if (!m.defaultFulfillment) m.defaultFulfillment = "pickup";
    if (!m.categories.some(function (c) {
      return c.id === "__all";
    })) {
      m.categories = [{ id: "__all", name: "All", accent: "" }].concat(m.categories || []);
    }
    return m;
  }

  function loadMenuFixture() {
    var q = getQuery();
    return fetch(FIXTURE_PATH)
      .then(function (r) {
        if (!r.ok) throw new Error("fixture failed");
        return r.json();
      })
      .then(function (data) {
        return mergeMenuWithQuery(data, q);
      });
  }

  function loadMenuData() {
    var q = getQuery();
    if (shouldUseFixture(q)) {
      return loadMenuFixture().then(function (menu) {
        return { menu: menu, source: "fixture" };
      });
    }
    var url =
      "/api/public/menu?store=" + encodeURIComponent(q.store);
    if (q.offerId) url += "&offerId=" + encodeURIComponent(q.offerId);
    return fetch(url)
      .then(function (r) {
        return r.json();
      })
      .then(function (api) {
        if (!api.success) throw new Error(api.error || "menu api");
        var menu = apiResponseToCanonical(api, q);
        if (q.restaurant) menu.restaurant.name = q.restaurant;
        if (q.offer && menu.offer) menu.offer.title = q.offer;
        return { menu: menu, source: "api" };
      })
      .catch(function () {
        return loadMenuFixture().then(function (menu) {
          return { menu: menu, source: "fixture-fallback" };
        });
      });
  }

  function findItem(menu, itemId) {
    for (var i = 0; i < menu.items.length; i++) {
      if (menu.items[i].id === itemId) return menu.items[i];
    }
    return null;
  }

  function lineSubtotal(line, menu) {
    var it = findItem(menu, line.itemId);
    if (!it) return 0;
    var p = it.price;
    if (p == null || !Number.isFinite(p)) return 0;
    return Math.round(p * line.qty * 100) / 100;
  }

  function cartSubtotal(menu, lines) {
    var t = 0;
    for (var i = 0; i < lines.length; i++) t += lineSubtotal(lines[i], menu);
    return Math.round(t * 100) / 100;
  }

  function offerDiscount(menu, state, subtotal) {
    if (!menu.offer || !menu.offer.percentOff) return 0;
    var pct = menu.offer.percentOff;
    var eligible = 0;
    for (var i = 0; i < state.lines.length; i++) {
      var line = state.lines[i];
      var it = findItem(menu, line.itemId);
      if (!it) continue;
      var tag = menu.offer.eligibleTag;
      if (tag && it.tags && it.tags.indexOf(tag) === -1) continue;
      eligible += lineSubtotal(line, menu);
    }
    if (eligible <= 0) return 0;
    return Math.round(eligible * (pct / 100) * 100) / 100;
  }

  function cartHasTag(lines, menu, tag) {
    for (var i = 0; i < lines.length; i++) {
      var it = findItem(menu, lines[i].itemId);
      if (it && it.tags && it.tags.indexOf(tag) !== -1) return true;
    }
    return false;
  }

  function complementCandidates(menu, lines) {
    var cartIds = {};
    for (var i = 0; i < lines.length; i++) cartIds[lines[i].itemId] = true;
    if (!cartHasTag(lines, menu, "main")) return [];
    var out = [];
    for (var j = 0; j < menu.items.length; j++) {
      var item = menu.items[j];
      if (cartIds[item.id]) continue;
      var isComp =
        item.tags &&
        (item.tags.indexOf("drink") !== -1 || item.tags.indexOf("side") !== -1);
      if (isComp) out.push(item);
    }
    out.sort(function (a, b) {
      return (b.imageUrl ? 1 : 0) - (a.imageUrl ? 1 : 0);
    });
    return out.slice(0, 5);
  }

  function showToast(el, text, ms) {
    if (!el) return;
    el.textContent = text;
    el.classList.add("is-visible");
    setTimeout(function () {
      el.classList.remove("is-visible");
    }, ms || 2200);
  }

  function hostBlock(html) {
    return (
      '<div class="og-host og-host--fade" role="status">' +
      '<div class="og-host__avatar" aria-hidden="true">✦</div>' +
      '<p class="og-host__text">' +
      html +
      "</p></div>"
    );
  }

  function itemImageHtml(item, restaurant) {
    if (item.imageUrl) {
      return (
        '<img class="og-item__img" src="' +
        escapeHtml(item.imageUrl) +
        '" alt="" loading="lazy" />'
      );
    }
    var initials = escapeHtml(restaurant.initials || "PP");
    var logo =
      restaurant.logoUrl
        ? '<img class="og-placeholder-logo" src="' +
          escapeHtml(restaurant.logoUrl) +
          '" alt="" />'
        : "";
    return (
      '<div class="og-item__img og-item__img--brand-placeholder" aria-hidden="true">' +
      logo +
      '<span class="og-placeholder-initials">' +
      initials +
      '</span><span class="og-placeholder-hint">Photo soon</span></div>'
    );
  }

  function injectOrderChrome(restaurantName, logoUrl) {
    var shell = document.querySelector(".og-shell");
    if (!shell || shell.querySelector(".og-chrome")) return;
    var bar = document.createElement("header");
    bar.className = "og-chrome";
    bar.setAttribute("role", "banner");
    bar.innerHTML =
      '<div class="og-chrome__brand">' +
      '<span class="og-chrome__pp-logo" aria-hidden="true">PP</span>' +
      '<div class="og-chrome__brand-text">' +
      '<span class="og-chrome__pp-name">PostPlate</span>' +
      '<span class="og-chrome__sponsor">Ordering powered by PostPlate</span></div></div>' +
      '<div class="og-chrome__venue">' +
      (logoUrl
        ? '<img class="og-chrome__venue-logo" src="' +
          escapeHtml(logoUrl) +
          '" alt="" />'
        : "") +
      '<span class="og-chrome__venue-name">' +
      escapeHtml(restaurantName || "Restaurant") +
      "</span></div>";
    shell.insertBefore(bar, shell.firstChild);
    initOrderTheme();
  }

  function initOrderTheme() {
    function resolve() {
      var dark = global.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
      document.documentElement.setAttribute("data-theme-pref", "auto");
    }
    resolve();
    try {
      global
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", resolve);
    } catch (e) {}
  }

  function initIntro() {
    initOrderTheme();
    var q = getQuery();
    if (!q.store || q.store === "demo-store") {
      /* allow demo */
    }
    if (sessionStorage.getItem(INTRO_KEY_PREFIX + q.store)) {
      window.location.replace("menu.html" + queryStringFrom(q));
      return;
    }
    emitAnalytics("intro_viewed", { store_id: q.store });
    var splash = document.getElementById("introSplash");
    var rest = document.getElementById("introRestaurant");
    var nameEl = document.getElementById("introRestaurantName");
    var logoEl = document.getElementById("introRestaurantLogo");

    global.setTimeout(function () {
      if (splash) splash.classList.add("og-intro-splash--done");
      if (rest) rest.classList.remove("og-intro-restaurant--hidden");
    }, 2000);

    fetch("/api/public/menu?store=" + encodeURIComponent(q.store))
      .then(function (r) {
        return r.json();
      })
      .then(function (api) {
        if (api.restaurantName && nameEl) nameEl.textContent = api.restaurantName;
        if (api.logoUrl && logoEl) {
          logoEl.src = api.logoUrl;
          logoEl.classList.remove("og-intro-logo--hidden");
        }
      })
      .catch(function () {});

    var cont = document.getElementById("introContinue");
    if (cont) {
      cont.addEventListener("click", function () {
        sessionStorage.setItem(INTRO_KEY_PREFIX + q.store, "1");
        emitAnalytics("intro_completed", { store_id: q.store });
        window.location.href = "menu.html" + queryStringFrom(q);
      });
    }
  }

  function initMenu() {
    var q = getQuery();
    var state = loadState();
    ensureSessionId(state);
    saveState(state);

    var hostEl = document.getElementById("ogHost");
    var offerEl = document.getElementById("ogOffer");
    var chipsEl = document.getElementById("ogChips");
    var sectionsEl = document.getElementById("ogSections");
    var toastEl = document.getElementById("ogToast");
    var cartBar = document.getElementById("ogCartBar");
    var cartFab = document.getElementById("ogCartFab");
    var cartCount = document.getElementById("ogCartCount");
    var cartFabCount = document.getElementById("ogCartFabCount");
    var cartSubEl = document.getElementById("ogCartSubtotal");
    var restaurantEl = document.getElementById("ogRestaurantName");
    var searchEl = document.getElementById("ogMenuSearch");

    var searchFilter = "";
    if (searchEl) {
      var tmr;
      searchEl.addEventListener("input", function () {
        clearTimeout(tmr);
        tmr = setTimeout(function () {
          searchFilter = searchEl.value.trim().toLowerCase();
          if (searchFilter)
            emitAnalytics("menu_search", {
              store_id: state.store,
              session_id: state.sessionId,
              q_len: searchFilter.length,
            });
          renderMenuSections();
        }, 200);
      });
    }

    function matchesSearch(item) {
      if (!searchFilter) return true;
      var blob = (item.name + " " + (item.description || "")).toLowerCase();
      return blob.indexOf(searchFilter) !== -1;
    }

    emitAnalytics("menu_viewed", {
      store_id: state.store,
      offer_id: state.offerId || null,
      session_id: state.sessionId,
    });

    var menuRef = null;

    function renderMenuSections() {
      if (!menuRef || !chipsEl || !sectionsEl) return;
      var menu = menuRef;
      var activeChip = chipsEl.querySelector(".og-chip.is-active");
      var activeCat = activeChip ? activeChip.getAttribute("data-cat") : "__all";

      var realCats = menu.categories.filter(function (c) {
        return c.id !== "__all";
      });
      sectionsEl.innerHTML = realCats
        .map(function (cat) {
          if (activeCat !== "__all" && activeCat !== cat.id) return "";
          var items = menu.items.filter(function (it) {
            return it.categoryId === cat.id && matchesSearch(it);
          });
          var cards = items
            .map(function (item) {
              var badge =
                item.offerBadge && menu.offer
                  ? '<span class="og-badge">Offer applies</span>'
                  : "";
              return (
                '<div class="og-item">' +
                itemImageHtml(item, menu.restaurant) +
                '<div class="og-item__body">' +
                '<p class="og-item__name">' +
                escapeHtml(item.name) +
                "</p>" +
                '<p class="og-item__meta">' +
                escapeHtml(
                  item.description
                    ? item.description.slice(0, 80)
                    : item.tags
                      ? item.tags.join(" · ")
                      : ""
                ) +
                "</p>" +
                '<div class="og-item__row">' +
                '<span class="og-item__price">' +
                formatItemPrice(item) +
                "</span>" +
                badge +
                "</div></div>" +
                '<button type="button" class="og-btn-add" data-add-id="' +
                escapeHtml(item.id) +
                '" aria-label="Add ' +
                escapeHtml(item.name) +
                '">+</button></div>'
              );
            })
            .join("");
          if (!cards) {
            if (searchFilter)
              cards = '<p class="og-no-results">No dishes match that search.</p>';
            else return "";
          }
          return (
            '<section class="og-section" id="cat-' +
            escapeHtml(cat.id) +
            '" data-category="' +
            escapeHtml(cat.id) +
            '">' +
            '<h2 class="og-section-title">' +
            escapeHtml(cat.name) +
            "</h2>" +
            (cards || "") +
            "</section>"
          );
        })
        .join("");

      sectionsEl.querySelectorAll("[data-add-id]").forEach(function (b) {
        b.addEventListener("click", function () {
          addLine(b.getAttribute("data-add-id"));
        });
      });
    }

    loadMenuData().then(function (result) {
      var menu = result.menu;
      menuRef = menu;

      injectOrderChrome(menu.restaurant.name, menu.restaurant.logoUrl);
      if (restaurantEl) restaurantEl.textContent = menu.restaurant.name;

      if (menu.items.length === 0) {
        var emptyMsg =
          menu.emptyMessage || "Menu is being set up. Please check back soon.";
        if (sectionsEl)
          sectionsEl.innerHTML =
            '<div class="og-empty"><p class="og-empty__text">' +
            escapeHtml(emptyMsg) +
            "</p></div>";
        if (hostEl)
          hostEl.innerHTML = hostBlock(
            "This menu is almost ready — check back in a little bit."
          );
        return;
      }

      if (hostEl) {
        hostEl.innerHTML = hostBlock(
          "Hey! Browse below — search or tap a category. Tap <strong>+</strong> to add."
        );
      }

      if (offerEl && menu.offer) {
        offerEl.innerHTML =
          '<div class="og-offer-banner" role="region" aria-label="Active offer">' +
          '<p class="og-offer-banner__eyebrow">Tonight’s treat</p>' +
          '<h2 class="og-offer-banner__title">' +
          escapeHtml(menu.offer.title) +
          "</h2>" +
          (menu.offer.sub
            ? '<p class="og-offer-banner__sub">' + escapeHtml(menu.offer.sub) + "</p>"
            : "") +
          "</div>";
      }

      function renderCartBar() {
        var sub = cartSubtotal(menu, state.lines);
        var n = 0;
        for (var i = 0; i < state.lines.length; i++) n += state.lines[i].qty;
        var hidden = n === 0;
        if (cartBar) cartBar.hidden = hidden;
        if (cartFab) cartFab.hidden = hidden;
        if (!hidden) {
          if (cartCount) cartCount.textContent = String(n) + " items";
          if (cartFabCount) cartFabCount.textContent = String(n);
          if (cartSubEl) cartSubEl.textContent = formatMoney(sub);
        }
      }

      function addLine(itemId) {
        var existing = null;
        for (var i = 0; i < state.lines.length; i++) {
          if (state.lines[i].itemId === itemId) {
            existing = state.lines[i];
            break;
          }
        }
        if (existing) existing.qty += 1;
        else {
          var it = findItem(menu, itemId);
          state.lines.push({
            itemId: itemId,
            name: it ? it.name : itemId,
            qty: 1,
          });
        }
        saveState(state);
        renderCartBar();
        emitAnalytics("item_added", {
          item_id: itemId,
          store_id: state.store,
          offer_id: state.offerId || null,
          session_id: state.sessionId,
        });
        var it2 = findItem(menu, itemId);
        var hint =
          it2 && it2.tags && it2.tags.indexOf("main") !== -1
            ? "Nice choice — add a drink from your cart suggestions."
            : "Added! Keep browsing.";
        showToast(toastEl, hint);
        var btn = document.querySelector('[data-add-id="' + itemId + '"]');
        if (btn) {
          btn.classList.remove("is-pulse");
          void btn.offsetWidth;
          btn.classList.add("is-pulse");
        }
        if (cartBar && cartBar.querySelector(".og-cart-bar__btn")) {
          var cbtn = cartBar.querySelector(".og-cart-bar__btn");
          cbtn.classList.remove("is-bounce");
          void cbtn.offsetWidth;
          cbtn.classList.add("is-bounce");
        }
      }

      if (chipsEl && sectionsEl) {
        chipsEl.innerHTML = menu.categories
          .map(function (c, idx) {
            var accent =
              c.accent === "teal"
                ? "teal"
                : c.accent === "violet"
                  ? "violet"
                  : c.accent === "rose"
                    ? "rose"
                    : "";
            var cls = "og-chip" + (idx === 0 ? " is-active" : "");
            return (
              '<button type="button" class="' +
              cls +
              '" data-cat="' +
              escapeHtml(c.id) +
              '" data-accent="' +
              accent +
              '">' +
              escapeHtml(c.name) +
              "</button>"
            );
          })
          .join("");

        function scrollToCat(id) {
          if (id === "__all") {
            global.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }
          var sec = document.getElementById("cat-" + id);
          if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        chipsEl.querySelectorAll(".og-chip").forEach(function (chip) {
          chip.addEventListener("click", function () {
            chipsEl.querySelectorAll(".og-chip").forEach(function (c) {
              c.classList.remove("is-active");
            });
            chip.classList.add("is-active");
            scrollToCat(chip.getAttribute("data-cat"));
            renderMenuSections();
          });
        });

        renderMenuSections();
      }

      function goCart() {
        window.location.href = "cart.html" + queryStringFrom(q);
      }
      if (cartBar) {
        cartBar.querySelector(".og-cart-bar__btn").addEventListener("click", goCart);
      }
      if (cartFab) cartFab.addEventListener("click", goCart);

      renderCartBar();
    });
  }

  function initCart() {
    var q = getQuery();
    var state = loadState();
    ensureSessionId(state);
    saveState(state);
    initOrderTheme();

    emitAnalytics("cart_viewed", {
      store_id: state.store,
      offer_id: state.offerId || null,
      session_id: state.sessionId,
    });

    var root = document.getElementById("ogCartRoot");
    var complementsEl = document.getElementById("ogComplements");
    var linesEl = document.getElementById("ogLines");
    var savingsEl = document.getElementById("ogSavingsRow");
    var totalEl = document.getElementById("ogTotal");
    var ctaEl = document.getElementById("ogContinuePay");

    loadMenuData().then(function (result) {
      var menu = result.menu;
      injectOrderChrome(menu.restaurant.name, menu.restaurant.logoUrl);

      function carouselImg(c) {
        if (c.imageUrl)
          return (
            '<div class="og-carousel-card__thumb"><img src="' +
            escapeHtml(c.imageUrl) +
            '" alt="" /></div>'
          );
        return (
          '<div class="og-carousel-card__emoji" aria-hidden="true">' +
          (c.tags && c.tags.indexOf("drink") !== -1 ? "🥤" : "✨") +
          "</div>"
        );
      }

      function render() {
        if (state.lines.length === 0) {
          if (root) {
            root.innerHTML =
              '<div class="og-empty">' +
              '<div class="og-empty__art" aria-hidden="true">🛒</div>' +
              '<h2 class="og-empty__title">Your cart is empty</h2>' +
              '<p class="og-empty__text">Let’s fill it with something delicious.</p>' +
              '<a class="og-cta" href="menu.html' +
              queryStringFrom(q) +
              '">Browse the menu</a></div>';
          }
          return;
        }

        var comps = state.complementsDismissed
          ? []
          : complementCandidates(menu, state.lines);

        if (complementsEl) {
          if (comps.length === 0) {
            complementsEl.innerHTML = "";
            complementsEl.hidden = true;
          } else {
            complementsEl.hidden = false;
            emitAnalytics("complement_impression", {
              store_id: state.store,
              session_id: state.sessionId,
              complement_ids: comps.map(function (c) {
                return c.id;
              }),
            });
            complementsEl.innerHTML =
              '<div class="og-complements">' +
              '<div class="og-complements__head">' +
              '<div class="og-host og-host--fade" style="flex:1;min-width:0">' +
              '<div class="og-host__avatar" aria-hidden="true">✦</div>' +
              '<p class="og-host__text">Popular with your picks — add a drink or side?</p></div>' +
              '<button type="button" class="og-complements__dismiss" id="ogDismissComplements">Not now</button></div>' +
              '<div class="og-carousel">' +
              comps
                .map(function (c) {
                  return (
                    '<div class="og-carousel-card">' +
                    carouselImg(c) +
                    '<p class="og-carousel-card__name">' +
                    escapeHtml(c.name) +
                    "</p>" +
                    '<p class="og-carousel-card__price">' +
                    formatItemPrice(c) +
                    "</p>" +
                    '<button type="button" class="og-carousel-card__add" data-comp-id="' +
                    escapeHtml(c.id) +
                    '">Add</button></div>'
                  );
                })
                .join("") +
              "</div></div>";

            complementsEl.querySelectorAll("[data-comp-id]").forEach(function (b) {
              b.addEventListener("click", function () {
                var id = b.getAttribute("data-comp-id");
                var existing = null;
                for (var i = 0; i < state.lines.length; i++) {
                  if (state.lines[i].itemId === id) {
                    existing = state.lines[i];
                    break;
                  }
                }
                var it = findItem(menu, id);
                if (existing) existing.qty += 1;
                else
                  state.lines.push({
                    itemId: id,
                    name: it ? it.name : id,
                    qty: 1,
                  });
                saveState(state);
                emitAnalytics("complement_added", {
                  item_id: id,
                  store_id: state.store,
                  session_id: state.sessionId,
                });
                render();
              });
            });
            var dismiss = document.getElementById("ogDismissComplements");
            if (dismiss) {
              dismiss.addEventListener("click", function () {
                state.complementsDismissed = true;
                saveState(state);
                render();
              });
            }
          }
        }

        if (linesEl) {
          linesEl.innerHTML = state.lines
            .map(function (line, idx) {
              var it = findItem(menu, line.itemId);
              var sub = lineSubtotal(line, menu);
              return (
                '<div class="og-line" data-idx="' +
                idx +
                '">' +
                '<div class="og-line__info">' +
                '<p class="og-line__title">' +
                escapeHtml((it && it.name) || line.name) +
                "</p>" +
                '<p class="og-line__price">' +
                formatMoney(sub) +
                "</p>" +
                '<button type="button" class="og-remove" data-remove-idx="' +
                idx +
                '">Remove</button></div>' +
                '<div class="og-qty">' +
                '<button type="button" data-dec="' +
                idx +
                '" aria-label="Decrease">−</button>' +
                "<span>" +
                line.qty +
                "</span>" +
                '<button type="button" data-inc="' +
                idx +
                '" aria-label="Increase">+</button></div></div>'
              );
            })
            .join("");

          linesEl.querySelectorAll("[data-inc]").forEach(function (b) {
            b.addEventListener("click", function () {
              var idx = parseInt(b.getAttribute("data-inc"), 10);
              state.lines[idx].qty += 1;
              saveState(state);
              render();
            });
          });
          linesEl.querySelectorAll("[data-dec]").forEach(function (b) {
            b.addEventListener("click", function () {
              var idx = parseInt(b.getAttribute("data-dec"), 10);
              state.lines[idx].qty -= 1;
              if (state.lines[idx].qty <= 0) state.lines.splice(idx, 1);
              saveState(state);
              render();
            });
          });
          linesEl.querySelectorAll("[data-remove-idx]").forEach(function (b) {
            b.addEventListener("click", function () {
              var idx = parseInt(b.getAttribute("data-remove-idx"), 10);
              state.lines.splice(idx, 1);
              saveState(state);
              render();
            });
          });
        }

        var subtotal = cartSubtotal(menu, state.lines);
        var disc = offerDiscount(menu, state, subtotal);
        var total = Math.round((subtotal - disc) * 100) / 100;

        if (savingsEl) {
          if (disc > 0) {
            savingsEl.hidden = false;
            savingsEl.innerHTML =
              '<span>Offer savings</span><span>−' + formatMoney(disc) + "</span>";
          } else {
            savingsEl.hidden = true;
          }
        }
        if (totalEl) {
          totalEl.innerHTML =
            "<span>Total</span><span>" + formatMoney(total) + "</span>";
        }
        if (ctaEl) {
          ctaEl.onclick = function () {
            window.location.href = "checkout.html" + queryStringFrom(q);
          };
        }
      }

      render();
    });
  }

  function completeOrder(menu, state, q, subtotal, disc, total, method) {
    var orderId = "pp_ord_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    var order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      store: state.store,
      restaurant: menu.restaurant.name,
      offerId: state.offerId || null,
      sessionId: state.sessionId,
      lines: state.lines.slice(),
      subtotal: subtotal,
      discount: disc,
      total: total,
      paymentMethod: method || "demo",
      fulfillmentModes: menu.fulfillmentModes || ["pickup"],
      defaultFulfillment: menu.defaultFulfillment || "pickup",
    };
    try {
      sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
    } catch (e) {}
    emitAnalytics("payment_completed", {
      order_id: orderId,
      store_id: state.store,
      offer_id: state.offerId || null,
      session_id: state.sessionId,
      revenue_cents: Math.round(total * 100),
      payment_method: method || "demo",
    });
    fetch("/api/public/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: orderId,
        store: state.store,
        lines: state.lines,
        total: total,
      }),
    }).catch(function () {});
    clearCartState();
    var tail = queryStringFrom(q);
    if (tail) tail = "&" + tail.slice(1);
    window.location.href =
      "receipt.html?id=" + encodeURIComponent(orderId) + tail;
  }

  function initCheckout() {
    var q = getQuery();
    var state = loadState();
    initOrderTheme();

    emitAnalytics("checkout_started", {
      store_id: state.store,
      offer_id: state.offerId || null,
      session_id: state.sessionId,
    });

    var root = document.getElementById("ogCheckoutRoot");
    var toggle = document.getElementById("ogSummaryToggle");
    var body = document.getElementById("ogSummaryBody");
    var payCard = document.getElementById("ogPayCard");
    var payApple = document.getElementById("ogPayApple");
    var splitRow = document.getElementById("ogSplitPayRow");

    loadMenuData().then(function (result) {
      var menu = result.menu;
      injectOrderChrome(menu.restaurant.name, menu.restaurant.logoUrl);

      if (state.lines.length === 0) {
        if (root) {
          root.innerHTML =
            '<div class="og-empty"><p class="og-empty__text">Nothing to checkout yet.</p><a class="og-cta" href="menu.html' +
            queryStringFrom(q) +
            '">Back to menu</a></div>';
        }
        return;
      }

      var subtotal = cartSubtotal(menu, state.lines);
      var disc = offerDiscount(menu, state, subtotal);
      var total = Math.round((subtotal - disc) * 100) / 100;

      if (toggle && body) {
        toggle.innerHTML =
          "<span>Order summary</span><span>" + formatMoney(total) + "</span>";
        body.innerHTML = state.lines
          .map(function (line) {
            var it = findItem(menu, line.itemId);
            var sub = lineSubtotal(line, menu);
            return (
              "<p style=\"margin:8px 0;font-weight:600\">" +
              escapeHtml((it && it.name) || line.name) +
              " × " +
              line.qty +
              " — " +
              formatMoney(sub) +
              "</p>"
            );
          })
          .join("");
        if (disc > 0) {
          body.innerHTML +=
            '<p style="margin:8px 0;color:#059669;font-weight:700">Savings −' +
            formatMoney(disc) +
            "</p>";
        }
        toggle.addEventListener("click", function () {
          var open = body.classList.toggle("is-open");
          toggle.setAttribute("aria-expanded", open ? "true" : "false");
        });
      }

      if (splitRow) {
        splitRow.innerHTML =
          '<label class="og-split-disabled"><input type="checkbox" disabled /> Split with friends <span class="og-soon">Coming soon</span></label>';
      }

      function pay(method) {
        emitAnalytics("payment_method_selected", {
          method: method,
          store_id: state.store,
          session_id: state.sessionId,
        });
        if (payCard) payCard.disabled = true;
        if (payApple) payApple.disabled = true;
        completeOrder(menu, state, q, subtotal, disc, total, method);
      }

      if (payCard) {
        payCard.addEventListener("click", function () {
          pay("card_demo");
        });
      }

      if (payApple) {
        payApple.addEventListener("click", function () {
          pay("apple_pay_demo");
        });
      }
    });
  }

  function initReceipt() {
    var q = getQuery();
    var params = new URLSearchParams(window.location.search);
    var orderId = params.get("id") || "";
    initOrderTheme();

    var order = null;
    try {
      order = JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) || "null");
    } catch (e) {
      order = null;
    }
    var root = document.getElementById("ogReceiptRoot");
    if (!order || order.id !== orderId) {
      if (root) {
        root.innerHTML =
          '<p class="og-empty__text">Receipt not found. Start a new order from the menu.</p>' +
          '<a class="og-cta" href="menu.html' +
          queryStringFrom(q) +
          '">Menu</a>';
      }
      return;
    }

    var modes = order.fulfillmentModes || ["pickup"];
    var def = order.defaultFulfillment || "pickup";
    var fulfillText =
      modes.indexOf("delivery") !== -1 && def === "delivery"
        ? "Delivery — we’ll update you when your order is on the way."
        : "Pickup — we’ll notify you when your order is ready at the counter.";

    loadMenuData().then(function (result) {
      injectOrderChrome(order.restaurant, result.menu.restaurant.logoUrl);
      if (root) {
        root.innerHTML =
          '<div class="og-receipt">' +
          "<h2>Thanks for your order</h2>" +
          "<p class=\"og-receipt-ref\">#" +
          escapeHtml((order.id || "").slice(-10).toUpperCase()) +
          "</p>" +
          "<ul class=\"og-receipt-lines\">" +
          order.lines
            .map(function (line) {
              return (
                "<li>" +
                escapeHtml(line.name) +
                " × " +
                line.qty +
                "</li>"
              );
            })
            .join("") +
          "</ul>" +
          "<p class=\"og-receipt-total\"><strong>Total " +
          formatMoney(order.total) +
          "</strong></p>" +
          '<p class="og-receipt-fulfill">' +
          escapeHtml(fulfillText) +
          "</p>" +
          '<form class="og-receipt-form" id="ogReceiptForm">' +
          '<label>Email receipt (optional)<input type="email" name="email" autocomplete="email" placeholder="you@email.com" /></label>' +
          '<label>Text updates (optional)<input type="tel" name="phone" autocomplete="tel" placeholder="+1 mobile" /></label>' +
          '<button type="submit" class="og-cta og-cta--secondary">Send copy</button></form>' +
          '<a class="og-cta" href="order-status.html?id=' +
          encodeURIComponent(orderId) +
          (queryStringFrom(q) ? "&" + queryStringFrom(q).slice(1) : "") +
          '">Track order</a></div>';
      }

      var form = document.getElementById("ogReceiptForm");
      if (form) {
        form.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var fd = new FormData(form);
          emitAnalytics("receipt_requested", {
            order_id: orderId,
            store_id: q.store,
            has_email: !!fd.get("email"),
            has_phone: !!fd.get("phone"),
          });
          fetch("/api/public/order-guest/receipt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: orderId,
              email: fd.get("email"),
              phone: fd.get("phone"),
            }),
          }).catch(function () {});
          form.querySelector("button").textContent = "Sent (demo)";
          form.querySelector("button").disabled = true;
        });
      }
    });
  }

  function initStatus() {
    var q = getQuery();
    var params = new URLSearchParams(window.location.search);
    var orderId = params.get("id") || "";
    initOrderTheme();

    var order = null;
    try {
      order = JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) || "null");
    } catch (e) {
      order = null;
    }
    if (!order || order.id !== orderId) {
      order = {
        id: orderId || "—",
        restaurant: q.restaurant || "Restaurant",
        total: 0,
      };
    }

    emitAnalytics("order_status_viewed", {
      order_id: orderId || null,
      store_id: q.store,
      session_id: (order && order.sessionId) || q.session || null,
    });

    loadMenuData().then(function (r) {
      injectOrderChrome(order.restaurant || r.menu.restaurant.name, r.menu.restaurant.logoUrl);
    });

    var titleEl = document.getElementById("ogOrderTitle");
    var refEl = document.getElementById("ogOrderRef");
    if (titleEl) titleEl.textContent = "Order placed!";
    if (refEl) refEl.textContent = "Reference #" + (order.id || orderId).slice(-10).toUpperCase();

    var steps = [
      { key: "received", title: "Received", desc: "The kitchen has your order." },
      { key: "prep", title: "Preparing", desc: "We’re making it fresh." },
      { key: "ready", title: "Almost ready", desc: "Hang tight — almost there!" },
      { key: "enjoy", title: "Enjoy!", desc: "Pick up or receive your delivery." },
    ];

    var timeline = document.getElementById("ogTimeline");
    if (timeline) {
      var activeIndex = 1;
      timeline.innerHTML = steps
        .map(function (s, i) {
          var cls = "og-timeline-step";
          if (i < activeIndex) cls += " is-done";
          else if (i === activeIndex) cls += " is-active";
          return (
            '<li class="' +
            cls +
            '">' +
            '<div><p class="og-timeline-title">' +
            escapeHtml(s.title) +
            "</p>" +
            '<p class="og-timeline-desc">' +
            escapeHtml(s.desc) +
            "</p></div></li>"
          );
        })
        .join("");

      var adv = 1;
      var timer = setInterval(function () {
        adv = Math.min(adv + 1, steps.length - 1);
        var lis = timeline.querySelectorAll(".og-timeline-step");
        lis.forEach(function (li, i) {
          li.classList.remove("is-active", "is-done");
          if (i < adv) li.classList.add("is-done");
          else if (i === adv) li.classList.add("is-active");
        });
        if (adv >= steps.length - 1) clearInterval(timer);
      }, 4000);
    }
  }

  global.PPOrderGuest = {
    initMenu: initMenu,
    initCart: initCart,
    initCheckout: initCheckout,
    initStatus: initStatus,
    initIntro: initIntro,
    initReceipt: initReceipt,
    getQuery: getQuery,
    queryStringFrom: queryStringFrom,
    loadMenuFixture: loadMenuFixture,
    loadMenuData: loadMenuData,
    emitAnalytics: emitAnalytics,
  };
})(typeof window !== "undefined" ? window : this);
