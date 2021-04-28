//SMSConfirmation.js

//
// Created by: Mick Shaw
// Contact Information: voice.eng@dc.gov
// Date: 07/196/2019
// Subject: SMSConfirmation.js
//
// This SMS Confirmation script is invoked from Connect 
// when one of the following call-flows are active:
//
//  * OUC SR_Confirmation_en
//  * OUC SR_Confirmation_es
//
// --------------------------------
// It uses the Amazon Pinpoint service to send an SMS confirmation of the customer's service request
// to the customer number captured and stored in the CustomerEndpoint.Address attribute
//
// There are environment variables specific to the Pinpoint project you have setup and intend 
// to use.  These environment variables needt need to be assigned outside of the script
// The three variables that need to be defined based on your Pinpoint project parameters are:
//
// pinpoint:                  This is the region your Pinpoint project is in.
//                            for most of our deployments it will be us-east-1.
//
// projecId:                  When you create an Amazon Pinpoint project a hexadecimal 
//                            string will be generated.  You must assign the Project ID 
//                            to this variable.
//
// originationNumber:         The number you claimed in your Pinpoint Project that has 
//                            voice and sms service enabled for outbound SMS delivery.
// 
// This script will intake the following three attributes from Connect:
//  
//  meterId:                  Will be the 8-digit Meter ID that was validated using 
//                            getMeterAddress.js and was submitted as a Service Request
//                            using SMSConfirmation.
//  
//  service_request_id_sms:   This is an external attribute returned from SubmitMeterSR.js
//  
//  CustomerEndpoint.Address: This is a buit-in attribute that will be the customer's 
//                            phone number
//
// --------------------------------
//  The validateNumber() function isn't needed in this deployment but has been included
//  since it provides information that may prove to be useful in the future.
// 
//  validateNumber() uses the Amazon Pinpoint to determine whether the destination 
//  phone number is valid.Example details that can be gathered from this function are 
//  the following:
 
//     Carrier: 'AT&T Wireless',
//     City: 'Catonsville',
//     CleansedPhoneNumberE164: '+14103705432',
//     CleansedPhoneNumberNational: '4103705432',
//     Country: 'United States',
//     CountryCodeIso2: 'US',
//     CountryCodeNumeric: '1',
//     County: 'Baltimore',
//     OriginalCountryCodeIso2: 'US',
//     OriginalPhoneNumber: '+14103705432',
//     PhoneType: 'MOBILE',
//     PhoneTypeCode: 0,
//     Timezone: 'America/New_York',
//     ZipCode: '21228'
// --------------------------------

var AWS = require('aws-sdk');
var pinpoint = new AWS.Pinpoint({region: process.env.region}); 

// Make sure the SMS channel is enabled for the projectId that you specify.
// See: https://docs.aws.amazon.com/pinpoint/latest/userguide/channels-sms-setup.html
var projectId = process.env.projectId;

// Define the PinPoint number as an evironment variable.
var originationNumber = process.env.originationNumber;

//Define variables that will be updated later from Amazon event details.

var message = "Text";
var messageType = "TRANSACTIONAL";


exports.handler = (event, context, callback) => {
  console.log(`Incoming Amazon Connect Event: ${JSON.stringify(event)}`);
 
  let meterID = event.Details.ContactData.Attributes.meterId;
  let ServiceID = event.Details.ContactData.Attributes.service_request_id_sms;
  let language = event.Details.ContactData.Attributes.language;

 if (language == "english"){
  
  message = "The service request number for "
                + "Meter ID "  
                + meterID 
                + " is:    "
                + ServiceID
                + " "
                + "This is for repair only and does not excuse parking fines or tickets."
                + " "
                + "Reply STOP to unsubscribe";
  }else{

  message = "El número de confirmación para "
                + "parquímetro número "  
                + meterID 
                + " es:    "
                + ServiceID
                + " "
                + "Este número de confirmación es solo para reportar la falla y no debe ser usado para evitar multas de estacionamiento."
                + " "
                + "Responda STOP para no recibir mas mensajes de texto.";  
  }
                
          
validateNumber(event);
};

function validateNumber (event) {



  var destinationNumber = event.Details.ContactData.CustomerEndpoint.Address;
 
  if (destinationNumber.length == 10) {
    destinationNumber = "+1" + destinationNumber;
  }
  var params = {
    NumberValidateRequest: {
      IsoCountryCode: 'US',
      PhoneNumber: destinationNumber
    }
  };
  pinpoint.phoneNumberValidate(params, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    }
    else {
      console.log(data);
      //return data;
      if (data['NumberValidateResponse']['PhoneTypeCode'] == 0) {
        createEndpoint(data, event.firstName, event.lastName, event.source);
      } else {
        console.log("Received a phone number that isn't capable of receiving "
                   +"SMS messages. No endpoint created.");
      }
    }
  });
}

function createEndpoint(data, firstName, lastName, source) {
  var destinationNumber = data['NumberValidateResponse']['CleansedPhoneNumberE164'];
  var endpointId = data['NumberValidateResponse']['CleansedPhoneNumberE164'].substring(1);
  
  var params = {
    ApplicationId: projectId,
    // The Endpoint ID is equal to the cleansed phone number minus the leading
    // plus sign. This makes it easier to easily update the endpoint later.
    EndpointId: endpointId,
    EndpointRequest: {
      ChannelType: 'SMS',
      Address: destinationNumber,
      // OptOut is set to ALL (that is, endpoint is opted out of all messages)
      // because the recipient hasn't confirmed their subscription at this
      // point. When they confirm, a different Lambda function changes this 
      // value to NONE (not opted out).
      OptOut: 'ALL',
      Location: {
        PostalCode:data['NumberValidateResponse']['ZipCode'],
        City:data['NumberValidateResponse']['City'],
        Country:data['NumberValidateResponse']['CountryCodeIso2'],
      },
      Demographic: {
        Timezone:data['NumberValidateResponse']['Timezone']
      },
      Attributes: {
        Source: [
          source
        ]
      },
      User: {
        UserAttributes: {
          FirstName: [
            firstName
          ],
          LastName: [
            lastName
          ]
        }
      }
    }
  };
  pinpoint.updateEndpoint(params, function(err,data) {
    if (err) {
      console.log(err, err.stack);
    }
    else {
      console.log(data);
      //return data;
      sendConfirmation(destinationNumber);
    }
  });
}

function sendConfirmation(destinationNumber) {
  var params = {
    ApplicationId: projectId,
    MessageRequest: {
      Addresses: {
        [destinationNumber]: {
          ChannelType: 'SMS'
        }
      },
      MessageConfiguration: {
        SMSMessage: {
          Body: message,
          MessageType: messageType,
          OriginationNumber: originationNumber
        }
      }
    }
  };


  pinpoint.sendMessages(params, function(err, data) {
    // If something goes wrong, print an error message.
    if(err) {
      console.log(err.message);
    // Otherwise, show the unique ID for the message.
    } else {
      console.log("Message sent! " 
          + data['MessageResponse']['Result'][destinationNumber]['StatusMessage']);
    }
  });
}

