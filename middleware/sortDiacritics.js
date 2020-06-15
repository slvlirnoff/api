const _ = require('lodash');
const stable = require('stable');
const logger = require('pelias-logger').get('api');

function setup() {
  function middleware(req, res, next) {
    // bail early if req/res don't pass conditions for execution or there's no data to sort
    if (_.isEmpty(res.data)) {
      return next();
    }

    // capture the pre-sort order
    const presort_order = res.data.map(_.property('_id'));

    let input = req.query.text;
    let lower = _.toLower(input);
    let hasDiacritics = input.normalize('NFD').replace(/[\u0300-\u036f]/g, "") != input;

    let inputParts = lower.replace(/,/g, "").split(' ');
    logger.info('diacritics', {
    	input: input,
    	lower: lower,
    	hasDiacritic: hasDiacritics,
    	lowerParts: inputParts,
	elements: res.data.length
    });

    function sortByDiacritics(a, b) {
    	let aParts = _.toLower(_.flatten(a.name.default).join(" ")).replace(/,/g, "").split(" ");
    	let bParts = _.toLower(_.flatten(b.name.default).join(" ")).replace(/,/g, "").split(" ");

    	let aMatch = true;
    	let bMatch = true;
    	_.each(inputParts, (part) => {
		if(part.length < 3) {
			return;
		}
    		if(_.includes(aParts, part)) {
    			aMatch = aMatch && true;
    		} else {
    			aMatch = false;
    		}
    		if(_.includes(bParts, part)) {
    			bMatch = bMatch && true;
    		} else {
    			bMatch = false;
    		}
    	});
//	logger.info('diacritics', {a:aParts,b:bParts,aMatch:aMatch,bMatch:bMatch});

    	if(aMatch && !bMatch) {
    		return -1;
    	} else if(aMatch == bMatch) {
    		return 0; //_.findIndex(presort_order, a._id) - _.findIndex(presort_order, b._id);
    	} else {
    		return 1;
    	}
    }


    // stable operates on array in place
    stable.inplace(res.data, sortByDiacritics);

    logger.info('diacritics[best]', res.data[0]);

    // capture the post-sort order
    const postsort_order = res.data.map(_.property('_id'));

    // log it for debugging purposes
    logger.info([
      `diacritics test req.clean: ${JSON.stringify(req.clean)}`,
      `pre-sort: [${presort_order}]`,
      `post-sort: [${postsort_order}]`
    ].join(', '));

    next();
  }

  return middleware;

}

module.exports = setup;
