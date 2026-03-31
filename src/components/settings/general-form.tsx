"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateChurchInfo, updateChurchLogo } from "@/lib/actions/settings";

interface GeneralFormProps {
  church: {
    name: string;
    description: string | null;
    phone: string | null;
    address: string | null;
    logoUrl: string | null;
  };
}

export function GeneralForm({ church }: GeneralFormProps) {
  const router = useRouter();
  const [name, setName] = useState(church.name);
  const [description, setDescription] = useState(church.description ?? "");
  const [phone, setPhone] = useState(church.phone ?? "");
  const [address, setAddress] = useState(church.address ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateChurchInfo({
        name,
        description: description || null,
        phone: phone || null,
        address: address || null,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Settings saved");
        router.refresh();
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Church Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="church-name">Church name</Label>
            <Input
              id="church-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your church..."
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, City, State"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Logo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            {church.logoUrl ? (
              <img
                src={church.logoUrl}
                alt="Church logo"
                className="h-20 w-20 rounded-xl object-cover border"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed text-muted-foreground">
                <Upload className="h-6 w-6" />
              </div>
            )}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Upload a logo for your church. Recommended size: 256x256px.
              </p>
              <p className="text-xs text-muted-foreground">
                Logo upload via Vercel Blob will be available in Phase 5.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
