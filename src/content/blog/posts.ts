export type BlogSection = {
  heading?: string;
  paragraphs: string[];
};

export type BlogCallout = {
  title: string;
  body: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  category: "Cultural Questions" | "Scripture & Theology" | "Platform";
  publishedAt: string; // ISO date
  readMinutes: number;
  author: string;
  excerpt: string;
  sections: BlogSection[];
  churchRelevance: BlogCallout;
};

/**
 * All blog content is written to be neutral on contested cultural questions.
 * Both sides are represented as arguments made by Christians who hold them,
 * without the site taking a position. Every culturally-framed post closes
 * with a section explaining why churches need to be able to answer the
 * question thoughtfully — and how Doctrinally.AI helps them do that.
 */
export const blogPosts: BlogPost[] = [
  {
    slug: "opus-4-7-and-the-church",
    title:
      "Opus 4.7 Drops Today: What a Smarter Model Actually Means for the Church",
    description:
      "Anthropic released Claude Opus 4.7 today. Here is a plain-language look at what is new, why it matters for ministry, and how churches can adopt the next generation of AI without surrendering their pulpit.",
    category: "Platform",
    publishedAt: "2026-04-16",
    readMinutes: 8,
    author: "The Doctrinally.AI Team",
    excerpt:
      "Anthropic released Claude Opus 4.7 today. Here is what actually changes for churches — better reasoning, longer context, stronger citation discipline — and the one thing that still has to stay true no matter how smart the model gets.",
    sections: [
      {
        paragraphs: [
          "Today, April 16, 2026, Anthropic released Claude Opus 4.7 — the newest flagship in the Claude 4 family and, at the moment of this writing, the most capable general-purpose language model available. For most of the internet, it is another model announcement in a year that has already had too many. For the church, it is worth pausing on.",
          "Every meaningful jump in model quality reshapes what members expect their chatbot to do, what visitors assume a church website can answer, and what pastors need to understand in order to shepherd their people well. Opus 4.7 is a meaningful jump. This is a plain-language walk through what is new, why it matters for ministry, and — most importantly — the one thing that still has to stay true no matter how smart the model gets.",
        ],
      },
      {
        heading: "What is actually new in Opus 4.7",
        paragraphs: [
          "Opus 4.7 is, at its core, an incremental release on top of the Claude 4 family that has been setting the pace for the last year. It is not a new paradigm. It is a sharper instrument. But the places where it has sharpened matter pastorally, which is why it is worth naming them.",
          "The first improvement is reasoning on long, complex documents. Opus 4.7 holds a substantially longer effective context window and — more importantly — keeps its reasoning coherent across that whole window. For a church, that is the difference between asking a question and getting an answer grounded in a single paragraph versus an answer that has actually weighed a twelve-sermon series, an elders' position paper, and three devotional entries together. The same question can now produce a much more faithful answer because the model is weighing more of what your church has said at once.",
          "The second improvement is instruction following, especially around citations and refusal. Earlier models could be coaxed into inventing a verse or attributing a quote to the wrong pastor if the prompt was ambiguous. Opus 4.7 is measurably more disciplined about grounding its answers in the sources it was given, saying 'I don't know' when the sources do not answer the question, and declining to speculate beyond what the text supports. For an application like ours, where every answer has to be traceable back to a sermon or a document, that discipline matters more than raw fluency.",
          "The third improvement is latency for complex reasoning tasks. Opus 4.7 is not the fastest model in the Claude family — Haiku 4.5 is still the speed champion — but it is noticeably quicker on the kinds of retrieval-augmented workloads that power church chat. A member asking a hard question at 10 p.m. will feel the difference.",
        ],
      },
      {
        heading: "Why any of this matters for a church",
        paragraphs: [
          "It is fair to ask, 'Why should a pastor care about a model release?' Most of the news cycle around AI is aimed at engineers and investors. The honest answer is that each model release quietly raises the floor for what your members will assume is possible.",
          "In 2023, members did not expect much from a church chatbot. In 2024, they started expecting it to remember the last thing they asked. In 2025, they started expecting it to cite sources. In 2026, with Opus 4.7 in the wild, they will start expecting answers that read like a thoughtful pastor wrote them. That is not a hype claim — it is simply where the technology now sits. Church tools that do not keep up will feel, very quickly, like the 2019 version of the same product.",
          "The second reason it matters is subtler. Every time the frontier models get better at generic theology, the gap between a general chatbot and a church-specific one gets more dangerous. A more fluent, more confident, more articulate Opus 4.7 answering a question about baptism from the open internet will sound even more authoritative than its predecessors — and will still be giving an answer your elders never approved. The case for church-specific, source-grounded AI does not weaken as models get smarter. It gets stronger.",
        ],
      },
      {
        heading: "What Opus 4.7 changes inside Doctrinally.AI",
        paragraphs: [
          "We have spent the last several weeks evaluating Opus 4.7 against our existing retrieval stack, and we are rolling it out to churches on the platform this week. A few things will change, and a few things emphatically will not.",
          "What will change: answers will be noticeably more coherent across long sermon series. A member asking, 'What has our church taught about forgiveness?' will get a response that weighs a year's worth of relevant teaching at once, rather than summarizing a single message. Citations will be tighter — the model is better at pointing to the specific paragraph, timestamp, or page reference, rather than the document as a whole. Admin-side testing in the Document Management area will feel more responsive, especially for complex follow-up questions.",
          "What will not change: the grounding. Every answer your members receive is still drawn exclusively from the content your church has uploaded, plus Scripture. Opus 4.7 is a better reader of that content. It is not a source of new theology. If your church has not spoken to a topic, the platform still says so — honestly, plainly, without filling the gap with internet theology, no matter how confidently a newer model could pretend to.",
          "This is the part of the architecture that is worth belaboring, because it is the part that matters most. A smarter model is not a reason to loosen the guardrails. It is a reason to tighten them. The whole point of Doctrinally.AI is that the model serves the church, not the other way around.",
        ],
      },
      {
        heading: "A practical note on cost and the Standard plan",
        paragraphs: [
          "Opus is the most capable and, historically, the most expensive tier of the Claude family. We want to be transparent about how that shows up in the product. On the Standard plan ($49/month), most member-facing chat responses will continue to use a carefully tuned blend of Haiku 4.5 and Sonnet 4.6 — the right trade-off for 500 questions a month at that price point. Opus 4.7 is used selectively for the longest, most complex retrieval tasks where reasoning quality materially changes the answer.",
          "On the Enterprise plan ($99/month), Opus 4.7 is available as the default reasoning model for all chat traffic, with the broader 2,000-question monthly limit and the custom domain and branding features that larger churches ask for. We built the plans this way because we did not want churches to have to choose between honest pricing and access to the best reasoning available.",
          "None of this changes the thing that actually distinguishes us: the grounding, the citations, and the honest silence when your church has not spoken to a question. Those do not depend on the model tier. They depend on the architecture.",
        ],
      },
      {
        heading: "Six ways churches can put a smarter model to work",
        paragraphs: [
          "With Opus 4.7 now generally available, here are six uses we are seeing churches genuinely benefit from — each of which becomes meaningfully better with the new model, and none of which require the pastor to surrender control of the pulpit.",
          "First, cross-series synthesis. A member asks, 'How has our church taught on anxiety over the years?' Opus 4.7 can now weave together threads from a 2022 sermon, a 2024 devotional, and a recent small-group document — with citations — in a way earlier models could not. The output reads less like a summary and more like a pastor walking the member through the arc.",
          "Second, visitor exploration. A first-time visitor scans the QR code on Sunday's bulletin and asks a nervous, imprecise question about what the church believes. A more capable model handles imprecise questions gracefully, routes to the right sources, and answers with warmth rather than stiffness. The visitor gets an answer that sounds like the church, not a FAQ.",
          "Third, content-gap discovery. The admin dashboard has always shown which questions members ask most. With Opus 4.7's improved topic clustering, those analytics become sharper. Pastors can see not just 'people are asking about suffering' but 'people are asking specifically about the suffering of children and we have only addressed it once.' That is sermon-planning gold.",
          "Fourth, Platejs-created document reasoning. For churches that build their own documents inside the app using the rich-text editor, Opus 4.7 is substantially better at reasoning over heavily-structured content — nested outlines, footnotes, and internal references. If your catechism or membership class material lives inside Doctrinally.AI, it just got more useful.",
          "Fifth, Bible passage integration. When a member asks a question that crosses church-specific teaching and Scripture directly, the new model is better at citing the passage, surfacing the relevant verse preview, and linking out to the full text. The handoff between church content and Bible content feels more natural.",
          "Sixth, multilingual pastoral care. Opus 4.7's multilingual capabilities are a real step forward for churches serving immigrant and bilingual congregations. A Spanish-speaking member can ask a question in Spanish and receive an answer drawn from the same English sermon library, with citations preserved. This is one of the improvements we expect to matter most in the long run.",
        ],
      },
      {
        heading: "The one thing that still has to stay true",
        paragraphs: [
          "It would be easy to turn a model-release post into a hype piece. That is not what this is. Opus 4.7 is a better instrument, and better instruments are worth celebrating. But a better instrument does not change the fundamental pastoral question about AI in the church, and we want to be clear about that.",
          "The question is still: who controls what this tool says to my congregation? A model that reasons more coherently is more useful to you if it is grounded in your teaching, and more dangerous to you if it is not. The same capability that lets Opus 4.7 weave a compelling answer from your sermons also lets it weave a compelling answer from an internet full of bad theology — and the member on the other end cannot tell the difference.",
          "This is why the architecture matters more than the model. Doctrinally.AI is built so that every answer your members receive is drawn from content you chose, cited to sources they can verify, and honestly limited to topics your church has actually addressed. Opus 4.7 makes that architecture work better. It does not — and it should not — replace it.",
        ],
      },
      {
        heading: "What to do this week",
        paragraphs: [
          "If your church is already on Doctrinally.AI, you do not have to do anything. The Opus 4.7 rollout is automatic. You will notice the difference in answer quality over the next several days, especially for complex, multi-sermon questions.",
          "If you have been evaluating AI tools for your church and holding out for something worth committing to, this is a reasonable week to start. The model powering the best church AI is now meaningfully better than it was a month ago. The guardrails that keep it faithful are the same ones that mattered before any of these model releases existed. Upload a few sermons, ask it hard questions, and see for yourself whether your pastor's voice is the one that comes back.",
          "And if you are a pastor wondering whether any of this belongs in ministry at all, the honest answer has not changed. AI is a tool. It is more capable today than it was yesterday. It is still just a tool. What matters is that when your members reach for it at 2 a.m., the voice they hear is yours.",
        ],
      },
    ],
    churchRelevance: {
      title: "A smarter model, the same conviction",
      body: "Opus 4.7 is live inside Doctrinally.AI this week. Your church's answers will be more coherent, more carefully cited, and more responsive to the long, layered questions your members actually ask. What will not change is the thing that matters most: every response is still grounded in the sermons, devotions, and documents you upload, cited back to the source, and honestly silent when your church has not addressed a question. A better model, serving the same conviction — that the first voice your people hear should be yours.",
    },
  },
  {
    slug: "best-ai-tools-for-churches",
    title:
      "The 10 Best AI Tools for Churches in 2026: An Honest Ranking",
    description:
      "A ranked list of the best AI tools for churches in 2026 — including Pulpit AI, Gloo, Pastors.ai, and more — with honest pros, cons, pricing, and the doctrinal risk most reviews ignore.",
    category: "Platform",
    publishedAt: "2026-04-12",
    readMinutes: 15,
    author: "The Doctrinally.AI Team",
    excerpt:
      "There are dozens of AI tools marketed to churches right now. We ranked the ten that matter, named the ones that are dangerous, and explained why the most important question is not 'which one is cheapest?' but 'who controls what it says to your congregation?'",
    sections: [
      {
        paragraphs: [
          "AI is no longer optional for churches that want to reach their people between Sundays. It is a tool for enormous good — extending the reach of faithful teaching into every hour of the week, making years of sermons searchable in seconds, and giving visitors a private, low-pressure way to explore what your church actually believes.",
          "But AI is also a tool that can do real doctrinal harm. A language model trained on the open internet does not know the difference between your church's position on baptism and a Reddit thread about baptism. It does not care about your denomination's confession. It will answer a member's question with total confidence using theology your elders have never reviewed, and it will never tell the member it is guessing. That is not a hypothetical risk. It is the default behavior of every general-purpose chatbot on the market.",
          "This is why the most important question when evaluating AI tools for your church is not features or pricing. It is: who controls what this tool says to my congregation? A tool that lets you completely influence every answer — grounding it in your sermons, your documents, your doctrinal convictions — is a tool for discipleship. A tool that answers from the open internet with a Christian-sounding wrapper is a tool for doctrinal drift, and most pastors will not realize it until the damage is done.",
          "What follows is an honest, ranked list of the best AI tools for churches in 2026. We build one of them, so we are transparent about our bias. We also name the things we do not do, the places where competitors are genuinely strong, and the tools you should approach with caution.",
        ],
      },
      {
        heading: "How we evaluated these tools",
        paragraphs: [
          "We ranked every tool on five criteria. First, doctrinal control: can your church control what the AI says, or does the model answer from the open internet? Second, source transparency: can a member see exactly where an answer came from? Third, practical usefulness: does the tool actually save a church meaningful time or expand meaningful reach? Fourth, pricing fairness: is the cost reasonable for a church budget? Fifth, risk profile: what is the worst thing this tool can do if nobody is watching?",
          "No tool scores perfectly in every category. The list below is ordered by how much we trust the tool to speak to a congregation without causing harm.",
        ],
      },
      {
        heading:
          "1. Doctrinally.AI — Best for member-facing doctrinal Q&A",
        paragraphs: [
          "We are listing ourselves first, so let us be direct about what we do and what we do not do. Doctrinally.AI is a church-specific retrieval tool. You upload your sermons, devotions, YouTube videos, PDFs, and documents. We index them and turn them into a chat interface your members can use. Every answer is grounded entirely in your church's content and cited back to the original source — the exact sermon, the exact timestamp, the exact document.",
          "The core principle is total doctrinal control. Your church decides what the AI can say by deciding what content to upload. If your church has not spoken to a question, the AI says so honestly instead of inventing an answer from the internet. That is the single most important difference between a tool built for churches and a tool marketed to churches.",
          "What we do not do: we do not generate sermons, write newsletters, create social media clips, or schedule volunteers. We are deliberately narrow. We believe the member-facing experience — the thing your congregation actually touches when they ask a hard question at 2 a.m. — is the place where doctrinal accuracy matters most and where a wrong answer costs the most.",
          "Pricing: Standard plan at $49/month, Enterprise at $99/month with custom domain and full branding control. Best for: any church that wants its own teaching to be the first voice members hear when they have a question.",
        ],
      },
      {
        heading:
          "2. Pulpit AI — Best for sermon-to-content repurposing",
        paragraphs: [
          "Pulpit AI is one of the most popular AI tools in the church space right now, and for good reason. You upload a sermon recording and Pulpit AI generates over 20 pieces of derivative content: social media clips with captions, small group discussion guides, five-day devotionals, blog posts, newsletter drafts, and sermon summaries with timestamps. It also includes a sermon writing assistant that helps with openers, metaphors, and Scripture references.",
          "For a busy pastor or communications director who spends hours every week turning Sunday's message into Monday's content, Pulpit AI is a genuine time-saver. The output quality is solid and improves when you edit it rather than publishing raw. The sermon clip generation is particularly strong — it identifies high-engagement moments and formats them for TikTok, Reels, and Shorts.",
          "The limitation is that Pulpit AI is a content creation tool, not a doctrinal Q&A tool. It repurposes what you have already preached into new formats, but it does not create a searchable, member-facing chat experience grounded in your full teaching library. If a member has a question at 11 p.m., Pulpit AI does not answer it — it helps you post about the sermon, not search it.",
          "Pricing: Free trial with 2 uploads. Plans start at $39/month for 5 sermon uploads, $59/month for 10, and $129/month for 25. Best for: churches that produce great sermons but struggle to turn them into content throughout the week.",
        ],
      },
      {
        heading:
          "3. Gloo + Faith Assistant — Best for large multi-site churches",
        paragraphs: [
          "Gloo is a faith-ecosystem platform that partnered with Faith Assistant to build custom AI chatbots trained on a church's own sermons, Bible studies, and event information. Their AI Studio platform is model-agnostic — it works across OpenAI, Anthropic, and Google models — and includes denominational perspective toggles that can shape responses toward Catholic, Evangelical, or Mainline Protestant viewpoints.",
          "The denominational toggle feature is notable. It is one of the few tools that acknowledges outright that different traditions answer the same question differently, and it gives the church a measure of control over which theological lens the AI uses. For large, multi-site operations that need enterprise-grade infrastructure and have staff to manage the configuration, Gloo is a serious option.",
          "The tradeoff is complexity and cost. Gloo is built for organizations with dedicated tech staff or agencies. A 200-member church without a communications director will find the setup overhead significant. The free tier is available through Gloo+ membership, but the features that matter most for doctrinal control live in the paid tiers.",
          "Best for: large churches and denominations that need enterprise infrastructure and have technical staff to manage it.",
        ],
      },
      {
        heading:
          "4. Pastors.ai — Best budget option for sermon chat",
        paragraphs: [
          "Pastors.ai lets you submit a YouTube link or sermon manuscript and generates clips, study guides, five-day devotionals, and — importantly — a per-sermon chatbot that your congregation can query. The embeddable church chatbot pulls from all your uploaded sermons and your church website content, giving members a way to ask questions grounded in your teaching.",
          "At $30/month for the Pastor plan, it is one of the most affordable tools that includes a member-facing chat experience. The free tier gives you 4 sermons per month, which is enough to test whether your congregation will actually use it. The interface is clean and the onboarding is fast.",
          "The main limitation is depth. The retrieval is scoped to sermons and website content, not the full range of documents, PDFs, devotions, and video libraries that a more comprehensive tool can ingest. For a smaller church with a modest content library, that may be perfectly sufficient. For a church with years of accumulated teaching across many formats, it can feel thin.",
          "Pricing: Free plan with 4 sermons/month. $30/month Pastor plan, $75/month Team plan. Best for: small to mid-size churches that want a member-facing chatbot without a large budget.",
        ],
      },
      {
        heading:
          "5. Church.tech — Best for video-first churches",
        paragraphs: [
          "Church.tech focuses on the sermon-to-content pipeline with a strong emphasis on video. It handles auto-transcription, social media clip generation for TikTok, Reels, and Shorts, sermon summaries, and YouTube chapter generation. The 'Playground' feature lets you generate unlimited derivative content from any uploaded sermon — devotionals, marketing copy, social posts, and more.",
          "If your church's primary content format is video and your biggest bottleneck is turning a 45-minute sermon into a week's worth of social content, Church.tech is purpose-built for that workflow. The clip detection is competitive with standalone tools like OpusClip, and the church-specific formatting saves time over a general-purpose video editor.",
          "Like Pulpit AI, this is a content creation tool rather than a doctrinal retrieval tool. It does not give members a way to ask questions. It gives your communications team a way to produce content faster. Both are valuable — but they solve different problems.",
          "Pricing: Tiered plans with a free trial; pricing is not publicly listed. Best for: churches that produce video sermons and need to maximize their reach across social platforms.",
        ],
      },
      {
        heading: "6. Logos Bible Software — Best for sermon preparation",
        paragraphs: [
          "Logos has been the gold standard for pastoral study software for over a decade, and their AI features have made it even more useful. The AI-powered search lets you ask questions in plain English and get results from across your entire library — commentaries, original-language tools, theological dictionaries, and cross-references. It is the best sermon preparation assistant on the market.",
          "Logos is not a member-facing tool. Your congregation will never interact with it. But for the pastor who spends 15 to 20 hours a week in sermon preparation, the AI features can save hours of cross-referencing and surface connections you might have missed. It uses AI the way a concordance does — as a research accelerant, not a replacement for the pastor's own thinking.",
          "The tradeoff is cost. Logos packages range from free to well over $1,000 depending on the library size. The AI features are included in most modern packages, but the real value comes from the depth of the library you invest in. Think of it as a long-term tool purchase, not a monthly subscription.",
          "Best for: pastors who want AI to enhance their study process without touching the congregation-facing experience.",
        ],
      },
      {
        heading: "7. MinistryAI — Best all-in-one for solo pastors",
        paragraphs: [
          "MinistryAI offers a 'Ministry Pack' suite covering sermon preparation, Bible study generation, event planning, and administrative tasks. At $39/month per user, it is positioned as a one-tool solution for the pastor who wears every hat — preacher, administrator, communications director, and volunteer coordinator.",
          "The breadth is both the strength and the weakness. It does a lot of things adequately rather than one thing excellently. For a solo pastor at a church of 100 who needs help across every area of ministry operations, that breadth is valuable. For a church with a staff of five that needs a specialized tool for one specific pain point, a more focused product will outperform it.",
          "You get 20 free interactions before subscribing, which is enough to evaluate whether the outputs match your expectations. The sermon prep features are solid. The event planning tools are functional. The generated content still needs a human editor before publishing.",
          "Pricing: $39/month or $390/year. Best for: solo pastors and small church staffs that need a little help across many categories.",
        ],
      },
      {
        heading:
          "8. FaithBased.ai — Best white-label chatbot for church websites",
        paragraphs: [
          "FaithBased.ai builds white-label AI assistants that churches can embed on their websites. The chatbot is custom-trained on your church's content, and the branding is yours — visitors see your church's name and logo, not a third-party product.",
          "For churches that want an AI presence on their website without it feeling like a tech product, the white-label approach is appealing. The chatbot can handle common visitor questions — service times, beliefs, directions, and basic theological questions grounded in your uploaded content.",
          "The risk with any white-label chatbot is the depth of the grounding. Ask the vendor exactly what happens when a visitor asks a question your church has not addressed. If the answer is 'it falls back to a general model,' you have the same doctrinal risk as a general chatbot wearing your church's brand. Verify this in a demo before committing.",
          "Pricing: Custom; contact for a quote. Best for: churches that want a branded chatbot on their website for visitor engagement.",
        ],
      },
      {
        heading:
          "9. ACS Technologies (Realm) — Best for large church administration",
        paragraphs: [
          "Realm is a full church management system from ACS Technologies, and they have added AI-assist features for member communication, giving analytics, and administrative automation. This is not an AI-first product — it is a church management platform with AI bolted on to make existing workflows faster.",
          "For churches already using Realm for member management, the AI features are a natural extension. Automated giving insights, communication drafts, and reporting summaries save real administrative time. But if you are not already a Realm customer, you would not buy it for the AI features alone.",
          "Best for: churches already using Realm that want AI to streamline their existing administrative workflows.",
        ],
      },
      {
        heading:
          "10. OpusClip — Best general-purpose sermon clip tool",
        paragraphs: [
          "OpusClip is not a church-specific tool, but it has been widely adopted by church media teams for one reason: it is very good at identifying the most engaging moments in a long video and cutting them into short-form clips optimized for social media. You upload a sermon recording and it returns a set of clips ranked by predicted engagement.",
          "The output still needs review — it occasionally picks moments that are emotionally intense but theologically incomplete, which can strip context in ways a pastor would not choose. But as a starting point for a social media workflow, it saves hours of manual scrubbing through footage.",
          "Pricing: Free tier with limited exports. Pro plans start around $15/month. Best for: church media teams that need a fast, affordable way to generate social clips from sermon recordings.",
        ],
      },
      {
        heading: "The tools we left off this list and why",
        paragraphs: [
          "There are products in the church AI space that we deliberately did not include. Tools that are essentially ChatGPT with a Christian system prompt — no church content upload, no source citations, no doctrinal control — are not church AI tools. They are consumer chatbots with a cross on the landing page. We have also excluded novelty products like AI avatar services that let members 'talk to Jesus' for $1.99 a minute. These are not ministry tools. They are distractions at best and deeply misleading at worst.",
          "If a product does not let your church control the source of the answers or does not cite where those answers come from, it does not belong on a list of tools you should trust with your congregation.",
        ],
      },
      {
        heading:
          "Why doctrinal control is the question that matters most",
        paragraphs: [
          "Every tool on this list has strengths. But the single most important dividing line in the church AI market is not price, not features, and not design. It is this: does the tool let your church completely control what it says to your people?",
          "AI is an extraordinary tool for good. It can make a sermon from three years ago answer a member's question at 2 a.m. It can give a visitor a private, low-pressure way to explore your church's beliefs. It can help a pastor see what their congregation is actually wrestling with. These are genuine gifts to ministry.",
          "But AI is also capable of real doctrinal harm. A model trained on the open internet will answer a question about the sovereignty of God using a blend of Reformed theology, open theism, process theology, and pop-level blog posts — and it will present that answer as confident, settled truth. A member who does not know better will walk away thinking their church teaches something it has never said. Multiply that by a hundred members and a thousand questions, and you have a slow, invisible doctrinal drift that no elder board approved.",
          "This is not theoretical. It is the default behavior of every general-purpose AI chatbot. The only defense is a tool that grounds its answers in content your church has actually produced and reviewed — your sermons, your documents, your confessions, your teaching. That is what doctrinal control means. Not censorship. Not rigidity. Simply that the first voice your members hear should be yours, and that you should be able to verify every word of it.",
          "Doctrinally.AI was built around this conviction. Every response is grounded in your content. Every answer is cited to a specific source. When your church has not addressed a topic, we say so instead of filling the gap with internet theology. You control the doctrine because it is your church, your pulpit, and your responsibility to the people who trust you with it.",
        ],
      },
      {
        heading: "Quick comparison table",
        paragraphs: [
          "Doctrinally.AI — Type: Doctrinal retrieval and member Q&A. Doctrinal control: Full (your content only). Citations: Yes, to exact source. Member-facing chat: Yes. Pricing: From $49/month.",
          "Pulpit AI — Type: Sermon content repurposing. Doctrinal control: Partial (repurposes your sermons). Citations: No. Member-facing chat: No. Pricing: From $39/month.",
          "Gloo + Faith Assistant — Type: Enterprise church chatbot platform. Doctrinal control: High (denominational toggles). Citations: Varies by config. Member-facing chat: Yes. Pricing: Free tier; enterprise pricing on request.",
          "Pastors.ai — Type: Sermon chat and content generation. Doctrinal control: Moderate (sermon-scoped). Citations: Limited. Member-facing chat: Yes. Pricing: Free tier; from $30/month.",
          "Church.tech — Type: Video sermon repurposing. Doctrinal control: Partial (repurposes your video). Citations: No. Member-facing chat: No. Pricing: Tiered; free trial.",
          "Logos Bible Software — Type: Pastoral study and sermon prep. Doctrinal control: N/A (research tool). Citations: Source-linked. Member-facing chat: No. Pricing: Free to $1,000+.",
          "MinistryAI — Type: All-in-one pastor assistant. Doctrinal control: Low (general model). Citations: No. Member-facing chat: No. Pricing: $39/month.",
          "FaithBased.ai — Type: White-label church chatbot. Doctrinal control: Moderate (custom-trained). Citations: Varies. Member-facing chat: Yes. Pricing: Custom.",
          "ACS Realm — Type: Church management with AI features. Doctrinal control: N/A (admin tool). Citations: N/A. Member-facing chat: No. Pricing: Enterprise.",
          "OpusClip — Type: Video clip generation. Doctrinal control: N/A (editing tool). Citations: N/A. Member-facing chat: No. Pricing: Free tier; from ~$15/month.",
        ],
      },
      {
        heading: "Final advice: start with the problem, not the tool",
        paragraphs: [
          "Most churches need one, maybe two AI tools. Not ten. Before evaluating any product, name the specific problem you are trying to solve. If the problem is 'my members cannot find our teaching when they need it most,' you need a retrieval and doctrinal Q&A tool. If the problem is 'we spend 15 hours a week turning sermons into social content,' you need a content repurposing tool. If the problem is 'our admin team is drowning in communication tasks,' you need an admin assistant.",
          "Buy the tool that solves the problem you actually have. Ignore the tool that solves ten problems you do not have. And for anything that speaks to your congregation on your behalf — anything member-facing, anything that answers theological questions, anything that uses the name of your church — demand full doctrinal control, visible citations, and honest silence when the answer is not there. Your people deserve at least that much.",
        ],
      },
    ],
    churchRelevance: {
      title: "See what full doctrinal control actually looks like",
      body: "Doctrinally.AI gives your church complete control over every answer your members receive. Upload your sermons, devotions, and documents. Every response is grounded in your content and cited to the exact source. When your church has not addressed a topic, we say so — no internet theology, no hallucinated verses, no doctrinal drift. If you want to see what it feels like when a member asks a hard question and hears your pastor's voice back instead of an algorithm's, try it with a few sermons and decide for yourself.",
    },
  },
  {
    slug: "the-church-and-ai",
    title:
      "The Church and AI: A Pastor's Guide to Artificial Intelligence in Ministry",
    description:
      "A complete, Scripture-first guide to AI for churches — what it is, whether it is biblical to use, how congregations are already using it, the real risks, and the guardrails that keep it faithful.",
    category: "Platform",
    publishedAt: "2026-04-11",
    readMinutes: 12,
    author: "The Doctrinally.AI Team",
    excerpt:
      "Every pastor in America is going to have to answer questions about AI this year. Here is a careful, Scripture-first guide to what the church actually needs to know — and how to use AI in ministry without surrendering your pulpit.",
    sections: [
      {
        paragraphs: [
          "Artificial intelligence is no longer an abstract debate happening somewhere in Silicon Valley. It is in the pockets of every member of your congregation, in the search bar they open when they cannot sleep, and in the chatbot that answers their theological questions before you ever get the chance. Whether the church engages thoughtfully with AI or not, AI is already engaging with the church.",
          "This guide is written for pastors, elders, and ministry leaders who want a careful, Scripture-first walk through the subject. It answers the most common questions Christians are asking about the church and AI — what it is, whether it is biblical to use, how congregations are already using it, the risks that deserve real weight, and the guardrails that separate faithful use from a theological slot machine.",
          "Our aim is not to sell you on a particular view. Our aim is to make sure that when your members ask you about AI this year — and they will — you have thought about it longer and more honestly than the algorithm has.",
        ],
      },
      {
        heading: "What is artificial intelligence, in plain language?",
        paragraphs: [
          "Most of what the public calls 'AI' today is a specific kind of tool: a large language model. A large language model is a program trained on enormous amounts of text until it learns to predict, at a statistical level, what words tend to follow other words. When you type a question, the model produces an answer not by reasoning the way a pastor does, but by assembling a response that is likely, given its training.",
          "That simple definition matters pastorally. It explains why AI sometimes sounds brilliant and sometimes hallucinates a Bible verse that does not exist. It is not lying in any conscious sense. It is producing what is statistically likely to come next — and if the most statistically likely next sentence happens to be wrong, the model will still say it with total confidence.",
          "A faithful conversation about AI in the church has to start here. AI is not a person. It is not a mind. It is a pattern-matching tool that can be extraordinarily useful and extraordinarily misleading, depending on how it is built and how it is used.",
        ],
      },
      {
        heading: "Is it biblical for a church to use AI?",
        paragraphs: [
          "Scripture does not mention artificial intelligence. It does, however, speak clearly about technology, tools, stewardship, truth-telling, and the responsibility of teachers. From those principles, most thoughtful Christians land in roughly the same place: AI is a tool, and like every tool in history, it can be used faithfully or foolishly.",
          "The Bible repeatedly treats human-made tools as morally neutral in themselves and morally weighty in their use. A plow can feed a family or be left to rust. A printing press can distribute Bibles or propaganda. A microphone can carry a sermon to a shut-in or amplify a false teacher. AI belongs in that same family of tools: powerful, flexible, and always answerable to the character of the person using it.",
          "Where Scripture speaks most directly is on the character side of the equation. Teachers will be judged more strictly (James 3:1). The Lord detests lying lips (Proverbs 12:22). Shepherds are called to feed the flock with knowledge and understanding (Jeremiah 3:15). None of those verses forbid the use of a new tool. All of them constrain how it can be used. A church that adopts AI without thinking about truth, accuracy, and accountability is not being neutral. It is being careless.",
          "The short answer to 'is it biblical to use AI?' is the same short answer Scripture gives for most tools: yes, with wisdom, with honesty, and under submission to the same standards of truth-telling that apply to everything else that comes out of the church.",
        ],
      },
      {
        heading: "How churches are already using AI in 2026",
        paragraphs: [
          "AI in ministry has moved from hype to habit in a very short window. It is worth knowing what churches are actually doing with it today, not in theory but in practice, because the gap between the two has narrowed quickly.",
          "The most common uses fall into a handful of categories. Some pastors use AI for research — quickly pulling together cross-references, summarizing a theological position for a sermon, or surfacing passages on a given topic. Others use it for communication — drafting announcements, editing a newsletter, or translating a bulletin into Spanish or Korean. A growing number are using it for retrieval — turning their church's own sermon archive into something members can search in plain English.",
          "The last category is the one that has surprised pastors the most. Most churches have years of teaching sitting on a hard drive or a YouTube channel, functionally invisible to the people who would benefit from it most. A retrieval-focused AI tool does not generate new theology; it surfaces what your church has already taught and links the member back to the original source. A question that would have disappeared into the internet now returns your pastor's actual voice.",
          "What is not working as well: using AI to write sermons from scratch, to counsel people in crisis, or to answer theological questions from the open internet with no guardrails. Every pastor who has tried those uses has a story about where the model went wrong, and most of them have quietly pulled back.",
        ],
      },
      {
        heading: "The real risks of AI in the church",
        paragraphs: [
          "Every honest conversation about AI in ministry needs to name the risks, because they are real and they deserve weight. The goal is not to scare anyone away from the technology. It is to make sure the church adopts it with eyes open.",
          "The first risk is hallucination. A language model trained on the open internet will, at some point, invent a Bible verse, misattribute a quote to a theologian who never said it, or fabricate a fact with total confidence. In a ministry context, that is not a harmless quirk. It is a teacher saying something that is not true in a place where trust matters.",
          "The second risk is theological drift. Most general-purpose AI tools are trained on a broad mix of sources and will answer a theological question using whatever the internet has most loudly said about it. A member who asks a generic chatbot, 'What does your church believe about baptism?' will not get an answer rooted in your church. They will get an average of the internet. That is not neutrality. That is theological outsourcing.",
          "The third risk is the loss of the pastoral relationship. AI cannot sit with a grieving widow. It cannot show up at the hospital. It cannot recognize when the real question behind the question is a confession waiting to happen. Any use of AI that nudges a church toward replacing relationships with convenience is a use the church should refuse.",
          "The fourth risk is privacy. Many AI tools log, store, or even train on the content people type into them. A pastor who pastes a sensitive counseling note into a general-purpose chatbot has just exposed a member's story to a system whose data practices they may not fully understand. Any church use of AI needs to take that risk seriously.",
        ],
      },
      {
        heading: "What healthy AI guardrails look like",
        paragraphs: [
          "Most of the churches using AI well have converged on a small set of principles. These are not rules handed down from on high. They are the lessons people learned the hard way, and they are worth stating plainly.",
          "First, known sources. The AI should be grounded in content your church has actually produced — sermons, devotions, documents, Scripture — rather than the open internet. If the model can only draw from material you control, the risk of theological drift drops dramatically.",
          "Second, visible citations. Every answer the AI gives should be traceable back to a specific source, so a member can verify it, a pastor can audit it, and no claim is accepted on the model's word alone. Citations are the difference between AI as a research assistant and AI as a rumor mill.",
          "Third, honest silence. A faithful church AI should be willing to say, 'Your church has not spoken to this yet,' rather than making something up to fill the gap. A model that cannot say 'I don't know' is a model that will eventually teach your people something you never said.",
          "Fourth, human accountability. AI should surface what your church has taught; it should never pretend to be the one teaching it. The member should always be able to trace the answer back to a human pastor and a real message. That is what distinguishes an AI that extends ministry from an AI that impersonates it.",
        ],
      },
      {
        heading: "How to choose an AI tool for your church",
        paragraphs: [
          "If your church is weighing whether to adopt an AI tool, there are a handful of questions worth asking before you sign up for anything. These questions apply regardless of which vendor you are evaluating, including ours.",
          "Where does the tool get its answers? If the answer is 'the open internet,' you are not choosing a church AI; you are choosing a general chatbot with a church logo pasted on it. Look for tools that are grounded in content you upload and control.",
          "Can you see the sources? Any answer that cannot be traced back to a specific sermon, document, or Scripture passage should be treated with suspicion. Transparency is not a feature; it is a prerequisite.",
          "Who owns the content? If you upload years of sermons and then decide to leave the platform, can you take that content with you? A healthy vendor relationship treats your teaching as yours, not as their proprietary dataset.",
          "What happens when the AI doesn't know? A good church AI will say so. A bad one will hallucinate. Ask for a demo and try to break it with a question your church has never addressed. The answer you get will tell you everything.",
          "How are members' questions handled? Are they stored, logged, anonymized, or used to train future models? Your congregation's private questions are not training data, and a serious church AI vendor will be clear about that.",
        ],
      },
      {
        heading: "Frequently asked questions about the church and AI",
        paragraphs: [
          "Will AI replace pastors? No serious Christian thinker believes it will, and the churches using AI well are not trying to. A language model cannot baptize, preside at a table, sit with the grieving, confront sin, or love a congregation into maturity. AI can extend the reach of a pastor's teaching into hours the pastor cannot physically be in the room. It cannot replace the pastor in that room.",
          "Is it wrong to use AI to help write a sermon? Most pastors who have thought carefully about this draw a distinction between using AI as a research assistant — surfacing cross-references, reminding you of a historical quote, helping you outline — and using AI as a ghostwriter that produces the sermon you then read aloud. The first is the same kind of help a commentary or a concordance gives. The second is something every pastor should wrestle with honestly, because the pulpit is a place where your own wrestling with Scripture is part of the offering.",
          "Can AI answer theological questions accurately? Only to the degree that it is grounded in a trustworthy source. A general chatbot trained on the open internet will give a confident answer to almost any theological question, and that answer will sometimes be wrong in ways a member cannot detect. An AI grounded only in your church's own teaching, with visible citations, is a very different tool — less impressive in breadth, much more trustworthy in depth.",
          "Is using AI in the church 'playing God'? This is a real concern and it is worth taking seriously rather than waving away. The short answer is that the church has used tools for two thousand years — scrolls, codices, printing presses, radios, projectors, live streams — without believing that any of them were usurping God's role. AI belongs on that list, not on a separate moral plane. What matters is that the tool stays a tool, and that the teaching stays accountable to Scripture and to a human shepherd.",
          "What does Scripture say about AI specifically? Nothing — which is part of why this conversation has to happen pastorally rather than proof-textually. What Scripture does say, over and over, is that teachers are accountable, that truth matters, that the sheep belong to the Shepherd, and that any tool the church uses must serve those things rather than compete with them. Those principles are enough to guide almost every decision a church will need to make about AI in the years ahead.",
        ],
      },
      {
        heading: "The shift that is actually happening",
        paragraphs: [
          "Strip away the hype and the hand-wringing, and the real story of AI in the church is smaller and more hopeful than either the enthusiasts or the alarmists say. For the first time, a church's own teaching — not a generic average of the internet, but the specific voice of a specific shepherd — can travel with its members into the hours between Sundays. A question at 2 a.m. can get an answer rooted in a sermon from three years ago. A visitor in the parking lot can explore what your church actually believes before they ever meet a staff member. A pastor can see, for the first time, what their people are actually wrestling with in private.",
          "That is not a replacement for discipleship. It is not a replacement for pastoring. It is not a replacement for the slow, hard, sacred work of knowing real people by name. It is a quiet extension of the teaching ministry your church is already doing, into the hours when nobody can physically be in the room. Used with wisdom, that is a gift. Used without it, it is a risk the church has always known how to name: a teacher without accountability.",
          "Either way, AI is not waiting for the church to decide. It is already in your members' hands. The only question is whether your voice is the one they hear when they use it.",
        ],
      },
    ],
    churchRelevance: {
      title: "Your church's voice, grounded in your church's teaching",
      body: "Doctrinally.AI is built around one conviction: when a member of your congregation asks a question, the first voice they hear should be yours. We ingest your sermons, devotions, YouTube videos, and documents, and turn them into a chat experience grounded in what your church has actually taught. Every answer is cited back to the original source. Nothing is invented. Nothing comes from the open internet. When your church has not spoken to a question, we say so — honestly. It is the same guardrail every pastor wishes every tool their members used would honor.",
    },
  },
  {
    slug: "what-does-the-bible-say-about-money",
    title: "What Does the Bible Say About Money and Wealth?",
    description:
      "A careful walk through what Scripture actually teaches about wealth, generosity, debt, and tithing — and why members want to hear it from their own pastor.",
    category: "Scripture & Theology",
    publishedAt: "2026-04-08",
    readMinutes: 9,
    author: "The Doctrinally.AI Team",
    excerpt:
      "Money is one of the most talked-about topics in the Bible — and one of the most avoided from the pulpit. Here is a fair, Scripture-first look at what Christians actually believe about wealth.",
    sections: [
      {
        paragraphs: [
          "Jesus talks about money more than almost any other topic. There are more verses in the Bible about wealth, generosity, debt, and the dangers of greed than there are about heaven, hell, or prayer. And yet for many Christians, money is the subject they are least likely to hear a careful sermon on — and most likely to ask about in private.",
          "This article is not financial advice. It is a fair, Scripture-first walk through what the Bible actually teaches about money, where faithful Christians agree, and where they disagree. It is meant for the member who has a real question and does not want a cliché in return.",
        ],
      },
      {
        heading: "Is wealth good or bad?",
        paragraphs: [
          "Scripture refuses to answer this question in a single word. On one hand, wealth is repeatedly described as a blessing. Abraham, Job, and Solomon were all wealthy men whose prosperity is treated as part of God's favor. Proverbs connects diligence and wisdom to flourishing, and the New Testament never condemns the existence of rich Christians as such.",
          "On the other hand, Scripture is relentlessly honest about the spiritual danger of wealth. Jesus warns that it is harder for a rich person to enter the kingdom than for a camel to pass through the eye of a needle (Matthew 19:24). Paul tells Timothy that the love of money is a root of all kinds of evil (1 Timothy 6:10). The book of James is perhaps the sharpest: wealth that has been hoarded rather than shared is treated as a witness against its owner.",
          "The biblical posture is not 'money is bad.' It is 'money is dangerous, and generosity is the antidote.'",
        ],
      },
      {
        heading: "What about tithing?",
        paragraphs: [
          "This is where Christians divide. Some churches teach that the 10% tithe of the Old Testament remains a binding minimum for believers today, pointing to passages like Malachi 3:10 and to Jesus's own affirmation of tithing in Matthew 23:23. For these Christians, the tithe is a starting line, not a finish line.",
          "Other Christians argue that the New Testament shifts the category entirely. In 2 Corinthians 8–9, Paul calls believers to give generously, cheerfully, and sacrificially — but he never names a percentage. On this reading, the tithe was tied to the old covenant, and Christians are now called to something potentially more demanding: proportional, joyful, Spirit-led generosity without a fixed floor.",
          "Most faithful Christians agree on the substance even when they disagree on the number: the posture of the heart matters more than the decimal point, and a church that only talks about giving when the budget is tight is not teaching the full counsel of Scripture.",
        ],
      },
      {
        heading: "What Scripture says about debt",
        paragraphs: [
          "Proverbs 22:7 warns that the borrower is slave to the lender. Romans 13:8 tells Christians to owe no one anything except to love one another. These verses have been used to argue everything from 'never take on a mortgage' to 'simply be wise about what you borrow.'",
          "The clear center of the biblical teaching is freedom. Debt is not treated as a sin, but it is treated as a form of bondage that makes other forms of obedience harder. A Christian weighed down by credit card interest is less free to give, to serve, and to respond to need. Most pastors land here: debt is not forbidden, but it is never to be entered into lightly, and escaping it when possible is an act of stewardship.",
        ],
      },
      {
        heading: "Generosity is the center of the biblical picture",
        paragraphs: [
          "If there is a unifying thread, it is this: money is given so that it can be given away. The early church in Acts 2 and 4 models radical generosity. 2 Corinthians 9 promises that God loves a cheerful giver. Jesus commends the widow who gave two small coins precisely because she gave out of poverty, not surplus.",
          "This is the heart of what the Bible says about money, and it is the heart most members are hungry to understand. They do not need a quick answer from a financial influencer. They need their pastor's voice, grounded in the text, walking them through it honestly.",
        ],
      },
    ],
    churchRelevance: {
      title: "Your members are asking this question quietly",
      body: "Money is one of the hardest things to bring up on a Sunday and one of the hardest things to sit on in private. When a member wants to know what your church has actually taught about wealth, debt, or generosity, they should be able to ask and hear your pastor's voice back — not a stranger online. Doctrinally.AI makes every sermon and devotion your church has ever produced searchable, with citations back to the original source. That is discipleship that stays with your people into the rest of the week.",
    },
  },
  {
    slug: "should-christians-support-israel",
    title: "Should Christians Support Israel?",
    description:
      "A fair look at both sides of a question dividing Christians today — and why your church needs a thoughtful answer ready.",
    category: "Cultural Questions",
    publishedAt: "2026-03-28",
    readMinutes: 9,
    author: "The Doctrinally.AI Team",
    excerpt:
      "Few questions generate more heat in the modern church than the Christian's relationship to the modern state of Israel. Here are the honest arguments on both sides.",
    sections: [
      {
        paragraphs: [
          "Few questions generate more heat inside the modern American church than the Christian's relationship to the modern state of Israel. Ask it on a Sunday morning and you'll hear everything from unqualified support rooted in biblical prophecy to sharp criticism grounded in concern for Palestinian Christians and civilians. Both answers come from people who love Scripture and want to be faithful.",
          "This article does not take a side. It lays out the strongest arguments Christians make for and against support of Israel, the Scripture each side leans on, and why it matters that your church is prepared to walk members through the question with care.",
        ],
      },
      {
        heading: "Why the question is so charged",
        paragraphs: [
          "Support for Israel sits at the intersection of theology, geopolitics, and lived experience. For some believers, it is a test of biblical faithfulness. For others, it is a test of Christian witness in a region that contains the oldest Christian communities on earth. Because those convictions run deep, many pastors avoid the topic entirely — which leaves members to form their views from cable news and social media instead of from their church.",
        ],
      },
      {
        heading: "The case for Christian support of Israel",
        paragraphs: [
          "Christians who support Israel typically point to the covenant God made with Abraham in Genesis 12, where God promises to bless those who bless Abraham's descendants. Many read this as a standing commitment that continues to shape God's posture toward the Jewish people today.",
          "Some also hold a dispensational reading of Scripture in which the modern regathering of Jews to the land is seen as a fulfillment or foreshadowing of prophecy in passages such as Ezekiel 36–37 and Romans 11. On this view, standing with Israel is not merely a political preference but an act of alignment with what God is doing in history.",
          "Others take a more pragmatic line. They argue that Israel is the only religiously pluralistic democracy in the region, that Jewish people have faced centuries of persecution, and that Christians — particularly in light of the church's own historical failures toward Jewish neighbors — have a moral duty to stand against antisemitism wherever it appears.",
        ],
      },
      {
        heading: "The case against uncritical Christian support of Israel",
        paragraphs: [
          "Christians who are more critical of modern Israel often begin with a different reading of the New Testament. They argue that in Christ, the promises to Abraham are fulfilled in the church — made up of Jew and Gentile alike — and that the modern nation-state of Israel should not be confused with the biblical people of God. Galatians 3 and Ephesians 2 are frequently cited.",
          "Many also point to the Palestinian Christian community, which traces its roots directly to the early church. They ask whether unqualified support for Israeli state policy can be squared with love for these brothers and sisters, who often live under the effects of occupation and conflict.",
          "Still others approach the issue primarily through a just-war or pro-life ethic. They support Israel's right to exist and defend itself, but they also believe Christians are obligated to speak honestly about civilian harm, proportionality, and the dignity of every image-bearer — Israeli and Palestinian alike.",
        ],
      },
      {
        heading: "Where thoughtful Christians tend to agree",
        paragraphs: [
          "Even Christians who disagree sharply on policy tend to agree on a few things. Antisemitism is a sin the church must reject without qualification. Palestinian Christians are our brothers and sisters, not abstractions. Simple political slogans — in either direction — rarely capture the weight of Scripture on questions of justice, covenant, and peacemaking.",
          "Perhaps most importantly, they agree that silence from the pulpit is not neutrality. When the church does not speak, people form their convictions somewhere else.",
        ],
      },
    ],
    churchRelevance: {
      title: "Why your church needs to be ready for this question",
      body: "Your members are already asking this question — in small groups, around dinner tables, and in their heads during the news. If they cannot get a thoughtful, Scripture-rooted response from their church, they will get one from an algorithm. Doctrinally.AI lets your congregation ask hard questions like this one and get answers drawn from your sermons, your teaching, and Scripture — not from the internet at large. You decide what your church has said. The AI simply helps members find it.",
    },
  },
  {
    slug: "what-does-the-bible-say-about-anxiety",
    title: "What Does the Bible Say About Anxiety?",
    description:
      "Why anxiety is one of the most-asked questions in the modern church — and how your pulpit's voice belongs in the answer.",
    category: "Scripture & Theology",
    publishedAt: "2026-03-15",
    readMinutes: 6,
    author: "The Doctrinally.AI Team",
    excerpt:
      "Anxiety is one of the most searched spiritual questions of the decade. Here's how to think about it faithfully — and why your church's voice is the one your members actually need.",
    sections: [
      {
        paragraphs: [
          "Anxiety is one of the most searched spiritual questions of the decade. It shows up in sermon requests, in small groups, in counseling appointments, and in the late-night phone scrolls of people who want to know whether God has anything to say to them at 2 a.m.",
          "The answer Scripture gives is more layered than a single verse. It involves trust, lament, community, the nearness of God, and sometimes the faithful use of medical care. Christians who try to flatten it in either direction — as though anxiety is either purely a sin issue or purely a medical one — usually miss what the Bible actually teaches.",
        ],
      },
      {
        heading: "Verses people gravitate toward",
        paragraphs: [
          "Philippians 4:6–7, Matthew 6:25–34, 1 Peter 5:7, and Psalm 34 are the passages members bring to their pastors most often. Each one is deeply pastoral, and each one resists being turned into a slogan. Philippians is a call to prayer, not to suppression. Jesus's words in Matthew 6 are a meditation on the Father's care, not a rebuke. 1 Peter invites casting — a posture of handing over, not tidying up.",
        ],
      },
      {
        heading: "What your members really need",
        paragraphs: [
          "When members ask this question, they are rarely asking for trivia. They are asking whether God sees them and whether their church has something to say that will actually help them get out of bed tomorrow. A reassuring quote from an influencer on social media cannot replace what a faithful pastor has already taught from your pulpit.",
        ],
      },
    ],
    churchRelevance: {
      title: "Why your sermons belong in the answer",
      body: "Your church has probably already preached on anxiety — maybe several times, maybe in a way your members have forgotten. Doctrinally.AI makes everything your pastors have taught searchable and citable, so a member in a hard moment can type a question and hear your church's voice back, with a direct link to the sermon it came from. That is not a replacement for discipleship. It is a way of extending it into the 2 a.m. hours.",
    },
  },
  {
    slug: "searchable-sermons-with-ai",
    title: "Your Sermons Deserve a Second Life",
    description:
      "Most sermons get heard once and forgotten. Here's what changes when everything your church has ever preached becomes searchable.",
    category: "Platform",
    publishedAt: "2026-03-10",
    readMinutes: 5,
    author: "The Doctrinally.AI Team",
    excerpt:
      "Most sermons are heard once and forgotten. Doctrinally.AI gives every message, devotion, and document you've ever produced a second life in the hands of your congregation.",
    sections: [
      {
        paragraphs: [
          "Think about the last sermon that wrecked you. Now try to remember the one from six months ago on the same topic. Most of us can't — and neither can the people in your pews.",
          "That is not a failure of attention. It is how memory works. But it means that most of the teaching your church produces has a shelf life of roughly seven days, even when it took forty hours to prepare.",
        ],
      },
      {
        heading: "What changes when your content is searchable",
        paragraphs: [
          "Doctrinally.AI ingests your sermons, devotions, YouTube videos, and documents, and turns them into a chat interface your congregation can actually use. A member with a question at 11 p.m. can ask it, and the first voice they hear is yours — with a citation back to the exact sermon or document it came from.",
          "For members, it feels like the church is present outside of Sunday. For pastors, it means the work you have already done keeps working. A sermon from three years ago can still be the answer to someone's worst week.",
        ],
      },
      {
        heading: "What this is not",
        paragraphs: [
          "Doctrinally.AI is not a replacement for preaching, for pastoring, or for the Bible. It is a way of extending the voice of your church into the hours you can't be in the room. Every answer is grounded in what your church has actually taught, and every citation links back to the source so nothing is invented on your behalf.",
        ],
      },
    ],
    churchRelevance: {
      title: "Built for churches that teach deeply",
      body: "Doctrinally.AI is built around the assumption that your church has something to say. We don't generate theology. We surface yours. If your church is serious about teaching and wants that teaching to keep reaching people between Sundays, this is what we built the platform for.",
    },
  },
  {
    slug: "how-ai-changes-church-communication",
    title: "How AI is Changing the Way Churches Communicate",
    description:
      "A practical look at how AI is reshaping church communication — and the guardrails that keep it faithful.",
    category: "Platform",
    publishedAt: "2026-03-05",
    readMinutes: 6,
    author: "The Doctrinally.AI Team",
    excerpt:
      "AI is already reshaping how churches communicate with their members. The question isn't whether it will enter ministry — it's whether it will do so with guardrails.",
    sections: [
      {
        paragraphs: [
          "AI is already inside your members' phones, their search bars, and their late-night questions. The only real decision a church has is whether it wants a voice in those conversations or not.",
          "Used carelessly, AI can become a theological slot machine — confident, fluent, and wrong. Used well, it can make decades of faithful teaching accessible to the person who needs it most, exactly when they need it.",
        ],
      },
      {
        heading: "The difference is the source",
        paragraphs: [
          "General-purpose chatbots answer from the open internet. That means your member might get their theology from a blog, a Reddit thread, or an influencer who has never been inside a church. Doctrinally.AI is built on a different assumption: the answer should come from your church.",
          "Every response is grounded in the sermons, devotions, and documents you upload, plus Scripture itself. Every claim is cited. If your church has not spoken to a question, the platform is honest about that instead of inventing an answer.",
        ],
      },
      {
        heading: "Guardrails that matter",
        paragraphs: [
          "Responsible AI in ministry means three things: known sources, visible citations, and a clear separation between what the church has actually taught and what the model might speculate. Doctrinally.AI is designed around those three commitments, because anything less turns your pulpit into a rumor.",
        ],
      },
    ],
    churchRelevance: {
      title: "Your teaching, your voice, your guardrails",
      body: "The point of Doctrinally.AI is not to replace pastors with an algorithm. It is to give pastors a way to meet their congregation in the moments they cannot physically be there, without surrendering the answer to the open internet. Every response is grounded in your church's content. Every citation links back to the source. Your voice stays your voice.",
    },
  },
  {
    slug: "what-does-the-bible-say-about-suffering",
    title: "What Does the Bible Say About Suffering?",
    description:
      "A careful look at how Scripture actually speaks to pain, grief, and hardship — and why a cliché is the last thing a suffering member needs from their church.",
    category: "Scripture & Theology",
    publishedAt: "2026-04-02",
    readMinutes: 7,
    author: "The Doctrinally.AI Team",
    excerpt:
      "Suffering is one of the deepest questions a member can bring to their pastor. Here is what the Bible actually teaches — and why a cliché is the last thing they need.",
    sections: [
      {
        paragraphs: [
          "Sooner or later, every member of your congregation will ask some version of this question: where was God when it hurt? Sometimes they will ask it out loud. More often, they will ask it in the dark, in the car, in the waiting room, in the months after a diagnosis or a funeral.",
          "The Bible is not shy about suffering. In fact, roughly a third of the Psalms are laments, and entire books — Job, Lamentations, parts of Ecclesiastes — exist precisely so the people of God can speak honestly about pain. This article is a short walk through what Scripture actually says, so your members do not have to settle for a slogan.",
        ],
      },
      {
        heading: "God does not flinch from hard questions",
        paragraphs: [
          "One of the most striking things about Scripture is how much room it makes for the honest complaint. Job demands an audience with God. Jeremiah accuses God of deceiving him. David asks, 'How long, O Lord?' Jesus himself, on the cross, cries out with the words of Psalm 22: 'My God, my God, why have you forsaken me?'",
          "This matters pastorally. A suffering member is not being faithless when they ask God a hard question. They are doing what the Bible shows the most faithful people doing. A church that cannot sit inside a lament with its members has not learned from the Psalms.",
        ],
      },
      {
        heading: "Romans 8 and the hope that does not explain too much",
        paragraphs: [
          "Romans 8:28 is one of the most quoted verses in the English-speaking church: 'And we know that for those who love God all things work together for good.' It is also one of the most misused. Torn out of context, it becomes a slogan aimed at shutting grief down.",
          "In context, Paul is not promising that every hard thing feels good or looks good. He is promising that God is at work, even in groaning, even in weakness, even in creation's own straining toward redemption (Romans 8:18–27). The hope he offers is not that the pain is secretly pleasant. The hope is that God is present in it and will not lose his people through it.",
        ],
      },
      {
        heading: "The mystery Scripture does not resolve",
        paragraphs: [
          "The Bible never fully answers the 'why' of any particular person's suffering. Job is given an audience with God and receives a response that reorients him but does not explain his loss. That is not an accident. Scripture is more interested in teaching us who God is in the middle of our suffering than in explaining why suffering is permitted in any given case.",
          "What your members need from a sermon on this topic is not a theodicy. It is a pastor who has sat inside the biblical text long enough to speak without cliché, and a church where honest questions are met with presence rather than platitudes.",
        ],
      },
    ],
    churchRelevance: {
      title: "Your hardest sermons are the ones members come back to",
      body: "The sermons your church has preached on suffering are probably the ones members most wish they could find again in the moment they need them. Doctrinally.AI makes that possible. A member in a hard season can ask a question and hear their pastor's voice, cited back to the exact message. It is not a replacement for pastoral care — it is a way of extending your care into the hours you cannot be in the room.",
    },
  },
  {
    slug: "should-christians-drink-alcohol",
    title: "Should Christians Drink Alcohol?",
    description:
      "A fair look at the three main Christian positions on alcohol — total abstinence, moderate use, and freedom with wisdom — and the passages each side leans on.",
    category: "Cultural Questions",
    publishedAt: "2026-03-31",
    readMinutes: 8,
    author: "The Doctrinally.AI Team",
    excerpt:
      "Alcohol is one of the oldest debates in the American church. Here is a neutral summary of the three main positions — and why the Bible refuses to let any of them be lazy.",
    sections: [
      {
        paragraphs: [
          "Few questions have split American evangelicals more quietly than whether Christians should drink alcohol. Some denominations teach total abstinence. Some teach moderation. Some teach freedom with wisdom. And in the background, Scripture itself has plenty to say — but not what either extreme usually wants it to say.",
          "This article lays out the three most common Christian positions, the biblical arguments each makes, and the convictions most thoughtful Christians end up sharing even when their conclusions differ.",
        ],
      },
      {
        heading: "The case for total abstinence",
        paragraphs: [
          "Christians who hold to total abstinence typically frame their view not as a legalistic rule but as a witness decision. They point to the devastation alcohol has caused in families, in marriages, in churches, and in the lives of people they love. Many argue that the wisest and most loving posture — particularly for leaders — is to refuse something that Scripture repeatedly warns can destroy a life (Proverbs 20:1, 23:29–35; Ephesians 5:18).",
          "Some also appeal to the principle in Romans 14 and 1 Corinthians 8, where Paul teaches that love for a weaker brother may require setting aside a freedom. For a Christian who has watched alcohol ruin a friend or a father, abstinence is not primarily about self-denial. It is about not putting a stumbling block in front of someone else.",
        ],
      },
      {
        heading: "The case for moderate use",
        paragraphs: [
          "Christians who practice moderate use typically begin with Scripture's own honesty. Wine is a gift from God in Psalm 104:15, given 'to gladden the heart of man.' Jesus turned water into wine at Cana as his first public miracle, and the Last Supper is centered on a cup. Paul even instructs Timothy to take a little wine for the sake of his stomach (1 Timothy 5:23).",
          "On this reading, the Bible distinguishes sharply between use and abuse. Drunkenness is condemned. Wine itself is not. The goal for the Christian is not avoidance but wisdom: enjoying a good gift without being mastered by it, and being willing to set it aside when love requires.",
        ],
      },
      {
        heading: "The case for freedom with wisdom",
        paragraphs: [
          "A third group holds something close to moderation but frames it around Christian liberty. They argue that Scripture leaves the decision largely to the individual conscience, informed by the clear prohibitions against drunkenness, the principle of love for a weaker brother, and the particular vulnerabilities a Christian may know about themselves.",
          "For this group, the question isn't whether drinking is permitted but whether it is wise in a given season, for a given person, in a given context. A young pastor in recovery might decide to abstain. A couple enjoying a glass of wine over dinner might not. Both can be acting in obedience.",
        ],
      },
      {
        heading: "Where all three positions meet",
        paragraphs: [
          "Behind the disagreement, most careful Christians affirm the same core convictions. Drunkenness is a sin. Self-mastery is a fruit of the Spirit. Love for others — especially those for whom alcohol is dangerous — can and should constrain personal freedom. Wine is not evil in itself, but it is not morally neutral either; it is powerful, which is why Scripture keeps coming back to it.",
          "A pastor teaching on this well will treat it not as a culture-war question but as a discipleship one. Your members are not asking for a rule. They are asking how to follow Jesus in a specific, concrete area of their life.",
        ],
      },
    ],
    churchRelevance: {
      title: "A question members are too embarrassed to ask out loud",
      body: "Most members will not raise this question on a Sunday or in a small group. They will Google it, get a loud answer from someone who has never met them, and move on. Doctrinally.AI gives them a private way to ask their own church — and get a careful answer rooted in what their pastor has actually taught. Your voice, available in the moments when members are too self-conscious to call.",
    },
  },
  {
    slug: "church-qr-code-bulletin",
    title: "Why Every Church Should Put a QR Code in Sunday's Bulletin",
    description:
      "A practical case for putting a QR code in your church bulletin — and how it can turn a single sermon into an ongoing conversation with your congregation.",
    category: "Platform",
    publishedAt: "2026-03-27",
    readMinutes: 5,
    author: "The Doctrinally.AI Team",
    excerpt:
      "A QR code on Sunday's bulletin is one of the smallest changes your church can make — and one of the highest-leverage ones. Here is what happens when you actually do it.",
    sections: [
      {
        paragraphs: [
          "Printing a bulletin costs the same whether the congregation reads it once or keeps it in their car for a week. But a bulletin with a QR code on it can do something a traditional bulletin cannot: it can stay open long after the service is over, and it can hand the member a way to ask a question the moment it occurs to them.",
          "This is not a gimmick. Churches that have started using QR codes to link to their own content are quietly discovering one of the most effective engagement tools ministry has seen in years. Here is why it works.",
        ],
      },
      {
        heading: "A question at 10 a.m. turns into a question at 10 p.m.",
        paragraphs: [
          "The pastor preaches on forgiveness on Sunday morning. A member in the back row is sitting through it while thinking about a conversation she needs to have with her sister that week. On Sunday night, at 10 p.m., she remembers something from the sermon but cannot quite place it.",
          "Without a QR code, that moment is gone. With one, she pulls out her phone, scans the bulletin she still has in her bag, and asks a chat interface connected to her own church's teaching, 'What did Pastor Mike say about forgiving family members?' The answer comes back in her pastor's voice, cited to the exact sermon. She replays the clip. She makes the call.",
          "This is what a QR code enables: the sermon keeps working.",
        ],
      },
      {
        heading: "Visitors explore before they commit",
        paragraphs: [
          "Not every visitor is ready to talk to a stranger in a lobby. Many are ready to explore quietly from the back of the sanctuary or from the parking lot after the service. A QR code in the bulletin gives them that option.",
          "A first-time visitor can scan, ask a private question about what your church believes on baptism, marriage, suffering, or prayer, and get an answer drawn from your own sermons. It is the least confrontational on-ramp a church has ever had, and it requires zero staff time.",
        ],
      },
      {
        heading: "Your analytics suddenly get interesting",
        paragraphs: [
          "Most churches have no way to measure what members actually wonder about. A QR code that links to a church-specific chat changes that. Over time, you can see which topics are being asked about most, where members are hitting dead ends because you have not preached on something yet, and which sermons keep getting revisited.",
          "That is the kind of feedback loop pastors have always wanted and never had. It is not a replacement for pastoral relationships. It is a way to know your people better.",
        ],
      },
    ],
    churchRelevance: {
      title: "Put your teaching in the hands of your congregation",
      body: "Doctrinally.AI is designed to live on the back of a bulletin. Your church gets a unique URL and a QR code that members can scan to ask questions grounded in your own sermons, devotions, and documents. No login, no barrier, no hunting for answers in a stranger's feed. Print it once, and let your teaching keep working.",
    },
  },
  {
    slug: "how-churches-use-ai-in-2026",
    title: "How Churches Are Actually Using AI in 2026",
    description:
      "A practical look at the ways forward-thinking churches are using AI today — and the boundaries that keep it from becoming a shortcut around ministry.",
    category: "Platform",
    publishedAt: "2026-03-18",
    readMinutes: 7,
    author: "The Doctrinally.AI Team",
    excerpt:
      "AI has moved from hype to habit inside a lot of churches. Here is a practical look at what it is actually being used for — and the lines that matter.",
    sections: [
      {
        paragraphs: [
          "Two years ago, most church conversations about AI were nervous. Today, most of them are practical. Pastors are not asking whether to use AI; they are asking how to use it without accidentally turning their pulpit into a chatbot.",
          "This article is a plain look at how churches are actually using AI in 2026 — what is working, what is not, and what the boundaries look like for churches that take their teaching seriously.",
        ],
      },
      {
        heading: "1. Making sermons searchable",
        paragraphs: [
          "The single highest-leverage use of AI in ministry right now is turning the sermon archive into something your members can actually search. Most churches have years of teaching sitting on a YouTube channel or a hard drive that is functionally invisible. AI changes that.",
          "A member can ask a question in plain English and get an answer in their own pastor's voice, cited back to the sermon it came from. For the member, it feels like 24/7 access to their pastor. For the pastor, it means years of work keeps working.",
        ],
      },
      {
        heading: "2. Helping visitors explore privately",
        paragraphs: [
          "A lot of church visitors want to know what you believe before they ever talk to a human. AI gives them a safe, low-pressure way to ask. When that AI is grounded in your own sermons instead of the open internet, the answers they get are your answers.",
          "Churches that put a chat interface on their public site often see a surge in questions from visitors who are nowhere near ready to sign up for anything — and who are exactly the people who benefit from a thoughtful response.",
        ],
      },
      {
        heading: "3. Spotting content gaps from real questions",
        paragraphs: [
          "Church-specific AI creates a new kind of feedback loop. When members ask questions the church has not meaningfully addressed, pastors can see it in the analytics. Suddenly they know what their people are wrestling with in private — not what the loudest person in the lobby said, but what a hundred quiet members have asked in the last month.",
          "That is the kind of insight that used to require a survey. Now it happens passively, and it tends to shape preaching calendars for the better.",
        ],
      },
      {
        heading: "What AI should never be",
        paragraphs: [
          "There are lines. A church AI should not pretend to be a pastor. It should not invent theology. It should not smooth over a question it cannot answer. And it should never be trained on the open internet and then pointed at a congregation as if it speaks for the church.",
          "The rule most healthy churches are landing on is simple: the AI can surface what your church has already taught, and it can be honest when there is no answer. It cannot substitute for discipleship, and it cannot substitute for a human being willing to sit with someone in pain.",
        ],
      },
      {
        heading: "The shift that is actually happening",
        paragraphs: [
          "The most significant thing about AI in ministry is not the technology. It is that, for the first time, a church's own teaching can travel with its members into the hours between Sundays. That is a small shift on paper and a large one in practice. It is why the churches that are quietly leaning into this are not losing their theology — they are extending it.",
        ],
      },
    ],
    churchRelevance: {
      title: "Built around one rule: your voice, not ours",
      body: "Doctrinally.AI is designed around a single conviction — that the answers your members hear should come from your church, not from a generic model trained on the open internet. Every response is grounded in your sermons, devotions, and documents. Every citation links back to the source. You stay in charge of what your church teaches; we just make sure it reaches the people who need it, when they need it.",
    },
  },
];

export const blogCategories = [
  "All",
  "Cultural Questions",
  "Scripture & Theology",
  "Platform",
] as const;

export function getPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getAllSlugs(): string[] {
  return blogPosts.map((p) => p.slug);
}
