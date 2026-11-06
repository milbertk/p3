import React, { useState } from "react";
import MainTemplateShao from "../../mainShao/templates/maintemplateShao";
import TrackingMaintenance from "../components/TrackingMaintenance";



export default function TrackingShaoPage({
  t,
  setRefreshCheckLogin,
}) {


  return (
    <MainTemplateShao
      t={t}>
      
      <TrackingMaintenance t = {t}>

      </TrackingMaintenance>


    </MainTemplateShao>
  );
}