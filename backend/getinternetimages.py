from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import time
import urllib

def get_google_images(query:str, max_images:int) -> list:
    # make sure window is headless
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36")

    driver = webdriver.Chrome(options=options)

    # reduce detection as bot
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    })

    driver.get(f"https://duckduckgo.com/?q={query}&ia=images&iax=images")
    
    # todo: instead of waiting arbitrary seconds, wait until images are loaded
    time.sleep(2)


    images = driver.find_elements("css selector", "img")
    links = []
    for img in images:
        src = urllib.parse.unquote(img.get_attribute("src"))
        width = img.get_attribute("naturalWidth")
        height = img.get_attribute("naturalHeight")

        # Convertir a enteros si existen
        if width and height:
            width = int(width)
            height = int(height)
            
            if src and src.startswith("https://external-content.duckduckgo.com/iu/?u=") and width >= height and len(links) < max_images:
                links.append(src)
                
        if len(links) >= max_images:
            break

    driver.quit()
    return links

if __name__ == "__main__":
    print(get_google_images(input("Query:"), 12))