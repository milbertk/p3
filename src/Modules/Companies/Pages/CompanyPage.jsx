import React from "react";
import MainTemplate from "../../MainConfigurations/Templates/MainTemplate";
import CompanyForm from "../Components/CompanyForm";




export default function CompanyPage(props)

{

const {t, setRefresChecklogin} = props;


  
    return(
        <div>
           <MainTemplate t = {t} setRefresChecklogin = {setRefresChecklogin}>
            <CompanyForm  t = {t} setRefresChecklogin = {setRefresChecklogin}></CompanyForm></MainTemplate>
        </div>
    )
}