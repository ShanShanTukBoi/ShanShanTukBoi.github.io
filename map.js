const params = new URLSearchParams(window.location.search);
const trip = params.get("trip");
const dataFile = `../data/${trip}/trip.json`;

const map = L.map('map').setView([20, 120], 3);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

const sidebar = document.getElementById("sidebar");
const content = document.getElementById("content");
const expandBtn = document.getElementById("expand");
const closeBtn = document.getElementById("close");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxClose = document.getElementById("lightbox-close");
const lightboxPrev = document.getElementById("lightbox-prev");
const lightboxNext = document.getElementById("lightbox-next");
const lightboxCounter = document.getElementById("lightbox-counter");

let lightboxPhotos = [];
let lightboxIndex = 0;

function openLightbox(photos, index) {
  lightboxPhotos = photos;
  lightboxIndex = index;
  updateLightbox();
  lightbox.classList.remove("hidden");
  lightbox.setAttribute("aria-hidden", "false");
}

function updateLightbox() {
  lightboxImg.src = lightboxPhotos[lightboxIndex];
  lightboxCounter.textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}`;
  lightboxPrev.disabled = lightboxIndex === 0;
  lightboxNext.disabled = lightboxIndex === lightboxPhotos.length - 1;
}

function closeLightbox() {
  lightbox.classList.add("hidden");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImg.src = "";
}

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", e => { if (e.target === lightbox) closeLightbox(); });
lightboxPrev.addEventListener("click", e => { e.stopPropagation(); lightboxIndex--; updateLightbox(); });
lightboxNext.addEventListener("click", e => { e.stopPropagation(); lightboxIndex++; updateLightbox(); });

document.addEventListener("keydown", e => {
  if (lightbox.classList.contains("hidden")) return;
  if (e.key === "ArrowLeft"  && lightboxIndex > 0) { lightboxIndex--; updateLightbox(); }
  if (e.key === "ArrowRight" && lightboxIndex < lightboxPhotos.length - 1) { lightboxIndex++; updateLightbox(); }
  if (e.key === "Escape") closeLightbox();
});

let users = {};
fetch("../users.json")
  .then(res => res.json())
  .then(data => {
    users = data;
  });

fetch(dataFile)
  .then(res => res.json())
  .then(data => {
    document.title = data.title || "Travel Map";
    const coords = [];
    let foundCurrent = false;

    data.locations.forEach((loc, index) => {
      if (foundCurrent) loc.future = true;
      if (loc.current) foundCurrent = true;

      coords.push([loc.lat, loc.lng]);

      const marker = L.marker([loc.lat, loc.lng], {
        icon: L.divIcon({
          className: "number-marker",
          html: `<div class="marker-number">${index + 1}</div>`,
          iconSize: [30, 30]
        })
      }).addTo(map);

      if (loc.current) marker.getElement().classList.add("current-marker");
      else if (loc.future) marker.getElement().classList.add("future-marker");

      marker.on("click", () => openSidebar(loc));
    });

    const route = L.polyline(coords, { color: "blue" }).addTo(map);
    map.fitBounds(route.getBounds());
  });

function getUser(username) {
  return users[username] || {
    display_name: username || "Unknown",
    avatar: `https://github.com/${username}.png`
  };
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function openSidebar(location) {
  let html = `<h2>${location.name}</h2>`;

  if (location.posts) {
    location.posts.forEach(post => {
      const user = getUser(post.username);
      const formattedDate = formatDate(post.date);

      html += `
        <div class="post">
          <div class="post-header">
            <img class="avatar" src="${user.avatar}" alt="${user.display_name}">
            <div class="post-meta">
              <span class="author">${user.display_name}</span>
              <span class="post-date">${formattedDate}</span>
            </div>
          </div>

          <h3>${post.title}</h3>
          <p>${post.text}</p>
      `;

      if (post.photos?.length) {
        html += `<div class="post-photos">`;
        post.photos.forEach((photo, i) => {
          html += `<img src="${photo}" alt="Photo from ${location.name}" data-index="${i}">`;
        });
        html += `</div>`;
      }

      html += `</div>`;
    });
  }

  content.innerHTML = html;
  sidebar.classList.add("open");
  sidebar.setAttribute("aria-hidden", "false");

  // Attach lightbox listeners scoped per post
  document.querySelectorAll("#sidebar .post").forEach(postEl => {
    const imgs = postEl.querySelectorAll(".post-photos img");
    if (!imgs.length) return;
    const photos = Array.from(imgs).map(img => img.src);
    imgs.forEach((img, i) => {
      img.addEventListener("click", () => openLightbox(photos, i));
    });
  });

  setTimeout(() => map.invalidateSize(), 350);
}

expandBtn.onclick = () => {
  if (!sidebar.classList.contains("open")) return;
  sidebar.classList.toggle("fullscreen");
  expandBtn.textContent = sidebar.classList.contains("fullscreen") ? "🡼" : "⤢";
  setTimeout(() => map.invalidateSize(), 350);
};

closeBtn.onclick = () => {
  sidebar.classList.remove("open", "fullscreen");
  sidebar.setAttribute("aria-hidden", "true");
  expandBtn.textContent = "⤢";
  setTimeout(() => map.invalidateSize(), 350);
};

/* Map hint popup */
const mapHint = document.getElementById("map-hint");
const mapHintClose = document.getElementById("map-hint-close");

mapHintClose.addEventListener("click", () => {
  mapHint.style.display = "none";
});