window.HOME_MENU_CONFIG = {
  // GitHub Pages / shared mode
  sharedDataUrl: "./data/menu.json", // relative; works on Pages
  // Admin password: SHA-256 hex of the password string "hao2026" (UTF-8)
  adminPasswordSha256:
    "bb49a8816232f7ac5e58ac0d42862ef9f404aea88ae2bfd43d48b11e973604ce",
  // Optional GitHub write for publish (token filled by admin in UI, stored only in localStorage key home-menu-gh-token)
  github: {
    owner: "jiah558",
    repo: "hao-kitchen",
    branch: "main",
    dataPath: "data/menu.json",
  },
};
