from bs4 import BeautifulSoup
import re

def analyze_accessibility(soup: BeautifulSoup) -> list:
    """
    Analyzes a BeautifulSoup object dynamically to find accessibility violations.
    Returns a list of structured violation dictionaries.
    """
    violations = []

    # 1. Missing Image Alt (Critical)
    images = soup.find_all('img')
    for img in images:
        alt_text = img.get('alt')
        if alt_text is None or alt_text.strip() == "":
            violations.append({
                "rule": "missing_image_alt",
                "severity": "Critical",
                "message": "Image element is missing an 'alt' attribute or it is empty, which is required for screen readers.",
                "element": str(img)[:200]  # Truncate for safety
            })

    # 2. Input Without Label (High)
    # Exclude hidden, submit, button, reset types which don't strictly require standard labels
    inputs = soup.find_all('input')
    for inp in inputs:
        input_type = inp.get('type', 'text').lower()
        if input_type in ['hidden', 'submit', 'button', 'reset', 'image']:
            continue
            
        input_id = inp.get('id')
        has_linked_label = False
        
        # Check if it has an aria-label
        if inp.get('aria-label') or inp.get('aria-labelledby'):
            continue
            
        # Check if wrapped inside a label
        if inp.find_parent('label'):
            continue
            
        # Check if an external label exists linking to it
        if input_id:
            label = soup.find('label', attrs={'for': input_id})
            if label:
                has_linked_label = True
                
        if not has_linked_label:
            violations.append({
                "rule": "input_without_label",
                "severity": "High",
                "message": "Form input element is missing an associated <label> or 'aria-label', making it inaccessible to screen readers.",
                "element": str(inp)[:200]
            })

    # 3. Missing HTML lang Attribute (High)
    html_tag = soup.find('html')
    if html_tag:
        lang = html_tag.get('lang')
        if not lang or lang.strip() == "":
            violations.append({
                "rule": "missing_html_lang",
                "severity": "High",
                "message": "The <html> element is missing a 'lang' attribute. Screen readers need this to determine the document's language.",
                "element": str(html_tag).split('>')[0] + ">" # Just get the opening tag
            })

    # Heading Constraints
    headings = soup.find_all(re.compile('^h[1-6]$'))
    
    # 4. Multiple H1 Tags (Medium)
    h1_tags = [h for h in headings if h.name == 'h1']
    if len(h1_tags) > 1:
        violations.append({
            "rule": "multiple_h1_tags",
            "severity": "Medium",
            "message": f"Found {len(h1_tags)} <h1> tags. Pages should generally have only one main heading for structural clarity.",
            "element": "Multiple <h1> elements found in document."
        })

    # 5. Skipped Heading Levels (Medium)
    # e.g., h1 followed by h3
    previous_level = 0
    for h in headings:
        current_level = int(h.name[1])
        # If it's the first heading, it should ideally be an h1, but we only strictly check for skips here
        if previous_level != 0:
            if current_level - previous_level > 1:
                violations.append({
                    "rule": "skipped_heading_level",
                    "severity": "Medium",
                    "message": f"Skipped heading level. An <h{previous_level}> was followed directly by an <h{current_level}>, breaking the logical page structure.",
                    "element": str(h)[:200]
                })
        previous_level = current_level

    return violations
