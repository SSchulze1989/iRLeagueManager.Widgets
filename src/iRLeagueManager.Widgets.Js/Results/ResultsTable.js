const SortDirection = {
    Ascending: "sort-ascending",
    Descending: "sort-descending"
}

class ResultsTableColumn {
    constructor(heading, getValue, getStyle, getSortValue, sortDirection = SortDirection.Ascending) {
        this.heading = heading;
        this.getValue = getValue;
        this.getStyle = getStyle;
        this.getSortValue = getSortValue;
        this.SortDirection = sortDirection;
    }
}

class ResultsTable {
    constructor(parent) {
        this.parent = parent;
        this.columns = [];
        this.data = []
        this.sortByIndex = 0;
    }

    setResult(result) {
        this.data = result.resultRows;
        const isTeamResult = this.data.some(x => x.memberId == null) ?? false;
        const displayStartPos = this.data.some(x => x.startPosition != 0);
        const displayQualyLap = this.data.some(x => x.qualifyingTime.totalSeconds != 0);
        const displayBonusPoints = this.data.some(x => x.bonusPoints != 0);

        this.columns = [];

        this.addColumn("Pos", x => formatChange(x.finalPosition + ".", x.finalPositionChange), x => parseInt(x.finalPosition));
        if (isTeamResult == false) {
            if (displayStartPos) {
                this.addColumn("Start", x => x.startPosition + ".", x => parseInt(x.startPosition));
            }
            this.addColumn("Name", x => x.firstname + " " + x.lastname, x => x.firstname);
        }
        this.addColumn("Team", x => formatTeam(x), x => x.teamName);
        if (displayQualyLap) {
            this.addColumn("Qualy Lap", x => formatTime(x.qualifyingTime), x => x.qualifyingTime.totalSeconds, undefined, x => isFastestLap(this.data, x, x => x.qualifyingTime) ? "font-weight: bold" : "");
        }
        this.addColumn("Fastest Lap", x => formatTime(x.fastestLapTime),  x => x.fastestLapTime.totalSeconds, undefined, x => isFastestLap(this.data, x, x => x.fastestLapTime) ? "font-weight: bold" : "");
        this.addColumn("Avg. Lap", x => formatTime(x.avgLapTime),  x => x.avgLapTime.totalSeconds, undefined, x => isFastestLap(this.data, x, x => x.avgLapTime) ? "font-weight: bold" : "");
        if (isTeamResult == false) {
            this.addColumn("Interval", x => formatInterval(x.interval), x => x.interval.totalSeconds);
            this.addColumn("Laps Lead", x => x.leadLaps, x => parseInt(x.leadLaps));
            this.addColumn("Laps Compl.", x => x.completedLaps, x => parseInt(x.completedLaps));
        }
        this.addColumn("Race Pts.", x => x.racePoints, x => parseInt(x.racePoints));
        if (displayBonusPoints) {
            this.addColumn("Bonus Pts.", x => x.bonusPoints, x => parseInt(x.bonusPoints));
        }
        this.addColumn("Penalty", x => x.penaltyPoints, x => parseInt(x.penaltyPoints));
        this.addColumn("Total Pts.", x => x.totalPoints, x => parseInt(x.totalPoints));
        if (isTeamResult == false) {
            this.addColumn("IR (" + result.sof + ")", x => x.oldIrating, x => parseInt(x.oldIrating));
        }
        this.addColumn("Incs", x => x.incidents, x => parseInt(x.incidents));
    }

    addColumn(heading, content, sortValue = undefined, sortDirection = SortDirection.Ascending, style = undefined) {
        this.columns = this.columns.concat([new ResultsTableColumn(heading, content, style, sortValue, sortDirection)]);
    }

    draw() {
        const sortedRows = this.sortByColumn(this.data);

        this.parent.innerHTML = '';
        let table = document.createElement("table");
        table.className = "table table-sm table-striped table-hover";
        table.style = "font-size: 0.9rem; line-height: 1rem";
        this.parent.appendChild(table);

        let tHead = document.createElement("thead");
        table.appendChild(tHead);
        let tr = document.createElement("tr");
        tHead.appendChild(tr);
        for (const [index, column] of this.columns.entries()) {
            let th = createHeaderCell(column);
            tr.appendChild(th);
            if (index == this.sortByIndex) {
                th.className += " active";
            }
            if (column.getSortValue != undefined) {
                th.className += " action";
                th.onclick = () => this.setSortColumn(index);
            }
        }

        let tBody = document.createElement("tbody");
        table.appendChild(tBody);
        for (const row of sortedRows) {
            let tr = document.createElement("tr");
            tBody.appendChild(tr);
            for (const column of this.columns) {
                tr.appendChild(createTextCell(column, row));
            }
        }
    }

    sortByColumn(rows) {
        let sortColumn = this.columns[this.sortByIndex];
        if (sortColumn === undefined || sortColumn.getSortValue === undefined)
        {
            return rows;
        }

        if (sortColumn.SortDirection === SortDirection.Ascending) {
            return rows.sort((a, b) => this.compareColumnValues(sortColumn, a, b));
        }
        else {
            return rows.sort((a, b) => this.compareColumnValues(sortColumn, b, a));
        }
    }

    compareColumnValues(column, row1, row2) {
        const value1 = column.getSortValue(row1);
        const value2 = column.getSortValue(row2);
        if (value1 > value2) {
            return 1;
        }
        if (value2 > value1) {
            return -1;
        }
        return 0;
    }

    setSortColumn(index) {
        if (this.sortByIndex == index) {
            this.columns[index].SortDirection = this.columns[index].SortDirection === SortDirection.Ascending ? SortDirection.Descending : SortDirection.Ascending;
        } 
        this.sortByIndex = index;
        this.draw();
    }
}

function drawResults(element, leagueName, eventId) {
    const client = new HttpClient();
    let endpoint = leagueName + "/Events/" + eventId + "/Results";
    if (typeof eventId === 'string' && eventId.toLowerCase() == "latest")
    {
        endpoint = leagueName + "/Results/Latest";
    }
    client.fetchData(endpoint)
        .then(data => {
            const tab = data[0];
            const sessionResults = tab.sessionResults.reverse();
            drawResultsHeading(element, data);
            for (result of sessionResults)
            {
                result.sof = tab.strengthOfField;
                parseTimes(result);
                addSessionResult(element, result);
            }
        })
}

function isElement(element) {
    return element instanceof Element || element instanceof HTMLDocument;  
}

function drawResultsHeading(element, data)
{
    if (data.length === 0)
    {
        return;
    }
    let h3 = document.createElement("h3");
    h3.className = "m-2"
    let eventData = data[0];
    let date = new Date(eventData.date);
    let headingText = 
        date.toLocaleDateString() + " - " + eventData.eventName + ": " 
        + eventData.trackName + (eventData.configName != "-" ? " - " + eventData.configName : "");
    h3.appendChild(document.createTextNode(headingText));
    element.appendChild(h3);
}

function createHeaderCell(column) {
    let th = document.createElement("th");
    th.appendChild(document.createTextNode(column.heading));
    th.className = "table-header " + column.SortDirection;
    return th;
}

function createTextCell(column, row) {
    let td = document.createElement("td");
    value = column.getValue(row);
    if (isElement(value)) {
        td.appendChild(value);
    } else {
        td.appendChild(document.createTextNode(value));
    }
    if (column.getStyle != undefined) {
        td.style = column.getStyle(row);
    }
    return td;
}

function parseTimeString(timeString) {
    let parts = timeString.split(':');
    let hours = parseInt(parts[0]);
    let minutes = parseInt(parts[1]);
    parts = parts[2].split('.');
    let seconds = parseInt(parts[0]);
    let milliseconds = parseInt(parts[1]);
    return {
        hours,
        minutes,
        seconds,
        milliseconds,
        totalSeconds: (milliseconds * 0.001) + seconds + (minutes * 60) + (hours * 3600)
    };
}

function parseTimes(result) {
    let rows = result.resultRows;
    for (let row of rows) {
        row.qualifyingTime = parseTimeString(row.qualifyingTime);
        row.fastestLapTime = parseTimeString(row.fastestLapTime);
        row.avgLapTime = parseTimeString(row.avgLapTime);
        row.interval.time = parseTimeString(row.interval.time);
    }
    return result;
}

function formatTime(time) {
    return (time.hours ? time.hours.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) + ":" : "") + 
        time.minutes.toLocaleString('en-US', {minimumIntegerDigits: 1, useGrouping:false}) + ":" + 
        time.seconds.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) + "." + 
        time.milliseconds.toLocaleString('en-US', {minimumIntegerDigits: 3, maximumSignificantDigits: 3, useGrouping:false});
}

function formatInterval(interval) {
    if (interval.laps > 0)
    {
        return "+" + interval.laps + " Laps";
    }
    return "+" + formatTime(interval.time);
}

function formatTeam(row) {
    let label = document.createElement("label");
    label.appendChild(document.createTextNode(row.teamName));
    label.style = "color: " + row.teamColor;
    return label;
}

function formatChange(value, change) {
    let node = document.createElement("div");
    
    let valueNode = document.createElement("span");
    node.appendChild(valueNode);
    valueNode.appendChild(document.createTextNode(value));
    valueNode.className = "d-inline-block pe-1";
    valueNode.style = "min-width: 1em;";
    
    const changeClass = change > 0 ? "positive" : change < 0 ? "negative" : "equal";
    let changeNode = document.createElement("span");
    node.appendChild(changeNode);
    changeNode.className = "d-inline-block pos-change " + changeClass;
    changeNode.appendChild(document.createTextNode(change));

    return node;
}

function isFastestLap(rows, currentRow, timeSelector) {
    const rowValue = timeSelector(currentRow).totalSeconds;
    const values = rows
        .map(x => timeSelector(x).totalSeconds)
        .filter(x => x > 0);
    const minValue = Math.min(...values);
    return minValue == rowValue;
}

function addSessionResult(element, result) {
    const name = result.sessionName;

    console.log(result);
    let card = document.createElement("div");
    element.appendChild(card);
    card.className = "card m-2";
    let cardHeader = document.createElement("div");
    card.appendChild(cardHeader);
    cardHeader.className = "card-header";
    cardHeader.innerHTML = name;
    let cardBody = document.createElement("div");
    card.appendChild(cardBody);
    cardBody.className = "card-body overflow-auto p-1";

    var table = new ResultsTable(cardBody);
    table.setResult(result);
    table.draw();
}