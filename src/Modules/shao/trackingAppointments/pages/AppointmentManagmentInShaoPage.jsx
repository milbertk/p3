import React, { useState } from "react";
import MainTemplateShao from "../../mainShao/templates/maintemplateShao";
import AppointmentManagement from "../components/AppointmentManagement";



export default function AppointmentManagmentInShaoPage({
  t,
  setRefreshCheckLogin,
}) {


  return (
    <MainTemplateShao
      t={t}>
      
      <AppointmentManagement t = {t}>

      </AppointmentManagement>


    </MainTemplateShao>
  );
}