/**
 * useVRMフックのユニットテスト
 * F-001: 3Dモデル表示機能
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useVRM } from "../useVRM";

// モックを設定
jest.mock("@/lib/three/model-loader", () => ({
  loadModel: jest.fn(),
  disposeVRM: jest.fn(),
}));

jest.mock("@/lib/three/errors", () => ({
  categorizeError: jest.fn((error: Error) => error.message),
}));

describe("useVRM", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with correct default state", () => {
    const { result } = renderHook(() =>
      useVRM({
        modelPath: "/models/test.vrm",
        modelType: "vrm",
        autoLoad: false,
      })
    );

    expect(result.current.vrm).toBeNull();
    expect(result.current.model).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toBe(0);
    expect(typeof result.current.load).toBe("function");
    expect(typeof result.current.dispose).toBe("function");
  });

  it("should start loading when autoLoad is true", async () => {
    const { loadModel } = await import("@/lib/three/model-loader");
    const mockLoadModel = loadModel as jest.MockedFunction<typeof loadModel>;

    mockLoadModel.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                vrm: null,
                model: {} as any,
              }),
            100
          )
        )
    );

    const { result } = renderHook(() =>
      useVRM({
        modelPath: "/models/test.vrm",
        modelType: "vrm",
        autoLoad: true,
      })
    );

    // 初期状態では読み込み中
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    // 読み込み完了を待つ
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.model).not.toBeNull();
      },
      { timeout: 3000 }
    );
  });

  it("should handle load errors gracefully", async () => {
    const { loadModel } = await import("@/lib/three/model-loader");
    const mockLoadModel = loadModel as jest.MockedFunction<typeof loadModel>;

    const testError = new Error("Failed to load model");
    mockLoadModel.mockRejectedValue(testError);

    const { result } = renderHook(() =>
      useVRM({
        modelPath: "/models/nonexistent.vrm",
        modelType: "vrm",
        autoLoad: true,
      })
    );

    await waitFor(
      () => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 3000 }
    );
  });

  it("should cleanup resources on unmount", async () => {
    const { disposeVRM } = await import("@/lib/three/model-loader");
    const mockDisposeVRM = disposeVRM as jest.MockedFunction<
      typeof disposeVRM
    >;

    const { loadModel } = await import("@/lib/three/model-loader");
    const mockLoadModel = loadModel as jest.MockedFunction<typeof loadModel>;

    const mockVRM = {} as any;
    mockLoadModel.mockResolvedValue({
      vrm: mockVRM,
      model: {} as any,
    });

    const { unmount } = renderHook(() =>
      useVRM({
        modelPath: "/models/test.vrm",
        modelType: "vrm",
        autoLoad: true,
      })
    );

    await waitFor(() => {
      // 読み込み完了を待つ
    }, { timeout: 3000 });

    unmount();

    // disposeVRMが呼ばれることを確認
    await waitFor(() => {
      expect(mockDisposeVRM).toHaveBeenCalled();
    });
  });

  it("should update progress during loading", async () => {
    const { loadModel } = await import("@/lib/three/model-loader");
    const mockLoadModel = loadModel as jest.MockedFunction<typeof loadModel>;

    mockLoadModel.mockImplementation(async (options) => {
      // 進捗コールバックをシミュレート
      if (options.onProgress) {
        options.onProgress(25);
        options.onProgress(50);
        options.onProgress(75);
        options.onProgress(100);
      }

      return {
        vrm: null,
        model: {} as any,
      };
    });

    const { result } = renderHook(() =>
      useVRM({
        modelPath: "/models/test.vrm",
        modelType: "vrm",
        autoLoad: true,
      })
    );

    await waitFor(
      () => {
        expect(result.current.progress).toBe(100);
      },
      { timeout: 3000 }
    );
  });

  it("should allow manual load via load function", async () => {
    const { loadModel } = await import("@/lib/three/model-loader");
    const mockLoadModel = loadModel as jest.MockedFunction<typeof loadModel>;

    mockLoadModel.mockResolvedValue({
      vrm: null,
      model: {} as any,
    });

    const { result } = renderHook(() =>
      useVRM({
        modelPath: "/models/test.vrm",
        modelType: "vrm",
        autoLoad: false,
      })
    );

    // 初期状態では読み込まれていない
    expect(result.current.model).toBeNull();

    // 手動で読み込み
    result.current.load();

    await waitFor(
      () => {
        expect(result.current.model).not.toBeNull();
      },
      { timeout: 3000 }
    );
  });

  it("should prevent duplicate loads", async () => {
    const { loadModel } = await import("@/lib/three/model-loader");
    const mockLoadModel = loadModel as jest.MockedFunction<typeof loadModel>;

    mockLoadModel.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                vrm: null,
                model: {} as any,
              }),
            100
          )
        )
    );

    const { result } = renderHook(() =>
      useVRM({
        modelPath: "/models/test.vrm",
        modelType: "vrm",
        autoLoad: false,
      })
    );

    // 複数回loadを呼び出す
    result.current.load();
    result.current.load();
    result.current.load();

    await waitFor(
      () => {
        expect(result.current.model).not.toBeNull();
      },
      { timeout: 3000 }
    );

    // loadModelは1回だけ呼ばれるべき
    expect(mockLoadModel).toHaveBeenCalledTimes(1);
  });
});
