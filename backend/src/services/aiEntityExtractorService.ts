import { config } from '../config';
import { logger } from '../utils/logger';

export interface AIExtractionResult {
  company: string | null;
  role: string | null;
  status: 'APPLIED' | 'ASSESSMENT' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'APPLICATION_VIEWED' | 'APPLICATION_CONFIRMATION' | 'RECRUITER_CONTACT' | 'OTHER';
  reason: string;
  confidence: number;
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODELS = [
  'qwen/qwen3.8-27b:free',
  'nvidia/nemotron-3.5-lightning:free',
  'poolside/laguna-s-2.1:free',
];

const SYSTEM_PROMPT = `You are a job application email parser. Extract key entities from the provided email and classify it.

Return ONLY a valid JSON object with these exact keys (no markdown, no extra text):
{
  "company": string or null,
  "role": string or null,
  "status": one of "APPLIED" | "ASSESSMENT" | "INTERVIEW" | "OFFER" | "REJECTED" | "APPLICATION_VIEWED" | "APPLICATION_CONFIRMATION" | "RECRUITER_CONTACT" | "OTHER",
  "reason": brief explanation string,
  "confidence": number between 0 and 1
}

Status definitions:
- APPLIED: initial application submission confirmation
- APPLICATION_CONFIRMATION: received your application notice
- APPLICATION_VIEWED: your application was viewed or reviewed
- ASSESSMENT: coding test, online assessment, take-home assignment
- INTERVIEW: interview invitation or scheduling
- OFFER: job offer extended
- REJECTED: application rejection
- RECRUITER_CONTACT: recruiter reaching out about a role
- OTHER: not a job-related email

If the email is not job-related, return: {"company":null,"role":null,"status":"OTHER","reason":"Not a job application email","confidence":0.95}`;

function extractJsonFromText(text: string): AIExtractionResult | null {
  // Try to parse directly
  try {
    return JSON.parse(text.trim()) as AIExtractionResult;
  } catch {
    // Try to extract from markdown code block
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim()) as AIExtractionResult;
      } catch {}
    }
    // Try to find JSON object in text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as AIExtractionResult;
      } catch {}
    }
  }
  return null;
}

function validateResult(result: AIExtractionResult): boolean {
  const validStatuses = ['APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'APPLICATION_VIEWED', 'APPLICATION_CONFIRMATION', 'RECRUITER_CONTACT', 'OTHER'];
  return (
    typeof result === 'object' &&
    result !== null &&
    (result.company === null || typeof result.company === 'string') &&
    (result.role === null || typeof result.role === 'string') &&
    validStatuses.includes(result.status) &&
    typeof result.reason === 'string' &&
    typeof result.confidence === 'number' &&
    result.confidence >= 0 &&
    result.confidence <= 1
  );
}

async function callModel(model: string, prompt: string): Promise<AIExtractionResult | null> {
  const apiKey = config.openrouterApiKey;
  if (!apiKey) return null;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://applicord.app',
        'X-Title': 'Applicord',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.warn(`OpenRouter ${model} returned ${response.status}`, { error: errText.slice(0, 200) });
      return null;
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const extracted = extractJsonFromText(content);
    if (extracted && validateResult(extracted)) {
      return extracted;
    }

    logger.warn(`OpenRouter ${model} returned unparseable JSON`, { content: content.slice(0, 300) });
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`OpenRouter ${model} call failed`, { error: message });
    return null;
  }
}

export const aiEntityExtractorService = {
  /**
   * Attempts to extract job application entities from an email using AI.
   * Returns null if all models fail or the result has low confidence.
   * Tries models in order, returns first successful result.
   */
  async extract(
    sender: string,
    subject: string,
    body: string,
    minConfidence = 0.65,
  ): Promise<AIExtractionResult | null> {
    if (!config.openrouterApiKey) {
      logger.debug('OpenRouter API key not configured — skipping AI extraction');
      return null;
    }

    // Limit body to first 3000 chars (already cleaned text by this point)
    const bodyPreview = body.slice(0, 3000);
    const prompt = `From: ${sender}\nSubject: ${subject}\n\nEmail Body:\n${bodyPreview}`;

    for (const model of MODELS) {
      const result = await callModel(model, prompt);
      if (result && result.confidence >= minConfidence) {
        logger.info('AI entity extraction succeeded', {
          model,
          company: result.company,
          role: result.role,
          emailStatus: result.status,
          confidence: result.confidence,
        });
        return result;
      }
    }

    logger.info('AI entity extraction failed or low confidence for all models');
    return null;
  },
};
