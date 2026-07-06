"use client";

import AuthGuard from "./AuthGuard";
import Sidebar from "./Sidebar";
import ChatBot from "./ChatBot";

export default function Shell({ children }) {
  return (
    <AuthGuard>
      <Sidebar />
      <div className="pt-16 md:pt-0 md:pl-72">{children}</div>
      <ChatBot />
    </AuthGuard>
  );
}
