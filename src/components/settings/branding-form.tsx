"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sun, Moon, Lock } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChatPreview } from "@/components/settings/chat-preview";
import { updateChurchBranding } from "@/lib/actions/settings";

// Default doctrinally.ai branding
const DEFAULTS = {
  light: {
    primaryColor: "#4A2C2A",
    accentColor: "#9A7B4F",
    backgroundColor: "#F7F4F0",
    textColor: "#2C1810",
  },
  dark: {
    primaryColor: "#D4A574",
    accentColor: "#9A7B4F",
    backgroundColor: "#1A1412",
    textColor: "#E8E0D8",
  },
};

interface BrandingFormProps {
  church: {
    name: string;
    logoUrl: string | null;
    primaryColor: string | null;
    accentColor: string | null;
    backgroundColor: string | null;
    textColor: string | null;
    darkPrimaryColor: string | null;
    darkAccentColor: string | null;
    darkBackgroundColor: string | null;
    darkTextColor: string | null;
    darkLogoUrl: string | null;
    welcomeMessage: string | null;
  };
  isEnterprise: boolean;
}

export function BrandingForm({ church, isEnterprise }: BrandingFormProps) {
  const router = useRouter();
  const [previewDark, setPreviewDark] = useState(false);
  const [saving, setSaving] = useState(false);

  // Light mode colors
  const [primaryColor, setPrimaryColor] = useState(
    church.primaryColor || DEFAULTS.light.primaryColor
  );
  const [accentColor, setAccentColor] = useState(
    church.accentColor || DEFAULTS.light.accentColor
  );
  const [bgColor, setBgColor] = useState(
    church.backgroundColor || DEFAULTS.light.backgroundColor
  );
  const [txtColor, setTxtColor] = useState(
    church.textColor || DEFAULTS.light.textColor
  );

  // Dark mode colors
  const [darkPrimary, setDarkPrimary] = useState(
    church.darkPrimaryColor || DEFAULTS.dark.primaryColor
  );
  const [darkAccent, setDarkAccent] = useState(
    church.darkAccentColor || DEFAULTS.dark.accentColor
  );
  const [darkBg, setDarkBg] = useState(
    church.darkBackgroundColor || DEFAULTS.dark.backgroundColor
  );
  const [darkTxt, setDarkTxt] = useState(
    church.darkTextColor || DEFAULTS.dark.textColor
  );

  const previewColors = previewDark
    ? {
        primaryColor: darkPrimary,
        accentColor: darkAccent,
        backgroundColor: darkBg,
        textColor: darkTxt,
      }
    : {
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
        darkPrimaryColor: darkPrimary,
        darkAccentColor: darkAccent,
        darkBackgroundColor: darkBg,
        darkTextColor: darkTxt,
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
    <div className="grid gap-6 lg:grid-cols-[1fr,auto]">
      {/* Color controls */}
      <div className="space-y-6">
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
            <Sun className="h-4 w-4" />
            <CardTitle className="text-lg">Light Mode</CardTitle>
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

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Moon className="h-4 w-4" />
            <CardTitle className="text-lg">Dark Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField
                label="Primary"
                value={darkPrimary}
                onChange={setDarkPrimary}
                disabled={!isEnterprise}
              />
              <ColorField
                label="Accent"
                value={darkAccent}
                onChange={setDarkAccent}
                disabled={!isEnterprise}
              />
              <ColorField
                label="Background"
                value={darkBg}
                onChange={setDarkBg}
                disabled={!isEnterprise}
              />
              <ColorField
                label="Text"
                value={darkTxt}
                onChange={setDarkTxt}
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Preview</p>
          <div className="flex rounded-lg border p-0.5">
            <button
              onClick={() => setPreviewDark(false)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                !previewDark
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="inline h-3 w-3 mr-1" />
              Light
            </button>
            <button
              onClick={() => setPreviewDark(true)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                previewDark
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="inline h-3 w-3 mr-1" />
              Dark
            </button>
          </div>
        </div>
        <ChatPreview
          churchName={church.name}
          logoUrl={previewDark ? church.darkLogoUrl || church.logoUrl : church.logoUrl}
          darkMode={previewDark}
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
