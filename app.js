const SUPABASE_URL = "https://suahnywkmysshkmlqftn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1YWhueXdrbXlzc2hrbWxxZnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1ODQ2MzgsImV4cCI6MjExMDE2MDYzOH0.c1BfJnNkLvV3vn8NC_qMW4tWFDOCGQVuLlKSkb-zq4M";
";

const supabaseClient =
  window.supabase && typeof window.supabase.createClient === "function"
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

const VERIFICATION_CONTACT_PHONE = "+91 9131484821";
const SESSION_KEY = "aroundu_session";
const NOTICES_KEY = "aroundu_notices_cache";
const IM_IN_KEY = "aroundu_im_in_ids";
const GROUPS_KEY = "aroundu_groups_cache";
const CHAT_MESSAGES_KEY = "aroundu_chat_messages_cache";

let userSession = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
let selectedSignupInterests = [];
let editSelectedInterests = [];

let localNoticesList = JSON.parse(localStorage.getItem(NOTICES_KEY) || "[]");
let joinedNoticeIds = JSON.parse(localStorage.getItem(IM_IN_KEY) || "[]");
let currentNoticeFilter = "All";
let currentRadius = 10;
let currentCategory = "All";
let currentFeedTab = "Reels";

let communitiesList = JSON.parse(localStorage.getItem(GROUPS_KEY) || "[]");
let chatMessagesMap = JSON.parse(localStorage.getItem(CHAT_MESSAGES_KEY) || "{}");
let activeGroupId = null;
let groupChatPollTimer = null;

const SAMPLE_NOTICES = [
  {
    id: "notice-1",
    title: "Vijay Nagar Evening Football Match",
    category: "Sports & Football",
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
    category: "Cafes & Food",
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
    tag: "Cafes & Food",
    location: "Vijay Nagar, Indore",
    creator: "@indore_foodie",
    summary: "Quick neighborhood spots for evening hangouts and quiet work."
  },
  {
    id: "reel-2",
    title: "Home Renovation & Site Planning Checklist",
    tag: "Construction",
    location: "AB Road, Indore",
    creator: "@3art_indore",
    summary: "Essential steps before starting residential or commercial work."
  },
  {
    id: "reel-3",
    title: "Weekend Turf & Running Track Meetup",
    tag: "Sports & Football",
    location: "Rau, Indore",
    creator: "@indore_sports",
    summary: "Join local players within your 10 km circle."
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

async function isUsernameTaken(username, excludeUserId = null) {
  const cleanUser = normalizeUsername(username);
  if (!cleanUser) return true;

  if (!supabaseClient) {
    const localUsers = JSON.parse(localStorage.getItem("aroundu_users_cache") || "[]");
    return localUsers.some(
      (u) => normalizeUsername(u.username) === cleanUser && u.id !== excludeUserId
    );
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
    console.error("Username availability check error:", error.message);
    throw new Error("Unable to verify username availability right now. Please try again.");
  }

  return Array.isArray(data) && data.length > 0;
}

function toggleInterest(tag, mode = "signup") {
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
  const containerId = mode === "edit" ? "editInterestsContainer" : "signupInterestsContainer";
  const container = document.getElementById(containerId);
  if (!container) return;

  const activeList = mode === "edit" ? editSelectedInterests : selectedSignupInterests;
  container.querySelectorAll("[data-interest]").forEach((btn) => {
    const val = btn.getAttribute("data-interest");
    const active = activeList.includes(val);
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

async function completeOnboarding(event) {
  if (event) event.preventDefault();

  const fullName = String(document.getElementById("fullName")?.value || "").trim();
  const email = String(document.getElementById("email")?.value || "").trim().toLowerCase();
  const usernameEl = document.getElementById("username");
  const username = normalizeUsername(usernameEl?.value || "");
  const dob = String(document.getElementById("dob")?.value || "").trim();
  const city = String(document.getElementById("city")?.value || "Indore").trim();
  const statusEl = document.getElementById("onboardingStatus");

  if (usernameEl) usernameEl.value = username;

  if (!fullName) {
    alert("Please enter your full name.");
    return;
  }
  if (!isValidEmail(email)) {
    alert("Please enter a valid email address.");
    return;
  }
  if (!username || username.length < 3) {
    alert("Username must be at least 3 characters long (letters, numbers, and underscores only).");
    return;
  }
  if (!isAge16Plus(dob)) {
    alert("You must be at least 16 years old to create an account.");
    return;
  }

  try {
    if (statusEl) statusEl.textContent = "Checking username availability...";

    const taken = await isUsernameTaken(username);
    if (taken) {
      if (statusEl) statusEl.textContent = "";
      alert(`The username "${username}" is already taken. Please choose another one.`);
      return;
    }

    const profileData = {
      full_name: fullName,
      email: email,
      username: username,
      dob: dob,
      city: city,
      interests: selectedSignupInterests,
      updated_at: new Date().toISOString()
    };

    let savedRecord = {
      ...profileData,
      id: userSession?.id || crypto.randomUUID()
    };

    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from("profiles")
        .upsert(profileData, { onConflict: "email" })
        .select()
        .single();

      if (error) {
        if (error.code === "23505" || String(error.message).toLowerCase().includes("unique")) {
          alert(`The username "${username}" is already registered. Please choose a different username.`);
          if (statusEl) statusEl.textContent = "";
          return;
        }
        throw error;
      }
      if (data) savedRecord = data;
    }

    const cache = JSON.parse(localStorage.getItem("aroundu_users_cache") || "[]").filter(
      (u) => u.email !== email && u.username !== username
    );
    cache.push(savedRecord);
    localStorage.setItem("aroundu_users_cache", JSON.stringify(cache));

    userSession = savedRecord;
    localStorage.setItem(SESSION_KEY, JSON.stringify(userSession));

    if (statusEl) statusEl.textContent = "";
    enterMainApp();
  } catch (err) {
    console.error("Onboarding failed:", err);
    if (statusEl) statusEl.textContent = "";
    alert(err.message || "Unable to complete onboarding. Please try again.");
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
        throw error;
      }
      if (data) updates.id = data.id;
    }

    userSession = { ...userSession, ...updates };
    localStorage.setItem(SESSION_KEY, JSON.stringify(userSession));
    syncProfileUI();
    alert("Profile updated successfully.");
  } catch (err) {
    console.error("Profile update failed:", err);
    alert(err.message || "Unable to update profile. Please try again.");
  }
}

function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
  userSession = null;
  const onboardingView = document.getElementById("onboardingView");
  const mainAppView = document.getElementById("mainAppView");
  if (mainAppView) mainAppView.classList.add("hidden");
  if (onboardingView) onboardingView.classList.remove("hidden");
}

function syncProfileUI() {
  if (!userSession) return;

  const nameBadge = document.getElementById("profileNameDisplay");
  const userBadge = document.getElementById("profileUsernameDisplay");
  const cityBadge = document.getElementById("profileCityDisplay");
  const vendorPhoneEl = document.getElementById("vendorVerificationPhone");

  if (nameBadge) nameBadge.textContent = userSession.full_name || "AroundU Member";
  if (userBadge) userBadge.textContent = `@${userSession.username || "user"}`;
  if (cityBadge) cityBadge.textContent = userSession.city || "Indore";
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
    container.innerHTML = `<p class="empty-state">No active notices match the current filter or radius.</p>`;
    return;
  }

  container.innerHTML = list
    .map((n) => {
      const joined = joinedNoticeIds.includes(n.id);
      return `
        <div class="notice-card" data-notice-id="${escapeHtml(n.id)}">
          <div class="notice-meta">
            <span>${escapeHtml(n.category)}</span> • <span>${escapeHtml(n.area)}</span>
          </div>
          <h4>${escapeHtml(n.title)}</h4>
          <p class="notice-author">Posted by ${escapeHtml(n.author_name)} • ${Number(n.distance_km || 2).toFixed(1)} km</p>
          <button type="button" onclick="toggleImIn('${escapeHtml(n.id)}')">
            ${joined ? "I'm In ✓" : "I'm In"} (${Number(n.im_in_count || 0)})
          </button>
        </div>
      `;
    })
    .join("");
}

function renderFeedOrReels() {
  const container = document.getElementById("feedContainer");
  if (!container) return;

  const interests = Array.isArray(userSession?.interests) ? userSession.interests : [];
  const sorted = [...SAMPLE_REELS].sort((a, b) => {
    const aMatch = interests.includes(a.tag) ? 1 : 0;
    const bMatch = interests.includes(b.tag) ? 1 : 0;
    return bMatch - aMatch;
  });

  container.innerHTML = sorted
    .map(
      (item) => `
        <div class="feed-card">
          <span class="feed-tag">${escapeHtml(item.tag)} • ${escapeHtml(currentFeedTab)}</span>
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.summary)}</p>
          <small>${escapeHtml(item.creator)} • ${escapeHtml(item.location)}</small>
        </div>
      `
    )
    .join("");
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
        <button type="button" class="group-item ${isActive ? "active" : ""}" onclick="selectGroup('${escapeHtml(g.id)}')">
          <strong>${escapeHtml(g.name)}</strong>
          <span>${escapeHtml(g.area)}</span>
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
    box.innerHTML = `<p class="empty-state">Start the conversation in this group.</p>`;
    return;
  }

  box.innerHTML = messages
    .map(
      (m) => `
        <div class="chat-msg">
          <strong>${escapeHtml(m.sender)}</strong>
          <p>${escapeHtml(m.text)}</p>
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
  const onboardingView = document.getElementById("onboardingView");
  const mainAppView = document.getElementById("mainAppView");
  if (onboardingView) onboardingView.classList.add("hidden");
  if (mainAppView) mainAppView.classList.remove("hidden");

  syncProfileUI();
  renderNotices();
  renderFeedOrReels();
  initGroups();
  startGroupChatPolling();
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
      renderNotices();
    });
  }

  const categorySelect = document.getElementById("categoryFilter");
  if (categorySelect) {
    categorySelect.addEventListener("change", (e) => {
      currentCategory = e.target.value || "All";
      renderNotices();
    });
  }

  const onboardingForm = document.getElementById("onboardingForm");
  if (onboardingForm) onboardingForm.addEventListener("submit", completeOnboarding);

  const editForm = document.getElementById("editProfileForm");
  if (editForm) editForm.addEventListener("submit", saveProfileChanges);

  const noticeForm = document.getElementById("createNoticeForm");
  if (noticeForm) noticeForm.addEventListener("submit", createNotice);

  const chatForm = document.getElementById("groupChatForm");
  if (chatForm) chatForm.addEventListener("submit", sendGroupMessage);

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);

  renderInterestButtons("signup");

  if (userSession && userSession.username) {
    enterMainApp();
  }
});
