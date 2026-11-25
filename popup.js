const DEFAULT_SETTINGS = {
  focusEnabled: false,
  blockShorts: true,
  blockedSites: ["tiktok.com"],
  prayerNotify: true,
  city: "",
  country: "",
  prayerTimings: null,
  prayerDate: ""
};

const focusToggle = document.getElementById("focusToggle");
const focusStatusBadge = document.getElementById("focusStatusBadge");
const blockShortsToggle = document.getElementById("blockShortsToggle");
const siteInput = document.getElementById("siteInput");
const addSiteBtn = document.getElementById("addSiteBtn");
const blockedSitesList = document.getElementById("blockedSitesList");
const prayerNotifyToggle = document.getElementById("prayerNotifyToggle");
const cityInput = document.getElementById("cityInput");
const countryInput = document.getElementById("countryInput");
const saveLocationBtn = document.getElementById("saveLocationBtn");
const locationStatus = document.getElementById("locationStatus");
const prayerTimesGrid = document.getElementById("prayerTimesGrid");

function normalizeDomain(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
}

function renderStatus(enabled) {
  focusStatusBadge.textContent = enabled ? "Active" : "Off";
  focusStatusBadge.className = enabled ? "badge badge-on" : "badge badge-off";
}

function renderBlockedSites(sites) {
  blockedSitesList.innerHTML = "";
  sites.forEach((site) => {
    const li = document.createElement("li");
    li.className = "site-item";
    const span = document.createElement("span");
    span.textContent = site;
    const btn = document.createElement("button");
    btn.className = "remove-btn";
    btn.textContent = "Remove";
    btn.addEventListener("click", async () => {
      const data = await chrome.storage.local.get(DEFAULT_SETTINGS);
      const updated = data.blockedSites.filter((s) => s !== site);
      await chrome.storage.local.set({ blockedSites: updated });
      renderBlockedSites(updated);
    });
    li.appendChild(span);
    li.appendChild(btn);
    blockedSitesList.appendChild(li);
  });
}

function renderPrayerTimes(timings) {
  prayerTimesGrid.innerHTML = "";
  if (!timings) return;
  const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  prayers.forEach((name) => {
    const cell = document.createElement("div");
    cell.className = "prayer-cell";
    const label = document.createElement("div");
    label.className = "prayer-name";
    label.textContent = name;
    const time = document.createElement("div");
    time.className = "prayer-time";
    time.textContent = (timings[name] || "--:--").split(" ")[0];
    cell.appendChild(label);
    cell.appendChild(time);
    prayerTimesGrid.appendChild(cell);
  });
}

async function init() {
  const data = await chrome.storage.local.get(DEFAULT_SETTINGS);
  focusToggle.checked = data.focusEnabled;
  blockShortsToggle.checked = data.blockShorts;
  prayerNotifyToggle.checked = data.prayerNotify;
  cityInput.value = data.city || "";
  countryInput.value = data.country || "";
  renderStatus(data.focusEnabled);
  renderBlockedSites(data.blockedSites);
  renderPrayerTimes(data.prayerTimings);
  if (data.city && data.country) {
    locationStatus.textContent = `Showing times for ${data.city}, ${data.country}`;
  } else {
    locationStatus.textContent = "Enter your city & country for prayer reminders.";
  }
}

focusToggle.addEventListener("change", async () => {
  const enabled = focusToggle.checked;
  await chrome.storage.local.set({ focusEnabled: enabled });
  renderStatus(enabled);
});

blockShortsToggle.addEventListener("change", async () => {
  await chrome.storage.local.set({ blockShorts: blockShortsToggle.checked });
});

prayerNotifyToggle.addEventListener("change", async () => {
  await chrome.storage.local.set({ prayerNotify: prayerNotifyToggle.checked });
});

addSiteBtn.addEventListener("click", async () => {
  const domain = normalizeDomain(siteInput.value);
  if (!domain) return;
  const data = await chrome.storage.local.get(DEFAULT_SETTINGS);
  if (!data.blockedSites.includes(domain)) {
    const updated = [...data.blockedSites, domain];
    await chrome.storage.local.set({ blockedSites: updated });
    renderBlockedSites(updated);
  }
  siteInput.value = "";
});

saveLocationBtn.addEventListener("click", async () => {
  const city = cityInput.value.trim();
  const country = countryInput.value.trim();
  if (!city || !country) {
    locationStatus.textContent = "Please enter both city and country.";
    return;
  }
  locationStatus.textContent = "Fetching prayer times...";
  await chrome.storage.local.set({ city, country });
  chrome.runtime.sendMessage({ type: "REFRESH_PRAYERS" }, (response) => {
    if (response && response.ok && response.timings) {
      renderPrayerTimes(response.timings);
      locationStatus.textContent = `Updated for ${city}, ${country}`;
    } else {
      locationStatus.textContent = "Could not fetch prayer times. Check city/country spelling.";
    }
  });
});

init();
