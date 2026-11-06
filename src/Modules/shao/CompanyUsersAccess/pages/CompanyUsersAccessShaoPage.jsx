import React, { useState } from "react";
import MainTemplateShao from "../../mainShao/templates/maintemplateShao";

import CompanyUsersAccess from "../components/CompanyUsersAccess";



export default function CompanyUsersAccessShaoPage({
  t,
  setRefreshCheckLogin,
}) {


  return (
    <MainTemplateShao
      t={t}>
      
      <CompanyUsersAccess t = {t}>

      </CompanyUsersAccess>


    </MainTemplateShao>
  );
}