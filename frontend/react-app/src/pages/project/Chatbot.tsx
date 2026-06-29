import React, { useEffect, useRef, useState } from 'react';
import { Send, Bot, User, Sparkles, Trash2 } from 'lucide-react';
import { useProject } from '../../components/layout/ProjectLayout';
import { chatApi, type ChatTurn } from '../../api/chat';
import { getApiErrorMessage } from '../../api/client';
import { ChatChart } from '../../components/chat/ChatChart';
import { loadChat, saveChat, clearChat, type StoredMsg } from '../../lib/chatStore';
import './Chatbot.css';

type Msg = StoredMsg;

const TOOL_LABEL: Record<string, string> = {
  get_overview_kpis: 'Overview KPIs',
  get_quality_analytics: 'Quality analytics',
  get_supplier_scorecard: 'Supplier scorecard',
  search_traceability: 'Traceability search',
  trace_sample: 'Sample lineage',
  list_ncrs: 'NCRs',
};

const SUGGESTIONS = [
  'How is the project doing overall?',
  'Which supplier has the best pass rate?',
  'List the open NCRs.',
  'Show the cube pass rate by grade.',
];

const greeting = (name: string): Msg => ({
  role: 'assistant',
  text: `Hi! I can answer questions about ${name} — pours, cube tests, NCRs, suppliers and traceability. Ask away.`,
});

export const Chatbot: React.FC = () => {
  const { project } = useProject();
  const pid = project.project_id;

  // Restore the running conversation from localStorage (24h TTL), else greet.
  const [messages, setMessages] = useState<Msg[]>(
    () => loadChat(pid) ?? [greeting(project.project_name)],
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const activePid = useRef(pid);

  // Re-load when switching to another project (the first load is the lazy init).
  useEffect(() => {
    if (activePid.current === pid) return;
    activePid.current = pid;
    setMessages(loadChat(pid) ?? [greeting(project.project_name)]);
  }, [pid, project.project_name]);

  // Persist on every change — survives navigation and refreshes the 24h window.
  useEffect(() => {
    saveChat(activePid.current, messages);
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    // Send only clean prior turns (role + text), capped — keeps the request
    // small and matches the backend ChatTurn shape (no charts / tool chips).
    const history: ChatTurn[] = messages.slice(-10).map((m) => ({ role: m.role, content: m.text }));
    setMessages((p) => [...p, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);
    try {
      const res = await chatApi.ask(pid, q, history);
      setMessages((p) => [
        ...p,
        { role: 'assistant', text: res.answer, tools: res.tools_used, chart: res.chart ?? undefined },
      ]);
    } catch (err) {
      setMessages((p) => [
        ...p,
        { role: 'assistant', text: getApiErrorMessage(err, 'Sorry — I could not answer that.') },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    clearChat(pid);
    setMessages([greeting(project.project_name)]);
  };

  return (
    <div className="qms-chatbot-container">
      <div className="qms-chatbot-main">
        <div className="qms-chat-header">
          <div className="qms-chat-title">
            <Bot className="qms-bot-icon" size={24} />
            <div>
              <h2>Project Analyst</h2>
              <p>Answers from this project&apos;s live quality data</p>
            </div>
          </div>
          <button className="qms-chat-clear" onClick={handleClear} disabled={loading} title="Clear chat">
            <Trash2 size={14} /> Clear chat
          </button>
        </div>

        <div className="qms-chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`qms-message qms-message--${msg.role}`}>
              <div className="qms-message-avatar">
                {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
              </div>
              <div className="qms-message-bubble">
                <div className="qms-msg-text">{msg.text}</div>
                {msg.chart && <ChatChart spec={msg.chart} />}
                {msg.tools && msg.tools.length > 0 && (
                  <div className="qms-msg-tools">
                    {msg.tools.map((t, j) => (
                      <span key={j} className="qms-tool-chip">{TOOL_LABEL[t] ?? t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="qms-message qms-message--assistant">
              <div className="qms-message-avatar"><Bot size={18} /></div>
              <div className="qms-message-bubble qms-message-bubble--thinking">Analysing…</div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="qms-chat-input-area">
          <div className="qms-input-box">
            <input
              type="text"
              placeholder="Ask about pours, lab results, suppliers or NCRs…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void send(input)}
              disabled={loading}
            />
            <button
              className="qms-send-btn"
              onClick={() => void send(input)}
              disabled={loading || !input.trim()}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="qms-chatbot-context">
        <h3 className="qms-context-title"><Sparkles size={16} /> Try asking</h3>
        <p className="qms-context-desc">
          The analyst reads this project&apos;s live data — it won&apos;t make up numbers.
        </p>
        {SUGGESTIONS.map((s, i) => (
          <button key={i} className="qms-suggestion" onClick={() => void send(s)} disabled={loading}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};
