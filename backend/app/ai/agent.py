"""agent.py — analyst-agent entrypoint.

Wraps the LangGraph loop: seed a system + user message, run to completion, and
return the final answer plus which tools were used (for transparency in the UI).
"""

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.graph import build_agent_graph
from app.ai.llm import LLMClient
from app.models.master import Project

SYSTEM_PROMPT = (
    'You are the quality analytics assistant for the construction project '
    '"{project_name}". You help with this project\'s pours, cube-strength tests, '
    "NCRs, suppliers and traceability.\n"
    "Use the provided tools to fetch data — never invent numbers. Base every figure "
    "on tool results and report numbers with their units. If a tool returns no data, "
    "say so plainly. You may call several tools at once for multi-part questions. "
    "Keep answers concise. If a question is outside this project's quality data, say "
    "you can only help with this project."
)


@dataclass
class AgentResult:
    answer: str
    tools_used: list[str]


def _last_answer(messages: list[dict]) -> str:
    for msg in reversed(messages):
        if msg.get("role") == "assistant" and not msg.get("tool_calls"):
            return (msg.get("content") or "").strip()
    return ""


def _tools_used(messages: list[dict]) -> list[str]:
    used: list[str] = []
    for msg in messages:
        for tc in msg.get("tool_calls") or []:
            name = tc.get("function", {}).get("name")
            if name:
                used.append(name)
    return used


async def run_agent(
    session: AsyncSession, project: Project, question: str, llm: LLMClient
) -> AgentResult:
    graph = build_agent_graph(llm, session, project)
    initial: dict = {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT.format(project_name=project.project_name)},
            {"role": "user", "content": question},
        ],
        "iterations": 0,
    }
    final = await graph.ainvoke(initial)
    answer = _last_answer(final["messages"]) or "I couldn't produce an answer."
    return AgentResult(answer=answer, tools_used=_tools_used(final["messages"]))
