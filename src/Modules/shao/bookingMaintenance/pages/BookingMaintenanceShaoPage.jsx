import React, { useState } from "react";
import MainTemplateShao from "../../mainShao/templates/maintemplateShao";
import BookingAvailabilityMaintenance from "../components/BookingAvailabilityMaintenance";


export default function BookingMaintenanceShaoPage({
  t,
  setRefreshCheckLogin,
}) {


  return (
    <MainTemplateShao
      t={t}>
      
      <BookingAvailabilityMaintenance t = {t}>

      </BookingAvailabilityMaintenance>


    </MainTemplateShao>
  );
}