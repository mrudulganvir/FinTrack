import os
import httpx
import base64
from typing import Dict, Any, Optional
import logging

log = logging.getLogger(__name__)

class RazorpayKYCService:
    """
    Service wrapper for Razorpay Identity/KYC API.
    To use this:
    1. Sign up at https://razorpay.com/
    2. Get your Secret and ID from the dashboard.
    """
    
    def __init__(self):
        self.key_id = os.getenv("RAZORPAY_KEY_ID")
        self.key_secret = os.getenv("RAZORPAY_KEY_SECRET")
        self.base_url = "https://api.razorpay.com/v1"
        
    def _get_auth_header(self) -> Dict[str, str]:
        auth_str = f"{self.key_id}:{self.key_secret}"
        encoded_auth = base64.b64encode(auth_str.encode()).decode()
        return {"Authorization": f"Basic {encoded_auth}"}

    async def verify_pan(self, pan_number: str) -> Optional[Dict[str, Any]]:
        """
        Example: Verify a PAN card using Razorpay's Verification API.
        """
        url = f"{self.base_url}/verification/pan"
        payload = {"pan": pan_number}
        
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(url, json=payload, headers=self._get_auth_header())
                # For demo, we logic check the response.
                # In live, check if status is 'verified'.
                return res.json()
        except Exception as e:
            log.error(f"Razorpay Panasonic Verification Failed: {e}")
            return None

razorpay_kyc_service = RazorpayKYCService()
