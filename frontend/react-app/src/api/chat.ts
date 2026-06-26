// Analyst-agent chat API — POST /projects/{id}/chat.
// See backend/app/routers/chatbot.py. The agent answers from the project's live
// data via read-only tools; tools_used lists which it consulted.

import { api } from './client';

export interface ChatAnswer {
  answer: string;
  tools_used: string[];
}

export const chatApi = {
  ask(projectId: number, question: string): Promise<ChatAnswer> {
    return api
      .post<ChatAnswer>(`/projects/${projectId}/chat`, { question })
      .then((r) => r.data);
  },
};
