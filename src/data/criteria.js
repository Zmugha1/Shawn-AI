export const CRITERIA = [
  {
    n: '01',
    label: 'Comfort and Intent',
    body: 'Before a word is said, read why they are here. Voluntary or pushed? Both parties engaged or one dragging the other? The person who initiated this meeting holds the real agenda. The person who was brought along holds the honest signal. Read both.',
    src: "From Shawn's STZ Interview -- Minute 12"
  },
  {
    n: '02',
    label: 'Hidden Pain Signal',
    body: 'There is always something underneath the stated reason for the meeting. A parent died. A marriage ended. Something happened that pushed them here right now. Find that before you build anything. If you solve the presenting problem without addressing the real pain, the relationship will not hold.',
    src: "From Shawn's STZ Interview -- Minute 26"
  },
  {
    n: '03',
    label: 'Background Check',
    body: 'Check CCAP Wisconsin Circuit Court before every first meeting. Not to disqualify -- to know what doors to open. If there is a lawsuit or dispute in their history, create a natural opening for them to tell you about it. Whether they are forthcoming or evasive tells you more than the record itself.',
    src: "From Shawn's STZ Interview -- Minute 14"
  },
  {
    n: '04',
    label: 'Mutual Connections',
    body: 'Before every first meeting, check LinkedIn for shared connections. A mutual contact you trust can give you a read on this person in five minutes that would take three meetings to discover on your own. Call before the meeting. Ask only what you need to know.',
    src: "From Shawn's STZ Interview -- Minute 25"
  },
  {
    n: '05',
    label: 'Business Context',
    body: 'Is this person a business owner? If yes -- what type, what stage, and where are they in the business lifecycle? The business conversation will dominate every financial conversation until it is resolved. Meet the business before you meet the money.',
    src: "From Shawn's STZ Interview -- Minute 25"
  },
  {
    n: '06',
    label: 'Family and Household',
    body: 'Who are we planning for? A household is not just the two people in the room. It includes adult children, aging parents, grandchildren in some cases. Count the whole household before you scope the plan.',
    src: "From Shawn's STZ Interview -- Minute 36"
  },
  {
    n: '07',
    label: 'Decision Making Style',
    body: 'Is this person a fast decider or a deliberator? Read them early and calibrate the pace of the entire relationship. A fast decider needs one clear next action. A deliberator needs information in writing and time to process.',
    src: "From Shawn's STZ Interview -- Minute 30"
  },
  {
    n: '08',
    label: 'The Right Analogy',
    body: 'Every person understands their own world better than they understand finance. Find what they know and build the bridge from there. A builder gets the foundation analogy. A doctor gets the specialist analogy. A restaurant owner gets the kitchen prep analogy. Get the analogy wrong and you lose them for the whole meeting.',
    src: "From Shawn's STZ Interview -- Minute 16"
  },
  {
    n: '09',
    label: 'What to Listen For',
    body: 'Listen for change talk versus sustain talk. Change talk is when they move toward a decision. Sustain talk is when they circle back to objections or reasons to wait. Change talk is your green light. Sustain talk is your invitation to go slower and ask what would help them feel more ready.',
    src: "From Shawn's STZ Interview -- Minute 31"
  },
  {
    n: '10',
    label: 'What Not to Assume',
    body: 'Every prospect file has gaps. Flag the gaps before the meeting so you do not act on incomplete information. The most expensive mistakes in this business come from assuming you know what you do not know. Verify your assumptions in the first 15 minutes.',
    src: "From Shawn's STZ Interview -- Minute 54"
  }
]

export const ANALOGIES = [
  {
    name: 'The Foundation Analogy',
    text: "What's the most important thing when you build a house? The foundation. Because if the foundation's not strong and square, then everything else won't work. The foundation for what we're doing is information. The better quality and more truthful information you provide me, the better we build.",
    tag: 'Use for: builders, contractors, tradespeople, engineers'
  },
  {
    name: 'Specialist of Specialists',
    text: "If you need brain surgery, are you going to a pediatrician or a GP? I'm the specialist of specialists. My job is to figure out what specialists you need to fill the gaps and make sure you get to them in the right order.",
    tag: 'Use for: medical professionals, academics, anyone who respects credentials'
  },
  {
    name: 'The Kitchen Prep Analogy',
    text: "Nobody sees the prep. Everyone experiences the result. You can run a service without prep but you cannot run two services without it. A financial plan is the prep work that makes everything else run.",
    tag: 'Use for: restaurant owners, hospitality professionals'
  },
  {
    name: 'Business Plan for Personal Balance Sheet',
    text: "You manage pipeline at work -- let's build a pipeline for your net worth. RSU vesting schedule is your commission accelerator. A financial plan is a business plan for your personal balance sheet.",
    tag: 'Use for: sales professionals, business executives, entrepreneurs'
  },
  {
    name: "Grandmother's Buick",
    text: "My grandfather retired and bought my grandmother a new Buick. Power windows, power locks. Back then that was $10,000. The people who made it are the people who built the foundation before they built the house.",
    tag: 'Use for: retirees, union workers, long-career professionals over 65'
  },
  {
    name: 'The GP Who Coordinates',
    text: "If you go to a surgeon for your shoulder, what's he going to tell you? You need surgery -- because he doesn't get paid to do rehab. My job is to figure out what you really need before we determine which specialists to bring in.",
    tag: 'Use for: skeptics, complex multi-specialist situations'
  }
]

export const STZ_SYSTEM_PROMPT = `You are Shawn Intel, a private pre-meeting intelligence assistant built for Shawn, a Certified Financial Planner with 30 years of experience in Wisconsin.

You reason like Shawn. You apply his specific frameworks, not generic financial planning advice.

SHAWN'S TEN CRITERIA:
1. Comfort and Intent -- read why they are really there before a word is said
2. Hidden Pain Signal -- there is always something underneath the stated reason
3. Background Check -- CCAP results tell you what doors to open
4. Mutual Connections -- who you both know gives you a read before the meeting
5. Business Context -- meet the business before you meet the money
6. Family and Household -- count the whole household before you scope the plan
7. Decision Making Style -- fast decider or deliberator, calibrate the pace
8. The Right Analogy -- find what they know and build the bridge from there
9. What to Listen For -- change talk means green light, sustain talk means slow down
10. What Not to Assume -- flag the gaps before the meeting, verify in the first 15 minutes

SHAWN'S NON-NEGOTIABLES:
- Never more than 120 households
- Always meet the client where they are, not where Shawn's agenda is
- Net worth is the north star metric, not individual account performance
- Client engagement is what makes the plan work
- Address hidden pain before the stated agenda

SHAWN'S ANALOGY LIBRARY:
- Foundation analogy: for builders and tradespeople
- Specialist of specialists: for medical professionals and credential-focused people
- Kitchen prep analogy: for restaurant owners
- Business plan for personal balance sheet: for sales and executive types
- Grandmother's Buick: for retirees over 65
- GP who coordinates: for skeptics and complex situations

CFP ETHICS LAYER:
You never make specific financial product recommendations.
You flag when you are uncertain.
You always cite your reasoning.
Everything you suggest requires Shawn's review before any client action.

MOTIVATIONAL INTERVIEWING LAYER:
When Shawn describes client behavior, identify change talk versus sustain talk and suggest the appropriate response. Change talk signals readiness to move forward. Sustain talk signals ambivalence that needs to be addressed before any recommendation is made.

Respond in Shawn's voice. Be direct and specific. Keep responses under 180 words. Always end with: Does this match how you would handle it, or should I adjust?`
