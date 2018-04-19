/*
 * Requires:
 *     psiturk.js
 *     utils.js
 */

// Initalize psiturk object
var psiTurk = new PsiTurk(uniqueId, adServerLoc, mode);

//for testing:
//psiTurk.taskdata.set('condition', 1);

var mycondition = condition;  // these two variables are passed by the psiturk server process
var mycounterbalance = counterbalance;  // they tell you which condition you have been assigned to

// ** NOTE about conditions:
// - 0: shows text about random family
// - 1: does not show text about random family

// All pages to be loaded
var pages = [
	"monsters.html"
];


// Stimuli
// *** these are mostly parameters pertaining to the monster families themselves, and the images used for them/the food
var stim = {
	monsterDirectory: "/static/stimuli/monsters/", //monster stimuli location
	monsterPreviewDirectory: "/static/stimuli/monsters-preview/", //monster button image location
	foodDirectory: "/static/stimuli/food/", //food stimuli location
	feedbackDirectory: "/static/stimuli/feedback/", //feedback stimuli location
	numFamilies: 4, //can set this to number of directories to use for the future (not in use currently)
	monsterFamilies: ["Bear", "Bunny", "GreenMonster", "Squid"],
	monsterFeatures: { //these are in the order for matching the filenames
		"Bear": ["width", "height"],
		"Bunny": ["star size", "ear size"],
		"GreenMonster": ["eye size", "neck length"],
		"Squid": ["tentacle length", "eye separation"]
	}, //possible changing feeatures for each family
	monsterFoods: {
		"Bear": [],
		"Bunny": [],
		"GreenMonster": [],
		"Squid": []
	}, //food options will be assigned randomly for each participant
	swapFoodOrder: { //randomize which button the food is assigned to (this ensures that the lowest end of a dimension doesn't always like the food on the left)
		"Bear": false,
		"Bunny": false,
		"GreenMonster": false,
		"Squid": false
	}, // this also keeps it consistent for each monster family throughout the entire task
	predictiveValidityOptions: [1.0, 0.75, 0.5, 0.5], //possible predicitive validity values that are randomly assigned to each monster
	dimensionLength: 6, //this keeps track of the maximum length for the 2 dimensions of each monster family
	numFoodOptions: 2, //number of food options for each family (not in use currently)
	foodOptions: [["carrot", "broccoli"], ["pancakes", "waffles"], 
				   ["bananas", "oranges"], ["tacos", "grilled_cheese"]]
};

// Parameters
// *** these are mostly timing/trial parameters
var p = {
	//other parameters needed by the experiment
	feedbackTime: 1000, //time to wait for next trial to start, in ms
	iti: 250, //time before new monster image appears for the next trial
	//playTime: 15 //in minutes
	numTrainTrials: 1, //15, //this is PER family
	minForcedTrials: 4, //min number of trials a participants can do for one family
	maxForcedTrials: 40, //max number of trials a participants can do for one family
	previewTime: 1000, //how long the preview image will show for a monster before each block in
					   //training
	interestPromptFrequency: 4 //after how many trials will we prompt participant if they are still interested or not
};

// Data
// *** individual data storage and other variables (like state trackers)
var d = {
	familyOrder: _.shuffle(stim.monsterFamilies), //set this for each participant
	//categoryOrder: [], //stores the order of categorization with numerical indices
	//categoryAssignment: [], //will store what categorization task is assigned to each family
	pvOrder: [], //stores the order of pv with numerical indices
	pvAssignment: [], //will store what percentage of predictive validity is assigned to each family
	pvFeature: [], //will store which feature was chosen to be affected by predictive validity for each family (0 or 1, for which dimension)
	pvPreferredFood: [], //select which food is preferred based on the affected feature (when the "value" of the feature is more than halfway, 
						//then this food is preferred) (0 or 1, based on order in monsterFoods)
	monster: [], //stores what monster was displayed
	preferredFood: [], //which food the monsters in the array above like to eat
	foodConfidenceRating: [], //how confident participant is about monster's food preference
	featureConfidenceRating: [], //how confident participant is about which feature affects food preference
	interestRating: [],
	choice: [], //stores participant choice
	correct: [], //stores if the participant was correct
	taskStartTime: -1, //keeps track of unix start time for task
	trialStartTime: [], //stores trial start time (in relation to start of the task)
	rt: [], //stores participant reaction time
	blockTrial: [], //stores the trial number based on each family,
	family: [], //stores monster family being learned about
	trialState: [], //stores what state the trial was completed at (train or free)
	//timerStarted: false,
	//currentTimerTime: 0,
	//timerID: -1,
	currentState: "train", //there are 2 states for this version: "train" and "free"
	//counterStarted: false, //keeps track of if the trial counter has started or not
	remainingTrainTrials: 0, //keeps track of how many overall trials are left for the training stage
	remainingFamilyTrials: 0, //keeps track of how many family trials are left during the training stage
	currentTrainFamily: 0,
	trainFamilyOrder: _.shuffle(stim.monsterFamilies), //order to present families in
	trialInProgress: false, //keeps track if there is currently a trial giving feedback
	switchFamily: false, //keeps track if there has been a request to switch to a new family;
						//need to wait before a monster family is switched to during feedback time
	familyToSwitchTo: null, //what family is next,
	currentFamilyTrial: 0, //keeps track of number of trials completed so far for a family
	currentFamilyNum: 0 //keeps track of which family is currently being presented
};



// *** now determine predictive validity and food options/preferences for each monster family:
//first assign predictive validity percentages and food preferences to each monster family at random
d.pvOrder = _.shuffle(stim.predictiveValidityOptions);
var foodAssignments = _.shuffle(stim.foodOptions);

for (var i=0; i < stim.numFamilies; i++) {
	d.pvAssignment[stim.monsterFamilies[i]] = d.pvOrder[i];

	//also randomly choose which feature will be the predictive feature for each monster family
	// the number refers to the order the features are referred to in the filenames
	d.pvFeature[stim.monsterFamilies[i]] = _.random(0,1);

	//randomly determine if food order should be swapped or not
	stim.swapFoodOrder[stim.monsterFamilies[i]] = Math.random() >= 0.5;

	//assign what foods this monster chooses between
	stim.monsterFoods[stim.monsterFamilies[i]] = foodAssignments[i];

	//assign food preferences based on the affected feature (predictive validity)
	var foodPreferredIndex = _.random(0,1);
	d.pvPreferredFood[stim.monsterFamilies[i]] = foodPreferredIndex;
}


//record information about the family and categorization setup
psiTurk.recordUnstructuredData('familyOrder', d.familyOrder);
psiTurk.recordUnstructuredData('categoryAssignment', d.categoryAssignment);
// Preload pages
psiTurk.preloadPages(pages);


/*******************
 * Run Task
 ******************/

//setup experiment
$(document).ready(initialize);

// This initializes the instructions, setups buttons, and then makes call to preload feedback
function initialize() {


	psiTurk.showPage("monsters.html"); //show the page
	$("#sound_warning").hide();

	//preload task stimuli and feedback
	setupStimuli();

	$("#continue-button").click(checkAgreement);
	$("#sound_check").click(playSoundCheck);


	$("#next-button").click(function() {
		$("#instructions-2").hide();
		$("#instructions-3").show();
	});

	$("#start-button").click(function() {
		psiTurk.finishInstructions(); //marks MTurker as starting the task
		$("#instructions-3").hide();

		// *** note: for the real task, you'll probably want to start with training first, before going to the main task
		//startTraining(); //start the first forced choice section
		startFreeChoice(); //go directly to main task
	})

	//button to check responses for post training question
	// *** note: post-training questions not in use currently
	//$("#post-train-button").click(checkPostTrainResponses);

	// appears at the end of the free exploration
	$("#stop-button").click(gotoNextSection);

	// setup sliders
	// (reversing them so that the largest number is at the top)
	$("#food-slider").slider({
		reversed: true
	});

	$("#feature-slider").slider({
		reversed: true
	});

	$("#interest-slider").slider({
		reversed: true
	});


	//setup random order of monsters for this participant
	//(these previews are used before each family during the training section)
	for (var i = 0; i < stim.numFamilies; i++) {
		var monsterPreview = stim.monsterPreviewDirectory + d.familyOrder[i] + ".png";
		//instruction images
		$("#monster-example-" + (i+1)).attr("src", monsterPreview);

		//main selection
		$("#monster-btn-" + (i+1)).val(d.familyOrder[i]);
		$("#monster-btn-" + (i+1) + " img").attr("src", monsterPreview);

		//side selection
		$("#monster-side-btn-" + (i+1)).val(d.familyOrder[i]);
		$("#monster-side-btn-" + (i+1) + " img").attr("src", monsterPreview);

		//final images
		$("#monster-final-" + (i+1)).attr("src", monsterPreview);
	}


	//add callback to monster buttons
	// *** note: currently not used since we select the next monster family for them
	// $(".monster-family").click(function() {
	// 	gotoFamily(this.value);
	// });
	// $(".monster-family-small").click(switchFamily);

	//hide continue button
	$("#stop-button").hide();

	//callback for submit post-task questions button
	$("#submit-button").click(submitData);

	//end the task button
	// *** note: not needed right now since we go directly to mturk 
	// after submitting the final questions
	// (before, we shoed participants how well they did overall at the end)
	//$("#end-button").click(gotoMTurk);

	//show different instructions depending on the condition
	//note: not sure if this will be used in this latest version of the task?
	if (mycondition == 1) {
		$("#random-instructions").hide();
	}


}

// Preload images and sounds for trial stimuli and feedback
function setupStimuli() {
	//all monster images
	//attempting to preload at the very start of the experiment, rather than in between blocks
	for (var f = 0; f < stim.numFamilies; f++) {
		for (var i = 1; i <= stim.dimensionLength; i++) {
			for (var j = 1; j <= stim.dimensionLength; j++) {
				var monsterName = stim.monsterFamilies[f] + "_" + i + "_" + j;

				//preload image
				var image = new Image();
				var monsterFile = stim.monsterDirectory + monsterName + ".png";
				image.src = monsterFile;
			}
		}
	}
	
	// correct and incorrect image files
	stim.correct = stim.feedbackDirectory + "yum.png";
	stim.incorrect = stim.feedbackDirectory + "yuck.png";

	//preload feedback images
	var imageCorrect = new Image();
	imageCorrect.src = stim.correct;
	var imageIncorrect = new Image();
	imageIncorrect.src = stim.incorrect;

	//correct and incorrect sound files
	stim.correctSound = stim.feedbackDirectory + "mmm.mp3";
	stim.incorrectSound = stim.feedbackDirectory + "raspberry_grosser.mp3";
	stim.soundCheck = stim.feedbackDirectory + "banana.mp3";

	//preload sounds
	var queue = new createjs.LoadQueue();
	queue.installPlugin(createjs.Sound);
	queue.addEventListener("complete", handleComplete);
	queue.loadManifest([
		{ 
			id: 'soundCheck',
			src: stim.soundCheck
		},
		
		{ 
			id: 'correctSound',
			src: stim.correctSound
		},
		{
			id: 'incorrectSound',
			src: stim.incorrectSound
		}]);
}

// Move onto the actual task once the feedback stimuli is done preloading
function handleComplete(event) {
	$("#loading").hide();
	startTask(); // show instructions
	//gotoSelection();
}

// Display monster selection page
// *** note: not currently in use since we choose the monster family for them
// function gotoSelection() {
// 	$("#selection").show();
// 	$("#exploration").hide();
// 	$("#results").hide();
// 	$("#task").show();

// 	// //set number of trials remaining
// 	// d.remainingFreeTrials = p.numFreeTrials;

// 	// //update counter text
// 	// $("#counter").text(d.remainingFreeTrials);

// 	// //start task timer
// 	// d.taskStartTime = Date.now();
// }

// show the initial task instructions
function startTask() {
	$("#instructions-1").show();
}

// make sure they agreed to all the initial questions
function checkAgreement() {
	var count = 0;
	var stay = false;
	$('#instructions-1 input[type=radio]:checked').each(function() {
		count++;
		if ($(this).val() != "agree") {
			stay = true;
		}
	});

	var typed_word = $('#i3-sound').val();
	if (((typed_word) != "banana") && typed_word != "Banana") {
		stay = true;
		$("#sound_warning").show();
		

	} 
	else if (count == 2 && !stay) {
		$("#instructions-1").hide();
		$("#instructions-2").show();
	}
	else {
		$("#warning").show();
	}
}

function playSoundCheck() {
	createjs.Sound.play('soundCheck');

}
//during the training section, before each monster family, show a preview of the monster family
// *** note: here, you'll probably want to add what features vary for each monster family too
function showBlockPreview() {
	$("#prompt").hide();
	$("#monster").hide();
	$("#family-label").show();
	$("#next-monster-preview").attr('src', stim.monsterPreviewDirectory + 
		d.trainFamilyOrder[d.currentTrainFamily] + ".png");
	$("#next-monster-preview").show();

	setTimeout(function() {

			$("#family-label").hide();
			$("#next-monster-preview").hide();
			$("#next-monster-preview").attr('src','');
			$("#prompt").show();
			//$("#monster").hide();

			//move onto trials
			gotoFamily(d.trainFamilyOrder[d.currentTrainFamily]);
		}, p.previewTime);
}

// start the training section
function startTraining() {
	//update state
	d.currentState = "train";

	//update trial counters
	d.remainingTrainTrials = p.numTrainTrials * stim.monsterFamilies.length;
	d.remainingFamilyTrials = p.numTrainTrials;

	//set trial label
	$("#trial-label").text("Intro");

	//update counter text
	// *** note: not sure if this should be kept or not (it's also commented out for the HTML page)
	// $("#counter").text(d.remainingTrainTrials);

	//$("#selection").hide();
	//$("#play-time-div").hide();
	//$("#post-train-questions").hide();
	//$("#new-family").hide();
	$("#exploration").show(); //show monster family content (food, questions, etc.)
	//$("#results").hide();
	$("#task").show();

	//start task timer
	d.taskStartTime = Date.now();

	//display preview screen for the first monster
	showBlockPreview();
}

// start the main task
// *** note: it's called free choice based on an old version, but this is just the main experiment
function startFreeChoice() {
	//update state
	d.currentState = "free";

	//set number of trials remaining
	d.remainingFreeTrials = p.numFreeTrials;

	//update counter text
	// *** note: not sure if keeping this or not
	//$("#counter").text(d.remainingFreeTrials);

	//show relevant content
	$("#stop-button").hide();
	$("#complete-message").hide();
	//$("#post-train-questions").hide();
	//$("#selection").show();
	//$("#play-time").show();
	//$("#new-family").show();

	$("#exploration").hide();
 	$("#prompt").show();
 	$("#monster-div").show();
	$("#results").hide();
	$("#task").show();

	//set trial label
	//$("#trial-label").text("Free Choice");

	//go to the first assigned family
	gotoFamily(d.familyOrder[0]);

}

// task state control
// (pretty straightforward since there are really only 3 sections to this task:
// training, main task, post-task questions)
function gotoNextSection() {
	if (d.currentState == "train") {
		startFreeChoice();
	}
	else if (d.currentState == "free") {
		endExpt();
	}
}



/********* Monster Family "class" ************/
// *** this is a really big class that stores parameters for the current family, and
// controls the presentation of each individual monster within a monster family
// a new MonsterFamily is created every time the family type switches

var MonsterFamily = function(family) {
	//get data for this monster family
	var features = []; //gets the monster's changing features that may affect food preference
	var dimensions = []; //store the dimension values for the current monster
	var trialStartTime = 0; //stores trial start time in relation to start of task
	var startTime = 0; //start time for calculating response time
	var endTime = 0; //end time for calculating response time
	var curTrial = 0; //keeps track of current trial
	var curMonster = ""; //keeps track of current monster name
	var numPrevTrials = d.correct.length; //number of trials already completed in previous "blocks"

	//get features of this monster for labeling the slider scale
	features = stim.monsterFeatures[family];

	//add labels (for now, just going in order, but may want to randomize this)
	$("#feature1").text(features[0]);
	$("#feature2").text(features[1]);

	//get food images
	var foodFile1 = stim.foodDirectory + stim.monsterFoods[family][0] + ".png";
	var foodFile2 = stim.foodDirectory + stim.monsterFoods[family][1] + ".png";

	// this decides which button is assigned which food
	// (mostly for randomization/counterbalancing)
	if (stim.swapFoodOrder[family]) {
		//assign food to buttons
		$(".foodImage1").attr('src', foodFile2);
		$(".foodImage2").attr('src', foodFile1);

		//also assign value to the buttons
		$("#food1").attr('value', stim.monsterFoods[family][1]);
		$("#food2").attr('value', stim.monsterFoods[family][0]);
	}
	else {
		//assign food to buttons
		$(".foodImage1").attr('src', foodFile1);
		$(".foodImage2").attr('src', foodFile2);

		//also assign value to the buttons
		$("#food1").attr('value', stim.monsterFoods[family][0]);
		$("#food2").attr('value', stim.monsterFoods[family][1]);
	}

	// hide all inputs/buttons first
	$(".slider-rating").hide();
	$("#prompt").hide();
	$("#new-family-btn").hide();

	//check if we need to reset the counter when we're in the main task
	if (d.currentState == "free") {
		d.currentFamilyTrial = 0;
		console.log('reset forced trials to: ' + d.currentFamilyTrial);
	}

	// Present next monster trial
	getNextMonster = function() {
		$("#feedback-div").hide();
		$("#feedback").attr('src', ''); //reset feedback
		$("#selected-food").attr('src', ''); //reset feedback
		$("#monster").attr('src', ''); //set monster image as blank before loading new one
		//$("#monster").hide();
		$("#monster-img-div").css("visibility", "hidden"); // need the layout to stay the same, so changing visibility instead of display
		curTrial++; //update trial number

		//inactivate food buttons
		$(".food-button").prop("disabled", true);

		setTimeout(function() {
			d.trialInProgress = false;

			//activate new family button if it's visible at this point
			$("#new-family-btn").prop("disabled", false);

			//check if the family needs to be switched at this point
			//(this ensures a family switch only occurs when a trial is completed, or when a trial hasn't been started yet)
			if (d.switchFamily) {
				d.switchFamily = false;
				gotoFamily(d.familyToSwitchTo);
			}
			else {
				//for now, we're randomly returning a monster (may want to change this later)
				//randomly select numbers for the two dimensions
				dimensions = [_.random(1,stim.dimensionLength), _.random(1,stim.dimensionLength)];

				//combine to make monster filename
				curMonster = family + '_' + dimensions[0] + '_' + dimensions[1];
				
				//set new monster image on the screen
				var filename = stim.monsterDirectory + curMonster + ".png";
				$("#monster").attr('src', filename);
				$("#monster-img-div").css("visibility", "visible"); //now make it visible again
				//$("#monster").show();

				// show food buttons
				showFoodOptions();

				//get trial start time (relative to start of task)
				trialStartTime = (Date.now() - d.taskStartTime);
			}

		}, p.iti); // wait the intertrial interval time before displaying next trial
	}

	//display food options 
	showFoodOptions = function() {
		//activate food buttons
		$(".food-button").prop("disabled", false);

		//record reaction time start time
		startTime = Date.now();

		// now show question about what food they think the monster likes
		$("#question").show();
		$("#prompt").show();
	}

	// Get participant's choice for monster-food pairing
	getResponse = function() {
		endTime = Date.now(); //get response end time

		//inactivate new family button if it's visible at this point
		// (they can't switch to a new family once they've already started answering about one)
		$("#new-family-btn").prop("disabled", true);

		//set this trial as being in progress
		d.trialInProgress = true;

		var foodSelected = this.value; //get which food was selected

		// determine if correct based on the predictive validity of the monster family
		// choose a random number between 0-1:
		var trialFraction = Math.random();

		// create variables for storing monster's preferred and non-preferred foods
		var preferredFood = '';
		var nonPreferredFood = ''; //not actually used, but helps for easily keeping track of preferred vs. not
		
		//set default preferred and non-preferred food
		// in the default case, the "preferred" food, is food that's preferred for the chosen feature at its higher values
		// e.g. very tall bears, long-eared bunnies, etc. 
		if (d.pvPreferredFood[family] == 0) {
			preferredFood = stim.monsterFoods[family][0];
			nonPreferredFood = stim.monsterFoods[family][1];
		}
		else {
			preferredFood = stim.monsterFoods[family][1];
			nonPreferredFood = stim.monsterFoods[family][0];
		}	

		// now, if the randomly selected value is greater than the assigned pv,
		// this means we need to have the monster prefer its NON-preferred food at that feature's threshold value
		// *** in the current version, the threshold is at HALF of the total dimension size
		if (trialFraction >= d.pvAssignment[family]) {
			if (dimensions[d.pvFeature[family]] > stim.dimensionLength/2) {
				preferredFood = nonPreferredFood;
			}
		}
		else { //otherwise, at lower values of the selected dimension, have it prefer the "nonPreferredFood"
			if (dimensions[d.pvFeature[family]] <= stim.dimensionLength/2) {
				preferredFood = nonPreferredFood;
			}
		}

		// debugging stuff
		console.log('dimension we care about: ' + d.pvFeature[family]);
		console.log('dimension value: ' + dimensions[d.pvFeature[family]]);
		console.log('trial fraction: ' + trialFraction);
		console.log('assigned pv: ' + d.pvAssignment[family]);
		console.log('preferred food chosen: ' + preferredFood);

		//store results
		d.choice.push(foodSelected);
		d.preferredFood.push(preferredFood);
		d.correct.push(preferredFood == foodSelected);

		// record response time
		d.rt.push(endTime - startTime);

		//remove focus from button so that it does not appear selected for the next trial
		this.blur();

		// show what food the monster selected above its head
		showSelectedFood();

		//now show food confidence rating to participant
		showFoodConfidenceRating();
	}

	// display the participant's food choice above the monster's head as a reminder of what they chose
	showSelectedFood = function() {
		var selectedFoodFile = stim.foodDirectory + d.choice[d.choice.length-1] + ".png";

		$("#selected-food").attr('src', selectedFoodFile);
		$("#selected-food").show();
		$("#feedback-div").show();
	}

	// Present both visual and auditory feedback when we want to tell the participant if their choice was right
	giveFeedback = function() {
		//check if the participant was correct or not
		var correct = d.correct[curTrial + numPrevTrials - 1];

		//hide selected food and show reaction
		$("#selected-food").hide();
		if (correct) {
			$("#feedback").attr('src', stim.correct);
			var sound = createjs.Sound.play('correctSound');
		}
		else {
			$("#feedback").attr('src', stim.incorrect);
			var sound = createjs.Sound.play('incorrectSound');
		}

		$("#feedback").show();

		//show interest rating slider after the given amount of feedback time
		setTimeout(showInterestRating, p.feedbackTime);
	}

	// show confidence rating scale for what food the monster prefers
	showFoodConfidenceRating = function() {
		$("#prompt").hide();

		//show submit button
		$("#food-confidence-btn").show();
		$("#food-confidence-div").show();
	}

	//get food confidence value
	getFoodConfidenceRating = function() {
		// get response and store it
		var foodConfidence = $("#food-slider").val();
		d.foodConfidenceRating.push(foodConfidence);

		//then hide this submit button
		$("#food-confidence-btn").hide();

		//and then show the feature confidence rating
		showFeatureConfidenceRating();
	}

	//show confidence rating scale for what feature the participant thinks is associated with food preference
	showFeatureConfidenceRating = function() {
		$("#feature-confidence-div").show();
	}

	//get feature confidence value
	getFeatureConfidenceRating = function() {
		// get response and store it
		var featureConfidence = $("#feature-slider").val();
		d.featureConfidenceRating.push(featureConfidence);

		//now hide both sliders
		$("#food-confidence-div").hide();
		$("#feature-confidence-div").hide();

		//and now give trial feedback about food choice
		giveFeedback();
	}

	//show slider for how interested the participant is currently
	// (this will only appear based on the prompt frequency parameter)
	showInterestRating = function() {
		//hide food feedback
		$("#feedback-div").hide();
		$("#preferred-food").attr('src', '');
		
		//check if X trials have passed in order to show interest rating
		if (d.currentFamilyTrial % p.interestPromptFrequency == p.interestPromptFrequency-1) {
			$("#interest-div").show();	
		}
		else {
			d.interestRating.push(-1); //no interest rating needed, so put no response value
			saveTrialData(); //move onto saving data
		}
	}

	//if the interest slider was shown, get participant's rating
	getInterestRating = function() {
		//get response and store it
		var interestLevel = $("#interest-slider").val();
		d.interestRating.push(interestLevel);

		// now hide slider
		$("#interest-div").hide();

		//and save this trial's data
		saveTrialData();
	}

	// push trial data to the database
	saveTrialData = function() {
		//update data arrays
		d.trialStartTime.push(trialStartTime);
		d.blockTrial.push(curTrial);
		d.family.push(family);
		d.monster.push(curMonster);
		d.trialState.push(d.currentState);

		//save trial data
		psiTurk.recordTrialData({'state': d.currentState,
								 'trial': d.blockTrial.length,
								 'blockTrial': curTrial,
								 'trialStartTime': trialStartTime,
								 'monster': curMonster,
								 'family': family,
								 'predictiveValidity': d.pvAssignment[family],
								 'predictiveFeature': d.pvFeature[family],
								 'preferredFood': d.preferredFood[d.preferredFood.length - 1],
								 'choice': d.choice[d.choice.length - 1],
								 'correct': d.correct[d.correct.length - 1],
								 'rt': d.rt[d.rt.length - 1],
								 'foodConfidenceRating': d.foodConfidenceRating[d.foodConfidenceRating.length - 1],
								 'featureConfidenceRating': d.featureConfidenceRating[d.featureConfidenceRating.length - 1],
								 'interestRating': d.interestRating[d.interestRating.length - 1]
								});

		//send data to server database
		psiTurk.saveData();

		//prepare for next trial
		updateCounter();
	}

	// ----------------------------------------------------
	// *** the following calls initialize the monster family before we start its trials
	//assign callback to food buttons
	$(".food-button").click(getResponse);

	//setup submit buttons for confidence ratings
	$("#food-confidence-btn").click(getFoodConfidenceRating);
	$("#feature-confidence-btn").click(getFeatureConfidenceRating);
	$("#interest-btn").click(getInterestRating);

	//assign callback for new family button
	$("#new-family-btn").click(switchFamily);

	//now start presenting trials for this family
	getNextMonster();
};


// After a family is selected, create an instance of that monster family and display the exploration screen
// where the participant selects which food each monster likes
function gotoFamily(familyName) {
	//remove all references to previous monster family instance
	$(".foodImage1").attr('src', "");
	$(".foodImage2").attr('src', "");
	$("#food1").attr('value', "");
	$("#food2").attr('value', "");
	$("#feedback").attr('src', "");
	$(".food-button").unbind("click");
	$(".confidence-submit-btn").unbind("click");
	$("#new-family-btn").unbind("click");

	//hide the selection screen (if visible) and show exploration screen (if not already visible)
	//$("#selection").hide();
	$("#exploration").show();

	//create monster family instance and start the block of trials for that family
	family = new MonsterFamily(familyName);

	var selectedFamily = familyName;

	//highlight the selected button
	// $('.monster-family-small').each(function() {
	// 	if (this.value == selectedFamily) {
	// 		$(this).addClass('selected-monster');
	// 		$(this).prop("disabled", true);
	// 	}
	// 	else {
	// 		$(this).removeClass('selected-monster');
	// 		$(this).prop("disabled", false);
	// 	}
	// });

	// //start the play time timer if it hasn't started already
	// if (!d.timerStarted) {
	// 	d.timerStarted = true;
	// 	d.timerID = setInterval(updatePlayTime, 1000);
	// }
}

// if the new family button is clicked, then switch to the new family as
// long as no trial is currently in progress; if one is, queue up the next monster and wait
// until the feedback time is over
function switchFamily() {
	//move onto the next family in the randomly determined order
	d.currentFamilyNum++;

	// check we haven't reached the end yet
	if (d.currentFamilyNum < d.familyOrder.length) {
		// assign new family
		d.familyToSwitchTo = d.familyOrder[d.currentFamilyNum];
		console.log('switching to: ' + d.familyToSwitchTo);

		if (d.trialInProgress) { //if trial in progress, change state and wait until trial is done
			d.switchFamily = true;
			
		}
		else { //otherwise, immediately switch
			gotoFamily(d.familyToSwitchTo);
		}
	}
	// otherwise, no more trials, so end task
	else {
		endExpt();
	}

}

// update the number of trials completed (both for training section and main task)
function updateCounter() {
	if (d.currentState == "train") {
		d.remainingTrainTrials--;
		d.remainingFamilyTrials--;

		//update visual counter
		//$("#counter").text(d.remainingTrainTrials);

		// move onto the next family when we're out of training trials for this family
		if (d.remainingFamilyTrials == 0) {
			d.currentTrainFamily++;

			// if we're done with the training trials, then move onto the main task
			if (d.currentTrainFamily == d.trainFamilyOrder.length) {
				//$("#play-time").hide();
				
				//also show post-train question
				//setupPostTrainQuestion();

				gotoNextSection();
			}
			else {
				//reset counter
				d.remainingFamilyTrials = p.numTrainTrials;

				//display next family to be trained on
				//gotoFamily(d.trainFamilyOrder[d.currentTrainFamily]);
				showBlockPreview();
			}
		}
		else { //otherwise, stick with current monster family
			getNextMonster();
		}

	}
	else if (d.currentState == "free") {
		d.currentFamilyTrial++;
		console.log('trials completed so far: ' + d.currentFamilyTrial)

		// if over the maximum number of allowed trials, then force them to change families
		if (d.currentFamilyTrial >= p.maxForcedTrials) {
			d.trialInProgress = false;
			switchFamily();
		}
		else if (d.currentFamilyTrial >= p.minForcedTrials) {
			// display try new family button
			$("#new-family-btn").show();
			//$("#play-time").hide();
			//$("#next-section-text").text("End of Task");

 			//$("#stop-button").show();

 			// the participant can keep going if they want though
 			getNextMonster();

		}
		else { //keep going with the task
			//$("#counter").text(d.currentFamilyTrial);
			getNextMonster();
		}	
	}	
}

// function updatePlayTime() {
// 	d.currentTimerTime++;

// 	if (d.currentTimerTime > (p.playTime * 60)) {
// 		$("#play-time").hide();
// 		//$("#stop-button").click(gotoResults);
// 		$("#stop-button").click(endExpt);
// 		$("#stop-button").show();
// 		clearInterval(d.timerID);
// 	}
// 	else {
// 		//calculate minutes and seconds
// 		var minutes = Math.floor(d.currentTimerTime / 60);
// 		if (minutes < 10) {
// 			minutes = "0" + minutes.toString();
// 		}

// 		var seconds = d.currentTimerTime % 60;
// 		if (seconds < 10) {
// 			seconds = "0" + seconds.toString();
// 		}

// 		//update time display
// 		$("#timer").text(minutes + ":" + seconds);
// 	}
// }

function endExpt() {
	//send data to server
	psiTurk.saveData();

	//setup post-task questions
	setupQuestions();

	//show questions
	//$("#results").hide();
	$("#exploration").hide();
	$("#questions").show();
}

//********** RESULTS FUNCTIONS ************//

// not used currently  -- used to show how well participants did for each monster family
// function gotoResults() {
// 	calculateResults();
// 	//$("#exploration").hide();
// 	$("#questions").hide();
// 	$("#results").show();
// 	//$("#posttask-button").click(endExpt);
// }

// function calculateResults() {
// 	var familyCorrect = [];
// 	var familyCompleted = [];
// 	var totalCorrect = 0;
// 	var totalTrials = 0;


// 	for (var i=0; i < stim.numFamilies; i++) {
// 		familyCorrect.push(0);
// 		familyCompleted.push(0);
// 	}

// 	for (var i=0; i < d.correct.length; i++) {

// 		//only count results from the free choice stage
// 		if (d.trialState[i] == "free") {
// 			totalTrials++;

// 			var familyIndex = d.familyOrder.indexOf(d.family[i]);

// 			familyCompleted[familyIndex]++;

// 			if (d.correct[i]) {
// 				familyCorrect[familyIndex]++;
// 				totalCorrect++;
// 			}
// 		}
// 	}

// 	//now calculate percent correct
// 	var percentCorrect = [];
// 	var totalPercentCorrect = 0;

// 	for (var i=0; i < stim.numFamilies; i++) { 
// 		if (familyCompleted[i] == 0) {
// 			percentCorrect[i] = 0;
// 		}
// 		else {
// 			percentCorrect[i] = Math.round(familyCorrect[i]/familyCompleted[i]*100);
// 		}
		
// 		//display results
// 		$("#monster-results-" + (i+1)).text(percentCorrect[i] + "%");
// 	}

// 	if (totalTrials == 0) {
// 		totalPercentCorrect = 0;
// 	}
// 	else {
// 		totalPercentCorrect = Math.round(totalCorrect/totalTrials*100);
// 	}
// 	$("#total-results").text(totalPercentCorrect + "%");
// }

// ***** POST TRAINING QUESTION ******* //
// *** note: between the introduction trials and main task,
// there used to be a few questions, but we'll remove them for now
// function setupPostTrainQuestion() {
// 	qOrder = _.shuffle(stim.monsterFamilies);

// 	for (var i=0; i < stim.numFamilies; i++) {
// 		$("#q0-responses").append(addMonsterImage(qOrder[i]));
// 		$("#q0-responses").append(
// 			createLikertScale('Definitely Cannot Learn More', 
// 							  'Definitely Can Learn More', 
// 							  'future-learn-0', 
// 							  qOrder[i])
// 		);
// 		$("#q0-responses").append('<br/>');
// 	}

// 	//hide extra stuff
// 	$("#prompt").hide();
//  	$("#feedback").hide();
//  	$("#monster-div").hide();

//  	//show content
// 	$("#post-train-questions").show();
// }

// function checkPostTrainResponses() {
// 	//check that the mandatory questions have a value selected/filled in:
// 	var missingResponses = false;
// 	for (var i=0; i < stim.numFamilies; i++) {
// 		if ($("input:radio[name=future-learn-0-" + stim.monsterFamilies[i] + "]:checked").length == 0) {
// 				$("#response-warning-0").show();		
// 				missingResponses = true;
// 				break;
// 		}
// 	}

// 	//if all answers given, then record responses and then move them onto the rest of the task
// 	if (!missingResponses) {

// 		var future_learn_0 = [];
// 		//get responses
// 		for (var i=0; i < stim.numFamilies; i++) {
// 			future_learn_0[i] = $("input:radio[name=future-learn-0-" + stim.monsterFamilies[i] + "]:checked").val();
// 		}
// 		//get data ready for database
// 		for (var i=0; i < stim.numFamilies; i++) {
// 			psiTurk.recordUnstructuredData('future-learn-0-' + stim.monsterFamilies[i], future_learn_0[i]);
// 		}

// 		//show message for next section
// 		showPostTrainMessage();
// 	}

// }

// function showPostTrainMessage() {
// 	$("#post-train-questions").hide();

// 	$("#next-section-text").text("Free Choice");

// 	//add spacing of prompt
// 	$("#prompt").show();

// 	//show continuation button
// 	$("#stop-button").show();

// 	//set continuation message
// 	$("#post-train").show();

//  	//show completion message
//  	$("#complete-message").show();

// }


//******** POST TASK QUESTIONNAIRE FUNCTIONS ********* //

// setup the options available for the post-task questions
function setupQuestions() {
	console.log('got to questions?');
	var numQuestions = 6;

	//choose order of monster responses
	var qOrder = [];
	for (var i=0; i < numQuestions; i++) {
		qOrder[i] = _.shuffle(stim.monsterFamilies);
	}

	//Question 1 is about how interested the participant was in learning
	//about each monster
	for (var i=0; i < stim.numFamilies; i++) {
		$("#q1-responses").append(addMonsterImage(qOrder[0][i]));
		$("#q1-responses").append(
			createLikertScale('Less Interested', 
							  'More Interested', 
							  'interested', 
							  qOrder[0][i])
		);
		$("#q1-responses").append('<br/>');
	}

	//Question 2 is about how complex the participant thought each monster family was
	for (var i=0; i < stim.numFamilies; i++) {
		$("#q2-responses").append(addMonsterImage(qOrder[1][i]));
		$("#q2-responses").append(
			createLikertScale('Less Complex', 
							  'More Complex', 
							  'complex', 
							  qOrder[1][i])
		);
		$("#q2-responses").append('<br/>');
	}

	//Question 3 is about how much time the participant spent on each monster
	for (var i=0; i < stim.numFamilies; i++) {
		$("#q3-responses").append(addMonsterImage(qOrder[2][i]));
		$("#q3-responses").append(
			createLikertScale('Less Time', 
							  'More Time', 
							  'time', 
							  qOrder[2][i])
		);
		$("#q3-responses").append('<br/>');
	}

	//Question 4 is about how much learning progress the participant felt they made
	for (var i=0; i < stim.numFamilies; i++) {
		$("#q4-responses").append(addMonsterImage(qOrder[3][i]));
		$("#q4-responses").append(
			createLikertScale('Less Progress', 
							  'More Progress', 
							  'progress', 
							  qOrder[3][i])
		);
		$("#q4-responses").append('<br/>');
	}

	//Question 5 is about understanding what kind of rule a participant thought existed for a family
	for (var i=0; i < stim.numFamilies; i++) {
		$("#q5-responses").append(addMonsterImage(qOrder[4][i]));
		$("#q5-responses").append(
			createLikertScale('Definitely No Rule', 
							  'Definitely a Rule', 
							  'rule', 
							  qOrder[4][i])
		);
		$("#q5-responses").append('<br/>');
	}

	//Question 6 is about how much more they think they could learn about a family
	for (var i=0; i < stim.numFamilies; i++) {
		$("#q6-responses").append(addMonsterImage(qOrder[5][i]));
		$("#q6-responses").append(
			createLikertScale('Definitely Could Not Learn More', 
							  'Definitely Could Learn More', 
							  'future-learn-1', 
							  qOrder[5][i])
		);
		$("#q6-responses").append('<br/>');
	}
}

// this adds the image of the given monster family to a post-task question
function addMonsterImage(monster) {
	return '<img src="/static/stimuli/monsters-preview/' + monster + 
	'.png" class="posttask-monster">';
}

// creates a likert scale, based on the provided parameters
function createLikertScale(minScale, maxScale, category, monsterFamily) {
	likertCode = '<span class="likert-label">' + minScale + '</span>';

	for (var i = 1; i <= 10; i++) {
		likertCode = likertCode + 
		'<div class="radio-item">' +
		'<input type="radio" name="' + category + '-' + monsterFamily + '" value="' + i + 
		'" id="' + category + '-' + monsterFamily + '-' + '">' + 
		'</div>';
	}

	likertCode = likertCode + '<span class="likert-label">' + maxScale + '</span>';

	return likertCode;
}

// // changed from question 5 to question 6
// function createQuestion6Responses(monster) {
// 	var question6code = 
// 	'<div style="float: left; margin-bottom: 1.5em;">' + 
// 	'<input type="radio" name="learning-' + monster +'" value="gradual" id="learning-' + monster + '-gradual"> ' +
// 	'<label for="learning-'+ monster + '-gradual"> gradual learning</label><br/>' +
//     '<input type="radio" name="learning-'+ monster + '" value="insight" id="learning-'+ monster + '-insight"> ' +
//     '<label for="learning-'+ monster + '-insight"> insight learning (an aha! moment)</label><br/>' +
//     '<input type="radio" name="learning-'+ monster + '" value="unsure" id="learning-'+ monster + '-unsure"> ' + 
//     '<label for="learning-'+ monster + '-unsure">I am not sure.</label><br/>' +
//     '<input type="radio" name="learning-'+ monster + '" value="none" id="learning-'+ monster + '-none"> ' + 
//     '<label for="learning-'+ monster + '-none"> I did not learn a food preference for each monster.</label><br/>' +
//     '</div><div style="clear:both;"></div>';
//     return question6code;
// }

// function createQuestion6Responses(monster) {
// 	var question6code = 
// 	'<div style="float: left; margin-bottom: 1.5em;">' + 
// 	'<input type="radio" name="rule-' + monster +'" value="yes-rule" id="rule-' + monster + '-yes-rule"> ' +
// 	'<label for="rule-'+ monster + '-yes-rule">Yes, this monster family had a rule.</label><br/>' +
//     '<input type="radio" name="rule-' + monster + '" value="no-rule" id="rule-'+ monster + '-no-rule"> ' +
//     '<label for="rule-'+ monster + '-no-rule">No, this monster family did not have a rule.</label><br/>' +
//     '<input type="radio" name="rule-'+ monster + '" value="unsure" id="rule-'+ monster + '-unsure"> ' + 
//     '<label for="rule-'+ monster + '-unsure">I could not tell.</label><br/>' +
//     '</div><div style="clear:both;"></div>';

//     return question6code;
// }


// submit the data to our database
function submitData() {

	//check that the mandatory questions have a value selected/filled in:
	var missingResponses = false;
	for (var i=0; i < stim.numFamilies; i++) {
		if ($("input:radio[name=interested-" + stim.monsterFamilies[i] + "]:checked").length == 0 ||
			$("input:radio[name=complex-" + stim.monsterFamilies[i] + "]:checked").length == 0 ||
			$("input:radio[name=time-" + stim.monsterFamilies[i] + "]:checked").length == 0 ||
			$("input:radio[name=progress-" + stim.monsterFamilies[i] + "]:checked").length == 0 ||
			$("input:radio[name=rule-" + stim.monsterFamilies[i] + "]:checked").length == 0 ||
			$("input:radio[name=future-learn-1-" + stim.monsterFamilies[i] + "]:checked").length == 0) {
				$("#response-warning").show();		
				missingResponses = true;
				break;
		}
	}

	if (!missingResponses) {
		//free response
		var age = $("#age").val();
		var thoughts = $("#thoughts").val();
		var comments = $("#comments").val();

		// ----------------------------------------------------
		//*** radio button questions

		// specific monster questions
		var interested = [];
		var complex = [];
		var time = [];
		var progress = [];
		var future_learn_1 = [];
		var rule = [];

		for (var i=0; i < stim.numFamilies; i++) {
			interested[i] = $("input:radio[name=interested-" + stim.monsterFamilies[i] + "]:checked").val();
			complex[i] = $("input:radio[name=complex-" + stim.monsterFamilies[i] + "]:checked").val();
			time[i] = $("input:radio[name=time-" + stim.monsterFamilies[i] + "]:checked").val();
			progress[i] = $("input:radio[name=progress-" + stim.monsterFamilies[i] + "]:checked").val();
			rule[i] = $("input:radio[name=rule-" + stim.monsterFamilies[i] + "]:checked").val();
			future_learn_1[i] = $("input:radio[name=future-learn-1-" + stim.monsterFamilies[i] + "]:checked").val();
		}

		// demographic questions

		//set default if nothing was selected
		var gender = "NA";
		var race = "NA";
		var ethnicity = "NA";

		if ($("input:radio[name=gender]:checked").val()) {
			gender = $("input:radio[name=gender]:checked").val();
		}
		
		if ($("input:radio[name=race]:checked").val()) {
			race = $("input:radio[name=race]:checked").val();
		}
		
		if ($("input:radio[name=ethnicity]:checked").val()) {
			ethnicity = $("input:radio[name=ethnicity]:checked").val();
		}

		//save data and push to server
		for (var i=0; i < stim.numFamilies; i++) {
			psiTurk.recordUnstructuredData('interested-' + stim.monsterFamilies[i], interested[i]);
			psiTurk.recordUnstructuredData('complex-' + stim.monsterFamilies[i], complex[i]);
			psiTurk.recordUnstructuredData('time-' + stim.monsterFamilies[i], time[i]);
			psiTurk.recordUnstructuredData('progress-' + stim.monsterFamilies[i], progress[i]);
			psiTurk.recordUnstructuredData('rule-' + stim.monsterFamilies[i], rule[i]);
			psiTurk.recordUnstructuredData('future-learn-1-' + stim.monsterFamilies[i], future_learn_1[i]);
		}

		psiTurk.recordUnstructuredData('age', age);
		psiTurk.recordUnstructuredData('gender', gender);
		psiTurk.recordUnstructuredData('race', race);
		psiTurk.recordUnstructuredData('ethnicity', ethnicity);
		psiTurk.recordUnstructuredData('thoughts', thoughts);
		psiTurk.recordUnstructuredData('comments', comments);
		psiTurk.saveData({
	        success: function(){
	        	//gotoResults();
	        	gotoMTurk();
	        },
	        error: prompt_resubmit
	    }); 
	}	
}

// tell participant that they need to resubmit their results
function prompt_resubmit() {
	$("#end").hide();
	$("#resubmit").hide();
	$("#error").show();
	$("#resubmit-button").click(resubmit);
}

// attempt to resubmit results
function resubmit() {
	$("#error").hide();
	$("#resubmit").show();
	reprompt = setTimeout(prompt_resubmit, 10000);
	
	psiTurk.saveData({
		success: function() {
		    clearInterval(reprompt); 
            //gotoResults();
            gotoMTurk();
		}, 
		error: prompt_resubmit
	});
}

// finalize everything, and return them back to MTurk
function gotoMTurk() {
	psiTurk.completeHIT(); 
};