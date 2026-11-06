import React from "react";
import MainTemplate from "../Templates/MainTemplate";
import PlatformsContainer from "../Components/PlatformsContainer";
import CompanyInvitationSender from "../Components/CompanyInvitationSender";



export default function CompanyInvitationSenderPage(props)

{

const {t, setRefresChecklogin} = props;


  
    return(
        <div>
           <MainTemplate t = {t} setRefresChecklogin = {setRefresChecklogin}>
            <CompanyInvitationSender t = {t} setRefresChecklogin = {setRefresChecklogin}>
                </CompanyInvitationSender></MainTemplate>
        </div>
    )
}