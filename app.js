/**
 * Loader: reassembles app source parts for GitHub Pages.
 */
(async function loadHaoKitchenApp() {
  const parts = ["app.part0.js", "app.part1.js", "app.part2.js", "app.part3.js", "app.part4.js"];
  try {
    const texts = await Promise.all(
      parts.map((p) =>
        fetch(p + "?v=20260924e").then((r) => {
          if (!r.ok) throw new Error("Failed to load " + p + ": " + r.status);
          return r.text();
        })
      )
    );
    (0, eval)(texts.join(""));
  } catch (err) {
    console.error(err);
    const el = document.createElement("div");
    el.className = "load-error-banner";
    el.textContent =
      "应用脚本加载失败：" + (err && err.message ? err.message : String(err));
    document.body.prepend(el);
  }
})();
