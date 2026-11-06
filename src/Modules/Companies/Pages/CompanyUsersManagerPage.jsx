import React from "react";
import MainTemplate from "../../MainConfigurations/Templates/MainTemplate";
import CompanyForm from "../Components/CompanyForm";
import CompanyUsersManager from "../Components/CompanyUsersManager";




export default function CompanyUsersManagerPage(props)

{

const {t, setRefresChecklogin} = props;


  
    return(
        <div>
           <MainTemplate t = {t} setRefresChecklogin = {setRefresChecklogin}>
            <CompanyUsersManager  t = {t} setRefresChecklogin = {setRefresChecklogin}></CompanyUsersManager></MainTemplate>
        </div>
    )
}