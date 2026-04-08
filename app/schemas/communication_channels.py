"""Request validation for communication channels API."""

from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class CommunicationChannelCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(min_length=1, max_length=255)
    channel_type: Literal["email"] = "email"
    provider: Literal["gmail", "outlook", "smtp"]
    display_email: Optional[str] = None
    display_name: Optional[str] = None
    config: dict[str, Any] = Field(default_factory=dict)
    credentials: dict[str, Any] = Field(default_factory=dict)
    is_default: Optional[bool] = None


class CommunicationChannelUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    display_email: Optional[str] = None
    display_name: Optional[str] = None
    config: Optional[dict[str, Any]] = None
    credentials: Optional[dict[str, Any]] = None
    is_default: Optional[bool] = None
