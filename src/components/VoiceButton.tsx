import { useEffect, useRef, useState } from 'react';
import { toast } from '../utils/toast';

type Props = { onResult: (text: string) => void; small?: boolean };

export default function VoiceButton({ onResult, small }: Props) {
  const [active, setActive] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const recogRef = useRef<any>(null);

  useEffect(() => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      try {
        const r = new SR();
        r.continuous = false;
        r.interimResults = false;
        r.lang = 'en-US';
        r.onresult = (e: any) => {
          try {
            const results = Array.isArray(e.results) ? Array.from(e.results) : [];
            const transcripts = results
              .map((res: any) => res?.[0]?.transcript)
              .filter((t: any) => t && typeof t === 'string');
            const t = transcripts.join(' ').trim();
            if (t) {
              onResult(t);
            }
            setActive(false);
          } catch (error) {
            console.error('[VoiceButton] Error processing speech result:', error);
            setActive(false);
            toast.error('Failed to process speech recognition result.');
          }
        };
        r.onerror = (e: any) => {
          console.error('[VoiceButton] Speech recognition error:', e.error);
          setActive(false);
          if (e.error === 'not-allowed') {
            toast.error('Microphone permission denied. Please enable it in your browser settings.');
          } else if (e.error === 'no-speech') {
            toast.error('No speech detected. Please try again.');
          } else {
            toast.error('Speech recognition failed. Please try again.');
          }
        };
        r.onend = () => setActive(false);
        recogRef.current = r;
        setIsAvailable(true);
      } catch (error) {
        console.error('[VoiceButton] Failed to initialize speech recognition:', error);
        setIsAvailable(false);
      }
    } else {
      setIsAvailable(false);
    }
  }, [onResult]);

  const start = async () => {
    const SR: any = recogRef.current;
    if (!SR || !isAvailable) {
      toast.error(
        'Speech recognition is not available in this browser. Please use a supported browser like Chrome or Edge.'
      );
      return;
    }
    try {
      setActive(true);
      SR.start();
    } catch (error: any) {
      console.error('[VoiceButton] Failed to start recognition:', error);
      setActive(false);
      toast.error('Failed to start voice recognition. Please try again.');
    }
  };

  return (
    <button
      type="button"
      className={`${small ? 'text-[11px] px-2 py-1' : 'text-xs px-2 py-1'} ml-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${active ? 'bg-red-600 text-white' : 'bg-neutral-800'}`}
      onClick={start}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          start();
        }
      }}
      aria-label={active ? 'Stop voice recognition' : 'Start voice search'}
      aria-pressed={active}
      title="Voice search"
    >
      <span aria-hidden="true">{active ? 'Listening…' : '🎤'}</span>
    </button>
  );
}
