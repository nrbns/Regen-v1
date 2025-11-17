"""
Consent Ledger - Ethical AI Tracking
Logs and queries user consent for AI operations
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional

class ConsentLedger:
    """Consent ledger for ethical AI operations"""
    
    def __init__(self, ledger_path: str = "consent_ledger.json"):
        self.ledger_path = ledger_path
        self.ledger: List[Dict] = self.load_ledger()
    
    def load_ledger(self) -> List[Dict]:
        """Load consent ledger from file"""
        try:
            if os.path.exists(self.ledger_path):
                with open(self.ledger_path, "r") as f:
                    return json.load(f)
            return []
        except Exception as e:
            print(f"[ConsentLedger] Failed to load ledger: {e}")
            return []
    
    def save_ledger(self):
        """Save consent ledger to file"""
        try:
            with open(self.ledger_path, "w") as f:
                json.dump(self.ledger, f, indent=2)
        except Exception as e:
            print(f"[ConsentLedger] Failed to save ledger: {e}")
    
    def log_consent(
        self, 
        user_id: str, 
        action: str, 
        approved: bool, 
        context: str = ""
    ):
        """
        Log a consent decision
        
        Args:
            user_id: User identifier
            action: Action requiring consent (e.g., "ai_summary", "data_collection")
            approved: Whether consent was granted
            context: Additional context about the action
        """
        entry = {
            "user_id": user_id,
            "action": action,
            "approved": approved,
            "context": context,
            "timestamp": datetime.now().isoformat(),
            "revoked": False
        }
        self.ledger.append(entry)
        self.save_ledger()
    
    def revoke_consent(self, action: str, user_id: str):
        """
        Revoke previously granted consent
        
        Args:
            action: Action to revoke consent for
            user_id: User identifier
        """
        for entry in self.ledger:
            if (entry["action"] == action and 
                entry["user_id"] == user_id and 
                entry["approved"] and
                not entry["revoked"]):
                entry["revoked"] = True
                entry["revoked_at"] = datetime.now().isoformat()
        self.save_ledger()
    
    def query_consent(self, user_id: str, action: str) -> bool:
        """
        Query whether user has granted consent for an action
        
        Args:
            user_id: User identifier
            action: Action to check consent for
        
        Returns:
            True if consent granted and not revoked, False otherwise
        """
        # Check latest entry first (most recent decision)
        for entry in reversed(self.ledger):
            if (entry["user_id"] == user_id and 
                entry["action"] == action):
                if entry["revoked"]:
                    return False
                return entry["approved"]
        
        # Default deny if no consent found
        return False
    
    def get_user_consents(self, user_id: str) -> List[Dict]:
        """Get all consent entries for a user"""
        return [
            entry for entry in self.ledger
            if entry["user_id"] == user_id and not entry["revoked"]
        ]

