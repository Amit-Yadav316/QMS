"""chat.py — analyst-agent chat DTOs."""

from typing import Literal

from pydantic import BaseModel, Field


class ChatTurn(BaseModel):
    """One prior turn of the conversation, replayed to give the agent memory.

    Only clean user/assistant text is carried (no tool messages, no charts) — the
    frontend keeps the running history in localStorage and sends the tail back.
    """

    role: Literal["user", "assistant"]
    content: str


class ChartSeries(BaseModel):
    name: str  # human label for the legend
    key: str  # the data-row key this series plots


class ChartSpec(BaseModel):
    """A deterministic chart derived from tool results (the model never builds it)."""

    type: Literal["bar", "line", "pie"]
    title: str
    x_key: str  # the data-row key for the category / x-axis
    series: list[ChartSeries] = Field(min_length=1, max_length=6)
    data: list[dict] = Field(max_length=50)


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=20)


class ChatResponse(BaseModel):
    answer: str
    tools_used: list[str] = []
    chart: ChartSpec | None = None
