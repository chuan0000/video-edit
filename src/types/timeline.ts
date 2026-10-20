export type CameraId = 'A' | 'B' | 'C';

export type SegmentColorLabel = 'teal' | 'rose' | 'amber' | 'indigo' | 'emerald' | 'sky';

export interface ClipSegment {
  id: string;
  camera: CameraId;
  startTime: number;
  endTime: number;
  colorLabel?: SegmentColorLabel;
}

export interface TimelineMarker {
  id: string;
  time: number;
  label: string;
  color: 'yellow' | 'red' | 'green' | 'blue' | 'purple';
}

export interface MulticamInputs {
  cameraA: string;
  cameraB: string;
  cameraC: string;
  masterAudioCamera?: CameraId;
}

export interface CameraConfig {
  id: CameraId;
  name: string;
  role: string;
  label: string;
  colorName: string;
  badgeBg: string;
  borderColor: string;
  activeGlow: string;
  hotkey: '1' | '2' | '3';
}

export interface TranscriptWord {
  id: string;
  word: string;
  startTime: number;
  endTime: number;
  isFiller?: boolean;
  isDeleted?: boolean;
}

export interface TranscriptParagraph {
  id: string;
  speaker: string;
  role?: string;
  speakerRole?: string;
  text: string;
  englishText?: string;
  startTime: number;
  endTime: number;
  suggestedCamera: CameraId;
  words?: TranscriptWord[];
  isDeleted?: boolean;
}

export interface ExportProgressState {
  status: 'idle' | 'preparing' | 'rendering' | 'completed' | 'error';
  progress: number;
  message?: string;
  outputPath?: string;
  errorMessage?: string;
}

export interface PlayheadState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
}
