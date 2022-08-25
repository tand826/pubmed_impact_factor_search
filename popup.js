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
    let score = e.currentTarget.value;
    if (Number(score) > 100) {
      score = 1000;
    }
    $("#maxScore").val(score);
  });

  $(".toSetting").on("click", () => {
    $(".mainTab").hide();
    $(".settingTab").show();
    $(".toSetting").addClass("active");
    $(".toHome").removeClass("active");
  });

  $(".toHome").on("click", () => {
    $(".settingTab").hide();
    $(".mainTab").show();
    $(".toHome").addClass("active");
    $(".toSetting").removeClass("active");
  });

  $(".selectUpload").on("change", (e) => {
    let fileReader = new FileReader();
    let file = e.currentTarget.files[0];
    const msg = $(".csvSavedMessage");
    const year = e.currentTarget.parentElement.getAttribute("class").replace("data", "").split(" ")[1];
    fileReader.readAsText(file);
    fileReader.onload = () => {
      const results = $.csv.toArrays(fileReader.result);
      const columns = results[1];
      if (!isColumnsValid(columns)) {
        msg.text(`${file.name} does not have proper columns.`);
        return;
      }
      let journalData = {};
      journalData[year] = results;
      chrome.storage.local.set(journalData, () => {
        $(".checkboxIcon" + year).addClass("visible");
        $(".uploadIcon" + year).addClass("hidden");
      });
      msg.text(`${file.name} : available csv file saved`);
    };
  });

  $(".trashIcon").on("click", function () {
    const year = this.parentElement.getAttribute("class").replace("lists data", "");
    chrome.storage.local.remove(year, () => {
      $(`.uploadIcon${year}`).addClass("visible");
      $(`.checkboxIcon${year}`).addClass("hidden");
      $(".csvSavedMessage").text(`removed csv of ${year}`);
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

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace == "local") {
      if (changes.history) {
        showHistory();
      }
    }
  });

  dataCheck();
  showHistory();
});

const dataCheck = () => {
  const years = ["2022", "2021", "2020", "2019", "2018", "2017"];
  years.forEach((year) =>
    chrome.storage.local.getBytesInUse(year, (result) => {
      if (result) {
        // hide upload icon
        $(`.uploadIcon${year}`).addClass("hidden");
      } else {
        $(`.checkboxIcon${year}`).addClass("hidden");
      }
    })
  );

  years.forEach((year) =>
    chrome.storage.local.getBytesInUse(year, (result) => {
      if (result) {
        $(`#ranking${year}`).prop("checked", true);
        return true;
      }
    })
  );
};

const validateScores = (min, max) => {
  if (min >= max) {
    alert("Min Score must be smaller than the Max Score!");
  }
};

const getHistory = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get((store) => {
      if (store.history) {
        resolve(store.history);
      } else {
        resolve(Array());
      }
    });
  });
};

const setHistory = async (newQuery) => {
  let history = await getHistory();
  history.push(newQuery);
  if (history.length > 5) {
    history.shift();
  }
  chrome.storage.local.set({ history: history }, () => {});
};

const getCounter = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get((store) => {
      if (store.counter) {
        resolve(store.counter);
      } else {
        resolve(0);
      }
    });
  });
};

const getMessageNotAllowed = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get((store) => {
      if (store.messageNotAllowed) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
};

const setCounter = async () => {
  let counter = await getCounter();
  let messageNotAllowed = await getMessageNotAllowed();
  console.log(counter, messageNotAllowed);
  counter++;
  if (!messageNotAllowed && counter > 10 && counter % 10 === 0) {
    chrome.storage.local.set({ messageNotAllowed: true }, () => {});
    showRateMeDialog();
  }
  chrome.storage.local.set({ counter: counter }, () => {});
};

const showRateMeDialog = () => {
  if (window.confirm("Rate me if you are enjoying this app!")) {
    window.open(
      "https://chrome.google.com/webstore/detail/pubmed-impact-factor-sear/amhcplabblldkpggfncgnemdbpafbfog",
      "_blank"
    );
  } else {
    if (window.confirm("I don't want to see this message anymore.")) {
      chrome.storage.local.set({ messageNotAllowed: true }, () => {});
    }
  }
};

const showHistory = async () => {
  let history = await getHistory();
  $(".historyLine").remove();
  for (let i = 0; i < history.length; i++) {
    let historyLine = $("<div></div>", { addClass: "historyLine" });

    let historyQuery = $("<div></div>", { addClass: "historyQuery" });
    historyQuery.text(history[i].query);
    historyLine.append(historyQuery);

    let historyDate = $("<div></div>", { addClass: "historyDate" });
    let date = history[i].date;
    let hour = date.hour.toString().padStart(2, 0);
    let min = date.min.toString().padStart(2, 0);
    let sec = date.sec.toString().padStart(2, 0);
    historyDate.text(`${date.year}.${date.month}.${date.date} ${hour}.${min}.${sec}`);
    historyLine.append(historyDate);

    let historyLength = $("<div></div>", { addClass: "historyLength" });
    historyLength.text(`${history[i].length} Journals`);
    historyLine.append(historyLength);

    historyLine.on("click", () => {
      popup(history[i].query);
    });
    $(".historyBlock").append(historyLine);
  }
};

const isColumnsValid = (columns) => {
  const columnNumberISSN = columns.indexOf("ISSN");

  let columnNumberImpactFactor;
  const column_names_impact_factor = ["Journal Impact Factor", "2021 JIF", "2022 JIF"];
  for (let i in column_names_impact_factor) {
    let column_name = column_names_impact_factor[i];
    if (columns.includes(column_name)) {
      columnNumberImpactFactor = columns.indexOf(column_name);
      break;
    } else {
      columnNumberImpactFactor = -1;
    }
  }

  let columnNumberJournalTitle;
  const column_names_journal_title = ["Full Journal Title", "Journal Name"];
  for (let i in column_names_journal_title) {
    let column_name = column_names_journal_title[i];
    if (columns.includes(column_name)) {
      columnNumberJournalTitle = columns.indexOf(column_name);
      break;
    } else {
      columnNumberJournalTitle = -1;
    }
  }

  const url = "https://github.com/tand826/pubmed_impact_factor_search/issues";
  if ([columnNumberISSN, columnNumberImpactFactor, columnNumberJournalTitle].includes(-1)) {
    $(".csvSavedMessage").text(`CSV format is updated. Please create an issue at ${url}`);
    return false;
  } else {
    return { columnNumberISSN, columnNumberImpactFactor, columnNumberJournalTitle };
  }
};

const getAdditionalQuery = (min, max) => {
  const year = $("input[name='year']:checked").val();
  $(".selectRow").remove();
  chrome.storage.local.get(year, (res) => {
    const sheet = res[year];
    const columns = sheet[1];

    const column_is_valid = isColumnsValid(columns);
    if (column_is_valid) {
      ({ columnNumberISSN, columnNumberImpactFactor, columnNumberJournalTitle } = column_is_valid);
    } else {
      return;
    }
    for (let i = 2; i < sheet.length; i++) {
      let impactFactor = Number(sheet[i][columnNumberImpactFactor]);
      if (impactFactor >= min && impactFactor <= max) {
        let ISSN = sheet[i][columnNumberISSN];
        let row = $("<div></div>", { addClass: "selectRow" });
        let holdBox = $("<img class='holdBox' src='icons/bookmark_off.svg'>");
        holdBox.on("click", function () {
          if ($(this).hasClass("bookmarked")) {
            $(this).attr("src", "icons/bookmark_off.svg");
            $(this).removeClass("bookmarked");
          } else {
            $(this).attr("src", "icons/bookmark_on.svg");
            $(this).addClass("bookmarked");
          }
        });
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
        journalImpactFactor.text(Number(sheet[i][columnNumberImpactFactor]).toFixed(1));
        let journalISSN = $("<div></div>", { addClass: "journalISSN" });
        journalISSN.text(ISSN);
        row.append(holdBox);
        row.append(checkBox);
        row.append(journalImpactFactor);
        row.append(journalISSN);
        row.append(journalTitle);
        $(".selectRows").append(row);
      } else if (impactFactor < min) {
        console.log(min + " > " + impactFactor);
        break;
      }
    }
    $(".journalsTitle").css("display", "block");
    $(".searchBox").css("display", "block");
    $(".searchBox").on("keyup", searchWithWord);
    $(".queryButton").css("display", "block");
    $(".resultQuery").remove();
    const resultQuery = $("<div></div>", { addClass: "resultQuery" });
    $(".journalSelect").append(resultQuery);

    $(".addQueryButton").on("click", function () {
      addQuery();
    });
  });
};

const searchWithWord = () => {
  const words = $(".searchBox")[0].value.split(" ").join("|");
  const rows = $(".selectRow");
  const reg = new RegExp(words);
  for (let i = 0; i < rows.length; i++) {
    if ($(rows[i]).children(".journalTitle").text().toLowerCase().search(reg) == -1) {
      if (!$(rows[i]).children("img.holdBox").hasClass("bookmarked")) {
        $(rows[i]).hide();
      }
    } else {
      $(rows[i]).show();
    }
  }
};

const addQuery = () => {
  let additionalQueries = Array();
  const selectRows = $(".selectRow");
  for (let i = 0; i < selectRows.length; i++) {
    if ($(".selectRow .rowCheckBox")[i].checked && $($(".selectRow")[i]).is(":visible")) {
      additionalQueries.push($(".selectRow .journalISSN")[i].innerText);
    }
  }
  const additionalQuery = additionalQueries.join(" OR ");
  const history = {
    query: additionalQuery,
    date: getDate(),
    length: additionalQueries.length,
  };
  setHistory(history);
  const message = "Added query for " + additionalQueries.length + " journals";
  $(".resultQuery").text(message);
  popup(additionalQuery);
};

const getDate = () => {
  let now = new Date();
  const date = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    date: now.getDate(),
    hour: now.getHours(),
    min: now.getMinutes(),
    sec: now.getSeconds(),
  };
  return date;
};

const popup = (query) => {
  console.log(query);
  chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
    const activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, { query: query });
  });
  setCounter();
};
