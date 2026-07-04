/**
 * F-005: 音声出力（TTS）- API サービス
 */

import { apiClient } from "./client";
import type { TTSRequest, TTSResponse, VoiceListResponse } from "@/types/tts";

/**
 * TTS API サービス
 */
export const ttsApi = {
  /**
   * テキストから音声を合成
   *
   * @param request - TTS リクエスト
   * @returns 音声データと Viseme タイムライン
   *
   * @example
   * ```ts
   * const response = await ttsApi.synthesize({
   *   text: "こんにちは",
   *   voice_name: "ja-JP-NanamiNeural",
   *   rate: 1.0,
   *   pitch: 0,
   * });
   * ```
   */
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    return apiClient.post<TTSResponse>("/api/v1/tts/synthesize", request);
  },

  /**
   * 利用可能な音声リストを取得
   *
   * @returns 音声名のリスト
   *
   * @example
   * ```ts
   * const { voices } = await ttsApi.getVoices();
   * // ["ja-JP-NanamiNeural", "ja-JP-KeitaNeural", ...]
   * ```
   */
  async getVoices(): Promise<VoiceListResponse> {
    return apiClient.get<VoiceListResponse>("/api/v1/tts/voices");
  },
};
