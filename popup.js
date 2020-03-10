$(function() {
  $("#checkButton").on("click", function() {
    var minScore = Number($("#minScore").val());
    var maxScore = Number($("#maxScore").val());
    validateScores(minScore, maxScore);
    getAdditionalQuery(minScore, maxScore);
  });

  $("#minScoreSlider").on("input", function() {
    $("#minScore").val(this.value);
  });

  $("#maxScoreSlider").on("input", function() {
    var score = this.value;
    if (score === "100") {
      score = 1000;
    }
    $("#maxScore").val(score);
  });

  $(".toSetting").on("click", function() {
    $(".mainTab").hide();
    $(".settingTab").show();
    $(this).addClass("active");
    $(".toHome").removeClass("active");
  });

  $(".toHome").on("click", function() {
    $(".settingTab").hide();
    $(".mainTab").show();
    $(this).addClass("active");
    $(".toSetting").removeClass("active");
  });

  $(".selectUpload").on("change", function() {
    var fileReader = new FileReader();
    var file = this.files[0];
    var year = this.parentElement
      .getAttribute("class")
      .replace("data", "")
      .split(" ")[1];
    fileReader.readAsText(file);
    fileReader.onload = function() {
      var results = $.csv.toArrays(fileReader.result);
      var journalData = {};
      journalData[year] = results;
      chrome.storage.local.set(journalData, function() {
        $(".checkboxIcon" + year).addClass("visible");
        $(".uploadIcon" + year).addClass("hidden");
      });
    };
  });

  $(".trashIcon").on("click", function() {
    year = this.parentElement.getAttribute("class").replace("data", "");
    chrome.storage.local.remove(year, function() {
      $(".uploadIcon" + year).addClass("visible");
      $(".checkboxIcon" + year).addClass("hidden");
    });
  });

  dataCheck();
});

function dataCheck() {
  var dataExists = [];
  var years = ["2018", "2017"];
  years.forEach(year =>
    chrome.storage.local.getBytesInUse(year, function(result) {
      if (result) {
        $(".uploadIcon" + year).addClass("hidden");
        dataExists.push(year);
      } else {
        $(".checkboxIcon" + year).addClass("hidden");
      }
    })
  );

  years.forEach(year =>
    chrome.storage.local.getBytesInUse(year, function(result) {
      if (result) {
        $("#ranking" + year).prop("checked", true);
        return true;
      }
    })
  );
}

function validateScores(min, max) {
  if (min >= max) {
    alert("Your Min Score is larger than the Max Score!");
  }
}

function getAdditionalQuery(min, max) {
  var year = $("input[name='year']:checked").val();
  $(".journalSelect").empty();
  chrome.storage.local.get(year, function(res) {
    var sheet = res[year];
    var columns = sheet[1];
    var columnNumberISSN = columns.indexOf("ISSN");
    var columnNumberImpactFactor = columns.indexOf("Journal Impact Factor");
    var columnNumberJournalTitle = columns.indexOf("Full Journal Title");
    for (var i = 2; i < sheet.length; i++) {
      var impactFactor = Number(sheet[i][columnNumberImpactFactor]);
      if (impactFactor >= min && impactFactor <= max) {
        var ISSN = sheet[i][columnNumberISSN];
        var row = $("<div></div>", { addClass: "selectRow" });
        var checkBox = $("<input>", {
          addClass: "rowCheckBox",
          type: "checkbox"
        });
        checkBox.prop("checked", true);
        var journalTitle = $("<div></div>", { addClass: "journalTitle" });
        journalTitle.text(sheet[i][columnNumberJournalTitle]);
        var journalImpactFactor = $("<div></div>", {
          addClass: "journalImpactFactor"
        });
        journalImpactFactor.text(sheet[i][columnNumberImpactFactor]);
        var journalISSN = $("<div></div>", { addClass: "journalISSN" });
        journalISSN.text(ISSN);
        row.append(checkBox);
        row.append(journalImpactFactor);
        row.append(journalISSN);
        row.append(journalTitle);
        $(".journalSelect").append(row);
      } else if (impactFactor < min) {
        console.log(min + " > " + impactFactor);
        break;
      }
    }

    var addButtonDiv = $("<div></div>", { addClass: "button" });
    var addButton = $("<button></button>", { addClass: "addQueryButton" });
    var resultQuery = $("<div></div>", { addClass: "resultQuery" });
    addButton.text("Add");
    addButtonDiv.append(addButton);
    $(".journalSelect").prepend($("<hr>"));
    $(".journalSelect").append(resultQuery);
    $(".journalSelect").append(addButtonDiv);

    $(".addQueryButton").on("click", function() {
      addQuery();
    });
  });
}

function addQuery() {
  var additionalQueries = Array();
  var selectRows = $(".selectRow");
  for (var i = 0; i < selectRows.length; i++) {
    if ($(".selectRow .rowCheckBox")[i].checked) {
      additionalQueries.push($(".selectRow .journalISSN")[i].innerText);
    }
  }
  var additionalQuery = additionalQueries.join(" OR ");
  var message = "Added query for " + additionalQueries.length + " journals";
  $(".resultQuery").text(message);
  popup(additionalQuery);
}

function popup(query) {
  console.log(query);
  chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
    var activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, { query: query });
  });
}
