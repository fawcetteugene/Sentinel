"""ORM models for Sentinel AI."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import (
    HazardType,
    IncidentSeverity,
    IncidentStatus,
    MessageKind,
    ReportKind,
    ResourceKind,
    ResourceStatus,
)
from app.core.security import Role


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role] = mapped_column(Enum(Role), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_on_duty: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    badge_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    last_location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id"), nullable=True)

    assigned_tasks: Mapped[list["Assignment"]] = relationship(
        back_populates="assignee", foreign_keys="Assignment.assignee_id"
    )
    sent_messages: Mapped[list["Message"]] = relationship(back_populates="sender", foreign_keys="Message.sender_id")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user")
    last_location: Mapped["Location | None"] = relationship(foreign_keys=[last_location_id], post_update=True)


class Location(Base, TimestampMixin):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    label: Mapped[str] = mapped_column(String(255), nullable=False, default="Unknown location")
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    source: Mapped[str] = mapped_column(String(100), default="manual", nullable=False)
    incident_id: Mapped[int | None] = mapped_column(ForeignKey("incidents.id"), nullable=True)
    resource_id: Mapped[int | None] = mapped_column(ForeignKey("resources.id"), nullable=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)


class Incident(Base, TimestampMixin):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    severity: Mapped[IncidentSeverity] = mapped_column(Enum(IncidentSeverity), nullable=False, index=True)
    hazard_type: Mapped[HazardType] = mapped_column(Enum(HazardType), nullable=False, index=True)
    number_of_people: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[IncidentStatus] = mapped_column(Enum(IncidentStatus), default=IncidentStatus.NEW, nullable=False)
    assigned_team: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    analysis: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    severity_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    priority: Mapped[str | None] = mapped_column(String(50), nullable=True)
    estimated_response_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    risk_level: Mapped[str | None] = mapped_column(String(50), nullable=True)
    suggested_action_plan: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    recommended_resources: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    escalation_probability: Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    replay_events: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)

    creator: Mapped["User | None"] = relationship(foreign_keys=[created_by_id])
    attachments: Mapped[list["IncidentAttachment"]] = relationship(back_populates="incident", cascade="all, delete-orphan")
    assignments: Mapped[list["Assignment"]] = relationship(back_populates="incident", cascade="all, delete-orphan")
    reports: Mapped[list["Report"]] = relationship(back_populates="incident", cascade="all, delete-orphan")
    messages: Mapped[list["Message"]] = relationship(back_populates="incident", cascade="all, delete-orphan")
    location: Mapped["Location | None"] = relationship(
        primaryjoin="and_(Incident.id==Location.incident_id)", uselist=False, viewonly=True
    )


class IncidentAttachment(Base, TimestampMixin):
    __tablename__ = "incident_attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id"), nullable=False)
    kind: Mapped[str] = mapped_column(String(50), nullable=False)
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    filename: Mapped[str | None] = mapped_column(String(500), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(255), nullable=True)

    incident: Mapped[Incident] = relationship(back_populates="attachments")


class Resource(Base, TimestampMixin):
    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    kind: Mapped[ResourceKind] = mapped_column(Enum(ResourceKind), nullable=False, index=True)
    status: Mapped[ResourceStatus] = mapped_column(Enum(ResourceStatus), default=ResourceStatus.AVAILABLE, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    unit_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id"), nullable=True)
    assigned_to_incident_id: Mapped[int | None] = mapped_column(ForeignKey("incidents.id"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    eta_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fuel_level: Mapped[int | None] = mapped_column(Integer, nullable=True)

    location: Mapped["Location | None"] = relationship(foreign_keys=[location_id], post_update=True)
    assigned_incident: Mapped["Incident | None"] = relationship(foreign_keys=[assigned_to_incident_id])


class Assignment(Base, TimestampMixin):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id"), nullable=False)
    assignee_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    mission: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    priority: Mapped[str] = mapped_column(String(50), nullable=False)
    eta_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    instructions: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="assigned", nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    incident: Mapped[Incident] = relationship(back_populates="assignments")
    assignee: Mapped[User] = relationship(back_populates="assigned_tasks", foreign_keys=[assignee_id])


class Report(Base, TimestampMixin):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    incident_id: Mapped[int | None] = mapped_column(ForeignKey("incidents.id"), nullable=True)
    kind: Mapped[ReportKind] = mapped_column(Enum(ReportKind), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    pdf_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    generated_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    incident: Mapped["Incident | None"] = relationship(back_populates="reports")


class Message(Base, TimestampMixin):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    incident_id: Mapped[int | None] = mapped_column(ForeignKey("incidents.id"), nullable=True)
    sender_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    recipient_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    kind: Mapped[MessageKind] = mapped_column(Enum(MessageKind), default=MessageKind.LOG, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    extra_metadata: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)

    incident: Mapped["Incident | None"] = relationship(back_populates="messages")
    sender: Mapped["User | None"] = relationship(back_populates="sent_messages", foreign_keys=[sender_id])


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(50), default="info", nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    action_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    user: Mapped[User] = relationship(back_populates="notifications")
