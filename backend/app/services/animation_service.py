from typing import Literal

from app.schemas.animation import AnimationConfig


class AnimationService:
    """
    アニメーション設定サービス

    アニメーション設定の管理、検証、デフォルト値の提供を行います。
    """

    @staticmethod
    def get_default_config() -> AnimationConfig:
        """
        デフォルトアニメーション設定を取得

        Returns:
            AnimationConfig: デフォルト設定
        """
        return AnimationConfig(
            idle="idle_01",
            talking="talking_01",
            happy="happy_01",
            sad="sad_01",
            surprised=None,
            angry=None,
            thinking=None,
        )

    @staticmethod
    def validate_config(config: AnimationConfig) -> tuple[bool, list[str], list[str]]:
        """
        アニメーション設定の妥当性を検証

        Args:
            config: 検証対象のアニメーション設定

        Returns:
            tuple[bool, list[str], list[str]]: (検証結果, エラーリスト, 警告リスト)
        """
        errors = []
        warnings = []

        # 必須フィールドの検証
        if not config.idle:
            errors.append("idle animation is required")
        if not config.talking:
            errors.append("talking animation is required")

        # オプションフィールドの警告
        if not config.happy:
            warnings.append("happy animation is not set, will use idle as fallback")
        if not config.sad:
            warnings.append("sad animation is not set, will use idle as fallback")

        # 重複チェック
        animation_names = []
        if config.idle:
            animation_names.append(("idle", config.idle))
        if config.talking:
            animation_names.append(("talking", config.talking))
        if config.happy:
            animation_names.append(("happy", config.happy))
        if config.sad:
            animation_names.append(("sad", config.sad))
        if config.surprised:
            animation_names.append(("surprised", config.surprised))
        if config.angry:
            animation_names.append(("angry", config.angry))
        if config.thinking:
            animation_names.append(("thinking", config.thinking))

        # 同じアニメーション名が複数の感情に設定されている場合は警告
        seen = {}
        for emotion, name in animation_names:
            if name in seen:
                warnings.append(
                    f"Animation '{name}' is used for both '{seen[name]}' and '{emotion}'"
                )
            else:
                seen[name] = emotion

        is_valid = len(errors) == 0

        return is_valid, errors, warnings

    @staticmethod
    def get_animation_for_emotion(
        emotion: Literal["neutral", "happy", "sad", "surprised", "angry", "thinking"],
        config: AnimationConfig,
    ) -> tuple[str, bool]:
        """
        感情からアニメーション名を取得

        Args:
            emotion: 感情タイプ
            config: アニメーション設定

        Returns:
            tuple[str, bool]: (アニメーション名, フォールバック使用フラグ)
        """
        # 感情に応じたアニメーションマッピング
        emotion_map = {
            "neutral": config.idle,
            "happy": config.happy,
            "sad": config.sad,
            "surprised": config.surprised,
            "angry": config.angry,
            "thinking": config.thinking,
        }

        animation_name = emotion_map.get(emotion)
        fallback_used = False

        # アニメーションが設定されていない場合のフォールバック
        if not animation_name:
            # talking 中の感情変化の場合は talking を優先
            # それ以外は idle にフォールバック
            animation_name = config.idle
            fallback_used = True

        return animation_name, fallback_used

    @staticmethod
    def get_talking_animation(config: AnimationConfig) -> str:
        """
        会話時のアニメーション名を取得

        Args:
            config: アニメーション設定

        Returns:
            str: 会話アニメーション名
        """
        return config.talking if config.talking else config.idle

    @staticmethod
    def merge_with_defaults(config: AnimationConfig | None) -> AnimationConfig:
        """
        設定にデフォルト値をマージ

        Args:
            config: ユーザー設定（None可）

        Returns:
            AnimationConfig: デフォルト値でマージされた設定
        """
        if config is None:
            return AnimationService.get_default_config()

        # ユーザー設定を優先し、未設定項目はデフォルトで補完
        default = AnimationService.get_default_config()

        return AnimationConfig(
            idle=config.idle or default.idle,
            talking=config.talking or default.talking,
            happy=config.happy or default.happy,
            sad=config.sad or default.sad,
            surprised=config.surprised or default.surprised,
            angry=config.angry or default.angry,
            thinking=config.thinking or default.thinking,
        )
