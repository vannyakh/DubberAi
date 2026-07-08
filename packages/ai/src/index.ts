export {
  transcribeVideo,
  analyzeVideo,
  translateText,
  generateSpeech,
  generateMultiSpeakerSpeech,
} from './gemini';

export {
  detectVocalStyles,
  applyVocalStylesToSegments,
  voiceForGender,
  styleTtsPrompt,
  feelingInstruction,
} from './vocal-style';
export type { DetectVocalStylesResult } from './vocal-style';

export {
  correctGrammar,
  summarizeText,
  generateChapters,
  generateHashtags,
  generateTitles,
} from './text';

export { planAutoCutRanges } from './autocut';
export type { AutoCutPlanInput, AutoCutCutRange } from './autocut';

export { classifyAgentCutIntent, planAgentCut } from './agent-cut';
export type {
  AgentCutIntent,
  AgentCutClipSummary,
  AgentCutRange,
  AgentCutAction,
  AgentCutPlanInput,
  AgentCutPlanResult,
} from './agent-cut';

export { chatComplete, chatJson } from './chat';
export type { ChatOptions } from './chat';
