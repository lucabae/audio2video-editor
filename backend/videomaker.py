from moviepy import ImageClip,VideoFileClip, AudioFileClip, TextClip, CompositeVideoClip, ColorClip, concatenate_videoclips, vfx
from youtubedownloader import youtubeDownloader
from getinternetimages import get_google_images
from get_config import get_config
import requests
import os
import shutil


def videomaker(project: list, audio_path: str):
    clips = []
    

    voiceover = AudioFileClip(audio_path)

    for index, clip_data in enumerate(project):
        duration = (project[index+1]['start'] - clip_data['start']) if index + 1 < len(project) else (voiceover.duration - clip_data['start'])
        # effects specified in the web by the user
        effects = clip_data.get('effects', [])
        clip = None
        
        
        # fx to apply to the clip in moviepy format
        fx = []

        # if image clip
        if clip_data.get('imageDescription') != None:
            img_link = clip_data.get('imageLink')
            # if image link is not generated
            if img_link == None:
                img_link = get_google_images(clip_data.get('imageDescription'), 1)[0]
            # download image
            img_data = requests.get(img_link).content
            img_path = f"images/{clip_data['imageDescription']}.jpg"
            with open(img_path, 'wb') as handler:
                handler.write(img_data)
            # store the location of the images in the project
            clip_data['imagePath'] = img_path

            clip = ImageClip(clip_data['imagePath']).resized(height=1080).with_duration(duration).with_position(("center", 0))
            
        # if youtube clip
        elif clip_data.get('YTvideoLink') != None:
            # download the YouTube video
            filename = f"{index}.mp4"
            youtubeDownloader(clip_data['YTvideoLink'], filename)
            
            # get YTstart 
            YTstart_time = clip_data.get("YTstart")
            
            # create clip
            clip = VideoFileClip(f"videos/{filename}").resized(height=1080, width=1920).without_audio().subclipped(start_time=YTstart_time, end_time=YTstart_time+duration).with_duration(duration)
        
        else:
            print("Clip not recognized, skipping...")
            continue
        
        # add fx
        if 'black_and_white' in effects:
            fx.append(vfx.BlackAndWhite())
        if 'titled' in effects and clip_data.get('imageDescription') != None:
                clip = clip.resized(height=1080*0.85)
                
                txt_clip = TextClip(
                    text=clip_data.get("imageDescription").title(),
                    font='Arial',
                    font_size=80,
                    color="white",
                    method='caption',
                    size=(1920, None),
                ).with_duration(duration)
                txt_clip = txt_clip.with_position(("center", 1080*0.88))


                background = ColorClip(size=(1920, 1080), color=(0, 0, 0)).with_duration(duration)

                # composite the clip
                clip = CompositeVideoClip([background, clip, txt_clip])
        if 'fade_in' in effects:
            fx.append(vfx.FadeIn(0.5))
        if 'fade_out' in effects:
            fx.append(vfx.FadeOut(0.5))
        
        # apply effects on clips
        clip = clip.with_effects(fx)
        clips.append(clip)

    video = concatenate_videoclips(clips, method='compose').with_audio(voiceover)
    video.write_videofile('result.mp4', fps=get_config('PROJECT_FPS'))
        
    
    # clean
    shutil.rmtree('videos')
    os.mkdir('videos')
    shutil.rmtree('images')
    os.mkdir('images')
