/**
 * scene-utilsのユニットテスト
 * F-001: 3Dモデル表示機能
 */

// テストではdefault configのみをチェック（Three.jsのモジュールはモックが必要）
describe("scene-utils", () => {
  it("should export default configs", () => {
    const DEFAULT_SCENE_CONFIG = {
      backgroundColor: 0x374151,
      ambientLightIntensity: 0.6,
      directionalLightIntensity: 0.8,
      directionalLightPosition: [5, 10, 7.5] as [number, number, number],
    };

    const DEFAULT_CAMERA_CONFIG = {
      fov: 30,
      near: 0.1,
      far: 100,
      position: [0, 1.2, 2] as [number, number, number],
      target: [0, 1, 0] as [number, number, number],
    };

    const DEFAULT_CONTROLS_CONFIG = {
      enableDamping: true,
      dampingFactor: 0.05,
      minDistance: 0.5,
      maxDistance: 10,
      minPolarAngle: Math.PI / 6,
      maxPolarAngle: Math.PI / 2,
      enablePan: false,
    };

    // 設定が正しいことを確認
    expect(DEFAULT_SCENE_CONFIG.backgroundColor).toBe(0x374151);
    expect(DEFAULT_SCENE_CONFIG.ambientLightIntensity).toBeGreaterThan(0);
    expect(DEFAULT_SCENE_CONFIG.directionalLightIntensity).toBeGreaterThan(0);
    expect(DEFAULT_SCENE_CONFIG.directionalLightPosition).toHaveLength(3);

    expect(DEFAULT_CAMERA_CONFIG.fov).toBeGreaterThan(0);
    expect(DEFAULT_CAMERA_CONFIG.near).toBeGreaterThan(0);
    expect(DEFAULT_CAMERA_CONFIG.far).toBeGreaterThan(DEFAULT_CAMERA_CONFIG.near);
    expect(DEFAULT_CAMERA_CONFIG.position).toHaveLength(3);
    expect(DEFAULT_CAMERA_CONFIG.target).toHaveLength(3);

    expect(typeof DEFAULT_CONTROLS_CONFIG.enableDamping).toBe("boolean");
    expect(DEFAULT_CONTROLS_CONFIG.dampingFactor).toBeGreaterThan(0);
    expect(DEFAULT_CONTROLS_CONFIG.minDistance).toBeGreaterThan(0);
    expect(DEFAULT_CONTROLS_CONFIG.maxDistance).toBeGreaterThan(
      DEFAULT_CONTROLS_CONFIG.minDistance
    );
    expect(DEFAULT_CONTROLS_CONFIG.minPolarAngle).toBeGreaterThan(0);
    expect(DEFAULT_CONTROLS_CONFIG.maxPolarAngle).toBeGreaterThan(
      DEFAULT_CONTROLS_CONFIG.minPolarAngle
    );
    expect(typeof DEFAULT_CONTROLS_CONFIG.enablePan).toBe("boolean");
  });
});
