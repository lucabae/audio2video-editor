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
import re

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


import re

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
        
        # divide in sentences
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', transcription) if s.strip()]
        
        # group 20 sentence chunks to prevent losing LLM quality
        chunk_size = 20
        chunks = [" ".join(sentences[i:i+chunk_size]) for i in range(0, len(sentences), chunk_size)]
        
        # get context
        print("Generating context…")
        context = ollama.generate(model="gemma3:1b", prompt=f"""
Generate a concise summary of this text in one paragraph
{transcription}
""")['response']
        print("✅ Done!")
        
        all_results = []
        
        print("Generating media description...")
        for index, chunk in enumerate(chunks):
            response = ollama.generate(
                model=get_config("OLLAMA_MODEL"),
                keep_alive="10m",
                prompt=f"""Split the following text into logical chunks based on meaning, names, places, or topic shifts.
At least {get_config("CLIPS_PER_SENTENCE")} chunk(s) per sentence.

Special rules:
- If a chunk contains a list or enumeration (names, items, numbers), split it so that each item becomes its own chunk.
- Keep each chunk directly tied to the original context.
- No duplicated image/video descriptions.

For each chunk:
- Generate a descriptive image search query that will be used in an image search engine
- Generate a concise, descriptive search query for raw historical videos on YouTube (news, interviews, propaganda, events; no documentaries)
- Do not generalize, make sure every description is related to the general context of the video, do not be vague
- Do not make queries referencing infographic material unless clearly stated in the description
- If some phrase does not contain information that could provide a good media description, add media description that completes the phrase before that one
- All media queries must be in the language: {get_config("WHISPER_LANGUAGE")} (es=spanish, en=english, etc.)

Return only a Python list of dictionaries, each dictionary containing:
"imageDescription": <image search query>,
"videoDescription": <video search query>,
"transcription": <text chunk>

Text context for better media descriptions:
{context}

Text:
{chunk}
""",
            )
            res = response['response']
            try:
                # limpiar JSON
                res = f"[{res.split('[')[1].split(']')[0]}]"
                res = json.loads(res)
                all_results.extend(res)
                print(f"Finished chunk {index+1}/{len(chunks)}")
            except Exception as e:
                print(f'Error: {e}. LLM Response can be found in res.json')
                open("error.log.json", "w").write(str(response))
        
        # link with timed transcription
        try:
            project = linkTimedTranscriptionToImages(all_results, worded_transcription)
        except Exception as e:
                print(f'Error: {e}. LLM Response can be found in res.json')
                open("res.json", "w").write(str(all_results))
    
        return jsonify({'success':'true', 'project':project})
    return jsonify({'success': False, 'error': 'No file received'}), 400

if __name__ == "__main__":
    app.run(port=8000)
