if (!process.env.WS_NO_BUFFER_UTIL) process.env.WS_NO_BUFFER_UTIL = '1';
if (!process.env.WS_NO_UTF_8_VALIDATE) process.env.WS_NO_UTF_8_VALIDATE = '1';

import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { SpeechLanguageMode } from './types';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface TranscribeAudioOutcome {
  ok: boolean;
  transcript?: string;
  detectedLanguage?: string;
  errorCode?: 'SPEECH_NOT_CONFIGURED' | 'UPSTREAM_ERROR';
  errorMessage?: string;
}

export interface LiveTranscribeHandle {
  sendAudioPcm: (base64Pcm: string) => void;
  close: () => void;
}

export async function createLiveTranscribeSession(params: {
  languageHint: SpeechLanguageMode;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (code: 'SPEECH_NOT_CONFIGURED' | 'UPSTREAM_ERROR', message: string) => void;
  onClose: () => void;
}): Promise<LiveTranscribeHandle | null> {
  const ai = getGeminiClient();
  if (!ai) {
    params.onError(
      'SPEECH_NOT_CONFIGURED',
      'GEMINI_API_KEY is not configured on the server.'
    );
    return null;
  }

  const languageCodes =
    params.languageHint === 'es'
      ? ['es-ES']
      : params.languageHint === 'en'
        ? ['en-US']
        : params.languageHint === 'de'
          ? ['de-DE']
          : [];

  let closed = false;

  try {
    const session = await ai.live.connect({
      model: 'gemini-3.5-transcribe-live',
      config: {
        responseModalities: [Modality.TEXT],
        inputAudioTranscription: {
          languageCodes,
        },
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          if (closed) return;
          const content = message.serverContent;
          const interimText = content?.interimInputTranscription?.text;
          if (interimText) {
            params.onInterim(interimText);
          }
          const finalText = content?.inputTranscription?.text;
          if (finalText) {
            params.onFinal(finalText);
          }
        },
        onerror: (err: unknown) => {
          if (closed) return;
          const message =
            err instanceof Error
              ? err.message
              : typeof err === 'object' && err !== null && 'message' in err
                ? String((err as { message: unknown }).message)
                : 'Gemini Live transcription error';
          console.error('[GeminiLiveSpeech] Session error:', message);
          params.onError('UPSTREAM_ERROR', message);
        },
        onclose: () => {
          if (!closed) {
            closed = true;
            params.onClose();
          }
        },
      },
    });

    return {
      sendAudioPcm: (base64Pcm: string) => {
        if (closed || !base64Pcm) return;
        try {
          session.sendRealtimeInput({
            audio: {
              data: base64Pcm,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Failed to send audio chunk';
          console.error('[GeminiLiveSpeech] sendRealtimeInput error:', message);
        }
      },
      close: () => {
        if (closed) return;
        closed = true;
        try {
          session.close();
        } catch {
          // Ignore close errors
        }
      },
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to connect Gemini Live session';
    console.error('[GeminiLiveSpeech] Connect error:', message);
    params.onError('UPSTREAM_ERROR', message);
    return null;
  }
}

export async function transcribeBingoAudio(params: {
  base64Audio: string;
  mimeType: string;
  languageHint: SpeechLanguageMode;
}): Promise<TranscribeAudioOutcome> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      ok: false,
      errorCode: 'SPEECH_NOT_CONFIGURED',
      errorMessage: 'GEMINI_API_KEY is not configured on the server.',
    };
  }

  const languageDirective =
    params.languageHint === 'auto'
      ? 'The speaker may speak Spanish, English, or German (or repeat the number across those languages).'
      : params.languageHint === 'es'
        ? 'The speaker is speaking Spanish.'
        : params.languageHint === 'en'
          ? 'The speaker is speaking English.'
          : 'The speaker is speaking German.';

  const prompt = [
    'Transcribe the exact spoken words from this short Bingo announcement audio clip.',
    languageDirective,
    'Only transcribe what is actually spoken. If the audio is silent or contains only background noise with no clear spoken words or numbers, output exactly: [silence]',
    'Do not add explanations, punctuation commentary, or extra numbers that were not spoken.',
  ].join(' ');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: params.mimeType || 'audio/webm',
              data: params.base64Audio,
            },
          },
          { text: prompt },
        ],
      },
    });

    const transcript = (response.text ?? '').trim();
    return {
      ok: true,
      transcript,
      detectedLanguage: params.languageHint,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown Gemini transcription error';
    console.error('[GeminiSpeech] Transcription error:', message);
    return {
      ok: false,
      errorCode: 'UPSTREAM_ERROR',
      errorMessage: message,
    };
  }
}
