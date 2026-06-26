"""Integration tests for Phase 8 — the analyst agent (LLM stubbed).

A deterministic fake LLM is injected via the ``get_llm`` dependency, so these
exercise the LangGraph loop, tool dispatch and message threading without a
running Ollama model. The tools themselves run the real Phase-6 services against
the project, so a tool result reflects real (here, empty) project data.
"""

import pytest

from app.ai.llm import LLMReply, ToolCall, get_llm
from app.main import app
from tests.helpers import API, bearer
from tests.integration.test_phase1_master_flow import _client_with_project


class ScriptedLLM:
    """Returns canned replies in order and records the messages it was handed."""

    def __init__(self, replies: list[LLMReply]):
        self.replies = list(replies)
        self.seen: list[list[dict]] = []

    async def chat(self, messages: list[dict], tools: list[dict]) -> LLMReply:
        self.seen.append(messages)
        return self.replies.pop(0)


def _use_llm(fake: ScriptedLLM) -> None:
    app.dependency_overrides[get_llm] = lambda: fake


@pytest.fixture(autouse=True)
def _clear_llm_override():
    yield
    app.dependency_overrides.pop(get_llm, None)


class TestAnalystAgent:
    async def test_tool_call_then_answer(self, client, db_session):
        token, project_id = await _client_with_project(client)
        fake = ScriptedLLM([
            LLMReply(tool_calls=[ToolCall(name="get_overview_kpis", arguments={})]),
            LLMReply(content="The project has 0 pours so far."),
        ])
        _use_llm(fake)

        resp = await client.post(
            f"{API}/projects/{project_id}/chat",
            json={"question": "How is the project doing?"},
            headers=bearer(token),
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["answer"] == "The project has 0 pours so far."
        assert body["tools_used"] == ["get_overview_kpis"]
        # The real tool result was threaded back to the model on the 2nd call.
        tool_msgs = [m for m in fake.seen[1] if m["role"] == "tool"]
        assert tool_msgs and '"pour_count": 0' in tool_msgs[0]["content"]

    async def test_direct_answer_without_tools(self, client, db_session):
        token, project_id = await _client_with_project(client)
        fake = ScriptedLLM([LLMReply(content="I can help with this project's quality data.")])
        _use_llm(fake)

        resp = await client.post(
            f"{API}/projects/{project_id}/chat",
            json={"question": "hello"},
            headers=bearer(token),
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["tools_used"] == []
        assert "quality data" in resp.json()["answer"]

    async def test_parallel_multi_tool_fanout(self, client, db_session):
        token, project_id = await _client_with_project(client)
        fake = ScriptedLLM([
            LLMReply(tool_calls=[
                ToolCall(name="get_overview_kpis", arguments={}),
                ToolCall(name="get_supplier_scorecard", arguments={}),
            ]),
            LLMReply(content="Both done."),
        ])
        _use_llm(fake)

        resp = await client.post(
            f"{API}/projects/{project_id}/chat",
            json={"question": "give me the overview and the supplier scorecard"},
            headers=bearer(token),
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["tools_used"] == ["get_overview_kpis", "get_supplier_scorecard"]
        tool_msgs = [m for m in fake.seen[1] if m["role"] == "tool"]
        assert {m["tool_name"] for m in tool_msgs} == {
            "get_overview_kpis",
            "get_supplier_scorecard",
        }

    async def test_tool_error_is_surfaced_not_500(self, client, db_session):
        token, project_id = await _client_with_project(client)
        fake = ScriptedLLM([
            # Ask to trace a sample that doesn't exist → tool raises NotFoundError,
            # which the loop must capture as a tool result, not a 500.
            LLMReply(tool_calls=[ToolCall(name="trace_sample", arguments={"sample_id": 999999})]),
            LLMReply(content="That sample wasn't found."),
        ])
        _use_llm(fake)

        resp = await client.post(
            f"{API}/projects/{project_id}/chat",
            json={"question": "trace sample 999999"},
            headers=bearer(token),
        )
        assert resp.status_code == 200, resp.text
        tool_msgs = [m for m in fake.seen[1] if m["role"] == "tool"]
        assert tool_msgs and "error" in tool_msgs[0]["content"]

    async def test_unknown_project_rejected(self, client, db_session):
        token, _ = await _client_with_project(client)
        _use_llm(ScriptedLLM([LLMReply(content="x")]))
        resp = await client.post(
            f"{API}/projects/999999/chat",
            json={"question": "hi"},
            headers=bearer(token),
        )
        assert resp.status_code == 404, resp.text
