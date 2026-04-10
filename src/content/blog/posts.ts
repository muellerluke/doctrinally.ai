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
    slug: "can-women-be-pastors",
    title: "Can Women Be Pastors? A Careful Look at Both Sides",
    description:
      "A fair, non-polemical summary of the egalitarian and complementarian arguments — the passages each side leans on, and why your church owes its members a thoughtful answer.",
    category: "Cultural Questions",
    publishedAt: "2026-04-05",
    readMinutes: 10,
    author: "The Doctrinally.AI Team",
    excerpt:
      "Few questions divide faithful Christians more than whether women can be pastors. Here is a neutral summary of what both sides actually believe — and why.",
    sections: [
      {
        paragraphs: [
          "Few questions divide faithful, Bible-believing Christians more than whether women can serve as pastors, elders, or senior teachers in the local church. The conversation has been going on for centuries, and it is not going away. In many congregations it is the single most personal doctrinal question a new member will ask.",
          "This article does not take a side. It represents the two most common positions — complementarian and egalitarian — as their own advocates make them, from Scripture. Both views are held by Christians who love the Bible and want to be faithful to it.",
        ],
      },
      {
        heading: "A note on the labels",
        paragraphs: [
          "Complementarian Christians hold that men and women are equal in dignity and worth, but that God has assigned distinct roles in the home and in the church, including that the office of pastor or elder is reserved for qualified men. Egalitarian Christians hold that men and women are not only equal in dignity but equally called to every office in the church, including senior pastoral leadership, based on gifting and character rather than gender.",
          "These are not caricatures. Both groups affirm the authority of Scripture and the full equality of men and women as image-bearers. They disagree about what Scripture actually teaches on church office.",
        ],
      },
      {
        heading: "The complementarian case",
        paragraphs: [
          "Complementarians typically begin with 1 Timothy 2:11–14, where Paul writes that he does not permit a woman to teach or exercise authority over a man. They argue that Paul grounds the instruction not in the culture of first-century Ephesus but in creation itself — specifically in the order of Adam and Eve — which suggests the principle transcends any particular moment in history.",
          "They also lean on 1 Timothy 3 and Titus 1, where the qualifications for elder are written in male terms, and on 1 Corinthians 11 and 14, where Paul speaks of a created order between men and women in the gathered worship of the church.",
          "Most complementarians are quick to clarify what they are not saying. They do not believe women should be silent in church. They do not believe women cannot teach. They do not believe women are spiritually inferior. They believe the specific office of elder or senior pastor — the role of authoritative teaching and shepherding the whole congregation — is biblically reserved for qualified men.",
        ],
      },
      {
        heading: "The egalitarian case",
        paragraphs: [
          "Egalitarians begin in a different place: Galatians 3:28 — 'There is neither Jew nor Greek, there is neither slave nor free, there is no male and female, for you are all one in Christ Jesus.' They argue that the trajectory of the New Testament moves toward equal participation in every ministry of the church, and that restricting pastoral office by gender is in tension with the gospel's own logic.",
          "They point to women leading in the New Testament: Phoebe as a deacon in Romans 16, Junia described as outstanding among the apostles, Priscilla teaching Apollos, and Paul's many female co-laborers in the gospel. They argue that these examples are hard to square with a blanket prohibition on female pastoral leadership.",
          "On the contested passages in 1 Timothy 2 and 1 Corinthians 14, egalitarians typically argue that Paul is addressing specific local situations — false teaching, disorder, or cultural dynamics — and that his instructions are pastoral corrections rather than universal rules for all churches in all ages.",
        ],
      },
      {
        heading: "Where honest disagreement lives",
        paragraphs: [
          "This is one of those questions where sincere, intelligent Christians read the same passages and reach different conclusions. It is not, as it is often portrayed, a question of whether you believe the Bible or not. Both sides believe the Bible. They disagree about how specific New Testament texts translate into the office structure of a 21st-century church.",
          "Most pastors who have thought carefully about the topic will tell you the same thing: flippant arguments on either side are the problem. A complementarian who treats women as second-class or an egalitarian who treats the relevant passages as embarrassments has not done the work. The real debate is between careful, text-respecting Christians on both sides — and that debate is worth hearing.",
        ],
      },
    ],
    churchRelevance: {
      title: "Your members deserve your actual view, not a guess",
      body: "When a member has a question this significant, they should not have to guess what their church believes or go looking for the answer in a Reddit thread. Doctrinally.AI lets your congregation ask hard questions like this one and hear answers drawn from your own sermons and teaching, with citations back to the original source. Your pastor's voice, available any hour, without ever being put on the spot.",
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
