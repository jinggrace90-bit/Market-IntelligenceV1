"""Request body schemas (validation mirrors the TS Zod schemas)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, description="Password must be at least 8 characters")
    name: str | None = Field(default=None, min_length=1, max_length=80)


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class WatchlistAddBody(BaseModel):
    symbol: str = Field(min_length=1, max_length=20)
    name: str | None = Field(default=None, max_length=120)
    asset_type: Literal["stock", "etf", "crypto", "commodity", "index"] | None = Field(
        default=None, alias="assetType"
    )

    model_config = {"populate_by_name": True}


class ReorderBody(BaseModel):
    ordered_ids: list[str] = Field(min_length=1, alias="orderedIds")

    model_config = {"populate_by_name": True}


class MacroBody(BaseModel):
    scenario: str = Field(min_length=3, max_length=400)
