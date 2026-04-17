import json
import os
import re
from pathlib import Path

LOCATION_FIELD_STRING = "Location"
TITLE_FIELD_STRING = "Post title"
TEXT_FIELD_STRING = "Post text"
PHOTOS_FIELD_STRING = "Photo URLs (one per line)"

# --- Load GitHub event payload ---
event_path = os.environ.get("GITHUB_EVENT_PATH")

with open(event_path, "r") as f:
    event = json.load(f)

issue = event["issue"]
body = issue["body"]
issue_number = issue["number"]

# --- Build JSON ---
def get_field(text, key):
    # Split the text by the "### Header Name" pattern
    # We use a capturing group (### .+) so the split() keeps the header names in the list
    parts = re.split(r'###\s*(.+)\n', text)
    
    # Create a raw map of found headers to their content
    # parts[1::2] gets headers, parts[2::2] gets the content following them
    raw_data = {k.strip(): v.strip() for k, v in zip(parts[1::2], parts[2::2])}
    
    content = raw_data.get(key, "")
    if "Photo URLs" in key:
        field = [line.strip() for line in content.split('\n') if line.strip()]
    else:
        field = content

    # Issue fields which the user does not fill out are set to "_No response_"
    if "_No response_" in field:
        if key in (TEXT_FIELD_STRING, PHOTOS_FIELD_STRING):
            # These fields are allowed to be empty
            field = ""
        else:
            raise Exception("Missing required fields")

    return field

data = {
    "id": issue_number,
    "location_name": get_field(body, LOCATION_FIELD_STRING),
    "title": get_field(body, TITLE_FIELD_STRING),
    "text": get_field(body, TEXT_FIELD_STRING),
    "photos": get_field(body, PHOTOS_FIELD_STRING),
    "date": issue["updated_at"]
}


# --- Slugify ---
def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

# Use issue number to avoid duplicates
filename = f"{issue_number}__{slugify(data['title'])}.json"

output_path = Path("data/2026/posts") / filename
output_path.parent.mkdir(parents=True, exist_ok=True)

# --- Write file ---

with open(output_path, "w") as f:
    json.dump(data, f, indent=2)

print(f"✅ Wrote {output_path}")