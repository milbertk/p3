import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FaArrowRight,
  FaMicrophone,
  FaPaperPlane,
  FaStop,
  FaTimes,
  FaTrashAlt,
  FaVolumeMute,
  FaVolumeUp,
} from "react-icons/fa";

import AiAssistantService, {
  platformForPath,
  resolveAssistantAgent,
} from "../../Services/AiAssistantService";
import SelectedCompanyStorage from "../../Utils/SELECTED_COMPANY_STORAGE_KEY";
import { buildReply, SUGGESTION_KEYS } from "./assistantRoutes";
import VoiceLanguageSelect, { useVoiceLanguage } from "./VoiceLanguageSelect";
import { AKMark } from "../Brand/BrandLogo";
import "./AiAssistantChat.scss";

// The header remounts on every page, so the conversation is kept for the
// browser session to survive navigating through the answer links.
// Each agent (shao / users) has its own conversation id: { shao: "...", users: "..." }.
const HISTORY_STORAGE_KEY = "aiAssistantHistory";
const AUTO_SPEAK_STORAGE_KEY = "aiAssistantAutoSpeak";
const CONVERSATION_STORAGE_KEY = "aiAssistantConversationIds";

const assistantService = new AiAssistantService();

const SpeechRecognition =
  typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

// Dictation keeps listening through pauses. It is sent after this much silence,
// or right away when the user presses Send or the stop button.
const VOICE_SILENCE_MS = 10000;
// Browsers stop a long dictation on their own; it is restarted up to this many times.
const MAX_VOICE_RESTARTS = 30;

function joinSpeech(left, right) {
  const a = String(left || "").trim();
  const b = String(right || "").trim();
  return a && b ? `${a} ${b}` : a || b;
}

function readStorage(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode): the chat still works in memory.
  }
}

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AiAssistantChat({ t, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  // Voice language (dictation + reading answers aloud), chosen in the
  // "Select language" list; default English (2026-10-25).
  const [locale, setVoiceLanguage] = useVoiceLanguage();

  const [messages, setMessages] = useState(() => readStorage(HISTORY_STORAGE_KEY, []));
  const [conversationIds, setConversationIds] = useState(() => {
    const stored = readStorage(CONVERSATION_STORAGE_KEY, {});
    return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  });
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(() => readStorage(AUTO_SPEAK_STORAGE_KEY, false));
  const [speakingId, setSpeakingId] = useState("");
  const [voiceError, setVoiceError] = useState("");

  // Current dictation: { recognition, finalText, interim, timer, restarts, done }.
  const dictationRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const requestRef = useRef(null);

  useEffect(() => writeStorage(HISTORY_STORAGE_KEY, messages), [messages]);
  useEffect(() => writeStorage(AUTO_SPEAK_STORAGE_KEY, autoSpeak), [autoSpeak]);
  useEffect(() => writeStorage(CONVERSATION_STORAGE_KEY, conversationIds), [conversationIds]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  // Stop voice input/output and pending replies when the chat closes.
  useEffect(
    () => () => {
      const session = dictationRef.current;
      if (session) {
        session.done = true;
        clearTimeout(session.timer);
        session.recognition?.abort();
        dictationRef.current = null;
      }
      if (canSpeak) window.speechSynthesis.cancel();
      requestRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const speak = useCallback(
    (message) => {
      if (!canSpeak) return;
      window.speechSynthesis.cancel();

      const parts = [message.text, ...(message.items || []).map((item) => `${item.meta}, ${item.title}`)];
      const utterance = new SpeechSynthesisUtterance(parts.join(". "));
      utterance.lang = locale;
      utterance.onend = () => setSpeakingId("");
      utterance.onerror = () => setSpeakingId("");
      setSpeakingId(message.id);
      window.speechSynthesis.speak(utterance);
    },
    [locale],
  );

  const stopSpeaking = () => {
    if (canSpeak) window.speechSynthesis.cancel();
    setSpeakingId("");
  };

  const sendQuestion = useCallback(
    async (rawQuestion) => {
      const question = String(rawQuestion || "").trim();
      if (!question || thinking) return;

      setDraft("");
      setThinking(true);
      setMessages((current) => [...current, { id: nextId(), role: "user", text: question }]);

      const controller = new AbortController();
      requestRef.current = controller;
      const company = SelectedCompanyStorage.getCompany();

      // The current screen decides the platform; the platform (and the
      // selected company) decide which agent answers.
      const platform = platformForPath(location.pathname);
      const agent = resolveAssistantAgent(platform, company?.companyId);

      const ask = (conversationId) =>
        assistantService.sendMessage(
          {
            agent,
            conversationId,
            message: question,
            platform,
            companyId: company?.companyId,
            companyName: company?.companyName,
            currentPath: location.pathname,
            language: i18n.language,
          },
          controller.signal,
        );

      try {
        const previousId = conversationIds[agent] || "";
        let result;
        try {
          result = await ask(previousId);
        } catch (error) {
          // The conversation was deleted or belongs to another company/session:
          // retry once in a new conversation.
          if (error?.status !== 404 || !previousId) throw error;
          setConversationIds((current) => ({ ...current, [agent]: "" }));
          result = await ask("");
        }

        if (result?.conversationId) {
          setConversationIds((current) => ({ ...current, [agent]: result.conversationId }));
        }

        const reply = { id: nextId(), role: "assistant", ...buildReply(result?.reply, t) };
        setMessages((current) => [...current, reply]);
        if (autoSpeak) speak(reply);
      } catch (error) {
        if (error?.name === "AbortError") return;
        console.error("AI assistant error:", error);

        // Plan and usage limits get a clear message instead of a generic error.
        const limitKey = {
          AI_NOT_IN_PLAN: "aiAssistant.limits.notInPlan",
          AI_MONTHLY_INTERACTIONS: "aiAssistant.limits.monthlyInteractions",
          AI_MONTHLY_LIMIT: "aiAssistant.limits.monthly",
          AI_DAILY_LIMIT: "aiAssistant.limits.daily",
        }[error?.code];
        setMessages((current) => [
          ...current,
          { id: nextId(), role: "assistant", text: t(limitKey || "aiAssistant.error") },
        ]);
      } finally {
        if (requestRef.current === controller) {
          requestRef.current = null;
          setThinking(false);
        }
      }
    },
    [autoSpeak, conversationIds, i18n.language, location.pathname, speak, t, thinking],
  );

  // The dictation handlers live longer than one render: always call the latest sendQuestion.
  const sendQuestionRef = useRef(sendQuestion);
  useEffect(() => {
    sendQuestionRef.current = sendQuestion;
  }, [sendQuestion]);

  // Ends the current dictation. shouldSend=true sends what was dictated.
  const stopDictation = useCallback((shouldSend) => {
    const session = dictationRef.current;
    if (!session) return;
    dictationRef.current = null;
    session.done = true;
    clearTimeout(session.timer);
    try {
      session.recognition?.abort();
    } catch {
      // Already stopped.
    }
    setListening(false);

    const text = joinSpeech(session.finalText, session.interim);
    if (shouldSend && text) sendQuestionRef.current(text);
  }, []);

  const startDictation = () => {
    const session = { recognition: null, finalText: "", interim: "", timer: null, restarts: 0, done: false };

    // Every new word restarts the countdown; silence for VOICE_SILENCE_MS ends the dictation.
    const armSilenceTimer = () => {
      clearTimeout(session.timer);
      session.timer = setTimeout(() => stopDictation(true), VOICE_SILENCE_MS);
    };

    const startRecognition = () => {
      const recognition = new SpeechRecognition();
      recognition.lang = locale;
      recognition.continuous = true; // keep listening through pauses
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        if (session.done) return;
        let interim = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index][0].transcript;
          if (event.results[index].isFinal) session.finalText = joinSpeech(session.finalText, transcript);
          else interim = joinSpeech(interim, transcript);
        }
        session.interim = interim;
        setDraft(joinSpeech(session.finalText, session.interim));
        armSilenceTimer();
      };

      recognition.onerror = (event) => {
        if (["not-allowed", "service-not-allowed", "audio-capture"].includes(event.error)) {
          // No microphone or no permission: stop for good.
          setVoiceError(t("aiAssistant.voice.error"));
          stopDictation(false);
        } else if (!["aborted", "no-speech"].includes(event.error)) {
          setVoiceError(t("aiAssistant.voice.error"));
        }
      };

      recognition.onend = () => {
        if (session.done) return;
        // The browser stopped by itself (long pause or time limit): keep the
        // pending words and listen again until the silence timer ends.
        session.finalText = joinSpeech(session.finalText, session.interim);
        session.interim = "";
        session.restarts += 1;
        if (session.restarts > MAX_VOICE_RESTARTS) {
          stopDictation(true);
          return;
        }
        try {
          startRecognition();
        } catch {
          stopDictation(true);
        }
      };

      session.recognition = recognition;
      recognition.start();
    };

    stopSpeaking();
    dictationRef.current = session;
    setDraft("");
    setListening(true);
    armSilenceTimer();
    try {
      startRecognition();
    } catch {
      setVoiceError(t("aiAssistant.voice.error"));
      stopDictation(false);
    }
  };

  const toggleListening = () => {
    setVoiceError("");

    if (listening) {
      // Stop button = "I finished talking": send now.
      stopDictation(true);
      return;
    }
    if (!SpeechRecognition) {
      setVoiceError(t("aiAssistant.voice.unsupported"));
      return;
    }
    startDictation();
  };

  const submit = (event) => {
    event.preventDefault();
    // Sending while dictating: end the dictation without sending it twice.
    if (dictationRef.current) stopDictation(false);
    sendQuestion(draft);
  };

  const clearConversation = () => {
    stopDictation(false);
    stopSpeaking();
    requestRef.current?.abort();
    requestRef.current = null;
    setThinking(false);
    setMessages([]);
    setConversationIds({});
    inputRef.current?.focus();
  };

  const goTo = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <section className="ai-assistant" role="dialog" aria-label={t("aiAssistant.title")}>
      <header className="ai-assistant__header">
        <span className="ai-assistant__avatar"><AKMark /></span>
        <div className="ai-assistant__heading">
          <strong>{t("aiAssistant.title")}</strong>
          <small>{t("aiAssistant.betaBadge")}</small>
        </div>
        {canSpeak && (
          <button
            type="button"
            className={`ai-assistant__icon-button${autoSpeak ? " is-active" : ""}`}
            onClick={() => {
              if (autoSpeak) stopSpeaking();
              setAutoSpeak(!autoSpeak);
            }}
            title={t(autoSpeak ? "aiAssistant.voice.autoSpeakOff" : "aiAssistant.voice.autoSpeakOn")}
            aria-pressed={autoSpeak}
          >
            {autoSpeak ? <FaVolumeUp /> : <FaVolumeMute />}
          </button>
        )}
        <button
          type="button"
          className="ai-assistant__icon-button"
          onClick={clearConversation}
          title={t("aiAssistant.clear")}
          disabled={!messages.length}
        >
          <FaTrashAlt />
        </button>
        <button
          type="button"
          className="ai-assistant__icon-button"
          onClick={onClose}
          title={t("aiAssistant.close")}
        >
          <FaTimes />
        </button>
      </header>

      <div className="ai-assistant__messages" ref={listRef} aria-live="polite">
        {!messages.length && (
          <div className="ai-assistant__welcome">
            <p>{t("aiAssistant.welcome")}</p>
            <div className="ai-assistant__suggestions">
              {SUGGESTION_KEYS.map((key) => (
                <button key={key} type="button" onClick={() => sendQuestion(t(key))}>
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`ai-assistant__message ai-assistant__message--${message.role}`}>
            <p>{message.text}</p>

            {message.items?.length > 0 && (
              <ul className="ai-assistant__items">
                {message.items.map((item) => (
                  <li key={`${item.title}-${item.meta}`}>
                    <span className="ai-assistant__item-meta">{item.meta}</span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.subtitle}</small>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {message.links?.length > 0 && (
              <div className="ai-assistant__links">
                {message.links.map((item) => (
                  <button key={item.path} type="button" onClick={() => goTo(item.path)}>
                    {item.label} <FaArrowRight />
                  </button>
                ))}
              </div>
            )}

            {message.role === "assistant" && canSpeak && (
              <button
                type="button"
                className="ai-assistant__play"
                onClick={() => (speakingId === message.id ? stopSpeaking() : speak(message))}
              >
                {speakingId === message.id ? <FaStop /> : <FaVolumeUp />}{" "}
                {t(speakingId === message.id ? "aiAssistant.voice.stop" : "aiAssistant.voice.play")}
              </button>
            )}
          </div>
        ))}

        {thinking && (
          <div className="ai-assistant__message ai-assistant__message--assistant ai-assistant__typing" aria-label={t("aiAssistant.thinking")}>
            <span /><span /><span />
          </div>
        )}
      </div>

      {voiceError && <div className="ai-assistant__voice-error" role="alert">{voiceError}</div>}

      <div className="ai-assistant__voice-language">
        <VoiceLanguageSelect
          value={locale}
          onChange={setVoiceLanguage}
          label={t("aiAssistant.voice.selectLanguage", { defaultValue: "Select language" })}
          disabled={listening}
        />
      </div>

      <form className="ai-assistant__composer" onSubmit={submit}>
        <button
          type="button"
          className={`ai-assistant__mic${listening ? " is-listening" : ""}`}
          onClick={toggleListening}
          title={t(listening ? "aiAssistant.voice.stopDictation" : "aiAssistant.voice.dictate")}
          aria-pressed={listening}
        >
          {listening ? <FaStop /> : <FaMicrophone />}
        </button>
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t(listening ? "aiAssistant.listening" : "aiAssistant.placeholder")}
          aria-label={t("aiAssistant.placeholder")}
          autoFocus
        />
        <button type="submit" className="ai-assistant__send" disabled={!draft.trim() || thinking} title={t("aiAssistant.send")}>
          <FaPaperPlane />
        </button>
      </form>
    </section>
  );
}
