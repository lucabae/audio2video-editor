import json
def get_config(key:str) -> str:
    with open('config.json') as f:
        return json.load(f)[key]