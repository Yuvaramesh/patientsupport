// lib/agents/personal-agent.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatState } from "../types";
import { getCollection } from "../mongodb";
import type { Communication } from "../types";
import { retryWithBackoff } from "../retry-utility";

const genai = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function personalAgent(state: ChatState): Promise<{
  answer: string;
  needsEmail: boolean;
  conversationHistory?: Communication[];
}> {
  // Check if user is asking for conversation history/summary
  const query = state.query.toLowerCase();
  const isHistoryRequest =
    query.includes("previous") ||
    query.includes("past") ||
    query.includes("history") ||
    query.includes("conversation") ||
    query.includes("summary") ||
    query.includes("earlier") ||
    query.includes("before");

  if (isHistoryRequest) {
    // Check if we have user email
    if (!state.user_email || !state.patientId) {
      return {
        answer:
          "To retrieve your conversation history, I need your email address. Please provide your registered email address.",
        needsEmail: true,
      };
    }

    // Fetch conversation history from database
    try {
      const commsCollection = await getCollection<Communication>(
        "communications"
      );
      const conversationHistory = await commsCollection
        .find({ patientId: state.patientId })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

      if (conversationHistory.length === 0) {
        return {
          answer:
            "I couldn't find any previous conversations for your account. This might be your first interaction with our healthcare assistant.",
          needsEmail: false,
          conversationHistory: [],
        };
      }

      // Generate summary using Gemini with retry
      const historyText = conversationHistory
        .map((comm, idx) => {
          const date = new Date(comm.createdAt).toLocaleDateString();
          return `${idx + 1}. [${date}] ${comm.type.toUpperCase()}\nQ: ${
            comm.question
          }\nA: ${comm.answer}\n`;
        })
        .join("\n");

      const summaryPrompt = `You are a healthcare assistant. Generate a concise summary of the patient's conversation history.

Conversation History:
${historyText}

Provide:
1. A brief overview of their main health concerns
2. Topics discussed
3. Any follow-ups or recommendations given
4. Number of interactions

Keep the summary clear, empathetic, and organized.`;

      try {
        const response = await retryWithBackoff(
          async () => {
            return await model.generateContent(summaryPrompt);
          },
          3,
          1000
        );

        const summary = response.response.text();

        return {
          answer: `Here's a summary of your conversation history:\n\n${summary}\n\n---\n\nYou have ${conversationHistory.length} recorded interactions. Would you like details about any specific conversation?`,
          needsEmail: false,
          conversationHistory: conversationHistory,
        };
      } catch (error) {
        console.error("Error generating summary:", error);

        // Fallback: Return basic summary without AI
        const basicSummary = conversationHistory
          .slice(0, 5)
          .map((comm, idx) => {
            const date = new Date(comm.createdAt).toLocaleDateString();
            return `${
              idx + 1
            }. **${date}** - ${comm.type.toUpperCase()}\n   Q: ${comm.question.substring(
              0,
              100
            )}${comm.question.length > 100 ? "..." : ""}`;
          })
          .join("\n\n");

        return {
          answer: `Here are your recent conversations (${conversationHistory.length} total):\n\n${basicSummary}\n\n---\n\nI'm experiencing some technical difficulties generating a detailed summary. The data above shows your most recent interactions.`,
          needsEmail: false,
          conversationHistory: conversationHistory,
        };
      }
    } catch (error) {
      console.error("Error fetching conversation history:", error);
      return {
        answer:
          "I encountered an error while retrieving your conversation history. Please try again or contact support if the issue persists.",
        needsEmail: false,
      };
    }
  }

  // Handle other personal queries
  const prompt = `You are a personal healthcare assistant. Help the patient with their personal health-related query.

Patient Query: "${state.query}"
Chat History: ${JSON.stringify(state.chat_history.slice(-3))}

Provide a helpful, personalized response. If the query is about:
- Personal health records: Explain what information they can access
- Account information: Guide them on how to manage their profile
- Previous conversations: Ask for their email if not provided
- General personal assistance: Provide relevant help

Keep the response warm, personal, and helpful.`;

  try {
    const response = await retryWithBackoff(
      async () => {
        return await model.generateContent(prompt);
      },
      3,
      1000
    );

    return {
      answer: response.response.text(),
      needsEmail: false,
    };
  } catch (error) {
    console.error("Personal agent error after retries:", error);

    return {
      answer:
        "I'm currently experiencing technical difficulties. For personal account assistance, please try again in a few moments or contact our support team.",
      needsEmail: false,
    };
  }
}
