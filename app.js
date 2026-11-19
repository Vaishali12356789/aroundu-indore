const SUPABASE_URL = "https://suahnywkmysshkmlqftn.supabase.co";
const SUPABASE_KEY = "sb_publishable_q0WoTzHBfZO12o_gH6dkRg_ffopYrq";
const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const VERIFICATION_CONTACT_PHONE = "+91 9131484821";

let userSession = JSON.parse(localStorage.getItem("aroundu_session")) || null;
let selectedSignupInterests = [];
let editSelectedInterests = [];
let verifiedEmailForSignup = "";

let localPostsList = [];
let joinedNoticeIds = JSON.parse(localStorage.getItem("aroundu_im_in_ids")) || [];
let currentNoticeFilter = "All";
let currentRadius = 10;
let currentCategory = "All";

let communitiesList = [];
let activeGroupId = null;
let groupChatPollTimer = null;

const FALLBACK_VERIFIED_VENDORS = [
  {
    name: "3 Art Architecture & Construction",
    category: "Construction",
    distance: 1.2,
    address: "367, Silicon City, Rau AB Road, Indore",
    badge: "TOP VENDOR ⭐",
    phone: VERIFICATION_CONTACT_PHONE,
    isPaid: true
  }
];

let reelsList = [
  {
    title: "Evening Football & Turf Match in Indore ⚽",
    author: "indore_kickoff",
    category: "Sports",
    likes: 194,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-interior-41489-large.mp4"
  },
  {
    title: "Weekend Cafe & Street Hangout Vibes ☕",
    author: "indore_vibes",
    category: "Entertainment",
    likes: 238,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-barista-pouring-milk-in-a-coffee-cup-41008-large.mp4"
  }
];

window.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("reg-email");
  if (emailInput) {
    emailInput.addEventListener("input", () => {
      const val = emailInput.value.trim().toLowerCase();
      if (verifiedEmailForSignup && val !== verifiedEmailForSignup) {
        verifiedEmailForSignup = "";
        const badge = document.getElementById("otp-badge");
        if (badge) {
          badge.innerText = "Unverified";
          badge.className =
            "text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full";
        }
      }
    });
  }

  if (userSession && userSession.username && userSession.emailVerified) {
    showDashboard();
  } else {
    showAuthScreen();
  }
});

function showAuthScreen() {
  stopGroupChatPolling();
  document.getElementById("auth-screen").classList.remove("hidden");
  document.getElementById("app-dashboard").classList.add("hidden");
}

function showDashboard() {
  const city = userSession?.city || "Indore";

  if (city !== "Indore") {
    alert("AroundU is live exclusively in Indore right now. 🚀");
    localStorage.removeItem("aroundu_session");
    userSession = null;
    showAuthScreen();
    return;
  }

  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("app-dashboard").classList.remove("hidden");

  renderProfileHeader();
  loadCombinedLiveDirectory();
  fetchRealPosts();
  renderReels();
  fetchCommunitiesFromSupabase();
}

function renderProfileHeader() {
  document.getElementById("profile-name").innerText = userSession.name;
  document.getElementById("profile-handle").innerText = "@" + userSession.username;
  document.getElementById("profile-email").innerText = userSession.email;
  document.getElementById("profile-initial").innerText =
    (userSession.name || "U").charAt(0).toUpperCase();
  document.getElementById("stat-city").innerText = userSession.city;
}

async function sendEmailOtp() {
  const email = document.getElementById("reg-email").value.trim().toLowerCase();
  const statusEl = document.getElementById("otp-status-msg");
  const verifyBox = document.getElementById("otp-verify-box");
  const sendBtn = document.getElementById("send-otp-btn");

  if (!email || !email.includes("@")) {
    alert("Please enter a valid Gmail / email address first.");
    return;
  }

  if (!supabaseClient) {
    alert("Supabase connection not ready.");
    return;
  }

  sendBtn.disabled = true;
  sendBtn.innerText = "Sending...";

  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true
    }
  });

  sendBtn.disabled = false;
  sendBtn.innerText = "Resend OTP";

  if (error) {
    statusEl.classList.remove("hidden");
    statusEl.className = "text-[11px] text-rose-600 font-semibold mt-1";
    statusEl.innerText = "OTP error: " + error.message;
    return;
  }

  verifyBox.classList.remove("hidden");
  statusEl.classList.remove("hidden");
  statusEl.className = "text-[11px] text-emerald-700 font-semibold mt-1";
  statusEl.innerText = `OTP sent to ${email}. Check Inbox / Spam folder and enter code below.`;
}

async function verifyEmailOtp() {
  const email = document.getElementById("reg-email").value.trim().toLowerCase();
  const token = document.getElementById("reg-otp-code").value.trim();
  const badge = document.getElementById("otp-badge");
  const statusEl = document.getElementById("otp-status-msg");

  if (!email || !token) {
    alert("Enter the OTP code sent to your Gmail.");
    return;
  }

  if (!supabaseClient) return;

  const { data, error } = await supabaseClient.auth.verifyOtp({
    email,
    token,
    type: "email"
  });

  if (error || !data?.user) {
    statusEl.classList.remove("hidden");
    statusEl.className = "text-[11px] text-rose-600 font-semibold mt-1";
    statusEl.innerText = "Invalid or expired OTP: " + (error?.message || "Try resending OTP.");
    return;
  }

  verifiedEmailForSignup = email;
  badge.innerText = "✓ Verified";
  badge.className =
    "text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full";
  statusEl.classList.remove("hidden");
  statusEl.className = "text-[11px] text-emerald-700 font-semibold mt-1";
  statusEl.innerText = `${email} is verified! Now tap Complete Onboarding.`;
}

function toggleInterest(btnEl) {
  const val = btnEl.getAttribute("data-interest");
  if (!val) return;

  if (selectedSignupInterests.includes(val)) {
    selectedSignupInterests = selectedSignupInterests.filter((item) => item !== val);
    btnEl.classList.remove("bg-neutral-900", "text-white", "border-neutral-900");
    btnEl.classList.add("bg-neutral-100", "text-neutral-600", "border-neutral-200");
  } else {
    selectedSignupInterests.push(val);
    btnEl.classList.remove("bg-neutral-100", "text-neutral-600", "border-neutral-200");
    btnEl.classList.add("bg-neutral-900", "text-white", "border-neutral-900");
  }
}

document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim().toLowerCase();
  const username = document.getElementById("reg-username").value.trim().toLowerCase();
  const dob = document.getElementById("reg-dob").value;
  const city = document.getElementById("reg-city").value;

  if (!verifiedEmailForSignup || verifiedEmailForSignup !== email) {
    alert("Please click 'Send OTP', check your Gmail, and click 'Verify OTP' first.");
    return;
  }

  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (!dob || isNaN(age) || age < 16) {
    alert("Safety Alert: You must be at least 16 years old to join AroundU.");
    return;
  }

  if (city !== "Indore") {
    alert("AroundU is live exclusively in Indore right now.");
    return;
  }

  const interests =
    selectedSignupInterests.length > 0
      ? selectedSignupInterests
      : ["Entertainment", "Market", "Sports"];

  if (supabaseClient) {
    const { data, error } = await supabaseClient
      .from("profiles")
      .upsert([{ name, email, username, dob, city }], { onConflict: "email" })
      .select()
      .single();

    if (error) {
      alert("Profile save error: " + error.message);
      return;
    }

    userSession = { ...data, age, interests, emailVerified: true };
  } else {
    userSession = { name, email, username, age, city, interests, emailVerified: true };
  }

  localStorage.setItem("aroundu_session", JSON.stringify(userSession));
  showDashboard();
});

function openEditProfileModal() {
  if (!userSession) return;
  document.getElementById("edit-name").value = userSession.name || "";
  document.getElementById("edit-username").value = userSession.username || "";
  document.getElementById("edit-city").value = userSession.city || "Indore";
  editSelectedInterests = [...(userSession.interests || [])];

  document.querySelectorAll(".edit-interest-chip").forEach((btn) => {
    const val = btn.getAttribute("data-interest");
    if (editSelectedInterests.includes(val)) {
      btn.classList.remove("bg-neutral-100", "text-neutral-600", "border-neutral-200");
      btn.classList.add("bg-neutral-900", "text-white", "border-neutral-900");
    } else {
      btn.classList.remove("bg-neutral-900", "text-white", "border-neutral-900");
      btn.classList.add("bg-neutral-100", "text-neutral-600", "border-neutral-200");
    }
  });

  document.getElementById("editProfileModal").classList.remove("hidden");
}

function closeEditProfileModal() {
  document.getElementById("editProfileModal").classList.add("hidden");
}

function toggleEditInterest(btnEl) {
  const val = btnEl.getAttribute("data-interest");
  if (!val) return;

  if (editSelectedInterests.includes(val)) {
    editSelectedInterests = editSelectedInterests.filter((item) => item !== val);
    btnEl.classList.remove("bg-neutral-900", "text-white", "border-neutral-900");
    btnEl.classList.add("bg-neutral-100", "text-neutral-600", "border-neutral-200");
  } else {
    editSelectedInterests.push(val);
    btnEl.classList.remove("bg-neutral-100", "text-neutral-600", "border-neutral-200");
    btnEl.classList.add("bg-neutral-900", "text-white", "border-neutral-900");
  }
}

document.getElementById("edit-profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!userSession) return;

  const newName = document.getElementById("edit-name").value.trim();
  const newUsername = document.getElementById("edit-username").value.trim().toLowerCase();
  const newCity = document.getElementById("edit-city").value;

  if (!newName || !newUsername) return;
  if (newCity !== "Indore") {
    alert("AroundU is live exclusively in Indore right now.");
    return;
  }

  const updatedInterests =
    editSelectedInterests.length > 0
      ? editSelectedInterests
      : userSession.interests || ["Entertainment"];

  if (supabaseClient && userSession.email) {
    const { error } = await supabaseClient
      .from("profiles")
      .update({
        name: newName,
        username: newUsername,
        city: newCity
      })
      .eq("email", userSession.email);

    if (error) {
      alert("Could not update profile: " + error.message);
      return;
    }
  }

  userSession = {
    ...userSession,
    name: newName,
    username: newUsername,
    city: newCity,
    interests: updatedInterests
  };

  localStorage.setItem("aroundu_session", JSON.stringify(userSession));
  closeEditProfileModal();
  renderProfileHeader();
  renderReels();
  renderUserProfilePosts();
  alert("Profile updated!");
});

async function handleLogout() {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }
  localStorage.removeItem("aroundu_session");
  userSession = null;
  selectedSignupInterests = [];
  verifiedEmailForSignup = "";
  showAuthScreen();
}

function switchTab(tab) {
  ["explore", "feed", "reels", "communities", "profile"].forEach((t) => {
    const view = document.getElementById(`view-${t}`);
    const tabBtn = document.getElementById(`tab-${t}`);
    if (view) view.classList.add("hidden");
    if (tabBtn) tabBtn.className = "pb-2 px-1 hover:text-neutral-800 transition cursor-pointer";
  });

  const activeView = document.getElementById(`view-${tab}`);
  const activeTab = document.getElementById(`tab-${tab}`);
  if (activeView) activeView.classList.remove("hidden");
  if (activeTab) {
    activeTab.className =
      "text-neutral-900 border-b-2 border-neutral-900 pb-2 px-1 font-bold transition cursor-pointer";
  }
}

function updateRadius(val) {
  currentRadius = parseInt(val, 10);
  document.getElementById("radius-val").innerText = currentRadius + " km";
  const headerRadius = document.getElementById("header-radius-label");
  if (headerRadius) headerRadius.innerText = currentRadius + "km Radius";
  loadCombinedLiveDirectory();
}

function filterShops(category, clickedEl = null) {
  currentCategory = category;
  document.querySelectorAll(".shop-filter-btn").forEach((btn) => {
    btn.classList.remove("bg-neutral-900", "text-white", "font-bold");
    btn.classList.add("bg-neutral-100", "text-neutral-700", "font-semibold");
  });

  if (clickedEl) {
    clickedEl.classList.remove("bg-neutral-100", "text-neutral-700", "font-semibold");
    clickedEl.classList.add("bg-neutral-900", "text-white", "font-bold");
  }

  loadCombinedLiveDirectory();
}

async function fetchFreeLiveOSMData(lat = 22.7196, lng = 75.8577, radiusKm = 10) {
  const radiusMeters = radiusKm * 1000;

  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="cafe"](around:${radiusMeters},${lat},${lng});
      node["amenity"="restaurant"](around:${radiusMeters},${lat},${lng});
      node["shop"="hardware"](around:${radiusMeters},${lat},${lng});
      node["shop"="stationery"](around:${radiusMeters},${lat},${lng});
      node["shop"="books"](around:${radiusMeters},${lat},${lng});
      node["shop"="supermarket"](around:${radiusMeters},${lat},${lng});
      node["amenity"="pharmacy"](around:${radiusMeters},${lat},${lng});
    );
    out body 35;
  `;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query
    });
    const data = await res.json();

    return (data.elements || [])
      .filter((el) => el.tags && el.tags.name)
      .map((el) => {
        const tag = el.tags.amenity || el.tags.shop || "local";
        let cat = "Cafe";
        if (tag === "hardware") cat = "Hardware";
        else if (tag === "stationery" || tag === "books") cat = "Stationery";
        else if (tag === "supermarket") cat = "Grocery";
        else if (tag === "pharmacy") cat = "Medical";

        const dist = calculateDistance(lat, lng, el.lat, el.lon);
        return {
          name: el.tags.name,
          category: cat,
          distance: Number(dist.toFixed(1)),
          address: el.tags["addr:street"] || el.tags["addr:suburb"] || "Indore",
          badge: "FREE LIVE",
          phone: el.tags.phone || VERIFICATION_CONTACT_PHONE,
          isPaid: false
        };
      });
  } catch (err) {
    console.error("OSM Free Live Fetch Error:", err);
    return [];
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchVerifiedVendorsFromSupabase(centerLat = 22.7196, centerLng = 75.8577) {
  if (!supabaseClient) return FALLBACK_VERIFIED_VENDORS;

  try {
    const { data, error } = await supabaseClient
      .from("verified_shops")
      .select("id, name, category, address, phone, lat, lng, is_verified, created_at")
      .eq("is_verified", true)
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return FALLBACK_VERIFIED_VENDORS;
    }

    return data.map((shop) => {
      const dist =
        shop.lat != null && shop.lng != null
          ? Number(calculateDistance(centerLat, centerLng, shop.lat, shop.lng).toFixed(1))
          : 1.5;

      return {
        id: shop.id,
        name: shop.name,
        category: shop.category || "Local",
        distance: dist,
        address: shop.address || "Indore",
        badge: "TOP VENDOR ⭐",
        phone: shop.phone || VERIFICATION_CONTACT_PHONE,
        isPaid: true
      };
    });
  } catch (err) {
    console.error("Unexpected verified_shops error:", err);
    return FALLBACK_VERIFIED_VENDORS;
  }
}

async function loadCombinedLiveDirectory() {
  const container = document.getElementById("shops-list-container");
  if (!container) return;

  container.innerHTML =
    "<div class='text-center py-8 text-xs text-neutral-400 animate-pulse font-medium'>Fetching live profiles in " +
    currentRadius +
    "km radius...</div>";

  const [dbVendors, freeLiveShops] = await Promise.all([
    fetchVerifiedVendorsFromSupabase(22.7196, 75.8577),
    fetchFreeLiveOSMData(22.7196, 75.8577, currentRadius)
  ]);

  let combined = [...dbVendors, ...freeLiveShops].filter(
    (s) => s.distance <= currentRadius
  );

  if (currentCategory !== "All") {
    combined = combined.filter(
      (s) => s.category.toLowerCase() === currentCategory.toLowerCase()
    );
  }

  combined.sort((a, b) => (b.isPaid === a.isPaid ? 0 : b.isPaid ? 1 : -1));
  renderShopsList(combined);
}

function requestVerifiedBadgeFlow(shopName) {
  alert(
    `₹99/Month Star & Verified Badge\n\nBusiness: ${shopName}\nCall / WhatsApp Team: ${VERIFICATION_CONTACT_PHONE}\n\nReach out to coordinate — our team activates your Verified badge within 30 minutes.`
  );
}

function renderShopsList(shops) {
  const container = document.getElementById("shops-list-container");
  if (!container) return;
  container.innerHTML = "";

  if (shops.length === 0) {
    container.innerHTML = `<div class='text-center py-12 text-xs text-neutral-400 font-medium'>No live profiles found within ${currentRadius}km radius.<br>Try increasing the radius slider above!</div>`;
    return;
  }

  shops.forEach((shop) => {
    const isTop = shop.isPaid;
    const safeName = encodeURIComponent(shop.name);
    container.innerHTML += `
      <div class="bg-white p-4 rounded-2xl border ${
        isTop ? "border-pink-300 shadow-sm bg-pink-50/20" : "border-neutral-200/80 shadow-xs"
      } flex justify-between items-center gap-2 card-pop">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[9px] font-extrabold px-2 py-0.5 rounded-md ${
              isTop ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"
            }">${shop.category}</span>
            <span class="text-[9px] font-bold text-emerald-600">📍 ${shop.distance} km away</span>
          </div>
          <h4 class="font-bold text-sm text-neutral-900">${shop.name}</h4>
          <p class="text-[11px] text-neutral-500 mt-0.5">${shop.address}</p>
        </div>
        <div class="flex flex-col items-end gap-1.5 shrink-0">
          ${
            isTop
              ? `<span class="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">⭐ VERIFIED</span>`
              : `<button onclick="requestVerifiedBadgeFlow(decodeURIComponent('${safeName}'))" class="text-[9px] font-bold text-pink-600 bg-pink-50 hover:bg-pink-100 px-2 py-1 rounded-md border border-pink-200 transition cursor-pointer">Get ₹99 Badge</button>`
          }
          <button onclick="alert('Contact: ${shop.phone}')" class="text-xs bg-neutral-900 hover:bg-neutral-800 text-white font-bold px-3 py-1.5 rounded-xl transition cursor-pointer">
            Call / Visit
          </button>
        </div>
      </div>
    `;
  });
}

function isNoticeActive(post) {
  if (!post.expires_at) return true;
  const expiryTime = new Date(post.expires_at).getTime();
  return !isNaN(expiryTime) && expiryTime > Date.now();
}

function formatRemainingTime(expiresAt) {
  if (!expiresAt) return "Active";
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return "Expired";
  const mins = Math.ceil(diffMs / 60000);
  if (mins < 60) return `${mins}m left`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m left` : `${hrs}h left`;
}

function getNoticeParticipantsCount(post) {
  const baseCount = Number(post.im_in_count || 0);
  const localJoined = joinedNoticeIds.includes(String(post.id)) ? 1 : 0;
  return Math.max(baseCount, localJoined);
}

async function handleImInNotice(postId, authorUsername) {
  const idStr = String(postId);
  if (joinedNoticeIds.includes(idStr)) {
    alert(`You're already marked "I'm In" for @${authorUsername}'s notice.`);
    return;
  }

  joinedNoticeIds.push(idStr);
  localStorage.setItem("aroundu_im_in_ids", JSON.stringify(joinedNoticeIds));

  localPostsList = localPostsList.map((p) => {
    if (String(p.id) === idStr) {
      return { ...p, im_in_count: Number(p.im_in_count || 0) + 1 };
    }
    return p;
  });

  renderFeedCards(localPostsList);
  renderUserProfilePosts();
  alert(`You're In! @${authorUsername} can see your interest.`);
}

async function fetchRealPosts() {
  if (!supabaseClient) return;
  const { data: posts, error } = await supabaseClient
    .from("local_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Posts fetch error:", error.message);
    return;
  }

  localPostsList = (posts || []).filter(isNoticeActive);
  renderFeedCards(localPostsList);
  renderUserProfilePosts();
}

function filterFeedNotices(category, clickedEl = null) {
  currentNoticeFilter = category;
  document.querySelectorAll(".notice-filter-btn").forEach((btn) => {
    btn.classList.remove("bg-neutral-900", "text-white", "font-bold");
    btn.classList.add("bg-white", "text-neutral-700", "font-semibold", "border", "border-neutral-200");
  });

  if (clickedEl) {
    clickedEl.classList.remove("bg-white", "text-neutral-700", "font-semibold", "border", "border-neutral-200");
    clickedEl.classList.add("bg-neutral-900", "text-white", "font-bold");
  }

  renderFeedCards(localPostsList);
}

function renderFeedCards(posts) {
  const container = document.getElementById("feed-cards-container");
  if (!container) return;
  container.innerHTML = "";

  const activePosts = (posts || []).filter(isNoticeActive);
  const filteredPosts =
    currentNoticeFilter === "All"
      ? activePosts
      : activePosts.filter(
          (p) => (p.category || "").toLowerCase() === currentNoticeFilter.toLowerCase()
        );

  if (filteredPosts.length === 0) {
    container.innerHTML = `<div class='text-center py-12 text-xs text-neutral-400 font-medium'>No active nearby notices right now.<br>Tap "+ Post Notice" to find someone nearby!</div>`;
    return;
  }

  const userInterests = userSession?.interests || [];
  const orderedPosts = [...filteredPosts].sort((a, b) => {
    const aMatch = userInterests.includes(a.category) ? 1 : 0;
    const bMatch = userInterests.includes(b.category) ? 1 : 0;
    return bMatch - aMatch;
  });

  orderedPosts.forEach((post) => {
    const initial = (post.author || "U").charAt(0).toUpperCase();
    const timeLeft = formatRemainingTime(post.expires_at);
    const inCount = getNoticeParticipantsCount(post);
    const isJoined = joinedNoticeIds.includes(String(post.id));

    container.innerHTML += `
      <div class="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col gap-2.5 card-pop">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 ig-gradient rounded-full text-white text-[11px] font-bold flex items-center justify-center">
              ${initial}
            </div>
            <span class="text-xs font-bold text-neutral-900">@${post.author}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              ⏳ ${timeLeft}
            </span>
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
              ${post.category}
            </span>
          </div>
        </div>

        <div>
          <h4 class="font-bold text-sm text-neutral-900">${post.title}</h4>
          <p class="text-xs text-neutral-600 mt-0.5 leading-relaxed">${post.description}</p>
        </div>

        <div class="pt-2 border-t border-neutral-100 flex items-center justify-between">
          <span class="text-[11px] font-semibold text-neutral-500">
            ${inCount > 0 ? `${inCount} person${inCount > 1 ? "s" : ""} in` : "Be first to join"}
          </span>

          <button
            type="button"
            onclick="handleImInNotice('${post.id}', '${post.author}')"
            class="text-xs ${
              isJoined
                ? "bg-emerald-600 text-white"
                : "bg-neutral-900 hover:bg-neutral-800 text-white"
            } font-bold px-3.5 py-1.5 rounded-xl transition cursor-pointer"
          >
            ${isJoined ? "✓ I'm In" : "I'm In"}
          </button>
        </div>
      </div>
    `;
  });
}

function renderUserProfilePosts() {
  const myContainer = document.getElementById("my-posts-container");
  if (!myContainer) return;
  myContainer.innerHTML = "";

  const userActivePosts = localPostsList.filter(
    (p) => p.author === userSession.username && isNoticeActive(p)
  );
  document.getElementById("stat-posts").innerText = userActivePosts.length;

  if (userActivePosts.length === 0) {
    myContainer.innerHTML = `<div class="bg-white p-4 rounded-2xl border border-neutral-200/80 text-center text-xs text-neutral-400">No active notices right now.</div>`;
    return;
  }

  userActivePosts.forEach((post) => {
    const inCount = getNoticeParticipantsCount(post);
    myContainer.innerHTML += `
      <div class="bg-white p-3 rounded-2xl border border-neutral-200/80 flex flex-col gap-1">
        <div class="flex justify-between items-center">
          <h4 class="font-bold text-xs text-neutral-900">${post.title}</h4>
          <span class="text-[10px] font-bold text-amber-600">⏳ ${formatRemainingTime(post.expires_at)}</span>
        </div>
        <p class="text-[11px] text-neutral-600">${post.description}</p>
        <span class="text-[10px] font-semibold text-emerald-600">${inCount} in</span>
      </div>
    `;
  });
}

function openPostModal() {
  document.getElementById("postModal").classList.remove("hidden");
}
function closePostModal() {
  document.getElementById("postModal").classList.add("hidden");
}

document.getElementById("broadcast-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!supabaseClient || !userSession?.username) return;

  const title = document.getElementById("postTitle").value.trim();
  const category = document.getElementById("postCategory").value;
  const durationHours = parseInt(document.getElementById("postDuration").value, 10) || 3;
  const description = document.getElementById("postDesc").value.trim();
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseClient.from("local_posts").insert([
    {
      title,
      category,
      description,
      author: userSession.username,
      role: "Resident",
      expires_at: expiresAt
    }
  ]);

  if (error) {
    alert("Error: " + error.message);
  } else {
    closePostModal();
    e.target.reset();
    await fetchRealPosts();
    switchTab("feed");
  }
});

function renderReels() {
  const container = document.getElementById("reels-list-container");
  if (!container) return;
  container.innerHTML = "";

  const userInterests = userSession?.interests || [];
  const sortedReels = [...reelsList].sort((a, b) => {
    const aMatch = userInterests.includes(a.category) ? 1 : 0;
    const bMatch = userInterests.includes(b.category) ? 1 : 0;
    return bMatch - aMatch;
  });

  sortedReels.forEach((reel) => {
    const isMatched = userInterests.includes(reel.category);
    container.innerHTML += `
      <div class="bg-black rounded-3xl overflow-hidden shadow-xl text-white relative h-[380px] flex flex-col justify-end p-4">
        <video src="${reel.videoUrl}" autoplay loop muted playsinline class="absolute inset-0 w-full h-full object-cover opacity-80"></video>
        <div class="relative z-10 flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <span class="text-[9px] font-bold px-2 py-0.5 rounded bg-pink-600 text-white w-max uppercase">${reel.category}</span>
            ${
              isMatched
                ? `<span class="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/90 text-white">For Your Interest</span>`
                : ""
            }
          </div>
          <h4 class="font-bold text-sm leading-tight">${reel.title}</h4>
          <div class="flex justify-between items-center pt-1 border-t border-white/20 mt-1">
            <span class="text-xs font-semibold text-slate-200">@${reel.author}</span>
            <div class="flex gap-2">
              <button onclick="this.innerText = '♥ ' + (${reel.likes} + 1)" class="text-xs bg-white/20 backdrop-blur-md px-3 py-1 rounded-full font-bold cursor-pointer">♥ ${reel.likes}</button>
              <button onclick="alert('Opening Direct DM with @${reel.author}')" class="text-xs bg-pink-600 px-3 py-1 rounded-full font-bold cursor-pointer">💬 DM</button>
            </div>
          </div>
        </div>
      </div>
    `;
  });
}

async function fetchCommunitiesFromSupabase() {
  const container = document.getElementById("communities-list-container");
  if (!supabaseClient) return;

  try {
    const [{ data: groups, error: groupsError }, { data: membersRows, error: membersError }] =
      await Promise.all([
        supabaseClient
          .from("communities")
          .select("id, name, category, description, created_by, created_at")
          .order("created_at", { ascending: false }),
        supabaseClient.from("group_members").select("group_id, username")
      ]);

    if (groupsError) {
      console.error("Communities fetch error:", groupsError.message);
      return;
    }

    if (membersError) {
      console.error("Group members fetch error:", membersError.message);
    }

    const membersByGroup = {};
    (membersRows || []).forEach((row) => {
      if (!membersByGroup[row.group_id]) {
        membersByGroup[row.group_id] = [];
      }
      if (!membersByGroup[row.group_id].includes(row.username)) {
        membersByGroup[row.group_id].push(row.username);
      }
    });

    communitiesList = (groups || []).map((g) => ({
      id: g.id,
      name: g.name,
      category: g.category,
      desc: g.description || "",
      author: g.created_by,
      members: membersByGroup[g.id] || []
    }));

    renderCommunities();
  } catch (err) {
    console.error("Unexpected communities error:", err);
  }
}

function renderCommunities() {
  const container = document.getElementById("communities-list-container");
  if (!container) return;
  container.innerHTML = "";

  const currentUsername = userSession?.username || "";
  const userGroups = communitiesList.filter(
    (g) => Array.isArray(g.members) && g.members.includes(currentUsername)
  );

  const statGroupsEl = document.getElementById("stat-groups");
  if (statGroupsEl) {
    statGroupsEl.innerText = userGroups.length;
  }

  if (communitiesList.length === 0) {
    container.innerHTML = `<div class='text-center py-12 text-xs text-neutral-400 font-medium'>No groups yet.<br>Tap "+ New Group" to create one and invite your people.</div>`;
    return;
  }

  communitiesList.forEach((group) => {
    const isMember = Array.isArray(group.members) && group.members.includes(currentUsername);
    const isAdmin = group.author === currentUsername;

    container.innerHTML += `
      <div class="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col gap-2.5 card-pop">
        <div class="flex justify-between items-center">
          <span class="text-[10px] font-bold text-neutral-500">Admin @${group.author}</span>
          <span class="text-[10px] font-semibold text-neutral-400">${group.members.length} members</span>
        </div>
        <div>
          <h4 class="font-bold text-sm text-neutral-900">${group.name}</h4>
          <p class="text-xs text-neutral-600 mt-0.5">${group.desc}</p>
        </div>
        <div class="flex justify-between items-center gap-2 pt-2 border-t border-neutral-100">
          <span class="text-[11px] font-semibold ${isMember ? "text-emerald-600" : "text-neutral-400"}">
            ${isMember ? "Joined • Chat Saved" : "Join to open chat"}
          </span>
          <div class="flex items-center gap-1.5">
            ${
              isAdmin
                ? `<button onclick="invitePersonToGroup('${group.id}')" class="text-[11px] bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold px-2.5 py-1.5 rounded-xl cursor-pointer">
                    + Invite
                  </button>`
                : ""
            }
            ${
              isMember
                ? `<button onclick="openGroupWorkspace('${group.id}')" class="text-xs ig-gradient text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer">
                    Open Chat
                  </button>`
                : `<button onclick="joinGroup('${group.id}')" class="text-xs bg-neutral-900 text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer">
                    Join
                  </button>`
            }
          </div>
        </div>
      </div>
    `;
  });
}

async function invitePersonToGroup(groupId) {
  if (!supabaseClient) return;
  const targetUsername = prompt("Enter username to invite to this group:");
  if (!targetUsername) return;

  const cleanUser = targetUsername.trim().toLowerCase().replace(/^@/, "");
  if (!cleanUser) return;

  const { error } = await supabaseClient
    .from("group_members")
    .upsert([{ group_id: groupId, username: cleanUser }], {
      onConflict: "group_id,username"
    });

  if (error) {
    alert("Invite error: " + error.message);
    return;
  }

  alert(`Invited @${cleanUser} to the group!`);
  await fetchCommunitiesFromSupabase();
}

async function joinGroup(groupId) {
  if (!supabaseClient || !userSession?.username) return;

  const { error } = await supabaseClient
    .from("group_members")
    .upsert([{ group_id: groupId, username: userSession.username }], {
      onConflict: "group_id,username"
    });

  if (error) {
    alert("Could not join group: " + error.message);
    return;
  }

  await fetchCommunitiesFromSupabase();
}

function openGroupModal() {
  document.getElementById("groupModal").classList.remove("hidden");
}
function closeGroupModal() {
  document.getElementById("groupModal").classList.add("hidden");
}

document.getElementById("group-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("groupName").value.trim();
  const inviteRaw = document.getElementById("groupInviteUser").value.trim().toLowerCase().replace(/^@/, "");
  const description = document.getElementById("groupDesc").value.trim();

  if (!name || !userSession?.username || !supabaseClient) return;

  const { data: createdGroup, error: groupError } = await supabaseClient
    .from("communities")
    .insert([
      {
        name,
        category: "Community",
        description,
        created_by: userSession.username
      }
    ])
    .select("id")
    .single();

  if (groupError) {
    alert("Error creating group: " + groupError.message);
    return;
  }

  const membersToAdd = [{ group_id: createdGroup.id, username: userSession.username }];
  if (inviteRaw && inviteRaw !== userSession.username) {
    membersToAdd.push({ group_id: createdGroup.id, username: inviteRaw });
  }

  const { error: memberError } = await supabaseClient
    .from("group_members")
    .upsert(membersToAdd, { onConflict: "group_id,username" });

  if (memberError) {
    alert("Group created, but member invite failed: " + memberError.message);
  }

  closeGroupModal();
  e.target.reset();
  await fetchCommunitiesFromSupabase();
});

function stopGroupChatPolling() {
  if (groupChatPollTimer) {
    clearInterval(groupChatPollTimer);
    groupChatPollTimer = null;
  }
}

function openGroupWorkspace(groupId) {
  const group = communitiesList.find((g) => String(g.id) === String(groupId));
  if (!group) return;

  stopGroupChatPolling();
  activeGroupId = group.id;
  document.getElementById("gw-title").innerText = group.name;
  document.getElementById("gw-meta").innerText = `${group.members.length} members • Admin @${group.author}`;
  document.getElementById("groupWorkspaceModal").classList.remove("hidden");

  loadGroupChat();
  groupChatPollTimer = setInterval(() => {
    if (activeGroupId) loadGroupChat(true);
  }, 4000);
}

function closeGroupWorkspace() {
  stopGroupChatPolling();
  activeGroupId = null;
  document.getElementById("groupWorkspaceModal").classList.add("hidden");
}

function formatChatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

async function loadGroupChat(silent = false) {
  const listEl = document.getElementById("gw-items-list");
  if (!listEl || !activeGroupId || !supabaseClient) return;

  if (!silent) {
    listEl.innerHTML = `<div class="text-center py-6 text-xs text-neutral-400">Loading saved messages...</div>`;
  }

  const { data, error } = await supabaseClient
    .from("group_items")
    .select("id, group_id, sender_username, content, created_at")
    .eq("group_id", activeGroupId)
    .eq("item_type", "chat")
    .order("created_at", { ascending: true });

  if (error) {
    if (!silent) {
      listEl.innerHTML = `<div class="text-center py-6 text-xs text-rose-500">${error.message}</div>`;
    }
    return;
  }

  const messages = data || [];
  if (messages.length === 0) {
    listEl.innerHTML = `<div class="text-center py-8 text-xs text-neutral-400">No messages yet. Group history stays saved here.</div>`;
    return;
  }

  const prevScrollTop = listEl.scrollTop;
  const wasNearBottom = listEl.scrollHeight - listEl.clientHeight - prevScrollTop < 60;

  listEl.innerHTML = "";
  messages.forEach((msg) => {
    const isMine = msg.sender_username === userSession?.username;
    const timeLabel = formatChatTime(msg.created_at);

    listEl.innerHTML += `
      <div class="rounded-2xl px-3.5 py-2.5 max-w-[85%] flex flex-col gap-1 ${
        isMine
          ? "bg-neutral-900 text-white self-end"
          : "bg-neutral-100 text-neutral-800 self-start"
      }">
        <div class="flex items-center justify-between gap-3">
          <span class="text-[10px] font-bold opacity-80">@${msg.sender_username}</span>
          ${timeLabel ? `<span class="text-[9px] opacity-60">${timeLabel}</span>` : ""}
        </div>
        <p class="text-xs leading-relaxed">${msg.content}</p>
      </div>
    `;
  });

  if (!silent || wasNearBottom) {
    listEl.scrollTop = listEl.scrollHeight;
  }
}

const groupItemForm = document.getElementById("group-item-form");
if (groupItemForm) {
  groupItemForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeGroupId || !userSession?.username || !supabaseClient) return;

    const input = document.getElementById("gw-input");
    const content = input ? input.value.trim() : "";
    if (!content) return;

    const { error } = await supabaseClient.from("group_items").insert([
      {
        group_id: activeGroupId,
        sender_username: userSession.username,
        item_type: "chat",
        content,
        votes_count: 0
      }
    ]);

    if (error) {
      alert("Could not send message: " + error.message);
      return;
    }

    input.value = "";
    await loadGroupChat(true);
  });
}