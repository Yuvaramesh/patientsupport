import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatState } from "../types";

const genai = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function supervisorAgent(state: ChatState): Promise<string> {
  const prompt = `You are a medical triage supervisor agent. Analyze the patient's query and determine which agent should handle it.

Available agents: clinical, genetic, generic_faq, emergency

Patient Query: "${state.query}"
Chat History: ${JSON.stringify(state.chat_history.slice(-3))}

Respond with ONLY one of these in lowercase: clinical, genetic, generic_faq, emergency

Rules:
- If query mentions emergency symptoms (chest pain, difficulty breathing, severe bleeding, loss of consciousness, etc.), respond with "emergency"
- If query is about genetic conditions, family genetic history, or hereditary diseases, respond with "genetic"
- If query asks general health questions, lifestyle, common ailments, respond with "clinical"
- If query is FAQ-like (how does medication work, what is diabetes, etc.), respond with "generic_faq"`;

  const response = await model.generateContent(prompt);
  const text = response.response.text().toLowerCase().trim();

  // Validate response
  const validAgents = ["clinical", "genetic", "generic_faq", "emergency"];
  return validAgents.includes(text) ? text : "clinical";
}

export async function shouldAskFollowUp(state: ChatState): Promise<boolean> {
  const prompt = `Based on this conversation:
Query: "${state.query}"
Answer: "${state.answer}"

Does the patient need to provide more information? Respond with "yes" or "no" only.`;

  const response = await model.generateContent(prompt);
  return response.response.text().toLowerCase().includes("yes");
}

export async function extractSeverity(state: ChatState): Promise<string> {
  const prompt = `Analyze the severity of the patient's medical condition based on their query and responses.

Query: "${state.query}"
Medical Context: ${JSON.stringify(state.chat_history.slice(-5))}

Respond with ONLY one: critical, high, medium, low`;

  const response = await model.generateContent(prompt);
  return response.response.text().toLowerCase().trim();
}
