import VoiceButton from './VoiceButton';
import { runAutomationsFromUtterance } from '../lib/commands';

export default function AutomateButton() {
  return (
    <VoiceButton onResult={(t)=>{ runAutomationsFromUtterance(t); }} small />
  );
}


