const SUPABASE_URL = "https://suahnywkmysshkmlqftn.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1YWhueXdrbXlzc2hrbWxxZnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1ODQ2MzgsImV4cCI6MjExMDE2MDYzOH0.c1BfJnNkLvV3vn8NC_qMW4tWFDOCGQVuLlKSkb-zq4M";

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
const INVITES_KEY = "aroundu_friend_invites_cache";

const GOOGLE_CATEGORY_TYPES = {
  Cafe: ["cafe", "restaurant", "bakery"],
  Sports: ["sports_complex", "stadium", "gym"],
  Stationery: ["book_store"],
  Construction: ["hardware_store"],
  Entertainment: ["movie_theater", "amusement_center"],
  Market: ["shopping_mall", "supermarket", "store"]
};

function getSupabase() {
  if (window.__arounduSupabase) return window.__arounduSupabase;
  if (window.supabase && typeof window.supabase.createClient === "function") {
    try {
      window.__arounduSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      return window.__arounduSupabase;
    } catch (err) {
      console.warn("Supabase init warning:", err.message);
    }
  }
  return null;
}

const supabaseClient = getSupabase();

let userSession = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
let currentSignupStep = 1;
let selectedSignupInterests = [];
let editSelectedInterests = [];

let otpSentToEmail = "";
let isOtpVerified = false;

let liveMapPlaces = [];
let isLoadingMapPlaces = false;
let placeFetchSeq = 0;
let radiusDebounceTimer = null;

let localNoticesList = JSON.parse(localStorage.getItem(NOTICES_KEY) || "[]");
let joinedNoticeIds = JSON.parse(localStorage.getItem(IM_IN_KEY) || "[]");
let currentNoticeFilter = "All";
let currentRadius = 10;
let currentCategory = "All";
let currentFeedTab = "Reels";

let userReelsList = JSON.parse(localStorage.getItem(REELS_KEY) || "[]");
let shopInquiriesList = JSON.parse(localStorage.getItem(SHOP_INQUIRIES_KEY) || "[]");
let friendInvitesList = JSON.parse(localStorage.getItem(INVITES_KEY) || "[]");

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
    title: "Indore Evening Cafe & Hangout Spot",
    tag: "Cafe",
    location: "Vijay Nagar, Indore",
    distance_km: 4.5,
    creator: "@indore_foodie",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
  },
  {
    id: "reel-2",
    title: "Silicon City & AB Road Site Walkthrough",
    tag: "Construction",
    location: "Silicon City / AB Road, Indore",
    distance_km: 2.4,
    creator: "@3art_indore",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
  },
  {
    id: "reel-3",
    title: "Weekend Turf & Sports Session",
    tag: "Sports",
    location: "Rau, Indore",
    distance_km: 5.8,
    creator: "@indore_sports",
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

async function sendSignupOtp() {
  const email = String(document.getElementById("reg-email")?.value || "")
    .trim()
    .toLowerCase();

  if (!isValidEmail(email)) {
    alert("Please enter a valid email address first.");
    return;
  }

  const sb = getSupabase();
  if (!sb || !sb.auth) {
    alert("Supabase Auth is not available. Please check script loading.");
    return;
  }

  isOtpVerified = false;
  otpSentToEmail = "";

  const badge = document.getElementById("otp-badge");
  const statusEl = document.getElementById("otp-status-text");
  const inputEl = document.getElementById("reg-otp-input");

  if (badge) {
    badge.textContent = "Sending...";
    badge.className =
      "text-[10px] font-black px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-300";
  }
  if (statusEl) {
    statusEl.textContent = `Sending 6-digit OTP to ${email}...`;
  }

  const { error } = await sb.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true
    }
  });

  if (error) {
    if (badge) {
      badge.textContent = "Error";
      badge.className =
        "text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300";
    }
    if (statusEl) {
      statusEl.textContent = `Could not send OTP: ${error.message}`;
    }
    alert(`OTP send failed: ${error.message}`);
    return;
  }

  otpSentToEmail = email;
  if (badge) {
    badge.textContent = "OTP Sent";
    badge.className =
      "text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300";
  }
  if (statusEl) {
    statusEl.textContent = `OTP sent to ${email}. Check Inbox or Spam folder.`;
  }
  if (inputEl) {
    inputEl.value = "";
    inputEl.focus();
  }
}

async function verifySignupOtp() {
  const email = String(document.getElementById("reg-email")?.value || "")
    .trim()
    .toLowerCase();
  const token = String(document.getElementById("reg-otp-input")?.value || "").trim();

  if (!isValidEmail(email)) {
    alert("Please enter a valid email address.");
    return;
  }
  if (!otpSentToEmail || otpSentToEmail !== email) {
    alert("Click 'Send OTP' for this email address first.");
    return;
  }
  if (!/^\d{6}$/.test(token)) {
    alert("Please enter the 6-digit OTP sent to your email.");
    return;
  }

  const sb = getSupabase();
  if (!sb || !sb.auth) {
    alert("Supabase Auth is not available. Please check script loading.");
    return;
  }

  const badge = document.getElementById("otp-badge");
  const statusEl = document.getElementById("otp-status-text");

  const { data, error } = await sb.auth.verifyOtp({
    email,
    token,
    type: "email"
  });

  if (error || !data?.session) {
    isOtpVerified = false;
    if (badge) {
      badge.textContent = "Invalid";
      badge.className =
        "text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300";
    }
    if (statusEl) {
      statusEl.textContent = error?.message || "Invalid or expired OTP.";
    }
    alert(error?.message || "Invalid or expired OTP. Please try again.");
    return;
  }

  isOtpVerified = true;
  if (badge) {
    badge.textContent = "Verified ✓";
    badge.className =
      "text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300";
  }
  if (statusEl) {
    statusEl.textContent = "Email OTP verified successfully.";
  }
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

function mapGoogleTypesToCategory(types = []) {
  const t = new Set((types || []).map((x) => String(x).toLowerCase()));
  if (t.has("cafe") || t.has("restaurant") || t.has("bakery")) return "Cafe";
  if (t.has("sports_complex") || t.has("stadium") || t.has("gym")) return "Sports";
  if (t.has("book_store")) return "Stationery";
  if (t.has("hardware_store")) return "Construction";
  if (t.has("movie_theater") || t.has("amusement_center")) return "Entertainment";
  return "Market";
}

function getPlaceLatLng(loc) {
  if (!loc) return null;
  const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
  const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return { lat, lng };
}

function syncRadiusLabels(kmValue) {
  ["radiusValue", "radiusLabel", "currentRadiusText"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = `${kmValue} km`;
  });
}

async function fetchLiveMapPlaces(radiusKm = currentRadius, category = currentCategory) {
  const seq = ++placeFetchSeq;
  currentRadius = Math.max(1, Math.min(50, Number(radiusKm || 10)));
  currentCategory = category || "All";
  syncRadiusLabels(currentRadius);

  isLoadingMapPlaces = true;
  renderShops();

  try {
    if (!window.google?.maps?.importLibrary) {
      throw new Error("Google Maps JavaScript API not loaded. Check API key in index.html.");
    }

    const [{ Place }] = await Promise.all([google.maps.importLibrary("places")]);

    const includedTypes =
      currentCategory !== "All" && GOOGLE_CATEGORY_TYPES[currentCategory]
        ? GOOGLE_CATEGORY_TYPES[currentCategory]
        : [
            "cafe",
            "restaurant",
            "bakery",
            "book_store",
            "hardware_store",
            "movie_theater",
            "supermarket",
            "shopping_mall"
          ];

    const { places = [] } = await Place.searchNearby({
      fields: ["id", "displayName", "formattedAddress", "location", "types", "rating"],
      locationRestriction: {
        center: { lat: INDORE_CENTER.lat, lng: INDORE_CENTER.lon },
        radius: currentRadius * 1000
      },
      includedTypes,
      maxResultCount: 20
    });

    if (seq !== placeFetchSeq) return;

    liveMapPlaces = places
      .map((p, idx) => {
        const coords = getPlaceLatLng(p.location);
        if (!coords) return null;

        const dist = calculateDistanceKm(
          INDORE_CENTER.lat,
          INDORE_CENTER.lon,
          coords.lat,
          coords.lng
        );
        const name = String(p.displayName || "").trim();
        if (!name) return null;

        const mappedCat =
          currentCategory !== "All" ? currentCategory : mapGoogleTypesToCategory(p.types);

        return {
          id: p.id || `gplace-${idx}`,
          name,
          category: mappedCat,
          area: String(p.formattedAddress || "Indore, MP"),
          distance_km: Number(dist.toFixed(1)),
          source: "Google Live",
          tagline: p.rating ? `Rating ${p.rating} ★ • Nearby in Indore` : "Nearby place in Indore"
        };
      })
      .filter((item) => item && item.distance_km <= currentRadius)
      .sort((a, b) => a.distance_km - b.distance_km);
  } catch (err) {
    if (seq !== placeFetchSeq) return;
    console.warn("Google Places searchNearby error:", err.message);
    liveMapPlaces = [];
  } finally {
    if (seq === placeFetchSeq) {
      isLoadingMapPlaces = false;
      renderShops();
    }
  }
}

function setRadius(newRadiusKm, immediate = true) {
  currentRadius = Math.max(1, Math.min(50, Number(newRadiusKm || 10)));
  syncRadiusLabels(currentRadius);
  clearTimeout(radiusDebounceTimer);

  if (immediate) {
    fetchLiveMapPlaces(currentRadius, currentCategory);
  } else {
    radiusDebounceTimer = setTimeout(() => {
      fetchLiveMapPlaces(currentRadius, currentCategory);
    }, 300);
  }
  if (typeof renderNotices === "function") renderNotices();
}

function setCategory(newCategory) {
  currentCategory = newCategory || "All";
  fetchLiveMapPlaces(currentRadius, currentCategory);
  if (typeof renderNotices === "function") renderNotices();
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
    const email = String(document.getElementById("reg-email")?.value || "")
      .trim()
      .toLowerCase();
    const password = String(document.getElementById("reg-password")?.value || "");

    if (!fullName) {
      alert("Please enter your full name.");
      return;
    }
    if (!isValidEmail(email)) {
      alert("Please enter a valid email address.");
      return;
    }
    if (!isOtpVerified || otpSentToEmail !== email) {
      alert("Please send and verify your OTP first.");
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
      1: "Step 1 of 3 • Account & OTP",
      2: "Step 2 of 3 • Username & Age",
      3: "Step 3 of 3 • City & Interests"
    };
    indicator.textContent = labels[step] || "Step 1 of 3 • Account & OTP";
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

  const sb = getSupabase();
  if (!matchedUser && sb) {
    const byEmail = await sb.from("profiles").select("*").ilike("email", cleanIdentifier).limit(1);
    if (byEmail.data && byEmail.data.length) {
      matchedUser = byEmail.data[0];
    } else if (cleanHandle) {
      const byUsername = await sb
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
  if (typeof enterMainApp === "function") enterMainApp();
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

  const sb = getSupabase();
  if (!sb) return false;

  let query = sb.from("profiles").select("id, username").ilike("username", cleanUser);
  if (excludeUserId) query = query.neq("id", excludeUserId);

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

  if (
    !fullName ||
    !isValidEmail(email) ||
    !isOtpVerified ||
    otpSentToEmail !== email ||
    password.length < 6
  ) {
    goToSignupStep(1);
    alert("Please complete Step 1, verify OTP, and enter a 6+ character password.");
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
      otp_verified: true,
      interests: [...selectedSignupInterests],
      updated_at: new Date().toISOString()
    };

    const userId =
      userSession?.id ||
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `usr-${Date.now()}`);

    let savedRecord = {
      ...profileData,
      id: userId,
      password
    };

    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
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

    if (typeof enterMainApp === "function") enterMainApp();
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

    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
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
  isOtpVerified = false;
  otpSentToEmail = "";
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
    const loadingHtml = `<p class="text-xs text-neutral-500 bg-white p-4 rounded-2xl border border-neutral-200/80">Fetching live Google places in Indore within ${escapeHtml(currentRadius)} km...</p>`;
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
    : `<p class="text-xs text-neutral-500 bg-white p-4 rounded-2xl border border-neutral-200/80">No live places found within ${escapeHtml(currentRadius)} km for this category.</p>`;

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

  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("shop_listing_inquiries").insert([inquiry]);
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
  const fileEl = document.getElementById("reelVideoFile");
  const urlRaw = String(document.getElementById("reelVideoUrl")?.value || "").trim();

  if (!title) {
    alert("Please enter a reel caption.");
    return;
  }

  let videoSrc =
    urlRaw ||
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
  if (fileEl && fileEl.files && fileEl.files[0]) {
    videoSrc = URL.createObjectURL(fileEl.files[0]);
  }

  const creatorHandle = userSession?.username ? `@${userSession.username}` : "@indore_creator";
  const newReel = {
    id: `reel-${Date.now()}`,
    title,
    tag,
    location,
    distance_km: 2.0,
    creator: creatorHandle,
    videoUrl: videoSrc
  };

  userReelsList = [newReel, ...userReelsList];
  try {
    localStorage.setItem(
      REELS_KEY,
      JSON.stringify(userReelsList.filter((r) => !String(r.videoUrl).startsWith("blob:")))
    );
  } catch (_) {}

  const sb = getSupabase();
  if (sb && !String(videoSrc).startsWith("blob:")) {
    const { error } = await sb.from("reels").insert([newReel]);
    if (error) console.warn("Supabase reels sync warning:", error.message);
  }

  const titleEl = document.getElementById("reelTitle");
  const urlEl = document.getElementById("reelVideoUrl");
  if (titleEl) titleEl.value = "";
  if (urlEl) urlEl.value = "";
  if (fileEl) fileEl.value = "";

  if (typeof renderFeedOrReels === "function") {
    renderFeedOrReels();
  }
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
  if (typeof renderFeedOrReels === "function") {
    renderFeedOrReels();
  }
}

function setNoticeFilter(filterName) {
  currentNoticeFilter = filterName;
  if (typeof renderNotices === "function") {
    renderNotices();
  }
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
  const hoursValid = Math.max(
    1,
    Number(document.getElementById("noticeExpiryHours")?.value || 12)
  );

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

  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("notices").insert([newNotice]);
    if (error) console.warn("Supabase notices sync warning:", error.message);
  }

  const titleEl = document.getElementById("noticeTitle");
  const areaEl = document.getElementById("noticeArea");
  if (titleEl) titleEl.value = "";
  if (areaEl) areaEl.value = "";

  if (typeof renderNotices === "function") {
    renderNotices();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  ["radiusSlider", "radiusRange", "radiusSelect"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = String(currentRadius);
      el.addEventListener("input", (e) => setRadius(e.target.value, false));
      el.addEventListener("change", (e) => setRadius(e.target.value, true));
    }
  });

  document.querySelectorAll("[data-category]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setCategory(btn.getAttribute("data-category") || "All");
    });
  });

  fetchLiveMapPlaces(currentRadius, currentCategory);
});
