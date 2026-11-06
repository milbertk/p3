import React from "react";
import MainTemplate from "../../MainConfigurations/Templates/MainTemplate";
import InviteNotifications from "../components/InviteNotifications";
import ProfileComponent from "../components/ProfileComponent";
import TransferAccount from "../components/TransferAccount";




export default function TransferAccountPage(props)

{

const {t, setRefresChecklogin} = props;


  
    return(
        <div>
           <MainTemplate t = {t} setRefresChecklogin = {setRefresChecklogin}>
            <TransferAccount  t = {t} setRefresChecklogin = {setRefresChecklogin}></TransferAccount></MainTemplate>
        </div>
    )
}