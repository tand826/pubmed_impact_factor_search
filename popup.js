$(() => {
  $("#checkButton").on("click", () => {
    const minScore = Number($("#minScore").val());
    const maxScore = Number($("#maxScore").val());
    validateScores(minScore, maxScore);
    getAdditionalQuery(minScore, maxScore);
  });

  $("#minScoreSlider").on("input", (e) => {
    $("#minScore").val(e.currentTarget.value);
  });

  $("#maxScoreSlider").on("input", (e) => {
    const score = e.currentTarget.value;
    if (Number(score) > 100) {
      score = 1000;
    }
    $("#maxScore").val(score);
  });

  $(".toSetting").on("click", () => {
    $(".mainTab").hide();
    $(".settingTab").show();
    $(this).addClass("active");
    $(".toHome").removeClass("active");
  });

  $(".toHome").on("click", () => {
    $(".settingTab").hide();
    $(".mainTab").show();
    $(this).addClass("active");
    $(".toSetting").removeClass("active");
  });

  $(".selectUpload").on("change", (e) => {
    console.log(e.currentTarget);
    let fileReader = new FileReader();
    let file = e.currentTarget.files[0];
    const year = e.currentTarget.parentElement
      .getAttribute("class")
      .replace("data", "")
      .split(" ")[1];
    fileReader.readAsText(file);
    fileReader.onload = () => {
      const results = $.csv.toArrays(fileReader.result);
      let journalData = {};
      journalData[year] = results;
      chrome.storage.local.set(journalData, () => {
        $(".checkboxIcon" + year).addClass("visible");
        $(".uploadIcon" + year).addClass("hidden");
      });
    };
  });

  $(".trashIcon").on("click", () => {
    year = this.parentElement.getAttribute("class").replace("data", "");
    chrome.storage.local.remove(year, () => {
      $(".uploadIcon" + year).addClass("visible");
      $(".checkboxIcon" + year).addClass("hidden");
    });
  });

  $.getJSON("manifest.json", (data) => {
    $.each(data, (k, v) => {
      if (k == "version") {
        version = v;
        $(".version_p").text("version" + version);
      }
    });
  });

  dataCheck();
});

const dataCheck = () => {
  let dataExists = [];
  const years = ["2018", "2017"];
  years.forEach((year) =>
    chrome.storage.local.getBytesInUse(year, (result) => {
      if (result) {
        $(".uploadIcon" + year).addClass("hidden");
        dataExists.push(year);
      } else {
        $(".checkboxIcon" + year).addClass("hidden");
      }
    })
  );

  years.forEach((year) =>
    chrome.storage.local.getBytesInUse(year, (result) => {
      if (result) {
        $("#ranking" + year).prop("checked", true);
        return true;
      }
    })
  );
};

const validateScores = (min, max) => {
  if (min >= max) {
    alert("Your Min Score is larger than the Max Score!");
  }
};

const getAdditionalQuery = (min, max) => {
  const year = $("input[name='year']:checked").val();
  $(".journalSelect").empty();
  chrome.storage.local.get(year, (res) => {
    const sheet = res[year];
    const columns = sheet[1];
    const columnNumberISSN = columns.indexOf("ISSN");
    const columnNumberImpactFactor = columns.indexOf("Journal Impact Factor");
    const columnNumberJournalTitle = columns.indexOf("Full Journal Title");
    for (let i = 2; i < sheet.length; i++) {
      let impactFactor = Number(sheet[i][columnNumberImpactFactor]);
      if (impactFactor >= min && impactFactor <= max) {
        let ISSN = sheet[i][columnNumberISSN];
        let row = $("<div></div>", { addClass: "selectRow" });
        let checkBox = $("<input>", {
          addClass: "rowCheckBox",
          type: "checkbox",
        });
        checkBox.prop("checked", true);
        let journalTitle = $("<div></div>", { addClass: "journalTitle" });
        journalTitle.text(sheet[i][columnNumberJournalTitle]);
        let journalImpactFactor = $("<div></div>", {
          addClass: "journalImpactFactor",
        });
        journalImpactFactor.text(sheet[i][columnNumberImpactFactor]);
        let journalISSN = $("<div></div>", { addClass: "journalISSN" });
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

    const addButtonDiv = $("<div></div>", { addClass: "button" });
    const searchBox = $("<input>", {addClass: "searchBox"})
    searchBox.on("keyup", searchWithWord)
    const addButton = $("<button></button>", { addClass: "addQueryButton" });
    const resultQuery = $("<div></div>", { addClass: "resultQuery" });
    const journalsTitle = $("<div></div>", { addClass: "journalsTitle" }).text(
      "Journals"
    );
    addButton.text("Add");
    addButtonDiv.append(addButton);
    $(".journalSelect").prepend(searchBox)
    $(".journalSelect").prepend(journalsTitle);
    $(".journalSelect").append(resultQuery);
    $(".journalSelect").append(addButtonDiv);

    $(".addQueryButton").on("click", function () {
      addQuery();
    });
  });
};

const searchWithWord = () => {
  const word = $(".searchBox")[0].value
  const reg = new RegExp(word)
  const rows = $(".selectRow")
  for (let i=0; i<rows.length; i++) {
    if ($(rows[i]).children(".journalTitle").text().toLowerCase().search(reg) == -1) {
      $(rows[i]).hide()
    } else {
      $(rows[i]).show()
    }
  }
}

const addQuery = () => {
  let additionalQueries = Array();
  const selectRows = $(".selectRow");
  for (let i = 0; i < selectRows.length; i++) {
    if ($(".selectRow .rowCheckBox")[i].checked) {
      additionalQueries.push($(".selectRow .journalISSN")[i].innerText);
    }
  }
  const additionalQuery = additionalQueries.join(" OR ");
  const message = "Added query for " + additionalQueries.length + " journals";
  $(".resultQuery").text(message);
  popup(additionalQuery);
};

const popup = (query) => {
  console.log(query);
  chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
    const activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, { query: query });
  });
};
