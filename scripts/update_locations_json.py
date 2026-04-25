import json
import os
import re
from pathlib import Path

# --- Load GitHub event payload ---
event_path = os.environ.get("GITHUB_EVENT_PATH")

with open(event_path, "r") as f:
    event = json.load(f)

issue = event["issue"]
body = issue["body"]
issue_number = issue["number"]

# --- Helper to extract fields from Issue Form ---
def get_field(label):
    pattern = rf"### {label}\s*([\s\S]*?)(?=###|$)"
    match = re.search(pattern, body)
    return match.group(1).strip() if match else ""

location_name = get_field("New Location")
lat = float(get_field("Latitude") or 0)
lng = float(get_field("Longitude") or 0)
insert_after = get_field("Insert After")

# --- Load existing locations ---
json_path = Path(__file__).parent.parent / "data" / "2026" / "locations.json"
try:
    with open(json_path, "r") as f:
        locations = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    locations = []

# --- Determine insertion position ---
# Find the index of the named location and insert after it
insert_pos = next(
    (i + 1 for i, loc in enumerate(locations) if loc["name"] == insert_after),
    len(locations)  # fall back to end if name not found
)

# --- Build new location entry ---
new_location = {
    "id": issue_number,
    "index": insert_pos,  # will be corrected by reindex below
    "name": location_name,
    "lat": lat,
    "lng": lng,
}

# --- Insert and reindex ---
locations.insert(insert_pos, new_location)

for i, loc in enumerate(locations):
    loc["index"] = i

# --- Write file ---
with open(json_path, "w") as f:
    json.dump(locations, f, indent=2)

print(f"✅ Inserted '{location_name}' at position {insert_pos} in {json_path}")