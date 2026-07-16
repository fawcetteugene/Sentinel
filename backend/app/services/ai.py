"""AI incident commander service."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from openai import OpenAI

from app.core.config import get_settings
from app.core.enums import HazardType, IncidentSeverity
from app.schemas import AICommanderResponse, IncidentAnalysis


@dataclass
class AIContext:
    title: str
    description: str
    severity: IncidentSeverity
    hazard_type: HazardType
    number_of_people: int
    latitude: float
    longitude: float


class AIIncidentCommander:
    """Encapsulates the model call and a deterministic fallback."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = OpenAI(api_key=self.settings.openai_api_key) if self.settings.openai_api_key else None

    def analyze_incident(self, context: AIContext) -> IncidentAnalysis:
        if self.client:
            try:
                return self._analyze_with_openai(context)
            except Exception:
                pass
        return self._fallback_analysis(context)

    def command_briefing(self, incidents: list[dict[str, Any]], resources: list[dict[str, Any]]) -> AICommanderResponse:
        if self.client:
            try:
                return self._command_briefing_with_openai(incidents, resources)
            except Exception:
                pass
        return self._fallback_briefing(incidents, resources)

    def _analyze_with_openai(self, context: AIContext) -> IncidentAnalysis:
        response = self.client.responses.create(
            model=self.settings.openai_model,
            input=[
                {
                    "role": "system",
                    "content": "You are Sentinel AI, an emergency incident commander. Return precise structured analysis.",
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "title": context.title,
                            "description": context.description,
                            "severity": context.severity,
                            "hazard_type": context.hazard_type,
                            "number_of_people": context.number_of_people,
                            "latitude": context.latitude,
                            "longitude": context.longitude,
                        }
                    ),
                },
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "incident_analysis",
                    "schema": IncidentAnalysis.model_json_schema(),
                    "strict": True,
                }
            },
        )
        return IncidentAnalysis.model_validate_json(response.output_text)

    def _command_briefing_with_openai(
        self, incidents: list[dict[str, Any]], resources: list[dict[str, Any]]
    ) -> AICommanderResponse:
        response = self.client.responses.create(
            model=self.settings.openai_model,
            input=[
                {
                    "role": "system",
                    "content": "You are Sentinel AI, an emergency operations center AI commander. Return structured operational guidance.",
                },
                {
                    "role": "user",
                    "content": json.dumps({"incidents": incidents, "resources": resources}),
                },
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "command_briefing",
                    "schema": AICommanderResponse.model_json_schema(),
                    "strict": True,
                }
            },
        )
        return AICommanderResponse.model_validate_json(response.output_text)

    def _fallback_analysis(self, context: AIContext) -> IncidentAnalysis:
        severity_weight = {
            IncidentSeverity.LOW: 25,
            IncidentSeverity.MODERATE: 50,
            IncidentSeverity.HIGH: 75,
            IncidentSeverity.CRITICAL: 95,
        }[context.severity]
        hazard_boost = {
            HazardType.FLOOD: 10,
            HazardType.FIRE: 15,
            HazardType.EARTHQUAKE: 20,
            HazardType.ROAD_ACCIDENT: 8,
            HazardType.MEDICAL: 12,
            HazardType.HAZMAT: 18,
            HazardType.SECURITY: 14,
            HazardType.OTHER: 5,
        }[context.hazard_type]
        severity_score = min(100, severity_weight + hazard_boost + min(context.number_of_people, 20))
        priority = "P1 - Immediate" if severity_score >= 85 else "P2 - Urgent" if severity_score >= 65 else "P3 - Routine"
        resources = self._resources_for_hazard(context.hazard_type)
        response_minutes = max(5, 60 - severity_score // 2)
        risk_level = "extreme" if severity_score >= 90 else "high" if severity_score >= 75 else "moderate"
        actions = [
            "Acknowledge report and validate location",
            f"Dispatch {resources[0]} and establish contact with field team",
            "Set perimeter and clear access routes",
            "Provide public safety guidance and maintain live updates",
        ]
        return IncidentAnalysis(
            severity_score=severity_score,
            priority=priority,
            recommended_resources=resources,
            estimated_response_time_minutes=response_minutes,
            risk_level=risk_level,
            suggested_action_plan=actions,
            escalation_probability=min(0.98, severity_score / 110),
            explanation=(
                "Fallback analysis based on hazard type, declared severity, and crowd size. "
                "OpenAI API is not configured or returned an error."
            ),
        )

    def _fallback_briefing(
        self, incidents: list[dict[str, Any]], resources: list[dict[str, Any]]
    ) -> AICommanderResponse:
        critical = [i for i in incidents if i.get("severity") == "critical"]
        summary = f"{len(incidents)} active incidents, {len(critical)} critical, {len(resources)} resources tracked."
        return AICommanderResponse(
            summary=summary,
            priorities=[f"Stabilize {i['title']}" for i in incidents[:3]] or ["Maintain readiness"],
            responder_allocation=["Pair nearest available responders with the highest priority incidents"],
            action_plan=[
                "Confirm incident locations and establish command channels",
                "Assign responder teams based on severity and travel time",
                "Monitor resource burn rate and prepare escalation thresholds",
            ],
            resource_shortages=["Monitor ambulances and medical supply consumption for shortage risk"],
            escalation_forecast="Escalation is likely if high-severity incidents remain unassigned for more than 15 minutes.",
            evacuation_advice="Issue evacuations for affected zones if the hazard footprint expands or critical infrastructure is threatened.",
            situation_report=summary,
            explanation=[
                "Generated from incident counts, severity, and responder availability.",
                "The fallback engine keeps the command panel useful when the API key is unavailable.",
            ],
        )

    @staticmethod
    def _resources_for_hazard(hazard: HazardType) -> list[str]:
        mapping = {
            HazardType.FLOOD: ["ambulances", "boats or high-clearance vehicles", "shelter coordinators"],
            HazardType.FIRE: ["fire trucks", "water supply units", "medical teams"],
            HazardType.EARTHQUAKE: ["urban search and rescue", "ambulances", "police units"],
            HazardType.ROAD_ACCIDENT: ["ambulances", "police units", "tow vehicles"],
            HazardType.MEDICAL: ["ambulances", "medical teams", "triage support"],
            HazardType.HAZMAT: ["hazmat team", "fire unit", "medical decontamination support"],
            HazardType.SECURITY: ["police units", "drones or aerial observation", "medical standby"],
            HazardType.OTHER: ["dispatcher review", "nearest available responder", "field supervision"],
        }
        return mapping[hazard]

