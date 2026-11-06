import React, { useState } from "react";
import MainTemplateShao from "../../mainShao/templates/maintemplateShao";
import BookingRequestManagement from "../components/BookingRequestManagement";


export default function BookingRequestManagmentSaoPage({
  t,
  setRefreshCheckLogin,
}) {


  return (
    <MainTemplateShao
      t={t}>
      
      <BookingRequestManagement t = {t}>

      </BookingRequestManagement>


    </MainTemplateShao>
  );
}