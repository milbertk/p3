# AI Change Log — p3 (AlephK frontend)

Keeps the latest 15 changes made with Claude (oldest are removed). Newest first.

---

## 44. 2026-11-04 — Clock in the top bar: company time + your computer's time

**Backups:** `.ai_backups/2026-11-04_before_header_clock/`.

**Description:** works with shao #32. New `src/Shared/Components/HeaderTools/CompanyClock.jsx` (+ .scss), shown in the
top bar next to the bell (`HeaderTemplate.js`): "Costa Rica · Wed 4 Nov / 11:28 GMT−6" for the selected company (zone
and "Text for customers" from the Company page, read once per company with the existing GET page configuration;
default Costa Rica). When the computer is in another zone, a second part shows "Your computer 18:28 GMT+1". Refreshed
every 15 s; tooltip with both. `PageConfiguration.jsx` sends the event `companyTimeZoneChanged` after saving, so the
clock changes at once. Small screens: only the company time (hidden under 560 px). en/es texts (`header.clock`).
Browser-tested (Costa Rica, Madrid, no configuration, server error, 800 px). AI knowledge: updated in shao and
usersAppAK (no new path, `assistantRoutes.js` not needed).

**Created:** src/Shared/Components/HeaderTools/CompanyClock.jsx, CompanyClock.scss
**Modified:** src/Shared/Components/Templates/HeaderTemplate.js, src/Modules/shao/pageConfiguration/components/PageConfiguration.jsx,
src/Shared/i18n/locales/en.json, es.json

**Revert:** copy the `.bak` files back ("__" = "/") and delete the two created files.

---

## 43. 2026-11-04 — Company page: time zone of the company

**Backups:** `.ai_backups/2026-11-04_before_company_time_zone/`.

**Description:** works with shao #32 (run its migration first). New section **"Time zone"** in the Company page
(`PageConfiguration.jsx` + .scss): list of 47 main zones of the world with their GMT offset, e.g. "(GMT−06:00) Costa
Rica" or "(GMT−05:00 / −04:00 summer) New York"; the saved value is the zone name (summer time is automatic). Default
Costa Rica. Button **"Use my computer's time zone"**, "Now in this zone: 14:05", a summer time note, and the optional
**"Text for customers"** (max 60, e.g. "Hora de Costa Rica"). When the zone changes, a warning says that saved
appointments keep their hours (2 p.m. stays 2 p.m.) and only "now" changes, and reminds to check the text for
customers. New `src/Shared/Utils/timeZones.js` (list + helpers; same file in showcase). `SavePageConfigurationService.js`
sends `timeZone`, `timeZoneLabel`. en/es texts. Browser-tested. AI knowledge: updated in shao and usersAppAK (no new
screen path, `assistantRoutes.js` not needed).

**Created:** src/Shared/Utils/timeZones.js
**Modified:** src/Modules/shao/pageConfiguration/components/PageConfiguration.jsx, PageConfiguration.scss,
src/Modules/shao/pageConfiguration/services/SavePageConfigurationService.js, src/Shared/i18n/locales/en.json, es.json

**Revert:** copy the `.bak` files back ("__" = "/") and delete the created file.

---

## 42. 2026-11-01 — Start page "Showcase link": one store address everywhere

**Backups:** `.ai_backups/2026-11-01_before_showcase_link/`.

**Description:** in the start page "Showcase link" window, the text box, **Copy** and **WhatsApp share** used the
shao preview link (`REACT_APP_API_SHAO` + `/s/<store>`), so they showed the API address (e.g. the old IP). Now they use
the same store address as **Open store** and the **QR code**: `REACT_APP_SHOWCASE_LINK` + `/<store>`
(`ServiceHubStart.jsx`, `shareUrl = showcaseUrl`; unused `buildShareUrl` import removed). The shao `/s/...` page still
exists; WhatsApp will show a simple link instead of the company preview card.

**Modified:** src/Modules/shao/mainShao/components/ServiceHubStart.jsx

**Revert:** copy the `.bak` file back.

---

## 41. 2026-10-31 — Processes: "Notify the customer (email)" per step; Orders: no appointments

**Backups:** `.ai_backups/2026-10-31_before_step_notify/`.

**Description:** works with shao #29. `TrackingMaintenance.jsx` (+ .scss): each step has the checkbox **"Notify the
customer (email)"** (`notifyCustomer`, unchecked by default; loaded and saved with the steps). `OrderMaintenance.jsx`:
the product search hides appointment products (web behavior BOOKING) and a note says appointments are booked in
Appointments. Browser-tested. en/es texts.

**Modified:** src/Modules/shao/tracking/components/TrackingMaintenance.jsx + .scss,
src/Modules/shao/orders/components/OrderMaintenance.jsx, src/Shared/i18n/locales/en.json, es.json

**Revert:** copy the `.bak` files back ("__" = "/").

---

## 40. 2026-10-31 — Product: "This is an appointment" switch; Company page: social link + customer service email

**Backups:** `.ai_backups/2026-10-31_before_company_contact_cs/`.

**Description:** works with shao #28 / showcase #23.
- `ProductMaintenanceForm.jsx`: the "Web behavior" list is replaced by the switch **"This is an appointment
  (booking)"** (BOOKING / MESSENGER_APP). The product contact phone and Messenger link fields are no longer shown
  (saved values are kept and sent unchanged); a note says contact is set in Company page. "Available for web sales"
  help: add to cart and order online.
- `PageConfiguration.jsx` (+ .scss): **Social network link** + **Network** (Facebook / Messenger, Instagram, TikTok,
  Other — icon only) and **Customer service email** (blind copy of every customer email; customers reply to it).
  `SavePageConfigurationService.js` sends `socialLink`, `socialLinkType`, `customerServiceEmail`. en/es texts.

**Modified:** src/Modules/shao/products/components/ProductMaintenanceForm.jsx,
src/Modules/shao/pageConfiguration/components/PageConfiguration.jsx + .scss,
src/Modules/shao/pageConfiguration/services/SavePageConfigurationService.js, src/Shared/i18n/locales/en.json, es.json

**Revert:** copy the `.bak` files back ("__" = "/").

---

## 39. 2026-10-31 — Domains: env examples for aleph-k.com, CompanyService uses globalVar

**Backups:** `.ai_backups/2026-10-31_before_domains/`.

**Description:** works with shao #27 / usersAppAK #13. `env.example.NEW.txt` shows the real names
(`https://auth.aleph-k.com`, `https://api.aleph-k.com`, `https://store.aleph-k.com`) and the rule "call the APIs on the
app's own domain" (`.env.example` cannot be written remotely: copy the lines by hand if you use it). `Companies/Services/CompanyService.js` had its own copy of the users API address; now it imports
`APIUsers` from `Shared/Utils/globalVar.js` like the rest of the app. All API addresses already come from `.env`.

**Modified:** env.example.NEW.txt, src/Modules/Companies/Services/CompanyService.js

**Revert:** copy the `.bak` files back.

---

## 38. 2026-10-30 — Company page: "Email for copies (owner)" with the AlephK general email

**Backups:** `.ai_backups/2026-10-30_before_company_copy/`.

**Description:** works with shao AI_CHANGELOG #26 (company copy of every customer email). When "Use the AlephK general
email" is checked, an "Email for copies (owner)" field appears under it (the SAME notification email field, shown
there for clarity), with help ("never sent to the AlephK account") and a warning when empty. Notification email help
mentions the "[Copy]" emails. en/es.

**Modified:** src/Modules/shao/pageConfiguration/components/PageConfiguration.jsx + .scss,
src/Shared/i18n/locales/en.json, es.json

**Revert:** copy the `.bak` files back.

---

## 37. 2026-10-30 — Orders: new order sent as PLACED (not SCHEDULED)

**Backups:** `.ai_backups/2026-10-30_before_order_status_placed/`.

**Description:** works with shao AI_CHANGELOG #25. OrderMaintenance sent `status: "SCHEDULED"` (an appointment status),
rejected by the database check `ck_order_status_valid`. It now sends `PLACED`, and the label at the top shows
"New order (placed)" / "Pedido nuevo (recibido)" (new key `orderMaintenance.status.placed`; `status.scheduled` stays,
unused). The backend forces PLACED for new orders anyway.

**Modified:** src/Modules/shao/orders/components/OrderMaintenance.jsx, src/Shared/i18n/locales/en.json, es.json

**Revert:** copy the `.bak` files back.

---

## 36. 2026-10-30 — Orders: "New customer" pop-up, better customer search, general tracking hidden

**Backups:** `.ai_backups/2026-10-30_before_order_new_customer/`.

**Description:** on `/shao/orders` (OrderMaintenance):
- The "New customer" button (next to Search customer) did nothing (no onClick). It now opens the customer form in a
  pop-up (react-bootstrap Modal, stacked by modalStacking), with the typed name prefilled; after Save the new customer is
  selected in the order automatically. The pop-up is outside the order `<form>`, so it never saves the order.
- Customer autocomplete: shows "Searching...", "No customers found." and the backend error (e.g. no plan) instead of
  showing nothing; closes on outside click / Esc; Enter picks the first result (it used to submit the order); a
  "Create a new customer" row at the end of the list; typing again also clears the old customer email; up to 8 results.
- "Tracking" panel (general tracking) removed from the screen: tracking is per product now. The order always sends
  `useGeneralTracking=false`, `generalTrackingId=""` (backend saves NULL). Panels renumbered (Details is 3).
- CustomerCreateForm: new optional props `initialValues` and `onSaved(savedCustomer)` (pop-up mode); the customers page
  is unchanged.

**Modified:** src/Modules/shao/orders/components/OrderMaintenance.jsx + .scss,
src/Modules/shao/customers/components/CustomerCreateForm.jsx, src/Shared/i18n/locales/en.json, es.json

**Revert:** copy the `.bak` files back (README lists the paths).

---

## 35. 2026-10-30 — Web orders: demo "Current company" card removed

**Backups:** `.ai_backups/2026-10-30_before_web_orders_company_card/`.

**Description:** `/shao/web-orders` showed a "Current company" card with a hard-coded demo name ("Maderas Finas CR",
constant `CURRENT_COMPANY`) whatever company was selected. The card, the constant and the unused `FaGlobe` import were
removed; the header already shows the real selected company. The web orders themselves always used the selected
company (no change there). The text key `webOrderApproval.company.label` stays (unused).

**Modified:** src/Modules/shao/webaprobal/components/WebOrderApproval.jsx

**Revert:** copy the `.bak` file back.

---

## 34. 2026-10-30 — Company page: "Use the AlephK general email" option

**Backups:** `.ai_backups/2026-10-30_before_default_email_option/`.

**Description:** works with shao AI_CHANGELOG #24. In Company page → communication with customers, new checkbox
"Use the AlephK general email while my company has no email server (SMTP)" with help text: the company's own SMTP is
always used when it exists; without it and without this option, customers receive no emails. Saved with the page
(`useDefaultSmtp`). en/es texts, small styles.

**Modified:** src/Modules/shao/pageConfiguration/components/PageConfiguration.jsx + .scss,
src/Modules/shao/pageConfiguration/services/SavePageConfigurationService.js, src/Shared/i18n/locales/en.json, es.json

**Revert:** copy the `.bak` files back (README lists the paths).

---

## 33. 2026-10-30 — Processes: Delete / Disable / Enable buttons (page and product pop-up)

**Backups:** `.ai_backups/2026-10-30_before_process_delete_disable/`.

**Description:** works with shao AI_CHANGELOG #22. In the process screen (`/shao/order-stages` and the "+" pop-up of the
product form, same component), after opening or saving a process the footer shows its usage ("Used by 2 product(s),
5 order item(s)" / "Not used by any product or order") and:
- **Delete** when it is not used (with a confirmation);
- **Disable** when it is used, **Enable** when it is disabled.
The search lists disabled processes too, with a "Disabled" label. The product form's Process list keeps only active
ones; a product that already uses a disabled process shows "Current process (disabled)" so it is not lost. New
`services/StepTemplateStatusService.js`; `SearchStepTemplatesService` option `includeInactive`. en/es texts.
Browser test with a fake backend: Disable shown for a used process, Delete for an unused one, both work.

**Modified:** src/Modules/shao/tracking/components/TrackingMaintenance.jsx + .scss,
src/Modules/shao/tracking/services/SearchStepTemplatesService.js,
src/Modules/shao/products/components/ProductMaintenanceForm.jsx, src/Shared/i18n/locales/en.json, es.json

**New:** src/Modules/shao/tracking/services/StepTemplateStatusService.js

**Revert:** copy the `.bak` files back (README lists the paths) and delete StepTemplateStatusService.js.

---

## 32. 2026-10-30 — "Create a process": Save shows its message next to the button + missing fields in red

**Backups:** `.ai_backups/2026-10-30_before_process_save_feedback/`.

**Description:** QA: in the product form, "+" next to Process → **Save process** seemed to do nothing. The save works,
but its messages (missing name / internal code / steps, or the server error) were shown only at the top of the window,
out of sight in the pop-up. Now the same message also appears **right above the Save button** and the window scrolls to
it; missing Name / Internal code / step names are outlined in red; the submit no longer bubbles to an outer form; save
errors are written to the browser console. Browser test: empty save → "Please enter a name." visible next to Save, 2
fields in red; server unreachable → error visible next to Save. No backend change.

**Modified:** src/Modules/shao/tracking/components/TrackingMaintenance.jsx, TrackingMaintenance.scss

**Revert:** copy the `.bak` files back (README lists the paths).

---

## 31. 2026-10-29 — Pop-ups on top of pop-ups (quick actions) + "New category" button in the product form

**Backups:** `.ai_backups/2026-10-29_before_nested_popups/`.

**Description:**
- **Bug:** AlephTelos home → Quick actions → Create your product → "+" (create a process) looked frozen. The quick action
  window is a layer with z-index 2000 and Bootstrap modals use 1055, so the new window opened *behind* it while its
  invisible backdrop blocked the page; the only way out was closing the form and losing the work. New
  `src/Shared/Utils/modalStacking.js` (started once in `App.js`) gives every Bootstrap backdrop/modal a growing z-index
  from 2100 in the order they open: the newest window is always on top, the one below is dimmed, and closing it
  returns to the previous one unchanged. Applies to every pop-up in the app (also the product search window).
  Browser test: before = hidden, after = 2nd and 3rd window on top, product data kept.
- Quick action window: a click outside no longer closes it (only the X), so a half-filled form is not lost.
- Product form (pop-up and regular page): new "+" button next to **Category** opens "Create a category" (the category
  maintenance form) on top. After saving, the new category is selected and the window closes. Same for "+" next to
  **Process (tracking)**: the new process is selected and the window closes. Both windows only close with X/Cancel.
  `CategoryMaintenanceForm` and `TrackingMaintenance` accept an optional `onSaved(id)` (nothing changes where it is not
  passed). The error messages of these two inline fields now show (`d-block`). Texts `products.form.addCategory`,
  `products.form.addCategoryTitle` (en/es).

**Modified:** src/App.js, src/Modules/shao/mainShao/components/ServiceHubStart.jsx,
src/Modules/shao/products/components/ProductMaintenanceForm.jsx,
src/Modules/shao/productCategories/components/CategoryMaintenanceForm.jsx,
src/Modules/shao/tracking/components/TrackingMaintenance.jsx, src/Shared/i18n/locales/en.json, es.json

**New:** src/Shared/Utils/modalStacking.js

**Revert:** copy the `.bak` files back (README lists the paths) and delete modalStacking.js.

---

## 30. 2026-10-29 — Basic company: Company page without a plan, "join a plan" messages, plan request needs name/logo/header

**Backups:** `.ai_backups/2026-10-29_before_basic_company/`.

**Description:** works with shao AI_CHANGELOG #20.
- Logo/header upload sends `kind: PAGE_IMAGE` to the storage check (`ensureStorageSpace(companyId, size, kind)`), so a
  company without a plan can set up its basic company. After saving Company page the plan cache is refreshed.
- "No active plan" message (`plans.limits.required`) now says: join a plan to use this option; without a plan you can
  only set up the basic company (name, logo, header) in Company page. The SMTP panel (save and test) uses it.
  Read-only banner text says the same (`plans.readOnly.none`).
- "Your plan" window: when name, logo or header is missing it shows "First create your basic company… Missing: …" with
  a "Go to Company page" button, and hides the request buttons (also after a 409 `BASIC_COMPANY_REQUIRED`).
  New keys `plans.basicCompany.*`, style `.plans-basic-company`.
- Spanish texts added today (`login.verificationSent`, `companyUsersAccess.addUser.noPlan`) now use "usted" like
  the rest of the app.

**Modified:** src/Shared/Services/StorageService.js, src/Modules/shao/pageConfiguration/services/PageConfigurationImageUploadService.js,
src/Modules/shao/pageConfiguration/components/PageConfiguration.jsx, CompanySmtpPanel.jsx,
src/Shared/Components/Plans/PlansModal.jsx, Plans.scss, ReadOnlyBanner.jsx, src/Shared/Utils/planLimitMessage.js,
src/Shared/i18n/locales/en.json, es.json

**Revert:** copy the `.bak` files back (README lists the paths).

---
