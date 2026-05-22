import json
from typing import Dict, Any, List, Tuple
from app.config import SCORING_WEIGHTS


def analyze_trends(all_audits: List[Dict[str, Any]]) -> Tuple[Dict[str, int], int]:
    total_audits = len(all_audits)
    trends = {}

    for row in all_audits:
        v_str = row.get("violations", "[]")
        if not v_str:
            continue
        try:
            violations = json.loads(v_str) if isinstance(v_str, str) else v_str
        except (json.JSONDecodeError, TypeError):
            violations = []

        seen_rules = set()
        for v in violations:
            rule = v.get("rule")
            if rule and rule not in seen_rules:
                seen_rules.add(rule)
                trends[rule] = trends.get(rule, 0) + 1

    return trends, total_audits


def adjust_weights(trends: Dict[str, int], total_audits: int) -> Dict[str, int]:
    adjusted_weights = dict(SCORING_WEIGHTS)

    if total_audits == 0:
        return adjusted_weights

    rule_severities = {
        "missing_image_alt": "Critical",
        "input_without_label": "High",
        "missing_html_lang": "High",
        "multiple_h1_tags": "Medium",
        "skipped_heading_level": "Medium",
    }

    for rule, count in trends.items():
        frequency = count / total_audits
        if frequency >= 0.3:
            severity = rule_severities.get(rule)
            if severity and severity in adjusted_weights:
                if severity == "Critical":
                    adjusted_weights[severity] += 3
                elif severity == "High":
                    adjusted_weights[severity] += 2
                elif severity in ["Medium", "Low"]:
                    adjusted_weights[severity] += 1

    return adjusted_weights


def generate_priority_insights(trends: Dict[str, int], total_audits: int) -> Dict[str, str]:
    if not trends or total_audits == 0:
        return {
            "most_common_issue": "None",
            "recommendation": "Perform more audits to generate insights.",
        }

    most_common_rule = max(trends, key=trends.get)
    frequency = trends[most_common_rule]
    percentage = int((frequency / total_audits) * 100)

    most_common_issue_text = f"Most frequent issue: {most_common_rule} (occurs in {percentage}% of audits)"

    if most_common_rule == "missing_image_alt":
        rec = "High priority fix recommended: image accessibility"
    elif most_common_rule == "input_without_label":
        rec = "High priority fix recommended: form field labeling and structure"
    elif most_common_rule == "missing_html_lang":
        rec = "High priority fix recommended: top-level HTML document language definition"
    elif "heading" in most_common_rule or "h1" in most_common_rule:
        rec = "High priority fix recommended: heading structure hierarchy"
    else:
        rec = f"High priority fix recommended: {most_common_rule.replace('_', ' ')}"

    return {
        "most_common_issue": most_common_issue_text,
        "recommendation": rec,
    }
