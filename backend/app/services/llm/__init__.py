"""LLMサービスモジュール"""

from app.services.llm.base import LLMResponse, LLMServiceBase, Message
from app.services.llm.langchain_service import LangChainService


def get_llm_service() -> LLMServiceBase:
    """LLMサービスのファクトリー関数"""
    return LangChainService()


__all__ = ["LLMServiceBase", "Message", "LLMResponse", "get_llm_service"]
