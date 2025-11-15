"""
Eco score calculation endpoint
"""

from fastapi import APIRouter
from pydantic import BaseModel
import psutil
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class EcoScoreResponse(BaseModel):
    score: int
    saved: str
    tokens: int
    cpu: float
    memory: float
    carbon_intensity: float
    co2_saved: float


@router.get("/eco", response_model=EcoScoreResponse)
async def get_eco_score():
    """
    Calculate eco score based on system metrics and session activity.
    Returns score (0-100), CO2 saved, and current metrics.
    """
    try:
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=0.1) or 0.0
        memory_percent = psutil.virtual_memory().percent or 0.0
        
        # Mock session tokens (in real implementation, track from Redix)
        # This would come from a session store or metrics
        session_tokens = 0  # TODO: Track actual tokens used
        
        # Carbon intensity (gCO₂/kWh) - default to US average
        carbon_intensity = 400.0  # Can be enhanced with real-time grid data
        
        # Calculate eco score
        # Lower CPU, memory, and tokens = higher score
        cpu_penalty = min(cpu_percent * 0.3, 30)  # Max 30 points penalty
        memory_penalty = min(memory_percent * 0.2, 20)  # Max 20 points penalty
        token_penalty = min(session_tokens * 0.001, 20)  # Max 20 points penalty
        
        base_score = 100 - cpu_penalty - memory_penalty - token_penalty
        eco_score = max(0, min(100, int(base_score)))
        
        # Calculate CO2 saved (mock calculation)
        # In reality, this would track actual energy savings from optimizations
        co2_saved = (100 - eco_score) * 0.0034  # Mock: 0.0034g per point lost
        
        return EcoScoreResponse(
            score=eco_score,
            saved=f"{co2_saved:.2f}g CO₂",
            tokens=session_tokens,
            cpu=round(cpu_percent, 2),
            memory=round(memory_percent, 2),
            carbon_intensity=carbon_intensity,
            co2_saved=round(co2_saved, 2),
        )
    except Exception as e:
        logger.error(f"Eco score calculation error: {e}")
        # Return default values on error
        return EcoScoreResponse(
            score=85,
            saved="0.00g CO₂",
            tokens=0,
            cpu=0.0,
            memory=0.0,
            carbon_intensity=400.0,
            co2_saved=0.0,
        )

