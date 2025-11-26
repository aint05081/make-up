// ====== 상수 ======
const THEME_KEY = "my_gallery_theme";
const PROFILE_KEY = "my_profile_data";

// ====== 상태 ======
let photos = [];
let currentUser = null; // Firebase 유저 객체
let activeTag = "ALL";
let tempImageData = null; // 업로드된 이미지 dataURL

// ============================
//   테마
// ============================
function applyTheme() {
  const theme = localStorage.getItem(THEME_KEY) || "light";
  if (theme === "dark") {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
}

// ============================
//   Firestore에서 사진 로드
// ============================
async function loadPhotosFromFirestore() {
  const snapshot = await db
    .collection("photos")
    .orderBy("createdAt", "desc") // 최신순
    .get();

  photos = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      tags: data.tags || [],
      link: data.link || "",
      imageData: data.imageData || placeholderImage(),
      createdAt: data.createdAt
        ? data.createdAt.toDate()
        : new Date(0),
    };
  });
}

// 기본 플레이스홀더 이미지
function placeholderImage() {
  return "https://images.pexels.com/photos/414612/pexels-photo-414612.jpeg?auto=compress&cs=tinysrgb&w=800";
}

// ============================
//   인증 (Firebase Auth)
// ============================
function setupAuthListener() {
  auth.onAuthStateChanged((user) => {
    currentUser = user;
    renderAuthArea(user);
    toggleAdminSection(!!user);
    setupProfileEditor();
  });
}

function renderAuthArea(user) {
  const authArea = document.getElementById("authArea");
  if (!authArea) return;
  authArea.innerHTML = "";

  if (user) {
    // 로그인 상태
    const welcome = document.createElement("span");
    welcome.textContent = `${user.email} 님`;
    welcome.style.fontSize = "0.8rem";

    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "로그아웃";
    logoutBtn.className = "btn small ghost";
    logoutBtn.addEventListener("click", () => {
      auth.signOut();
    });

    authArea.appendChild(welcome);
    authArea.appendChild(logoutBtn);
  } else {
    // 로그아웃 상태: 이메일/비밀번호 로그인만 제공
    const emailInput = document.createElement("input");
    emailInput.id = "authEmail";
    emailInput.placeholder = "이메일";

    const passwordInput = document.createElement("input");
    passwordInput.id = "authPassword";
    passwordInput.placeholder = "비밀번호";
    passwordInput.type = "password";

    const loginBtn = document.createElement("button");
    loginBtn.textContent = "로그인";
    loginBtn.className = "btn small";
    loginBtn.addEventListener("click", () => {
      const email = emailInput.value.trim();
      const pw = passwordInput.value;
      if (!email || !pw) {
        alert("이메일과 비밀번호를 입력하세요.");
        return;
      }
      auth
        .signInWithEmailAndPassword(email, pw)
        .catch((err) => {
          console.error(err);
          alert("로그인에 실패했습니다. 이메일/비밀번호를 확인하세요.");
        });
    });

    authArea.appendChild(emailInput);
    authArea.appendChild(passwordInput);
    authArea.appendChild(loginBtn);
  }
}

function toggleAdminSection(show) {
  const adminSection = document.getElementById("adminSection");
  if (!adminSection) return;
  if (show) {
    adminSection.classList.remove("hidden");
  } else {
    adminSection.classList.add("hidden");
  }
}

// ============================
//   갤러리 렌더링 (무제한)
// ============================
function renderGallery() {
  const grid = document.getElementById("galleryGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const filtered = photos.filter((p) => {
    if (activeTag === "ALL") return true;
    return p.tags && p.tags.includes(activeTag);
  });

  filtered.forEach((photo) => {
    const card = document.createElement("article");
    card.className = "card gallery-card";
    card.addEventListener("click", () => {
      if (photo.link) {
        window.open(photo.link, "_blank");
      }
    });

    const imageWrapper = document.createElement("div");
    imageWrapper.className = "gallery-image";

    const img = document.createElement("img");
    img.src = photo.imageData || placeholderImage();
    img.alt = (photo.tags || []).join(", ") || "photo";
    imageWrapper.appendChild(img);

    const body = document.createElement("div");
    body.className = "gallery-body";

    const tagWrap = document.createElement("div");
    tagWrap.className = "tag-list";
    (photo.tags || []).forEach((tag) => {
      const pill = document.createElement("span");
      pill.className = "tag-pill";
      pill.textContent = `#${tag}`;
      tagWrap.appendChild(pill);
    });

    if (photo.tags && photo.tags.length > 0) {
      body.appendChild(tagWrap);
    }

    card.appendChild(imageWrapper);
    card.appendChild(body);
    grid.appendChild(card);
  });
}

// ============================
//   태그 필터
// ============================
function renderTagFilter() {
  const tagFilter = document.getElementById("tagFilter");
  if (!tagFilter) return;
  tagFilter.innerHTML = "";

  const allTagsSet = new Set();
  photos.forEach((p) => {
    (p.tags || []).forEach((t) => {
      allTagsSet.add(t);
    });
  });

  const tags = ["ALL", ...Array.from(allTagsSet)];

  tags.forEach((tag) => {
    const btn = document.createElement("button");
    btn.textContent = tag === "ALL" ? "전체" : `#${tag}`;
    if (tag === activeTag) btn.classList.add("active");
    btn.addEventListener("click", () => {
      activeTag = tag;
      renderTagFilter();
      renderGallery();
    });
    tagFilter.appendChild(btn);
  });
}

// ============================
//   관리자: 사진 리스트
// ============================
function renderPhotoList() {
  const listEl = document.getElementById("photoList");
  if (!listEl) return;
  listEl.innerHTML = "";

  photos.forEach((photo) => {
    const row = document.createElement("div");
    row.className = "photo-row";

    const thumb = document.createElement("div");
    thumb.className = "photo-thumb";
    const img = document.createElement("img");
    img.src = photo.imageData || placeholderImage();
    thumb.appendChild(img);

    const meta = document.createElement("div");
    meta.className = "photo-meta";

    const mainLine = document.createElement("div");
    mainLine.className = "photo-meta-title";
    mainLine.textContent = photo.link || "(링크 없음)";

    const tags = document.createElement("div");
    tags.className = "photo-meta-tags";
    tags.textContent = (photo.tags || []).map((t) => `#${t}`).join(" ");

    meta.appendChild(mainLine);
    meta.appendChild(tags);

    const actions = document.createElement("div");
    actions.className = "photo-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn small ghost";
    editBtn.textContent = "수정";
    editBtn.addEventListener("click", () => {
      fillFormForEdit(photo.id);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn small";
    deleteBtn.style.background = "#ef4444";
    deleteBtn.style.color = "#f9fafb";
    deleteBtn.textContent = "삭제";
    deleteBtn.addEventListener("click", async () => {
      if (!currentUser) {
        alert("로그인 후 삭제할 수 있습니다.");
        return;
      }
      if (confirm("정말 삭제하시겠습니까?")) {
        await db.collection("photos").doc(photo.id).delete();
        await loadPhotosFromFirestore();
        renderGallery();
        renderTagFilter();
        renderPhotoList();
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    row.appendChild(thumb);
    row.appendChild(meta);
    row.appendChild(actions);

    listEl.appendChild(row);
  });
}

// ============================
//   폼: 업로드/수정
// ============================
function setupForm() {
  const form = document.getElementById("photoForm");
  if (!form) return;

  const imageInput = document.getElementById("imageInput");
  const resetBtn = document.getElementById("resetBtn");

  imageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      tempImageData = event.target.result; // data URL
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert("로그인 후에만 사진을 추가/수정할 수 있습니다.");
      return;
    }

    const idInput = document.getElementById("photoId");
    const tagsInput = document.getElementById("tagsInput");
    const linkInput = document.getElementById("linkInput");

    const link = linkInput.value.trim();
    const tagsRaw = tagsInput.value.trim();

    const tags =
      tagsRaw.length > 0
        ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

    if (!link) {
      alert("링크는 필수입니다.");
      return;
    }

    const existingId = idInput.value;

    if (existingId) {
      // 수정
      const updateData = { tags, link };
      if (tempImageData) {
        updateData.imageData = tempImageData;
      }
      await db.collection("photos").doc(existingId).update(updateData);
    } else {
      // 새로 추가
      await db.collection("photos").add({
        tags,
        link,
        imageData: tempImageData || placeholderImage(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }

    tempImageData = null;
    form.reset();
    idInput.value = "";

    await loadPhotosFromFirestore();
    renderGallery();
    renderTagFilter();
    renderPhotoList();
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    document.getElementById("photoId").value = "";
    tempImageData = null;
  });
}

function fillFormForEdit(id) {
  const photo = photos.find((p) => p.id === id);
  if (!photo) return;

  const idInput = document.getElementById("photoId");
  const tagsInput = document.getElementById("tagsInput");
  const linkInput = document.getElementById("linkInput");
  const imageInput = document.getElementById("imageInput");

  idInput.value = photo.id;
  tagsInput.value = (photo.tags || []).join(", ");
  linkInput.value = photo.link || "";
  imageInput.value = "";
  tempImageData = null;

  document
    .getElementById("adminSection")
    .scrollIntoView({ behavior: "smooth" });
}

// ============================
//   프로필 (localStorage 사용 그대로)
// ============================
function loadProfile() {
  const data = JSON.parse(localStorage.getItem(PROFILE_KEY)) || {
    name: "Your Name",
    bio: "기록을 좋아하는 사람입니다 :)",
    email: "email@example.com",
    link: "https://example.com",
  };

  const nameEl = document.getElementById("profileName");
  const bioEl = document.getElementById("profileBio");
  const emailEl = document.getElementById("profileEmail");
  const linkEl = document.getElementById("profileLink");

  if (nameEl) nameEl.textContent = data.name;
  if (bioEl) bioEl.textContent = data.bio;
  if (emailEl) emailEl.textContent = "📧 " + data.email;
  if (linkEl) {
    linkEl.innerHTML = `🔗 <a href="${data.link}" target="_blank">${data.link}</a>`;
  }

  return data;
}

function saveProfile(data) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
}

function setupProfileEditor() {
  const editArea = document.getElementById("profileEditArea");
  if (!editArea) return;

  if (currentUser) {
    editArea.classList.remove("hidden");

    const saved = loadProfile();

    const editName = document.getElementById("editName");
    const editBio = document.getElementById("editBio");
    const editEmail = document.getElementById("editEmail");
    const editLink = document.getElementById("editLink");
    const saveBtn = document.getElementById("saveProfileBtn");

    if (editName) editName.value = saved.name;
    if (editBio) editBio.value = saved.bio;
    if (editEmail) editEmail.value = saved.email;
    if (editLink) editLink.value = saved.link;

    if (saveBtn && !saveBtn._bound) {
      saveBtn.addEventListener("click", () => {
        const updated = {
          name: editName.value.trim() || "Your Name",
          bio: editBio.value.trim(),
          email: editEmail.value.trim(),
          link: editLink.value.trim() || "https://example.com",
        };
        saveProfile(updated);
        loadProfile();
        alert("프로필이 저장되었습니다!");
      });
      saveBtn._bound = true;
    }
  } else {
    editArea.classList.add("hidden");
  }
}

// ============================
//   초기화
// ============================
document.addEventListener("DOMContentLoaded", async () => {
  // 테마
  applyTheme();
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  // 년도
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // 프로필 로드
  loadProfile();

  // 폼
  setupForm();

  // 인증 리스너
  setupAuthListener();

  // 사진 로드
  try {
    await loadPhotosFromFirestore();
  } catch (e) {
    console.error(e);
  }
  renderGallery();
  renderTagFilter();
  renderPhotoList();
});
