# Project Title
REST API client to consume a large JSON message in chunks

## Description
2 different ways of calling a REST API that implements pagination. The API provides a subset of JSON responses and needs to be itirated.

### Option 1: Call API
a stand alone node JS client which calls the API and stores the data in a csv file

### Option 2: index.js
AWS lambda to calla the API and store the csv in a S3 bucket

## Dependencies
Node JS followed by npm packages like axios, json-2-csv

## Get Running
Run the command npm install --save

## Authors
Sudip Pal

## License
Apache 2.0
