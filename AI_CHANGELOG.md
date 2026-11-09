# AI Change Log — p3 (AlephK frontend)

Keeps the latest 15 changes made with Claude (oldest are removed). Newest first.

---

## 51. 2026-11-08 — Location in Booking requests and Appointments

**Backups:** `.ai_backups/2026-11-08_before_appointment_location/`.

**Description:** works with shao #41. Only when "We use locations" is ON:
- New component `AppointmentLocationEditor` (Location list + "Save location"): active locations, plus the current one
  even if disabled; "No location". Save is disabled until something changes. Toasts: saved, saved + customer notified,
  warning when another appointment is at that hour in another location, error.
- Booking requests detail: the editor shows for requests that aren't rejected. A request without a location shows
  "Choose the location before approving" (a warning; approving is still allowed).
- Appointments detail: the editor shows for scheduled appointments; the customer gets an email.
- `LocationsService.setAppointmentLocation()`; en/es texts `locations.appointmentEditor.*`.
Book for a customer already had the location field (unchanged). Browser-tested (en/es): options, warning, save +
PUT, notified toast, error toast, locations OFF = no editor. AI knowledge: updated (shao #41, usersAppAK #24).

**New:** src/Modules/shao/locations/components/AppointmentLocationEditor.jsx + .scss

**Modified:** src/Modules/shao/bookingRequestManagment/components/BookingRequestManagement.jsx,
src/Modules/shao/trackingAppointments/components/AppointmentManagement.jsx,
src/Modules/shao/locations/services/LocationsService.js, src/Shared/i18n/locales/en.json, es.json

**Undo:** restore the `.bak` files from the backup folder and delete the two new files.

---

## 50. 2026-11-08 — Booking schedules: past dates not sent, today selected, preview per location

**Backups:** `.ai_backups/2026-11-08_before_past_dates_preview/`.

**Description:** works with shao #40.
- `Bookingmappers.configurationToBundle(configuration, { today })`: dates before today are not sent (history).
- The calendar opens on today (new schedule) or on the first open date from today on (saved schedule), never on a
  past date; "open dates" counts only today onward; past dates stay greyed with their dot.
- "Generated-space preview": the selected day's spaces in one row per location (name + count), "No location" and
  "Customer chooses" rows too; many rows scroll inside the box. Without locations: one row as before. Singular texts
  "1 space" / "1 open date" (en/es).
Browser-tested (en/es): saved schedule with a past date (opens Nov 9, sends only Nov 9 and 12, saved toast), new
schedule selects today, preview rows, earlier tests (flow, ranges). AI knowledge: updated (shao #40, usersAppAK #23).

**Modified:** src/Modules/shao/bookingMaintenance/components/BookingAvailabilityMaintenance.jsx + .scss,
Bookingmappers.js, src/Shared/i18n/locales/en.json, es.json

**Undo:** restore the `.bak` files from the backup folder.

---

## 49. 2026-11-08 — Booking schedules in steps: service first, one mode, toasts

**Backups:** `.ai_backups/2026-11-08_before_schedule_steps/`.

**Description:** works with shao #39.
- Step 1 "Choose the service" (search icon, highlighted); steps 2 and 3 and the hours stay locked and greyed out
  ("Choose a service first…") until a service is chosen, so no work is lost by choosing the service late. The
  "Create your locations first" box stays usable.
- One mode only: changing the mode of a saved schedule asks first ("Change to …? When you save, the saved hours of …
  are deleted… Appointments already booked are kept."); a note under the two options says what will happen;
  `Bookingmappers.js` sends only the chosen mode's hours.
- Toasts (react-toastify, already in App.js) for saved, could not save, validation problems, location clashes,
  service opened/new and mode changed; the message under Save stays. The database overlap error becomes a clear
  sentence. Old texts "…with mock data" fixed ("The booking schedule was saved."). en/es `steps.*`, `modeSwitch.*`,
  `messages.rangesOverlapSaved`.
Browser-tested (en/es): locked/unlocked, validation toast, saved toast, mode dialog (cancel / confirm), payload only
the chosen mode, database overlap toast, earlier tests (ranges, hint, options).
AI knowledge: updated (shao #39, usersAppAK #22); `assistantRoutes.js` not needed.

**Modified:** src/Modules/shao/bookingMaintenance/components/BookingAvailabilityMaintenance.jsx + .scss,
src/Modules/shao/bookingMaintenance/components/Bookingmappers.js, src/Shared/i18n/locales/en.json, es.json

**Undo:** restore the `.bak` files from the backup folder.

---

## 48. 2026-11-08 — Booking schedules: 1-hour new ranges, overlap rule follows "same time", clear messages, layout

**Backups:** `.ai_backups/2026-11-08_before_places_per_location/`.

**Description:** works with shao #38.
- A new time range (Add time range, or opening a calendar date) lasts one appointment (the appointment duration,
  60 minutes by default) and starts where the last range ends (09:00 for the first). Was 3–4 hours.
- Overlap rule: two ranges of the same day in two DIFFERENT locations may overlap only when "We can attend in more
  than one location at the same time" is ON (each location keeps its own appointments); OFF = refused before saving.
  A "Customer chooses" range never shares hours with another range. `LocationsService.forForms()` now also returns
  `sameTime`.
- Messages say the day/date, the hours and the reason: range too short or ending before it starts, overlap, two
  locations at the same time (with the switch to turn on), "Customer chooses" overlap (en/es `messages.noRanges`,
  `rangeTooShort`, `overlap`, `overlapPlaces`, `overlapChoice`).
- Layout: with a Location, each range uses two lines (From · To · Appointments · delete, then Location); one field
  per line on phones; nothing overflows. Appointments placeholder "General (N)".
Browser-tested (en/es): new ranges, the 4 messages, same time ON/OFF, calendar and weekly, phone width, earlier tests.
AI knowledge: updated (shao #38, usersAppAK #21); `assistantRoutes.js` not needed.

**Modified:** src/Modules/shao/bookingMaintenance/components/BookingAvailabilityMaintenance.jsx + .scss,
src/Modules/shao/locations/services/LocationsService.js, src/Shared/i18n/locales/en.json, es.json

**Undo:** restore the `.bak` files from the backup folder.

---

## 47. 2026-11-08 — Booking schedules: "Create your locations first" box with "Go to Locations"

**Backups:** `.ai_backups/2026-11-08_before_locations_hint/`.

**Description:** works with shao #37 and usersAppAK #20 (AI knowledge only). In Booking schedules, under General
information, a blue box explains that the Location field needs "We use locations" ON and at least one active
location, with the button **Go to Locations** (`/shao/locations`) and a close button (×, remembered in this browser:
localStorage `alephk.bookingSchedules.locationsHintClosed`). Texts: locations OFF → "Do you attend in more than one
place? First turn on…"; ON without an active location → "Locations is on, but you have no active location…"; ON
with an active location → no box. en/es `bookingAvailabilityMaintenance.locationsHint.*`. No backend or database
change. Browser-tested (en/es, the 4 cases, Go button, close, phone width).
AI knowledge: updated (shao #37, usersAppAK #20); `assistantRoutes.js` not needed.

**Modified:** src/Modules/shao/bookingMaintenance/components/BookingAvailabilityMaintenance.jsx + .scss,
src/Shared/i18n/locales/en.json, es.json

**Undo:** restore the `.bak` files from the backup folder.

---

## 46. 2026-11-08 — "We use locations" switch + "Customer chooses (any active location)"

**Backups:** `.ai_backups/2026-11-08_before_locations_options/`.

**Description:** works with shao #35 (run its migration first; publish shao, p3 and the store together).
- Locations: new main switch **"We use locations"** at the top (OFF = AlephK works without locations; the locations
  stay saved and can be prepared). "We can attend in more than one location at the same time" is available only
  when it is ON. Turning it ON while hours clash shows the list (same as the "same time" switch).
- Booking schedules: the Location field shows only when locations are ON; new option **"Customer chooses (any active
  location)"** with a short hint (stored as `customerChoosesLocation: true`, `locationId: null`; `Bookingmappers.js`
  maps it to the field value `CUSTOMER_CHOOSES`). Such a block can not overlap another block of the same day; two
  blocks in different fixed locations may overlap only when locations are ON. Hidden values are kept on save.
- Book for a customer, Appointments, Booking requests: no location field / text when OFF (the saved location of a
  loaded appointment is still sent back). Clash sentences say "the location the customer chooses".
- `LocationsService`: settings `{ locationsEnabled, locationsSameTime }`, `saveSettings` sends only the fields given,
  new `forForms()` (switch + list for the forms). en/es texts. Browser-tested (en/es): switch off/on/refused,
  schedules option + overlap + payload, the three screens with locations off, and yesterday's tests.
  AI knowledge: updated (shao #35, usersAppAK #19); `assistantRoutes.js` not needed (no new screen).

**Modified:** src/Modules/shao/locations/ (components/LocationsMaintenance.jsx + .scss, services/LocationsService.js,
services/locationUtils.js), src/Modules/shao/bookingMaintenance/components/ (BookingAvailabilityMaintenance.jsx +
.scss, Bookingmappers.js), src/Modules/shao/bookingSelfReservation/components/BookingReservationForm.jsx,
src/Modules/shao/trackingAppointments/components/AppointmentManagement.jsx,
src/Modules/shao/bookingRequestManagment/components/BookingRequestManagement.jsx,
src/Shared/i18n/locales/en.json, src/Shared/i18n/locales/es.json

**Undo:** restore the `.bak` files from the backup folder.

---

## 45. 2026-11-07 — Locations ("Sedes") screen + location on hours and appointments

**Backups:** `.ai_backups/2026-11-07_before_company_locations/`.

**Description:** works with shao #34 (run its migration first; publish shao, p3 and the store together).
- New screen **Locations** `/shao/locations` (menu Bookings, permission `NAV_LOCATIONS_ACCESS`; users with "Booking
  schedules" also see it): list with usage ("3 blocks of hours · 2 upcoming appointments"), form (name, address,
  details), map point by **"Use my current location"** (browser GPS; only https or localhost) or **pasting a Google
  Maps link** (reads `@lat,lng`, `!3d!4d`, `?q=`, `query=`, `geo:` or plain coordinates; short `maps.app.goo.gl`
  links are explained), latitude/longitude, **"Open in Maps"**. Disable (warning with future appointments), enable,
  delete (a used one is disabled). Company switch **"We can attend in more than one location at the same time"**;
  turning it off shows the clashing hours when refused.
- Booking schedules: a **Location** field on each block of hours (weekly and dates; all-day dates too) when the
  company has locations; overlapping blocks are allowed only in different locations; a 409 shows the list
  ("Monday 10:00–12:00 is already in Heredia (Consulta)").
- Book for a customer: **Location** field, sent on save and on cancel (keeps it); new warning "already N appointments
  in another location". Appointments and Booking requests show the location (+ Open in Maps in the details).
- Team and permissions: new item "Locations". AI assistant link `/shao/locations` (`assistantRoutes.js`).
- en/es texts (`locations.*` and a few keys in booking / appointment screens). Browser-tested (en/es, 390 px).
  AI knowledge: updated (shao #34, usersAppAK #18).

**Created:** src/Modules/shao/locations/ (components/LocationsMaintenance.jsx + .scss, pages/LocationsShaoPage.jsx,
services/LocationsService.js, services/locationUtils.js)
**Modified:** src/Shared/routing/routing.js, src/Modules/shao/mainShao/templates/maintemplateShao.js,
src/Modules/shao/CompanyUsersAccess/components/CompanyUsersAccess.jsx, src/Shared/Components/HeaderTools/assistantRoutes.js,
src/Modules/shao/bookingMaintenance/components/BookingAvailabilityMaintenance.jsx (+ .scss), Bookingmappers.js,
src/Modules/shao/bookingSelfReservation/components/BookingReservationForm.jsx,
src/Modules/shao/trackingAppointments/components/AppointmentManagement.jsx (+ .scss),
src/Modules/shao/bookingRequestManagment/components/BookingRequestManagement.jsx (+ .scss),
src/Shared/i18n/locales/en.json, es.json

**Revert:** copy the `.bak` files back ("__" = "/") and delete the `locations` module folder.

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
