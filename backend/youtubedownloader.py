import tkinter as tk
from tkinter import filedialog
from pytubefix import YouTube

def youtubeDownloader(url, filename='youtubedownload.mp4', output_path="videos"):
    YouTube(url).streams.first().download(filename=filename, output_path=output_path)

if __name__ == '__main__':
    root = tk.Tk()
    root.withdraw()
    path = filedialog.askdirectory(title="Choose output folder") or "videos"
    youtubeDownloader(input("URL: "), output_path=path)
