// Load shared HTML partials (nav)
async function loadPartial(selector, url) {
  const el = document.querySelector(selector);
  if (!el) return;

  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error("Failed to load " + url);
    el.innerHTML = await res.text();
  } catch (err) {
    console.error(err);
  }
}

// Load the shared navigation
loadPartial("#siteHeaderInner", "/partials/nav.html");
