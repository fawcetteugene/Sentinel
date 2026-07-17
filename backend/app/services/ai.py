"""Offline incident commander and recommendation engine.

This module is the only intelligence boundary in the backend. It is
deterministic, fully offline, and designed so a future GPT integration can
replace only this service without rewiring the rest of the application.
"""

from __future__ import annotations

from dataclasses import dataclass
from statistics import mean
from typing import Any

from app.core.enums import HazardType, IncidentSeverity, ResourceStatus
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
    """Rule-based command assistant used for all offline recommendations."""

    def analyze_incident(self, context: AIContext) -> IncidentAnalysis:
        severity_score = self._severity_score(context)
        priority = self._priority_for_score(severity_score)
        resources = self._resources_for_hazard(context.hazard_type)
        response_minutes = self._response_minutes(severity_score, context.number_of_people)
        risk_level = self._risk_level(severity_score, context.number_of_people)
        escalation_probability = round(min(0.98, (severity_score / 100) * 0.92 + min(context.number_of_people, 200) / 1000), 2)

        return IncidentAnalysis(
            severity_score=severity_score,
            priority=priority,
            recommended_resources=resources,
            estimated_response_time_minutes=response_minutes,
            risk_level=risk_level,
            suggested_action_plan=self._action_plan(context, resources),
            escalation_probability=escalation_probability,
            explanation=self._analysis_explanation(context, severity_score, priority, resources, risk_level),
        )

    def command_briefing(self, incidents: list[dict[str, Any]], resources: list[dict[str, Any]]) -> AICommanderResponse:
        active_incidents = len(incidents)
        critical_incidents = sum(1 for item in incidents if item.get("severity") == "critical")
        busy_resources = sum(1 for item in resources if item.get("status") == ResourceStatus.BUSY.value)
        offline_resources = sum(1 for item in resources if item.get("status") == ResourceStatus.OFFLINE.value)
        avg_people = int(mean([item.get("number_of_people", 0) for item in incidents]) if incidents else 0)

        summary = (
            f"{active_incidents} active community reports across the area, "
            f"{critical_incidents} critical, {busy_resources} resources currently busy."
        )

        priorities = self._priorities(incidents)
        responder_allocation = self._allocation_guidance(incidents, resources)
        action_plan = self._operational_actions(incidents, resources)
        shortages = self._resource_shortage_guidance(resources, offline_resources)
        escalation_forecast = self._escalation_forecast(incidents, busy_resources, offline_resources)
        evacuation_advice = self._evacuation_advice(incidents, avg_people)

        explanation = [
            "Priorities are ordered by severity, incident age, and likely impact on people.",
            f"{busy_resources} resources are busy and {offline_resources} are offline, which constrains surge response.",
            f"Average affected population per active incident is approximately {avg_people}.",
            "The brief is generated entirely from local community rules and seeded state.",
        ]

        return AICommanderResponse(
            summary=summary,
            priorities=priorities,
            responder_allocation=responder_allocation,
            action_plan=action_plan,
            resource_shortages=shortages,
            escalation_forecast=escalation_forecast,
            evacuation_advice=evacuation_advice,
            situation_report=self._situation_report(active_incidents, critical_incidents, busy_resources),
            explanation=explanation,
        )

    @staticmethod
    def _severity_score(context: AIContext) -> int:
        base = {
            IncidentSeverity.LOW: 20,
            IncidentSeverity.MODERATE: 45,
            IncidentSeverity.HIGH: 72,
            IncidentSeverity.CRITICAL: 92,
        }[context.severity]
        hazard_boost = {
            HazardType.FLOOD: 12,
            HazardType.FIRE: 14,
            HazardType.EARTHQUAKE: 18,
            HazardType.ROAD_ACCIDENT: 8,
            HazardType.MEDICAL: 10,
            HazardType.HAZMAT: 16,
            HazardType.SECURITY: 11,
            HazardType.MISSING_CHILD: 12,
            HazardType.MISSING_ELDERLY: 10,
            HazardType.SNAKE_BITE: 13,
            HazardType.LANDSLIDE: 15,
            HazardType.COLLAPSED_BRIDGE: 12,
            HazardType.HEAVY_RAIN: 10,
            HazardType.WATER_SHORTAGE: 9,
            HazardType.DISEASE_OUTBREAK: 15,
            HazardType.ELECTRIC_POLE_DOWN: 8,
            HazardType.TREE_BLOCKING_ROAD: 7,
            HazardType.BOAT_ACCIDENT: 13,
            HazardType.LIVESTOCK_DISEASE: 9,
            HazardType.RIVER_OVERFLOW: 13,
            HazardType.OTHER: 5,
        }[context.hazard_type]
        population_boost = min(context.number_of_people // 3, 20)
        return min(100, base + hazard_boost + population_boost)

    @staticmethod
    def _priority_for_score(score: int) -> str:
        if score >= 90:
            return "P1 - Immediate"
        if score >= 70:
            return "P2 - Urgent"
        if score >= 50:
            return "P3 - Important"
        return "P4 - Routine"

    @staticmethod
    def _risk_level(score: int, number_of_people: int) -> str:
        if score >= 90 or number_of_people >= 150:
            return "extreme"
        if score >= 70 or number_of_people >= 50:
            return "high"
        if score >= 50:
            return "moderate"
        return "low"

    @staticmethod
    def _response_minutes(score: int, number_of_people: int) -> int:
        base = 55 - (score // 2)
        crowd_pressure = min(number_of_people // 10, 8)
        return max(5, base + crowd_pressure)

    @staticmethod
    def _resources_for_hazard(hazard: HazardType) -> list[str]:
        mapping = {
            HazardType.FLOOD: ["rescue boats", "volunteers", "shelter coordinators"],
            HazardType.RIVER_OVERFLOW: ["rescue boats", "county engineers", "village leaders"],
            HazardType.FIRE: ["fire trucks", "water tanks", "medical teams"],
            HazardType.ROAD_ACCIDENT: ["ambulances", "bodaboda riders", "police units"],
            HazardType.BOAT_ACCIDENT: ["rescue boats", "ambulances", "life jackets"],
            HazardType.MEDICAL: ["ambulances", "medical teams", "clinic support"],
            HazardType.SNAKE_BITE: ["ambulances", "clinic staff", "village guides"],
            HazardType.LANDSLIDE: ["ambulances", "tractors", "road crews"],
            HazardType.COLLAPSED_BRIDGE: ["tractors", "police units", "engineers"],
            HazardType.HEAVY_RAIN: ["shelters", "volunteers", "road crews"],
            HazardType.WATER_SHORTAGE: ["water tanks", "community leaders", "relief trucks"],
            HazardType.DISEASE_OUTBREAK: ["health workers", "clinic staff", "public announcements"],
            HazardType.ELECTRIC_POLE_DOWN: ["generator support", "county technicians", "traffic marshals"],
            HazardType.TREE_BLOCKING_ROAD: ["tractors", "bodaboda riders", "community volunteers"],
            HazardType.MISSING_CHILD: ["volunteers", "community leaders", "bodaboda riders"],
            HazardType.MISSING_ELDERLY: ["volunteers", "community leaders", "clinic teams"],
            HazardType.LIVESTOCK_DISEASE: ["veterinary support", "community leaders", "farmers"],
            HazardType.HAZMAT: ["fire unit", "medical decontamination support", "police units"],
            HazardType.SECURITY: ["police units", "community watch", "medical standby"],
            HazardType.OTHER: ["community leader review", "nearest volunteer", "field supervision"],
        }
        return mapping[hazard]

    def _action_plan(self, context: AIContext, resources: list[str]) -> list[str]:
        return [
            f"Validate {context.hazard_type.value.replace('_', ' ')} report and confirm the village or settlement for {context.title}.",
            f"Dispatch {resources[0]} and establish a simple phone or radio contact line.",
            "Share a short public message, protect access routes, and guide people to the nearest safe place.",
            "Track changes in severity, volunteer availability, and movement of water, vehicles, or people in real time.",
        ]

    def _analysis_explanation(
        self,
        context: AIContext,
        score: int,
        priority: str,
        resources: list[str],
        risk_level: str,
    ) -> str:
        return (
            f"Severity score {score} is based on declared severity, hazard type, and affected population. "
            f"{context.hazard_type.value.replace('_', ' ').title()} incidents are mapped to {', '.join(resources[:2])}. "
            f"The report is treated as {priority} with {risk_level} risk."
        )

    @staticmethod
    def _priorities(incidents: list[dict[str, Any]]) -> list[str]:
        ordered = sorted(
            incidents,
            key=lambda item: (
                -(item.get("severity_score") or 0),
                item.get("status") == "resolved",
                -(item.get("number_of_people") or 0),
            ),
        )
        priorities = [f"{incident['title']} ({incident.get('priority') or 'Pending triage'})" for incident in ordered[:5]]
        return priorities or ["No active incidents"]

    @staticmethod
    def _allocation_guidance(incidents: list[dict[str, Any]], resources: list[dict[str, Any]]) -> list[str]:
        available_ambulances = sum(1 for item in resources if item.get("kind") == "ambulance" and item.get("status") == ResourceStatus.AVAILABLE.value)
        available_fire = sum(1 for item in resources if item.get("kind") == "fire_truck" and item.get("status") == ResourceStatus.AVAILABLE.value)
        critical = [item for item in incidents if item.get("severity") == "critical"]

        guidance = [
            f"Reserve {available_ambulances} available ambulances for medical and evacuation support.",
            f"Stage {available_fire} available fire units near the highest-risk burn or hazmat incidents.",
        ]
        if critical:
            guidance.append(f"Escalate {len(critical)} critical incident(s) to Incident Commander review immediately.")
        return guidance

    @staticmethod
    def _operational_actions(incidents: list[dict[str, Any]], resources: list[dict[str, Any]]) -> list[str]:
        action_count = min(4, max(2, len(incidents) // 2 + 1))
        actions = [
            "Confirm incident locations, responder availability, and access routes.",
            "Assign missions to the nearest qualified teams and log ETAs.",
            "Monitor hospital and shelter capacity, then trigger capacity warnings at thresholds.",
            "Keep the operations timeline synchronized with live updates and audit logs.",
        ]
        return actions[:action_count]

    @staticmethod
    def _resource_shortage_guidance(resources: list[dict[str, Any]], offline_resources: int) -> list[str]:
        low_fuel = [item for item in resources if (item.get("fuel_level") or 0) < 25 and item.get("fuel_level") is not None]
        low_supply = [item for item in resources if item.get("kind") == "medical_supplies" and (item.get("quantity") or 0) < 100]

        guidance = []
        if low_fuel:
            guidance.append(f"{len(low_fuel)} resource(s) are below fuel threshold and should refuel before next dispatch.")
        if low_supply:
            guidance.append("Medical supplies are trending low and should be rebalanced to field triage points.")
        if offline_resources:
            guidance.append(f"{offline_resources} resource(s) are offline and need maintenance or recovery checks.")
        if not guidance:
            guidance.append("No immediate shortages detected in the current resource snapshot.")
        return guidance

    @staticmethod
    def _escalation_forecast(incidents: list[dict[str, Any]], busy_resources: int, offline_resources: int) -> str:
        critical = sum(1 for item in incidents if item.get("severity") == "critical")
        if critical >= 3 or offline_resources >= 5:
            return "High escalation risk over the next operational cycle."
        if critical >= 1 or busy_resources >= 8:
            return "Moderate escalation risk if additional resources are not staged."
        return "Escalation risk is currently contained, but conditions should be monitored."

    @staticmethod
    def _evacuation_advice(incidents: list[dict[str, Any]], avg_people: int) -> str:
        flood_or_fire = any(item.get("hazard_type") in {"flood", "fire", "hazmat", "earthquake"} for item in incidents)
        if flood_or_fire and avg_people >= 25:
            return "Pre-position shelters and issue phased evacuation guidance for high-risk zones."
        if flood_or_fire:
            return "Prepare targeted evacuations for exposed blocks and vulnerable populations."
        return "No immediate evacuation order is required; continue zone monitoring."

    @staticmethod
    def _situation_report(active: int, critical: int, busy_resources: int) -> str:
        return (
            f"Situation remains active with {active} incident(s), {critical} critical, "
            f"and {busy_resources} resource group(s) engaged across current missions."
        )
