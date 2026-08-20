'use client';
import { useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';

// Phase 3: Voice narration via Web Speech API (browser-native, no backend)
export default function VoiceNarration({ enabled, text }: { enabled: boolean; text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const lastSpokenRef = useRef('');

  useEffect(() => {
    if (!enabled || !text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (text === lastSpokenRef.current) return;
    lastSpokenRef.current = text;

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'vi-VN';
    utter.rate = 1.05;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  }, [enabled, text]);

  if (!enabled) return null;
  return (
    <div className="fixed bottom-24 right-4 z-40 chip text-xs inline-flex items-center gap-1">
      {speaking ? <Volume2 className="h-3 w-3 animate-pulse text-accent" /> : <VolumeX className="h-3 w-3" />}
      {speaking ? 'Đang đọc…' : 'Sẵn sàng'}
    </div>
  );
}