import React, { useState } from "react";
import MainTemplateShao from "../../mainShao/templates/maintemplateShao";
import CategoryMaintenanceForm from "../components/CategoryMaintenanceForm";


export default function ShaocategoryPage({
  t,
  setRefreshCheckLogin,
}) {


  return (
    <MainTemplateShao
      t={t}>
      
      <CategoryMaintenanceForm t = {t}>

      </CategoryMaintenanceForm>


    </MainTemplateShao>
  );
}