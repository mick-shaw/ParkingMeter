
//SubmitMeterSR.js
//
//
// Created by: Mick Shaw
// Contact Information: voice.eng@dc.gov
// Date: 06/19/2019
// Subject: SubmitMeterSR.js
//
// This Submit Service Request script is invoked from Connect 
// when one of the following call-flows are active:
//
//  * OUC Get_Trble_en
//  * OUC Get_Trble_es
//
//  This script intakes the following attributes from Connect:
//
//  meterId:                The 8-digit Meter ID that has been validated using the  
//                          getMeterAddress.js
//
//  FullAddress:            The FullAddress is a concatenation of two variables that
//                          were gathered from the getMeterAddress.js script.  The
//                          getMeterAddress.js concatenates the STREET and BLOCK variables
//                          that are returned from the DC OpenData endpoint when a meterID
//                          is validated.
//
//  TrblDesc:                 There are six valid trouble description values that Connect 
//                            might send:
//              
//                            COISL001 - Coin Slot is jammed
//                            MEDIOUOR - Meter Displays fail or out of order
//                            DONOREMO - Does not give you time for your money
//                            METHE001 - The Meter Head is missing
//                            GRAFF001 - Graffitti
//                            OTHREPRE - All other damages
//
//  CustomerEndpoint.Address: This is a buit-in attribute that will be the customer's 
//                            phone number
//
//  The script will then pass these values to the SalesForce 311 Endpoint
//



var http = require("https");
exports.handler =  (event, context, callback) => {
console.log(`Incoming Amazon Connect Event: ${JSON.stringify(event)}`);

let SCAddress = encodeURIComponent(event.Details.ContactData.Attributes.FullAddress);
let meterId = event.Details.ContactData.Attributes.meterId;
let TrblDesc = event.Details.ContactData.Attributes.TrblDesc;
let phone = event.Details.ContactData.CustomerEndpoint.Address;

var options = {
  "method": "POST",
  "hostname": "dc311-api.herokuapp.com",
  "port": null,
  "path": `/v2/requests.json?service_code=S0276&address_string=${SCAddress}&last_name=${phone}&first_name=Amazon-Connect&phone=${phone}&attribute%5BWHISPAMN%5D%5B%5D=${meterId}&attribute%5BWHISDORN%5D%5B%5D=${TrblDesc}&api_key=a76d26dce42fd92f89c1bca3eaa91323f255411113230783f63ce63e8e6357f0&jurisdiction_id=dc.gov`,
  "headers": {
    "content-type": "application/json",
    "content-length": "0"
  }
};

console.log("API Call: dc311-api.herokuapp.com"+`/v2/requests.json?service_code=S0276&address_string=${SCAddress}&last_name=${phone}&first_name=Amazon-Connect&phone=${phone}&attribute%5BWHISPAMN%5D%5B%5D=${meterId}&attribute%5BWHISDORN%5D%5B%5D=${TrblDesc}&api_key=a76d26dce42fd92f89c1bca3eaa91323f255411113230783f63ce63e8e6357f0&jurisdiction_id=dc.gov`);

var req = http.request(options, function (res) {
  var chunks = [];
  

  res.on("data", function (chunk) {
    chunks.push(chunk);
  });
res.on('error', (err) => {
  // This prints the error message and stack trace to `stderr`.
  console.error(err.stack);
});
  res.on("end", function () {
    var body = Buffer.concat(chunks);
    console.log("This is the Open311 API Reponse: "+body);
    body = JSON.parse(body);
    var rawsrid = body.service_request_id;
    body.service_request_id = body.service_request_id.split('').join(',, ');
    
    var result = {
      service_request_id: body.service_request_id,
      service_request_id_sms: rawsrid
    };
  
    callback(null, result);
    
    lambdaResult: "SR-Success";
    
  });
});
 
req.end();

};
