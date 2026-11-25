const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchPrayerTimes(city, country) {
  if (!city || !country) return null;
  const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=2`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("API error");
  const json = await res.json();
  if (json.code !== 200 || !json.data || !json.data.timings) {
    throw new Error("Invalid response");
  }
  const timings = {};
  PRAYERS.forEach((p) => {
    timings[p] = json.data.timings[p].split(" ")[0];
  });
  await chrome.storage.local.set({
    prayerTimings: timings,
    prayerDate: todayKey(),
    notifiedToday: {}
  });
  return timings;
}

async function checkPrayers() {
  const data = await chrome.storage.local.get({
    prayerNotify: true,
    city: "",
    country: "",
    prayerTimings: null,
    prayerDate: "",
    notifiedToday: {}
  });

  if (!data.city || !data.country) return;

  let timings = data.prayerTimings;
  if (!timings || data.prayerDate !== todayKey()) {
    try {
      timings = await fetchPrayerTimes(data.city, data.country);
    } catch {
      return;
    }
  }

  if (!data.prayerNotify || !timings) return;

  const now = new Date();
  const currentHHMM =
    String(now.getHours()).padStart(2, "0") +
    ":" +
    String(now.getMinutes()).padStart(2, "0");

  for (const prayer of PRAYERS) {
    if (timings[prayer] === currentHHMM && !data.notifiedToday[prayer]) {
      chrome.notifications.create(`prayer-${prayer}-${todayKey()}`, {
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: `Time for ${prayer} Prayer`,
        message: `Pause your work and take a peaceful moment for ${prayer} (${timings[prayer]}).`
      });
      const updated = { ...data.notifiedToday, [prayer]: true };
      await chrome.storage.local.set({ notifiedToday: updated });
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("prayerCheck", { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "prayerCheck") {
    checkPrayers();
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "REFRESH_PRAYERS") {
    chrome.storage.local.get({ city: "", country: "" }).then(async ({ city, country }) => {
      try {
        const timings = await fetchPrayerTimes(city, country);
        sendResponse({ ok: true, timings });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    });
    return true;
  }
});
