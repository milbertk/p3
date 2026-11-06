// Language of the assistant's voice: dictation (speech recognition) and the
// voice that reads the answers (2026-10-25). Independent from the app
// language, saved in this browser. Default: English.
import { useEffect, useRef, useState } from "react";
import { FaGlobe, FaCheck, FaChevronDown } from "react-icons/fa";

export const VOICE_LANGUAGES = [
  { code: "en-US", label: "English" },
  { code: "es-CR", label: "Español" }, // Costa Rica / Latin American accent
];
export const DEFAULT_VOICE_LANGUAGE = "en-US";
const STORAGE_KEY = "alephk.voiceLanguage";

function readVoiceLanguage() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return VOICE_LANGUAGES.some((item) => item.code === saved) ? saved : DEFAULT_VOICE_LANGUAGE;
  } catch {
    return DEFAULT_VOICE_LANGUAGE; // storage blocked (private mode)
  }
}

/** [voiceLanguage, setVoiceLanguage] — remembered in this browser. */
export function useVoiceLanguage() {
  const [language, setLanguage] = useState(readVoiceLanguage);
  const update = (code) => {
    if (!VOICE_LANGUAGES.some((item) => item.code === code)) return;
    setLanguage(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* not saved: still used for this visit */
    }
  };
  return [language, update];
}

/** "Select language" button that opens a list: English / Español. */
export default function VoiceLanguageSelect({ value, onChange, label = "Select language", disabled = false }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const current = VOICE_LANGUAGES.find((item) => item.code === value) || VOICE_LANGUAGES[0];

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type !== "keydown" && wrapperRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="voice-language" ref={wrapperRef}>
      <button
        type="button"
        className="voice-language__button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={label}
      >
        <FaGlobe aria-hidden="true" />
        <span>{label}</span>
        <small>{current.label}</small>
        <FaChevronDown aria-hidden="true" className="voice-language__chevron" />
      </button>
      {open && (
        <ul className="voice-language__list" role="listbox" aria-label={label}>
          {VOICE_LANGUAGES.map((item) => (
            <li key={item.code}>
              <button
                type="button"
                role="option"
                aria-selected={item.code === current.code}
                className={`voice-language__option${item.code === current.code ? " is-selected" : ""}`}
                onClick={() => {
                  onChange(item.code);
                  setOpen(false);
                }}
              >
                <span>{item.label}</span>
                {item.code === current.code && <FaCheck aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
