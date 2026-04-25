const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxClose = document.getElementById("lightbox-close");
const lightboxPrev = document.getElementById("lightbox-prev");
const lightboxNext = document.getElementById("lightbox-next");
const lightboxCounter = document.getElementById("lightbox-counter");

let lightboxPhotos = [];  // all photo URLs on the current page
let lightboxIndex = 0;

function openLightbox(photos, index) {
  lightboxPhotos = photos;
  lightboxIndex = index;
  updateLightbox();
  lightbox.style.display = "flex";
}

function updateLightbox() {
  lightboxImg.src = lightboxPhotos[lightboxIndex];
  lightboxCounter.textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}`;
  lightboxPrev.disabled = lightboxIndex === 0;
  lightboxNext.disabled = lightboxIndex === lightboxPhotos.length - 1;
}

lightboxClose.onclick = () => lightbox.style.display = "none";
lightbox.onclick = e => { if (e.target === lightbox) lightbox.style.display = "none"; }
lightboxPrev.onclick = e => { e.stopPropagation(); lightboxIndex--; updateLightbox(); };
lightboxNext.onclick = e => { e.stopPropagation(); lightboxIndex++; updateLightbox(); };

document.addEventListener("keydown", e => {
  if (lightbox.style.display !== "flex") return;
  if (e.key === "ArrowLeft"  && lightboxIndex > 0) { lightboxIndex--; updateLightbox(); }
  if (e.key === "ArrowRight" && lightboxIndex < lightboxPhotos.length - 1) { lightboxIndex++; updateLightbox(); }
  if (e.key === "Escape") lightbox.style.display = "none";
});

const params = new URLSearchParams(window.location.search);
const trip = params.get("trip");

const POSTS_PER_PAGE = 5;

let allFlatPosts = [];  // chronological, never mutated
let allUsers = {};
let currentOrder = 'newest';

function getSortedPosts() {
  return currentOrder === 'newest' ? [...allFlatPosts].reverse() : [...allFlatPosts];
}

function setOrder(order) {
  if (order === currentOrder) return;
  currentOrder = order;
  document.getElementById('btn-newest').classList.toggle('active', order === 'newest');
  document.getElementById('btn-oldest').classList.toggle('active', order === 'oldest');
  const sorted = getSortedPosts();
  renderTOC(sorted, 0, allUsers);
  goToPage(sorted, 0, allUsers);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// Flatten all posts across locations into a single list,
// keeping track of which location each post belongs to.
function flattenPosts(locations) {
  const flat = [];
  for (const location of locations) {
    if (!location.posts || location.posts.length === 0) continue;
    for (const post of location.posts) {
      flat.push({ location, post });
    }
  }
  return flat;
}

// Build a map of locationName -> first page index it appears on
function buildLocationPageMap(flatPosts) {
  const map = {}; // locationName -> page index
  flatPosts.forEach(({ location }, i) => {
    const page = Math.floor(i / POSTS_PER_PAGE);
    if (!(location.name in map)) map[location.name] = page;
  });
  return map;
}

function renderTOC(flatPosts, currentPage, users) {
  const tocList = document.getElementById("toc-list");
  tocList.innerHTML = "";
  const locationPageMap = buildLocationPageMap(flatPosts);

  for (const [name, page] of Object.entries(locationPageMap)) {
    const btn = document.createElement("button");
    btn.textContent = name;
    if (page === currentPage) btn.classList.add("toc-current-page");
    btn.onclick = () => goToPage(flatPosts, page, users);
    tocList.appendChild(btn);
  }
}

function renderPage(flatPosts, users, page) {
  const galleryDiv = document.getElementById("gallery");
  galleryDiv.innerHTML = "";

  const start = page * POSTS_PER_PAGE;
  const end = Math.min(start + POSTS_PER_PAGE, flatPosts.length);
  const pagePosts = flatPosts.slice(start, end);

  // Group consecutive posts that share the same location
  let currentLocationName = null;
  let locationSection = null;

  for (const { location, post } of pagePosts) {
    if (location.name !== currentLocationName) {
      currentLocationName = location.name;
      locationSection = document.createElement("section");
      locationSection.className = "location";

      const locationTitle = document.createElement("h2");
      locationTitle.textContent = location.name;
      locationSection.appendChild(locationTitle);

      galleryDiv.appendChild(locationSection);
    }

    const postDiv = document.createElement("div");
    postDiv.className = "post";

    const user = users[post.username] || {
      display_name: post.username || "Unknown",
      avatar: `https://github.com/${post.username}.png`
    };

    const postHeader = document.createElement("div");
    postHeader.className = "post-header";

    const avatar = document.createElement("img");
    avatar.src = user.avatar;
    avatar.alt = user.display_name;
    avatar.className = "avatar";

    const postMeta = document.createElement("div");
    postMeta.className = "post-meta";

    const author = document.createElement("span");
    author.className = "author";
    author.textContent = user.display_name;

    const dateEl = document.createElement("span");
    dateEl.className = "post-date";
    dateEl.textContent = formatDate(post.date);

    postMeta.appendChild(author);
    postMeta.appendChild(dateEl);
    postHeader.appendChild(avatar);
    postHeader.appendChild(postMeta);
    postDiv.appendChild(postHeader);

    const postTitle = document.createElement("h3");
    postTitle.textContent = post.title;
    postDiv.appendChild(postTitle);

    if (post.text) {
      const postText = document.createElement("p");
      postText.textContent = post.text;
      postDiv.appendChild(postText);
    }

    const photoGrid = document.createElement("div");
    photoGrid.className = "gallery";
    const postPhotos = post.photos || [];

    postPhotos.forEach((url, i) => {
      const img = document.createElement("img");
      img.src = url;
      img.alt = post.title || "";
      img.loading = "lazy";
      img.addEventListener("click", () => openLightbox(postPhotos, i));
      photoGrid.appendChild(img);
    });

    postDiv.appendChild(photoGrid);
    locationSection.appendChild(postDiv);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function buildPaginationBar(container, flatPosts, currentPage, users) {
  container.innerHTML = "";
  const totalPages = Math.ceil(flatPosts.length / POSTS_PER_PAGE);
  if (totalPages <= 1) return;

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "← Prev";
  prevBtn.disabled = currentPage === 0;
  prevBtn.onclick = () => goToPage(flatPosts, currentPage - 1, users);
  container.appendChild(prevBtn);

  for (const p of getPageRange(currentPage, totalPages)) {
    if (p === "...") {
      const ellipsis = document.createElement("span");
      ellipsis.className = "page-info";
      ellipsis.textContent = "…";
      container.appendChild(ellipsis);
    } else {
      const btn = document.createElement("button");
      btn.textContent = p + 1;
      if (p === currentPage) btn.classList.add("active");
      btn.onclick = () => goToPage(flatPosts, p, users);
      container.appendChild(btn);
    }
  }

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next →";
  nextBtn.disabled = currentPage === totalPages - 1;
  nextBtn.onclick = () => goToPage(flatPosts, currentPage + 1, users);
  container.appendChild(nextBtn);

  const info = document.createElement("span");
  info.className = "page-info";
  const start = currentPage * POSTS_PER_PAGE + 1;
  const end = Math.min((currentPage + 1) * POSTS_PER_PAGE, flatPosts.length);
  info.textContent = `${start}–${end} of ${flatPosts.length} posts`;
  container.appendChild(info);
}

function renderPagination(flatPosts, currentPage, users) {
  buildPaginationBar(document.getElementById("pagination-top"), flatPosts, currentPage, users);
  buildPaginationBar(document.getElementById("pagination-bottom"), flatPosts, currentPage, users);
}

// Returns an array of page indices (numbers) and "..." strings
function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages = [];
  pages.push(0);
  if (current > 2) pages.push("...");
  for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 3) pages.push("...");
  pages.push(total - 1);
  return pages;
}

function goToPage(flatPosts, page, users) {
  renderPage(flatPosts, users, page);
  renderPagination(flatPosts, page, users);
  renderTOC(flatPosts, page, users);
}

if (!trip) {
  document.getElementById("gallery-title").textContent = "No trip specified";
} else {
  document.getElementById('back-link').href = `map.html?trip=${trip}`;

  let users = {};

  fetch("../users.json")
    .then(res => res.json())
    .then(data => { users = data; })
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
          allUsers = users;
          const sorted = getSortedPosts();
          renderTOC(sorted, 0, allUsers);
          goToPage(sorted, 0, allUsers);
        })
        .catch(err => {
          document.getElementById("gallery-title").textContent = "Gallery not found: " + err.message;
          console.error(err);
        });
    });
}