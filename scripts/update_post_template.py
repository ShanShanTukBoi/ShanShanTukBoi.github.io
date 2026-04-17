import json
import yaml
import os

# Paths relative to the script location
script_dir = os.path.dirname(os.path.abspath(__file__))
trips_json_path = os.path.join(script_dir, '..', 'data', '2026', 'locations.json')
template_yml_path = os.path.join(script_dir, '..', '.github', 'ISSUE_TEMPLATE', 'post.yml')

# Load trips.json
with open(trips_json_path, 'r') as f:
    locations_dicts = json.load(f)

# Extract location names
locations = [location['name'] for location in locations_dicts]

# Load the YAML template
with open(template_yml_path, 'r') as f:
    template = yaml.safe_load(f)

# Find the dropdown with id 'location_name' and update its options
for item in template['body']:
    if item.get('type') == 'dropdown' and item.get('id') == 'location_name':
        item['attributes']['options'] = locations
        break

# Write back the updated YAML
with open(template_yml_path, 'w') as f:
    yaml.dump(template, f, default_flow_style=False, sort_keys=False)