/* Page Specific Functionality */
var oPage = {
	oSearchAJAJCall: null,
	intPageNumber: 1,
	intEntriesPerPage: 50,
	intNumberOfEntriesFound: 0,
	strSort: null, // null - for default best match; otherwise "followers", "repositories", "joined"
	strOrder: null, // "asc" or "desc" as long as strSort is not null
	arEntriesAJAJCalls: []
}

function initializePage() {
	oPage.oSearchAJAJCall = new Framework.AJAJCall({
		strPageURL: "https://api.github.com/search/users",
		strSubmitMethod: "GET",
		fOnReadyStateChange: function (oJSONResponseObject, strResponseText) {
			{
				let strHtml = ""
				let oLoop1Entry
				let strLoop1Counter

				for(oLoop1Entry of oJSONResponseObject.items) {
					strLoop1Counter = oPage.arEntriesAJAJCalls.length.toString()

					strHtml += "<div class=\"divSearchResultsEntry\">"
					strHtml += "	<div class=\"divSearchResultsEntryAvatar\">"
					strHtml += "		<img src=\"" + oLoop1Entry.avatar_url + "\" class=\"imgSearchResultAvatar\" />"
					strHtml += "	</div>"
					strHtml += "	<div class=\"divSearchResultsEntryDetails\">"
					strHtml += "		<a href=\"" + oLoop1Entry.html_url + "\" id=\"aSearchResultsEntryName" + strLoop1Counter + "\" class=\"aSearchResultsEntryName\" target=\"_blank\"></a> <span class=\"spanSearchResultsEntryLogin\">" + oLoop1Entry.login + "</span>"
					strHtml += "		<div id=\"divSearchResultsEntryBio" + strLoop1Counter + "\"></div>"
					strHtml += "		<div id=\"divSearchResultsEntryExtraDetails" + strLoop1Counter + "\"></div>"
					strHtml += "	</div>"
					strHtml += "</div>"

					generateEntryAJAJCall(strLoop1Counter, oLoop1Entry.url)
				}

				document.getElementById("divSearchResultsEntries").innerHTML = strHtml
			}

			oPage.intNumberOfEntriesFound = Math.min(oJSONResponseObject.total_count, 1000) // only the first 1000 entries are retrievable according to Git Hub API specs

			document.getElementById("divSearchResultsHeaderStats").innerHTML = Framework.buildPaginatedSearchResultsMessage(
				oPage.intPageNumber,
				oPage.intEntriesPerPage,
				oPage.intNumberOfEntriesFound
			)
			document.getElementById("divSearchResultsHeaderPageNavigation").innerHTML = ""
			document.getElementById("divSearchResultsHeaderPageNavigation").appendChild(
				Framework.buildPaginatedSearchPageBrowser(
					oPage.intPageNumber,
					oPage.intEntriesPerPage,
					oPage.intNumberOfEntriesFound,
					selectPageNo
				)
			)
			Framework.updatePaginatedSearchResultsBackAndNextButtons(
				oPage.intPageNumber,
				oPage.intEntriesPerPage,
				oPage.intNumberOfEntriesFound,
				document.getElementById("bttnPreviousPage"),
				document.getElementById("bttnNextPage")
			)
		},
		fOnError: function (strResponseText) {
			console.info(strResponseText)
		},
		fOnTimeOut: function () {
			console.info("Time out!")
		}
	})

	document.getElementById("txtSearch").addEventListener("keydown", onSearchInput)
	document.getElementById("bttnSubmit").addEventListener("click", submitSearch)

	document.getElementById("bttnPreviousPage").addEventListener("click", selectPreviousPage)
	document.getElementById("bttnNextPage").addEventListener("click", selectNextPage)

	document.getElementById("txtSearch").focus()
}

function onSearchInput(oEvent) {
	if (Framework.checkForEnterKey(oEvent) === true) {
		submitSearch()
	}
}

function selectPageNo(intPageNumber) {
	oPage.intPageNumber = intPageNumber
	document.getElementById("divSearchResultsEntries").innerHTML = ""
	submitSearch()
}
function selectPreviousPage() {
	selectPageNo(oPage.intPageNumber - 1)
}
function selectNextPage() {
	selectPageNo(oPage.intPageNumber + 1)
}

function submitSearch() {
	oPage.oSearchAJAJCall.abort()

	{
		let oLoop1EntryAJAJCall

		for(oLoop1EntryAJAJCall of oPage.arEntriesAJAJCalls)		 {
			oLoop1EntryAJAJCall.abort()
			oLoop1EntryAJAJCall.delete()
		}
	}

	oPage.arEntriesAJAJCalls = []

	{
		let strRequestString = ""

		strRequestString += "q=" + encodeURIComponent(document.getElementById("txtSearch").value)
		strRequestString += "&per_page=" + oPage.intEntriesPerPage.toString()
		strRequestString += "&page=" + oPage.intPageNumber.toString()

		if (oPage.strSort !== null) {
			strRequestString += "&sort=" + oPage.strSort
			strRequestString += "&order=" + oPage.strOrder
		}

		oPage.oSearchAJAJCall.strReqString = strRequestString
	}

	oPage.oSearchAJAJCall.start()
}

/* This is really not ideal that we have to make a separate AJAJ call for each search result in order to replicate the github functionality (display additional user details).
	It also seems we quickly hit our API call limit. Am I missing something in the API spec?
*/
function generateEntryAJAJCall(strCounter, strURL) {
	var oEntryAJAJCall = new Framework.AJAJCall({
		strPageURL: strURL,
		strSubmitMethod: "GET",
		fOnReadyStateChange: function (oJSONResponseObject, strResponseText) {
			document.getElementById("aSearchResultsEntryName" + strCounter).innerText = oJSONResponseObject.name
			document.getElementById("divSearchResultsEntryBio" + strCounter).innerText = oJSONResponseObject.bio
			// TO DO: drop location, followers and public_repos in the ExtraDetails div
		}
	})
	oPage.arEntriesAJAJCalls.push(oEntryAJAJCall)
	oEntryAJAJCall.start()
}

/* Global Functionality - quick and dirty effort to establish some sort of framework in lieu of using one of the suggested MVC approaches */
var Framework = {}

Framework.checkForEnterKey = function(oEvent) {
	if (typeof oEvent !== "undefined"
			&& oEvent.keyCode === 13) {
        return true
    } else {
        return false
    }
}

Framework.stopEventBubbling = function(oEvent) {
    if (typeof oEvent !== "object") {
        oEvent = window.event
    }

    oEvent.cancelBubble = true
    if (typeof oEvent.stopPropagation !== "undefined") {
        oEvent.stopPropagation()
    }
}

Framework.buildPaginatedSearchResultsMessage = function(intPageNumber, intEntriesPerPage, intNumberOfEntriesFound) { // builds a results message for paginated search results
	if (intNumberOfEntriesFound === 0) {
		return "No entries found!"
	} else {
		let intIndexOfFirstEntryOnCurrentPage = (intPageNumber - 1) * intEntriesPerPage + 1
		let intIndexOfLastEntryOnCurrentPage = Math.min((intPageNumber * intEntriesPerPage), intNumberOfEntriesFound)

		return "Showing entries " + intIndexOfFirstEntryOnCurrentPage.toString() + " to " + intIndexOfLastEntryOnCurrentPage.toString() + " from " + intNumberOfEntriesFound + " total matches:"
	}
}

Framework.buildPaginatedSearchPageBrowser = function(intPageNumber, intEntriesPerPage, intNumberOfEntriesFound, fOnClick) { // builds page buttons for paginated search results
	var elSpanPageBrowser = document.createElement("span")
	var intNumSidePagesToShow = 3 // you can set it to 0 to get a page browser that shows current page and allows one click access to first and last page (together with next/back buttons this could work rather well when space is limited)
	var intTotalPages = Math.ceil(intNumberOfEntriesFound / intEntriesPerPage)
	var intFirstPageAfterFistEllipsis = intPageNumber - intNumSidePagesToShow
	var intLastPageBeforeLastEllipsis = intPageNumber + intNumSidePagesToShow


	if (intFirstPageAfterFistEllipsis <= 2) {
		intFirstPageAfterFistEllipsis = null
	}

	if (intLastPageBeforeLastEllipsis >= intTotalPages - 1) {
		intLastPageBeforeLastEllipsis = null
	}

	{
		let intLoop1Counter
		let elLoop1Button

		intLoop1Counter = 1
		while(intLoop1Counter <= intTotalPages) {
			if (intLoop1Counter === 2
					&& intFirstPageAfterFistEllipsis !== null) {
				elSpanPageBrowser.appendChild(document.createTextNode("...\u00A0"))

				intLoop1Counter = intFirstPageAfterFistEllipsis
			}

			if (intLoop1Counter === intPageNumber) {
				elSpanPageBrowser.appendChild(document.createTextNode(intLoop1Counter.toString()))
			} else {
				elLoop1Button = document.createElement("button")
				elLoop1Button.type = "button"
				elLoop1Button.className = "bttnStyle1"
				{
					(function () { // local scoping of intLoop1Counter for use with definition of elLoop1Button onclick
						var intCounter = intLoop1Counter


						elLoop1Button.onclick = function (oEvent) {
							fOnClick(intCounter)
							Framework.stopEventBubbling(oEvent)
						}
					})()
				}
				elLoop1Button.innerHTML = intLoop1Counter.toString()

				elSpanPageBrowser.appendChild(elLoop1Button)
			}

			if (intLoop1Counter < intTotalPages) {
				elSpanPageBrowser.appendChild(document.createTextNode("\u00A0"))
			}

			if (intLoop1Counter === intLastPageBeforeLastEllipsis) {
				elSpanPageBrowser.appendChild(document.createTextNode("...\u00A0"))

				intLoop1Counter = intTotalPages
				continue
			}

			intLoop1Counter++
		}
	}
	
	return elSpanPageBrowser
}

Framework.updatePaginatedSearchResultsBackAndNextButtons = function(intPageNumber, intEntriesPerPage, intNumberOfEntriesFound, elButtonBack, elButtonNext) { // enables/disables the back and next buttons
	if (intPageNumber > 1) {
		elButtonBack.classList.remove("bttnDisabled")
	} else {
		elButtonBack.classList.add("bttnDisabled")
	}

	if (intNumberOfEntriesFound > intEntriesPerPage * intPageNumber) {
		elButtonNext.classList.remove("bttnDisabled")
	}
	else {
		elButtonNext.classList.add("bttnDisabled")
	}
}

// AJAJ because it uses JSON rather than XML; using a faux object oriented approach since JS does not quite support it
Framework.AJAJCall = (function () {
	// public static variables
	Constructor.AJAJCalls = {}
	Constructor.ErrorMessages = {
		InvalidParametersObject: "The parameters object is invalid!",
		InvalidURL: "The URL provided is inavlid!",
		XMLHttpRequestNotSupported: "Your browser does not support XMLHttpRequest objects!",
		RequestTimeOut: "Unable to reach server. The server might be down momentarily so please try again!",
		ServerSideError: "Received a server side error to an ajaj call. Full response text:\n",
		FailedJSONParsing: "Failed to parse JSON reply from AJAJ call. Full response text:\n"
	}


	// private static variables
	var intAJAJCallsCounter = 0


	function Constructor(oParameters) {
		// public instance variables
		this.strReqString = ""
		this.oFormData = null


		// private instance variables
		var oSelf = this
		var strAJAJCallKey = "0"

		var strPageURL
		var strSubmitMethod = "POST"
		var bAlertMeOnTimeOut = true

		var oXHReq
		var bAsynchronous = true
		var intRequestTimer = null
		var intTimeoutInMilliseconds = 30000
		var bWasRespondedTo = false
		var bWasAborted = false


		// function pointers
		var fOnReadyStateChange = null // called state of the request changes
		var fOnTimeOut = null // called when the request times out
		var fOnError = null // called when the request encounters an error


		// constructor work, checking variables
		if (oParameters === null
				|| typeof oParameters !== "object") {
			throw (Constructor.ErrorMessages.InvalidParametersObject)
		}

		if (typeof oParameters.strPageURL === "string"
				&& oParameters.strPageURL.length > 0) {
			strPageURL = oParameters.strPageURL
		} else {
			throw (Constructor.ErrorMessages.InvalidURL)
		}

		if (typeof oParameters.strSubmitMethod === "string"
				&& oParameters.strSubmitMethod.length > 0) {
			strSubmitMethod = oParameters.strSubmitMethod
		}

		if (typeof oParameters.bAlertMeOnTimeOut === "boolean") {
			bAlertMeOnTimeOut = oParameters.bAlertMeOnTimeOut
		}

		if (typeof oParameters.fOnReadyStateChange === "function") {
			fOnReadyStateChange = oParameters.fOnReadyStateChange
		}

		if (typeof oParameters.fOnTimeOut === "function") {
			fOnTimeOut = oParameters.fOnTimeOut
		}

		if (typeof oParameters.fOnError === "function") {
			fOnError = oParameters.fOnError
		}

		if (window.XMLHttpRequest) {
			oXHReq = new XMLHttpRequest()
		} else {
			throw (Constructor.ErrorMessages.XMLHttpRequestNotSupported)
		}

		strAJAJCallKey = (++intAJAJCallsCounter).toString()
		Constructor.AJAJCalls[strAJAJCallKey] = this


		// public instance methods
		this.start = function () {
			intRequestTimer = setTimeout(function () {
				if (bWasRespondedTo === true
						|| bWasAborted === true) {
					return
				} else {
					oSelf.abort()

					if (fOnTimeOut !== null) {
						fOnTimeOut()
					} else if (bAlertMeOnTimeOut === true) {
						alert(Constructor.ErrorMessages.RequestTimeOut)
					}
				}
			}, intTimeoutInMilliseconds)

			bWasRespondedTo = false
			bWasAborted = false

			oXHReq.onreadystatechange = onReadyStateChange

			if (strSubmitMethod === "GET") {
				oXHReq.open(strSubmitMethod, strPageURL + "?" + oSelf.strReqString, bAsynchronous)
			} else {
				oXHReq.open(strSubmitMethod, strPageURL, bAsynchronous)
			}

			// custom headers
			oXHReq.setRequestHeader("Accept", "application/vnd.github+json") // git hub API recommended

			if (strSubmitMethod === "GET") {
				oXHReq.send()
			} else {
				if (oSelf.oFormData !== null) {
					oXHReq.send(oSelf.oFormData)
				} else {
					oXHReq.setRequestHeader("Content-Type", "application/x-www-form-urlencoded")
					oXHReq.send(oSelf.strReqString)
				}
			}
		}

		this.abort = function () {
			if (bWasRespondedTo === false
					&& bWasAborted === false) {
				bWasAborted = true
				clearTimeout(intRequestTimer)
				oXHReq.abort()
			}
		}

		this.delete = function () {
			delete Constructor.AJAJCalls[strAJAJCallKey]
		}


		// private instance methods
		function onReadyStateChange() {
			if (bWasAborted === true
					|| oXHReq.readyState !== 4) {
				return
			}

			bWasRespondedTo = true

			if (oXHReq.status === 0) {
				return // aborted call
			}

			if (oXHReq.status !== 200) {
				if (fOnError !== null) {
					fOnError(oXHReq.responseText)
				} else {
					throw(Constructor.ErrorMessages.ServerSideError + oXHReq.responseText)
				}
			}

			{
				let oJSONResponseObject

				try {
					oJSONResponseObject = JSON.parse(oXHReq.responseText)
					fOnReadyStateChange(oJSONResponseObject, oXHReq.responseText)
				} catch (oError) {
					throw(oError)
					if (fOnError !== null) {
						fOnError(oXHReq.responseText)
					} else {
						throw(Constructor.ErrorMessages.FailedJSONParsing + oXHReq.responseText)
					}
				}
			}
		}
	}


	// public static methods
	// Constructor.myFunction = function () {}


	// private static methods
	// function myFunction() = {}


	return Constructor
})()