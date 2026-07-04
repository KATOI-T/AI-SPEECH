"""LLMサービス基底クラス"""

from abc import ABC, abstractmethod
from typing import TypedDict


class Message(TypedDict):
    """メッセージ型"""

    role: str  # "system" | "user" | "assistant"
    content: str


class LLMResponse(TypedDict):
    """LLM応答型"""

    content: str
    emotion: str


class LLMServiceBase(ABC):
    """LLMサービス基底クラス"""

    @abstractmethod
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
        pass

    @abstractmethod
    async def generate_initial_message(self, system_prompt: str) -> LLMResponse:
        """
        初期メッセージを生成

        Args:
            system_prompt: システムプロンプト

        Returns:
            LLMResponse: 初期メッセージと感情
        """
        pass
