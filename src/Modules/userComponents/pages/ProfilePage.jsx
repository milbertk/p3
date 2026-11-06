import React from "react";
import MainTemplate from "../../MainConfigurations/Templates/MainTemplate";
import InviteNotifications from "../components/InviteNotifications";
import ProfileComponent from "../components/ProfileComponent";




export default function ProfilePage(props)

{

const {t, setRefresChecklogin} = props;


  
    return(
        <div>
           <MainTemplate t = {t} setRefresChecklogin = {setRefresChecklogin}>
            <ProfileComponent  t = {t} setRefresChecklogin = {setRefresChecklogin}></ProfileComponent></MainTemplate>
        </div>
    )
}