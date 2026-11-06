import React from "react";
import CompanyShowcase from "../../shao/CompanyShowcase/components/CompanyShowcase";


export default function ShowcasePage({
  t,
  setRefreshCheckLogin}
){

 
    return(

        <div>
                <CompanyShowcase t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></CompanyShowcase>
        </div>
    )
}