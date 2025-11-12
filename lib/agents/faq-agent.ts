import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatState } from "../types";

const genai = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" });

const FAQ_DATABASE = [
  {
    keywords: ["diabetes", "blood sugar"],
    answer:
      "Diabetes is a condition where blood glucose levels are too high...",
  },
  {
    keywords: ["blood pressure", "hypertension"],
    answer:
      "Blood pressure is the force of blood pushing against artery walls...",
  },
  {
    keywords: ["medication", "side effects"],
    answer: "Medications can have side effects. Always consult your doctor...",
  },
];

export async function faqAgent(state: ChatState): Promise<string> {
  // Check local FAQ database first
  const query = state.query.toLowerCase();
  const faqMatch = FAQ_DATABASE.find((faq) =>
    faq.keywords.some((keyword) => query.includes(keyword))
  );

  if (faqMatch) {
    return faqMatch.answer;
  }

  // Use Gemini for general knowledge questions
  const prompt = `You are a helpful health information assistant. Answer this general health question clearly and concisely.

Query: "${state.query}"

Important: This is general information only, not medical advice. Recommend consulting a healthcare provider for personal medical concerns.`;

  const response = await model.generateContent(prompt);
  return response.response.text();
}
