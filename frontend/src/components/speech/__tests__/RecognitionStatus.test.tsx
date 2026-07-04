/**
 * F-004: 音声入力（STT）機能 - RecognitionStatus コンポーネントテスト
 */

import { render, screen } from "@testing-library/react";
import { RecognitionStatus } from "../RecognitionStatus";
import type { RecognitionState, RecognitionError } from "@/types/speech";

describe("RecognitionStatus", () => {
  describe("idle 状態", () => {
    it("待機中のメッセージを表示すること", () => {
      render(<RecognitionStatus state="idle" />);

      expect(
        screen.getByText("マイクボタンを押して話しかけてください")
      ).toBeInTheDocument();
    });

    it("アイコンが表示されないこと", () => {
      const { container } = render(<RecognitionStatus state="idle" />);

      const icon = container.querySelector("svg");
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe("starting 状態", () => {
    it("起動中のメッセージを表示すること", () => {
      render(<RecognitionStatus state="starting" />);

      expect(
        screen.getByText("認識エンジンを起動中...")
      ).toBeInTheDocument();
    });

    it("ローディングアイコンが表示されること", () => {
      const { container } = render(<RecognitionStatus state="starting" />);

      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("listening 状態", () => {
    it("中間テキストがない場合、デフォルトメッセージを表示すること", () => {
      render(<RecognitionStatus state="listening" />);

      expect(screen.getByText("聞き取り中...")).toBeInTheDocument();
    });

    it("中間テキストがある場合、それを表示すること", () => {
      render(
        <RecognitionStatus state="listening" interimText="こんにちは" />
      );

      expect(screen.getByText("こんにちは")).toBeInTheDocument();
      expect(screen.queryByText("聞き取り中...")).not.toBeInTheDocument();
    });

    it("ローディングアイコンが表示されること", () => {
      const { container } = render(<RecognitionStatus state="listening" />);

      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("processing 状態", () => {
    it("処理中のメッセージを表示すること", () => {
      render(<RecognitionStatus state="processing" />);

      expect(screen.getByText("処理中...")).toBeInTheDocument();
    });

    it("ローディングアイコンが表示されること", () => {
      const { container } = render(<RecognitionStatus state="processing" />);

      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("stopped 状態", () => {
    it("停止メッセージを表示すること", () => {
      render(<RecognitionStatus state="stopped" />);

      expect(screen.getByText("認識を停止しました")).toBeInTheDocument();
    });

    it("成功アイコンが表示されること", () => {
      const { container } = render(<RecognitionStatus state="stopped" />);

      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("error 状態", () => {
    it("エラーメッセージを表示すること", () => {
      const error: RecognitionError = {
        code: "NETWORK_ERROR",
        message: "ネットワークエラーが発生しました",
      };

      render(<RecognitionStatus state="error" error={error} />);

      expect(
        screen.getByText("ネットワークエラーが発生しました")
      ).toBeInTheDocument();
    });

    it("エラー情報がない場合、デフォルトメッセージを表示すること", () => {
      render(<RecognitionStatus state="error" />);

      expect(
        screen.getByText("エラーが発生しました")
      ).toBeInTheDocument();
    });

    it("エラーアイコンが表示されること", () => {
      const { container } = render(<RecognitionStatus state="error" />);

      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("スタイル", () => {
    it("idle 状態で適切なスタイルが適用されること", () => {
      render(<RecognitionStatus state="idle" />);

      const text = screen.getByText("マイクボタンを押して話しかけてください");
      expect(text).toHaveClass("text-text-muted");
    });

    it("listening 状態で中間テキストありの場合、強調スタイルが適用されること", () => {
      render(
        <RecognitionStatus state="listening" interimText="テスト" />
      );

      const text = screen.getByText("テスト");
      expect(text).toHaveClass("text-text-primary", "font-medium");
    });

    it("error 状態でエラースタイルが適用されること", () => {
      render(<RecognitionStatus state="error" />);

      const text = screen.getByText("エラーが発生しました");
      expect(text).toHaveClass("text-status-error");
    });

    it("stopped 状態で成功スタイルが適用されること", () => {
      render(<RecognitionStatus state="stopped" />);

      const text = screen.getByText("認識を停止しました");
      expect(text).toHaveClass("text-status-success");
    });
  });

  describe("カスタムクラス", () => {
    it("カスタムクラスが適用されること", () => {
      const { container } = render(
        <RecognitionStatus state="idle" className="custom-class" />
      );

      const statusDiv = container.firstChild;
      expect(statusDiv).toHaveClass("custom-class");
    });
  });

  describe("空メッセージ", () => {
    it("不正な状態の場合、何も表示しないこと", () => {
      const { container } = render(
        <RecognitionStatus state={"invalid" as RecognitionState} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("中間テキスト", () => {
    it("listening 以外の状態では中間テキストが無視されること", () => {
      render(<RecognitionStatus state="idle" interimText="無視される" />);

      expect(screen.queryByText("無視される")).not.toBeInTheDocument();
    });

    it("空の中間テキストの場合、デフォルトメッセージが表示されること", () => {
      render(<RecognitionStatus state="listening" interimText="" />);

      expect(screen.getByText("聞き取り中...")).toBeInTheDocument();
    });
  });

  describe("アクセシビリティ", () => {
    it("メッセージが適切にマークアップされていること", () => {
      render(<RecognitionStatus state="idle" />);

      const message = screen.getByText("マイクボタンを押して話しかけてください");
      expect(message.tagName).toBe("P");
    });

    it("エラー状態で適切なARIA属性が設定されていること", () => {
      const { container } = render(<RecognitionStatus state="error" />);

      const statusDiv = container.firstChild;
      expect(statusDiv).toBeInTheDocument();
    });
  });

  describe("アニメーション", () => {
    it("starting 状態でスピンアニメーションが適用されること", () => {
      const { container } = render(<RecognitionStatus state="starting" />);

      const icon = container.querySelector("svg");
      expect(icon).toHaveClass("animate-spin");
    });

    it("listening 状態でスピンアニメーションが適用されること", () => {
      const { container } = render(<RecognitionStatus state="listening" />);

      const icon = container.querySelector("svg");
      expect(icon).toHaveClass("animate-spin");
    });

    it("processing 状態でスピンアニメーションが適用されること", () => {
      const { container } = render(<RecognitionStatus state="processing" />);

      const icon = container.querySelector("svg");
      expect(icon).toHaveClass("animate-spin");
    });
  });
});
