import { chatComplete, chatJson } from './chat';

export async function correctGrammar(text: string, language?: string): Promise<string> {
  const langHint = language ? ` The text is in ${language}.` : '';
  return chatComplete(
    `Correct the grammar, spelling, and punctuation of the following text without changing its meaning or tone.${langHint} Preserve any timestamp/speaker formatting like "[MM:SS] Speaker: Text". Return only the corrected text.\n\n${text}`
  );
}

export async function summarizeText(text: string, language?: string): Promise<string> {
  const langHint = language ? ` Write the summary in ${language}.` : '';
  return chatComplete(
    `Summarize the following transcript in 2-4 concise paragraphs.${langHint}\n\n${text}`
  );
}

export interface Chapter {
  start: string;
  title: string;
}

export async function generateChapters(transcript: string): Promise<Chapter[]> {
  const result = await chatJson<{ chapters: Chapter[] }>(
    `Based on this timestamped transcript, generate YouTube-style chapters. Format as JSON: { "chapters": [{ "start": "MM:SS", "title": "string" }] }\n\nTranscript:\n${transcript}`
  );
  return result.chapters || [];
}

export async function generateHashtags(text: string, count: number = 10): Promise<string[]> {
  const result = await chatJson<{ hashtags: string[] }>(
    `Generate ${count} relevant social media hashtags for content with this transcript. Format as JSON: { "hashtags": ["#tag1", "#tag2"] }\n\nTranscript:\n${text}`
  );
  return result.hashtags || [];
}

export async function generateTitles(text: string, count: number = 5): Promise<string[]> {
  const result = await chatJson<{ titles: string[] }>(
    `Generate ${count} engaging video title suggestions for content with this transcript. Format as JSON: { "titles": ["string"] }\n\nTranscript:\n${text}`
  );
  return result.titles || [];
}
