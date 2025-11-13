// app/api/chat/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import {
  supervisorAgent,
  extractSeverity,
  clinicalAgent,
  emergencyProtocol,
  personalAgent,
  faqAgent,
} from "@/lib/agents";
import {
  sendCommunicationEmail,
  sendEmergencyAlert,
} from "@/lib/email-service";
import type { ChatState, Communication, ClinicalNote } from "@/lib/types";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const { patientId, email, query, chatHistory } = await request.json();

    if (!patientId || !query) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Build initial state
    const state: ChatState = {
      patientId,
      query,
      chat_history: chatHistory || [],
      user_email: email,
    };

    // Step 1: Supervisor routes the query
    const agentType = await supervisorAgent(state);
    state.agent_type = agentType;

    // Step 2: Extract severity
    const severity = await extractSeverity(state);
    state.severity = severity;

    let response: any = {};
    const commsCollection = await getCollection<Communication>(
      "communications"
    );

    // Step 3: Route to appropriate agent
    if (agentType === "emergency") {
      const emergency = await emergencyProtocol(state);
      response = emergency;

      // Send emergency alert email
      if (email) {
        await sendEmergencyAlert(
          email,
          "Your health query has been flagged as an emergency. Please seek immediate medical attention."
        );
      }

      // Create communication record
      await commsCollection.insertOne({
        patientId,
        type: "emergency",
        question: query,
        answer: emergency.message,
        severity: "critical",
        status: "completed",
        createdAt: new Date(),
        updatedAt: new Date(),
        emailSent: true,
      } as any);
    } else if (agentType === "clinical") {
      const clinical = await clinicalAgent(state);
      response = clinical;

      // Save clinical note
      const clinicalCollection = await getCollection<ClinicalNote>(
        "clinical_notes"
      );
      await clinicalCollection.insertOne({
        patientId,
        questionnaireResponses: { query },
        summary: clinical.answer,
        severity: clinical.severity,
        recommendedAction: "Follow up with doctor if symptoms persist",
        createdAt: new Date(),
      } as any);

      // Create communication record
      const commId = new ObjectId();
      await commsCollection.insertOne({
        _id: commId,
        patientId,
        type: "clinical",
        question: query,
        answer: clinical.answer,
        severity: clinical.severity,
        status: "completed",
        createdAt: new Date(),
        updatedAt: new Date(),
        emailSent: false,
      } as any);

      // Send email if severity is high
      if (clinical.severity === "high" && email) {
        await sendCommunicationEmail({
          to: email,
          subject: "Clinical Response - Harley Health Portal",
          htmlContent: clinical.answer,
          questions: [{ q: query, a: clinical.answer }],
        });
        await commsCollection.updateOne(
          { _id: commId },
          { $set: { emailSent: true } }
        );
      }
    } else if (agentType === "personal") {
      const personal = await personalAgent(state);
      response = personal;

      await commsCollection.insertOne({
        patientId,
        type: "personal",
        question: query,
        answer: personal.answer,
        status: "completed",
        createdAt: new Date(),
        updatedAt: new Date(),
        emailSent: false,
      } as any);
    } else {
      // generic_faq
      const faqAnswer = await faqAgent(state);
      response = { answer: faqAnswer };

      await commsCollection.insertOne({
        patientId,
        type: "generic",
        question: query,
        answer: faqAnswer,
        status: "completed",
        createdAt: new Date(),
        updatedAt: new Date(),
        emailSent: false,
      } as any);
    }

    return NextResponse.json({
      success: true,
      agentType,
      severity,
      response,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat" },
      { status: 500 }
    );
  }
}
