import React from "react";
import MainTemplate from "../../MainConfigurations/Templates/MainTemplate";
import InviteNotifications from "../components/InviteNotifications";
import ChangePassword from "../components/ChangePassword";
import ChangeEmail from "../components/ChangeEmail";




export default function ChangeEmailPage(props)

{

const {t, setRefresChecklogin} = props;


  
    return(
        <div>
           <MainTemplate t = {t} setRefresChecklogin = {setRefresChecklogin}>
            <ChangeEmail  t = {t} setRefresChecklogin = {setRefresChecklogin}></ChangeEmail></MainTemplate>
        </div>
    )
}