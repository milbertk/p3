import React from "react";
import MainTemplate from "../../MainConfigurations/Templates/MainTemplate";
import InviteNotifications from "../components/InviteNotifications";
import ChangePassword from "../components/ChangePassword";




export default function ChangePass(props)

{

const {t, setRefresChecklogin} = props;


  
    return(
        <div>
           <MainTemplate t = {t} setRefresChecklogin = {setRefresChecklogin}>
            <ChangePassword  t = {t} setRefresChecklogin = {setRefresChecklogin}></ChangePassword></MainTemplate>
        </div>
    )
}