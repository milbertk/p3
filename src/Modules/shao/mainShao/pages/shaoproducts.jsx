import React, { useState } from "react";
import MainTemplateShao from "../templates/maintemplateShao";
import NoActivePlan from "../../joinToPLan/NoActivePlan";
import ServiceHubStart from "../components/ServiceHubStart";
import ProductMaintenanceForm from "../../products/components/ProductMaintenanceForm";

export default function Shaoproducts({
  t,
  setRefreshCheckLogin,
}) {


  return (
    <MainTemplateShao
      t={t}>
      
      <ProductMaintenanceForm t = {t}>

      </ProductMaintenanceForm>


    </MainTemplateShao>
  );
}