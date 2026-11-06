import React, { useState } from "react";
import MainTemplateShao from "../../mainShao/templates/maintemplateShao";
import BookingReservationForm from "../components/BookingReservationForm";





export default function BookingSelfShaoPage({
  t,
  setRefreshCheckLogin,
}) {


  return (
    <MainTemplateShao
      t={t}>
      
      <BookingReservationForm t = {t}>

      </BookingReservationForm>



    </MainTemplateShao>
  );
}