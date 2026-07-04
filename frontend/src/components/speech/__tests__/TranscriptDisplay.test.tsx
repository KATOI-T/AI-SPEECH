/**
 * F-004: 音声入力（STT）機能 - TranscriptDisplay コンポーネントテスト
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { TranscriptDisplay } from "../TranscriptDisplay";
import type { RecognitionResult } from "@/types/speech";

describe("TranscriptDisplay", () => {
  const mockOnClear = jest.fn();

  beforeEach(() => {
    mockOnClear.mockClear();
  });

  describe("空状態", () => {
    it("結果がない場合、プレースホルダーを表示すること", () => {
      render(<TranscriptDisplay results={[]} />);

      expect(
        screen.getByText("認識結果がここに表示されます")
      ).toBeInTheDocument();
    });

    it("中間テキストもない場合、プレースホルダーを表示すること", () => {
      render(<TranscriptDisplay results={[]} interimText="" />);

      expect(
        screen.getByText("認識結果がここに表示されます")
      ).toBeInTheDocument();
    });
  });

  describe("認識結果表示", () => {
    it("単一の認識結果を表示できること", () => {
      const results: RecognitionResult[] = [
        {
          text: "こんにちは",
          confidence: 0.95,
          isFinal: true,
        },
      ];

      render(<TranscriptDisplay results={results} />);

      expect(screen.getByText("こんにちは")).toBeInTheDocument();
      expect(screen.getByText("信頼度: 95%")).toBeInTheDocument();
    });

    it("複数の認識結果を表示できること", () => {
      const results: RecognitionResult[] = [
        {
          text: "こんにちは",
          confidence: 0.95,
          isFinal: true,
        },
        {
          text: "お元気ですか",
          confidence: 0.92,
          isFinal: true,
        },
      ];

      render(<TranscriptDisplay results={results} />);

      expect(screen.getByText("こんにちは")).toBeInTheDocument();
      expect(screen.getByText("お元気ですか")).toBeInTheDocument();
    });

    it("信頼度が0の場合、信頼度を表示しないこと", () => {
      const results: RecognitionResult[] = [
        {
          text: "テスト",
          confidence: 0,
          isFinal: false,
        },
      ];

      render(<TranscriptDisplay results={results} />);

      expect(screen.getByText("テスト")).toBeInTheDocument();
      expect(screen.queryByText(/信頼度/)).not.toBeInTheDocument();
    });
  });

  describe("中間テキスト表示", () => {
    it("中間テキストを表示できること", () => {
      render(<TranscriptDisplay results={[]} interimText="認識中のテキスト" />);

      expect(screen.getByText("認識中のテキスト")).toBeInTheDocument();
      expect(screen.getByText("認識中...")).toBeInTheDocument();
    });

    it("中間テキストがイタリック体で表示されること", () => {
      const { container } = render(
        <TranscriptDisplay results={[]} interimText="中間テキスト" />
      );

      const interimElement = screen.getByText("中間テキスト");
      expect(interimElement).toHaveClass("italic");
    });

    it("結果と中間テキストを同時に表示できること", () => {
      const results: RecognitionResult[] = [
        {
          text: "確定済み",
          confidence: 0.9,
          isFinal: true,
        },
      ];

      render(
        <TranscriptDisplay results={results} interimText="認識中" />
      );

      expect(screen.getByText("確定済み")).toBeInTheDocument();
      expect(screen.getByText("認識中")).toBeInTheDocument();
    });
  });

  describe("クリアボタン", () => {
    it("showClear が true の場合、クリアボタンを表示すること", () => {
      const results: RecognitionResult[] = [
        {
          text: "テスト",
          confidence: 0.9,
          isFinal: true,
        },
      ];

      render(
        <TranscriptDisplay
          results={results}
          showClear={true}
          onClear={mockOnClear}
        />
      );

      const clearButton = screen.getByRole("button", { name: "結果をクリア" });
      expect(clearButton).toBeInTheDocument();
    });

    it("showClear が false の場合、クリアボタンを表示しないこと", () => {
      const results: RecognitionResult[] = [
        {
          text: "テスト",
          confidence: 0.9,
          isFinal: true,
        },
      ];

      render(
        <TranscriptDisplay
          results={results}
          showClear={false}
          onClear={mockOnClear}
        />
      );

      expect(
        screen.queryByRole("button", { name: "結果をクリア" })
      ).not.toBeInTheDocument();
    });

    it("結果がない場合、クリアボタンを表示しないこと", () => {
      render(
        <TranscriptDisplay
          results={[]}
          showClear={true}
          onClear={mockOnClear}
        />
      );

      expect(
        screen.queryByRole("button", { name: "結果をクリア" })
      ).not.toBeInTheDocument();
    });

    it("クリアボタンをクリックすると onClear が呼ばれること", () => {
      const results: RecognitionResult[] = [
        {
          text: "テスト",
          confidence: 0.9,
          isFinal: true,
        },
      ];

      render(
        <TranscriptDisplay
          results={results}
          showClear={true}
          onClear={mockOnClear}
        />
      );

      const clearButton = screen.getByRole("button", { name: "結果をクリア" });
      fireEvent.click(clearButton);

      expect(mockOnClear).toHaveBeenCalledTimes(1);
    });

    it("onClear がない場合、クリアボタンを表示しないこと", () => {
      const results: RecognitionResult[] = [
        {
          text: "テスト",
          confidence: 0.9,
          isFinal: true,
        },
      ];

      render(<TranscriptDisplay results={results} showClear={true} />);

      expect(
        screen.queryByRole("button", { name: "結果をクリア" })
      ).not.toBeInTheDocument();
    });
  });

  describe("スタイル", () => {
    it("最終結果にアクセントボーダーが適用されること", () => {
      const results: RecognitionResult[] = [
        {
          text: "確定テキスト",
          confidence: 0.95,
          isFinal: true,
        },
      ];

      const { container } = render(<TranscriptDisplay results={results} />);

      const resultElement = screen.getByText("確定テキスト").parentElement;
      expect(resultElement).toHaveClass("border-accent-primary");
    });

    it("中間結果の不透明度が低いこと", () => {
      const results: RecognitionResult[] = [
        {
          text: "中間テキスト",
          confidence: 0,
          isFinal: false,
        },
      ];

      const { container } = render(<TranscriptDisplay results={results} />);

      const resultElement = screen.getByText("中間テキスト").parentElement;
      expect(resultElement).toHaveClass("opacity-70");
    });

    it("中間認識テキストにボーダーが適用されること", () => {
      const { container } = render(
        <TranscriptDisplay results={[]} interimText="認識中" />
      );

      const interimElement = screen.getByText("認識中").parentElement;
      expect(interimElement).toHaveClass("border-l-4", "border-text-muted");
    });
  });

  describe("カスタムクラス", () => {
    it("カスタムクラスが適用されること", () => {
      const { container } = render(
        <TranscriptDisplay results={[]} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("スクロール", () => {
    it("結果リストがスクロール可能であること", () => {
      const results: RecognitionResult[] = [
        {
          text: "テスト1",
          confidence: 0.9,
          isFinal: true,
        },
      ];

      const { container } = render(<TranscriptDisplay results={results} />);

      const scrollContainer = container.querySelector(".overflow-y-auto");
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe("ヘッダー", () => {
    it("「認識結果」ヘッダーが表示されること", () => {
      const results: RecognitionResult[] = [
        {
          text: "テスト",
          confidence: 0.9,
          isFinal: true,
        },
      ];

      render(<TranscriptDisplay results={results} />);

      expect(screen.getByText("認識結果")).toBeInTheDocument();
    });

    it("空状態ではヘッダーが表示されないこと", () => {
      render(<TranscriptDisplay results={[]} />);

      expect(screen.queryByText("認識結果")).not.toBeInTheDocument();
    });
  });

  describe("信頼度表示", () => {
    it("信頼度がパーセント表示されること", () => {
      const results: RecognitionResult[] = [
        {
          text: "テスト",
          confidence: 0.8765,
          isFinal: true,
        },
      ];

      render(<TranscriptDisplay results={results} />);

      expect(screen.getByText("信頼度: 88%")).toBeInTheDocument();
    });

    it("信頼度が100%の場合、正しく表示されること", () => {
      const results: RecognitionResult[] = [
        {
          text: "テスト",
          confidence: 1.0,
          isFinal: true,
        },
      ];

      render(<TranscriptDisplay results={results} />);

      expect(screen.getByText("信頼度: 100%")).toBeInTheDocument();
    });
  });
});
