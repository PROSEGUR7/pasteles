"use client";

import {
    Fragment,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

type FiltroCanal = "Todos" | "No leídos";

interface ConversationSummary {
    waId: string;
    nombre: string;
    canal: string;
    lastMessage: string | null;
    lastMessageAt: string | null;
    unreadCount: number;
    estado: "abierto" | "cerrado";
    botStatus: "activo" | "inactivo";
}

interface ConversationMessage {
    messageId: string;
    direction: "inbound" | "outbound";
    body: string | null;
    timestamp: string;
    mediaType?: "image" | "audio" | null;
    mediaUrl?: string | null;
    senderType: "ia" | "humano" | "cliente" | "sistema";
    interventionStatus: "activo" | "inactivo" | null;
    source: "meta" | "n8n";
}

const FILTROS: FiltroCanal[] = ["Todos", "No leídos"];

function formatRelative(dateInput?: string | null) {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const dayMs = 1000 * 60 * 60 * 24;
    if (diff < dayMs && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    }
    if (diff < dayMs * 2) return "ayer";
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function formatHour(dateInput?: string | null) {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function getSenderLabel(senderType: ConversationMessage["senderType"]) {
    if (senderType === "ia") return "IA";
    if (senderType === "humano") return "Humano";
    if (senderType === "cliente") return "Cliente";
    return "Sistema";
}

function getSenderBadgeClass(senderType: ConversationMessage["senderType"]) {
    if (senderType === "ia") return "bg-emerald-500/15 text-emerald-700";
    if (senderType === "humano") return "bg-blue-500/15 text-blue-700";
    if (senderType === "cliente") return "bg-surface-900/10 text-surface-500";
    return "bg-violet-500/15 text-violet-700";
}

function formatPhoneFromWaId(waId: string) {
    const digits = (waId || "").replace(/\D/g, "");
    if (!digits) return "";

    const local = digits.length > 10 ? digits.slice(-10) : digits;
    const country = digits.length > 10 ? digits.slice(0, -10) : "";
    const parts = local.length === 10 ? [local.slice(0, 3), local.slice(3, 6), local.slice(6)] : [local];
    return `${country ? `+${country} ` : ""}${parts.join(" ")}`.trim();
}

function renderInlineSegments(segment: string) {
    const nodes: ReactNode[] = [];
    const pattern = /(\*{1,2}[^*]+\*{1,2}|_{1,2}[^_]+_{1,2}|~[^~]+~|`[^`]+`)/g;
    let lastIndex = 0;
    let tokenIndex = 0;

    segment.replace(pattern, (match, _group, offset) => {
        if (offset > lastIndex) {
            nodes.push(segment.slice(lastIndex, offset));
        }
        nodes.push(renderToken(match, tokenIndex++));
        lastIndex = offset + match.length;
        return "";
    });

    if (lastIndex < segment.length) {
        nodes.push(segment.slice(lastIndex));
    }

    return nodes;
}

function renderToken(token: string, keyIndex: number) {
    const markerChar = token[0];
    const markerLength = token.startsWith("**") || token.startsWith("__") ? 2 : 1;
    const content = token.slice(markerLength, token.length - markerLength);
    const key = `${markerChar}-${keyIndex}`;

    switch (markerChar) {
        case "*":
            return <strong key={key}>{content}</strong>;
        case "_":
            return <em key={key}>{content}</em>;
        case "~":
            return <s key={key}>{content}</s>;
        case "`":
            return (
                <code
                    key={key}
                    className="px-1 py-0.5 rounded bg-surface-900/60 text-surface-200 text-[11px]"
                >
                    {content}
                </code>
            );
        default:
            return content;
    }
}

function renderMessageBody(text: string) {
    const lines = text.split(/\r?\n/);
    return lines.map((line, index) => {
        const bulletMatch = line.match(/^\s*([-•])\s+(.*)$/);
        if (bulletMatch) {
            return (
                <div key={`line-${index}`} className="flex items-start gap-2">
                    <span className="leading-6">•</span>
                    <span>{renderInlineSegments(bulletMatch[2])}</span>
                </div>
            );
        }

        return (
            <Fragment key={`line-${index}`}>
                {renderInlineSegments(line)}
                {index < lines.length - 1 ? <br /> : null}
            </Fragment>
        );
    });
}

function isGenericAudioLabel(text: string | null | undefined) {
    const value = (text || "").trim();
    if (!value) return true;
    return (
        /^🎵\s*audio\b/i.test(value) ||
        /^\s*audio\b/i.test(value) ||
        /\baudio\s*\([^)]*\.(m4a|mp3|ogg|opus|webm)\)/i.test(value)
    );
}

function isAuthErrorJson(text: string) {
    const value = (text || "").trim();
    if (!value) return false;
    if (!(value.startsWith("{") && value.endsWith("}"))) return false;
    try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        const status = typeof parsed.status === "number" ? parsed.status : Number(parsed.status);
        const title = typeof parsed.title === "string" ? parsed.title : "";
        const detail = typeof parsed.detail === "string" ? parsed.detail : "";
        return status === 401 && /(authentication\s*error|authenticationerror)/i.test(`${title} ${detail}`.trim());
    } catch {
        return false;
    }
}

function formatAudioDuration(seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
    const total = Math.floor(seconds);
    const minutes = Math.floor(total / 60);
    const remainder = total % 60;
    return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

interface AudioMessagePlayerProps {
    messageId: string;
    audioUrl: string;
    isOutbound: boolean;
    timestampLabel: string;
    activeAudioId: string | null;
    setActiveAudioId: Dispatch<SetStateAction<string | null>>;
}

function AudioMessagePlayer({
    messageId,
    audioUrl,
    isOutbound,
    timestampLabel,
    activeAudioId,
    setActiveAudioId,
}: AudioMessagePlayerProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackError, setPlaybackError] = useState<string | null>(null);

    useEffect(() => {
        const audioElement = audioRef.current;
        if (!audioElement) return;

        const handleTimeUpdate = () => setCurrentTime(audioElement.currentTime || 0);
        const handleLoadedMetadata = () => {
            if (Number.isFinite(audioElement.duration)) {
                setDuration(audioElement.duration);
            }
        };
        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            setActiveAudioId((prev) => (prev === messageId ? null : prev));
        };
        const handlePause = () => setIsPlaying(false);
        const handlePlay = () => setIsPlaying(true);

        audioElement.addEventListener("timeupdate", handleTimeUpdate);
        audioElement.addEventListener("loadedmetadata", handleLoadedMetadata);
        audioElement.addEventListener("ended", handleEnded);
        audioElement.addEventListener("pause", handlePause);
        audioElement.addEventListener("play", handlePlay);

        return () => {
            audioElement.removeEventListener("timeupdate", handleTimeUpdate);
            audioElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audioElement.removeEventListener("ended", handleEnded);
            audioElement.removeEventListener("pause", handlePause);
            audioElement.removeEventListener("play", handlePlay);
        };
    }, [messageId, setActiveAudioId]);

    useEffect(() => {
        const audioElement = audioRef.current;
        if (!audioElement) return;
        if (activeAudioId !== messageId && !audioElement.paused) {
            audioElement.pause();
            audioElement.currentTime = 0;
            setCurrentTime(0);
        }
    }, [activeAudioId, messageId]);

    useEffect(() => {
        const audioElement = audioRef.current;
        if (!audioElement) return;
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.load();
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setPlaybackError(null);
        setActiveAudioId((prev) => (prev === messageId ? null : prev));
    }, [audioUrl, messageId, setActiveAudioId]);

    const togglePlayback = () => {
        const audioElement = audioRef.current;
        if (!audioElement) return;
        setPlaybackError(null);
        if (audioElement.paused) {
            audioElement
                .play()
                .then(() => {
                    setIsPlaying(true);
                    setActiveAudioId(messageId);
                })
                .catch(async (error) => {
                    setIsPlaying(false);
                    setActiveAudioId((prev) => (prev === messageId ? null : prev));
                    let nextMessage = "No pudimos reproducir este audio";

                    const errorName = error && typeof error === "object" && "name" in error
                        ? String((error as { name?: unknown }).name)
                        : "";

                    if (errorName === "NotSupportedError") {
                        try {
                            const controller = new AbortController();
                            const res = await fetch(audioUrl, { cache: "no-store", signal: controller.signal });
                            const contentType = (res.headers.get("content-type") || "").toLowerCase();

                            if (!res.ok) {
                                if (res.status === 401) {
                                    nextMessage = "No autorizado (401). Revisa el token de Meta y reinicia el servidor.";
                                } else {
                                    nextMessage = `No se pudo cargar el audio (HTTP ${res.status}).`;
                                }
                                if (contentType.includes("application/json")) {
                                    const data = (await res.json().catch(() => null)) as { error?: string } | null;
                                    if (data?.error) nextMessage = data.error;
                                }
                            } else if (!contentType.startsWith("audio/")) {
                                nextMessage = "El servidor no devolvió un audio reproducible.";
                            }

                            try {
                                await res.body?.cancel();
                            } catch {
                                // ignore
                            }

                            controller.abort();
                        } catch {
                            // ignore probing errors
                        }
                    }

                    setPlaybackError(nextMessage);
                    console.error("Audio playback error", error);
                });
        } else {
            audioElement.pause();
            setActiveAudioId((prev) => (prev === messageId ? null : prev));
        }
    };

    const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
    const durationLabel = formatAudioDuration(isPlaying ? currentTime : duration || currentTime);
    const playButtonClass = isOutbound
        ? "bg-white/20 border-white/40 text-white hover:bg-white/30"
        : "bg-white border-surface-800/20 text-primary-600 hover:border-primary-400";
    const trackClass = isOutbound ? "bg-white/20" : "bg-surface-800/15";
    const fillClass = isOutbound ? "bg-white" : "bg-primary-500";
    const metaTextClass = isOutbound ? "text-white/80" : "text-surface-500";

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
                <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
                <button
                type="button"
                onClick={togglePlayback}
                aria-label={isPlaying ? "Pausar audio" : "Reproducir audio"}
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${playButtonClass}`}
            >
                {isPlaying ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 7v10M14 7v10" strokeLinecap="round" />
                    </svg>
                ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                )}
                </button>
                <div className="flex-1 space-y-1">
                    <div className={`h-1.5 w-full rounded-full overflow-hidden ${trackClass}`}>
                        <div className={`h-full rounded-full ${fillClass}`} style={{ width: `${progress}%` }} />
                    </div>
                    <div className={`flex items-center justify-between text-[11px] font-semibold tracking-tight ${metaTextClass}`}>
                        <span className="tabular-nums">{durationLabel}</span>
                        <span className="tabular-nums">{timestampLabel}</span>
                    </div>
                </div>
            </div>
            {playbackError ? (
                <p className={`text-[11px] font-medium ${isOutbound ? "text-white/80" : "text-primary-600"}`}>
                    {playbackError}
                </p>
            ) : null}
        </div>
    );
}

export default function ConversacionesPage() {
    const [conversaciones, setConversaciones] = useState<ConversationSummary[]>([]);
    const [mensajes, setMensajes] = useState<ConversationMessage[]>([]);
    const [busqueda, setBusqueda] = useState("");
    const [filtro, setFiltro] = useState<FiltroCanal>("Todos");
    const [seleccionada, setSeleccionada] = useState<string | null>(null);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingMensajes, setLoadingMensajes] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [closingChat, setClosingChat] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [updatingBot, setUpdatingBot] = useState(false);
    const [draftMessage, setDraftMessage] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);
    const [recordingAudio, setRecordingAudio] = useState(false);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState<string | null>(null);
    const [imagePreviewByMessageId, setImagePreviewByMessageId] = useState<Record<string, string>>({});
    const [brokenImageByMessageId, setBrokenImageByMessageId] = useState<Record<string, boolean>>({});
    const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
    const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const audioInputRef = useRef<HTMLInputElement | null>(null);
    const attachmentMenuRef = useRef<HTMLDivElement | null>(null);
    const messagesContainerRef = useRef<HTMLDivElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const lastMessageSyncRef = useRef<Record<string, string | null>>({});

    const fetchConversaciones = useCallback(
        async (silent = false) => {
            try {
                if (!silent) setLoadingConvs(true);
                const res = await fetch("/api/conversaciones", { cache: "no-store" });
                if (!res.ok) {
                    let backendMessage = "No pudimos cargar las conversaciones";
                    try {
                        const errorData = await res.json();
                        if (typeof errorData?.error === "string") {
                            backendMessage = errorData.error;
                        }
                    } catch {
                        // noop
                    }
                    setConversaciones([]);
                    setError(backendMessage);
                    return;
                }
                const data = await res.json();
                setConversaciones(data.conversations || []);
                setError(null);
            } catch {
                setConversaciones([]);
                setError("No pudimos cargar las conversaciones");
            } finally {
                if (!silent) setLoadingConvs(false);
            }
        },
        [filtro]
    );

    const fetchMensajes = useCallback(
        async (waId: string, options?: { silent?: boolean }) => {
            const showLoading = !options?.silent;
            try {
                if (showLoading) setLoadingMensajes(true);
                const encodedWaId = encodeURIComponent(waId);
                const res = await fetch(`/api/conversaciones/${encodedWaId}`, { cache: "no-store" });
                if (!res.ok) throw new Error("Error cargando mensajes");
                const data = await res.json();
                setMensajes(data.messages || []);
                await fetch(`/api/conversaciones/${encodedWaId}`, { method: "PATCH" });
                fetchConversaciones(true);
            } catch (err) {
                if (!options?.silent) {
                    console.error("[Conversaciones] Mensajes error", err);
                }
            } finally {
                if (showLoading) setLoadingMensajes(false);
            }
        },
        [fetchConversaciones]
    );

    const handleSeleccion = useCallback(
        (waId: string) => {
            setSeleccionada(waId);
            fetchMensajes(waId);
        },
        [fetchMensajes]
    );

    const conversacionActiva = conversaciones.find((c) => c.waId === seleccionada) || null;
    const botActivo = conversacionActiva?.botStatus === "activo";
    const inputBloqueado = !conversacionActiva || botActivo;

    useEffect(() => {
        if (!showAttachmentOptions) return;
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (attachmentMenuRef.current && target && !attachmentMenuRef.current.contains(target)) {
                setShowAttachmentOptions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showAttachmentOptions]);

    useEffect(() => {
        if (inputBloqueado && showAttachmentOptions) {
            setShowAttachmentOptions(false);
        }
    }, [inputBloqueado, showAttachmentOptions]);

    const handleCerrarChat = useCallback(async () => {
        if (!seleccionada || closingChat) return;
        const waIdObjetivo = seleccionada;
        const conversacionObjetivo = conversaciones.find((conversation) => conversation.waId === waIdObjetivo);

        if (conversacionObjetivo?.estado === "cerrado") {
            setSeleccionada(null);
            setMensajes([]);
            setDraftMessage("");
            setActionError(null);
            return;
        }

        setSeleccionada(null);
        setMensajes([]);
        setDraftMessage("");

        try {
            setActionError(null);
            setClosingChat(true);
            const encodedWaId = encodeURIComponent(waIdObjetivo);
            const res = await fetch(`/api/conversaciones/${encodedWaId}`, { method: "DELETE" });
            if (!res.ok) {
                let backendMessage = "Error cerrando la conversación";
                try {
                    const data = await res.json();
                    if (typeof data?.error === "string") backendMessage = data.error;
                } catch {
                    // noop
                }
                throw new Error(backendMessage);
            }

            setConversaciones((prev) =>
                prev.map((conversation) =>
                    conversation.waId === waIdObjetivo
                        ? { ...conversation, estado: "cerrado" }
                        : conversation
                )
            );
            fetchConversaciones(true);
        } catch (err) {
            console.error("[Conversaciones] Cerrar chat", err);
            setActionError(
                err instanceof Error && err.message
                    ? err.message
                    : "No pudimos cerrar el chat. Intenta nuevamente."
            );
        } finally {
            setClosingChat(false);
        }
    }, [seleccionada, closingChat, conversaciones, fetchConversaciones]);

    const handleToggleBot = useCallback(async () => {
        if (!conversacionActiva || updatingBot) return;
        try {
            setActionError(null);
            setUpdatingBot(true);
            const encodedWaId = encodeURIComponent(conversacionActiva.waId);
            const nextStatus = conversacionActiva.botStatus === "activo" ? "inactivo" : "activo";
            const res = await fetch(`/api/conversaciones/${encodedWaId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ botStatus: nextStatus }),
            });

            if (!res.ok) {
                let backendMessage = "No se pudo actualizar el estado del bot";
                try {
                    const data = await res.json();
                    if (typeof data?.error === "string") backendMessage = data.error;
                } catch {
                    // noop
                }
                throw new Error(backendMessage);
            }

            setConversaciones((prev) =>
                prev.map((c) =>
                    c.waId === conversacionActiva.waId
                        ? {
                              ...c,
                              botStatus: nextStatus,
                          }
                        : c
                )
            );
            fetchConversaciones(true);
        } catch (err) {
            console.error("[Conversaciones] Toggle bot", err);
            setActionError(
                err instanceof Error && err.message
                    ? err.message
                    : "No pudimos actualizar el estado del bot."
            );
        } finally {
            setUpdatingBot(false);
        }
    }, [conversacionActiva, updatingBot, fetchConversaciones]);

    const handleLimpiarAdjuntoImagen = useCallback(() => {
        setSelectedImageFile(null);
        setSelectedImagePreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
    }, []);

    const handleEnviarMensaje = useCallback(async () => {
        if (!conversacionActiva) return;
        const message = draftMessage.trim();
        if (inputBloqueado || sendingMessage) return;

        if (selectedImageFile) {
            await sendMediaFile("image", selectedImageFile, {
                caption: message || undefined,
                localPreviewUrl: selectedImagePreviewUrl || undefined,
            });
            setDraftMessage("");
            handleLimpiarAdjuntoImagen();
            return;
        }

        if (!message) return;

        try {
            setActionError(null);
            setSendingMessage(true);

            const res = await fetch("/api/meta/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    waId: conversacionActiva.waId,
                    nombre: conversacionActiva.nombre,
                    message,
                    senderType: "humano",
                    source: "dashboard",
                }),
            });

            if (!res.ok) {
                let backendMessage = "No se pudo enviar el mensaje";
                try {
                    const data = await res.json();
                    if (typeof data?.error === "string") backendMessage = data.error;
                } catch {
                    // noop
                }
                throw new Error(backendMessage);
            }

            setDraftMessage("");
            await fetchMensajes(conversacionActiva.waId);
            fetchConversaciones(true);
        } catch (err) {
            setActionError(
                err instanceof Error && err.message
                    ? err.message
                    : "No se pudo enviar el mensaje"
            );
        } finally {
            setSendingMessage(false);
        }
    }, [
        conversacionActiva,
        draftMessage,
        inputBloqueado,
        sendingMessage,
        selectedImageFile,
        selectedImagePreviewUrl,
        fetchMensajes,
        fetchConversaciones,
        handleLimpiarAdjuntoImagen,
    ]);

    async function sendMediaFile(
        type: "image" | "audio",
        file: File,
        options?: { caption?: string; localPreviewUrl?: string }
    ) {
        if (!conversacionActiva || inputBloqueado || sendingMessage) return;

        const label = type === "image" ? "imagen" : "audio";
        try {
            setActionError(null);
            setSendingMessage(true);

            const formData = new FormData();
            formData.append("waId", conversacionActiva.waId);
            formData.append("nombre", conversacionActiva.nombre);
            formData.append("type", type);
            formData.append("senderType", "humano");
            formData.append("source", "dashboard");
            if (options?.caption) formData.append("caption", options.caption);
            formData.append("file", file, file.name || `${type}.bin`);

            const res = await fetch("/api/meta/send", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                let backendMessage = `No se pudo enviar ${label}`;
                try {
                    const data = await res.json();
                    if (typeof data?.error === "string") backendMessage = data.error;
                } catch {
                    // noop
                }
                throw new Error(backendMessage);
            }

            const data = await res.json();
            if (
                type === "image" &&
                options?.localPreviewUrl &&
                typeof data?.messageId === "string" &&
                data.messageId
            ) {
                const stablePreviewUrl = URL.createObjectURL(file);
                setImagePreviewByMessageId((prev) => ({
                    ...prev,
                    [data.messageId]: stablePreviewUrl,
                }));
            }

            await fetchMensajes(conversacionActiva.waId);
            fetchConversaciones(true);
        } catch (err) {
            setActionError(
                err instanceof Error && err.message
                    ? /Param file must be a file/i.test(err.message)
                        ? "Meta no acepta ese formato de audio. Usa .mp3, .ogg o .m4a."
                        : err.message
                    : `No se pudo enviar ${label}`
            );
        } finally {
            setSendingMessage(false);
        }
    }

    const handleSeleccionarImagen = useCallback(() => {
        if (inputBloqueado || sendingMessage) return;
        imageInputRef.current?.click();
    }, [inputBloqueado, sendingMessage]);

    const handleSeleccionarAudio = useCallback(() => {
        if (inputBloqueado || sendingMessage) return;
        audioInputRef.current?.click();
    }, [inputBloqueado, sendingMessage]);

    const handleAudioSeleccionado = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            await sendMediaFile("audio", file);
        },
        [sendMediaFile]
    );

    const handleImagenSeleccionada = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setSelectedImageFile(file);
            setSelectedImagePreviewUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return URL.createObjectURL(file);
            });
        },
        []
    );

    const handleAudioDesdeMicrofono = useCallback(async () => {
        if (inputBloqueado || sendingMessage) return;

        if (recordingAudio) {
            try {
                mediaRecorderRef.current?.requestData();
            } catch {
                // ignore
            }
            mediaRecorderRef.current?.stop();
            return;
        }

        try {
            if (!("mediaDevices" in navigator) || !navigator.mediaDevices?.getUserMedia) {
                throw new Error("Tu navegador no permite grabar audio desde micrófono");
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const preferredMimeTypes = [
                "audio/ogg;codecs=opus",
                "audio/ogg",
                "audio/mp4",
                "audio/mpeg",
                "audio/aac",
                "audio/amr",
                "audio/opus",
                "audio/webm;codecs=opus",
                "audio/webm",
            ];

            const supportedMime = preferredMimeTypes.find((mime) => MediaRecorder.isTypeSupported(mime));

            let recorder: MediaRecorder;
            try {
                recorder = supportedMime
                    ? new MediaRecorder(stream, { mimeType: supportedMime })
                    : new MediaRecorder(stream);
            } catch {
                stream.getTracks().forEach((track) => track.stop());
                mediaStreamRef.current = null;
                setActionError(
                    "No pudimos iniciar la grabación en este navegador. Usa Audio para subir un archivo (.mp3, .ogg, .m4a)."
                );
                return;
            }

            mediaRecorderRef.current = recorder;
            const chunks: BlobPart[] = [];

            recorder.ondataavailable = (evt) => {
                if (evt.data.size > 0) chunks.push(evt.data);
            };

            recorder.onstop = async () => {
                setRecordingAudio(false);
                mediaRecorderRef.current = null;

                stream.getTracks().forEach((track) => track.stop());
                mediaStreamRef.current = null;

                const recorderMimeType = recorder.mimeType || supportedMime || "audio/webm";
                const normalizedMimeType = recorderMimeType.split(";")[0]?.trim() || recorderMimeType;
                const blob = new Blob(chunks, { type: normalizedMimeType });

                if (!blob.size || blob.size < 1024) {
                    setActionError(
                        "La grabación quedó vacía o demasiado corta. Mantén presionado Grabar al menos 1-2 segundos y vuelve a intentar."
                    );
                    return;
                }

                const extension = normalizedMimeType.includes("ogg")
                    ? "ogg"
                    : normalizedMimeType.includes("mp4")
                        ? "m4a"
                        : normalizedMimeType.includes("mpeg")
                            ? "mp3"
                            : normalizedMimeType.includes("webm")
                                ? "webm"
                            : normalizedMimeType.includes("amr")
                                ? "amr"
                                : normalizedMimeType.includes("aac")
                                    ? "aac"
                                    : "opus";
                const file = new File([blob], `audio-${Date.now()}.${extension}`, { type: normalizedMimeType });

                await sendMediaFile("audio", file);
            };

            recorder.start();
            setRecordingAudio(true);
        } catch (err) {
            setRecordingAudio(false);
            mediaRecorderRef.current = null;
            mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
            setActionError(
                err instanceof Error && err.message
                    ? err.message
                    : "No se pudo iniciar la grabación de audio"
            );
        }
    }, [inputBloqueado, sendingMessage, recordingAudio, sendMediaFile]);

    const handleAttachmentAction = useCallback(
        (option: "image" | "audio" | "record") => {
            if (inputBloqueado || sendingMessage) return;
            if (option === "image") {
                setShowAttachmentOptions(false);
                handleSeleccionarImagen();
                return;
            }
            if (option === "audio") {
                setShowAttachmentOptions(false);
                handleSeleccionarAudio();
                return;
            }
            // Keep the menu open while recording so users can see the active state and stop.
            handleAudioDesdeMicrofono();
        },
        [
            handleAudioDesdeMicrofono,
            handleSeleccionarAudio,
            handleSeleccionarImagen,
            inputBloqueado,
            sendingMessage,
        ]
    );

    useEffect(() => {
        fetchConversaciones();
        const interval = setInterval(() => fetchConversaciones(true), 5000);
        return () => clearInterval(interval);
    }, [fetchConversaciones]);

    useEffect(() => {
        if (!seleccionada) return;
        const interval = setInterval(() => {
            if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
            fetchMensajes(seleccionada, { silent: true });
        }, 4000);
        return () => clearInterval(interval);
    }, [seleccionada, fetchMensajes]);

    useEffect(() => {
        if (!conversacionActiva) return;
        const waId = conversacionActiva.waId;
        const lastAt = conversacionActiva.lastMessageAt || null;
        if (lastMessageSyncRef.current[waId] === lastAt) return;
        lastMessageSyncRef.current[waId] = lastAt;
        fetchMensajes(waId, { silent: true });
    }, [conversacionActiva?.waId, conversacionActiva?.lastMessageAt, fetchMensajes]);

    useEffect(() => {
        if (!conversaciones.length) {
            setSeleccionada(null);
            setMensajes([]);
            return;
        }
        if (seleccionada && conversaciones.some((c) => c.waId === seleccionada)) return;
        setSeleccionada(null);
        setMensajes([]);
    }, [conversaciones, seleccionada]);

    useEffect(() => {
        setActionError(null);
        setClosingChat(false);
        setSelectedImageFile(null);
        setBrokenImageByMessageId({});
        setSelectedImagePreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
    }, [seleccionada]);

    useEffect(() => {
        setBrokenImageByMessageId((prev) => {
            if (!Object.keys(prev).length) return prev;
            const next: Record<string, boolean> = {};
            const existingIds = new Set(mensajes.map((m) => m.messageId));
            for (const messageId of Object.keys(prev)) {
                if (existingIds.has(messageId)) next[messageId] = prev[messageId];
            }
            return next;
        });
    }, [mensajes]);

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        container.scrollTop = container.scrollHeight;
    }, [mensajes, seleccionada, loadingMensajes]);

    useEffect(() => {
        return () => {
            mediaRecorderRef.current?.stop();
            mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
            if (selectedImagePreviewUrl) URL.revokeObjectURL(selectedImagePreviewUrl);
            Object.values(imagePreviewByMessageId).forEach((url) => {
                if (typeof url === "string" && url.startsWith("blob:")) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [selectedImagePreviewUrl, imagePreviewByMessageId]);

    const conversacionesFiltradas = useMemo(() => {
        let result = conversaciones;

        if (filtro === "No leídos") {
            result = result.filter((c) => c.unreadCount > 0);
        }

        const term = busqueda.trim().toLowerCase();
        if (!term) return result;

        const termDigits = term.replace(/\D/g, "");

        return result.filter(
            (c) =>
                c.nombre.toLowerCase().includes(term) ||
                (c.lastMessage?.toLowerCase().includes(term) ?? false) ||
                (termDigits
                    ? c.waId.replace(/\D/g, "").includes(termDigits)
                    : c.waId.toLowerCase().includes(term))
        );
    }, [busqueda, conversaciones, filtro]);

    return (
        <div className="h-full flex flex-col gap-2 overflow-y-auto overflow-x-hidden min-h-0 pr-1 pt-1">
            <div className="glass-card overflow-hidden animate-in flex-1 min-h-0">
                    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] h-full">
                    <aside className="border-r border-surface-800/30 bg-white/50 flex flex-col min-h-0">
                        <div className="p-4 border-b border-surface-800/20 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-surface-500">Chats</p>
                                    <h2 className="text-lg font-semibold text-surface-100">
                                        {loadingConvs ? "Cargando..." : `${conversacionesFiltradas.length} activos`}
                                    </h2>
                                </div>
                            </div>

                            <div className="relative">
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
                                >
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.3-4.3" />
                                </svg>
                                <input
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="input-field pl-9 text-sm"
                                    placeholder="Buscar por nombre o teléfono"
                                />
                            </div>

                            <div className="flex gap-2 overflow-x-auto text-xs">
                                {FILTROS.map((opcion) => (
                                    <button
                                        key={opcion}
                                        onClick={() => setFiltro(opcion)}
                                        className={`px-3 py-1.5 rounded-full border text-[11px] ${
                                            filtro === opcion
                                                ? "bg-primary-500 text-white border-primary-500"
                                                : "border-surface-800/30 text-surface-400"
                                        }`}
                                    >
                                        {opcion}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="px-4 py-3 text-xs text-primary-600 bg-primary-500/10 border border-primary-500/30">
                                {error}
                            </div>
                        )}

                        <div className="divide-y divide-surface-800/15 flex-1 overflow-y-auto min-h-0">
                            {conversacionesFiltradas.map((conversacion) => {
                                const activo = seleccionada === conversacion.waId;
                                const lastMessagePreview = conversacion.lastMessage
                                    ? isGenericAudioLabel(conversacion.lastMessage)
                                        ? "Audio"
                                        : conversacion.lastMessage
                                    : "Sin mensajes";
                                return (
                                    <button
                                        key={conversacion.waId}
                                        onClick={() => handleSeleccion(conversacion.waId)}
                                        className={`w-full text-left px-4 py-3 transition ${
                                            activo ? "bg-primary-500/10" : "hover:bg-primary-500/5"
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-full bg-surface-900 text-surface-50 text-xs font-bold flex items-center justify-center uppercase">
                                                {conversacion.nombre
                                                    .split(" ")
                                                    .filter(Boolean)
                                                    .slice(0, 2)
                                                    .map((n) => n[0])
                                                    .join("")}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-semibold text-surface-100 truncate">
                                                        {conversacion.nombre}
                                                    </p>
                                                    <span className="text-[10px] text-surface-500 shrink-0">
                                                        {formatRelative(conversacion.lastMessageAt)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-surface-400 truncate">
                                                    {lastMessagePreview}
                                                </p>
                                                <div className="mt-2 flex items-center gap-2 text-[10px] text-surface-500">
                                                    <span className="inline-flex items-center gap-1">
                                                        <span
                                                            className={`h-2 w-2 rounded-full ${
                                                                conversacion.estado === "cerrado"
                                                                    ? "bg-surface-400"
                                                                    : "bg-emerald-500"
                                                            }`}
                                                        />
                                                        {conversacion.canal}
                                                    </span>
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full ${
                                                            conversacion.botStatus === "activo"
                                                                ? "bg-emerald-500/15 text-emerald-700"
                                                                : "bg-blue-500/15 text-blue-700"
                                                        }`}
                                                    >
                                                        {conversacion.botStatus === "activo" ? "IA" : "Humano"}
                                                    </span>
                                                </div>
                                            </div>
                                            {conversacion.unreadCount > 0 && (
                                                <span className="shrink-0 w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] font-semibold flex items-center justify-center">
                                                    {conversacion.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}

                            {!loadingConvs && conversacionesFiltradas.length === 0 && (
                                <div className="p-6 text-center text-surface-500 text-sm">
                                    Aún no hay conversaciones.
                                </div>
                            )}
                        </div>
                    </aside>

                    <section className="relative bg-white/30 flex flex-col min-h-0 overflow-hidden">
                        {conversacionActiva ? (
                            <>
                                <div className="px-6 py-4 border-b border-surface-800/20 bg-white/70 space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-semibold text-surface-100">{conversacionActiva.nombre}</p>
                                                <span className="text-xs text-surface-400">
                                                    {formatPhoneFromWaId(conversacionActiva.waId)}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-surface-400 mt-1">
                                                <span className="px-2 py-0.5 rounded-full bg-surface-900 text-surface-200">
                                                    {conversacionActiva.canal}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 text-xs">
                                            <div className="flex items-center justify-between gap-4 rounded-2xl border border-surface-800/20 bg-white px-3 py-2 min-w-[220px]">
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-[0.2em] text-surface-500">Bot IA</p>
                                                    <p className="text-sm font-semibold text-surface-100">
                                                        {botActivo ? "Activado" : "Desactivado"}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleToggleBot}
                                                    disabled={updatingBot}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                        botActivo ? "bg-emerald-500" : "bg-surface-700"
                                                    } ${
                                                        updatingBot
                                                            ? "opacity-60 cursor-not-allowed"
                                                            : "cursor-pointer"
                                                    }`}
                                                    aria-label="Activar o desactivar bot"
                                                >
                                                    <span
                                                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                                            botActivo ? "translate-x-5" : "translate-x-1"
                                                        }`}
                                                    />
                                                </button>
                                            </div>
                                            <button
                                                onClick={handleCerrarChat}
                                                disabled={closingChat}
                                                className={`px-3 py-2 rounded-md text-white ${
                                                    closingChat
                                                        ? "bg-primary-500/60 cursor-not-allowed"
                                                        : "bg-primary-500 hover:bg-primary-600"
                                                }`}
                                            >
                                                {closingChat ? "Cerrando..." : "Cerrar chat"}
                                            </button>
                                        </div>
                                    </div>
                                    {actionError && (
                                        <div className="text-[11px] text-primary-600 bg-primary-500/10 border border-primary-500/30 rounded-md px-3 py-2">
                                            {actionError}
                                        </div>
                                    )}
                                </div>

                                <div
                                    ref={messagesContainerRef}
                                    className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0"
                                    style={{
                                        backgroundColor: "#fbfbfb",
                                        backgroundImage: "url('/images/chat-bg.png')",
                                        backgroundSize: "cover",
                                        backgroundPosition: "center",
                                        backgroundRepeat: "no-repeat",
                                    }}
                                >
                                    {loadingMensajes && (
                                        <div className="text-center text-xs text-surface-400">Cargando mensajes...</div>
                                    )}
                                    {mensajes.map((mensaje) => (
                                        <div
                                            key={mensaje.messageId}
                                            className={`flex ${mensaje.direction === "outbound" ? "justify-end" : "justify-start"}`}
                                        >
                                            {(() => {
                                                const bodyText = (mensaje.body || "").trim();
                                                if (isAuthErrorJson(bodyText)) return null;
                                                const previewUrl = imagePreviewByMessageId[mensaje.messageId];
                                                const remoteMediaUrl = mensaje.mediaUrl || null;
                                                const imageUrl = remoteMediaUrl || previewUrl;
                                                const isImage =
                                                    mensaje.mediaType === "image" ||
                                                    Boolean(previewUrl) ||
                                                    /^📷\s*/.test(bodyText);
                                                const isAudio =
                                                    mensaje.mediaType === "audio" ||
                                                    /^🎵\s*audio/i.test(bodyText) ||
                                                    /^\s*audio\b/i.test(bodyText) ||
                                                    /\baudio\s*\([^)]*\.(m4a|mp3|ogg|opus|webm)\)/i.test(bodyText);
                                                const audioUrl = isAudio ? remoteMediaUrl : null;
                                                const imageFailed = Boolean(brokenImageByMessageId[mensaje.messageId]);

                                                const bubbleSizeClass = isAudio
                                                    ? "max-w-[85%] px-5 py-4"
                                                    : "max-w-[75%] px-4 py-3";
                                                const hourLabel = formatHour(mensaje.timestamp);
                                                const footerLabel = hourLabel;
                                                const showSenderChip = !(
                                                    mensaje.direction === "inbound" && mensaje.senderType === "cliente"
                                                );
                                                const showInterventionChip = Boolean(mensaje.interventionStatus);
                                                const showHeaderRow = showSenderChip || showInterventionChip;
                                                return (
                                            <div
                                                className={`${bubbleSizeClass} rounded-2xl text-sm shadow-sm ${
                                                    mensaje.direction === "outbound"
                                                        ? "bg-primary-500 text-white"
                                                        : "bg-white border border-surface-800/15 text-surface-100"
                                                }`}
                                            >
                                                {showHeaderRow ? (
                                                    <div className="mb-1.5 flex items-center gap-2">
                                                        {showSenderChip ? (
                                                            <span
                                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                                    mensaje.direction === "outbound"
                                                                        ? "bg-white/20 text-white"
                                                                        : getSenderBadgeClass(mensaje.senderType)
                                                                }`}
                                                            >
                                                                {getSenderLabel(mensaje.senderType)}
                                                            </span>
                                                        ) : null}
                                                        {showInterventionChip ? (
                                                            <span
                                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                                    mensaje.interventionStatus === "activo"
                                                                        ? "bg-emerald-500/15 text-emerald-700"
                                                                        : "bg-surface-900/10 text-surface-500"
                                                                }`}
                                                            >
                                                                {mensaje.interventionStatus === "activo" ? "Activo" : "Inactivo"}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                ) : null}
                                                {isImage && imageUrl && !imageFailed ? (
                                                    <div className="space-y-2">
                                                        <img
                                                            src={imageUrl}
                                                            alt={mensaje.body || "Imagen enviada"}
                                                            className="max-h-64 w-auto rounded-xl border border-white/20"
                                                            onError={() =>
                                                                setBrokenImageByMessageId((prev) => ({
                                                                    ...prev,
                                                                    [mensaje.messageId]: true,
                                                                }))
                                                            }
                                                        />
                                                        {mensaje.body ? (
                                                            <div className="whitespace-pre-wrap break-words leading-relaxed">
                                                                {renderMessageBody(mensaje.body)}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ) : isImage ? (
                                                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                                                        {mensaje.body ? renderMessageBody(mensaje.body) : "📷 Imagen"}
                                                    </div>
                                                ) : isAudio ? (
                                                    <div className="space-y-2">
                                                        {audioUrl ? (
                                                            <AudioMessagePlayer
                                                                messageId={mensaje.messageId}
                                                                audioUrl={audioUrl}
                                                                isOutbound={mensaje.direction === "outbound"}
                                                                timestampLabel={hourLabel || "--:--"}
                                                                activeAudioId={activeAudioId}
                                                                setActiveAudioId={setActiveAudioId}
                                                            />
                                                        ) : (
                                                            <p className="text-[11px] opacity-80">
                                                                Audio sin URL reproducible en este mensaje.
                                                            </p>
                                                        )}
                                                        {!isGenericAudioLabel(mensaje.body) && !isAuthErrorJson((mensaje.body || "").trim()) ? (
                                                            <div className="whitespace-pre-wrap break-words leading-relaxed">
                                                                {renderMessageBody(mensaje.body || "")}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                                                        {mensaje.body ? renderMessageBody(mensaje.body) : "Mensaje sin texto"}
                                                    </div>
                                                )}
                                                {footerLabel ? (
                                                    <p
                                                        className={`mt-1 text-[10px] ${
                                                            mensaje.direction === "outbound"
                                                                ? "text-white/70"
                                                                : "text-surface-400"
                                                        }`}
                                                    >
                                                        {footerLabel}
                                                    </p>
                                                ) : null}
                                            </div>
                                                );
                                            })()}
                                        </div>
                                    ))}

                                    {!loadingMensajes && mensajes.length === 0 && (
                                        <div className="text-center text-surface-400 text-sm py-12">
                                            Aún no hay mensajes registrados para este contacto.
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-surface-800/20 bg-white/70 p-4">
                                    {selectedImagePreviewUrl && (
                                        <div className="mb-3 rounded-xl border border-surface-800/20 bg-surface-100/80 p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-2">
                                                    <p className="text-xs font-semibold text-surface-500">Vista previa (no enviada)</p>
                                                    <img
                                                        src={selectedImagePreviewUrl}
                                                        alt={selectedImageFile?.name || "Imagen seleccionada"}
                                                        className="max-h-44 w-auto rounded-lg border border-surface-800/20"
                                                    />
                                                    <p className="text-[11px] text-surface-400 truncate max-w-[280px]">
                                                        {selectedImageFile?.name || "imagen"}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={handleLimpiarAdjuntoImagen}
                                                    className="px-2 py-1 rounded-md border border-surface-800/30 text-[11px] text-surface-500 hover:text-primary-500"
                                                    disabled={sendingMessage}
                                                >
                                                    Quitar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex gap-3 items-start">
                                        <input
                                            ref={imageInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleImagenSeleccionada}
                                        />
                                        <input
                                            ref={audioInputRef}
                                            type="file"
                                            accept="audio/mpeg,audio/mp3,audio/ogg,audio/mp4,audio/aac,audio/amr,audio/opus,audio/*"
                                            className="hidden"
                                            onChange={handleAudioSeleccionado}
                                        />
                                        <div className="relative" ref={attachmentMenuRef}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (inputBloqueado || sendingMessage) return;
                                                    setShowAttachmentOptions((prev) => !prev);
                                                }}
                                                className={`h-11 w-11 rounded-2xl border text-lg font-semibold transition ${
                                                    inputBloqueado || sendingMessage
                                                        ? "border-surface-800/20 text-surface-300 cursor-not-allowed"
                                                        : "border-surface-800/30 text-surface-500 hover:text-primary-500"
                                                }`}
                                                disabled={inputBloqueado || sendingMessage}
                                                aria-label="Opciones de adjunto"
                                            >
                                                +
                                            </button>
                                            {showAttachmentOptions ? (
                                                <div className="absolute bottom-[calc(100%+0.75rem)] left-0 z-20 w-44 rounded-2xl border border-surface-800/20 bg-white/95 shadow-2xl backdrop-blur px-2 py-3 space-y-1">
                                                    <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-surface-400">
                                                        Adjuntar
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAttachmentAction("image")}
                                                        className="w-full rounded-xl px-3 py-2 text-left text-sm text-surface-500 hover:bg-surface-900/20"
                                                    >
                                                        Imagen
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAttachmentAction("audio")}
                                                        className="w-full rounded-xl px-3 py-2 text-left text-sm text-surface-500 hover:bg-surface-900/20"
                                                    >
                                                        Audio
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAttachmentAction("record")}
                                                        className="w-full rounded-xl px-3 py-2 text-left text-sm text-surface-500 hover:bg-surface-900/20"
                                                    >
                                                        {recordingAudio ? "Detener grabación" : "Grabar"}
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>
                                        <input
                                            value={draftMessage}
                                            onChange={(e) => setDraftMessage(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleEnviarMensaje();
                                                }
                                            }}
                                            className={`flex-1 input-field ${
                                                inputBloqueado ? "bg-surface-100 text-surface-500" : "bg-white"
                                            }`}
                                            placeholder={`Escribe un mensaje para ${conversacionActiva.nombre}`}
                                            disabled={inputBloqueado}
                                        />
                                        <button
                                            onClick={handleEnviarMensaje}
                                            className="btn-primary whitespace-nowrap"
                                            disabled={
                                                inputBloqueado ||
                                                sendingMessage ||
                                                (!draftMessage.trim() && !selectedImageFile)
                                            }
                                        >
                                            {sendingMessage ? "Enviando..." : "Enviar"}
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-surface-400 mt-2">
                                        {botActivo
                                                ? "Bot IA activo: desactívalo para responder manualmente."
                                                : "Modo manual activo: ya puedes escribir."}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex items-center justify-center p-8">
                                <div className="text-center">
                                    <div className="w-20 h-20 rounded-2xl bg-surface-800/60 flex items-center justify-center mx-auto mb-4">
                                        <svg
                                            width="34"
                                            height="34"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.7"
                                            className="text-surface-500"
                                        >
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-surface-100">Selecciona una conversación</h3>
                                    <p className="text-sm text-surface-500 mt-2">
                                        Elige un contacto del panel izquierdo para ver su chat.
                                    </p>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
