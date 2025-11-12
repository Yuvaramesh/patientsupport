import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatState } from "../types";

const genai = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function geneticAgent(state: ChatState): Promise<{
  answer: string;
  shouldEscalateToProfessional: boolean;
  recommendedSpecialist: string;
}> {
  const prompt = `You are a genetic counseling information assistant. Help with genetic and hereditary health questions.

Patient Query: "${state.query}"
Chat History: ${JSON.stringify(state.chat_history.slice(-3))}

Provide:
1. General genetic information
2. Family history importance
3. When to consult a genetic counselor
4. Suggest if professional consultation is needed

Format:
RESPONSE: [your response]
ESCALATE: [yes/no]
SPECIALIST: [genetic counselor/genetic specialist/none]`;

  const response = await model.generateContent(prompt);
  const text = response.response.text();

  const escalateMatch = text.match(/ESCALATE:\s*(\w+)/i);
  const specialistMatch = text.match(/SPECIALIST:\s*([^\n]+)/i);

  return {
    answer: text,
    shouldEscalateToProfessional:
      escalateMatch && escalateMatch[1].toLowerCase() === "yes",
    recommendedSpecialist: specialistMatch
      ? specialistMatch[1].trim()
      : "genetic counselor",
  };
}
