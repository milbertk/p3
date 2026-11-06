import React, { useState } from "react";
import MainTemplateShao from "../../mainShao/templates/maintemplateShao";
import CategoryMaintenanceForm from "../components/CategoryMaintenanceForm";
import StepMaintenanceForm from "../components/StepMaintenanceForm";


export default function SteepShaoPage({
  t,
  setRefreshCheckLogin,
}) {


  return (
    <MainTemplateShao
      t={t}>
      
      <StepMaintenanceForm t = {t}>

      </StepMaintenanceForm>


    </MainTemplateShao>
  );
}