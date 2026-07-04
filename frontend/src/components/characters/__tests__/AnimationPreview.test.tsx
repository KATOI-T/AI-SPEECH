import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AnimationPreview } from "../AnimationPreview";
import type { AnimationConfig } from "@/types";

// resolveModelUrlのモック（ローカルパスをそのまま返す）
jest.mock("@/lib/api/models", () => ({
  resolveModelUrl: jest.fn((path: string) => Promise.resolve(path)),
}));

// VRMViewerコンポーネントのモック
jest.mock("@/components/three/VRMViewer", () => ({
  VRMViewer: ({ animationState }: { animationState: string }) => (
    <div data-testid="vrm-viewer">Animation: {animationState}</div>
  ),
}));

describe("AnimationPreview", () => {
  const mockModelPath = "/models/test.vrm";
  const mockModelType = "vrm" as const;

  describe("表示テスト", () => {
    it("アニメーション設定がない場合、メッセージを表示する", () => {
      render(
        <AnimationPreview
          modelPath={mockModelPath}
          modelType={mockModelType}
          animationConfig={null}
        />
      );

      expect(
        screen.getByText("アニメーション設定がありません")
      ).toBeInTheDocument();
    });

    it("アニメーションファイルが設定されていない場合、メッセージを表示する", () => {
      const emptyConfig: AnimationConfig = {};

      render(
        <AnimationPreview
          modelPath={mockModelPath}
          modelType={mockModelType}
          animationConfig={emptyConfig}
        />
      );

      expect(
        screen.getByText("アニメーションファイルが設定されていません")
      ).toBeInTheDocument();
    });

    it("設定されているアニメーションのボタンのみ表示する", async () => {
      const partialConfig: AnimationConfig = {
        idle: "/animations/idle.vrma",
        happy: "/animations/happy.vrma",
        sad: "/animations/sad.vrma",
      };

      render(
        <AnimationPreview
          modelPath={mockModelPath}
          modelType={mockModelType}
          animationConfig={partialConfig}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByRole("button")).toBeDefined();
      });

      const buttons = screen.getAllByRole("button");

      // 設定されているボタンが存在する
      expect(buttons.find((btn) => btn.textContent === "待機")).toBeDefined();
      expect(screen.getByRole("button", { name: /^喜び$/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^悲しみ$/ })).toBeInTheDocument();

      // 設定されていないボタンは存在しない
      expect(
        screen.queryByRole("button", { name: /^会話中$/ })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /^驚き$/ })
      ).not.toBeInTheDocument();
    });

    it("全てのアニメーションが設定されている場合、全ボタンを表示する", async () => {
      const fullConfig: AnimationConfig = {
        idle: "/animations/idle.vrma",
        greeting: "/animations/greeting.vrma",
        happy: "/animations/happy.vrma",
        present: "/animations/present.vrma",
        shoot: "/animations/shoot.vrma",
        spin: "/animations/spin.vrma",
        exercise: "/animations/exercise.vrma",
        talking: "/animations/talking.vrma",
        sad: "/animations/sad.vrma",
        surprised: "/animations/surprised.vrma",
        angry: "/animations/angry.vrma",
        thinking: "/animations/thinking.vrma",
      };

      render(
        <AnimationPreview
          modelPath={mockModelPath}
          modelType={mockModelType}
          animationConfig={fullConfig}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^挨拶$/ })).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole("button");

      expect(buttons.find((btn) => btn.textContent === "待機")).toBeDefined();
      expect(screen.getByRole("button", { name: /^喜び$/ })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^全身表示$/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^撃つ$/ })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^回る$/ })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^屈伸運動$/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^会話中$/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^悲しみ$/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^驚き$/ })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^怒り$/ })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^考え中$/ })
      ).toBeInTheDocument();
    });

    it("初期状態でidleアニメーションが表示される", async () => {
      const config: AnimationConfig = {
        idle: "/animations/idle.vrma",
        happy: "/animations/happy.vrma",
      };

      const { container } = render(
        <AnimationPreview
          modelPath={mockModelPath}
          modelType={mockModelType}
          animationConfig={config}
        />
      );

      await waitFor(() => {
        expect(container.textContent).toContain("現在のモーション:");
      });
      expect(container.textContent).toContain("待機");
    });

    it("VRMViewerコンポーネントが正しくレンダリングされる", async () => {
      const config: AnimationConfig = {
        idle: "/animations/idle.vrma",
      };

      render(
        <AnimationPreview
          modelPath={mockModelPath}
          modelType={mockModelType}
          animationConfig={config}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("vrm-viewer")).toBeInTheDocument();
      });
    });
  });

  describe("インタラクションテスト", () => {
    it("アニメーションボタンをクリックすると、そのアニメーションに切り替わる", async () => {
      const config: AnimationConfig = {
        idle: "/animations/idle.vrma",
        happy: "/animations/happy.vrma",
        sad: "/animations/sad.vrma",
      };

      const { container } = render(
        <AnimationPreview
          modelPath={mockModelPath}
          modelType={mockModelType}
          animationConfig={config}
        />
      );

      await waitFor(() => {
        expect(container.textContent).toContain("現在のモーション:");
      });

      // 初期状態はidle
      expect(container.textContent).toContain("待機");

      // happyボタンをクリック
      fireEvent.click(screen.getByRole("button", { name: /喜び/ }));
      expect(container.textContent).toContain("喜び");

      // sadボタンをクリック
      fireEvent.click(screen.getByRole("button", { name: /悲しみ/ }));
      expect(container.textContent).toContain("悲しみ");
    });

    it("停止ボタンをクリックすると、idleアニメーションに戻る", async () => {
      const config: AnimationConfig = {
        idle: "/animations/idle.vrma",
        happy: "/animations/happy.vrma",
      };

      const { container } = render(
        <AnimationPreview
          modelPath={mockModelPath}
          modelType={mockModelType}
          animationConfig={config}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /喜び/ })).toBeInTheDocument();
      });

      // happyに切り替え
      fireEvent.click(screen.getByRole("button", { name: /喜び/ }));
      expect(container.textContent).toContain("喜び");

      // 停止ボタンをクリック
      fireEvent.click(screen.getByRole("button", { name: /停止/ }));
      expect(container.textContent).toContain("待機");
    });

    it("同じアニメーションボタンを複数回クリックしても問題ない", async () => {
      const config: AnimationConfig = {
        idle: "/animations/idle.vrma",
        happy: "/animations/happy.vrma",
      };

      const { container } = render(
        <AnimationPreview
          modelPath={mockModelPath}
          modelType={mockModelType}
          animationConfig={config}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /喜び/ })).toBeInTheDocument();
      });

      const happyButton = screen.getByRole("button", { name: /喜び/ });

      fireEvent.click(happyButton);
      expect(container.textContent).toContain("喜び");

      fireEvent.click(happyButton);
      expect(container.textContent).toContain("喜び");
    });
  });

  describe("エッジケーステスト", () => {
    it("idleアニメーションが設定されていない場合でも動作する", async () => {
      const config: AnimationConfig = {
        happy: "/animations/happy.vrma",
        sad: "/animations/sad.vrma",
      };

      render(
        <AnimationPreview
          modelPath={mockModelPath}
          modelType={mockModelType}
          animationConfig={config}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^喜び$/ })).toBeInTheDocument();
      });

      // idleボタンは表示されない（停止ボタンには「待機」が含まれるので、厳密にチェック）
      const buttons = screen.getAllByRole("button");
      const idleButton = buttons.find((btn) => btn.textContent === "待機");
      expect(idleButton).toBeUndefined();

      // 他のボタンは表示される
      expect(
        screen.getByRole("button", { name: /^悲しみ$/ })
      ).toBeInTheDocument();
    });

    it("空文字列のアニメーションパスは無視される", async () => {
      const config: AnimationConfig = {
        idle: "/animations/idle.vrma",
        happy: "", // 空文字列
        sad: "/animations/sad.vrma",
      };

      render(
        <AnimationPreview
          modelPath={mockModelPath}
          modelType={mockModelType}
          animationConfig={config}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByRole("button").length).toBeGreaterThan(1);
      });

      // idleボタンは存在する（「待機」のみのボタン）
      const buttons = screen.getAllByRole("button");
      const idleButton = buttons.find((btn) => btn.textContent === "待機");
      expect(idleButton).toBeDefined();

      // happyボタンは存在しない
      expect(
        screen.queryByRole("button", { name: /^喜び$/ })
      ).not.toBeInTheDocument();

      // sadボタンは存在する
      const sadButton = buttons.find((btn) => btn.textContent === "悲しみ");
      expect(sadButton).toBeDefined();
    });

    it("新しいアニメーション状態（angry, thinking）が正しく動作する", async () => {
      const config: AnimationConfig = {
        idle: "/animations/idle.vrma",
        angry: "/animations/angry.vrma",
        thinking: "/animations/thinking.vrma",
      };

      const { container } = render(
        <AnimationPreview
          modelPath={mockModelPath}
          modelType={mockModelType}
          animationConfig={config}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /怒り/ })).toBeInTheDocument();
      });

      expect(
        screen.getByRole("button", { name: /考え中/ })
      ).toBeInTheDocument();

      // angryに切り替え
      fireEvent.click(screen.getByRole("button", { name: /怒り/ }));
      expect(container.textContent).toContain("怒り");

      // thinkingに切り替え
      fireEvent.click(screen.getByRole("button", { name: /考え中/ }));
      expect(container.textContent).toContain("考え中");
    });
  });

  describe("プロパティテスト", () => {
    it("modelPathとmodelTypeがVRMViewerに正しく渡される", async () => {
      const config: AnimationConfig = {
        idle: "/animations/idle.vrma",
      };

      render(
        <AnimationPreview
          modelPath="/custom/path.vrm"
          modelType="glb"
          animationConfig={config}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("vrm-viewer")).toBeInTheDocument();
      });
    });

    it("animationConfigのパスがVRMViewerに正しく渡される", async () => {
      const config: AnimationConfig = {
        idle: "/path/to/idle.vrma",
        happy: "/path/to/happy.vrma",
      };

      render(
        <AnimationPreview
          modelPath={mockModelPath}
          modelType={mockModelType}
          animationConfig={config}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("vrm-viewer")).toBeInTheDocument();
      });
    });
  });
});
