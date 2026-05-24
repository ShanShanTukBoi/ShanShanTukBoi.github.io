/* map.js — Travel Map page */

const params   = new URLSearchParams(window.location.search);
const trip     = params.get("trip");
const dataFile = `../data/${trip}/trip.json`;

// ── Map init ──────────────────────────────────────────────────
const map = L.map("map").setView([20, 120], 3);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

// ── DOM refs ──────────────────────────────────────────────────
const sidebar        = document.getElementById("sidebar");
const content        = document.getElementById("content");
const expandBtn      = document.getElementById("expand");
const closeBtn       = document.getElementById("close");
const lightbox       = document.getElementById("lightbox");
const lightboxImg    = document.getElementById("lightbox-img");
const lightboxClose  = document.getElementById("lightbox-close");
const lightboxPrev   = document.getElementById("lightbox-prev");
const lightboxNext   = document.getElementById("lightbox-next");
const lightboxCounter = document.getElementById("lightbox-counter");
const mapHint        = document.getElementById("map-hint");
const mapHintClose   = document.getElementById("map-hint-close");

// ── Lightbox ─────────────────────────────────────────────────
let lightboxPhotos = [];
let lightboxIndex  = 0;

function openLightbox(photos, index) {
  lightboxPhotos = photos;
  lightboxIndex  = index;
  updateLightbox();
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
}

function updateLightbox() {
  lightboxImg.src = lightboxPhotos[lightboxIndex];
  lightboxCounter.textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}`;
  lightboxPrev.disabled = lightboxIndex === 0;
  lightboxNext.disabled = lightboxIndex === lightboxPhotos.length - 1;
}

function closeLightbox() {
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImg.src = "";
}

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", e => { if (e.target === lightbox) closeLightbox(); });
lightboxPrev.addEventListener("click", e => { e.stopPropagation(); lightboxIndex--; updateLightbox(); });
lightboxNext.addEventListener("click", e => { e.stopPropagation(); lightboxIndex++; updateLightbox(); });

document.addEventListener("keydown", e => {
  if (!lightbox.classList.contains("open")) return;
  if (e.key === "ArrowLeft"  && lightboxIndex > 0)                          { lightboxIndex--; updateLightbox(); }
  if (e.key === "ArrowRight" && lightboxIndex < lightboxPhotos.length - 1)  { lightboxIndex++; updateLightbox(); }
  if (e.key === "Escape") closeLightbox();
});

// ── Helpers ───────────────────────────────────────────────────
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric"
  });
}

// ── Sidebar ───────────────────────────────────────────────────
function openSidebar(location, users) {
  let html = `<h2>${location.name}</h2>`;

  (location.posts || []).forEach(post => {
    const user = users[post.username] || {
      display_name: post.username || "Unknown",
      avatar: `https://github.com/${post.username}.png`
    };

    html += `
      <div class="post">
        <div class="post-header">
          <img class="avatar" src="${user.avatar}" alt="${user.display_name}">
          <div class="post-meta">
            <span class="author">${user.display_name}</span>
            <span class="post-date">${formatDate(post.date)}</span>
          </div>
        </div>
        <h3>${post.title}</h3>
        <md-block>${post.text}</md-block>
        ${post.photos?.length ? `
          <div class="post-photos">
            ${post.photos.map((src, i) => `<img src="${src}" alt="Photo from ${location.name}" data-index="${i}">`).join("")}
          </div>` : ""}
      </div>`;
  });

  content.innerHTML = html;
  sidebar.classList.add("open");
  sidebar.setAttribute("aria-hidden", "false");

  // Attach lightbox listeners per post
  document.querySelectorAll("#sidebar .post").forEach(postEl => {
    const imgs = postEl.querySelectorAll(".post-photos img");
    if (!imgs.length) return;
    const photos = Array.from(imgs).map(img => img.src);
    imgs.forEach((img, i) => img.addEventListener("click", () => openLightbox(photos, i)));
  });

  setTimeout(() => map.invalidateSize(), 350);
}

expandBtn.addEventListener("click", () => {
  if (!sidebar.classList.contains("open")) return;
  sidebar.classList.toggle("fullscreen");
  expandBtn.textContent = sidebar.classList.contains("fullscreen") ? "🡼" : "⤢";
  setTimeout(() => map.invalidateSize(), 350);
});

closeBtn.addEventListener("click", () => {
  sidebar.classList.remove("open", "fullscreen");
  sidebar.setAttribute("aria-hidden", "true");
  expandBtn.textContent = "⤢";
  setTimeout(() => map.invalidateSize(), 350);
});

// ── Map hint ──────────────────────────────────────────────────
mapHintClose.addEventListener("click", () => { mapHint.style.display = "none"; });

// ── Data loading ─────────────────────────────────────────────
let users = {};

fetch("../users.json")
  .then(res => res.json())
  .then(data => { users = data; })
  .catch(() => {});

fetch(dataFile)
  .then(res => res.json())
  .then(data => {
    document.title = data.title || "Travel Map";

    let foundCurrent = false;
    const coords = [];

    data.locations.forEach((loc, index) => {
      if (foundCurrent) loc.future = true;
      if (loc.current)  foundCurrent = true;

      coords.push([loc.lat, loc.lng]);

      const marker = L.marker([loc.lat, loc.lng], {
        icon: L.divIcon({
          className: "number-marker",
          html: `<div class="marker-number">${index + 1}</div>`,
          iconSize: [30, 30]
        })
      }).addTo(map);

      // getElement() is available immediately after addTo()
      if (loc.current)      marker.getElement().classList.add("current-marker");
      else if (loc.future)  marker.getElement().classList.add("future-marker");

      marker.on("click", () => openSidebar(loc, users));
    });

    const route = L.polyline(coords, { color: "blue" }).addTo(map);
    map.fitBounds(route.getBounds());
  });