# Doctrinally.AI

Doctrinally.AI is an AI-powered chat platform for churches. 
It allows church members to ask questions and get answers from the Bible as well as from the church's specific sermons, devotions, documents, etc.

## Tech Stack

- Next.js
- Tailwind CSS
- Shadcn UI (use as often as possible)
- NextAuth
- Drizzle ORM
- Postgres (with vector extension)
- Stripe
- Platejs (rich text editor)
- Trigger.dev (long running tasks)
- Vercel Blobs (for storing files)
- Vercel AI SDK (for AI-powered chat)
- Vercel Hosting

## Features

### AI-powered chat

The AI-powered chat should use agentic retrieval augmented with the church's specific sermons, devotions, documents, etc.
It should use both keyword and semantic search to retrieve the most relevant information.
The AI should respond using the found information and include relevant citations. 
Citations should be formatted in such a way that custom elements can be used to display the citation.

Examples:
- YouTube video citations should display the video in an iframe.
- Uploaded videos should display the video in a video player.
- Custom documents should display a preview of the document as a thumbnail that links to the document.
- Bible passages should contain a preview of the verse, but when clicked, should open the Bible passage in a new tab (for now use Bible Gateway).

### Document upload

Admins/pastors should be able to upload the following documents:
- YouTube videos (as links)
- Video file
- PDF/Word documents

Additionally, admins/pastors should have the ability to construct new documents using the Platejs rich text editor.
These documents should be stored as markdown.
Admins/pastors should also be able to add useful metadata to content where appropriate, such as title, speaker/author, date, description, and tags.

All documents will have to be chunked and indexed for retrieval.

### Document and video processing

All uploaded or created content should be processed asynchronously after it is submitted.
The processing pipeline should prepare each content type for retrieval, citation, preview, and playback where applicable.

Processing expectations by content type:
- YouTube videos should store the source URL and metadata, pull transcript/captions when available, and create timestamp-aware chunks for retrieval and citations
- Uploaded video files should be stored in blob storage, generate a playable asset and thumbnail if needed, extract audio, generate a transcript, and create timestamp-aware chunks for retrieval and citations
- PDF and Word documents should extract text, preserve page or section references when possible, generate document previews/thumbnails, and create chunks that can be cited back to the original source
- Documents created in Platejs should be stored as markdown and chunked by heading, section, or other logical boundaries

The system should track clear processing states such as draft, uploaded, queued, processing, indexed, and failed.
Admins/pastors should be able to see when a document is still processing, when it is ready for chat retrieval, and when it has failed and needs to be retried or reprocessed.
If a document cannot be processed successfully, the system should preserve the original upload and show a useful error message rather than failing silently.

### Chat history

Users should be able to login in order to save their chat history and view it later.
It should NOT be required for a user to login to use the chat.
In fact, many churches will just have a QR code that should link users to the chat for their specific church.

### Analytics

Admins/pastors should be able to view analytics for their church.
This includes:
- Number of questions asked per day, week, month, year
- Number of document uploads per day, week, month, year
- Number of visitors per day, week, month, year
- Number of questions without answers/citations per day, week, month, year
- Most common topics per day, week, month, year

### Subscription

Admins/pastors should have to subscribe in order to fully activate a church and upload documents.
The subscription should be per church and should be managed through Stripe.

For now, there will be two subscription tiers:
- Standard: $49/month
- Enterprise: $99/month

#### Standard Subscription

- Use a subdomain of my doctrinally.ai domain (example: mychurch.doctrinally.ai)
- Up to 25 document uploads per month
- 500 questions per month
- use the doctrinally.ai logo and branding

#### Enterprise Subscription

- Use the church's own domain (example: ai.mychurch.com)
- use the church's own logo and branding
- 100 document uploads per month
- 2000 questions per month

#### Overage Pricing
The current usage and monthly limits should be shown in the side navigation for admins/pastors.

- $0.50 per document upload over the limit 
- $0.25 per question over the limit

### Auth

The auth should be handled by NextAuth and should initially just support email and password authentication.
There should be three roles for each user/church relationship:
- member
- admin
- owner

Users and churches should have a many-to-many relationship. 
Only owners can manage billing and invite other users to the church.

If a user forgets their password, they should be able to reset it via email with a link to the reset password page.
The reset password page should be a simple reset password page with a form for new password.
It should also have a link to the sign in page.

### Billing

Billing should be handled through Stripe. 
Simply link to the Stripe dashboard from the billing page.
Only owners can manage billing.

### Church Settings

Admins/pastors should be able to manage their church's settings.
This should include core church information such as the church name, description, contact information, logo, and other presentation-related settings.
It should also include domain configuration, showing the doctrinally.ai subdomain for Standard churches and custom domain settings for Enterprise churches.
Standard churches should use doctrinally.ai branding in the public member-facing experience, while Enterprise churches should be able to fully customize public branding and domain settings.
The settings experience should clearly communicate which options are available on the current subscription tier and which require Enterprise.
Admins should be able to manage general church settings, while owner-only actions such as billing-related access should remain restricted to owners.

#### Domain and Routing Behavior

When a user visits the root doctrinally.ai domain (or localhost:3000 in development), they should see the marketing landing page.
When a user visits a subdomain of doctrinally.ai (e.g. mychurch.doctrinally.ai) or a custom domain (e.g. ai.myredeemer.com), they should be taken directly to the church's chat experience, branded to that specific church.
There should be no landing page on subdomains or custom domains — the chat is the primary experience for church members.

#### Branding Preview and Theme Support

When admins/pastors configure colors and branding in the settings, the settings page should show a live preview of what the member-facing chat experience will look like with those colors.
The branding settings should support both light mode and dark mode configurations, and the preview should allow toggling between them.
Enterprise churches should be able to customize primary color, accent color, background color, text color, and logo for both light and dark themes.
Standard churches should see a preview of the default doctrinally.ai branding with a clear indicator that custom branding requires the Enterprise plan.

### User Management

Owners should be able to manage users for their church.
They should be able to invite users via email, assign roles, change roles, resend invitations, and remove users from the church.
The user management experience should show current members, pending invitations, user roles, and invitation status in a clear management interface.
Admins may be able to view church members, but only owners should be able to make membership and role changes.

## Pages

### Home

The home landing page should be a simple landing page with a call to action for admins/pastors to subscribe.
This single marketing page should contain all the relevant marketing information:
- How it works
- Features
- Pricing
- Testimonials
- FAQ
- Contact

### Sign In - Admin/Pastor

The sign in page should be very simple with a form for email and password (eventually adding Google SSO).
It should also have a link to the forgot password page.
It should also have a link to the sign up page.

### Sign Up - Admin/Pastor

The sign up page should be a simple sign up page with a form for name, email, and password.
It should also have a link to the sign in page. 

### Forgot Password - Admin/Pastor

The forgot password page should be a simple forgot password page with a form for email.
It should also have a link to the sign in page.

### Reset Password - Admin/Pastor

The reset password page should be a simple reset password page with a form for new password.
It should also have a link to the sign in page.

### Church Setup Page - Admin/Pastor

This page should have two sections:
- Church information
- Plan Selection

The church information section should have a form for the church name, address, phone, logo, and core profile information.
There should be a preview that lets the user understand how the church profile will appear during setup.
The plan selection section should have the two subscription tiers and their features in cards, including usage limits and branding/domain differences.

After the user selects a plan and continues, they should be directed to a Stripe checkout page.
After they checkout, they should be directed to the settings page to finish setup and configure their domain and branding options if their plan allows it.

### Chat Page - Member/Normal User

The chat page should be the main chat page for the church.
It should have a chat interface with a sidebar for the chat history and a main chat area.
The chat interface should be responsive and should work on desktop and mobile.
The chat interface should use the Shadcn UI chat component.
The chat interface should use the Vercel AI SDK for the AI-powered chat.
It should strongly mimic the ChatGPT/Claude interface.
There should be specific components for citations as mentioned above.

The member login should be located in a modal that appears when the user clicks the login button in the side navigation.

### Admin Dashboard - Admin/Pastor

The admin dashboard should be what admins/pastors are immediately directed to after logging in.
It should contain the analytics as described above and should give church admins a quick understanding of how their church is using the platform.
At the top of the page, there should be clear summary cards for the selected time range, including questions asked, document uploads, visitors, unanswered questions, and common topics.
There should be a simple date range filter with options such as today, last 7 days, last 30 days, month to date, and year to date.
For this page, mimic Plausible with charts and graphs and keep the UI very clean, minimal, and easy to scan.
The main content should include trend charts for questions, uploads, visitors, and unanswered questions over time, as well as sections for the most common topics and other useful summaries.
It should be easy for an admin/pastor to tell whether usage is growing, what people are asking about most often, and where the church may need to upload more content to improve answers.
If the church is new or has limited data, the page should show helpful empty states that explain what metrics will appear once the church begins using the platform.

### Settings - Admin/Pastor

The settings page should be where admins/pastors manage church-level configuration.
It should contain the church settings features described above and act as the main place to update the church's identity and setup.
This page should allow admins/pastors to view and update core church information such as the church name, description, contact details, logo, and branding settings.
It should also include the church's domain setup, showing the doctrinally.ai subdomain for Standard churches and custom domain settings for Enterprise churches.
Standard churches should still use doctrinally.ai branding in the public member-facing experience, while Enterprise churches should be able to customize that experience more fully.
The page should make it clear which settings are available for the current subscription tier and which features require the Enterprise plan.
Owner-only settings such as billing-related access should be clearly separated from settings that regular admins are allowed to manage.
The branding section should include a live preview panel that shows what the member-facing chat experience will look like with the current color and logo settings.
The preview should support toggling between light and dark mode so admins can see both themes before saving.
Enterprise churches should be able to configure primary color, accent color, background, text color, and logo for both light and dark themes.
Standard churches should see the default doctrinally.ai branding in the preview with a clear upgrade prompt for custom branding.

### User Management - Admin/Pastor

The user management page should be where owners manage church members and invitations.
It should contain the user management features described above and provide a clear overview of everyone connected to the church.
There should be a members section and an invitations section that show each user's role, invitation status, and any other key account details needed for administration.
Owners should be able to invite users by email, assign roles, change roles, resend invitations, and remove users from the church.
Admins may be able to view church members, but only owners should be able to make membership and role changes.

### Document Management - Admin/Pastor

The document management page should be split into two sections:
- Upload library
- AI chat

#### Upload Library

This section should take up 2/3 of the page and should mimic the Google Drive interface.
Users should be able to click the upload button to upload a new document. It should create a dropdown to select the type of document to upload.
The dropdown should include:
- YouTube video
- File upload
- New Document

When clicked, each option should spawn a modal with the appropriate form for the document type.
The upload forms should capture the metadata needed for retrieval and library organization, such as title, speaker/author, date, description, and tags where applicable.
This page should clearly show the status of each document, including draft, uploading, queued, processing, indexed, and failed.
This page should also show the documents uploading/processing in a prominent way, such as a fixed floating element in the bottom left corner.
For uploaded videos, the library should reflect both playback readiness and transcription/indexing readiness.
For PDF/Word documents, the library should show whether preview generation and text extraction have completed successfully.
Admins/pastors should be able to retry failed processing jobs and reprocess documents when content changes or processing improves.

#### AI Chat

This section is for admins/pastors to be able to test out the AI chat with the documents they have uploaded. 
It should function and look nearly identical to the chat page members/normal users would see in their interface.
It should make it easy to see which documents are already indexed and available to the AI and which ones are still processing or unavailable.
When the AI cites a source in this admin testing area, the citation should link back to the uploaded document, relevant page, or relevant timestamp whenever possible.

### Billing - Admin/Pastor

The billing page should be owner-only.
It should show the church's current subscription tier, included usage limits, current monthly usage, and any overage that has been incurred.
It should also include a clear link to the Stripe billing management experience.
If the church is on the Standard plan, the page should also make it clear which additional capabilities are unlocked by Enterprise.

### Member Directory - Admin/Pastor

The member directory should show all the members that have signed up for the church's chat experience.
It should show their name, email, role, join date, and last login date.
This page should be primarily informational and should be distinct from the owner-focused user management page.
User management should be used for invitations, role changes, and access management, while the member directory should help admins/pastors understand who is actively using the product.

## Phases

### Phase 1 - Core Foundation and Architecture

This phase is focused on setting up the application foundation so that all future features can be built on a stable structure.
The goal is to establish the app shell, shared design system, core database models, and the multi-tenant architecture needed for church-specific experiences.

To do:
- Set up the core Next.js app structure using the App Router
- Configure Tailwind CSS and shadcn/ui as the primary UI system
- Create the shared app shell, top-level layouts, and admin navigation
- Define the initial Drizzle schema for users, churches, memberships, documents, chats, messages, subscriptions, and invitations
- Set up Postgres with support for vector search
- Create a consistent environment variable strategy for local, preview, and production environments
- Add basic logging, error handling, and loading states for the app shell
- Establish church-aware routing so church pages can be scoped by subdomain or church identifier
- Create reusable design tokens and base UI components for forms, tables, cards, modals, charts, and sidebars

### Phase 2 - Authentication and Church Onboarding

This phase is focused on getting admins/pastors into the product and allowing them to create their first church.
The goal is to have a complete authentication flow and a clean first-run experience that moves a new user into the admin side of the product.

To do:
- Implement sign up for admins/pastors with name, email, and password
- Implement sign in with email and password
- Implement forgot password and reset password flows
- Set up NextAuth for session management
- Create protected admin routes and redirect logic for unauthenticated users
- Build the initial onboarding flow to create a church after sign up
- Automatically assign the church creator as the owner of that church
- Create the basic post-login redirect to the admin dashboard
- Add validation, error handling, and success states for all auth forms
- Prepare the auth system for future expansion such as Google SSO

### Phase 3 - Subscription and Billing Setup

This phase is focused on making church creation and feature access aware of the subscription model.
The goal is to connect the product to Stripe, enforce the difference between Standard and Enterprise, and make billing ownership rules clear.

To do:
- Set up Stripe products and prices for Standard and Enterprise plans
- Create the billing data models needed to track subscriptions and church plan status
- Build the billing page for owners
- Link the billing page to the Stripe customer portal or dashboard experience
- Restrict billing access so only owners can manage it
- Track current plan, usage limits, and overage counts per church
- Surface usage and monthly limits in the admin side navigation
- Show clear plan-based gating for Standard-only versus Enterprise-only features
- Add support for overage reporting for document uploads and questions
- Define the logic for when a church can create content or continue usage past included limits

### Phase 4 - Settings and User Management

This phase is focused on the core administration experience for managing a church and the people attached to it.
The goal is to make church settings and church membership easy to manage while keeping role permissions clear and secure.

To do:
- Build the settings page for church-level configuration
- Add forms for church name, description, logo, branding, and other identity settings
- Show the church's doctrinally.ai subdomain and prepare support for Enterprise custom domains
- Add branding configuration with live preview panel showing the member-facing chat experience
- Support light mode and dark mode theme configuration with preview toggle
- Enterprise churches can customize primary color, accent color, background, text, and logo for both themes
- Standard churches see default branding in preview with Enterprise upgrade prompt
- Implement domain-aware routing: root domain shows landing page, subdomains and custom domains show church chat
- Build the user management page for owners
- Create the members table showing name, email, role, and last login or invitation status
- Create the invitations flow for adding users by email
- Allow owners to assign roles, change roles, resend invitations, and remove users
- Ensure admins can view appropriate information but cannot perform owner-only actions
- Add audit-friendly UI states for pending invitations, accepted invitations, and removed members
- Make role-based authorization consistent across the UI, server actions, and database queries

### Phase 5 - Document Management and Content Ingestion

This phase is focused on giving admins/pastors the ability to add church-specific content into the system.
The goal is to support the main document types, store them reliably, and prepare them for retrieval by the AI chat experience.

To do:
- Build the document management page with separate upload library and AI chat sections
- Create the upload dropdown flow for YouTube videos, file uploads, and new documents
- Build modal-based upload forms for each content type
- Capture structured metadata such as title, speaker/author, date, description, and tags
- Integrate Vercel Blob or the chosen storage solution for uploaded assets
- Build the Platejs editor flow for creating new documents inside the app
- Store created documents as markdown
- Create background processing jobs using Trigger.dev for ingestion workflows
- Pull transcripts or captions for YouTube videos when available
- Extract audio and generate transcripts for uploaded videos
- Generate thumbnails, previews, and playback-ready assets where needed
- Extract text from PDF and Word documents and preserve page references where possible
- Chunk and index all supported content types for retrieval
- Track processing states such as queued, uploading, processing, failed, and complete
- Add indexed or ready states so admins know when content can be used in chat
- Show in-progress and failed uploads clearly in the UI
- Allow admins/pastors to retry failed processing and reprocess existing documents
- Build the document library table or grid with search, filters, and document status

### Phase 6 - AI Chat and Citation Experience

This phase is focused on the core product value: allowing church members to ask questions and receive grounded answers from the Bible and church-specific materials.
The goal is to build a reliable, church-aware chat experience with strong retrieval and rich citations.

To do:
- Build the public church chat page
- Create a chat UI that strongly mirrors ChatGPT/Claude using shadcn/ui patterns
- Integrate the Vercel AI SDK for chat streaming and message handling
- Build the retrieval pipeline using both keyword and semantic search
- Scope retrieval results to the correct church and its indexed content
- Add Bible passage support alongside church-uploaded content
- Create custom citation rendering for YouTube videos, uploaded videos, custom documents, and Bible passages
- Ensure citations can power custom UI elements such as previews, thumbnails, page references, timestamps, and iframe embeds
- Add guardrails so responses prefer cited, retrieved information when available
- Build the admin-side AI chat tester inside document management
- Add graceful fallback behavior for low-confidence or no-answer situations

### Phase 7 - Chat History and Member Account Experience

This phase is focused on the logged-in member experience without making login required for basic chat usage.
The goal is to allow guests to ask questions freely while giving signed-in members a way to save and revisit their conversations.

To do:
- Add optional member authentication entry points from the chat UI
- Build the member login modal from the side navigation
- Allow guests to use chat without authentication
- Save conversation history for authenticated users
- Build the chat history sidebar and conversation list
- Allow users to revisit previous conversations
- Define how anonymous sessions convert into saved accounts if a guest later logs in
- Build the member dashboard or related member-facing account views
- Ensure chat history is correctly scoped to both the user and the church
- Add empty states and onboarding copy for first-time members

### Phase 8 - Analytics and Admin Dashboard

This phase is focused on helping admins/pastors understand how their church is using the platform and where the product is succeeding or falling short.
The goal is to create a Plausible-inspired dashboard backed by meaningful church analytics.

To do:
- Track questions asked across day, week, month, and year ranges
- Track document uploads across day, week, month, and year ranges
- Track visitors across day, week, month, and year ranges
- Track questions without answers or without strong citations
- Track common topics and theme trends across time
- Build the admin dashboard summary cards for key metrics
- Add date range filters such as today, last 7 days, last 30 days, month to date, and year to date
- Build charts and trend visualizations for key metrics
- Create empty states for new churches with limited data
- Make the dashboard useful for identifying content gaps and growth patterns
- Ensure analytics are scoped per church and respect role-based access

### Phase 9 - Enterprise Features, Reliability, and Launch Readiness

This phase is focused on polishing the product for production use and completing the higher-tier capabilities required by Enterprise churches.
The goal is to make the platform reliable, secure, brand-flexible, and ready for real customer usage.

To do:
- Implement custom domain support for Enterprise churches
- Allow Enterprise churches to use their own branding and logo in the member-facing experience
- Finalize plan-based feature gating across the app
- Improve performance for retrieval, chat streaming, document ingestion, and admin dashboards
- Harden background jobs and retry behavior for failed processing tasks
- Add stronger observability for errors, failed uploads, failed indexing, and chat failures
- Review security for auth, church isolation, document access, and billing permissions
- Validate analytics accuracy and billing usage calculations
- Polish mobile and desktop responsiveness across all major pages
- Add final QA coverage for the primary user journeys
- Prepare deployment, monitoring, backups, and launch checklists

## Aesthetic Notes

You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight. Focus on:
 
Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.
 
Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.
 
Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.
 
Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.
 
Avoid generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character
 
Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. You still tend to converge on common choices (Space Grotesk, for example) across generations. Avoid this: it is critical that you think outside the box!
