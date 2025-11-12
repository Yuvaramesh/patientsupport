import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatState } from "../types";

const genai = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function clinicalAgent(state: ChatState): Promise<{
  answer: string;
  followUpQuestions?: string[];
  severity: string;
}> {
  const prompt = `You are a clinical healthcare assistant. Help the patient with their medical query.

Patient Query: "${state.query}"
Chat History: ${JSON.stringify(state.chat_history.slice(-3))}

Provide:
1. Clear, empathetic response
2. General health information (not medical advice)
3. When to see a doctor
4. Suggest 2-3 follow-up questions if more info is needed

Format your response as:
RESPONSE: [your response]
FOLLOW_UP: [question1], [question2], [question3] or NONE
SEVERITY: [low/medium/high]`;

  const response = await model.generateContent(prompt);
  const text = response.response.text();

  const parseResponse = (text: string) => {
    const responseMatch = text.match(/RESPONSE:\s*([\s\S]*?)(?=FOLLOW_UP:|$)/);
    const followUpMatch = text.match(/FOLLOW_UP:\s*([\s\S]*?)(?=SEVERITY:|$)/);
    const severityMatch = text.match(/SEVERITY:\s*(\w+)/);

    const answer = responseMatch ? responseMatch[1].trim() : text;
    const followUpText = followUpMatch ? followUpMatch[1].trim() : "";
    const severity = severityMatch ? severityMatch[1].toLowerCase() : "medium";

    const followUpQuestions =
      followUpText && followUpText !== "NONE"
        ? followUpText.split(",").map((q) => q.trim())
        : undefined;

    return { answer, followUpQuestions, severity };
  };

  return parseResponse(text);
}

export async function emergencyProtocol(state: ChatState): Promise<{
  message: string;
  emergencyNumber: string;
  nearbyClinicLocations: string[];
}> {
  return {
    message:
      "EMERGENCY DETECTED. Please contact emergency services immediately or go to the nearest emergency room.",
    emergencyNumber: "911",
    nearbyClinicLocations: [
      "Please provide your location to find nearby emergency facilities.",
    ],
  };
}
