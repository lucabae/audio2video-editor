import whisper_timestamped as whisper
from get_config import get_config


def getTranscription(audio_path):
    audio = whisper.load_audio(audio_path)
    model = whisper.load_model(get_config("WHISPER_MODEL"))
        
    result = whisper.transcribe(model, audio, language=get_config("WHISPER_LANGUAGE"), remove_punctuation_from_words=True)
    transcription = result['text']
    
    worded_transcription = result['segments']
    
    return worded_transcription, transcription


def linkTimedTranscriptionToImages(ollama_response:list, whisper_segments:str) -> list:
    res = []
    
    # unite all words in a simple array
    all_words = []
    for segment in whisper_segments:
        if 'words' in segment:
            all_words.extend(segment['words'])
    
    last_index = 0
    
    for index, image in enumerate(ollama_response): 
        new_item = {
            'imageDescription': image['imageDescription'],
            'videoDescription':image['videoDescription'],
            'start': 0,
        }
        
        if index == 0:
            res.append(new_item)
            continue
        
        # divide text in words
        words = image['transcription'].strip().split()
        
        second_word = words[1] if len(words) > 1 else None
        
        
        
        # search first word and second word in all_words from last_index
        for i in range(last_index, len(all_words)):
            w = all_words[i]['text'].strip()
            next_w = all_words[i + 1]['text'].strip() if i + 1 < len(all_words) else None
            
            if w.lower():
                # if there is no second word because it's the last word in text
                # if next_w matches with second_word
                if second_word is None or (next_w and next_w.lower() == second_word.lower()):
                    new_item['start'] = float(all_words[i]['start'])
                    # start from position of the final word
                    last_index = i
                    break
            
        res.append(new_item)
        
    # iterate through res to make sure no timing errors are made:
    for index, item in enumerate(res):
        if item['start'] == 0 and index != 0 and index != len(res) - 1:
            prior_clip_start = res[index - 1]['start']
            next_clip_start = res[index + 1]['start']
            item['start'] = (prior_clip_start + next_clip_start) / 2
    
    return res