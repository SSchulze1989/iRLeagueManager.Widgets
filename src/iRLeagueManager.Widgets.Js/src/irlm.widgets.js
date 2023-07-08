const baseUrl = "https://irleaguemanager.net/api/";

class TableColumn {
    constructor(heading, getValue, getStyle, getSortValue, sortDirection = SortDirection.Ascending) {
        this.heading = heading;
        this.getValue = getValue;
        this.getStyle = getStyle;
        this.getSortValue = getSortValue;
        this.SortDirection = sortDirection;
    }
}

class TableBase {
    constructor(parentElement) {
        this.parent = parentElement;
        this.columns = [];
        this.data = []
        this.sortByIndex = 0;
        this.tableAttributes = {
            className: "table table-sm table-striped table-hover",
            style: "font-size: 0.9rem; line-height: 1rem"
        }
    }

    draw() {
        const sortedRows = this.sortByColumn(this.data);

        this.parent.innerHTML = '';
        let table = document.createElement("table");
        table.className = this.tableAttributes.className;
        table.style = this.tableAttributes.style;
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
        for (const [rowIndex, row] of sortedRows.entries()) {
            let tr = document.createElement("tr");
            tBody.appendChild(tr);
            for (const column of this.columns) {
                tr.appendChild(createTextCell(column, row, rowIndex));
            }
        }
    }

    addColumn(heading, content, sortValue = undefined, sortDirection = SortDirection.Ascending, style = undefined) {
        this.columns = this.columns.concat([new TableColumn(heading, content, style, sortValue, sortDirection)]);
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

const SortDirection = {
    Ascending: "sort-ascending",
    Descending: "sort-descending"
}

class ResultsTable extends TableBase {
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
}

class StandingTable extends TableBase {
    setStanding(standing)
    {
        this.data = standing.standingRows;

        const isTeamStanding = standing.isTeamStanding;

        this.columns = [];
        this.addColumn("Pos", x => formatChange(x.position + ".", x.positionChange), x => parseInt(x.position));
        this.addColumn("Driver", x => `${x.firstname} ${x.lastname}`, x => `${x.firstname} ${x.lastname}`);
        this.addColumn("Team", x => formatTeam(x), x => x.teamName);
        this.addColumn("Race Pts.", x => formatChange(x.racePoints, x.racePointsChange), x => parseInt(x.racePoints), SortDirection.Descending);
        this.addColumn("Penalty", x => formatChange(formatPenalty(-x.penaltyPoints), -x.penaltyPointsChange), x => -parseInt(x.penaltyPoints), SortDirection.Descending);
        this.addColumn("Total Pts.", x => formatChange(x.totalPoints, x.totalPointsChange), x => x.totalPoints, SortDirection.Descending);
        this.addColumn("Races", x => x.racesCounted + (x.races > x.racesCounted ? ` (${x.races})` : ''), x => x.racesCounted, SortDirection.Descending);
        this.addColumn("Poles", x => formatChange(x.polePositions, x.polePositionsChange), x => x.polePositions, SortDirection.Descending);
        this.addColumn("Wins", x => formatChange(x.wins, x.winsChange), x => x.wins, SortDirection.Descending);
        this.addColumn("Podiums", x => x.top3, x => x.top3, SortDirection.Descending);
        this.addColumn("Incidents", x => x.incidents, x => x.incidents);
    }
}

class ScheduleTable extends TableBase {
    constructor(parentElement) {
        super(parentElement);
        let overrideAttributes = {
            style: ""
        }
        this.tableAttributes = { ...this.tableAttributes, ...overrideAttributes };
    }

    setSchedule(events) {
        this.data = events;

        const displayLaps = this.data
            .map(getEventLaps)
            .some(laps => laps > 0);
        const displayPractice = this.data
            .map(x => getPracticeSession(x.sessions))
            .some(practice => practice != null);
        const displayQualy = this.data
            .map(x => getQualySession(x.sessions))
            .some(qualy => qualy != null);
        const racesCount = Math.max(...this.data
            .map(x => getRaceSessions(x.sessions).length));

        this.addColumn("Nr.", (x, i) => `${i + 1}.`);
        this.addColumn("Date", x => formatDate(x.date));
        this.addColumn("Name", x => x.name);
        this.addColumn("Track", x => x.trackName + (x.configName != '-' ? ` - ${x.configName}` : ''));
        if (displayLaps)
        {
            this.addColumn("Laps", x => getEventLaps(x));
        }
        this.addColumn("Start", x => formatTimeOfDay(x.date));
        if (displayPractice)
        {
            this.addColumn("Practice", x => formatSessionLength(getPracticeSession(x.sessions)));
        }
        if (displayQualy)
        {
            this.addColumn("Qualy", x => formatSessionLength(getQualySession(x.sessions)));
        }
        for (let i = 0; i < racesCount; i++)
        {
            let columName = racesCount > 1 ? `Race ${i+1}` : 'Race';
            this.addColumn(columName, x => formatSessionLength(getRaceSessions(x.sessions)[i]))
        }
    }
}

async function drawResults(element, leagueName, eventId, options = null) {
    var defaults = {
        championshipIndex: -1,
        displayEventName: true,
        displaySessionNames: "auto",
    };
    options = { ...defaults, ...options };
    let endpoint = leagueName + "/Events/" + eventId + "/Results";
    if (typeof eventId === 'string' && eventId.toLowerCase() == "latest")
    {
        endpoint = leagueName + "/Results/Latest";
    }
    let data = await fetch(baseUrl + endpoint)
        .then(response => response.json());
    if (data.length == 0)
    {
        return;
    }
    if (options.displayEventName)
    {
        drawEventHeading(element, data[0]);
    }
    let displayTabs = data;
    if (options.championshipIndex != -1)
    {
        displayTabs = data.slice(options.championshipIndex, options.championshipIndex + 1);
    }
    for (tab of displayTabs)
    {
        const sessionResults = tab.sessionResults.reverse();
        drawHeading(element, tab.displayName);
        showSessionName = options.displaySessionNames == "auto" ? sessionResults.length > 1 : options.displaySessionNames;
        for (result of sessionResults)
        {
            result.sof = tab.strengthOfField;
            parseTimes(result);
            addSessionResult(element, result, showSessionName);
        }
    }
}

async function drawStandings(element, leagueName, eventId, options = null) {
    var defaults = {
        championshipIndex: -1
    };
    options = { ...defaults, ...options };
    let endpoint = `${leagueName}/Events/${eventId}/Standings`;
    if (typeof eventId === 'string' && eventId.toLowerCase() == 'latest')
    {
        // get latest result
        let latestResult = await fetch(baseUrl + `${leagueName}/Results/latest`)
            .then(response => response.json());
        if (latestResult.length == 0)
        {
            return;
        }
        let latestEventId = latestResult[0].eventId;
        endpoint = `${leagueName}/Events/${latestEventId}/Standings/`;
    }
    let data = await fetch(baseUrl + endpoint)
        .then(response => response.json());
    if (data.length == 0)
    {
        return;
    }
    let displayTabs = data;
    if (options.championshipIndex != -1)
    {
        displayTabs = data.slice(options.championshipIndex, options.championshipIndex + 1);
    }
    for (tab of displayTabs)
    {
        drawHeading(element, tab.name);
        addStanding(element, tab);
    }
}

async function drawSchedule(element, leagueName, seasonId, options = null) {
    let defaults = { };
    options = { ...defaults, ...options };
    let endpoint = `${leagueName}/Seasons/${seasonId}`;
    let season = await fetch(baseUrl + endpoint)
        .then(response => response.json());
    endpoint = `${leagueName}/Seasons/${season.seasonId}/Events`;
    let data = await fetch(baseUrl + endpoint)
        .then(response => response.json());
    addSchedule(element, data);
}

function isElement(element) {
    return element instanceof Element || element instanceof HTMLDocument;  
}

function drawEventHeading(element, data)
{
    let h3 = document.createElement("h3");
    h3.className = "m-2"
    let date = formatDate(data.date);
    let headingText = 
        date + " - " + data.eventName + ": " 
        + data.trackName + (data.configName != "-" ? " - " + data.configName : "");
    h3.appendChild(document.createTextNode(headingText));
    element.appendChild(h3);
}

function drawHeading(element, text)
{
    let h5 = document.createElement("h5");
    h5.className = "m-2 mb-0";
    h5.appendChild(document.createTextNode(text));
    element.appendChild(h5);
}

function createHeaderCell(column) {
    let th = document.createElement("th");
    th.appendChild(document.createTextNode(column.heading));
    th.className = "table-header " + column.SortDirection;
    return th;
}

function createTextCell(column, row, rowIndex) {
    let td = document.createElement("td");
    value = column.getValue(row, rowIndex);
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

function formatDate(dateString) {
    let date = new Date(dateString);
    return date.toLocaleDateString();
}

function formatTimeOfDay(dateTimeString) {
    let date = new Date(dateTimeString);
    return date.toLocaleTimeString();
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

function formatPenalty(value) {
    let node = document.createElement('label');
    const valueClass = value < 0 ? "negative" : "";
    node.className = valueClass;
    node.appendChild(document.createTextNode(value));
    return node;
}

function formatChange(value, change) {
    let node = document.createElement("div");
    
    if (isElement(value) == false)
    {
        value = document.createTextNode(value);
    }
    let valueNode = document.createElement("span");
    valueNode.appendChild(value);
    valueNode.className = "d-inline-block pe-1";
    valueNode.style = "min-width: 1em;";
    node.appendChild(valueNode);
    
    const changeClass = change > 0 ? "positive" : change < 0 ? "negative" : "equal";
    let changeNode = document.createElement("span");
    node.appendChild(changeNode);
    changeNode.className = "d-inline-block pos-change " + changeClass;
    changeNode.appendChild(document.createTextNode(change));

    return node;
}

function formatSessionLength(session)
{
    if (session === undefined)
    {
        return '';
    }
    length = []
    var duration = parseTimeString(session.duration);
    if (duration.totalSeconds > 0)
    {
        length.push(`${duration.hours.toString().padStart(2, '0')}:${duration.minutes.toString().padStart(2, '0')}`);
    }
    if (session.laps > 0)
    {
        length.push(`${session.laps} laps`);
    }
    return length.join(' / ');
}

function isFastestLap(rows, currentRow, timeSelector) {
    const rowValue = timeSelector(currentRow).totalSeconds;
    const values = rows
        .map(x => timeSelector(x).totalSeconds)
        .filter(x => x > 0);
    const minValue = Math.min(...values);
    return minValue == rowValue;
}

function getQualySession(sessions)
{
    let qualySessions = sessions.filter(x => x.sessionType == "Qualifying");
    if (qualySessions.length == 0)
    {
        return null;
    }
    return qualySessions[qualySessions.length-1];
}

function getPracticeSession(sessions)
{
    let qualySessions = sessions.filter(x => x.sessionType == "Practice");
    if (qualySessions.length == 0)
    {
        return null;
    }
    return qualySessions[qualySessions.length-1];
}

function getRaceSessions(sessions)
{
    return sessions.filter(x => x.sessionType == "Race");
}

function getEventLaps(event)
{
    let sessions = event.sessions;
    if (sessions.length == 0)
    {
        return 0;
    }
    let raceSessions = getRaceSessions(sessions);
    if (raceSessions.length > 0)
    {
        return raceSessions[raceSessions.length-1].laps;
    }
    let qualySession = getQualySession(sessions);
    if (qualySession != null)
    {
        return qualySession.laps;
    }
    return sessions[sessions.length-1].laps;
}

function addSessionResult(element, result, showSessionName) {
    const name = result.sessionName;

    console.log(result);
    let card = document.createElement("div");
    element.appendChild(card);
    card.className = "card m-2";
    if (showSessionName)
    {
        let cardHeader = document.createElement("div");
        card.appendChild(cardHeader);
        cardHeader.className = "card-header";
        cardHeader.innerHTML = name;
    }
    let cardBody = document.createElement("div");
    card.appendChild(cardBody);
    cardBody.className = "card-body overflow-auto p-1";

    var table = new ResultsTable(cardBody);
    table.setResult(result);
    table.draw();
}

function addStanding(element, standing) {
    let card = document.createElement("div");
    element.appendChild(card);
    card.className = "card m-2";
    let cardBody = document.createElement("div");
    card.appendChild(cardBody);
    cardBody.className = "card-body overflow-auto p-1";

    var table = new StandingTable(cardBody);
    table.setStanding(standing);
    table.draw();
}

function addSchedule(element, events) {
    let card = document.createElement("div");
    element.appendChild(card);
    card.className = "card m-2";
    let cardBody = document.createElement("div");
    card.appendChild(cardBody);
    cardBody.className = "card-body overflow-auto p-1";

    var table = new ScheduleTable(cardBody);
    table.setSchedule(events);
    table.draw();
}