"""
Fake News & Fact Verification Engine
Integrates Google Fact Check Tools API and publisher domain credibility
to generate verifiable claim weights and verification statuses.
"""

from typing import Dict, Any
import requests

CREDIBLE_SOURCES = {
    "bloomberg": 0.96,
    "reuters": 0.98,
    "financial times": 0.95,
    "wall street journal": 0.97,
    "cnbc": 0.90,
    "economic times": 0.89,
    "business standard": 0.88,
    "mint": 0.88,
    "forbes": 0.85
}


class FactVerificationEngine:
    def __init__(self, api_key: str = ""):
        self.api_key = api_key

    def verify_claim(self, headline: str, source: str) -> Dict[str, Any]:
        """
        Verifies news headline against Google Fact Check API or domain reputation.
        Never declares fake solely because no check was found.
        """
        norm_source = source.lower()
        credibility = 0.70
        for s_name, score in CREDIBLE_SOURCES.items():
            if s_name in norm_source:
                credibility = score
                break

        # Google Fact Check Tools API query if key exists
        if self.api_key:
            try:
                url = f"https://factchecktools.googleapis.com/v1alpha1/claims:search?query={headline}&key={self.api_key}"
                resp = requests.get(url, timeout=3)
                if resp.status_code == 200:
                    claims = resp.json().get("claims", [])
                    if claims:
                        rating = claims[0].get("claimReview", [{}])[0].get("textualRating", "").lower()
                        if "false" in rating or "misleading" in rating:
                            return {
                                "verification_status": "Contradicted",
                                "verification_score": 0.15,
                                "source_credibility": credibility,
                                "fact_check_found": True
                            }
                        elif "true" in rating:
                            return {
                                "verification_status": "Verified",
                                "verification_score": 0.95,
                                "source_credibility": credibility,
                                "fact_check_found": True
                            }
            except Exception:
                pass

        # Heuristic domain based assessment
        lower_h = headline.lower()
        if "rumor" in lower_h or "unconfirmed" in lower_h:
            status = "Unverified"
            score = 0.40
        elif credibility >= 0.90:
            status = "Verified"
            score = credibility
        else:
            status = "No Fact Check Found"
            score = credibility * 0.85

        return {
            "verification_status": status,
            "verification_score": round(score, 2),
            "source_credibility": credibility,
            "fact_check_found": status == "Verified"
        }
