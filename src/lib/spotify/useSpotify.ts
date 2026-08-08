"use client";

import { useCallback, useEffect, useState } from "react";
import type { Track } from "@/lib/data";
import { clearToken, getStoredToken, loginWithSpotify } from "./auth";
import { fetchSpotifyProfile, fetchTopTracks, SpotifyAuthError } from "./api";

export function useSpotify() {
  const [connected, setConnected] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getStoredToken()) {
      setConnected(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [profile, top] = await Promise.all([fetchSpotifyProfile(), fetchTopTracks()]);
      setProfileName(profile.displayName);
      setTracks(top);
      setConnected(true);
    } catch (e) {
      if (e instanceof SpotifyAuthError) {
        clearToken();
        setConnected(false);
      } else {
        setError(e instanceof Error ? e.message : "곡 목록을 불러오지 못했어요.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // setTimeout으로 한 틱 미뤄서 setState가 이펙트 안에서 동기적으로
    // 실행되지 않게 한다 (react-hooks/set-state-in-effect 대응).
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  const connect = useCallback(() => {
    loginWithSpotify().catch((e) => setError(e.message));
  }, []);

  const disconnect = useCallback(() => {
    clearToken();
    setConnected(false);
    setTracks([]);
    setProfileName(null);
  }, []);

  return { connected, profileName, tracks, loading, error, connect, disconnect, reload: load };
}
