from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from transcribe import getTranscription, linkTimedTranscriptionToImages
import ollama
from videomaker import videomaker
from pprint import pprint
from getinternetimages import get_google_images
import os
from get_config import get_config
import json

app = Flask(__name__)
CORS(app)



@app.route("/images")
def search_images():
    query = request.args.get("q")
    if not query:
        return jsonify({"error": "Missing parameter 'q'"}), 400

    limit = request.args.get("l", type=int)

    try:
        links = get_google_images(query, limit)

        # cache headers
        response = make_response(jsonify(links))
        response.headers["Cache-Control"] = "public, max-age=3600"
        response.headers["Vary"] = "q, l"

        return response

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/export', methods=['POST'])
def export_project():
    project = request.get_json()['project']

    # pass the project and audio to the video maker
    videomaker(project, os.path.join("audio", 'voiceover.m4a'))
    
    return jsonify({'success':'true'})


@app.route('/transcribe', methods=['POST'])
def transcribe():
    uploaded_file = request.files['audio']
    if uploaded_file.filename != '':
        # download the audio
        save_path = os.path.join("audio", 'voiceover.m4a')
        os.makedirs("audio", exist_ok=True)
        uploaded_file.save(save_path)
        
        # transcribe 
        worded_transcription, transcription = getTranscription(save_path)
        
        # ask LLM to choose images
        response = ollama.generate(model=get_config("OLLAMA_MODEL"), prompt=f"""Split the following text into logical chunks based on meaning, names, places, or topic shifts.
At least {get_config("CLIPS_PER_SENTENCE")} chunk(s) per sentence.

Special rules:
- If a chunk contains a list or enumeration (names, items, numbers), split it so that each item becomes its own chunk.
- Keep each chunk directly tied to the original context.
- No duplicated image/video descriptions

For each chunk:
- Generate a concise image search description.
- Generate a concise search description for raw historical videos on YouTube (no documentaries).

Return only a Python list of dictionaries, each dictionary containing these keys:
'imageDescription': <image search query>,
'videoDescription': <video search query>,
'transcription': <text chunk>

Here is the text:
{transcription}
""",
        )
        res = response['response']
        try:
            # clean the JSON 
            res = f"[{res.split('[')[1].split(']')[0]}]".replace("'",'"')
            res = json.loads(res)
        except Exception as e:
            print(f'Error: {e}')
            print('OLLama Response:')
            pprint(res)
        
        # process the JSON by linking it to the timed worded transcription
        project = linkTimedTranscriptionToImages(res, worded_transcription)
    
        return jsonify({'success':'true', 'project':project})
    return jsonify({'success': False, 'error': 'No file received'}), 400
    
if __name__ == "__main__":
    app.run(port=8000)
