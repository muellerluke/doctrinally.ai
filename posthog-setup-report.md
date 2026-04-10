<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into Doctrinally.AI. The integration covers client-side initialization via `instrumentation-client.ts` (Next.js 15.3+ approach), a singleton server-side PostHog client, a reverse proxy rewrite in `next.config.ts` to avoid ad-blockers, environment variables in `.env.local`, and 14 instrumented events spread across 9 files. User identification is wired into every auth flow — admin sign-in/sign-up, and member sign-in/sign-up via the chat modal. PostHog's `capture_exceptions: true` flag enables automatic error tracking globally.

| Event | Description | File |
|---|---|---|
| `sign_up` | Admin/pastor creates a new account | `src/app/(auth)/sign-up/page.tsx` |
| `sign_in` | Admin/pastor signs in | `src/app/(auth)/sign-in/page.tsx` |
| `church_created` | A new church is created during onboarding | `src/app/(auth)/onboarding/page.tsx` |
| `checkout_started` | User initiates Stripe checkout after selecting a plan | `src/app/(auth)/onboarding/page.tsx` |
| `subscription_activated` | Stripe webhook — subscription becomes active after checkout | `src/app/api/webhooks/stripe/route.ts` |
| `subscription_canceled` | Stripe webhook — subscription is canceled | `src/app/api/webhooks/stripe/route.ts` |
| `payment_failed` | Stripe webhook — invoice payment fails | `src/app/api/webhooks/stripe/route.ts` |
| `chat_message_sent` | A user sends a chat message (server-side, all users incl. anonymous) | `src/app/api/chat/route.ts` |
| `document_uploaded` | A file (PDF, Word, or video) upload completes and is queued | `src/app/api/documents/upload/route.ts` |
| `youtube_video_added` | Admin adds a YouTube video to the document library | `src/components/documents/youtube-upload-dialog.tsx` |
| `billing_portal_opened` | Admin/owner opens the Stripe billing portal | `src/app/(admin)/billing/billing-portal-button.tsx` |
| `contact_form_submitted` | A visitor submits the marketing contact form | `src/components/marketing/contact-form.tsx` |
| `member_signed_in` | A church member signs in via the chat auth modal | `src/components/chat/member-auth-modal.tsx` |
| `member_signed_up` | A church member creates an account via the chat auth modal | `src/components/chat/member-auth-modal.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/376927/dashboard/1453247
- **Onboarding conversion funnel** (sign_up → church_created → checkout_started → subscription_activated): https://us.posthog.com/project/376927/insights/jsGh2UX3
- **Daily chat messages**: https://us.posthog.com/project/376927/insights/puPZZYNE
- **Subscription activations vs cancellations** (weekly churn signal): https://us.posthog.com/project/376927/insights/lZ71IsEP
- **Content uploads per day** (file uploads + YouTube videos): https://us.posthog.com/project/376927/insights/nwWSOq9R
- **New sign-ups over time** (admin + member sign-ups): https://us.posthog.com/project/376927/insights/rakswEoH

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
