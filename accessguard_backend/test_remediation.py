import sys
import os
sys.path.append(r'c:\Users\sathv\Downloads\Creations\Audit Scraper\accessguard_backend')

from bs4 import BeautifulSoup
from app.remediation import generate_remediation

with open("py_out2.txt", "w", encoding="utf-8") as f:
    # 1. Test missing alt image
    html_dashboard = """
    <html><body>
        <div>
            <h1>System Overview</h1>
            <img class="hero dashboard-img" src="/assets/dash.png">
        </div>
    </body></html>
    """
    soup1 = BeautifulSoup(html_dashboard, 'html.parser')
    img1 = soup1.find('img')
    v1 = {
        "rule": "missing_image_alt",
        "element": str(img1)
    }
    res1 = generate_remediation(v1, soup1)
    f.write("--- TEST 1: missing_image_alt ---\n")
    f.write(f"Before: {res1.get('before_html')}\n")
    f.write(f"After: {res1.get('after_html')}\n")
    f.write(f"Summary: {res1.get('change_summary')}\n\n")

    # 2. Test Input label
    html_input = """
    <html><body>
        <input type="text" name="email_address" class="input-field">
    </body></html>
    """
    soup2 = BeautifulSoup(html_input, 'html.parser')
    inp2 = soup2.find('input')
    v2 = {
        "rule": "input_without_label",
        "element": str(inp2)
    }
    res2 = generate_remediation(v2, soup2)
    f.write("--- TEST 2: input_without_label ---\n")
    f.write(f"Before: {res2.get('before_html')}\n")
    f.write(f"After: {res2.get('after_html')}\n")
    f.write(f"Summary: {res2.get('change_summary')}\n\n")

    # 3. Test lang tag
    html_lang = """
    <html><body></body></html>
    """
    soup3 = BeautifulSoup(html_lang, 'html.parser')
    html3 = soup3.find('html')
    v3 = {
        "rule": "missing_html_lang",
        "element": '<html>'
    }
    res3 = generate_remediation(v3, soup3)
    f.write("--- TEST 3: missing_html_lang ---\n")
    f.write(f"Before: {res3.get('before_html')}\n")
    f.write(f"After: {res3.get('after_html')}\n")
    f.write(f"Summary: {res3.get('change_summary')}\n\n")

    # 4. Test heading skipped
    html_heading = """
    <html><body>
        <h1>Title</h1>
        <h3>Subtitle</h3>
    </body></html>
    """
    soup4 = BeautifulSoup(html_heading, 'html.parser')
    h4 = soup4.find('h3')
    v4 = {
        "rule": "skipped_heading_level",
        "element": str(h4)
    }
    res4 = generate_remediation(v4, soup4)
    f.write("--- TEST 4: skipped_heading_level ---\n")
    f.write(f"Before: {res4.get('before_html')}\n")
    f.write(f"After: {res4.get('after_html')}\n")
    f.write(f"Summary: {res4.get('change_summary')}\n\n")
