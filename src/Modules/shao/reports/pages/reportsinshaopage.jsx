import React, { useState } from "react";
import MainTemplateShao from "../../mainShao/templates/maintemplateShao";
import Reports from "../components/Reports";



export default function Reportsinshaopage({
  t,
  setRefreshCheckLogin,
}) {


  return (
    <MainTemplateShao
      t={t}>
      
      <Reports t = {t}>

      </Reports>



    </MainTemplateShao>
  );
}