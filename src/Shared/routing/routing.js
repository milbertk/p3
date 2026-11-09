import React from "react";

import { Navigate, Route, Routes } from "react-router-dom";
import StarterPage from "../../Modules/MainConfigurations/Pages/StarterPage";
import CompanyPage from "../../Modules/Companies/Pages/CompanyPage";
import AddUsersToCompanyPage from "../../Modules/Companies/Pages/AddUsersToCompanyPage";
import CompanyUsersManagerPage from "../../Modules/Companies/Pages/CompanyUsersManagerPage";
import CompanyInvitationSenderPage from "../../Modules/MainConfigurations/Pages/CompanyInvitationSenderPage";
import InviteNotificationsPage from "../../Modules/userComponents/pages/InviteNotificationsPage";
import ProfilePage from "../../Modules/userComponents/pages/ProfilePage";
import ChangePass from "../../Modules/userComponents/pages/ChangePass";
import ChangeEmailPage from "../../Modules/userComponents/pages/ChangeEmailPage";
import TransferAccountPage from "../../Modules/userComponents/pages/TransferAccountPage";
import Shaomainpage from "../../Modules/shao/mainShao/pages/shaomainpage";
import Shaocustomers from "../../Modules/shao/mainShao/pages/shaocustomers";
import Shaoproducts from "../../Modules/shao/mainShao/pages/shaoproducts";
import ShaocategoryPage from "../../Modules/shao/productCategories/pages/categoryShaoPage";
import TrackingShaoPage from "../../Modules/shao/tracking/pages/TrackingShaoPage";
import OrdersShaoPage from "../../Modules/shao/orders/pages/ordersShaoPage";
import OperationalOrderTrackingShaoPage from "../../Modules/shao/OperationalOrderTracking/pages/operationalOrderTrackingShaoPage";
import CompanyUsersAccessShaoPage from "../../Modules/shao/CompanyUsersAccess/pages/CompanyUsersAccessShaoPage";
import CompanyShowcase from "../../Modules/shao/CompanyShowcase/components/CompanyShowcase";
import CompanyShowcaseShaoPage from "../../Modules/shao/CompanyShowcase/pages/CompanyShowcaseShaoPage";
import BookingMaintenanceShaoPage from "../../Modules/shao/bookingMaintenance/pages/BookingMaintenanceShaoPage";
import BookingAvailabilityMaintenance from "../../Modules/shao/bookingMaintenance/components/BookingAvailabilityMaintenance";
import BookingRequestManagmentSaoPage from "../../Modules/shao/bookingRequestManagment/pages/BookingRequestManagmentSaoPage";
import WebApprovalAShaoPage from "../../Modules/shao/webaprobal/pages/WebApprovalAShaoPage";
import BookingSelfShaoPage from "../../Modules/shao/bookingSelfReservation/pages/BookingSelfShaoPage";
import ShowcasePage from "../../Modules/showcase/pages/showcase";
import AppointmentManagement from "../../Modules/shao/trackingAppointments/components/AppointmentManagement";
import AppointmentManagmentInShaoPage from "../../Modules/shao/trackingAppointments/pages/AppointmentManagmentInShaoPage";
import Reportsinshaopage from "../../Modules/shao/reports/pages/reportsinshaopage";
import PageConfigurationShaoPage from "../../Modules/shao/pageConfiguration/pages/PageConfigurationShaoPage";
import LocationsShaoPage from "../../Modules/shao/locations/pages/LocationsShaoPage";



export default function AppRoutes(props) {
  const { t, setRefreshCheckLogin } = props;

  const commonProps = {
    t,
    setRefreshCheckLogin,
  };

  return (
    <Routes>
      <Route path="/" element={<StarterPage t={t} setRefreshCheckLogin={setRefreshCheckLogin}>
          ShaocategoryPage
        </StarterPage>} />
      <Route path="/companies" element={<CompanyPage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></CompanyPage>}></Route>
      <Route path="/adduserstocompany" element={<AddUsersToCompanyPage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></AddUsersToCompanyPage>}></Route>
      <Route path="/companyusersmanagerpage" element={<CompanyUsersManagerPage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></CompanyUsersManagerPage>}></Route>
      <Route path="/invitationsend" element={<CompanyInvitationSenderPage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></CompanyInvitationSenderPage>}></Route>
      <Route path="/manageinvitatinsbyuser" element={<InviteNotificationsPage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></InviteNotificationsPage>}></Route>
      <Route path="/profile" element={<ProfilePage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></ProfilePage>}></Route>
      <Route path="/changepass" element={<ChangePass t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></ChangePass>}></Route>
      <Route path="/changeemail" element={<ChangeEmailPage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></ChangeEmailPage>}></Route>
      <Route path="/transferaccount" element={<TransferAccountPage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></TransferAccountPage>}></Route>
      <Route path="/shao" element={<Shaomainpage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></Shaomainpage>}></Route>
      <Route path="/shao/main" element={<Shaomainpage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></Shaomainpage>}></Route>
      <Route path="/shao/customers" element={<Shaocustomers t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></Shaocustomers>}></Route>
      <Route path="/shao/products" element={<Shaoproducts t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></Shaoproducts>}></Route>
      <Route path="/shao/categories" element={<ShaocategoryPage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></ShaocategoryPage>}></Route>
      <Route path="/shao/order-stages" element={<TrackingShaoPage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></TrackingShaoPage>}></Route>
      <Route path="/shao/orders" element={<OrdersShaoPage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></OrdersShaoPage>}></Route>
      <Route path="/shao/order-tracking" element={<OperationalOrderTrackingShaoPage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></OperationalOrderTrackingShaoPage>}></Route> 
      <Route path="/shao/team" element={<CompanyUsersAccessShaoPage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></CompanyUsersAccessShaoPage>}></Route> 
      <Route path="/shao/showcase" element={<CompanyShowcaseShaoPage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></CompanyShowcaseShaoPage>}></Route> 
      <Route path="/shao/booking-schedules" element={<BookingMaintenanceShaoPage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></BookingMaintenanceShaoPage>}></Route> 
      <Route path="/shao/booking-requests" element={<BookingRequestManagmentSaoPage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></BookingRequestManagmentSaoPage>}></Route> 
      <Route path="/shao/web-orders" element={<WebApprovalAShaoPage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></WebApprovalAShaoPage>}></Route> 
      <Route path="/shao/book-for-customer" element={<BookingSelfShaoPage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></BookingSelfShaoPage>}></Route> 
      <Route path="/shao/appointments" element={<AppointmentManagmentInShaoPage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></AppointmentManagmentInShaoPage>}></Route> 
      <Route path="/shao/page-configuration" element={<PageConfigurationShaoPage t={t} setRefreshCheckLogin={setRefreshCheckLogin} />} />
      {/* Locations ("Sedes", 2026-11-07). */}
      <Route path="/shao/locations" element={<LocationsShaoPage t={t} setRefreshCheckLogin={setRefreshCheckLogin} />} />

      {/* Old addresses (bookmarks, old assistant answers) -> new ones. */}
      <Route path="/shao/customersadd" element={<Navigate to="/shao/customers" replace />} />
      <Route path="/shao/category" element={<Navigate to="/shao/categories" replace />} />
      <Route path="/shao/trackingmant" element={<Navigate to="/shao/order-stages" replace />} />
      <Route path="/shao/oporders" element={<Navigate to="/shao/order-tracking" replace />} />
      <Route path="/shao/usersbcompany" element={<Navigate to="/shao/team" replace />} />
      <Route path="/shao/maintenancebooking" element={<Navigate to="/shao/booking-schedules" replace />} />
      <Route path="/shao/aprovalb" element={<Navigate to="/shao/booking-requests" replace />} />
      <Route path="/shao/approvala" element={<Navigate to="/shao/web-orders" replace />} />
      <Route path="/shao/selfbooking" element={<Navigate to="/shao/book-for-customer" replace />} />
      <Route path="/shao/reports" element={<Reportsinshaopage t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></Reportsinshaopage>}></Route> 


<Route
  path="/showcase/:companySlug"
  element={<ShowcasePage t={t} setRefreshCheckLogin={setRefreshCheckLogin} />}
/>

            {/* Any invalid route returns to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
