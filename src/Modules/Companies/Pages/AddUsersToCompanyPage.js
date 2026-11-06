import React from "react";
import MainTemplate from "../../MainConfigurations/Templates/MainTemplate";

import AddUserToCompany from "../Components/AddUserToCompany";




export default function AddUsersToCompanyPage(props)

{

const {t, setRefresChecklogin} = props;


  
    return(
        <div>
           <MainTemplate t = {t} setRefresChecklogin = {setRefresChecklogin}>
            <AddUserToCompany  t = {t} setRefresChecklogin = {setRefresChecklogin}></AddUserToCompany></MainTemplate>
        </div>
    )
}