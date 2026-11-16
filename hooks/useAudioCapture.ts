'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AudioInputDeviceInfo {
  deviceId: string;
  label: string;
}

function downsampleBuffer(
  input: Float32Array,
  inputSampleRate: number,
  targetSampleRate: number
): Float32Array {
  if (inputSampleRate === targetSampleRate) {
    return input;
  }
  const ratio = inputSampleRate / targetSampleRate;
  const newLength = Math.max(1, Math.round(input.length / ratio));
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i += 1) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const s0 = input[idx] ?? 0;
    const s1 = input[Math.min(idx + 1, input.length - 1)] ?? s0;
    result[i] = s0 + (s1 - s0) * frac;
  }
  return result;
}

function float32ToPcm16Base64(samples: Float32Array): string {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function useAudioCapture() {
  const [devices, setDevices] = useState<AudioInputDeviceInfo[]>([]);
  const [micError, setMicError] = useState<string | null>(null);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const inputs = list
        .filter((d) => d.kind === 'audioinput')
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${idx + 1}`,
        }));
      setDevices(inputs);
    } catch {
      // Ignore enumeration failure before permission grant
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      refreshDevices();
    }, 0);
    return () => clearTimeout(id);
  }, [refreshDevices]);

  const stopMeterAndStream = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      try {
        processorRef.current.disconnect();
      } catch {
        // Ignore disconnect error
      }
      processorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setInputLevel(0);
    setIsTestingMic(false);
    setIsRecording(false);
    setIsLiveStreaming(false);
  }, []);

  useEffect(() => {
    return () => {
      stopMeterAndStream();
    };
  }, [stopMeterAndStream]);

  const openStreamAndMeter = useCallback(
    async (
      preferredDeviceId?: string,
      onLevelTick?: (level: number) => void,
      onVadStop?: () => void
    ): Promise<MediaStream | null> => {
      setMicError(null);
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setMicError('micNotFound');
        return null;
      }

      try {
        const audioConstraints: MediaTrackConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(preferredDeviceId ? { deviceId: { exact: preferredDeviceId } } : {}),
        };
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
        });
        streamRef.current = stream;
        refreshDevices();

        // Set up Web Audio RMS level meter WITHOUT connecting to audioCtx.destination (never echo mic to speakers!)
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.fftSize);
        let lastSent = 0;
        let speechHeardAt = 0;
        let lastVoiceAt = 0;
        let vadTriggered = false;

        const tick = () => {
          analyser.getByteTimeDomainData(dataArray);
          let sumSq = 0;
          for (let i = 0; i < dataArray.length; i += 1) {
            const norm = (dataArray[i] - 128) / 128;
            sumSq += norm * norm;
          }
          const rms = Math.sqrt(sumSq / dataArray.length);
          const level = Math.min(100, Math.round(rms * 320));
          setInputLevel(level);

          const now = Date.now();
          if (onLevelTick && now - lastSent >= 120) {
            lastSent = now;
            onLevelTick(level);
          }

          // Fast silence VAD auto-stop for single-shot capture:
          // once speech above noise floor (>= 9%) was heard, auto-stop ~650ms after voice ends
          if (onVadStop && !vadTriggered) {
            if (level >= 9) {
              if (!speechHeardAt) speechHeardAt = now;
              lastVoiceAt = now;
            } else if (
              speechHeardAt > 0 &&
              now - speechHeardAt >= 320 &&
              now - lastVoiceAt >= 650
            ) {
              vadTriggered = true;
              onVadStop();
              return;
            }
          }

          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);

        return stream;
      } catch (err) {
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setMicError('micPermissionDenied');
        } else {
          setMicError('micNotFound');
        }
        stopMeterAndStream();
        return null;
      }
    },
    [refreshDevices, stopMeterAndStream]
  );

  const startLivePcmStream = useCallback(
    async (params: {
      preferredDeviceId?: string;
      onPcmChunk: (base64Pcm: string, level: number) => void;
    }): Promise<boolean> => {
      stopMeterAndStream();
      setMicError(null);

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setMicError('micNotFound');
        return false;
      }

      try {
        const audioConstraints: MediaTrackConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(params.preferredDeviceId
            ? { deviceId: { exact: params.preferredDeviceId } }
            : {}),
        };
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
        });
        streamRef.current = stream;
        refreshDevices();

        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        let ctx: AudioContext;
        try {
          ctx = new AudioCtx({ sampleRate: 16000 });
        } catch {
          ctx = new AudioCtx();
        }
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }
        audioCtxRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const processor = ctx.createScriptProcessor(2048, 1, 1);
        const silentGain = ctx.createGain();
        silentGain.gain.value = 0; // Guarantee ZERO microphone monitoring through speakers

        source.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(ctx.destination);
        processorRef.current = processor;

        let lastUiLevelAt = 0;

        processor.onaudioprocess = (event) => {
          // Ensure output buffer stays strictly silent
          const out = event.outputBuffer.getChannelData(0);
          out.fill(0);

          const rawInput = event.inputBuffer.getChannelData(0);
          let sumSq = 0;
          for (let i = 0; i < rawInput.length; i += 1) {
            sumSq += rawInput[i] * rawInput[i];
          }
          const rms = Math.sqrt(sumSq / Math.max(1, rawInput.length));
          const level = Math.min(100, Math.round(rms * 420));

          const now = Date.now();
          if (now - lastUiLevelAt >= 90) {
            lastUiLevelAt = now;
            setInputLevel(level);
          }

          const pcm16k = downsampleBuffer(rawInput, ctx.sampleRate, 16000);
          const base64Pcm = float32ToPcm16Base64(pcm16k);
          params.onPcmChunk(base64Pcm, level);
        };

        setIsLiveStreaming(true);
        return true;
      } catch (err) {
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setMicError('micPermissionDenied');
        } else {
          setMicError('micNotFound');
        }
        stopMeterAndStream();
        return false;
      }
    },
    [refreshDevices, stopMeterAndStream]
  );

  const startMicTest = useCallback(
    async (preferredDeviceId?: string) => {
      stopMeterAndStream();
      const stream = await openStreamAndMeter(preferredDeviceId);
      if (stream) {
        setIsTestingMic(true);
      }
    },
    [openStreamAndMeter, stopMeterAndStream]
  );

  const startCaptureWindow = useCallback(
    async (params: {
      preferredDeviceId?: string;
      maxSeconds: number;
      onLevelTick?: (level: number) => void;
      onFinished: (payload: { base64Audio: string; mimeType: string } | null) => void;
    }) => {
      stopMeterAndStream();
      cancelledRef.current = false;

      const stream = await openStreamAndMeter(
        params.preferredDeviceId,
        params.onLevelTick,
        () => {
          if (recorderRef.current && recorderRef.current.state === 'recording') {
            recorderRef.current.stop();
          }
        }
      );
      if (!stream) {
        params.onFinished(null);
        return false;
      }

      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
      ];
      const supportedMime =
        mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';

      const recorder = supportedMime
        ? new MediaRecorder(stream, { mimeType: supportedMime })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorderRef.current = recorder;
      setIsRecording(true);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        const wasCancelled = cancelledRef.current;
        const mimeType = recorder.mimeType || supportedMime || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        recorderRef.current = null;
        stopMeterAndStream();

        if (wasCancelled || blob.size < 200) {
          params.onFinished(null);
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
          params.onFinished({
            base64Audio: base64,
            mimeType: mimeType.split(';')[0] || 'audio/webm',
          });
        };
        reader.readAsDataURL(blob);
      };

      recorder.start(200);

      timeoutRef.current = setTimeout(() => {
        if (recorderRef.current && recorderRef.current.state === 'recording') {
          recorderRef.current.stop();
        }
      }, params.maxSeconds * 1000);

      return true;
    },
    [openStreamAndMeter, stopMeterAndStream]
  );

  const stopCaptureAndProcess = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    } else {
      stopMeterAndStream();
    }
  }, [stopMeterAndStream]);

  const cancelCapture = useCallback(() => {
    cancelledRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    } else {
      stopMeterAndStream();
    }
  }, [stopMeterAndStream]);

  return {
    devices,
    micError,
    isTestingMic,
    isRecording,
    isLiveStreaming,
    inputLevel,
    refreshDevices,
    startMicTest,
    stopMicTest: stopMeterAndStream,
    startLivePcmStream,
    stopLivePcmStream: stopMeterAndStream,
    startCaptureWindow,
    stopCaptureAndProcess,
    cancelCapture,
  };
}
