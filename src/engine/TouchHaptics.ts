import type { TouchEvent as ReactTouchEvent } from 'react';
import { HapticType, TouchGestureState } from './types';

/**
 * Touch Gestures & Low-Latency Haptic Feedback Trigger Manager
 * Provides mobile-optimized input polling and hardware vibration integration.
 */
class TouchHapticsManager {
  private hapticsEnabled: boolean = true;
  private hapticsTriggerCount: number = 0;
  private gestureState: TouchGestureState = {
    isTouchActive: false,
    joystickActive: false,
    joystickVector: { x: 0, y: 0 },
    lastTapTimestamp: 0,
    lastSwipeDirection: null,
    pinchDistance: 0,
    zoomScale: 1.0,
  };

  private touchStartPos: { x: number; y: number } | null = null;
  private touchStartTime: number = 0;
  private listeners: Array<(state: TouchGestureState) => void> = [];

  private hapticProfiles: Record<HapticType, number[]> = {
    light_tap: [8],
    step: [5],
    attack: [25, 12, 20],
    damage: [60, 30, 70],
    critical: [40, 20, 40, 20, 80],
    hack_success: [15, 30, 25],
    hack_fail: [70, 40, 90],
    level_up: [30, 40, 50, 40, 80],
    boss_alert: [90, 40, 90, 40, 140],
    explosion: [120, 50, 150],
  };

  public isHapticsSupported(): boolean {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  public setHapticsEnabled(enabled: boolean) {
    this.hapticsEnabled = enabled;
  }

  public getHapticsEnabled(): boolean {
    return this.hapticsEnabled;
  }

  public getTriggerCount(): number {
    return this.hapticsTriggerCount;
  }

  public trigger(type: HapticType) {
    if (!this.hapticsEnabled) return;
    this.hapticsTriggerCount++;

    if (this.isHapticsSupported()) {
      try {
        const pattern = this.hapticProfiles[type] || [15];
        navigator.vibrate(pattern);
      } catch {
        // Platform or permission restriction
      }
    }
  }

  public getGestureState(): TouchGestureState {
    return { ...this.gestureState };
  }

  public updateJoystick(x: number, y: number, active: boolean) {
    this.gestureState.joystickActive = active;
    this.gestureState.joystickVector = { x, y };
    this.notifyListeners();
  }

  public handleTouchStart(e: ReactTouchEvent | TouchEvent) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.touchStartPos = { x: touch.clientX, y: touch.clientY };
      this.touchStartTime = performance.now();
      this.gestureState.isTouchActive = true;
    } else if (e.touches.length === 2) {
      // Pinch start
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      this.gestureState.pinchDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    }
  }

  public handleTouchMove(e: ReactTouchEvent | TouchEvent) {
    if (e.touches.length === 2 && this.gestureState.pinchDistance > 0) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const newDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = newDist / this.gestureState.pinchDistance;
      this.gestureState.zoomScale = Math.max(0.75, Math.min(2.5, this.gestureState.zoomScale * ratio));
      this.gestureState.pinchDistance = newDist;
      this.notifyListeners();
    }
  }

  public handleTouchEnd(e: ReactTouchEvent | TouchEvent) {
    if (e.touches.length === 0) {
      this.gestureState.isTouchActive = false;
      this.gestureState.pinchDistance = 0;

      if (this.touchStartPos) {
        const endTime = performance.now();
        const changed = e.changedTouches[0];
        if (changed) {
          const dx = changed.clientX - this.touchStartPos.x;
          const dy = changed.clientY - this.touchStartPos.y;
          const dist = Math.hypot(dx, dy);
          const dt = endTime - this.touchStartTime;

          // Swipe detection (< 300ms, > 40px)
          if (dt < 300 && dist > 40) {
            if (Math.abs(dx) > Math.abs(dy)) {
              this.gestureState.lastSwipeDirection = dx > 0 ? 'right' : 'left';
            } else {
              this.gestureState.lastSwipeDirection = dy > 0 ? 'down' : 'up';
            }
            this.trigger('light_tap');
          } else if (dist < 15 && dt < 250) {
            // Tap / Double tap
            const now = performance.now();
            if (now - this.gestureState.lastTapTimestamp < 320) {
              // Double Tap
              this.trigger('attack');
            } else {
              this.trigger('step');
            }
            this.gestureState.lastTapTimestamp = now;
          }
        }
      }
      this.touchStartPos = null;
      this.notifyListeners();
    }
  }

  public subscribe(fn: (state: TouchGestureState) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.gestureState);
    }
  }
}

export const touchHaptics = new TouchHapticsManager();
