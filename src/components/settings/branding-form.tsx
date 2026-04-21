"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChatPreview } from "@/components/settings/chat-preview";
import { updateChurchBranding } from "@/lib/actions/settings";

const FONT_OPTIONS = [
  { value: "source-serif", label: "Source Serif 4", css: "'Source Serif 4', serif" },
  { value: "playfair", label: "Playfair Display", css: "'Playfair Display', serif" },
  { value: "inter", label: "Inter", css: "'Inter', sans-serif" },
  { value: "lora", label: "Lora", css: "'Lora', serif" },
  { value: "merriweather", label: "Merriweather", css: "'Merriweather', serif" },
  { value: "dm-sans", label: "DM Sans", css: "'DM Sans', sans-serif" },
  { value: "nunito", label: "Nunito", css: "'Nunito', sans-serif" },
  { value: "eb-garamond", label: "EB Garamond", css: "'EB Garamond', serif" },
] as const;

// Google Fonts that aren't already bundled in the app
const GOOGLE_FONTS_URL_MAP: Record<string, string> = {
  inter: "Inter:wght@400;500;600;700",
  lora: "Lora:wght@400;500;600;700",
  merriweather: "Merriweather:wght@400;700",
  "dm-sans": "DM+Sans:wght@400;500;600;700",
  nunito: "Nunito:wght@400;500;600;700",
  "eb-garamond": "EB+Garamond:wght@400;500;600;700",
};

const LOGO_HEIGHT_OPTIONS = [
  { value: "20", label: "20px — Compact" },
  { value: "24", label: "24px — Small" },
  { value: "32", label: "32px — Default" },
  { value: "40", label: "40px — Medium" },
  { value: "48", label: "48px — Large" },
  { value: "56", label: "56px — Extra Large" },
] as const;

// Default doctrinally.ai branding — single theme. The chat always renders
// in these (or the church's override) regardless of the viewer's OS
// light/dark preference.
const DEFAULTS = {
  primaryColor: "#4A2C2A",
  accentColor: "#9A7B4F",
  backgroundColor: "#F7F4F0",
  textColor: "#2C1810",
};

interface BrandingFormProps {
  church: {
    name: string;
    logoUrl: string | null;
    primaryColor: string | null;
    accentColor: string | null;
    backgroundColor: string | null;
    textColor: string | null;
    welcomeMessage: string | null;
    logoHeight: string | null;
    fontFamily: string | null;
  };
  isEnterprise: boolean;
}

export function BrandingForm({ church, isEnterprise }: BrandingFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [primaryColor, setPrimaryColor] = useState(
    church.primaryColor || DEFAULTS.primaryColor
  );
  const [accentColor, setAccentColor] = useState(
    church.accentColor || DEFAULTS.accentColor
  );
  const [bgColor, setBgColor] = useState(
    church.backgroundColor || DEFAULTS.backgroundColor
  );
  const [txtColor, setTxtColor] = useState(
    church.textColor || DEFAULTS.textColor
  );

  // Typography & layout
  const [logoHeight, setLogoHeight] = useState(church.logoHeight || "32");
  const [fontFamily, setFontFamily] = useState(church.fontFamily || "source-serif");

  const selectedFont = FONT_OPTIONS.find((f) => f.value === fontFamily) || FONT_OPTIONS[0];

  // Dynamically load Google Font for preview
  useEffect(() => {
    const googleParam = GOOGLE_FONTS_URL_MAP[fontFamily];
    if (!googleParam) return;

    const linkId = `google-font-preview-${fontFamily}`;
    if (document.getElementById(linkId)) return;

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${googleParam}&display=swap`;
    document.head.appendChild(link);
  }, [fontFamily]);

  const previewColors = {
    primaryColor,
    accentColor,
    backgroundColor: bgColor,
    textColor: txtColor,
  };

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateChurchBranding({
        primaryColor,
        accentColor,
        backgroundColor: bgColor,
        textColor: txtColor,
        logoHeight,
        fontFamily,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Branding saved");
        router.refresh();
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function ColorField({
    label,
    value,
    onChange,
    disabled,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
  }) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{label}</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="h-8 w-8 cursor-pointer rounded border disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="h-8 font-mono text-xs"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-6 lg:flex-row">
      {/* Color controls */}
      <div className="min-w-0 flex-1 space-y-6">
        {!isEnterprise && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.03] p-4">
            <Lock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">
                Custom branding requires Enterprise
              </p>
              <p className="text-xs text-muted-foreground">
                Upgrade to customize your church&apos;s colors, logo, and theme.
              </p>
            </div>
          </div>
        )}

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
            <CardTitle className="text-lg">Typography & Layout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Font Family</Label>
                <Select
                  value={fontFamily}
                  onValueChange={(v) => v && setFontFamily(v)}
                  disabled={!isEnterprise}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((font) => (
                      <SelectItem
                        key={font.value}
                        value={font.value}
                        className="text-xs"
                        style={{ fontFamily: font.css }}
                      >
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Applied to the member-facing chat experience
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Logo Height</Label>
                <Select
                  value={logoHeight}
                  onValueChange={(v) => v && setLogoHeight(v)}
                  disabled={!isEnterprise}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOGO_HEIGHT_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-xs"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Controls the logo size in the chat header
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Colors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField
                label="Primary"
                value={primaryColor}
                onChange={setPrimaryColor}
                disabled={!isEnterprise}
              />
              <ColorField
                label="Accent"
                value={accentColor}
                onChange={setAccentColor}
                disabled={!isEnterprise}
              />
              <ColorField
                label="Background"
                value={bgColor}
                onChange={setBgColor}
                disabled={!isEnterprise}
              />
              <ColorField
                label="Text"
                value={txtColor}
                onChange={setTxtColor}
                disabled={!isEnterprise}
              />
            </div>
          </CardContent>
        </Card>

        {isEnterprise && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save branding
            </Button>
          </div>
        )}
      </div>

      {/* Live preview */}
      <div className="shrink-0 space-y-3">
        <p className="text-sm font-medium">Preview</p>
        <ChatPreview
          churchName={church.name}
          logoUrl={church.logoUrl}
          logoHeight={parseInt(logoHeight, 10)}
          fontFamily={selectedFont.css}
          {...previewColors}
        />
        {!isEnterprise && (
          <Badge
            variant="outline"
            className="w-full justify-center border-primary/20 text-xs text-muted-foreground"
          >
            Default Doctrinally.AI branding
          </Badge>
        )}
      </div>
    </div>
  );
}
