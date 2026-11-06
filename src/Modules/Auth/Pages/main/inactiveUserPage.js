import React from "react";
import UnverifiedComponent from "../../Components/UnverifiedComponent";
import InactiveComponent from "../../Components/InactiveComponent";



export default function InactiveUserPage(props){

    const {t, setRefreshCheckLogin} = props;

    return(

        <div>
            <InactiveComponent t = {t} setRefreshCheckLogin={setRefreshCheckLogin}>

            </InactiveComponent>
        </div>
    )
}