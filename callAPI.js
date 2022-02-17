'use strict';
/**
 * @description A simple node application to call a REST API which implements
 * pagination. The service is called using Axios library. The response is stored
 * in a local csv file.
 * This app can be deloyed AS-IS in a AWS EC2 instance with appropiate security group
 * @dependencies Following npm packages need to be installed: axios, json-2-csv, fs
 */
const axios = require('axios'); //3rd party library to make http requests. It provides promise for API call
const converter = require('json-2-csv'); //3rd party library to to convert JSON string to csv in memory
const fs = require('fs'); //3rd party library to read & write files locally

const apiURL = 'https://api.stores.sainsburys.co.uk/v1/stores/?fields=all&limit=50&page=';
const csvFileName = 'storelogs_new.csv';
var responseColumns = { //Optional field for csv conversion. If we dont pass this parameter all columns will be in csv with same names as JSON key
  delimiter: {
    wrap: '"', // Double Quote (") character to wrap each value in csv
    field: ',', // Comma field delimiter
    eol: '\r\n' // Newline delimiter
  },
  prependHeader: true, //Flag to setup header of csv file. If set false, there will be no header in csv
  keys: [ // setting up the columns for csv. Field is JSON key name. Title is csv column header name. Add more as you deem fit
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
var totalrecordCount = 0;

/**
 * Recursive API to call a web service, convert JSON to csv and writing in a csv.
 * @param  {Number} pageCount Number of pages the API has implemented in its data pagination
 * @param  {Number} prependHeader flag to set the csv column header for first write
 */  

function recursiveAPI(pageCount, prependHeader) {

  responseColumns.prependHeader = prependHeader;
  axios.get(apiURL + pageCount)
    .then(response => {
      //Object 'data' is the response object from Axios http request.
      totalrecordCount = response.data.page_meta.total;
      if (prependHeader)
        console.log('Total Number of Records ' + totalrecordCount);

      /*** JSON Converstion 
       * response.data.results is the JSON object that needs to be converted to csv
       * Remove file_coulmns variable if all JSON keys are needed as columns in csv
       * */ 
        converter.json2csvAsync(response.data.results, responseColumns).then(csv => {
        
        /**
         * csv file write
         */
        fs.appendFileSync(csvFileName, csv);
        
        // 50 is record count as put in Axios web request
        if (50 * pageCount <= totalrecordCount) {
          //Appending a new line as appendfile function isn't doing it
          fs.appendFileSync(csvFileName, "\r\n"); 
          recursiveAPI(++pageCount, false);
        } else {
          console.log('Complete');
        }
      }).catch(err => console.log(err));
    })
    .catch(error => {
      console.log(error);
    });
}
recursiveAPI(1, true);
