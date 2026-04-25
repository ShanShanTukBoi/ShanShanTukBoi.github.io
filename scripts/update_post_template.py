import json
import yaml
import os

# Paths relative to the script location
script_dir = os.path.dirname(os.path.abspath(__file__))
trips_json_path = os.path.join(script_dir, '..', 'data', '2026', 'locations.json')
post_template_path = os.path.join(script_dir, '..', '.github', 'ISSUE_TEMPLATE', 'post.yml')
location_template_path = os.path.join(script_dir, '..', '.github', 'ISSUE_TEMPLATE', 'location.yml')

# Load locations.json
with open(trips_json_path, 'r') as f:
    locations_dicts = json.load(f)

# Extract location names in index order
location_names = [loc['name'] for loc in sorted(locations_dicts, key=lambda x: x['index'])]

# --- Update post.yml ---
with open(post_template_path, 'r') as f:
    post_template = yaml.safe_load(f)

for item in post_template['body']:
    if item.get('type') == 'dropdown' and item.get('id') == 'location_name':
        item['attributes']['options'] = location_names
        break

with open(post_template_path, 'w') as f:
    yaml.dump(post_template, f, default_flow_style=False, sort_keys=False)

print(f"✅ Updated post.yml with {len(location_names)} locations")

# --- Update location.yml insert_after dropdown ---
with open(location_template_path, 'r') as f:
    location_template = yaml.safe_load(f)

for item in location_template['body']:
    if item.get('type') == 'dropdown' and item.get('id') == 'insert_after':
        item['attributes']['options'] = location_names
        break

with open(location_template_path, 'w') as f:
    yaml.dump(location_template, f, default_flow_style=False, sort_keys=False)

print(f"✅ Updated location.yml insert_after with {len(location_names)} options")