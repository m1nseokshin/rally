"use client";

import { getValidAccessToken } from "./auth";

/**
 * Spotify Web Playback SDK — 브라우저에서 실제 음원을 재생한다.
 * Premium 계정에서만 동작하며, 무료 계정이면 초기화 단계에서 실패한다.
 * 실패 시 호출부가 자체 비트 사운드로 폴백하도록 예외를 던진다.
 */

declare global {
  interface Window {
    Spotify?: {
      Player: new (opts: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

type PlaybackState = {
  position: number; // ms
  duration: number;
  paused: boolean;
  track_window: { current_track: { id: string } };
};

type SpotifyPlayer = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, cb: (arg: never) => void) => void;
  removeListener: (event: string, cb?: (arg: never) => void) => void;
};

/**
 * Spotify Web Playback SDK는 공식적으로 데스크톱 브라우저만 지원한다.
 * 모바일(iOS/Android)에서 시도하면 스크립트는 로드되고 player.connect()도
 * 성공하지만, DRM(EME) 파이프라인이 없어서 "ready" 이벤트가 영영 안 온다 —
 * 그러다 8초 타임아웃으로 떨어지는 게 실제로 관측된 증상이었다("플레이어
 * 응답이 없어요"). 이미 안 될 걸 알면서 8초를 태우고 무서운 에러 문구를
 * 보여주느니, 모바일이면 아예 시도하지 않고 바로 비트 사운드로 넘어간다.
 */
export function isPlaybackSdkSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroidOrMobile = /Android|Mobi/i.test(ua);
  return !isIOS && !isAndroidOrMobile;
}

let sdkPromise: Promise<void> | null = null;

function loadSdk() {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    if (window.Spotify) return resolve();
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    script.onerror = () => reject(new Error("Spotify 플레이어를 불러오지 못했어요."));
    document.body.appendChild(script);
  });
  return sdkPromise;
}

/** 실제 오디오가 트랙의 몇 초 지점에서 흘러나오기 시작했는지 */
export type PlaybackSync = {
  /** 이 시각(performance.now() 기준)에 트랙이 positionSec 지점을 재생 중이었다 */
  atMs: number;
  positionSec: number;
};

export type RallyPlayer = {
  deviceId: string;
  playTrack: (trackId: string) => Promise<void>;
  /** 지정한 트랙이 실제로 재생 시작된 시점의 위치를 알려준다 — 박자 동기화용 */
  waitForSync: (trackId: string) => Promise<PlaybackSync>;
  pause: () => Promise<void>;
  disconnect: () => void;
};

/** 플레이어 초기화 — 실패하면 예외를 던져 폴백을 유도한다 */
export async function createPlayer(): Promise<RallyPlayer> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Spotify 연동이 필요해요.");

  await loadSdk();
  if (!window.Spotify) throw new Error("Spotify 플레이어를 사용할 수 없어요.");

  const player = new window.Spotify.Player({
    name: "Rally XR",
    getOAuthToken: (cb) => {
      getValidAccessToken().then((t) => t && cb(t));
    },
    volume: 0.8,
  });

  const deviceId = await new Promise<string>((resolve, reject) => {
    const fail = (msg: string) => () => reject(new Error(msg));
    player.addListener("ready", (arg: never) => {
      resolve((arg as { device_id: string }).device_id);
    });
    // Premium이 아니면 account_error로 떨어진다
    player.addListener("account_error", fail("Spotify Premium 계정에서만 재생돼요."));
    player.addListener("initialization_error", fail("플레이어 초기화에 실패했어요."));
    player.addListener("authentication_error", fail("인증이 만료됐어요."));

    player.connect().then((ok) => {
      if (!ok) reject(new Error("플레이어 연결에 실패했어요."));
    });
    setTimeout(() => reject(new Error("플레이어 응답이 없어요.")), 8000);
  });

  async function transferAndPlay(trackId: string) {
    const t = await getValidAccessToken();
    const res = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${t}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
      },
    );
    if (!res.ok && res.status !== 204) {
      // Spotify는 실패 이유를 body.error.message에 담아 준다 —
      // 그대로 노출하면 "Player command failed: No active device" 같은
      // 원인을 바로 알 수 있다.
      const body = await res.json().catch(() => null);
      const reason = body?.error?.message;
      throw new Error(reason ? `재생 실패: ${reason}` : `재생 실패 (${res.status})`);
    }
  }

  /**
   * SDK의 player_state_changed는 실제 오디오 엔진 상태를 그대로 반영한다.
   * REST API를 폴링하는 것보다 지연이 훨씬 적어 박자 동기화에 이 값을 쓴다.
   * 재생이 시작된 첫 상태 변화를 잡아 "그 순간 몇 초 지점이었는지" 기록한다.
   */
  function waitForSync(trackId: string): Promise<PlaybackSync> {
    return new Promise((resolve, reject) => {
      const onState = (arg: never) => {
        const state = arg as PlaybackState | null;
        if (!state) return;
        if (state.track_window.current_track.id !== trackId) return;
        if (state.paused) return;
        player.removeListener("player_state_changed", onState);
        resolve({ atMs: performance.now(), positionSec: state.position / 1000 });
      };
      player.addListener("player_state_changed", onState);
      setTimeout(() => {
        player.removeListener("player_state_changed", onState);
        reject(new Error("재생 상태를 확인하지 못했어요."));
      }, 6000);
    });
  }

  return {
    deviceId,
    playTrack: transferAndPlay,
    waitForSync,
    pause: async () => {
      const t = await getValidAccessToken();
      await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${t}` },
      });
    },
    disconnect: () => player.disconnect(),
  };
}
