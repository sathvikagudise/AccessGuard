from typing import Dict, Any
from bs4 import BeautifulSoup
import re

def extract_semantic_context(element_str: str, soup: BeautifulSoup) -> Dict[str, Any]:
    context = {
        "filename": "",
        "classes": [],
        "id": "",
        "parent": "",
        "near_text": "",
        "heading_context": ""
    }
    
    tag = None
    if soup:
        tag_soup = BeautifulSoup(element_str, 'html.parser')
        parsed_tag = tag_soup.find()
        if parsed_tag:
            src = parsed_tag.get('src')
            if src:
                tag = soup.find(parsed_tag.name, src=src)
            if not tag:
                limit = min(100, len(element_str))
                for t in soup.find_all(parsed_tag.name):
                    if str(t).startswith(element_str[:limit]):
                        tag = t
                        break
    
    if not tag:
        tag = BeautifulSoup(element_str, 'html.parser').find()
        if not tag:
            return context

    src = tag.get('src', '')
    if isinstance(src, list): src = src[0]
    if src:
        context["filename"] = src.split('/')[-1].split('?')[0]

    classes = tag.get('class', [])
    if isinstance(classes, str): classes = classes.split()
    context["classes"] = classes

    context["id"] = tag.get('id', '')

    parent = tag.parent
    if parent and parent.name and parent.name != '[document]':
        context["parent"] = parent.name

    near_texts = []
    prev_sib = tag.find_previous_sibling()
    if prev_sib and prev_sib.name not in ['script', 'style'] and prev_sib.text.strip():
        near_texts.append(prev_sib.text.strip())
    
    next_sib = tag.find_next_sibling()
    if next_sib and next_sib.name not in ['script', 'style'] and next_sib.text.strip():
        near_texts.append(next_sib.text.strip())
        
    if not near_texts and parent and parent.name != '[document]':
        pt = parent.text.replace('\n', ' ').strip()
        if pt:
            near_texts.append(pt[:50])
            
    context["near_text"] = " | ".join(near_texts)[:50]

    heading = tag.find_previous(['h1', 'h2', 'h3'])
    if heading and heading.text.strip():
        context["heading_context"] = heading.text.strip()

    return context

def classify_element(context: Dict[str, Any]) -> str:
    filename_lower = context.get('filename', '').lower()
    classes_lower = " ".join(context.get('classes', [])).lower()
    combined = filename_lower + " " + classes_lower
    
    if "logo" in combined:
        return "logo"
    if "icon" in combined:
        return "icon"
    if "banner" in combined or "hero" in combined:
        return "banner"
    if "product" in combined:
        return "product"
    if "avatar" in combined or "profile" in combined:
        return "profile"
    if "dashboard" in combined:
        return "dashboard"
    
    return "generic image"

def generate_contextual_description(context: Dict[str, Any], element_type: str) -> str:
    desc = ""
    if element_type == "logo":
        desc = "Company logo representing brand identity"
    elif element_type == "icon":
        desc = "Decorative or functional icon"
    elif element_type == "dashboard":
        desc = "Dashboard interface showing analytics or system overview"
    elif element_type == "banner":
        desc = "Promotional banner highlighting key content or feature"
    elif element_type == "product":
        desc = "Product image showing item details"
    elif element_type == "profile":
        desc = "User profile image or avatar"
    else:
        filename = context.get('filename', '')
        if filename:
            clean_name = filename.split('.')[0].replace('-', ' ').replace('_', ' ').title()
            desc = f"Image depicting {clean_name}"
        else:
            desc = "Add descriptive alt text describing the purpose of the image"

    heading = context.get("heading_context")
    near_text = context.get("near_text")

    if heading:
        desc += f". Image related to {heading}"
    elif near_text:
        desc += f". Contextual text nearby: '{near_text}'"

    return desc.strip()

def generate_remediation(violation: Dict[str, Any], soup: BeautifulSoup = None) -> Dict[str, Any]:
    """
    Analyzes an individual violation and its raw HTML string to generate 
    a deterministic, context-aware remediation suggestion and corrected HTML.
    """
    rule = violation.get("rule")
    element_str = violation.get("element", "")
    
    ai_suggestion = "Review this element and apply standard WCAG accessibility practices."
    corrected_html = "<!-- Corrected HTML could not be reliably generated for this element -->"
    
    before_html = element_str
    after_html = ""
    change_summary = ""
    
    try:
        if rule == "missing_image_alt":
            context = extract_semantic_context(element_str, soup)
            
            tag_soup = BeautifulSoup(element_str, 'html.parser')
            img_tag = tag_soup.find('img')
            
            if not context.get("filename") and not context.get("classes") and not context.get("heading_context"):
                ai_suggestion = "Add descriptive alt text describing the purpose of the image."
                if img_tag:
                    img_tag['alt'] = "Descriptive standard alt text"
                    corrected_html = str(img_tag)
                    after_html = corrected_html.replace('alt="Descriptive standard alt text"', '[[ADDED: alt="Descriptive standard alt text"]]')
                else:
                    corrected_html = "<!-- Add appropriate img with alt tag -->"
            else:
                el_type = classify_element(context)
                desc = generate_contextual_description(context, el_type)
                
                if el_type == "generic image":
                    ai_suggestion = f"Add meaningful alt text indicating: '{desc}'."
                else:
                    el_type_str = el_type + " interface" if el_type == "dashboard" else el_type
                    ai_suggestion = f"This image appears to represent a {el_type_str}. Add meaningful alt text such as '{desc}'."
                
                if img_tag:
                    img_tag['alt'] = desc
                    corrected_html = str(img_tag)
                    after_html = corrected_html.replace(f'alt="{desc}"', f'[[ADDED: alt="{desc}"]]')
                else:
                    corrected_html = f'<img src="{context.get("filename", "")}" alt="{desc}">'
                    after_html = f'<img src="{context.get("filename", "")}" [[ADDED: alt="{desc}"]]>'
            
            change_summary = "Added alt attribute to improve accessibility"

        elif rule == "input_without_label":
            tag_soup = BeautifulSoup(element_str, 'html.parser')
            input_tag = tag_soup.find('input')
            
            if input_tag:
                input_name = input_tag.get('name', 'input_field')
                clean_name = input_name.replace('-', ' ').replace('_', ' ').title()
                
                ai_suggestion = f"Add a <label> associated with this input field such as '{clean_name}' to improve screen reader accessibility."
                
                input_id = input_tag.get('id')
                if not input_id:
                    safe_id = input_name if input_name != 'input_field' else 'generated_input_id'
                    input_tag['id'] = safe_id
                    input_id = safe_id
                    
                label_html = f'<label for="{input_id}">{clean_name}</label>\n{str(input_tag)}'
                corrected_html = label_html
                after_html = f'[[ADDED: <label for="{input_id}">{clean_name}</label>]]\n{str(input_tag)}'
                change_summary = "Added label and associated input field using id"

        elif rule == "missing_html_lang":
            ai_suggestion = "Add lang='en' to the <html> tag to define document language for assistive technologies."
            corrected_html = '<html lang="en">'
            after_html = '<html [[ADDED: lang="en"]]>'
            change_summary = "Added lang attribute to HTML tag"
            
        elif rule == "multiple_h1_tags":
            ai_suggestion = "Use only one <h1> as the primary heading. Convert additional <h1> tags to <h2> or lower for proper hierarchy."
            corrected_html = "<!-- Example Conversion -->\n<h2>" + element_str.replace("Multiple <h1> elements", "Your Subheading") + "</h2>"
            after_html = "<!-- Example Conversion -->\n[[CHANGED: <h2>]]" + element_str.replace("Multiple <h1> elements", "Your Subheading") + "[[CHANGED: </h2>]]"
            change_summary = "Adjusted heading hierarchy (h1 -> h2)"
            
        elif rule == "skipped_heading_level":
            ai_suggestion = "Ensure headings follow a sequential logical order (e.g., h2 followed by h3, not h4). Do not skip levels for visual styling."
            tag_soup = BeautifulSoup(element_str, 'html.parser')
            h_tag = tag_soup.find(re.compile('^h[1-6]$'))
            if h_tag:
                current_level = int(h_tag.name[1])
                suggested_level = max(1, current_level - 1)
                h_tag.name = f'h{suggested_level}'
                corrected_html = f"<!-- Adjusted to maintain hierarchy -->\n{str(h_tag)}"
                
                h_str = str(h_tag)
                after_tag = h_str.replace(f'<h{suggested_level}', f'<[[CHANGED: h{suggested_level}]]').replace(f'</h{suggested_level}>', f'</[[CHANGED: h{suggested_level}]]>')
                after_html = f"<!-- Adjusted to maintain hierarchy -->\n{after_tag}"
                change_summary = "Adjusted heading level to maintain logical hierarchy"
                
    except Exception as e:
        ai_suggestion = f"Fix required for rule: {rule}. (Parser Fallback)"
        corrected_html = f"<!-- Manual HTML correction needed for {rule} -->"
        
    if not after_html:
        after_html = corrected_html
        
    violation["ai_suggestion"] = ai_suggestion
    violation["corrected_html"] = corrected_html
    violation["before_html"] = before_html
    violation["after_html"] = after_html
    violation["change_summary"] = change_summary
    
    return violation
