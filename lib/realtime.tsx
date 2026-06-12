"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { useUser } from "@/components/UserProvider";
import type {
  ChessPromotion,
  CurrentGame,
  GameOverPayload,
  GameState,
  IncomingInvite,
  InvitePlayer,
  InviteResult,
  MultiplayerGame,
  OnlineUser,
  UnoColor,
} from "@/lib/types";

/* ---------------- Socket event typing ---------------- */

type AckResponse = { ok: true; inviteId?: string } | { error: string };
type Ack = (res: AckResponse) => void;

interface ClientToServerEvents {
  "invite:send": (payload: { toUserId: number; game: MultiplayerGame }, ack: Ack) => void;
  "invite:accept": (payload: { inviteId: string }) => void;
  "invite:decline": (payload: { inviteId: string }) => void;
  "uno:play": (payload: { cardId: number; color?: UnoColor }, ack: Ack) => void;
  "uno:draw": (payload: Record<string, never>, ack: Ack) => void;
  "uno:pass": (payload: Record<string, never>, ack: Ack) => void;
  "chess:move": (payload: { from: string; to: string; promotion?: ChessPromotion }, ack: Ack) => void;
  "chess:resign": (payload: Record<string, never>, ack: Ack) => void;
  "game:leave": (payload: Record<string, never>) => void;
}

interface ServerToClientEvents {
  "presence:update": (payload: { users: OnlineUser[] }) => void;
  "invite:received": (payload: IncomingInvite) => void;
  "invite:result": (payload: InviteResult) => void;
  "game:error": (payload: { message: string }) => void;
  "game:start": (payload: { roomId: string; game: MultiplayerGame; state: GameState }) => void;
  "game:state": (payload: { roomId: string; state: GameState }) => void;
  "game:over": (payload: GameOverPayload) => void;
}

type ArenaSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/* ---------------- Context shape ---------------- */

export const INVITE_TTL_MS = 60_000;

export type OutgoingInviteStatus = "pending" | "declined" | "expired";

export interface OutgoingInvite {
  inviteId: string | null;
  game: MultiplayerGame;
  to: InvitePlayer;
  status: OutgoingInviteStatus;
}

export interface IncomingInviteState extends IncomingInvite {
  receivedAt: number;
}

interface RealtimeContextValue {
  connected: boolean;
  onlineUsers: OnlineUser[];
  currentGame: CurrentGame | null;
  lastGameOver: GameOverPayload | null;
  incomingInvite: IncomingInviteState | null;
  outgoingInvite: OutgoingInvite | null;
  gameError: string | null;
  sendInvite: (toUserId: number, game: MultiplayerGame) => void;
  acceptInvite: () => void;
  declineInvite: () => void;
  clearOutgoingInvite: () => void;
  clearLastGameOver: () => void;
  clearGameError: () => void;
  unoPlay: (cardId: number, color?: UnoColor) => void;
  unoDraw: () => void;
  unoPass: () => void;
  chessMove: (from: string, to: string, promotion?: ChessPromotion) => void;
  chessResign: () => void;
  leaveGame: () => void;
}

const noop = () => {};

const RealtimeContext = createContext<RealtimeContextValue>({
  connected: false,
  onlineUsers: [],
  currentGame: null,
  lastGameOver: null,
  incomingInvite: null,
  outgoingInvite: null,
  gameError: null,
  sendInvite: noop,
  acceptInvite: noop,
  declineInvite: noop,
  clearOutgoingInvite: noop,
  clearLastGameOver: noop,
  clearGameError: noop,
  unoPlay: noop,
  unoDraw: noop,
  unoPass: noop,
  chessMove: noop,
  chessResign: noop,
  leaveGame: noop,
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

/* ---------------- Provider ---------------- */

export default function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user, refresh } = useUser();
  const userId = user?.id ?? null;
  const router = useRouter();
  const pathname = usePathname();

  const socketRef = useRef<ArenaSocket | null>(null);
  const pathnameRef = useRef(pathname);
  const inviteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [currentGame, setCurrentGame] = useState<CurrentGame | null>(null);
  const [lastGameOver, setLastGameOver] = useState<GameOverPayload | null>(null);
  const [incomingInvite, setIncomingInvite] = useState<IncomingInviteState | null>(null);
  const [outgoingInvite, setOutgoingInvite] = useState<OutgoingInvite | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const clearInviteTimer = useCallback(() => {
    if (inviteTimerRef.current) {
      clearTimeout(inviteTimerRef.current);
      inviteTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (userId === null) return;

    // Same-origin connection through the Next.js rewrite; auth via httpOnly cookie.
    const socket: ArenaSocket = io({
      path: "/api/socket.io",
      addTrailingSlash: false,
      transports: ["polling"],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("presence:update", ({ users }) => setOnlineUsers(users));

    socket.on("invite:received", (invite) => {
      clearInviteTimer();
      setIncomingInvite({ ...invite, receivedAt: Date.now() });
      // Invites expire server-side after 60s — mirror that locally.
      inviteTimerRef.current = setTimeout(() => setIncomingInvite(null), INVITE_TTL_MS);
    });

    socket.on("invite:result", ({ inviteId, reason, by }) => {
      setOutgoingInvite((prev) =>
        prev && (prev.inviteId === null || prev.inviteId === inviteId)
          ? { ...prev, to: by, status: reason }
          : prev
      );
    });

    socket.on("game:error", ({ message }) => setGameError(message));

    socket.on("game:start", ({ roomId, game, state }) => {
      clearInviteTimer();
      setIncomingInvite(null);
      setOutgoingInvite(null);
      setLastGameOver(null);
      setCurrentGame(
        state.game === "uno" ? { roomId, game: "uno", state } : { roomId, game: "chess", state }
      );
      const target = `/games/${game}`;
      if (pathnameRef.current !== target) router.push(target);
    });

    socket.on("game:state", ({ roomId, state }) => {
      setCurrentGame((cg) => {
        if (!cg || cg.roomId !== roomId || cg.game !== state.game) return cg;
        return state.game === "uno"
          ? { roomId: cg.roomId, game: "uno", state }
          : { roomId: cg.roomId, game: "chess", state };
      });
    });

    socket.on("game:over", (payload) => {
      setCurrentGame(null);
      setLastGameOver(payload);
      void refresh(); // XP / coins changed
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      clearInviteTimer();
      setConnected(false);
      setOnlineUsers([]);
      setCurrentGame(null);
      setIncomingInvite(null);
      setOutgoingInvite(null);
    };
  }, [userId, router, refresh, clearInviteTimer]);

  /** Surfaces ack errors as a toast. */
  const ackToError = useCallback((res: AckResponse) => {
    if ("error" in res) setGameError(res.error);
  }, []);

  const sendInvite = useCallback(
    (toUserId: number, game: MultiplayerGame) => {
      const socket = socketRef.current;
      if (!socket) return;
      const target = onlineUsers.find((u) => u.id === toUserId);
      if (!target) return;
      setOutgoingInvite({
        inviteId: null,
        game,
        to: { id: target.id, name: target.name, avatarColor: target.avatarColor },
        status: "pending",
      });
      socket.emit("invite:send", { toUserId, game }, (res) => {
        if ("error" in res) {
          setOutgoingInvite(null);
          setGameError(res.error);
        } else {
          setOutgoingInvite((prev) =>
            prev && prev.to.id === toUserId ? { ...prev, inviteId: res.inviteId ?? null } : prev
          );
        }
      });
    },
    [onlineUsers]
  );

  const acceptInvite = useCallback(() => {
    if (!incomingInvite) return;
    socketRef.current?.emit("invite:accept", { inviteId: incomingInvite.inviteId });
    clearInviteTimer();
    setIncomingInvite(null);
  }, [incomingInvite, clearInviteTimer]);

  const declineInvite = useCallback(() => {
    if (!incomingInvite) return;
    socketRef.current?.emit("invite:decline", { inviteId: incomingInvite.inviteId });
    clearInviteTimer();
    setIncomingInvite(null);
  }, [incomingInvite, clearInviteTimer]);

  const clearOutgoingInvite = useCallback(() => setOutgoingInvite(null), []);
  const clearLastGameOver = useCallback(() => setLastGameOver(null), []);
  const clearGameError = useCallback(() => setGameError(null), []);

  const unoPlay = useCallback(
    (cardId: number, color?: UnoColor) => {
      socketRef.current?.emit("uno:play", color ? { cardId, color } : { cardId }, ackToError);
    },
    [ackToError]
  );
  const unoDraw = useCallback(() => {
    socketRef.current?.emit("uno:draw", {}, ackToError);
  }, [ackToError]);
  const unoPass = useCallback(() => {
    socketRef.current?.emit("uno:pass", {}, ackToError);
  }, [ackToError]);
  const chessMove = useCallback(
    (from: string, to: string, promotion?: ChessPromotion) => {
      socketRef.current?.emit("chess:move", promotion ? { from, to, promotion } : { from, to }, ackToError);
    },
    [ackToError]
  );
  const chessResign = useCallback(() => {
    socketRef.current?.emit("chess:resign", {}, ackToError);
  }, [ackToError]);
  const leaveGame = useCallback(() => {
    socketRef.current?.emit("game:leave", {});
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        connected,
        onlineUsers,
        currentGame,
        lastGameOver,
        incomingInvite,
        outgoingInvite,
        gameError,
        sendInvite,
        acceptInvite,
        declineInvite,
        clearOutgoingInvite,
        clearLastGameOver,
        clearGameError,
        unoPlay,
        unoDraw,
        unoPass,
        chessMove,
        chessResign,
        leaveGame,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}
