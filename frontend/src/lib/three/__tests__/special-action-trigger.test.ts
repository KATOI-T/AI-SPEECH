/**
 * F-011-009: SpecialActionTrigger テスト
 */

import { SpecialActionTrigger } from "../special-action-trigger";
import { LONG_IDLE_ACTIONS, LONG_IDLE_THRESHOLD_SEC } from "../animation-constants";
import type { AnimationState } from "@/types";

describe("SpecialActionTrigger", () => {
  let triggered: AnimationState[];
  let trigger: SpecialActionTrigger;

  beforeEach(() => {
    triggered = [];
    trigger = new SpecialActionTrigger({
      onTrigger: (s) => triggered.push(s),
    });
  });

  afterEach(() => {
    trigger.dispose();
  });

  describe("sessionStart", () => {
    it("fires greeting on sessionStart", () => {
      trigger.sessionStart();
      expect(triggered).toEqual(["greeting"]);
    });
  });

  describe("sessionEnd", () => {
    it("fires greeting on sessionEnd", () => {
      trigger.sessionEnd();
      expect(triggered).toEqual(["greeting"]);
    });
  });

  describe("goalAchieved", () => {
    it("fires happy on goalAchieved", () => {
      trigger.goalAchieved();
      expect(triggered).toEqual(["happy"]);
    });
  });

  describe("long IDLE detection", () => {
    it("does not fire before threshold", () => {
      trigger.setPhase("IDLE");
      // update in 1s steps, up to threshold - 1s
      for (let t = 0; t < LONG_IDLE_THRESHOLD_SEC - 1; t++) {
        trigger.update(1);
      }
      expect(triggered).toEqual([]);
    });

    it("fires after threshold in IDLE", () => {
      trigger.setPhase("IDLE");
      for (let t = 0; t < LONG_IDLE_THRESHOLD_SEC + 1; t++) {
        trigger.update(1);
      }
      expect(triggered.length).toBe(1);
      expect(LONG_IDLE_ACTIONS).toContain(triggered[0]);
    });

    it("does not fire when phase is not IDLE", () => {
      trigger.setPhase("SPEAKING");
      for (let t = 0; t < LONG_IDLE_THRESHOLD_SEC + 5; t++) {
        trigger.update(1);
      }
      expect(triggered).toEqual([]);
    });

    it("resets timer when phase changes to non-IDLE", () => {
      trigger.setPhase("IDLE");
      for (let t = 0; t < LONG_IDLE_THRESHOLD_SEC - 2; t++) {
        trigger.update(1);
      }
      expect(triggered).toEqual([]);

      // Phase change resets timer
      trigger.setPhase("SPEAKING");
      trigger.setPhase("IDLE");

      for (let t = 0; t < 5; t++) {
        trigger.update(1);
      }
      // Still under threshold after reset → no fire
      expect(triggered).toEqual([]);
    });

    it("resets timer after firing (no double-fire)", () => {
      trigger.setPhase("IDLE");
      for (let t = 0; t < LONG_IDLE_THRESHOLD_SEC + 1; t++) {
        trigger.update(1);
      }
      expect(triggered.length).toBe(1);

      // Another 5 seconds should not fire again
      for (let t = 0; t < 5; t++) {
        trigger.update(1);
      }
      expect(triggered.length).toBe(1);
    });

    it("does not fire while special action is playing", () => {
      trigger.setPhase("IDLE");
      trigger.setPlayingSpecial(true);
      for (let t = 0; t < LONG_IDLE_THRESHOLD_SEC + 5; t++) {
        trigger.update(1);
      }
      expect(triggered).toEqual([]);
    });

    it("uses injected longIdlePool", () => {
      triggered = [];
      const customTrigger = new SpecialActionTrigger({
        onTrigger: (s) => triggered.push(s),
        longIdleThresholdSec: 5,
        longIdlePool: ["spin"],
        random: () => 0,
      });
      customTrigger.setPhase("IDLE");
      for (let t = 0; t < 6; t++) {
        customTrigger.update(1);
      }
      expect(triggered).toEqual(["spin"]);
      customTrigger.dispose();
    });

    it("uses injected random for deterministic selection", () => {
      triggered = [];
      // random = () => 0.99 → picks last element
      const customTrigger = new SpecialActionTrigger({
        onTrigger: (s) => triggered.push(s),
        longIdleThresholdSec: 5,
        random: () => 0.99,
      });
      customTrigger.setPhase("IDLE");
      for (let t = 0; t < 6; t++) {
        customTrigger.update(1);
      }
      expect(triggered[0]).toBe(LONG_IDLE_ACTIONS[LONG_IDLE_ACTIONS.length - 1]);
      customTrigger.dispose();
    });
  });

  describe("dispose", () => {
    it("stops triggering after dispose", () => {
      trigger.dispose();
      trigger.sessionStart();
      trigger.goalAchieved();
      trigger.setPhase("IDLE");
      for (let t = 0; t < LONG_IDLE_THRESHOLD_SEC + 5; t++) {
        trigger.update(1);
      }
      expect(triggered).toEqual([]);
    });
  });

  describe("getIdleElapsedSec", () => {
    it("returns accumulated IDLE time", () => {
      trigger.setPhase("IDLE");
      trigger.update(3);
      trigger.update(2);
      expect(trigger.getIdleElapsedSec()).toBe(5);
    });

    it("resets on special action fire", () => {
      trigger.sessionStart();
      expect(trigger.getIdleElapsedSec()).toBe(0);
    });
  });
});
