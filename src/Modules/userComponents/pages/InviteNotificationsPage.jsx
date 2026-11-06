import React from "react";
import MainTemplate from "../../MainConfigurations/Templates/MainTemplate";
import InviteNotifications from "../components/InviteNotifications";




export default function InviteNotificationsPage(props)

{

const {t, setRefresChecklogin} = props;


  
    return(
        <div>
           <MainTemplate t = {t} setRefresChecklogin = {setRefresChecklogin}>
            <InviteNotifications  t = {t} setRefresChecklogin = {setRefresChecklogin}></InviteNotifications></MainTemplate>
        </div>
    )
}