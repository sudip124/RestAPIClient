'use strict';
/**
 * @description Javscript code to be deployed as AWS Lambda function to call a rest API (Sainsbury's store API) itiratively that implements pagination
 * The JSON response is then converted to csv files(one csv file per one api response) which in the stored in an existing S3 bucket
 * Rename the file to index.js while deploying in AWS lambda as lambda looks for index.js as entry point by default
 * @dependencies Following npm packages need to be installed: axios, json-2-csv
 * The lambda needs to be provided with the following AWS IAM policies (can be role based or user based)
 *               s3:PutObject
 *               s3:GetObject
 *               apigateway:GET
 *               kms:Decrypt -> following ones are required if encryption is enabled in the destination S3 bucket
 *               kms:Encrypt
 *               kms:GenerateDataKey
 *               kms:ReEncryptTo
 *               kms:ReEncryptFrom
 */

const
    AWS = require( 'aws-sdk' ), //AWS SDK object to use AWS APIs
    S3  = new AWS.S3(),
    axios = require('axios'),   //3rd party library to make http requests. It provides promise for API call
    converter = require('json-2-csv'), //3rd party library to to convert JSON string to csv in memory
    s3bucketname = 'sudip-nodejs-api-test', //Bucket name. Since lambda is not in VPN, only S3 name is sufficient.
    apiURL = 'https://api.stores.sainsburys.co.uk/v1/stores/?fields=all&limit=50&page=',
    folderName = new Date();
    
    let s3FileExtension = '.csv';
    let totalrecordCount = 0;
    let file_coulmns = {    //Optional field for csv conversion. If we dont pass this parameter all columns will be in csv with same names as JSON key
      delimiter: {
        wrap: '"', // Double Quote (") character to wrap each value in csv
        field: ',', // Comma field delimiter
        eol: '\r\n' // Newline delimiter
      },
      prependHeader: true,  //Flag to setup header of csv file. If set false, there will be no header in csv
      keys: [  // setting up the columns for csv. Field is JSON key name. Title is csv column header name. Add more as you deem fit
        { field: 'company_name', title: 'Company Name' },
        { field: 'name', title: 'Store Name' },
        { field: 'place_id', title: 'Place ID' },
        { field: 'contact.address1', title: 'Address' },
        { field: 'contact.city', title: 'City' },
        { field: 'location.lat', title: 'Latitude' },
        { field: 'location.lon', title: 'Longitude' },
        { field: 'open.is_open', title: 'Is Open' },
        { field: 'store_open_date', title: 'Store Open Date' },
        { field: 'store_type', title: 'Store Type' },
        { field: 'store_type_desc', title: 'Store Type Description' }
      ]
    };
/**
 * Recursive API to call a web service, convert JSON to csv and writing in a S3 bucket.
 * This function is made async as it waits for the reource intensive operations to end.
 * Needed to made async as AWS Lambda calls handler functional asynchronously
 * @param  {Number} pageCount Number of pages the API has implemented in its data pagination
 * @param  {Function} callback Callback function once the recursion ends
 */    
async function recursiveAPI(pageCount, callback) {  
    try {
        const response = await axios.get(apiURL + pageCount); //Lambda doesn't wait for axios promise. Hence await
        
        //Object 'data' is the response object from Axios http request.
        totalrecordCount = response.data.page_meta.total; 
        console.log('totalrecordCount');
        
        /*** JSON Converstion start*/ 
        let csvData = '';
        try {
            /*Awaits promise from the json2csvAsync function
            * Lambda doesn't wait for promise. Hence await
            * response.data.results is the JSON object that needs to be converted to csv
            * Remove file_coulmns variable if all JSON keys are needed as columns in csv
            */
            csvData = await converter.json2csvAsync(response.data.results, file_coulmns);
        } catch (e) {
            console.error( 'ERROR in JSONConversion', e );
            callback(e, 'Error');
        }
        /*** JSON Converstion End */
        
        /*** Writing to S3 start */
        try {
            /**
             * puObject does not return a promise (similar to most functions that 
             * take a callback). It returns a Request object. As async/await is being 
             * used, chaining it with .promise() method onto the end of s3.putObject call
             */
            const S3Response = await S3.putObject( {
             Bucket: s3bucketname + '/' + folderName,
             Key: pageCount + s3FileExtension,
             Body: csvData
            }).promise();

            // 50 is record count as put in Axios web request
            if (50 * pageCount <= totalrecordCount) {
                await recursiveAPI(++pageCount, callback);
            } else {
                callback (null, S3Response);
            }
        } catch (e) {
            console.error('ERROR in putObject', e);
            callback(e, 'Error');
        }
        /*** Writing to S3 End */

    } catch (e) {
        console.error( 'ERROR in Axios', e );
        callback(e, 'Error');
    }
}

/**
 * Entry point for the AWS lambda. Made it async to wait for all the resource intensive API calls 
 * @param {Event} event Event that triggers lambda. In this case it is manually triggered 
 * @returns returns the Lambda response. Returning a http response code and a description
 */
exports.handler = async (event) => {
    
    let response = {
            statusCode: 400,
            body: 'Unknown Failure'
            };
    await recursiveAPI(1, function (error, data) {
        if(error) {
            response = {
            statusCode: 400,
            body: 'recursiveAPI failed' + JSON.stringify(error)
            };
        } else {
            response =  {
            statusCode: 200,
            body: data
            };
        }
    });
    return response;
};
