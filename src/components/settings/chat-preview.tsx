"use client";

import { BookOpen, ArrowRight } from "lucide-react";

interface ChatPreviewProps {
  churchName: string;
  logoUrl?: string | null;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  darkMode?: boolean;
}

export function ChatPreview({
  churchName,
  logoUrl,
  primaryColor,
  accentColor,
  backgroundColor,
  textColor,
  darkMode,
}: ChatPreviewProps) {
  return (
    <div
      className="overflow-hidden rounded-xl border shadow-sm"
      style={{
        backgroundColor,
        color: textColor,
        width: 320,
        height: 440,
        fontSize: 11,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 border-b px-3 py-2.5"
        style={{ borderColor: `${textColor}15` }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={churchName}
            className="h-5 w-5 rounded object-cover"
          />
        ) : (
          <div
            className="flex h-5 w-5 items-center justify-center rounded"
            style={{ backgroundColor: primaryColor, color: backgroundColor }}
          >
            <BookOpen style={{ width: 10, height: 10 }} />
          </div>
        )}
        <span style={{ fontWeight: 600, fontSize: 12 }}>{churchName}</span>
      </div>

      {/* Messages area */}
      <div className="flex flex-1 flex-col gap-3 p-3" style={{ height: 340 }}>
        {/* Welcome */}
        <div className="flex flex-col items-center justify-center gap-1.5 py-4">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${primaryColor}18` }}
          >
            <BookOpen style={{ width: 14, height: 14, color: primaryColor }} />
          </div>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Ask a question</span>
          <span style={{ color: `${textColor}80`, fontSize: 10 }}>
            Get answers from the Bible and teachings
          </span>
        </div>

        {/* User message */}
        <div className="flex justify-end">
          <div
            className="rounded-2xl rounded-br-sm px-3 py-1.5"
            style={{ backgroundColor: primaryColor, color: backgroundColor, maxWidth: "75%" }}
          >
            What does the Bible say about forgiveness?
          </div>
        </div>

        {/* AI response */}
        <div className="flex justify-start">
          <div
            className="rounded-2xl rounded-bl-sm px-3 py-1.5"
            style={{
              backgroundColor: `${textColor}08`,
              border: `1px solid ${textColor}12`,
              maxWidth: "80%",
            }}
          >
            The Bible teaches that forgiveness is central to the Christian faith.
            In Ephesians 4:32, Paul writes...
            <div
              className="mt-1.5 rounded px-2 py-1"
              style={{
                backgroundColor: `${accentColor}15`,
                border: `1px solid ${accentColor}25`,
                fontSize: 10,
              }}
            >
              <span style={{ color: accentColor, fontWeight: 500 }}>
                Sunday Sermon — Feb 16
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t px-3 py-2" style={{ borderColor: `${textColor}15` }}>
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-1.5"
          style={{
            backgroundColor: `${textColor}06`,
            border: `1px solid ${textColor}12`,
          }}
        >
          <span style={{ color: `${textColor}50`, flex: 1 }}>
            What would you like to know?
          </span>
          <div
            className="flex h-5 w-5 items-center justify-center rounded"
            style={{ backgroundColor: primaryColor, color: backgroundColor }}
          >
            <ArrowRight style={{ width: 10, height: 10 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
