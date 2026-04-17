import json
from datetime import datetime
from pathlib import Path

root = Path(__file__).resolve().parent.parent
locations_path = root / "data" / "2026" / "locations.json"
posts_dir = root / "data" / "2026" / "posts"
output_path = root / "data" / "2026" / "trip.json"

# Load locations
with open(locations_path, "r", encoding="utf-8") as f:
    locations = json.load(f)

# Initialize posts list on each location
for location in locations:
    location["posts"] = []

# Create a lookup by location name
location_lookup = {location["name"]: location for location in locations}

def parse_iso_date(value):
    if not value:
        return datetime.min
    if isinstance(value, str) and value.endswith("Z"):
        value = value[:-1]
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return datetime.min

# Load posts
posts = []
if posts_dir.exists():
    for post_path in sorted(posts_dir.glob("*.json")):
        with open(post_path, "r", encoding="utf-8") as f:
            post = json.load(f)
            posts.append(post)
            location_name = post.get("location_name") or post.get("name")
            if location_name and location_name in location_lookup:
                location_lookup[location_name]["posts"].append(post)

# Remove location_name from posts since they're now grouped by location
for location in locations:
    for post in location["posts"]:
        post.pop("location_name", None)
        post.pop("name", None)

# Sort locations by index when present, then by id
locations.sort(key=lambda item: (item.get("index", item.get("id", 0)), item.get("id", 0)))
for location in locations:
    location["posts"].sort(key=lambda item: (parse_iso_date(item.get("date")), item.get("id", 0)))

master = {
    "Title": "2026",
    "generated_at": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    "locations": locations,
}

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(master, f, indent=2)

total_posts = sum(len(location["posts"]) for location in locations)
print(f"✅ Created master trip file: {output_path}")
print(f"   locations: {len(locations)}")
print(f"   posts: {total_posts}")