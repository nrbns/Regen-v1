"""
Privacy Sentinel Routes
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

router = APIRouter()


class HostStat(BaseModel):
    host: str = Field(..., description="Hostname detected during browsing")
    count: int = Field(0, ge=0, description="Number of requests observed")


class SentinelAuditRequest(BaseModel):
    url: Optional[str] = Field(None, description="URL being audited")
    tab_id: Optional[str] = Field(None, alias="tabId", description="Tab identifier from renderer")
    trackers: List[HostStat] = Field(default_factory=list)
    third_party_hosts: List[HostStat] = Field(default_factory=list, alias="thirdPartyHosts")
    total_requests: int = Field(0, ge=0, alias="totalRequests")


class SentinelIssue(BaseModel):
    category: str
    detail: str
    severity: Literal["low", "medium", "high"] = "medium"


class SentinelAuditResponse(BaseModel):
    risk_score: int = Field(..., ge=0, le=100, alias="riskScore")
    risk_level: Literal["low", "medium", "high"] = Field(..., alias="riskLevel")
    summary: str
    actions: List[str]
    issues: List[SentinelIssue]
    generated_at: datetime = Field(default_factory=datetime.utcnow, alias="generatedAt")


@router.post("/audit", response_model=SentinelAuditResponse)
async def audit(request: SentinelAuditRequest) -> SentinelAuditResponse:
    """
    Lightweight heuristic AI audit.

    In production this will call the Redix privacy inspector; for now we
    synthesize a deterministic response so the renderer can iterate on UX.
    """
    tracker_score = min(60, len(request.trackers) * 15)
    third_party_score = min(30, len(request.third_party_hosts) * 5)
    activity_score = min(10, (request.total_requests // 25) * 5)
    risk_score = min(100, tracker_score + third_party_score + activity_score)

    if risk_score >= 60:
        risk_level = "high"
    elif risk_score >= 30:
        risk_level = "medium"
    else:
        risk_level = "low"

    issues: List[SentinelIssue] = []
    actions: List[str] = []

    if request.trackers:
        issues.append(
            SentinelIssue(
                category="trackers",
                detail=f"Detected {len(request.trackers)} tracker signatures.",
                severity="high" if risk_level == "high" else "medium",
            )
        )
        actions.append("Block tracker scripts for this site.")

    if request.third_party_hosts:
        issues.append(
            SentinelIssue(
                category="third-party",
                detail=f"{len(request.third_party_hosts)} third-party hosts observed.",
                severity="medium" if risk_level != "low" else "low",
            )
        )
        actions.append("Open in Shadow Mode to limit third-party leakage.")

    if not issues:
        issues.append(
            SentinelIssue(
                category="status",
                detail="No material privacy risks detected.",
                severity="low",
            )
        )
        actions.append("No action needed.")

    summary = (
        "Privacy risk looks elevated—review recommended protections."
        if risk_level == "high"
        else "Some trackers spotted. Consider applying shields."
        if risk_level == "medium"
        else "This page appears low-risk."
    )

    return SentinelAuditResponse(
        riskScore=risk_score,
        riskLevel=risk_level,
        summary=summary,
        actions=actions,
        issues=issues,
    )


