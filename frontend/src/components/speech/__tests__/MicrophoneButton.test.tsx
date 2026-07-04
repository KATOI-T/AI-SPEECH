/**
 * F-004: 音声入力（STT）機能 - MicrophoneButton コンポーネントテスト
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { MicrophoneButton } from "../MicrophoneButton";
import type { MicrophoneError } from "@/types/speech";

describe("MicrophoneButton", () => {
  const mockOnToggle = jest.fn();

  beforeEach(() => {
    mockOnToggle.mockClear();
  });

  describe("レンダリング", () => {
    it("待機中の状態で正しくレンダリングされること", () => {
      render(
        <MicrophoneButton isRecording={false} onToggle={mockOnToggle} />
      );

      const button = screen.getByRole("button", { name: "録音を開始" });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it("録音中の状態で正しくレンダリングされること", () => {
      render(<MicrophoneButton isRecording={true} onToggle={mockOnToggle} />);

      const button = screen.getByRole("button", { name: "録音を停止" });
      expect(button).toBeInTheDocument();
    });

    it("無効化された状態で正しくレンダリングされること", () => {
      render(
        <MicrophoneButton
          isRecording={false}
          onToggle={mockOnToggle}
          disabled={true}
        />
      );

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });
  });

  describe("クリック動作", () => {
    it("クリック時に onToggle が呼ばれること", () => {
      render(
        <MicrophoneButton isRecording={false} onToggle={mockOnToggle} />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    it("無効化された状態ではクリックできないこと", () => {
      render(
        <MicrophoneButton
          isRecording={false}
          onToggle={mockOnToggle}
          disabled={true}
        />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(mockOnToggle).not.toHaveBeenCalled();
    });
  });

  describe("エラー表示", () => {
    it("エラーがある場合、エラーメッセージを表示すること", () => {
      const error: MicrophoneError = {
        code: "NOT_ALLOWED",
        message: "マイクへのアクセスが許可されていません。",
      };

      render(
        <MicrophoneButton
          isRecording={false}
          onToggle={mockOnToggle}
          error={error}
        />
      );

      expect(
        screen.getByText("マイクへのアクセスが許可されていません。")
      ).toBeInTheDocument();
    });

    it("エラーがない場合、エラーメッセージを表示しないこと", () => {
      render(
        <MicrophoneButton isRecording={false} onToggle={mockOnToggle} />
      );

      expect(
        screen.queryByText(/マイクへのアクセスが許可されていません/)
      ).not.toBeInTheDocument();
    });
  });

  describe("サイズバリエーション", () => {
    it("small サイズで正しくレンダリングされること", () => {
      const { container } = render(
        <MicrophoneButton
          isRecording={false}
          onToggle={mockOnToggle}
          size="sm"
        />
      );

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-10", "w-10");
    });

    it("medium サイズで正しくレンダリングされること", () => {
      const { container } = render(
        <MicrophoneButton
          isRecording={false}
          onToggle={mockOnToggle}
          size="md"
        />
      );

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-14", "w-14");
    });

    it("large サイズで正しくレンダリングされること", () => {
      const { container } = render(
        <MicrophoneButton
          isRecording={false}
          onToggle={mockOnToggle}
          size="lg"
        />
      );

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-20", "w-20");
    });
  });

  describe("視覚的状態", () => {
    it("録音中の場合、適切なスタイルが適用されること", () => {
      render(<MicrophoneButton isRecording={true} onToggle={mockOnToggle} />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-status-success");  // 緑色で固定表示
      expect(button).not.toHaveClass("animate-pulse");  // 点滅なし
    });

    it("待機中の場合、適切なスタイルが適用されること", () => {
      render(
        <MicrophoneButton isRecording={false} onToggle={mockOnToggle} />
      );

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-bg-secondary");
    });

    it("エラー状態の場合、適切なスタイルが適用されること", () => {
      const error: MicrophoneError = {
        code: "UNKNOWN",
        message: "エラー",
      };

      render(
        <MicrophoneButton
          isRecording={false}
          onToggle={mockOnToggle}
          error={error}
        />
      );

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-status-warning");
    });
  });

  describe("カスタムクラス", () => {
    it("カスタムクラスが適用されること", () => {
      render(
        <MicrophoneButton
          isRecording={false}
          onToggle={mockOnToggle}
          className="custom-class"
        />
      );

      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });
  });

  describe("アクセシビリティ", () => {
    it("適切な aria-label が設定されること (待機中)", () => {
      render(
        <MicrophoneButton isRecording={false} onToggle={mockOnToggle} />
      );

      expect(
        screen.getByRole("button", { name: "録音を開始" })
      ).toBeInTheDocument();
    });

    it("適切な aria-label が設定されること (録音中)", () => {
      render(<MicrophoneButton isRecording={true} onToggle={mockOnToggle} />);

      expect(
        screen.getByRole("button", { name: "録音を停止" })
      ).toBeInTheDocument();
    });
  });

  describe("アイコン表示", () => {
    it("エラー時にアラートアイコンが表示されること", () => {
      const error: MicrophoneError = {
        code: "NOT_ALLOWED",
        message: "エラー",
      };

      const { container } = render(
        <MicrophoneButton
          isRecording={false}
          onToggle={mockOnToggle}
          error={error}
        />
      );

      // AlertCircle アイコンが存在することを確認（lucide-react）
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("録音中にマイクアイコンが表示されること", () => {
      const { container } = render(
        <MicrophoneButton isRecording={true} onToggle={mockOnToggle} />
      );

      // Mic アイコンが存在することを確認
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("待機中にマイクオフアイコンが表示されること", () => {
      const { container } = render(
        <MicrophoneButton isRecording={false} onToggle={mockOnToggle} />
      );

      // MicOff アイコンが存在することを確認
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });
});
