"""LangChain + GPT-4o-mini 実装"""

import json
import logging
import re

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.core.config import get_settings
from app.services.llm.base import LLMResponse, LLMServiceBase, Message

logger = logging.getLogger(__name__)


class LangChainService(LLMServiceBase):
    """LangChain + GPT-4o-mini 実装"""

    def __init__(self) -> None:
        settings = get_settings()
        self._model = ChatOpenAI(
            model="gpt-4o-mini", temperature=0.7, api_key=settings.openai_api_key
        )

    async def generate_response(
        self, system_prompt: str, messages: list[Message], user_input: str
    ) -> LLMResponse:
        """
        応答を生成

        Args:
            system_prompt: システムプロンプト
            messages: 会話履歴
            user_input: ユーザー入力

        Returns:
            LLMResponse: 応答内容と感情
        """
        # メッセージリスト構築
        langchain_messages = [
            SystemMessage(content=self._build_system_prompt(system_prompt))
        ]

        for msg in messages:
            if msg["role"] == "user":
                langchain_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                langchain_messages.append(AIMessage(content=msg["content"]))

        langchain_messages.append(HumanMessage(content=user_input))

        # LLM呼び出し
        logger.info("Calling LLM for response generation")
        response = await self._model.ainvoke(langchain_messages)

        # 応答をパース
        return self._parse_response(response.content)

    async def generate_initial_message(self, system_prompt: str) -> LLMResponse:
        """
        初期メッセージを生成

        Args:
            system_prompt: システムプロンプト

        Returns:
            LLMResponse: 初期メッセージと感情
        """
        prompt = self._build_system_prompt(system_prompt)
        initial_prompt = f"{prompt}\n\n最初の挨拶をしてください。お客様が来店したところです。"

        logger.info("Calling LLM for initial message generation")
        response = await self._model.ainvoke([SystemMessage(content=initial_prompt)])

        return self._parse_response(response.content)

    def _build_system_prompt(self, base_prompt: str) -> str:
        """システムプロンプトを構築"""
        return f"""{base_prompt}

【応答形式】
応答は以下のJSON形式で返してください:
{{
  "content": "実際の応答テキスト",
  "emotion": "感情(neutral, happy, sad, surprised, angryのいずれか)"
}}

【注意事項】
- キャラクターの口調と性格を維持してください
- 自然な日本語で応答してください
- 感情は応答の内容に合わせて適切に選択してください
"""

    def _parse_response(self, content: str) -> LLMResponse:
        """LLM応答をパース"""
        try:
            # JSON形式の応答をパース
            json_match = re.search(r"\{[^{}]*\}", content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return LLMResponse(
                    content=data.get("content", content),
                    emotion=data.get("emotion", "neutral"),
                )
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"Failed to parse JSON response: {e}")

        # パース失敗時はそのまま返却
        return LLMResponse(content=content, emotion="neutral")
