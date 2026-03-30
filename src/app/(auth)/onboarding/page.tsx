"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Globe } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { onboardingSchema } from "@/lib/validations/onboarding";
import { createChurch } from "@/lib/actions/onboarding";
import { slugify } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slugEdited && name) {
      setSlug(slugify(name));
    }
  }, [name, slugEdited]);

  function handleSlugChange(value: string) {
    setSlugEdited(true);
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .replace(/--+/g, "-")
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = onboardingSchema.safeParse({ name, slug });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await createChurch({ name, slug });

      if (result.error) {
        if (result.error.toLowerCase().includes("url")) {
          setErrors({ slug: result.error });
        } else {
          toast.error(result.error);
        }
        return;
      }

      toast.success("Church created!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="animate-fade-up stagger-1 shadow-xl shadow-primary/[0.04]">
      <CardHeader className="text-center">
        <CardTitle className="font-heading text-2xl">
          Set up your church
        </CardTitle>
        <CardDescription>
          Create your church to get started with Doctrinally.AI
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Church name</Label>
            <Input
              id="name"
              placeholder="Grace Community Church"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Church URL</Label>
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4 shrink-0" />
              <span className="shrink-0">
                <span className="font-medium text-foreground">
                  {slug || "yourchurch"}
                </span>
                .doctrinally.ai
              </span>
            </div>
            <Input
              id="slug"
              placeholder="grace-community"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              disabled={loading}
            />
            {errors.slug && (
              <p className="text-sm text-destructive">{errors.slug}</p>
            )}
          </div>
          <Button className="w-full" type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create church
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
