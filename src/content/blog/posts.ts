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
    slug: "should-christians-support-borders",
    title: "Should Christians Support Borders?",
    description:
      "Both the biblical case for national borders and the biblical case for welcoming the stranger — fairly represented, without a verdict.",
    category: "Cultural Questions",
    publishedAt: "2026-03-24",
    readMinutes: 8,
    author: "The Doctrinally.AI Team",
    excerpt:
      "Immigration is one of the most personal political questions in the American church. Here is what Christians on both sides are actually saying — and why your church's voice matters.",
    sections: [
      {
        paragraphs: [
          "Immigration is one of the most personal political questions in the American church. Some members are immigrants. Some work alongside them. Some live in communities where the cost of illegal crossings is felt every day. And all of them, if they are Christians, are looking to Scripture for guidance.",
          "This article does not argue for a policy. It lays out how faithful Christians arrive at different conclusions, what Scripture each side points to, and why pastors cannot afford to leave the question unanswered.",
        ],
      },
      {
        heading: "The case for strong borders",
        paragraphs: [
          "Christians who support strong national borders often begin with Romans 13, which teaches that governing authorities exist under God to maintain order and restrain evil. On this reading, orderly immigration policy is not opposed to Christian love; it is one of the specific goods a civil government is supposed to provide.",
          "Many also point to Nehemiah, who rebuilt the walls of Jerusalem, as a picture that borders can be a faithful, protective response to genuine threats. They argue that loving your neighbor includes loving your existing neighbors — including vulnerable citizens, lawful immigrants, and the communities most affected by cartels, trafficking, and unregulated crossings.",
          "A third strand emphasizes the distinction between the church and the state. The church, they argue, is called to welcome the stranger personally and sacrificially. The state is called to act justly on behalf of its citizens. Those are related callings but not identical ones, and collapsing them produces bad theology and bad policy.",
        ],
      },
      {
        heading: "The case for welcoming the stranger",
        paragraphs: [
          "Christians who take a more open posture typically begin with the sheer volume of Scripture on this theme. God's people are commanded again and again — in Exodus, Leviticus, Deuteronomy, and throughout the Prophets — to welcome the foreigner, because they themselves were once foreigners in Egypt. Leviticus 19:34 is a representative text: the stranger is to be treated as one born among you.",
          "They point to Jesus's own family fleeing to Egypt as refugees, to the parable of the Good Samaritan, and to Matthew 25, where Christ identifies himself with the stranger. For these Christians, hospitality to the immigrant is not a political preference but a matter of obedience.",
          "Some push further and argue that restrictive immigration policy disproportionately harms the most vulnerable people on earth, and that the church — which has historically led on refugee resettlement and care for displaced people — should be slow to support systems that make that care harder.",
        ],
      },
      {
        heading: "Common ground most Christians share",
        paragraphs: [
          "Behind the disagreement, most Christians on both sides affirm a few things. Immigrants are made in the image of God. Nations can have laws, and laws matter. The church has a distinct calling to love individual neighbors that is not fully discharged by any political outcome. And Scripture's clear concern for the vulnerable should shape how Christians talk about this topic — even when they disagree about the policy that best expresses it.",
        ],
      },
    ],
    churchRelevance: {
      title: "Why your church should speak into this",
      body: "Immigration isn't an abstraction for your members — it is their neighbor, their coworker, their family. When the church goes quiet on questions this close to home, trust leaks out. Doctrinally.AI gives your congregation a way to ask these questions and receive answers grounded in what your pastors have actually taught and in the Scriptures you preach from, with citations back to the source. It's a way to stay present in the conversations your members are already having.",
    },
  },
  {
    slug: "how-should-christians-feel-about-ice",
    title: "How Should Christians Feel About I.C.E.?",
    description:
      "A neutral look at the Christian arguments for and against Immigration and Customs Enforcement — and why churches need a careful answer.",
    category: "Cultural Questions",
    publishedAt: "2026-03-20",
    readMinutes: 7,
    author: "The Doctrinally.AI Team",
    excerpt:
      "Few federal agencies stir stronger Christian reactions than ICE. Here are the honest arguments from believers on both sides.",
    sections: [
      {
        paragraphs: [
          "Few federal agencies stir stronger Christian reactions than Immigration and Customs Enforcement. Some believers see ICE as a legitimate arm of a government God has ordained. Others see enforcement actions as a direct collision with Scripture's command to welcome the stranger. Most members sit somewhere in between — uncertain, uncomfortable, and looking to their church for clarity.",
          "This article stays neutral. It represents both sides as their own advocates make them, grounds each in Scripture, and closes with what your church can do about it.",
        ],
      },
      {
        heading: "The case Christians make in support of ICE",
        paragraphs: [
          "Christians who support ICE typically frame the agency as a necessary expression of Romans 13 — a civil authority empowered to enforce lawful borders and protect citizens. They point out that immigration enforcement, at its best, targets trafficking, cartel activity, and violent crime, all of which harm vulnerable people on both sides of the border.",
          "Many also argue that just law requires just enforcement. A country that writes immigration law but refuses to apply it is not showing mercy; it is showing dysfunction. On this view, supporting ICE is not opposed to loving immigrants. It is part of a framework that makes lawful, orderly, and humane immigration possible.",
        ],
      },
      {
        heading: "The case Christians make against ICE",
        paragraphs: [
          "Christians critical of ICE usually do not reject the need for immigration enforcement in principle. Their concerns are pastoral and practical. They point to detention conditions, family separations, and enforcement actions at or near churches and schools, and they ask whether the way enforcement is carried out can be reconciled with Scripture's concern for the foreigner, the widow, and the child.",
          "Many also bring up the Good Samaritan and Matthew 25, arguing that the posture Jesus commends toward a stranger in need cannot coexist comfortably with fear-based enforcement aimed at longtime residents and mixed-status families. For these Christians, the problem isn't the existence of ICE. It is specific policies and practices that they believe the church is obligated to name.",
        ],
      },
      {
        heading: "Where both sides tend to meet",
        paragraphs: [
          "Most thoughtful Christians on both sides affirm that immigration enforcement should be lawful, humane, and honest. They believe immigrants are image-bearers. They believe there is a legitimate role for the state, and a distinct, non-negotiable role for the church to love the specific people in front of it — regardless of status.",
          "The disagreement is usually about how to weigh those convictions against each other, not whether they are true.",
        ],
      },
    ],
    churchRelevance: {
      title: "Why your church cannot stay silent here",
      body: "ICE is not a distant story for many congregations. It touches your members' families, your volunteers, and your neighborhood. Staying silent doesn't keep the peace — it outsources the answer to whoever is loudest online. Doctrinally.AI helps your church speak clearly on difficult questions like this one by letting members ask, search, and find answers rooted in your own preaching and Scripture, with transparent citations every time.",
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
