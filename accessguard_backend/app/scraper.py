import httpx
from bs4 import BeautifulSoup
from typing import Dict, Any

async def scrape_website(url: str) -> Dict[str, Any]:
    """
    Fetches HTML from the given URL and extracts DOM elements dynamically.
    Raises an exception if the request fails.
    """
    timeout = httpx.Timeout(10.0)
    
    # Simulate a real browser to bypass basic anti-bot protections (like 403 Forbidden on Wikipedia)
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua": "\"Chromium\";v=\"122\", \"Not(A:Brand\";v=\"24\", \"Google Chrome\";v=\"122\"",
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": "\"Windows\""
    }
    
    # Create a fresh client for every request to ensure no caching/reuse
    # SSL verify is set to False to bypass local certificate issuer issues
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True, verify=False, headers=headers) as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise Exception(f"HTTP Error: {e.response.status_code} - {e.response.reason_phrase}")
        except httpx.RequestError as e:
            raise Exception(f"Request Error: {str(e)}")
            
        html_content = response.text
        if not html_content.strip():
            raise Exception("Received empty HTML content.")
            
        # Parse realistic DOM
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # 1. Title
        title_tag = soup.find('title')
        title = title_tag.text.strip() if title_tag else "No Title"
        
        # 2. Extract specific elements for counts
        images = soup.find_all('img')
        buttons = soup.find_all('button')
        inputs = soup.find_all('input')
        labels = soup.find_all('label')
        headings = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
        
        # 3. Extract sample data
        image_samples = []
        for img in images[:3]:
            image_samples.append(img.get('src', 'No src attribute'))
            
        button_samples = []
        for btn in buttons[:3]:
            button_samples.append(btn.text.strip() or 'No text')
            
        input_samples = []
        for inp in inputs[:3]:
            input_samples.append(inp.get('type', 'No type attribute'))
            
        return {
            "metadata": {
                "title": title,
                "counts": {
                    "images": len(images),
                    "buttons": len(buttons),
                    "inputs": len(inputs),
                    "labels": len(labels),
                    "headings": len(headings)
                },
                "samples": {
                    "images": image_samples,
                    "buttons": button_samples,
                    "inputs": input_samples
                }
            },
            "soup": soup
        }
