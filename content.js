(() => {
  const OVERLAY_ID = "barakah-focus-overlay";

  function removeOverlay() {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) existing.remove();
  }

  function showOverlay(titleText, bodyText) {
    if (document.getElementById(OVERLAY_ID)) return;
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `
      <div class="barakah-card">
        <h2>${titleText}</h2>
        <p>${bodyText}</p>
      </div>
    `;
    document.documentElement.appendChild(overlay);
  }

  function applyRules(settings) {
    const html = document.documentElement;
    if (!settings.focusEnabled) {
      html.classList.remove("barakah-block-shorts");
      removeOverlay();
      return;
    }

    const host = window.location.hostname.replace(/^www\./, "").toLowerCase();
    const isBlockedDomain = (settings.blockedSites || []).some(
      (domain) => host === domain || host.endsWith("." + domain)
    );

    if (isBlockedDomain) {
      showOverlay(
        "Focus Mode is Active",
        "This website is paused to protect your time. Return to something beneficial."
      );
      return;
    }

    if (settings.blockShorts) {
      html.classList.add("barakah-block-shorts");
      if (host.includes("youtube.com") && window.location.pathname.startsWith("/shorts")) {
        showOverlay(
          "YouTube Shorts Paused",
          "Short-form feeds are hidden during Focus Mode. Search intentionally or close this tab."
        );
        return;
      }
      if (host.includes("instagram.com") && window.location.pathname.startsWith("/reels")) {
        showOverlay(
          "Instagram Reels Paused",
          "Reels are hidden during Focus Mode to help you stay focused."
        );
        return;
      }
    } else {
      html.classList.remove("barakah-block-shorts");
    }

    removeOverlay();
  }

  function sync() {
    chrome.storage.local.get(
      { focusEnabled: false, blockShorts: true, blockedSites: ["tiktok.com"] },
      applyRules
    );
  }

  chrome.storage.onChanged.addListener(sync);
  window.addEventListener("yt-navigate-finish", sync);
  sync();
})();
