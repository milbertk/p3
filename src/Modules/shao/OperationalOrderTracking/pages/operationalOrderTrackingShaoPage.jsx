import React, { useState } from "react";
import MainTemplateShao from "../../mainShao/templates/maintemplateShao";

import OperationalOrderTracking from "../components/OperationalOrderTracking";




export default function OperationalOrderTrackingShaoPage({
  t,
  setRefreshCheckLogin,
}) {


  return (
    <MainTemplateShao
      t={t}>
      
      <OperationalOrderTracking t = {t}>

      </OperationalOrderTracking>



    </MainTemplateShao>
  );
}