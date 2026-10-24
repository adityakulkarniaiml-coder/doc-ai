import requests

# Paste your AIza... key here
API_KEY = "AQ.Ab8RN6JXUFOWWVlpH_qVw7DAhHCHnpaRP9XeDqWaAX7tyKNTTA"

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"
response = requests.get(url)

data = response.json()
if "models" in data:
    print("AVAILABLE MODELS FOR YOUR KEY:")
    for model in data["models"]:
        if "generateContent" in model.get("supportedGenerationMethods", []):
            print(f"- {model['name'].replace('models/', '')}")
else:
    print("ERROR:", data)