"use client";

import { useState } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { CommunicationsDashboard } from "@/components/communications-dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [patientId, setPatientId] = useState("");
  const [email, setEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inputEmail, setInputEmail] = useState("");

  const handleLogin = () => {
    if (inputEmail.trim()) {
      setEmail(inputEmail);
      setPatientId(inputEmail.replace(/[^a-zA-Z0-9]/g, ""));
      setIsLoggedIn(true);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Harley Health
          </h1>
          <p className="text-gray-600 mb-6">
            Your intelligent healthcare portal
          </p>

          <div className="space-y-4">
            <input
              type="email"
              value={inputEmail}
              onChange={(e) => setInputEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
              onKeyPress={(e) => e.key === "Enter" && handleLogin()}
            />
            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              Enter Portal
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Demo mode - Enter any email to continue
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Welcome, {email}</h1>
          <p className="text-gray-600 mt-2">
            Your healthcare assistant is ready to help
          </p>
        </div>

        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="chat">Chat Assistant</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            <ChatInterface patientId={patientId} email={email} />
          </TabsContent>

          <TabsContent value="communications" className="space-y-4">
            <CommunicationsDashboard patientId={patientId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
