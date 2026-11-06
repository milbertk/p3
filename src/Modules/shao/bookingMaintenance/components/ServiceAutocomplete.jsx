import { useEffect, useId, useRef, useState } from "react";
import SearchProductsService from "../../products/services/SearchProductsService";
import "./ServiceAutocomplete.scss";

// =====================================================================
//  Service autocomplete for the booking schedule screen.
//  Searches the company's SERVICE products on the server while the user
//  types (no 50-item limit like a preloaded dropdown).
//  value: { id, name } of the selected service; onSelect({ id, name, code }).
//  scheduledIds: ids of services that already have a schedule ("Has schedule").
// =====================================================================

const searchProductsService = new SearchProductsService();
const SEARCH_DELAY_MS = 250;
const MAX_RESULTS = 20;

function toOption(product) {
  return {
    id: String(product?.productInternalId || product?.product_internal_id || ""),
    name: String(product?.name || ""),
    code: String(product?.productCode || product?.product_code || ""),
  };
}

export default function ServiceAutocomplete({
  id,
  t,
  companyId,
  value,
  onSelect,
  disabled = false,
  placeholder,
  scheduledIds = [],
}) {
  const listId = useId();
  const [text, setText] = useState(value?.name || "");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const blurTimer = useRef(null);

  // Show the selected service when it changes from outside (load, new...).
  useEffect(() => {
    setText(value?.name || "");
  }, [value?.id, value?.name]);

  useEffect(() => () => clearTimeout(blurTimer.current), []);

  // Server search, a moment after the user stops typing.
  useEffect(() => {
    if (!open || !companyId) return undefined;
    let active = true;
    // Typing nothing new (the selected name is shown) lists all services.
    const term = text.trim() === String(value?.name || "").trim() ? "" : text.trim();

    const handle = setTimeout(() => {
      setLoading(true);
      searchProductsService
        .getProducts({ companyId, filters: { productType: "SERVICE", term, limit: MAX_RESULTS } })
        .then((products) => {
          if (!active) return;
          setOptions((Array.isArray(products) ? products : []).map(toOption).filter((o) => o.id));
          setHighlight(-1);
        })
        .catch(() => {
          if (active) setOptions([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, SEARCH_DELAY_MS);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [text, open, companyId, value?.name]);

  const choose = (option) => {
    setText(option.name);
    setOpen(false);
    setHighlight(-1);
    onSelect?.(option);
  };

  const closeAndRestore = () => {
    setOpen(false);
    setHighlight(-1);
    setText(value?.name || "");
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) => Math.min(current + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      if (open && highlight >= 0 && options[highlight]) {
        event.preventDefault();
        choose(options[highlight]);
      } else if (open) {
        // Do not submit the form while the list is open.
        event.preventDefault();
      }
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      closeAndRestore();
    }
  };

  return (
    <div className="booking-autocomplete">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={highlight >= 0 ? `${listId}-${highlight}` : undefined}
        autoComplete="off"
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
        }}
        onFocus={(event) => {
          event.target.select();
          setOpen(true);
        }}
        onBlur={() => {
          // Let a click on an option finish first.
          blurTimer.current = setTimeout(closeAndRestore, 150);
        }}
        onKeyDown={handleKeyDown}
      />

      {open && (
        <ul id={listId} role="listbox" className="booking-autocomplete__list">
          {loading && options.length === 0 && (
            <li className="booking-autocomplete__status">
              {t("bookingAvailabilityMaintenance.autocomplete.searching")}
            </li>
          )}
          {!loading && options.length === 0 && (
            <li className="booking-autocomplete__status">
              {t("bookingAvailabilityMaintenance.autocomplete.noResults")}
            </li>
          )}
          {options.map((option, index) => (
            <li
              key={option.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === highlight}
              className={`booking-autocomplete__option${index === highlight ? " is-active" : ""}${
                option.id === value?.id ? " is-selected" : ""
              }`}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(option);
              }}
              onMouseEnter={() => setHighlight(index)}
            >
              <span>{option.name}</span>
              <span className="booking-autocomplete__meta">
                {scheduledIds.includes(option.id) && (
                  <em className="booking-autocomplete__badge">
                    {t("bookingAvailabilityMaintenance.autocomplete.hasSchedule")}
                  </em>
                )}
                {option.code && <small>{option.code}</small>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
