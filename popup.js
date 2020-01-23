$(function(){
	$("#addWordButton").on("click", function(){
		var minScore = Number($("#minScore").val())
		var maxScore = Number($("#maxScore").val())
		validateScores(minScore, maxScore)
		getAdditionalQuery(minScore, maxScore)
	})

	$("#minScoreSlider").on("input", function(){
		$("#minScore").val(this.value)
	})

	$("#maxScoreSlider").on("input", function(){
		$("#maxScore").val(this.value)
	})

	$(".toSetting").on("click", function(){
		$(".mainTab").removeClass("visible").addClass("hidden")
		$(".settingTab").removeClass("hidden").addClass("visible")
	})

	$(".toHome").on("click", function(){
		$(".settingTab").removeClass("visible").addClass("hidden")
		$(".mainTab").removeClass("hidden").addClass("visible")
	})

	$(".selectUpload").on("change", function(){
		var fileReader = new FileReader()
		var file = this.files[0]
		var year = this.parentElement.getAttribute("class").replace("data", "")
		fileReader.readAsText(file)
		fileReader.onload = function(){
			/*
			results = Array()
			lines = fileReader.result.replace(/\r?\n/g, "¥n").split("¥n")
			for (var i=0;i<lines.length;++i) {
				results[i] = lines[i].split(",")
			}
			*/
			var results = $.csv.toArrays(fileReader.result)
			// save to storage
			var journalData = {}
			journalData[year] = results
			chrome.storage.local.set(journalData, function(){
				console.log("saved")
				$(".checkboxIcon"+year).addClass("visible")
				$(".uploadIcon"+year).addClass("hidden")
			})
		}

	})

	$(".trashIcon").on("click", function(){
		year = this.parentElement.getAttribute("class").replace("data", "")
		chrome.storage.local.remove(year, function(){
			console.log("removed data of "+year)
			$(".uploadIcon"+year).addClass("visible")
			$(".checkboxIcon"+year).addClass("hidden")
		})
	})

	dataCheck()

});

function dataCheck(){
	var dataExists = []
	var years = ["2018", "2017"]
	years.forEach(year =>
		chrome.storage.local.getBytesInUse(year, function(result){
			if (result) {
				$(".uploadIcon"+year).addClass("hidden")
				dataExists.push(year)
			} else {
				$(".checkboxIcon"+year).addClass("hidden")
			}
		})
	)

	years.forEach(year =>
		chrome.storage.local.getBytesInUse(year, function(result){
			if (result) {
				$("#ranking"+year).prop("checked", true)
				return true
			}
		})
	)
}

function validateScores(min, max) {
	if (min >= max) {
 		alert("Your Min Score is larger than the Max Score!")
	}
}

function getAdditionalQuery(min, max) {
	var year = $("input[name='year']:checked").val()
	var additionalQueries = Array()
	chrome.storage.local.get(year, function(res){
		var sheet = res[year]
		var columns = sheet[1]
		var columnNumberISSN = columns.indexOf("ISSN")
		var columnNumberImpactFactor = columns.indexOf("Journal Impact Factor")
		for (var i=2; i<sheet.length; i++){
			var impactFactor = Number(sheet[i][columnNumberImpactFactor])
			if (impactFactor >= min && impactFactor <= max) {
				var ISSN = sheet[i][columnNumberISSN]
				console.log(ISSN)
				additionalQueries.push(ISSN + '[Journal]')
			} else if (impactFactor < min) {
				console.log(min + " > " + impactFactor)
				break
			}
		}
		var additionalQuery = additionalQueries.join(" OR ")
		var message = "Added query for " + additionalQueries.length + " journals"
		// alert()
		$(".resultQueryMessage").text(message)
		popup(additionalQuery)
	})
}

function popup(query) {
  console.log(query)
  chrome.tabs.query({currentWindow: true, active: true}, function (tabs){
	  var activeTab = tabs[0];
 	  chrome.tabs.sendMessage(activeTab.id, {"query": query});
 });
}

