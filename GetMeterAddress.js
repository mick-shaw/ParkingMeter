//getMeterAddress.js

//
// Created by: Mick Shaw
// Contact Information: voice.eng@dc.gov
// Date: 06/17/2019
// Subject: getMeterAddress.js
//
// This getMeterAddress script is invoked  from Connect 
// when one of the following call-flows are active:
//
//  * OUC GetMeterID_en
//  * OUC GetMeterID_es
//
// It uses the opendata API to check the status of a Parking Meter. 
// This script will send Connect a response based on one of the following criteria:

// No Meter ID was entered:
// ------------------------------
//  "FullAddress": "No Entry",
//  "lambdaResult": "Failed"

// No Meter was found for the given 8-digit Meter ID:
// ------------------------------
//  "FullAddress": "Invalid MeterID",
//  "lambdaResult": "Failed"

// The Meter-ID submitted was not 8 digits long:
// ------------------------------
//  "FullAddress": "Invalid Length",
//  "lambdaResult": "Failed"
// The Meter-ID is valid and address is returned:
// ------------------------------
//  "FullAddress": "5200 44TH ST NW",
//  "lambdaResult": "Success"


console.log('Loading event');

// Global Variables 

    const https = require("http");
 
 
// Lambda function:
exports.handler =  (event, context, callback) => {
  
  console.log(`Incoming Amazon Connect Event: ${JSON.stringify(event)}`);
  

  if (event.Details.ContactData){

        if (event.Details.ContactData.Attributes.meterId){
            var meterId = event.Details.ContactData.Attributes.meterId;
            var MeterIDLength = meterId.length;
        }

  }else{
      meterId = "Empty";
  }
    
    //const url =`http://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Transportation_WebMercator/MapServer/76/query?where=METERID=${meterId}&outFields=STREET,BLOCK&outSR=4326&f=json`;
      const url =`http://maps2.dcgis.dc.gov/dcgis/rest/services/DDOT/Parking/MapServer/8/query?where=METERID='${meterId}'&outFields=STREET,BLOCK&outSR=4326&f=json`;
    
    https.get(url, res => {
      res.setEncoding("utf8");
      let body = "";
      res.on("data", data => {
        body += data;
        });
      res.on("end", () => {
        
        body = JSON.parse(body);
        console.log("API Call returned: " + JSON.stringify(body));
        console.log("Body error is" +body.error);
        if((body.error)=== undefined && body.features[0]){
          
            var result = {
            FullAddress: body.features[0].attributes.BLOCK + " " + body.features[0].attributes.STREET,
            lambdaResult: "Success"
            };        
        }
        if (body.error){  
          
            result = {
              FullAddress: "No Entry",
              lambdaResult: "Failed"      
            };
          
        }
        
        
        if ((meterId) && body.features[0] === undefined){
          
          if (MeterIDLength != 8){
            result = {
            FullAddress: "Invalid Length",
            lambdaResult: "Failed" 
          };}else{
            result = {
            FullAddress: "Invalid MeterID",
            lambdaResult: "Failed"    
          };
          }
        } 

        console.log(`these are the results: ${JSON.stringify(result)}`);

        

        callback(null, result);
            
      });
    });

};

