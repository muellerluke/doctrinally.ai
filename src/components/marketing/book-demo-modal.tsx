"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, CalendarCheck2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  BOOKING_TZ,
  generateSlots,
  formatSlotLabel,
  formatSlotTime,
  isBookableDay,
  isSameCtDay,
} from "@/lib/demo-slots";
import {
  createDemoBooking,
  getTakenSlots,
} from "@/lib/actions/demo-bookings";

interface BookDemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LOOKAHEAD_DAYS = 28;

export function BookDemoModal({ open, onOpenChange }: BookDemoModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Date | null>(null);
  const [takenSlots, setTakenSlots] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch booked slots whenever the modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingSlots(true);
    const now = new Date();
    const end = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
    getTakenSlots(now.toISOString(), end.toISOString())
      .then((iso) => {
        if (!cancelled) setTakenSlots(new Set(iso));
      })
      .catch(() => {
        // Non-fatal: worst case, the server action re-validates on submit.
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Reset when modal closes
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setSelectedDate(undefined);
      setSelectedSlot(null);
      setEmail("");
      setAgreed(false);
      setError(null);
      setConfirmed(null);
    }, 250);
    return () => clearTimeout(t);
  }, [open]);

  const allSlots = useMemo(() => {
    const now = new Date();
    return generateSlots(now, LOOKAHEAD_DAYS);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const daySlots = useMemo(() => {
    if (!selectedDate) return [];
    return allSlots.filter((s) => isSameCtDay(s, selectedDate));
  }, [allSlots, selectedDate]);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfLookahead = new Date(
    startOfToday.getTime() + (LOOKAHEAD_DAYS + 1) * 24 * 60 * 60 * 1000
  );

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit =
    !!selectedSlot && emailLooksValid && agreed && !submitting && !confirmed;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createDemoBooking({
        email: email.trim(),
        slotStart: selectedSlot.toISOString(),
        agreedToTerms: true,
      });
      if ("error" in result && result.error) {
        const message = result.error;
        setError(message);
        if (message.toLowerCase().includes("booked")) {
          setTakenSlots((prev) => new Set(prev).add(selectedSlot.toISOString()));
          setSelectedSlot(null);
        }
        return;
      }
      setConfirmed(selectedSlot);
      toast.success("Demo booked — we'll be in touch!");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            Book a demo
          </DialogTitle>
          <DialogDescription>
            Pick a time that works — we&apos;ll show you how Doctrinally.AI
            works for your church. All times in Central ({BOOKING_TZ.replace("America/", "")}).
          </DialogDescription>
        </DialogHeader>

        {confirmed ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-10 text-center">
            <CalendarCheck2 className="h-9 w-9 text-emerald-600" />
            <h3 className="font-heading text-lg">You&apos;re booked!</h3>
            <p className="text-sm text-muted-foreground">
              We&apos;ll see you on
              <br />
              <strong className="text-foreground">
                {formatSlotLabel(confirmed)}
              </strong>
              <br />
              Look out for a follow-up at{" "}
              <span className="text-foreground">{email}</span>.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
              <div className="flex justify-center sm:block">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    setSelectedDate(d);
                    setSelectedSlot(null);
                  }}
                  disabled={(d) => {
                    if (d < startOfToday) return true;
                    if (d > endOfLookahead) return true;
                    return !isBookableDay(d.getDay());
                  }}
                  fromDate={startOfToday}
                  toDate={endOfLookahead}
                />
              </div>

              <div className="flex min-h-[200px] flex-col gap-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Available times
                </Label>
                {!selectedDate ? (
                  <p className="text-sm text-muted-foreground">
                    Select a date — only Mondays and Fridays (afternoons) and
                    weekends (8 AM – 10 PM CT) are available.
                  </p>
                ) : loadingSlots ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading slots…
                  </div>
                ) : daySlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No remaining slots on this day.
                  </p>
                ) : (
                  <div className="grid max-h-48 grid-cols-3 gap-1.5 overflow-y-auto pr-1">
                    {daySlots.map((slot) => {
                      const iso = slot.toISOString();
                      const taken = takenSlots.has(iso);
                      const isSelected =
                        !!selectedSlot &&
                        slot.getTime() === selectedSlot.getTime();
                      return (
                        <button
                          key={iso}
                          type="button"
                          disabled={taken}
                          onClick={() => setSelectedSlot(slot)}
                          className={
                            "rounded-md border px-2 py-1.5 text-xs transition-colors " +
                            (taken
                              ? "cursor-not-allowed border-dashed bg-muted text-muted-foreground line-through"
                              : isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary/40 hover:bg-muted")
                          }
                        >
                          {formatSlotTime(slot)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="demo-email">Email</Label>
              <Input
                id="demo-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourchurch.org"
                required
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5"
              />
              <span>
                I agree to the{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  className="text-primary underline underline-offset-2"
                >
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-primary underline underline-offset-2"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Booking…
                </>
              ) : selectedSlot ? (
                <>Book {formatSlotLabel(selectedSlot)}</>
              ) : (
                <>Pick a time to continue</>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
