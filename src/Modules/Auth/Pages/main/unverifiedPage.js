import React from "react";
import UnverifiedComponent from "../../Components/UnverifiedComponent";



export default function UnverifiedPage(props){

    const {t, setRefreshCheckLogin} = props;

    return(

        <div>
            <UnverifiedComponent t = {t} setRefreshCheckLogin={setRefreshCheckLogin}>

            </UnverifiedComponent>
        </div>
    )
}