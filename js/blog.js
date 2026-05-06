/* blog.js — Blog / Gallery page */

// ── DOM refs ──────────────────────────────────────────────────
const lightbox        = document.getElementById("lightbox");
const lightboxImg     = document.getElementById("lightbox-img");
const lightboxClose   = document.getElementById("lightbox-close");
const lightboxPrev    = document.getElementById("lightbox-prev");
const lightboxNext    = document.getElementById("lightbox-next");
const lightboxCounter = document.getElementById("lightbox-counter");

// ── Lightbox ─────────────────────────────────────────────────
let lightboxPhotos = [];
let lightboxIndex  = 0;

function openLightbox(photos, index) {
  lightboxPhotos = photos;
  lightboxIndex  = index;
  updateLightbox();
  lightbox.classList.add("open");
}

function updateLightbox() {
  lightboxImg.src = lightboxPhotos[lightboxIndex];
  lightboxCounter.textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}`;
  lightboxPrev.disabled = lightboxIndex === 0;
  lightboxNext.disabled = lightboxIndex === lightboxPhotos.length - 1;
}

lightboxClose.onclick = () => { lightbox.classList.remove("open"); };
lightbox.onclick      = e  => { if (e.target === lightbox) lightbox.classList.remove("open"); };
lightboxPrev.onclick  = e  => { e.stopPropagation(); lightboxIndex--; updateLightbox(); };
lightboxNext.onclick  = e  => { e.stopPropagation(); lightboxIndex++; updateLightbox(); };

document.addEventListener("keydown", e => {
  if (!lightbox.classList.contains("open")) return;
  if (e.key === "ArrowLeft"  && lightboxIndex > 0)                         { lightboxIndex--; updateLightbox(); }
  if (e.key === "ArrowRight" && lightboxIndex < lightboxPhotos.length - 1) { lightboxIndex++; updateLightbox(); }
  if (e.key === "Escape") lightbox.classList.remove("open");
});

// ── Config & state ────────────────────────────────────────────
const POSTS_PER_PAGE = 5;

const params = new URLSearchParams(window.location.search);
const trip   = params.get("trip");

let allFlatPosts = [];
let allUsers     = {};
let currentOrder = "newest";

// ── Helpers ───────────────────────────────────────────────────
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric"
  });
}

function getSortedPosts() {
  return currentOrder === "newest" ? [...allFlatPosts].reverse() : [...allFlatPosts];
}

/** Flatten all posts across locations into [{location, post}, …] */
function flattenPosts(locations) {
  return locations.flatMap(location =>
    (location.posts || []).map(post => ({ location, post }))
  );
}

/** Returns page indices (numbers) and "…" ellipsis strings for the pagination bar */
function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages = [0];
  if (current > 2)          pages.push("...");
  for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) pages.push(i);
  if (current < total - 3)  pages.push("...");
  pages.push(total - 1);
  return pages;
}

// ── Sort toggle ───────────────────────────────────────────────
function setOrder(order) {
  if (order === currentOrder) return;
  currentOrder = order;
  document.getElementById("btn-newest").classList.toggle("active", order === "newest");
  document.getElementById("btn-oldest").classList.toggle("active", order === "oldest");
  const sorted = getSortedPosts();
  renderTOC(sorted, 0);
  goToPage(sorted, 0);
}

// Expose to inline onclick attributes in HTML
window.setOrder = setOrder;

// ── TOC ───────────────────────────────────────────────────────
function buildLocationPageMap(flatPosts) {
  const map = {};
  flatPosts.forEach(({ location }, i) => {
    const page = Math.floor(i / POSTS_PER_PAGE);
    if (!(location.name in map)) map[location.name] = page;
  });
  return map;
}

function renderTOC(flatPosts, currentPage) {
  const tocList = document.getElementById("toc-list");
  tocList.innerHTML = "";
  const locationPageMap = buildLocationPageMap(flatPosts);

  for (const [name, page] of Object.entries(locationPageMap)) {
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.classList.toggle("toc-current-page", page === currentPage);
    btn.onclick = () => goToPage(flatPosts, page);
    tocList.appendChild(btn);
  }
}

// ── Page rendering ────────────────────────────────────────────
function renderPage(flatPosts, page) {
  const galleryDiv = document.getElementById("gallery");
  galleryDiv.innerHTML = "";

  const pagePosts = flatPosts.slice(page * POSTS_PER_PAGE, (page + 1) * POSTS_PER_PAGE);

  let currentLocationName = null;
  let locationSection     = null;

  for (const { location, post } of pagePosts) {
    if (location.name !== currentLocationName) {
      currentLocationName = location.name;
      locationSection = document.createElement("section");
      locationSection.className = "location";
      const h2 = document.createElement("h2");
      h2.textContent = location.name;
      locationSection.appendChild(h2);
      galleryDiv.appendChild(locationSection);
    }

    const user = allUsers[post.username] || {
      display_name: post.username || "Unknown",
      avatar: `https://github.com/${post.username}.png`
    };

    const postDiv = document.createElement("div");
    postDiv.className = "post";
    postDiv.innerHTML = `
      <div class="post-header">
        <img class="avatar" src="${user.avatar}" alt="${user.display_name}">
        <div class="post-meta">
          <span class="author">${user.display_name}</span>
          <span class="post-date">${formatDate(post.date)}</span>
        </div>
      </div>
      <h3>${post.title}</h3>
      ${post.text ? `<p>${post.text}</p>` : ""}
    `;

    const photoGrid    = document.createElement("div");
    photoGrid.className = "gallery";
    const postPhotos   = post.photos || [];

    postPhotos.forEach((url, i) => {
      const img    = document.createElement("img");
      img.src      = url;
      img.alt      = post.title || "";
      img.loading  = "lazy";
      img.addEventListener("click", () => openLightbox(postPhotos, i));
      photoGrid.appendChild(img);
    });

    postDiv.appendChild(photoGrid);
    locationSection.appendChild(postDiv);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function buildPaginationBar(container, flatPosts, currentPage) {
  container.innerHTML = "";
  const totalPages = Math.ceil(flatPosts.length / POSTS_PER_PAGE);
  if (totalPages <= 1) return;

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "← Prev";
  prevBtn.disabled    = currentPage === 0;
  prevBtn.onclick     = () => goToPage(flatPosts, currentPage - 1);
  container.appendChild(prevBtn);

  getPageRange(currentPage, totalPages).forEach(p => {
    if (p === "...") {
      const span = document.createElement("span");
      span.className   = "page-info";
      span.textContent = "…";
      container.appendChild(span);
    } else {
      const btn = document.createElement("button");
      btn.textContent = p + 1;
      btn.classList.toggle("active", p === currentPage);
      btn.onclick = () => goToPage(flatPosts, p);
      container.appendChild(btn);
    }
  });

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next →";
  nextBtn.disabled    = currentPage === totalPages - 1;
  nextBtn.onclick     = () => goToPage(flatPosts, currentPage + 1);
  container.appendChild(nextBtn);

  const info = document.createElement("span");
  info.className   = "page-info";
  const start      = currentPage * POSTS_PER_PAGE + 1;
  const end        = Math.min((currentPage + 1) * POSTS_PER_PAGE, flatPosts.length);
  info.textContent = `${start}–${end} of ${flatPosts.length} posts`;
  container.appendChild(info);
}

function renderPagination(flatPosts, currentPage) {
  buildPaginationBar(document.getElementById("pagination-top"),    flatPosts, currentPage);
  buildPaginationBar(document.getElementById("pagination-bottom"), flatPosts, currentPage);
}

function goToPage(flatPosts, page) {
  renderPage(flatPosts, page);
  renderPagination(flatPosts, page);
  renderTOC(flatPosts, page);
}

// ── Bootstrap ─────────────────────────────────────────────────
if (!trip) {
  document.getElementById("gallery-title").textContent = "No trip specified";
} else {
  document.getElementById("back-link").href = `map.html?trip=${trip}`;

  // Load users first (non-fatal), then trip data
  fetch("../users.json")
    .then(res => res.json())
    .then(data => { allUsers = data; })
    .catch(() => {})
    .finally(() => {
      fetch(`../data/${trip}/trip.json`)
        .then(res => {
          if (!res.ok) throw new Error("Trip data not found");
          return res.json();
        })
        .then(data => {
          document.title = data.title || "Gallery";
          document.getElementById("gallery-title").textContent = data.title || "Gallery";
          allFlatPosts = flattenPosts(data.locations);
          const sorted = getSortedPosts();
          renderTOC(sorted, 0);
          goToPage(sorted, 0);
        })
        .catch(err => {
          document.getElementById("gallery-title").textContent = "Gallery not found: " + err.message;
          console.error(err);
        });
    });
}