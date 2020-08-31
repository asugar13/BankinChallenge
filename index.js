'use strict';

var express = require('express');
const fetch = require("node-fetch");
global.Headers = fetch.Headers;

var app = express();

// Start the server
app.listen(8080);
console.log('Listening on port 8080');
//simple async function to get the refresh_token
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
  var response = await fetch(url, otherParam);
  var refresh_token = await response.json();
  return refresh_token;
}

//simple async function to get the access_token from the refresh_token
async function getAccessToken(refresh_token){
  const url = "http://localhost:3000/token";

  var myHeaders = new Headers();
  myHeaders.set('content-type', "application/x-www-form-urlencoded");
  var data = "grant_type=refresh_token&refresh_token=" + refresh_token;
  const otherParam = {
    headers:myHeaders,
    body: data,
    method:"POST"
  };
  var response = await fetch(url, otherParam);
  var access_token = await response.json();
  return access_token;
}

//recursive function to traverse the different account pages and get unique accounts
async function recursiveAccounts(access_token, accountArray, accounts){
  if (accounts["link"]["next"] != null){
    var url = "http://localhost:3000" + accounts["link"]["next"];
    var myHeaders = new Headers();
    myHeaders.set('content-type', "application/json");
    myHeaders.set('Authorization', 'Bearer ' + access_token);
    var otherParam = {
      headers:myHeaders,
      method:"GET"
    };
    var response = await fetch(url, otherParam);
    var the_accounts = await response.json();

    for (var account of the_accounts["account"]){
      var alreadyExists = false;
      for (var item of accountArray){
        if (item["acc_number"] == account["acc_number"]){
          alreadyExists = true;
        }
      }
      if (!alreadyExists){
        accountArray.push({acc_number: account["acc_number"], amount:account["amount"]})
      }
    }
    return recursiveAccounts(access_token, accountArray, the_accounts);
  }
  else {
    return accountArray;
  }
}
//recursive function to traverse the different transaction pages and get unique transactions
async function recursiveTransactions(access_token, transactions, transactionArray){
  if (transactions["link"]["next"] != null){
    var url = "http://localhost:3000" + transactions["link"]["next"];
    var myHeaders = new Headers();
    myHeaders.set('content-type', "application/json");
    myHeaders.set('Authorization', 'Bearer ' + access_token);
    var otherParam = {
      headers:myHeaders,
      method:"GET"
    };
    var response = await fetch(url, otherParam);
    var newtransactions = await response.json();
    for (var transaction of newtransactions["transactions"]){
      var alreadyExists = false;
      for (var item of transactionArray){
        if (item["label"] == transaction["label"]){
          alreadyExists = true;
        }
      }
      if (!alreadyExists){
        transactionArray.push({label: transaction["label"], amount: transaction["amount"], currency:transaction["currency"]});
      }
    }
    return recursiveTransactions(access_token, newtransactions, transactionArray);
  }
  else {
    return transactionArray;
  }
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
  var response = await fetch(url, otherParam);
  var accounts = await response.json();

  var initAccounts = [];
  for (var account of accounts["account"]){
    var item = {}
    item["acc_number"] = account["acc_number"];
    item["amount"] = account["amount"];
    initAccounts.push(item);
  }
  var allAccounts = await recursiveAccounts(access_token, initAccounts, accounts);

  for (var account of allAccounts){
    let acc_url =  "http://localhost:3000/accounts/" + account["acc_number"] + "/transactions";
    let acc_response = await fetch(acc_url, otherParam);
    try {var transactions =  await acc_response.json();} catch(err){account["transactions"] = [];};
    var initTransactions = [];
    for (var transaction of transactions["transactions"]){
      initTransactions.push({"label":transaction["label"], "amount":transaction["amount"], "currency":transaction["currency"]});
    }
    account["transactions"] = await recursiveTransactions(access_token, transactions, initTransactions);
  }
  return allAccounts;
}

async function main() {
  const refresh_token = await getRefreshToken();
  const access_token = await getAccessToken(refresh_token["refresh_token"]);
  const account_transactions = await getAccountTransactions(access_token["access_token"]);
  console.log(JSON.stringify(account_transactions, null, 4));
  return account_transactions;
}

main();
