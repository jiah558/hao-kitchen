          renderIngredientRows([{ name: "", amount: "" }]);
        }
        markDirty();
      }
    });
    document.getElementById("ingredient-rows").addEventListener("input", markDirty);

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
