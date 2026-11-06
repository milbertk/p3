import React from "react";
import MainTemplateShao from "../../mainShao/templates/maintemplateShao";
import PageConfiguration from "../components/PageConfiguration";

export default function PageConfigurationShaoPage({ t, setRefreshCheckLogin }) {
  return (
    <MainTemplateShao t={t} setRefreshChecklogin={setRefreshCheckLogin}>
      <PageConfiguration t={t} />
    </MainTemplateShao>
  );
}
