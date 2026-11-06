import React, { useState } from "react";
import MainTemplateShao from "../templates/maintemplateShao";
import NoActivePlan from "../../joinToPLan/NoActivePlan";
import ServiceHubStart from "../components/ServiceHubStart";
import CustomerCreateForm from "../../customers/components/CustomerCreateForm";

export default function Shaocustomers({
  t,
  setRefreshCheckLogin,
}) {


  return (
    <MainTemplateShao
      t={t}>
      
      <CustomerCreateForm t = {t}>

      </CustomerCreateForm>


    </MainTemplateShao>
  );
}