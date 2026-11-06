import React, { useState } from "react";
import MainTemplateShao from "../templates/maintemplateShao";
import NoActivePlan from "../../joinToPLan/NoActivePlan";
import ServiceHubStart from "../components/ServiceHubStart";

export default function Shaomainpage({
  t,
  setRefreshCheckLogin,
}) {

  const [hasPlan, setHasPlan] = useState(true)
  return (
    <MainTemplateShao
      t={t}>

      {hasPlan?<ServiceHubStart t = {t}></ServiceHubStart>: <NoActivePlan t={t} />}
      


    </MainTemplateShao>
  );
}