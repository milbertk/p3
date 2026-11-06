import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCalendarCheck,
  FaCartPlus,
  FaCheck,
  FaChevronDown,
  FaCircleUser,
  FaEnvelope,
  FaFacebookMessenger,
  FaLocationDot,
  FaMagnifyingGlass,
  FaMinus,
  FaPhone,
  FaPlus,
  FaRightToBracket,
  FaCartShopping,
  FaStore,
  FaTrash,
  FaUser,
  FaWhatsapp,
  FaXmark,
} from "react-icons/fa6";
import "./CompanyShowcase.scss";
import ShowcaseService from "../services/ShowcaseService";
import { mapShowcaseItems } from "./showcaseMappers";

const showcaseService = new ShowcaseService();

export const DEFAULT_COMPANY_SLUG = "maderas-finas-cr";
export const COMPANY_SHOWCASE_ROUTE = "/showcase/:companySlug";

// Replace these companies with a public company-profile service.
const MOCK_COMPANIES = [
  {
    id: "company-001",
    slug: "maderas-finas-cr",
    name: "Maderas Finas CR",
    shortDescription: "Handcrafted in Costa Rica",
    description: "Sustainable woods. Timeless craftsmanship.",
    brandColor: "#3459e6",
    accentColor: "#8a5a30",
    whatsappNumber: "50688887777",
    messengerHandle: "maderasfinascr",
    currency: "USD",
  },
  {
    id: "company-002",
    slug: "servicios-auto-cr",
    name: "Servicios Auto CR",
    shortDescription: "Automotive care you can trust",
    description: "Diagnostics, maintenance, and scheduled technical services.",
    brandColor: "#176b87",
    accentColor: "#e28a32",
    whatsappNumber: "50687776666",
    messengerHandle: "serviciosautocr",
    currency: "USD",
  },
];

// Replace this collection with a public product-search service.
const MOCK_PRODUCTS = [
  {
    id: "prd-001",
    companyId: "company-001",
    code: "WCB-3040",
    name: "Walnut Cutting Board",
    category: "Cutting boards",
    description: "Premium walnut with a smooth finish, designed for everyday use.",
    price: 75,
    image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "prd-002",
    companyId: "company-001",
    code: "TMB-4050",
    name: "Teak and Maple End Grain Board",
    category: "Cutting boards",
    description: "End-grain construction with natural contrast and lasting durability.",
    price: 85,
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "prd-003",
    companyId: "company-001",
    code: "LES-3555",
    name: "Engraved Live Edge Serving Board",
    category: "Personalized products",
    description: "A live-edge serving board personalized with your name or company logo.",
    price: 90,
    image: "https://images.unsplash.com/photo-1601058268499-e52658b8bb88?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "prd-004",
    companyId: "company-001",
    code: "GCB-3050",
    name: "Guanacaste Cutting Board",
    category: "Cutting boards",
    description: "Strong native wood with a unique natural grain in every piece.",
    price: 65,
    image: "https://images.unsplash.com/photo-1584302179602-e4c3d3fd629d?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "prd-005",
    companyId: "company-001",
    code: "HWS-8018",
    name: "Handmade Wall Shelf",
    category: "Home furniture",
    description: "A compact solid-wood shelf with a warm finish and hidden supports.",
    price: 95,
    image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "svc-001",
    companyId: "company-001",
    code: "ENG-CUSTOM",
    name: "Custom Engraving Service",
    category: "Services",
    description: "Personalize wood pieces with names, logos, dates, or special designs.",
    price: null,
    image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: true,
  },
  {
    id: "prd-006",
    companyId: "company-001",
    code: "RST-4520",
    name: "Rustic Serving Tray",
    category: "Serving pieces",
    description: "A practical wooden tray with forged handles and a protective finish.",
    price: 55,
    image: "https://images.unsplash.com/photo-1603899122634-f086ca5f5ddd?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "prd-007",
    companyId: "company-001",
    code: "CHB-5030",
    name: "Charcuterie Board",
    category: "Serving pieces",
    description: "An elegant board for cheese, fruit, appetizers, and special occasions.",
    price: 78,
    image: "https://images.unsplash.com/photo-1598301257982-0cf014dabbcd?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "prd-008",
    companyId: "company-001",
    code: "DSK-11055",
    name: "Compact Writing Desk",
    category: "Home furniture",
    description: "A clean, compact solid-wood desk made for home offices and studios.",
    price: 260,
    image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "prd-009",
    companyId: "company-001",
    code: "SGN-6040",
    name: "Personalized Wooden Sign",
    category: "Personalized products",
    description: "Custom carved signage for homes, offices, restaurants, and events.",
    price: 70,
    image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "prd-010",
    companyId: "company-001",
    code: "KNF-4530",
    name: "Magnetic Knife Holder",
    category: "Kitchen accessories",
    description: "A wall-mounted solid-wood holder with concealed high-strength magnets.",
    price: 48,
    image: "https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "prd-011",
    companyId: "company-001",
    code: "SRV-SET4",
    name: "Four-Piece Serving Set",
    category: "Serving pieces",
    description: "A coordinated handmade set for family gatherings and celebrations.",
    price: 110,
    image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: true,
    allowsBooking: false,
  },
  {
    id: "svc-002",
    companyId: "company-001",
    code: "RESTORE-01",
    name: "Wood Restoration Assessment",
    category: "Services",
    description: "Book an evaluation for furniture repairs, refinishing, or restoration.",
    price: null,
    image: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: false,
    allowsBooking: true,
  },
  {
    id: "svc-003",
    companyId: "company-001",
    code: "CONSULT-01",
    name: "Custom Furniture Consultation",
    category: "Services",
    description: "Discuss measurements, materials, design options, and delivery expectations.",
    price: null,
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: false,
    allowsBooking: true,
  },
  {
    id: "auto-001",
    companyId: "company-002",
    code: "DIAG-01",
    name: "Vehicle Diagnostic",
    category: "Diagnostics",
    description: "Initial inspection and computerized diagnostic for your vehicle.",
    price: 45,
    image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: false,
    allowsBooking: true,
  },
  {
    id: "auto-002",
    companyId: "company-002",
    code: "OIL-01",
    name: "Oil Change Service",
    category: "Maintenance",
    description: "Scheduled oil and filter replacement with a basic safety inspection.",
    price: 65,
    image: "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=900&q=82",
    allowsOnlineOrder: false,
    allowsBooking: true,
  },
];

const PRODUCTS_PER_PAGE = 10;

const EMPTY_GUEST_FORM = {
  name: "",
  phone: "",
  email: "",
  address: "",
  preferredContact: "whatsapp",
  notes: "",
};

const EMPTY_ACCOUNT_FORM = {
  email: "",
  password: "",
};

const EMPTY_BOOKING_FORM = {
  name: "",
  phone: "",
  email: "",
  preferredDate: "",     // "YYYY-MM-DD"
  preferredTime: "",     // slot start "HH:MM"
  preferredTimeEnd: "",  // slot end "HH:MM"
  notes: "",
};

const buildReference = (prefix) =>
  `${prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

// ---------------------------------------------------------------------------
// Availability helpers + MOCK service
// ---------------------------------------------------------------------------
// Swap `fetchMonthAvailability` for your real API later. Keep the return shape:
// an object keyed by "YYYY-MM-DD" whose values are arrays of time slots
// `{ start: "HH:MM", end: "HH:MM" }` (24h). A missing key (or empty array)
// means "no availability that day". Slot length is implicit in each slot, so
// you can mix 30-min and 1-hour slots per product without any UI change.

const pad2 = (value) => String(value).padStart(2, "0");

const toISODate = (year, month, day) => `${year}-${pad2(month + 1)}-${pad2(day)}`;

const hashString = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

// Deterministic pseudo-random so the same day always yields the same slots.
const seededRandom = (seed) => {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
};

const hourlySlots = (startHour, endHour) => {
  const slots = [];
  for (let hour = startHour; hour < endHour; hour += 1) {
    slots.push({ start: `${pad2(hour)}:00`, end: `${pad2(hour + 1)}:00` });
  }
  return slots;
};

async function fetchMonthAvailability({ companyId, productId, year, month }) {
  // Simulate a network round-trip. Replace the body with a real fetch().
  await new Promise((resolve) => setTimeout(resolve, 350));

  const availability = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const base = hashString(`${companyId}:${productId}`);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);

    if (date < today) continue;            // past days: nothing bookable
    if (date.getDay() === 0) continue;     // Sundays closed

    const profile = Math.floor(
      seededRandom(base + year * 372 + (month + 1) * 31 + day) * 5,
    );

    let slots = [];
    if (profile === 0) {
      slots = hourlySlots(8, 17);          // full day
    } else if (profile === 1) {
      slots = hourlySlots(8, 12);          // mornings only
    } else if (profile === 2) {
      slots = hourlySlots(13, 17);         // afternoons only
    } else if (profile === 3) {
      slots = [                            // sparse / specific times
        { start: "09:00", end: "10:00" },
        { start: "11:00", end: "12:00" },
        { start: "14:00", end: "15:00" },
      ];
    } else {
      slots = [];                          // fully booked / no availability
    }

    if (slots.length) {
      availability[toISODate(year, month, day)] = slots;
    }
  }

  return availability;
}

export default function CompanyShowcase({ t, locale = "en-US" }) {
  const { companySlug } = useParams();

  const normalizedCompanySlug = (
    companySlug || DEFAULT_COMPANY_SLUG
  )
    .trim()
    .toLowerCase();

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [contactProductId, setContactProductId] = useState(null);
  const [checkoutMode, setCheckoutMode] = useState(null);
  const [guestForm, setGuestForm] = useState(EMPTY_GUEST_FORM);
  const [accountForm, setAccountForm] = useState(EMPTY_ACCOUNT_FORM);
  const [bookingProductId, setBookingProductId] = useState(null);
  const [bookingForm, setBookingForm] = useState(EMPTY_BOOKING_FORM);
  const [notice, setNotice] = useState("");

  // Real showcase products loaded from the public backend.
  const [remoteProducts, setRemoteProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Booking scheduler state.
  const [calendar, setCalendar] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [monthAvailability, setMonthAvailability] = useState({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Try to match a known (mock) company for branding; otherwise fall back to a
  // generic company built from the route id so the public page still renders.
  // A dedicated public "company info" endpoint can replace this fallback later.
  const matchedCompany =
    MOCK_COMPANIES.find(
      (item) => item.slug.toLowerCase() === normalizedCompanySlug,
    ) || null;

  const company =
    matchedCompany ||
    ((companySlug || "").trim()
      ? {
          id: (companySlug || "").trim(),
          slug: (companySlug || "").trim(),
          name: "Showcase",
          shortDescription: "",
          description: "",
          brandColor: "#3459e6",
          accentColor: "#8a5a30",
          whatsappNumber: "",
          messengerHandle: "",
          currency: "USD",
        }
      : null);

  // The route param carries the companyId (the public link is {base}/{companyId}).
  const routeCompanyId = (companySlug || "").trim();

  // Load the real public products for this company.
  useEffect(() => {
    if (!routeCompanyId) {
      setRemoteProducts([]);
      return undefined;
    }

    let active = true;
    setLoadingProducts(true);
    setLoadError("");

    showcaseService
      .getShowcaseItems({ companyId: routeCompanyId })
      .then((items) => {
        if (!active) return;
        setRemoteProducts(mapShowcaseItems(items, routeCompanyId));
      })
      .catch((error) => {
        if (!active) return;
        console.error("Error loading showcase:", error);
        setRemoteProducts([]);
        setLoadError(
          error?.message || "The showcase could not be loaded. Please try again.",
        );
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });

    return () => {
      active = false;
    };
  }, [routeCompanyId]);

  const companyProducts = useMemo(
    () => remoteProducts,
    [remoteProducts],
  );

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return companyProducts;

    return companyProducts.filter((product) =>
      `${product.name} ${product.description} ${product.code}`
        .toLowerCase()
        .includes(term),
    );
  }, [companyProducts, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const firstResult = (safePage - 1) * PRODUCTS_PER_PAGE;
  const visibleProducts = filteredProducts.slice(
    firstResult,
    firstResult + PRODUCTS_PER_PAGE,
  );

  const cartItems = useMemo(
    () =>
      cart
        .map((line) => ({
          ...line,
          product: companyProducts.find((product) => product.id === line.productId),
        }))
        .filter((line) => line.product),
    [cart, companyProducts],
  );

  const cartQuantity = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (total, item) => total + (item.product.price || 0) * item.quantity,
    0,
  );

  const bookingProduct =
    companyProducts.find((product) => product.id === bookingProductId) || null;

  // Load availability whenever the booking dialog is open and the month changes.
  useEffect(() => {
    if (!bookingProductId || !company) return undefined;

    let active = true;
    setLoadingAvailability(true);

    fetchMonthAvailability({
      companyId: company.id,
      productId: bookingProductId,
      year: calendar.year,
      month: calendar.month,
    })
      .then((data) => {
        if (active) setMonthAvailability(data);
      })
      .catch(() => {
        if (active) setMonthAvailability({});
      })
      .finally(() => {
        if (active) setLoadingAvailability(false);
      });

    return () => {
      active = false;
    };
  }, [bookingProductId, company, calendar.year, calendar.month]);

  const formatPrice = (price) => {
    if (price === null || price === undefined) {
      return t("companyShowcase.product.customQuote");
    }

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: company?.currency || "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatTime = (value) => {
    const [hour, minute] = value.split(":").map(Number);
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  // Calendar derived values.
  const weekdayLabels = useMemo(() => {
    const sunday = new Date(2023, 0, 1); // a Sunday
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + index);
      return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(day);
    });
  }, [locale]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
        new Date(calendar.year, calendar.month, 1),
      ),
    [locale, calendar],
  );

  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(calendar.year, calendar.month, 1).getDay();
    const daysInMonth = new Date(calendar.year, calendar.month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    return cells;
  }, [calendar]);

  const today = new Date();
  const isCurrentMonth =
    calendar.year === today.getFullYear() && calendar.month === today.getMonth();
  const todayKey = toISODate(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const selectedDaySlots = bookingForm.preferredDate
    ? monthAvailability[bookingForm.preferredDate] || []
    : [];

  const selectedDateLabel = bookingForm.preferredDate
    ? new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date(`${bookingForm.preferredDate}T00:00:00`))
    : "";

  const clearBookingSelection = () =>
    setBookingForm((current) => ({
      ...current,
      preferredDate: "",
      preferredTime: "",
      preferredTimeEnd: "",
    }));

  const goToPrevMonth = () => {
    clearBookingSelection();
    setCalendar(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
    );
  };

  const goToNextMonth = () => {
    clearBookingSelection();
    setCalendar(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
    );
  };

  const handleSelectDay = (day) => {
    if (!day) return;
    const key = toISODate(calendar.year, calendar.month, day);
    if (!monthAvailability[key]?.length) return;
    setBookingForm((current) => ({
      ...current,
      preferredDate: key,
      preferredTime: "",
      preferredTimeEnd: "",
    }));
  };

  const handleSelectSlot = (slot) => {
    setBookingForm((current) => ({
      ...current,
      preferredTime: slot.start,
      preferredTimeEnd: slot.end,
    }));
  };

  const updateSearch = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
    setContactProductId(null);
  };

  const addToCart = (product) => {
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) {
        return current.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [...current, { productId: product.id, quantity: 1 }];
    });
    setNotice(
      t("companyShowcase.messages.addedToCart", { product: product.name }),
    );
    setContactProductId(null);
  };

  const changeQuantity = (productId, amount) => {
    setCart((current) =>
      current
        .map((line) =>
          line.productId === productId
            ? { ...line, quantity: Math.max(0, line.quantity + amount) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  };

  const removeFromCart = (productId) => {
    setCart((current) =>
      current.filter((line) => line.productId !== productId),
    );
  };

  const openCart = () => {
    setShowCart(true);
    setCheckoutMode(null);
    setContactProductId(null);
    setNotice("");
  };

  const closeCart = () => {
    setShowCart(false);
    setCheckoutMode(null);
  };

  const openGuestCheckout = () => {
    setGuestForm(EMPTY_GUEST_FORM);
    setCheckoutMode("guest");
  };

  const openAccountCheckout = () => {
    setAccountForm(EMPTY_ACCOUNT_FORM);
    setCheckoutMode("account");
  };

  const finishOrder = (customerType, customerName) => {
    const reference = buildReference("ORD");
    setCart([]);
    setShowCart(false);
    setCheckoutMode(null);
    setNotice(
      t("companyShowcase.messages.orderCreated", {
        reference,
        name: customerName,
        customerType,
      }),
    );
  };

  const submitGuestOrder = (event) => {
    event.preventDefault();
    finishOrder(
      t("companyShowcase.checkout.guestType"),
      guestForm.name.trim(),
    );
  };

  const submitAccountOrder = (event) => {
    event.preventDefault();
    const mockName = accountForm.email.split("@")[0] || t("companyShowcase.checkout.member");
    finishOrder(t("companyShowcase.checkout.memberType"), mockName);
  };

  const openBooking = (product) => {
    const now = new Date();
    setBookingProductId(product.id);
    setBookingForm(EMPTY_BOOKING_FORM);
    setCalendar({ year: now.getFullYear(), month: now.getMonth() });
    setMonthAvailability({});
    setContactProductId(null);
    setNotice("");
  };

  const closeBooking = () => {
    setBookingProductId(null);
    setBookingForm(EMPTY_BOOKING_FORM);
  };

  const submitBooking = (event) => {
    event.preventDefault();
    if (!bookingForm.preferredDate || !bookingForm.preferredTime) return;

    const reference = buildReference("BKG");
    setNotice(
      t("companyShowcase.messages.bookingCreated", {
        reference,
        service: bookingProduct.name,
      }),
    );
    closeBooking();
  };

  const updateGuestForm = (event) => {
    const { name, value } = event.target;
    setGuestForm((current) => ({ ...current, [name]: value }));
  };

  const updateAccountForm = (event) => {
    const { name, value } = event.target;
    setAccountForm((current) => ({ ...current, [name]: value }));
  };

  const updateBookingForm = (event) => {
    const { name, value } = event.target;
    setBookingForm((current) => ({ ...current, [name]: value }));
  };

  const whatsappUrl = (product) => {
    const message = t("companyShowcase.contact.whatsappMessage", {
      company: company.name,
      product: product.name,
      code: product.code,
    });
    return `https://wa.me/${company.whatsappNumber}?text=${encodeURIComponent(message)}`;
  };

  const messengerUrl = (product) =>
    `https://m.me/${company.messengerHandle}?ref=${encodeURIComponent(product.code)}`;

  if (!company) {
    return (
      <main className="company-showcase company-showcase--not-found">
        <FaStore />
        <h1>{t("companyShowcase.notFound.title")}</h1>
        <p>
          {t("companyShowcase.notFound.description", {
            slug: normalizedCompanySlug,
          })}
        </p>
      </main>
    );
  }

  return (
    <main
      className="company-showcase"
      style={{
        "--showcase-brand": company.brandColor,
        "--showcase-accent": company.accentColor,
      }}
    >
      <header className="showcase-header">
        <a className="showcase-brand" href={`/showcase/${company.slug}`}>
          <span><FaStore /></span>
          <div>
            <strong>{company.name}</strong>
            <small>{t("companyShowcase.publicStore")}</small>
          </div>
        </a>

        <label className="showcase-search">
          <FaMagnifyingGlass />
          <input
            value={searchTerm}
            onChange={updateSearch}
            placeholder={t("companyShowcase.search.placeholder")}
            aria-label={t("companyShowcase.search.label")}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              aria-label={t("companyShowcase.search.clear")}
            >
              <FaXmark />
            </button>
          )}
        </label>

        <button
          type="button"
          className="showcase-cart-button"
          onClick={openCart}
          aria-label={t("companyShowcase.cart.open")}
        >
          <FaCartShopping />
          {cartQuantity > 0 && <span>{cartQuantity}</span>}
        </button>
      </header>

      <div className="showcase-body">
        <section className="showcase-company-banner">
          <span><FaCheck /></span>
          <div>
            <h1>{company.shortDescription}</h1>
            <p>{company.description}</p>
          </div>
          <small>{t("companyShowcase.companyLink", { slug: company.slug })}</small>
        </section>

        {notice && (
          <div className="showcase-notice" role="status">
            <FaCheck />
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label={t("companyShowcase.actions.close")}
            >
              <FaXmark />
            </button>
          </div>
        )}

        <section className="showcase-results">
          <div className="showcase-results__heading">
            <div>
              <h2>{t("companyShowcase.products.title")}</h2>
              <p>
                {t("companyShowcase.products.resultCount", {
                  count: filteredProducts.length,
                })}
              </p>
            </div>
            {searchTerm && (
              <span>
                {t("companyShowcase.products.searchingFor", {
                  search: searchTerm,
                })}
              </span>
            )}
          </div>

          <div className="product-grid">
            {visibleProducts.map((product) => (
              <article className="showcase-product-card" key={product.id}>
                <div className="showcase-product-card__image">
                  <img src={product.image} alt={product.name} />
                  <span>{product.category}</span>
                  {product.allowsBooking && (
                    <em>
                      <FaCalendarCheck />
                      {t("companyShowcase.product.bookingAvailable")}
                    </em>
                  )}
                </div>

                <div className="showcase-product-card__content">
                  <div>
                    <small>{product.code}</small>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                  </div>
                  <strong className="showcase-product-card__price">
                    {formatPrice(product.price)}
                  </strong>
                </div>

                <div className="showcase-product-card__actions">
                  {product.allowsOnlineOrder && (
                    <button
                      type="button"
                      className="showcase-button showcase-button--primary"
                      onClick={() => addToCart(product)}
                    >
                      <FaCartPlus />
                      {t("companyShowcase.actions.orderHere")}
                    </button>
                  )}

                  <div className="contact-action">
                    <button
                      type="button"
                      className="showcase-button showcase-button--secondary"
                      onClick={() =>
                        setContactProductId((current) =>
                          current === product.id ? null : product.id,
                        )
                      }
                      aria-expanded={contactProductId === product.id}
                    >
                      {t("companyShowcase.actions.contactUs")}
                      <FaChevronDown />
                    </button>

                    {contactProductId === product.id && (
                      <div className="contact-menu">
                        <a href={whatsappUrl(product)} target="_blank" rel="noreferrer">
                          <FaWhatsapp />
                          <span>
                            <strong>WhatsApp</strong>
                            <small>{t("companyShowcase.contact.externalChannel")}</small>
                          </span>
                        </a>
                        <a href={messengerUrl(product)} target="_blank" rel="noreferrer">
                          <FaFacebookMessenger />
                          <span>
                            <strong>Messenger</strong>
                            <small>{t("companyShowcase.contact.externalChannel")}</small>
                          </span>
                        </a>
                      </div>
                    )}
                  </div>

                  {product.allowsBooking && (
                    <button
                      type="button"
                      className="showcase-button showcase-button--booking"
                      onClick={() => openBooking(product)}
                    >
                      <FaCalendarCheck />
                      {t("companyShowcase.actions.bookNow")}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          {!visibleProducts.length && (
            <div className="showcase-empty">
              <FaMagnifyingGlass />
              <h3>{t("companyShowcase.products.emptyTitle")}</h3>
              <p>{t("companyShowcase.products.emptyDescription")}</p>
            </div>
          )}

          {filteredProducts.length > 0 && (
            <nav className="showcase-pagination" aria-label={t("companyShowcase.pagination.label")}>
              <p>
                {t("companyShowcase.pagination.summary", {
                  start: firstResult + 1,
                  end: Math.min(
                    firstResult + PRODUCTS_PER_PAGE,
                    filteredProducts.length,
                  ),
                  total: filteredProducts.length,
                })}
              </p>

              <div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safePage === 1}
                  aria-label={t("companyShowcase.pagination.previous")}
                >
                  <FaArrowLeft />
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                  (page) => (
                    <button
                      type="button"
                      key={page}
                      className={page === safePage ? "is-active" : ""}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={safePage === totalPages}
                  aria-label={t("companyShowcase.pagination.next")}
                >
                  <FaArrowRight />
                </button>
              </div>
            </nav>
          )}
        </section>
      </div>

      {showCart && (
        <div className="showcase-overlay" role="dialog" aria-modal="true" aria-labelledby="cart-title">
          <button type="button" className="showcase-overlay__backdrop" onClick={closeCart} aria-label={t("companyShowcase.actions.close")} />
          <aside className="showcase-cart">
            <header>
              <div>
                <span><FaCartShopping /></span>
                <div>
                  <h2 id="cart-title">{t("companyShowcase.cart.title")}</h2>
                  <p>{t("companyShowcase.cart.itemCount", { count: cartQuantity })}</p>
                </div>
              </div>
              <button type="button" onClick={closeCart} aria-label={t("companyShowcase.actions.close")}>
                <FaXmark />
              </button>
            </header>

            <div className="showcase-cart__body">
              {!cartItems.length && (
                <div className="showcase-cart__empty">
                  <FaCartShopping />
                  <h3>{t("companyShowcase.cart.emptyTitle")}</h3>
                  <p>{t("companyShowcase.cart.emptyDescription")}</p>
                </div>
              )}

              {cartItems.length > 0 && checkoutMode === null && (
                <>
                  <div className="cart-lines">
                    {cartItems.map(({ product, quantity }) => (
                      <article key={product.id}>
                        <img src={product.image} alt="" />
                        <div>
                          <strong>{product.name}</strong>
                          <small>{product.code}</small>
                          <span>{formatPrice(product.price)}</span>
                        </div>
                        <div className="quantity-control">
                          <button type="button" onClick={() => changeQuantity(product.id, -1)}><FaMinus /></button>
                          <span>{quantity}</span>
                          <button type="button" onClick={() => changeQuantity(product.id, 1)}><FaPlus /></button>
                        </div>
                        <button
                          type="button"
                          className="cart-line__remove"
                          onClick={() => removeFromCart(product.id)}
                          aria-label={t("companyShowcase.cart.remove", { product: product.name })}
                        >
                          <FaTrash />
                        </button>
                      </article>
                    ))}
                  </div>

                  <section className="checkout-choice">
                    <div className="cart-total">
                      <span>{t("companyShowcase.cart.subtotal")}</span>
                      <strong>{formatPrice(cartTotal)}</strong>
                    </div>
                    <p>{t("companyShowcase.cart.checkoutDescription")}</p>

                    <button
                      type="button"
                      className="showcase-button showcase-button--primary"
                      onClick={openAccountCheckout}
                    >
                      <FaRightToBracket />
                      {t("companyShowcase.checkout.signIn")}
                    </button>
                    <button
                      type="button"
                      className="showcase-button showcase-button--secondary"
                      onClick={openGuestCheckout}
                    >
                      <FaCircleUser />
                      {t("companyShowcase.checkout.continueAsGuest")}
                    </button>
                  </section>
                </>
              )}

              {checkoutMode === "guest" && (
                <form className="showcase-form" onSubmit={submitGuestOrder}>
                  <div className="showcase-form__heading">
                    <button type="button" onClick={() => setCheckoutMode(null)}><FaArrowLeft /></button>
                    <div>
                      <h3>{t("companyShowcase.checkout.guestTitle")}</h3>
                      <p>{t("companyShowcase.checkout.guestDescription")}</p>
                    </div>
                  </div>

                  <label>
                    <span>{t("companyShowcase.form.name")}</span>
                    <div className="showcase-field"><FaUser /><input name="name" value={guestForm.name} onChange={updateGuestForm} required /></div>
                  </label>
                  <label>
                    <span>{t("companyShowcase.form.phone")}</span>
                    <div className="showcase-field"><FaPhone /><input name="phone" value={guestForm.phone} onChange={updateGuestForm} required /></div>
                  </label>
                  <label>
                    <span>{t("companyShowcase.form.email")}</span>
                    <div className="showcase-field"><FaEnvelope /><input type="email" name="email" value={guestForm.email} onChange={updateGuestForm} required /></div>
                  </label>
                  <label>
                    <span>{t("companyShowcase.form.address")}</span>
                    <div className="showcase-field"><FaLocationDot /><input name="address" value={guestForm.address} onChange={updateGuestForm} required /></div>
                  </label>
                  <label>
                    <span>{t("companyShowcase.form.preferredContact")}</span>
                    <select name="preferredContact" value={guestForm.preferredContact} onChange={updateGuestForm}>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="messenger">Messenger</option>
                      <option value="email">{t("companyShowcase.form.emailOption")}</option>
                      <option value="phone">{t("companyShowcase.form.phoneOption")}</option>
                    </select>
                  </label>
                  <label>
                    <span>{t("companyShowcase.form.notes")}</span>
                    <textarea name="notes" rows="3" value={guestForm.notes} onChange={updateGuestForm} placeholder={t("companyShowcase.form.notesPlaceholder")} />
                  </label>
                  <button type="submit" className="showcase-button showcase-button--primary">
                    <FaCheck />
                    {t("companyShowcase.checkout.submitGuestOrder")}
                  </button>
                </form>
              )}

              {checkoutMode === "account" && (
                <form className="showcase-form" onSubmit={submitAccountOrder}>
                  <div className="showcase-form__heading">
                    <button type="button" onClick={() => setCheckoutMode(null)}><FaArrowLeft /></button>
                    <div>
                      <h3>{t("companyShowcase.checkout.accountTitle")}</h3>
                      <p>{t("companyShowcase.checkout.accountDescription")}</p>
                    </div>
                  </div>
                  <div className="mock-auth-note">
                    {t("companyShowcase.checkout.mockAuthentication")}
                  </div>
                  <label>
                    <span>{t("companyShowcase.form.email")}</span>
                    <div className="showcase-field"><FaEnvelope /><input type="email" name="email" value={accountForm.email} onChange={updateAccountForm} required /></div>
                  </label>
                  <label>
                    <span>{t("companyShowcase.form.password")}</span>
                    <div className="showcase-field"><FaRightToBracket /><input type="password" name="password" value={accountForm.password} onChange={updateAccountForm} required /></div>
                  </label>
                  <button type="submit" className="showcase-button showcase-button--primary">
                    <FaRightToBracket />
                    {t("companyShowcase.checkout.signInAndOrder")}
                  </button>
                  <button type="button" className="showcase-link-button">
                    {t("companyShowcase.checkout.createAccount")}
                  </button>
                </form>
              )}
            </div>
          </aside>
        </div>
      )}

      {bookingProduct && (
        <div className="showcase-overlay showcase-overlay--center" role="dialog" aria-modal="true" aria-labelledby="booking-title">
          <button type="button" className="showcase-overlay__backdrop" onClick={closeBooking} aria-label={t("companyShowcase.actions.close")} />
          <form className="booking-dialog" onSubmit={submitBooking}>
            <header>
              <div>
                <span><FaCalendarCheck /></span>
                <div>
                  <p>{bookingProduct.name}</p>
                  <h2 id="booking-title">{t("companyShowcase.booking.title")}</h2>
                </div>
              </div>
              <button type="button" onClick={closeBooking} aria-label={t("companyShowcase.actions.close")}><FaXmark /></button>
            </header>

            <div className="booking-dialog__body">
              <p className="booking-dialog__intro">
                {t("companyShowcase.booking.description")}
              </p>

              <div className="booking-form-grid">
                <label>
                  <span>{t("companyShowcase.form.name")}</span>
                  <input name="name" value={bookingForm.name} onChange={updateBookingForm} required />
                </label>
                <label>
                  <span>{t("companyShowcase.form.phone")}</span>
                  <input name="phone" value={bookingForm.phone} onChange={updateBookingForm} required />
                </label>
                <label className="booking-form-grid__full">
                  <span>{t("companyShowcase.form.email")}</span>
                  <input type="email" name="email" value={bookingForm.email} onChange={updateBookingForm} required />
                </label>

                <div className="booking-scheduler booking-form-grid__full">
                  <div className="booking-calendar">
                    <div className="booking-calendar__header">
                      <button
                        type="button"
                        onClick={goToPrevMonth}
                        disabled={isCurrentMonth}
                        aria-label={t("companyShowcase.booking.prevMonth", "Previous month")}
                      >
                        <FaArrowLeft />
                      </button>
                      <strong>{monthLabel}</strong>
                      <button
                        type="button"
                        onClick={goToNextMonth}
                        aria-label={t("companyShowcase.booking.nextMonth", "Next month")}
                      >
                        <FaArrowRight />
                      </button>
                    </div>

                    <div className="booking-calendar__weekdays">
                      {weekdayLabels.map((label, index) => (
                        <span key={index}>{label}</span>
                      ))}
                    </div>

                    <div className="booking-calendar__grid">
                      {calendarCells.map((day, index) => {
                        if (!day) {
                          return <span key={`blank-${index}`} className="booking-calendar__blank" />;
                        }

                        const key = toISODate(calendar.year, calendar.month, day);
                        const hasSlots = !!monthAvailability[key]?.length;
                        const isSelected = bookingForm.preferredDate === key;
                        const isToday = key === todayKey;

                        const classNames = [
                          "booking-calendar__day",
                          hasSlots ? "is-available" : "",
                          isSelected ? "is-selected" : "",
                          isToday ? "is-today" : "",
                        ]
                          .filter(Boolean)
                          .join(" ");

                        return (
                          <button
                            key={key}
                            type="button"
                            className={classNames}
                            onClick={() => handleSelectDay(day)}
                            disabled={!hasSlots}
                            aria-pressed={isSelected}
                          >
                            {day}
                            {hasSlots && <i />}
                          </button>
                        );
                      })}
                    </div>

                    {loadingAvailability && (
                      <div className="booking-calendar__loading">
                        {t("companyShowcase.booking.loadingAvailability", "Loading availability…")}
                      </div>
                    )}
                  </div>

                  <div className="booking-slots">
                    <span className="booking-slots__title">
                      {t("companyShowcase.booking.availableTimes", "Available times")}
                    </span>

                    {!bookingForm.preferredDate && (
                      <p className="booking-slots__hint">
                        {t("companyShowcase.booking.pickDate", "Select a date to see available times.")}
                      </p>
                    )}

                    {bookingForm.preferredDate && selectedDaySlots.length === 0 && (
                      <p className="booking-slots__hint">
                        {t("companyShowcase.booking.noSlots", "No availability on this day.")}
                      </p>
                    )}

                    {selectedDaySlots.length > 0 && (
                      <div className="booking-slots__list">
                        {selectedDaySlots.map((slot) => {
                          const active =
                            bookingForm.preferredTime === slot.start &&
                            bookingForm.preferredTimeEnd === slot.end;

                          return (
                            <button
                              type="button"
                              key={`${slot.start}-${slot.end}`}
                              className={`booking-slot${active ? " is-active" : ""}`}
                              onClick={() => handleSelectSlot(slot)}
                              aria-pressed={active}
                            >
                              {formatTime(slot.start)} – {formatTime(slot.end)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <label className="booking-form-grid__full">
                  <span>{t("companyShowcase.form.notes")}</span>
                  <textarea name="notes" rows="4" value={bookingForm.notes} onChange={updateBookingForm} placeholder={t("companyShowcase.booking.notesPlaceholder")} />
                </label>
              </div>

              {bookingForm.preferredDate && bookingForm.preferredTime && (
                <div className="booking-selection">
                  <FaCalendarCheck />
                  <span>
                    <strong>{selectedDateLabel}</strong>
                    <small>
                      {formatTime(bookingForm.preferredTime)} – {formatTime(bookingForm.preferredTimeEnd)}
                    </small>
                  </span>
                </div>
              )}
            </div>

            <footer>
              <button type="button" className="showcase-button showcase-button--secondary" onClick={closeBooking}>
                {t("companyShowcase.actions.cancel")}
              </button>
              <button
                type="submit"
                className="showcase-button showcase-button--primary"
                disabled={!bookingForm.preferredDate || !bookingForm.preferredTime}
              >
                <FaCalendarCheck />
                {t("companyShowcase.booking.submit")}
              </button>
            </footer>
          </form>
        </div>
      )}
    </main>
  );
}