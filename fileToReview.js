
var domain = "bank.local.fr"

/**
 * @description Fetch transactions recursively
 * @param {string} fromDate The maximum date of transactions to return
 * @param {string} authorization Authorization header to authent the user
 * @param {jws} jws Jws token, mandatory if we get one from login request
 * @param {Number} id Account id
 * @param {Number} page Number of the page
 * @param {Object} previousTransactions Previous page of transactions (To ckeck for dupes)
 * @return {Object} All transactions available on the page
 */
 //fromDate variable name is not ideal. Should be untilDate.
 //authorization can be switched to refresh_token
 //jws can be switched to access_token
 //id can be called account_id
async function fetchTransactions(fromDate, authorization, jws = null, id, page, previousTransactions) {
	console.log(`--- Fetch Trasactions page n°${page} ---`);
	try {
    var headers = {"Authorisation":  authorization }
    if (jws) {//jws should always be present
      headers = {
        "Authorisation": authorization, //string name should be Authorization
        "jws": jws,
        "Content-type": "application/json",
        "Accept": "application/json" //don't need Accept on client side
      }
    } else {
      headers = {
        "Authorisation": authorization,
        "Content-type": "application/json", //content-type is all lowercase
        "Accept": "application/json",
      }
    }//headers object should be defined outside of conditional statement and without jws field
		//the jws field can be added after, once we check if it exists. less lines of code

	  var {code, response } = await doRequest('GET',
      domain + '/accounts/'+ id + '/transactions?' + `page=${page}`,
      headers);


		if (response && code == 200 && response.data) { //if (response.data && code ==200)
      if (response.data.meta) { //redundant...
        if (response.data.meta.hasPageSuivante) {
          let mouvements = response.data.Mouvements;
          var date = mouvements[mouvements.length -1].dateValeur;
          if (date <= fromDate) { //again, confusing variable name. use currentDate and untilDate/finalDate and condition should be >
            console.log("FromDate is Reached - we don't need more transaction");//transaction(s)
          } else {
            if (mouvements) { //we know we have this since date comes from mouvements...redundant
              if (assertTransactions(mouvements)) {
                return []; //this should console.log what's on line 56
              } else {
                console.log(`Push transactions from page ${page}`); //this could return [] instead
              }
            } else {
              throw new Error("Empty list of transactions ! " + JSON.stringify(previousTransactions)); //this should be inside previous conditional scope
            }
            let nextPagesTransactions = fetchTransactions(fromDate, authorization, (jws || null), id, page + 1, mouvements); //jws||null is a boolean value!
            response.data.Mouvements = mouvements.concat(nextPagesTransactions);
          }
        }
      }
      return response.data.Mouvements; //this should return the recursive call...
    } else throw new Error(); //this should print an error message

    return []; //should delete this. no point on returning empty array here.
	} catch (err) {
		throw new CustomError({
      function: 'fetchTransactions',
			statusCode: 'CRASH', //this should return a number
			rawError: e, //should be err instead
		});
	}
}
