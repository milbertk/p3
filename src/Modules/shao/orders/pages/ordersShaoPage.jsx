import React, { useState } from "react";
import MainTemplateShao from "../../mainShao/templates/maintemplateShao";
import OrderMaintenance from "../components/OrderMaintenance";




export default function OrdersShaoPage({
  t,
  setRefreshCheckLogin,
}) {


  return (
    <MainTemplateShao
      t={t}>
      
      <OrderMaintenance t = {t}>

      </OrderMaintenance>



    </MainTemplateShao>
  );
}