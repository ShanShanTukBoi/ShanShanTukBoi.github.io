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

# --- Build JSON ---
json_path = Path(__file__).parent.parent / "data" / "2026" / "locations.json"
try:
    with open(json_path, "r") as f:
        locations = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    locations = []

next_index = max((loc.get("index", loc.get("id", 0)) for loc in locations), default=0) + 1

data = {
    "id": issue_number,
    "index": next_index,
    "name": location_name,
    "lat": lat,
    "lng": lng,
}

# --- Write file ---
locations.append(data)
locations.sort(key=lambda x: (x.get("index", x.get("id", 0)), x.get("id", 0)))
with open(json_path, "w") as f:
    json.dump(locations, f, indent=2)

print(f"✅ Appended to {json_path}")