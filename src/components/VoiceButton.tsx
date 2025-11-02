import { useEffect, useRef, useState } from 'react';

type Props = { onResult: (text: string) => void; small?: boolean };

export default function VoiceButton({ onResult, small }: Props) {
  const [active, setActive] = useState(false);
  const recogRef = useRef<any>(null);

  useEffect(()=>{
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.continuous = false;
      r.interimResults = false;
      r.lang = 'en-US';
      r.onresult = (e: any) => {
        const t = Array.from(e.results).map((res: any)=> res[0].transcript).join(' ');
        onResult(t);
        setActive(false);
      };
      r.onend = () => setActive(false);
      recogRef.current = r;
    }
  }, [onResult]);

  const start = async () => {
    const SR: any = recogRef.current;
    if (!SR) {
      alert('Speech Recognition not available in this runtime.');
      return;
    }
    try {
      setActive(true);
      SR.start();
    } catch {}
  };

  return (
    <button type="button" className={`${small ? 'text-[11px] px-2 py-1' : 'text-xs px-2 py-1'} ml-2 rounded ${active ? 'bg-red-600 text-white' : 'bg-neutral-800'}`} onClick={start} title="Voice search">
      {active ? 'Listening…' : '🎤'}
    </button>
  );
}


