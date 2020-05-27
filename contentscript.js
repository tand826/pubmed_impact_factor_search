const addWords = additionalQuery => {
  console.log(additionalQuery);
  let searchBox = document.getElementById("term") || document.getElementById("id_term");
  let baseQuery = searchBox.value;
  searchBox.value = baseQuery + " AND (" + additionalQuery["query"] + ")";
};

chrome.runtime.onMessage.addListener(addWords);
