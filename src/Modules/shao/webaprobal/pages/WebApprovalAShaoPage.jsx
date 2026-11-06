import React, { useState } from "react";
import MainTemplateShao from "../../mainShao/templates/maintemplateShao";
import WebOrderApproval from "../components/WebOrderApproval";



export default function WebApprovalAShaoPage({
  t,
  setRefreshCheckLogin,
}) {


  return (
    <MainTemplateShao
      t={t}>
      
      <WebOrderApproval t = {t}>

      </WebOrderApproval>


    </MainTemplateShao>
  );
}