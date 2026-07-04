// Scenario types
export interface Scenario {
  id: number;
  name: string;
  description: string | null;
  situation: string;
  goal: string | null;
  evaluation_criteria: string | null;
  background_image_paths: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScenarioCreate {
  name: string;
  description?: string;
  situation: string;
  goal?: string;
  evaluation_criteria?: string;
  background_image_paths?: string[];
}

// Character types
export interface VoiceConfig {
  provider: "azure" | "aws" | "google";
  voice_name: string;
  pitch: number; // -50 to +50 (Azure Speech Services)
  rate: number; // 0.5 to 2.0 (Azure Speech Services)
}

/**
 * アニメーション状態の定義（7種類）
 * 各状態は対応するVRMAファイルの動作に基づいて命名
 *
 * | 状態名    | VRMAファイル | 動作内容     |
 * |----------|-------------|-------------|
 * | idle     | VRMA_06     | モデルポーズ |
 * | greeting | VRMA_02     | 挨拶        |
 * | happy    | VRMA_03     | Vサイン     |
 * | present  | VRMA_01     | 全身を見せる |
 * | shoot    | VRMA_04     | 撃つ        |
 * | spin     | VRMA_05     | 回る        |
 * | exercise | VRMA_07     | 屈伸運動    |
 */
export type AnimationState =
  | "idle"      // VRMA_06: モデルポーズ
  | "greeting"  // VRMA_02: 挨拶
  | "happy"     // VRMA_03: Vサイン
  | "present"   // VRMA_01: 全身を見せる
  | "shoot"     // VRMA_04: 撃つ
  | "spin"      // VRMA_05: 回る
  | "exercise"  // VRMA_07: 屈伸運動
  | "talking"   // 話している
  | "sad"       // 悲しい
  | "surprised" // 驚き
  | "angry"     // 怒り
  | "thinking"; // 考え中

// AnimationConfig は文字列インデックスで柔軟に対応
export type AnimationConfig = Partial<Record<AnimationState, string>>;

// AnimationModel types (CRUD)
export interface AnimationModel {
  id: number;
  name: string;
  description: string | null;
  animation_config: AnimationConfig;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnimationModelCreate {
  name: string;
  description?: string;
  animation_config: AnimationConfig;
  is_default?: boolean;
}

export interface AnimationModelUpdate {
  name?: string;
  description?: string;
  animation_config?: AnimationConfig;
  is_default?: boolean;
  is_active?: boolean;
}

// Animation controller options
export interface AnimationControllerOptions {
  /** デフォルトアニメーション状態 */
  defaultState?: AnimationState;
  /** クロスフェード時間（秒） */
  blendDuration?: number;
  /** ループする状態のリスト */
  loopStates?: AnimationState[];
}

export interface Character {
  id: number;
  name: string;
  persona: string;
  speaking_style: string | null;
  system_prompt: string;
  model_path: string;
  model_type: "vrm" | "glb";
  voice_config: VoiceConfig | null;
  animation_config: AnimationConfig | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CharacterCreate {
  name: string;
  persona: string;
  speaking_style?: string;
  system_prompt: string;
  model_path: string;
  model_type: "vrm" | "glb";
  voice_config?: VoiceConfig;
  animation_config?: AnimationConfig;
}

// Voice info types (for voices API)
export interface VoiceInfo {
  provider: "azure" | "aws" | "google";
  voice_name: string;
  display_name: string;
  gender: "male" | "female" | "neutral";
  language: string;
  style_list: string[];
}

// Model upload response
export interface ModelUploadResponse {
  file_path: string;
  file_name: string;
  file_size: number;
  model_type: "vrm" | "glb";
}

// Chat types
export interface InitialMessage {
  content: string;
  emotion: string;
  audio_base64: string;
  visemes: Viseme[];
}

export interface ChatSession {
  session_id: string;
  scenario: Scenario;
  character: Character;
  initial_message: InitialMessage;
  created_at: string;
  expires_at: string;
}

export interface UserMessage {
  content: string;
  timestamp: string;
}

export interface AIResponse {
  content: string;
  emotion: string;
  audio_base64: string;
  visemes: Viseme[];
}

export interface ChatMessage {
  message_id: string;
  user_message: UserMessage;
  response: AIResponse;
  turn_count: number;
  timestamp: string;
}

export interface Viseme {
  time: number;
  viseme: string;
}

// Speech types
export interface STTResult {
  text: string;
  confidence: number;
  provider: string;
}

export interface TTSResult {
  audio_url: string;
  duration: number;
  visemes: Viseme[];
}

// Health types
export interface HealthResponse {
  status: string;
  version: string;
  database: string;
  redis: string;
}

// STT types (F-004)
export type {
  MicrophoneState,
  RecognitionState,
  MicrophoneError,
  RecognitionResult,
  RecognitionError,
  SpeechToken,
} from "./speech";

// Conversation animation types (F-010)
export type ConversationPhase = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';
export type EmotionType = 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry';

export interface ExpressionConfig {
  normal: number;   // 通常時のWeight
  speaking: number; // 発話中のWeight
}

export type EmotionExpressionMap = Record<EmotionType, {
  expression: string;
  config: ExpressionConfig;
}>;

// Animation-linked expression types (F-011)
export interface AnimationExpressionDef {
  /** 適用する表情名 (VRM BlendShape) */
  expression: string;
  /** アニメーション開始からの遅延（秒） */
  delayIn: number;
  /** フェードイン時間（秒） */
  fadeIn: number;
  /** 目標 weight */
  weight: number;
  /** アニメーション開始からフェードアウト開始までの時間（秒） */
  delayOut: number;
  /** フェードアウト時間（秒） */
  fadeOut: number;
  /** 自動瞬きを抑制するか */
  suppressBlink?: boolean;
}

// Session management types (F-009)
export type SessionStatus = 'active' | 'paused' | 'ended' | 'expired';

export interface SessionInfo {
  session_id: string;
  scenario_id: number;
  character_id: number;
  status: SessionStatus;
  turn_count: number;
  created_at: string;
  expires_at: string;
  last_activity_at: string;
  paused_at: string | null;
  remaining_seconds: number;
  can_extend: boolean;
}

export interface SessionPauseResponse {
  session_id: string;
  status: 'paused';
  paused_at: string;
  expires_at: string;
  message: string;
}

export interface SessionResumeResponse {
  session_id: string;
  status: 'active';
  resumed_at: string;
  expires_at: string;
  turn_count: number;
  message: string;
}

export interface SessionExtendResponse {
  session_id: string;
  status: string;
  previous_expires_at: string;
  expires_at: string;
  extended_minutes: number;
  message: string;
}

// F-014: Scenario AI Generation (scenario only — characters remain manual)
export interface GenerationRequest {
  description: string;
  locale?: string;
}

export interface GenerationPreviewScenario {
  name: string;
  description: string | null;
  situation: string;
  goal: string | null;
  evaluation_criteria: string | null;
}

export interface GenerationPreviewResponse {
  scenario: GenerationPreviewScenario;
  warnings: string[];
}
