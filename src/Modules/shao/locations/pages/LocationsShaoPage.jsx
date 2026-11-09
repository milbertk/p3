import React from "react";
import MainTemplateShao from "../../mainShao/templates/maintemplateShao";
import LocationsMaintenance from "../components/LocationsMaintenance";

// Locations ("Sedes", 2026-11-07): /shao/locations
export default function LocationsShaoPage({ t, setRefreshCheckLogin }) {
  return (
    <MainTemplateShao t={t} setRefreshChecklogin={setRefreshCheckLogin}>
      <LocationsMaintenance t={t} />
    </MainTemplateShao>
  );
}
