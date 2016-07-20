var express = require('express');
var router = express.Router();
var api = require('../lib/api');
var getUtilitiesObj = (function(){
	/*
	* Author: Anshul Jain
	* Created On: 19th July 2016
	* Description: A filter builder which will evaluate the eiligiblity of an object based on the existence of the subObject in that object.
	*			- It supports AND operation on the keys e.g.
	*				SubObj: {'a':'val1','c':'val3'} will make following cases eligible
	*				objArray[i]: {'a':'val1','b':'val2','c':'val3'}
	*				objArray[i]: {'a':'val1','b':'val3','c':'val3'}
	*			- It supports OR operation on the keys e.g.
	*				SubObj: {'a|b':'val1'} will make following cases eligible
	*				objArray[i]: {'a':'val1','b':'val2'}
	*				objArray[i]: {'a':'val2','b':'val1'}
	*				objArray[i]: {'a':'val1','b':'val1'}
	*			- It supports combinations of AND and OR operations on the keys e.g.
	*				SubObj: {'a|b':'val1','c':'val3'} will make following cases eligible
	*				objArray[i]: {'a':'val1','b':'val2','c':'val3'}
	*				objArray[i]: {'a':'val2','b':'val1','c':'val3'}
	*				
	* Input: Takes an optional parameter of customEligibilityChecker for building a new filter.
	*
	* Output: A function which takes following as input
	*		objArray: Array of object which needs to be filtered
	*		subObj: The object which should be present in the parent object.
	*/
	var objsFilterBuilder = function(customEligibilityChecker){
		var defaultEligibilityChecker = function(parentObj,subObjVal,key){
			return (parentObj[key] && parentObj[key]==subObjVal);
		},eligibilityChecker = customEligibilityChecker || defaultEligibilityChecker;
		
		return function(objArray, subObj){
			var output = objArray.filter(function(parentObj,idx){
				var isEligible = false,i,str_i;
				for(i in subObj){
					str_i = i+''; // typeCasting the key into a String
					if(str_i.indexOf('|')==-1){
						if(eligibilityChecker(parentObj,subObj[i],i))
							isEligible = true;
						else{
							isEligible = false;
							break;
						}
					}
					else{
						// Support for OR operation
						var multiKeys = str_i.split('|'),k,f=false;
						for(k in multiKeys){
							if(eligibilityChecker(parentObj,subObj[i],multiKeys[k])){
								f = true;
								break;
							}
						}
						isEligible = f;
					}
				}
				return isEligible;
			});
			return output;
		};
	}

	



	var singletonObj = Object.create(null);
	Object.defineProperties(singletonObj,{
		filterObjs:{value:objsFilterBuilder()}
		,searchObjs:{value:objsFilterBuilder(function(parentObj,subObjVal,key){
			return (parentObj[key] && parentObj[key].indexOf(subObjVal)!=-1);
		})}
	});

	return function(){
		return singletonObj;
	};
})();


/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index');
});

/*
* Task 1:
* Make models alphabetically sortable (ascending, descending, default)
*/
router.get('/models', function(req, res, next) {
	// use api to get models and render output
	api.fetchModels().then(function(models){
		models = models || [];
		switch(req.query.sort){
			case 'desc':models.sort().reverse();
				break;
			case 'asc':models.sort();
				break;
		}
		res.render('models', {models: models,sortedOn:(req.query.sort?req.query.sort:'')});
	});
});

/*
* Task 2:
* Make services filterable by type (repair, maintenance, cosmetic)
*/
router.get('/services', function(req, res, next) {
	// use api to get services and render output
	api.fetchServices().then(function(services){
		if(req.query.type){
			services = getUtilitiesObj().filterObjs(services,{'type':req.query.type});
		}
		res.render('services', {services: services,filteredOn:req.query.type?req.query.type:''});
	});
});

/*
* Task 3:
* Bugfix: Something prevents reviews from being rendered
* Make reviews searchable (content and source)
*/
router.get('/reviews', function(req, res, next) {
	return Promise.all([api.fetchCustomerReviews(), api.fetchCorporateReviews()])
		.then(function(reviews) {
			var combinedReviews = [];
			reviews.forEach(function(val){combinedReviews = combinedReviews.concat(val);});
			if(req.query.searchterm)
				combinedReviews = getUtilitiesObj().searchObjs(combinedReviews,{'content|source':req.query.searchterm});
			
			res.render('reviews', {reviews: combinedReviews,searchterm:req.query.searchterm});
		});
});

module.exports = router;
