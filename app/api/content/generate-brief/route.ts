/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { keyword, clientName, industry, contentType } = await req.json();

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    const prompt = `You are an SEO content strategist. Generate a detailed SEO content brief for a "${contentType}" targeting the keyword "${keyword}".
The client is "${clientName}" in the "${industry}" industry.
Format the response in clean markdown with the following sections:
1. Target Keyword & Search Intent
2. Title Ideas (3 options)
3. Primary Audience & Tone of Voice
4. Core Goal/Call-to-Action (CTA)
5. Recommended Structure (H1, H2, H3 Outline)
6. LSI/Secondary Keywords to Include`;

    // 1. Try Google Gemini API
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generatedText) {
            return NextResponse.json({ brief: generatedText });
          }
        }
      } catch (err) {
        console.error('Gemini brief generation error:', err);
      }
    }

    // 2. Try OpenAI API
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an SEO expert.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const generatedText = data.choices?.[0]?.message?.content;
          if (generatedText) {
            return NextResponse.json({ brief: generatedText });
          }
        }
      } catch (err) {
        console.error('OpenAI brief generation error:', err);
      }
    }

    // 3. Fallback: Dynamic templated markdown brief
    const capKeyword = keyword.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const fallbackBrief = `# SEO Content Brief: "${capKeyword}"

## 1. Target Keyword & Search Intent
* **Primary Keyword:** \`${keyword}\`
* **Search Intent:** Informational & Transactional (searching for guides, services, or expertise in the **${industry}** sector).
* **Suggested Word Count:** 1,200 - 1,800 words.

## 2. Title Ideas
1. *The Ultimate Guide to ${capKeyword} for Beginners in 2026*
2. *Why ${capKeyword} is the Key to Scaling Your ${industry} Business*
3. *Top 7 Mistakes to Avoid When Implementing ${capKeyword}*

## 3. Primary Audience & Tone of Voice
* **Audience:** Potential customers of **${clientName}** looking to solve issues related to ${keyword}.
* **Tone:** Professional, authoritative, actionable, yet accessible. Avoid jargon without explanation.

## 4. Core Goal / Call-to-Action (CTA)
* Establish **${clientName}** as the leading authority in **${industry}**.
* **CTA:** Direct readers to contact ${clientName} for a free audit/consultation or visit the main service page.

## 5. Recommended Structure
* **H1:** Catchy Title incorporating "${capKeyword}"
* **Introduction:** hook the reader, introduce the pain points, and define ${keyword}.
* **H2: What is ${capKeyword} and Why Does it Matter?**
  * Break down the core concepts.
* **H2: Key Benefits of ${capKeyword} for Your Business**
  * Practical benefits with bullet points.
  * Internal link to related ${clientName} services.
* **H2: Step-by-Step Guide to Success**
  * **H3: Step 1: Research & Strategy**
  * **H3: Step 2: Implementation & Execution**
  * **H3: Step 3: Monitoring & Optimization**
* **H2: Choosing the Right Partner in ${industry}**
  * Highlight why ${clientName} is uniquely positioned to help.
* **Conclusion & Call to Action**

## 6. LSI & Secondary Keywords to Include
* \`best ${keyword} practices\`
* \`${industry} optimization tips\`
* \`${clientName} services\`
* \`how to scale ${keyword}\`
`;

    return NextResponse.json({ brief: fallbackBrief });
  } catch (error: any) {
    console.error('Error generating brief:', error);
    return NextResponse.json({ error: 'Failed to generate brief' }, { status: 500 });
  }
}
