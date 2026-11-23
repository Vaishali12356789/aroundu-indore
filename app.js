const SUPABASE_URL = "https://suahnywkmysshkmlqftn.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1YWhueXdrbXlzc2hrbWxxZnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1ODQ2MzgsImV4cCI6MjExMDE2MDYzOH0.c1BfJnNkLvV3vn8NC_qMW4tWFDOCGQVuLlKSkb-zq4M";

// Optional: If you have a billing-enabled Google Maps API key, set it here; otherwise live OpenStreetMap/Overpass data is used.
const GOOGLE_MAPS_API_KEY = "";

const INDORE_CENTER = { lat: 22.7196, lon: 75.8577 };
const VERIFICATION_CONTACT_PHONE = "+91 9131484821";
const SHOP_LISTING_PRICE_INR = 99;

const SESSION_KEY = "aroundu_session";
const USERS_CACHE_KEY = "aroundu_users_cache";
const NOTICES_KEY = "aroundu_notices_cache";
const IM_IN_KEY = "aroundu_im_in_ids";
const GROUPS_KEY = "aroundu_groups_cache";
const CHAT_MESSAGES_KEY = "aroundu_chat_messages_cache";
const REELS_KEY = "aroundu_reels_cache";
const SHOP_INQUIRIES_KEY = "aroundu_shop_inquiries_cache";

let userSession = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
let currentSignupStep = 1;
let selectedSignupInterests = [];
let editSelectedInterests = [];

let liveMapPlaces = [];
let isLoadingMapPlaces = false;

let localNoticesList = JSON.parse(localStorage.getItem(NOTICES_KEY) || "[]");
let joinedNoticeIds = JSON.parse(localStorage.getItem(IM_IN_KEY) || "[]");
let currentNoticeFilter = "All";
let currentRadius = 10;
let currentCategory = "All";
let currentFeedTab = "Reels";

let userReelsList = JSON.parse(localStorage.getItem(REELS_KEY) || "[]");
let shopInquiriesList = JSON.parse(localStorage.getItem(SHOP_INQUIRIES_KEY) || "[]");

let communitiesList = JSON.parse(localStorage.getItem(GROUPS_KEY) || "[]");
let chatMessagesMap = JSON.parse(localStorage.getItem(CHAT_MESSAGES_KEY) || "{}");
let activeGroupId = null;
let groupChatPollTimer = null;

const SAMPLE_NOTICES = [
  {
    id: "notice-1",
    title: "Vijay Nagar Evening Football Match",
    category: "Sports",
    area: "Vijay Nagar, Indore",
    distance_km: 3.2,
    im_in_count: 14,
    expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    author_name: "Aarav Verma"
  },
  {
    id: "notice-2",
    title: "Rau Architecture & Construction Consultation",
    category: "Construction",
    area: "Silicon City / AB Road, Indore",
    distance_km: 6.5,
    im_in_count: 7,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    author_name: "3 Art Architecture"
  },
  {
    id: "notice-3",
    title: "Sarafa & Chhappan Night Walk Group",
    category: "Cafe",
    area: "Rajwada / Palasia, Indore",
    distance_km: 4.8,
    im_in_count: 21,
    expires_at: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
    author_name: "Neha Joshi"
  }
];

const SAMPLE_REELS = [
  {
    id: "reel-1",
    title: "Best Cold Coffee & Study Corners in Indore",
    tag: "Cafe",
    location: "Vijay Nagar, Indore",
    distance_km: 4.5,
    creator: "@indore_foodie",
    summary: "Quick neighborhood spots for evening hangouts and quiet work.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
  },
  {
    id: "reel-2",
    title: "Home Renovation & Site Planning Checklist",
    tag: "Construction",
    location: "Silicon City / AB Road, Indore",
    distance_km: 2.4,
    creator: "@3art_indore",
    summary: "Essential steps before starting residential or commercial work.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
  },
  {
    id: "reel-3",
    title: "Weekend Turf & Running Track Meetup",
    tag: "Sports",
    location: "Rau, Indore",
    distance_km: 5.8,
    creator: "@indore_sports",
    summary: "Join local players within your 10 km circle.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
  }
];

const SAMPLE_GROUPS = [
  { id: "grp-indore-main", name: "Indore Local Circle", area: "All Indore (10 km)" },
  { id: "grp-silicon-rau", name: "Silicon City & Rau Hub", area: "Silicon City / Rau" },
  { id: "grp-vijay-nagar", name: "Vijay Nagar & AB Road", area: "Vijay Nagar / AB Road" }
];

function normalizeUsername(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function isAge16Plus(dobStr) {
  if (!dobStr) return false;
  const dob = new Date(dobStr);
  if (Number.isNaN(dob.getTime())) return false;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 16;
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapOsmTagsToCategory(tags = {}) {
  const amenity = String(tags.amenity || "").toLowerCase();
  const shop = String(tags.shop || "").toLowerCase();
  const craft = String(tags.craft || "").toLowerCase();
  const leisure = String(tags.leisure || "").toLowerCase();

  if (["cafe", "restaurant", "fast_food", "food_court", "bakery"].includes(amenity) || ["bakery", "coffee", "confectionery"].includes(shop)) {
    return "Cafe";
  }
  if (["sports_centre", "stadium", "pitch"].includes(leisure) || ["sports"].includes(shop)) {
    return "Sports";
  }
  if (["stationery", "books", "copyshop"].includes(shop)) {
    return "Stationery";
  }
  if (["builder", "architect", "carpenter", "plumber", "electrician"].includes(craft) || ["hardware", "building_materials"].includes(shop)) {
    return "Construction";
  }
  if (["cinema", "theatre", "arts_centre"].includes(amenity)) {
    return "Entertainment";
  }
  return "Market";
}

async function fetchLiveMapPlaces(radiusKm = currentRadius) {
  isLoadingMapPlaces = true;
  renderShops();

  const radiusMeters = Math.max(1000, Math.min(25000, Number(radiusKm || 10) * 1000));
  const query = `
    [out:json][timeout:15];
    (
      node["name"]["shop"](around:${radiusMeters},${INDORE_CENTER.lat},${INDORE_CENTER.lon});
      node["name"]["amenity"~"cafe|restaurant|fast_food|cinema"](around:${radiusMeters},${INDORE_CENTER.lat},${INDORE_CENTER.lon});
      node["name"]["craft"](around:${radiusMeters},${INDORE_CENTER.lat},${INDORE_CENTER.lon});
      way["name"]["shop"](around:${radiusMeters},${INDORE_CENTER.lat},${INDORE_CENTER.lon});
    );
    out center 40;
  `;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: query
    });
    if (!res.ok) throw new Error(`Map API HTTP ${res.status}`);
    const json = await res.json();
    const elements = Array.isArray(json.elements) ? json.elements : [];

    liveMapPlaces = elements
      .map((el, idx) => {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        const tags = el.tags || {};
        const name = String(tags.name || "").trim();
        if (!name || typeof lat !== "number" || typeof lon !== "number") return null;

        const dist = calculateDistanceKm(INDORE_CENTER.lat, INDORE_CENTER.lon, lat, lon);
        const addr =
          tags["addr:suburb"] ||
          tags["addr:neighbourhood"] ||
          tags["addr:street"] ||
          "Indore, MP";

        return {
          id: `osm-${el.id || idx}`,
          name,
          category: mapOsmTagsToCategory(tags),
          area: String(addr),
          distance_km: Number(dist.toFixed(1)),
          source: "Map Registered",
          tagline: tags.description || tags.shop || tags.amenity || tags.craft || "Registered place on Indore map"
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance_km - b.distance_km);
  } catch (err) {
    console.warn("Live map fetch warning:", err.message);
    liveMapPlaces = [];
  } finally {
    isLoadingMapPlaces = false;
    renderShops();
  }
}

function switchAuthMode(mode = "login") {
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const loginBtn = document.getElementById("mode-login-btn");
  const signupBtn = document.getElementById("mode-signup-btn");

  const isSignup = mode === "signup";
  if (loginForm) loginForm.classList.toggle("hidden", isSignup);
  if (signupForm) signupForm.classList.toggle("hidden", !isSignup);

  if (loginBtn) {
    loginBtn.className = isSignup
      ? "py-2 rounded-lg text-xs font-bold text-neutral-500 hover:text-neutral-800 transition cursor-pointer"
      : "py-2 rounded-lg text-xs font-bold bg-white text-neutral-900 shadow-sm transition cursor-pointer";
  }
  if (signupBtn) {
    signupBtn.className = isSignup
      ? "py-2 rounded-lg text-xs font-bold bg-white text-neutral-900 shadow-sm transition cursor-pointer"
      : "py-2 rounded-lg text-xs font-bold text-neutral-500 hover:text-neutral-800 transition cursor-pointer";
  }

  if (isSignup) {
    goToSignupStep(currentSignupStep || 1);
  }
}

function goToSignupStep(step) {
  if (step > 1) {
    const fullName = String(document.getElementById("reg-name")?.value || "").trim();
    const email = String(document.getElementById("reg-email")?.value || "").trim().toLowerCase();
    const password = String(document.getElementById("reg-password")?.value || "");

    if (!fullName) {
      alert("Please enter your full name.");
      return;
    }
    if (!isValidEmail(email)) {
      alert("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }
  }

  if (step > 2) {
    const usernameEl = document.getElementById("reg-username");
    const username = normalizeUsername(usernameEl?.value || "");
    const dob = String(document.getElementById("reg-dob")?.value || "").trim();
    if (usernameEl) usernameEl.value = username;

    if (!username || username.length < 3) {
      alert("Username must be at least 3 characters long (letters, numbers, and underscores only).");
      return;
    }
    if (!isAge16Plus(dob)) {
      alert("You must be at least 16 years old to create an account.");
      return;
    }
  }

  currentSignupStep = step;
  const s1 = document.getElementById("signup-step-1");
  const s2 = document.getElementById("signup-step-2");
  const s3 = document.getElementById("signup-step-3");
  const indicator = document.getElementById("step-indicator");

  if (s1) s1.classList.toggle("hidden", step !== 1);
  if (s2) s2.classList.toggle("hidden", step !== 2);
  if (s3) s3.classList.toggle("hidden", step !== 3);

  if (indicator) {
    const labels = {
      1: "Step 1 of 3 • Account Details",
      2: "Step 2 of 3 • Username & Age",
      3: "Step 3 of 3 • City & Interests"
    };
    indicator.textContent = labels[step] || "Step 1 of 3 • Account Details";
  }
}

async function handleLogin(event) {
  if (event) event.preventDefault();

  const identifierRaw = String(document.getElementById("login-identifier")?.value || "").trim();
  const password = String(document.getElementById("login-password")?.value || "");

  if (!identifierRaw || !password) {
    alert("Please enter your email or username and password.");
    return;
  }

  const cleanIdentifier = identifierRaw.toLowerCase();
  const cleanHandle = normalizeUsername(identifierRaw);

  const localUsers = JSON.parse(localStorage.getItem(USERS_CACHE_KEY) || "[]");
  let matchedUser = localUsers.find(
    (u) =>
      String(u.email || "").toLowerCase() === cleanIdentifier ||
      normalizeUsername(u.username) === cleanHandle
  );

  if (!matchedUser && supabaseClient) {
    const byEmail = await supabaseClient
      .from("profiles")
      .select("*")
      .ilike("email", cleanIdentifier)
      .limit(1);

    if (byEmail.data && byEmail.data.length) {
      matchedUser = byEmail.data[0];
    } else if (cleanHandle) {
      const byUsername = await supabaseClient
        .from("profiles")
        .select("*")
        .ilike("username", cleanHandle)
        .limit(1);
      if (byUsername.data && byUsername.data.length) {
        matchedUser = byUsername.data[0];
      }
    }
  }

  if (!matchedUser) {
    alert("Account not found. Please sign up to create a new account.");
    return;
  }

  if (matchedUser.password && matchedUser.password !== password) {
    alert("Incorrect password. Please try again.");
    return;
  }

  userSession = matchedUser;
  localStorage.setItem(SESSION_KEY, JSON.stringify(userSession));
  enterMainApp();
}

function toggleInterest(el, mode = "signup") {
  const tag =
    typeof el === "string"
      ? el
      : el?.getAttribute?.("data-interest") || String(el?.textContent || "").trim();
  if (!tag) return;

  const list = mode === "edit" ? editSelectedInterests : selectedSignupInterests;
  const idx = list.indexOf(tag);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push(tag);
  }
  renderInterestButtons(mode);
}

function renderInterestButtons(mode = "signup") {
  const containerId = mode === "edit" ? "edit-interests" : "reg-interests";
  const container = document.getElementById(containerId);
  if (!container) return;

  const activeList = mode === "edit" ? editSelectedInterests : selectedSignupInterests;
  container.querySelectorAll("[data-interest]").forEach((btn) => {
    const val = btn.getAttribute("data-interest");
    const active = activeList.includes(val);
    btn.classList.toggle("active", active);
    btn.classList.toggle("bg-pink-600", active);
    btn.classList.toggle("text-white", active);
    btn.classList.toggle("border-pink-600", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

async function isUsernameTaken(username, excludeUserId = null) {
  const cleanUser = normalizeUsername(username);
  if (!cleanUser) return true;

  const localUsers = JSON.parse(localStorage.getItem(USERS_CACHE_KEY) || "[]");
  const existsLocally = localUsers.some(
    (u) => normalizeUsername(u.username) === cleanUser && u.id !== excludeUserId
  );
  if (existsLocally) return true;

  if (!supabaseClient) {
    return false;
  }

  let query = supabaseClient
    .from("profiles")
    .select("id, username")
    .ilike("username", cleanUser);

  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }

  const { data, error } = await query.limit(1);
  if (error) {
    console.warn("Supabase username check warning:", error.message);
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}

async function completeOnboarding(event) {
  if (event) event.preventDefault();

  const fullName = String(document.getElementById("reg-name")?.value || "").trim();
  const email = String(document.getElementById("reg-email")?.value || "")
    .trim()
    .toLowerCase();
  const password = String(document.getElementById("reg-password")?.value || "");
  const usernameEl = document.getElementById("reg-username");
  const username = normalizeUsername(usernameEl?.value || "");
  const dob = String(document.getElementById("reg-dob")?.value || "").trim();
  const city = String(document.getElementById("reg-city")?.value || "Indore").trim();

  if (usernameEl) usernameEl.value = username;

  if (!fullName || !isValidEmail(email) || password.length < 6) {
    goToSignupStep(1);
    alert("Please complete Step 1 with your name, a valid email, and a 6+ character password.");
    return;
  }
  if (!username || username.length < 3 || !isAge16Plus(dob)) {
    goToSignupStep(2);
    alert("Please complete Step 2 with a 3+ character username and a 16+ date of birth.");
    return;
  }

  try {
    const taken = await isUsernameTaken(username);
    if (taken) {
      goToSignupStep(2);
      alert(`The username "${username}" is already taken. Please choose another one.`);
      return;
    }

    const profileData = {
      full_name: fullName,
      email: email,
      username: username,
      dob: dob,
      city: city,
      interests: [...selectedSignupInterests],
      updated_at: new Date().toISOString()
    };

    let savedRecord = {
      ...profileData,
      id: userSession?.id || crypto.randomUUID(),
      password
    };

    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from("profiles")
        .upsert(profileData, { onConflict: "email" })
        .select()
        .single();

      if (error) {
        if (error.code === "23505" || String(error.message).toLowerCase().includes("unique")) {
          goToSignupStep(2);
          alert(`The username "${username}" is already registered. Please choose a different username.`);
          return;
        }
        console.warn("Supabase profile upsert warning:", error.message);
      } else if (data) {
        savedRecord = { ...data, password };
      }
    }

    const cache = JSON.parse(localStorage.getItem(USERS_CACHE_KEY) || "[]").filter(
      (u) => u.email !== email && u.username !== username
    );
    cache.push(savedRecord);
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(cache));

    userSession = savedRecord;
    localStorage.setItem(SESSION_KEY, JSON.stringify(userSession));

    enterMainApp();
  } catch (err) {
    console.error("Account creation failed:", err);
    alert(err.message || "Unable to create your account. Please try again.");
  }
}

async function saveProfileChanges(event) {
  if (event) event.preventDefault();
  if (!userSession) return;

  const newUsername = normalizeUsername(
    document.getElementById("editUsername")?.value || userSession.username
  );
  const newName = String(
    document.getElementById("editFullName")?.value || userSession.full_name || ""
  ).trim();
  const newCity = String(
    document.getElementById("editCity")?.value || userSession.city || "Indore"
  ).trim();

  if (!newUsername || newUsername.length < 3) {
    alert("Username must be at least 3 characters long.");
    return;
  }

  try {
    const taken = await isUsernameTaken(newUsername, userSession.id);
    if (taken) {
      alert(`The username "${newUsername}" is already in use by another member.`);
      return;
    }

    const updates = {
      full_name: newName || userSession.full_name,
      username: newUsername,
      city: newCity,
      interests: editSelectedInterests.length ? editSelectedInterests : userSession.interests || [],
      updated_at: new Date().toISOString()
    };

    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from("profiles")
        .update(updates)
        .eq("email", userSession.email)
        .select()
        .single();

      if (error) {
        if (error.code === "23505" || String(error.message).toLowerCase().includes("unique")) {
          alert(`The username "${newUsername}" is already taken.`);
          return;
        }
        console.warn("Supabase profile update warning:", error.message);
      } else if (data) {
        updates.id = data.id;
      }
    }

    userSession = { ...userSession, ...updates };
    localStorage.setItem(SESSION_KEY, JSON.stringify(userSession));
    syncProfileUI();
    alert("Profile changes saved.");
  } catch (err) {
    console.error("Profile update failed:", err);
    alert(err.message || "Unable to save profile changes. Please try again.");
  }
}

function handleLogout() {
  localStorage.removeItem(SESSION_KEY);
  userSession = null;
  currentSignupStep = 1;
  const authScreen = document.getElementById("auth-screen");
  const dashboard = document.getElementById("app-dashboard");
  if (dashboard) dashboard.classList.add("hidden");
  if (authScreen) authScreen.classList.remove("hidden");
  switchAuthMode("login");
}

function switchTab(tabName) {
  const sections = ["explore", "reels", "shops", "notices", "groups", "profile"];
  sections.forEach((sec) => {
    const panel = document.getElementById(`section-${sec}`);
    const tabBtn = document.getElementById(`tab-${sec}`);
    if (panel) {
      panel.classList.toggle("hidden", sec !== tabName);
    }
    if (tabBtn) {
      tabBtn.classList.toggle("text-pink-600", sec === tabName);
      tabBtn.classList.toggle("border-b-2", sec === tabName);
      tabBtn.classList.toggle("border-pink-600", sec === tabName);
    }
  });
}

function syncProfileUI() {
  if (!userSession) return;

  const nameBadge = document.getElementById("profileNameDisplay");
  const userBadge = document.getElementById("profileUsernameDisplay");
  const cityBadge = document.getElementById("profileCityDisplay");
  const vendorPhoneEl = document.getElementById("vendorVerificationPhone");

  if (nameBadge) nameBadge.textContent = userSession.full_name || "AroundU Member";
  if (userBadge) userBadge.textContent = `@${userSession.username || "user"}`;
  if (cityBadge) cityBadge.textContent = `City: ${userSession.city || "Indore"}`;
  if (vendorPhoneEl) vendorPhoneEl.textContent = VERIFICATION_CONTACT_PHONE;

  const editFullNameEl = document.getElementById("editFullName");
  const editUsernameEl = document.getElementById("editUsername");
  const editCityEl = document.getElementById("editCity");

  if (editFullNameEl) editFullNameEl.value = userSession.full_name || "";
  if (editUsernameEl) editUsernameEl.value = userSession.username || "";
  if (editCityEl) editCityEl.value = userSession.city || "Indore";

  editSelectedInterests = Array.isArray(userSession.interests) ? [...userSession.interests] : [];
  renderInterestButtons("edit");
}

function renderShops() {
  const container = document.getElementById("shopsContainer");
  const preview = document.getElementById("exploreShopsPreview");
  const badge = document.getElementById("shopsCountBadge");

  if (isLoadingMapPlaces) {
    const loadingHtml = `<p class="text-xs text-neutral-500 bg-white p-4 rounded-2xl border border-neutral-200/80">Fetching registered places on Indore map within ${escapeHtml(currentRadius)} km...</p>`;
    if (container) container.innerHTML = loadingHtml;
    if (preview) preview.innerHTML = loadingHtml;
    return;
  }

  const filteredShops = liveMapPlaces.filter((shop) => {
    const withinRadius = Number(shop.distance_km ?? 2) <= Number(currentRadius || 10);
    const matchesCategory =
      currentCategory === "All" ||
      String(shop.category || "").toLowerCase() === String(currentCategory).toLowerCase();
    return withinRadius && matchesCategory;
  });

  if (badge) {
    badge.textContent = `${filteredShops.length} within ${currentRadius} km`;
  }

  const cardsHtml = filteredShops.length
    ? filteredShops
        .map(
          (shop) => `
            <div class="bg-white p-4 rounded-2xl border border-neutral-200/80 flex flex-col gap-1.5 card-pop">
              <div class="flex items-center justify-between text-[10px] font-bold">
                <span class="text-pink-600 uppercase">${escapeHtml(shop.category)} • ${escapeHtml(shop.source)}</span>
                <span class="text-neutral-500">${Number(shop.distance_km).toFixed(1)} km</span>
              </div>
              <h4 class="text-sm font-bold text-neutral-900">${escapeHtml(shop.name)}</h4>
              <p class="text-xs text-neutral-600">${escapeHtml(shop.tagline)}</p>
              <span class="text-[11px] font-medium text-neutral-400">${escapeHtml(shop.area)}</span>
            </div>
          `
        )
        .join("")
    : `<p class="text-xs text-neutral-500 bg-white p-4 rounded-2xl border border-neutral-200/80">No registered map places found within ${escapeHtml(currentRadius)} km for this filter. Try increasing the radius or switching category to All.</p>`;

  if (container) container.innerHTML = cardsHtml;
  if (preview) preview.innerHTML = cardsHtml;
}

async function submitShopListingInquiry(event) {
  if (event) event.preventDefault();

  const shopName = String(document.getElementById("shopInquiryName")?.value || "").trim();
  const area = String(document.getElementById("shopInquiryArea")?.value || "Indore").trim();
  const phone = String(document.getElementById("shopInquiryPhone")?.value || "").trim();

  if (!shopName || !phone) {
    alert("Please enter your shop name and contact phone number.");
    return;
  }

  const inquiry = {
    id: `shop-inq-${Date.now()}`,
    shop_name: shopName,
    area,
    phone,
    plan_inr: SHOP_LISTING_PRICE_INR,
    submitted_by: userSession?.username || "guest",
    created_at: new Date().toISOString()
  };

  shopInquiriesList = [inquiry, ...shopInquiriesList];
  localStorage.setItem(SHOP_INQUIRIES_KEY, JSON.stringify(shopInquiriesList));

  if (supabaseClient) {
    const { error } = await supabaseClient.from("shop_listing_inquiries").insert([inquiry]);
    if (error) console.warn("Supabase shop inquiry warning:", error.message);
  }

  const nameEl = document.getElementById("shopInquiryName");
  const areaEl = document.getElementById("shopInquiryArea");
  const phoneEl = document.getElementById("shopInquiryPhone");
  if (nameEl) nameEl.value = "";
  if (areaEl) areaEl.value = "";
  if (phoneEl) phoneEl.value = "";

  alert(
    `Request received for "${shopName}" (₹${SHOP_LISTING_PRICE_INR}/month plan). You can also call or WhatsApp ${VERIFICATION_CONTACT_PHONE} directly.`
  );
}

async function createReel(event) {
  if (event) event.preventDefault();

  const title = String(document.getElementById("reelTitle")?.value || "").trim();
  const tag = String(document.getElementById("reelCategory")?.value || "Cafe").trim();
  const location = String(document.getElementById("reelArea")?.value || "Indore").trim();
  const videoUrlRaw = String(document.getElementById("reelVideoUrl")?.value || "").trim();

  if (!title) {
    alert("Please enter a reel title or caption.");
    return;
  }

  const creatorHandle = userSession?.username ? `@${userSession.username}` : "@indore_creator";
  const newReel = {
    id: `reel-${Date.now()}`,
    title,
    tag,
    location,
    distance_km: 2.0,
    creator: creatorHandle,
    summary: `Posted by ${userSession?.full_name || "AroundU Member"} in ${location}.`,
    videoUrl:
      videoUrlRaw ||
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
  };

  userReelsList = [newReel, ...userReelsList];
  localStorage.setItem(REELS_KEY, JSON.stringify(userReelsList));

  if (supabaseClient) {
    const { error } = await supabaseClient.from("reels").insert([newReel]);
    if (error) console.warn("Supabase reels sync warning:", error.message);
  }

  const titleEl = document.getElementById("reelTitle");
  const urlEl = document.getElementById("reelVideoUrl");
  if (titleEl) titleEl.value = "";
  if (urlEl) urlEl.value = "";

  renderFeedOrReels();
}

function toggleReelPlay(videoId, btnEl) {
  const vid = document.getElementById(videoId);
  if (!vid) return;
  if (vid.paused) {
    vid.play().catch(() => {});
    if (btnEl) btnEl.textContent = "Pause";
  } else {
    vid.pause();
    if (btnEl) btnEl.textContent = "Play";
  }
}

function setFeedTab(tabName) {
  currentFeedTab = tabName;
  renderFeedOrReels();
}

function setNoticeFilter(filterName) {
  currentNoticeFilter = filterName;
  renderNotices();
}

function getActiveNotices() {
  const source = localNoticesList.length ? localNoticesList : SAMPLE_NOTICES;
  const now = Date.now();

  return source.filter((item) => {
    const notExpired = !item.expires_at || new Date(item.expires_at).getTime() > now;
    const withinRadius = Number(item.distance_km ?? 2) <= Number(currentRadius || 10);
    const matchesCategory =
      currentCategory === "All" ||
      String(item.category || "").toLowerCase() === String(currentCategory).toLowerCase();
    const matchesFilter =
      currentNoticeFilter === "All" ||
      (currentNoticeFilter === "Joined" && joinedNoticeIds.includes(item.id));

    return notExpired && withinRadius && matchesCategory && matchesFilter;
  });
}

async function createNotice(event) {
  if (event) event.preventDefault();

  const title = String(document.getElementById("noticeTitle")?.value || "").trim();
  const category = String(document.getElementById("noticeCategory")?.value || "General").trim();
  const area = String(document.getElementById("noticeArea")?.value || "Indore").trim();
  const hoursValid = Math.max(1, Number(document.getElementById("noticeExpiryHours")?.value || 12));

  if (!title) {
    alert("Please enter a notice title.");
    return;
  }

  const baseList = localNoticesList.length ? localNoticesList : [...SAMPLE_NOTICES];
  const newNotice = {
    id: `notice-${Date.now()}`,
    title,
    category,
    area,
    distance_km: 2.5,
    im_in_count: 1,
    expires_at: new Date(Date.now() + hoursValid * 60 * 60 * 1000).toISOString(),
    author_name: userSession?.full_name || "Local Member"
  };

  if (!joinedNoticeIds.includes(newNotice.id)) {
    joinedNoticeIds.push(newNotice.id);
    localStorage.setItem(IM_IN_KEY, JSON.stringify(joinedNoticeIds));
  }

  localNoticesList = [newNotice, ...baseList];
  localStorage.setItem(NOTICES_KEY, JSON.stringify(localNoticesList));

  if (supabaseClient) {
    const { error } = await supabaseClient.from("notices").insert([newNotice]);
    if (error) console.warn("Supabase notices sync warning:", error.message);
  }

  const titleEl = document.getElementById("noticeTitle");
  if (titleEl) titleEl.value = "";
  renderNotices();
}

async function toggleImIn(noticeId) {
  const baseList = localNoticesList.length ? localNoticesList : [...SAMPLE_NOTICES];
  const alreadyJoined = joinedNoticeIds.includes(noticeId);

  if (alreadyJoined) {
    joinedNoticeIds = joinedNoticeIds.filter((id) => id !== noticeId);
  } else {
    joinedNoticeIds.push(noticeId);
  }

  localNoticesList = baseList.map((n) => {
    if (n.id !== noticeId) return n;
    const nextCount = Math.max(0, Number(n.im_in_count || 0) + (alreadyJoined ? -1 : 1));
    return { ...n, im_in_count: nextCount };
  });

  localStorage.setItem(IM_IN_KEY, JSON.stringify(joinedNoticeIds));
  localStorage.setItem(NOTICES_KEY, JSON.stringify(localNoticesList));
  renderNotices();
}

function renderNotices() {
  const container = document.getElementById("noticesContainer");
  if (!container) return;

  const list = getActiveNotices();
  if (!list.length) {
    container.innerHTML = `<p class="text-xs text-neutral-500 bg-white p-4 rounded-2xl border border-neutral-200/80">No active notices match the current filter or radius.</p>`;
    return;
  }

  container.innerHTML = list
    .map((n) => {
      const joined = joinedNoticeIds.includes(n.id);
      return `
        <div class="bg-white p-4 rounded-2xl border border-neutral-200/80 flex flex-col gap-2 card-pop">
          <div class="text-[11px] text-neutral-500 font-semibold">
            <span>${escapeHtml(n.category)}</span> • <span>${escapeHtml(n.area)}</span>
          </div>
          <h4 class="text-sm font-bold text-neutral-900">${escapeHtml(n.title)}</h4>
          <p class="text-[11px] text-neutral-500">Posted by ${escapeHtml(n.author_name)} • ${Number(n.distance_km || 2).toFixed(1)} km</p>
          <button type="button" onclick="toggleImIn('${escapeHtml(n.id)}')" class="self-start px-3 py-1.5 rounded-xl text-xs font-bold ${joined ? "bg-pink-600 text-white" : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800"} cursor-pointer">
            ${joined ? "I'm In ✓" : "I'm In"} (${Number(n.im_in_count || 0)})
          </button>
        </div>
      `;
    })
    .join("");
}

function renderFeedOrReels() {
  const container = document.getElementById("feedContainer");
  const reelsContainer = document.getElementById("reelsTabContainer");

  const combinedReels = [...userReelsList, ...SAMPLE_REELS];
  const interests = Array.isArray(userSession?.interests) ? userSession.interests : [];

  const filtered = combinedReels
    .filter((item) => {
      const withinRadius = Number(item.distance_km ?? 3) <= Number(currentRadius || 10);
      const matchesCategory =
        currentCategory === "All" ||
        String(item.tag || "").toLowerCase() === String(currentCategory).toLowerCase();
      return withinRadius && matchesCategory;
    })
    .sort((a, b) => {
      const aMatch = interests.includes(a.tag) ? 1 : 0;
      const bMatch = interests.includes(b.tag) ? 1 : 0;
      return bMatch - aMatch;
    });

  if (reelsContainer) {
    reelsContainer.innerHTML = filtered.length
      ? filtered
          .map(
            (item, idx) => `
              <div class="bg-neutral-950 text-white rounded-3xl overflow-hidden border border-neutral-800 shadow-lg flex flex-col">
                <div class="relative bg-black aspect-[9/12] w-full flex items-center justify-center">
                  <video
                    id="reel-player-${idx}"
                    src="${escapeHtml(item.videoUrl)}"
                    class="w-full h-full object-cover"
                    playsinline
                    muted
                    loop
                    controls
                  ></video>
                  <span class="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full bg-black/65 text-white">
                    ${escapeHtml(item.tag)} • ${Number(item.distance_km ?? 2).toFixed(1)} km
                  </span>
                </div>
                <div class="p-3.5 flex flex-col gap-1.5 bg-neutral-900">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-bold text-pink-400">${escapeHtml(item.creator)}</span>
                    <button
                      type="button"
                      onclick="toggleReelPlay('reel-player-${idx}', this)"
                      class="px-3 py-1 rounded-full text-[11px] font-bold bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                    >
                      Play
                    </button>
                  </div>
                  <h4 class="text-xs font-bold text-white">${escapeHtml(item.title)}</h4>
                  <p class="text-[11px] text-neutral-400">${escapeHtml(item.location)}</p>
                </div>
              </div>
            `
          )
          .join("")
      : `<p class="text-xs text-neutral-500 bg-white p-4 rounded-2xl border border-neutral-200/80">No reels within ${escapeHtml(currentRadius)} km for this filter.</p>`;
  }

  if (container) {
    container.innerHTML = filtered
      .map(
        (item) => `
          <div class="bg-white p-4 rounded-2xl border border-neutral-200/80 flex flex-col gap-1.5 card-pop">
            <span class="text-[10px] font-bold text-pink-600 uppercase">${escapeHtml(item.tag)} • ${escapeHtml(currentFeedTab)}</span>
            <h4 class="text-sm font-bold text-neutral-900">${escapeHtml(item.title)}</h4>
            <p class="text-xs text-neutral-600">${escapeHtml(item.summary || "")}</p>
            <small class="text-[11px] text-neutral-400">${escapeHtml(item.creator)} • ${escapeHtml(item.location)}</small>
          </div>
        `
      )
      .join("");
  }
}

function initGroups() {
  if (!communitiesList.length) {
    communitiesList = [...SAMPLE_GROUPS];
    localStorage.setItem(GROUPS_KEY, JSON.stringify(communitiesList));
  }
  if (!activeGroupId && communitiesList.length) {
    activeGroupId = communitiesList[0].id;
  }
  renderGroups();
  renderGroupChat();
}

function renderGroups() {
  const listEl = document.getElementById("groupsListContainer");
  if (!listEl) return;

  listEl.innerHTML = communitiesList
    .map((g) => {
      const isActive = g.id === activeGroupId;
      return `
        <button type="button" class="text-left p-3 rounded-xl border ${isActive ? "bg-pink-50 border-pink-300" : "bg-white border-neutral-200/80"} cursor-pointer" onclick="selectGroup('${escapeHtml(g.id)}')">
          <strong class="block text-xs font-bold text-neutral-900">${escapeHtml(g.name)}</strong>
          <span class="text-[11px] text-neutral-500">${escapeHtml(g.area)}</span>
        </button>
      `;
    })
    .join("");
}

function selectGroup(groupId) {
  activeGroupId = groupId;
  renderGroups();
  renderGroupChat();
}

function renderGroupChat() {
  const box = document.getElementById("groupChatMessages");
  if (!box || !activeGroupId) return;

  const messages = chatMessagesMap[activeGroupId] || [];
  if (!messages.length) {
    box.innerHTML = `<p class="text-xs text-neutral-400">Start the conversation in this group.</p>`;
    return;
  }

  box.innerHTML = messages
    .map(
      (m) => `
        <div class="mb-2 pb-2 border-b border-neutral-100 last:border-b-0">
          <strong class="text-xs font-bold text-neutral-800">${escapeHtml(m.sender)}</strong>
          <p class="text-xs text-neutral-600 mt-0.5">${escapeHtml(m.text)}</p>
        </div>
      `
    )
    .join("");
  box.scrollTop = box.scrollHeight;
}

async function sendGroupMessage(event) {
  if (event) event.preventDefault();
  if (!activeGroupId) return;

  const input = document.getElementById("groupChatInput");
  const text = String(input?.value || "").trim();
  if (!text) return;

  const sender = userSession?.username
    ? `${userSession.full_name || "Member"} (@${userSession.username})`
    : "AroundU Member";

  const existing = chatMessagesMap[activeGroupId] || [];
  existing.push({
    id: `msg-${Date.now()}`,
    sender,
    text,
    created_at: new Date().toISOString()
  });

  chatMessagesMap[activeGroupId] = existing;
  localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(chatMessagesMap));

  if (supabaseClient) {
    const { error } = await supabaseClient.from("group_messages").insert([
      {
        group_id: activeGroupId,
        sender_username: userSession?.username || "member",
        message: text
      }
    ]);
    if (error) console.warn("Supabase chat sync warning:", error.message);
  }

  if (input) input.value = "";
  renderGroupChat();
}

function startGroupChatPolling() {
  if (groupChatPollTimer) clearInterval(groupChatPollTimer);
  groupChatPollTimer = setInterval(() => {
    renderGroupChat();
  }, 5000);
}

function enterMainApp() {
  const authScreen = document.getElementById("auth-screen");
  const dashboard = document.getElementById("app-dashboard");
  if (authScreen) authScreen.classList.add("hidden");
  if (dashboard) dashboard.classList.remove("hidden");

  const radiusLabel = document.getElementById("header-radius-label");
  if (radiusLabel) radiusLabel.textContent = `${currentRadius} km Radius`;

  syncProfileUI();
  fetchLiveMapPlaces(currentRadius);
  renderNotices();
  renderFeedOrReels();
  initGroups();
  startGroupChatPolling();
  switchTab("explore");
}

document.addEventListener("DOMContentLoaded", () => {
  const radiusInput = document.getElementById("radiusSlider");
  const radiusLabel = document.getElementById("radiusValueDisplay");
  if (radiusInput) {
    radiusInput.value = String(currentRadius);
    if (radiusLabel) radiusLabel.textContent = `${currentRadius} km`;
    radiusInput.addEventListener("input", (e) => {
      currentRadius = Number(e.target.value || 10);
      if (radiusLabel) radiusLabel.textContent = `${currentRadius} km`;
      const headerLabel = document.getElementById("header-radius-label");
      if (headerLabel) headerLabel.textContent = `${currentRadius} km Radius`;
      renderShops();
      renderNotices();
      renderFeedOrReels();
    });
    radiusInput.addEventListener("change", (e) => {
      currentRadius = Number(e.target.value || 10);
      fetchLiveMapPlaces(currentRadius);
    });
  }

  const categorySelect = document.getElementById("categoryFilter");
  if (categorySelect) {
    categorySelect.addEventListener("change", (e) => {
      currentCategory = e.target.value || "All";
      renderShops();
      renderNotices();
      renderFeedOrReels();
    });
  }

  renderInterestButtons("signup");

  if (userSession && userSession.username) {
    enterMainApp();
  } else {
    switchAuthMode("login");
  }
});
