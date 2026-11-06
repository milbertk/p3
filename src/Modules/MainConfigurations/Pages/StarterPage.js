import React from "react";
import MainTemplate from "../Templates/MainTemplate";
import PlatformsContainer from "../Components/PlatformsContainer";



export default function StarterPage(props)

{

const {t, setRefresChecklogin} = props;


  
    return(
        <div>
           <MainTemplate t = {t} setRefresChecklogin = {setRefresChecklogin}>
            <PlatformsContainer t = {t} setRefresChecklogin = {setRefresChecklogin}>
                </PlatformsContainer></MainTemplate>
        </div>
    )
}