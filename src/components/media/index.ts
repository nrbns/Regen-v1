export { MediaPlayer } from './MediaPlayer';

export function getMediaKind(url: string): 'audio' | 'video' | 'unknown' {
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv'];

  const lowerUrl = url.toLowerCase();

  if (audioExtensions.some(ext => lowerUrl.includes(ext))) {
    return 'audio';
  }

  if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
    return 'video';
  }

  return 'unknown';
}