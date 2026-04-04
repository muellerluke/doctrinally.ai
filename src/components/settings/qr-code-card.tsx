"use client";

import { useState, useEffect, useRef } from "react";
import { Download, QrCode, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface QrCodeCardProps {
  chatUrl: string;
}

export function QrCodeCard({ chatUrl }: QrCodeCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Generate QR code on client via API
    fetch(
      `/api/qr?url=${encodeURIComponent(chatUrl)}`
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data) => setQrDataUrl(data.dataUrl))
      .catch(() => {});
  }, [chatUrl]);

  function handleDownload() {
    if (!qrDataUrl) return;

    const link = document.createElement("a");
    link.download = "church-chat-qr.png";
    link.href = qrDataUrl;
    link.click();
  }

  function handleCopyUrl() {
    navigator.clipboard.writeText(chatUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <QrCode className="h-5 w-5" />
          QR Code
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* QR code image */}
          <div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-xl border bg-white p-3">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR code to church chat"
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <QrCode className="h-12 w-12 animate-pulse text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Info + actions */}
          <div className="flex flex-1 flex-col gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                Share this QR code with your congregation so they can access the
                AI chat directly from their phones. Print it in bulletins, display
                it on screens, or include it in announcements.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Links to
              </p>
              <p className="mt-0.5 truncate text-sm font-medium">{chatUrl}</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!qrDataUrl}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download PNG
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyUrl}>
                {copied ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy URL
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
