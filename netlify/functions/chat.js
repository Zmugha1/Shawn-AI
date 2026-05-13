// netlify/functions/chat.js
// Anthropic chat with Shawn's STZ context preloaded

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

  if (!ANTHROPIC_KEY || ANTHROPIC_KEY === 'your_anthropic_key_here') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        error: 'ANTHROPIC_API_KEY not configured',
        text: 'API key not configured. Add ANTHROPIC_API_KEY to Netlify environment variables.'
      })
    }
  }

  try {
    const { messages, prospectContext, briefContext } = JSON.parse(event.body || '{}')

    const systemPrompt = `You are Shawn Intel, a private pre-meeting intelligence assistant built for Shawn, a Certified Financial Planner with 30 years of experience in Wisconsin.

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
- Always meet the client where they are
- Net worth is the north star metric
- Client engagement is what makes the plan work
- Address hidden pain before the stated agenda

CFP ETHICS: Never make specific financial product recommendations. Everything requires Shawn's review. Flag uncertainty.

MOTIVATIONAL INTERVIEWING: Identify change talk vs sustain talk in client descriptions.

${prospectContext ? `CURRENT PROSPECT LOADED:\n${prospectContext}` : ''}
${briefContext ? `BRIEF SUMMARY:\n${briefContext}` : ''}

Respond in Shawn's voice. Be direct and specific. Keep responses under 180 words. Always end with: Does this match how you would handle it, or should I adjust?`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages || []
      }),
      signal: AbortSignal.timeout(20000)
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || 'Could not generate a response.'

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text, status: 'success' })
    }

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, text: 'Connection error. Please try again.' })
    }
  }
}
