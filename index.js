'use strict';

var express = require('express');
var bodyParser = require('body-parser');
const fs = require('fs');
const fetch = require("node-fetch");
global.Headers = fetch.Headers;

var app = express();

// The request body is received on GET or POST.
// A middleware that just simplifies things a bit.
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));

// Start the server
app.listen(8080);
console.log('Listening on port 8080');

async function getRefreshToken() {
  var username = "BankinClientId";
  var password = "secret";

  const url = "http://localhost:3000/login";
  const data = {
    user: "BankinUser",
    password: "12345678"
  }

  var myHeaders = new Headers();
  myHeaders.set('Authorization', 'Basic ' + Buffer.from(username+":"+password).toString('base64'));
  myHeaders.set('content-type', "application/json");
  const otherParam = {
    headers:myHeaders,
    body: JSON.stringify(data),
    method:"POST"
  };
  var response = await fetch(url, otherParam)//.then(res=> res.json())//.then(res=>{refresh_token = res});
  var refresh_token = await response.json()
  return refresh_token;

}

async function getAccessToken(refresh_token){
  const url = "http://localhost:3000/token";

  var myHeaders = new Headers();
  //myHeaders.set('Authorization', 'Basic ' + Buffer.from(username+":"+password).toString('base64'));
  myHeaders.set('content-type', "application/x-www-form-urlencoded");
  var data = "grant_type=refresh_token&refresh_token=" + refresh_token;
  const otherParam = {
    headers:myHeaders,
    body: data,
    method:"POST"
  };
  var response = await fetch(url, otherParam)//.then(res=> res.json())//.then(res=>{refresh_token = res});
  var access_token = await response.json()
  return access_token;
}

async function getAccountTransactions(access_token){
  var url = "http://localhost:3000/accounts";
  var myHeaders = new Headers();
  myHeaders.set('content-type', "application/json");
  myHeaders.set('Authorization', 'Bearer ' + access_token);
  var otherParam = {
    headers:myHeaders,
    method:"GET"
  };
  var response = await fetch(url, otherParam)//.then(res=> res.json())//.then(res=>{refresh_token = res});
  var accounts = await response.json()

  var result = [];
  for (var account of accounts["account"]){
    var item = {}
    item["acc_number"] = account["acc_number"];
    item["amount"] = account["amount"];
    let acc_url =  "http://localhost:3000/accounts/" + account["acc_number"] + "/transactions";
    let acc_response = await fetch(acc_url, otherParam);
    let transactions = await acc_response.json();
    item["transactions"] = [];
    for (var transaction of transactions["transactions"]){
      //var toadd = ;
      item["transactions"].push(JSON.stringify({"label":transaction["label"], "amount":transaction["amount"], "currency":transaction["currency"]}));
    }
    result.push(item);
  }


  return result;
}

async function main() {
  const refresh_token = await getRefreshToken();
  const access_token = await getAccessToken(refresh_token["refresh_token"]);
  const account_transactions = await getAccountTransactions(access_token["access_token"]);
  console.log(account_transactions);
  return account_transactions;
}


main();