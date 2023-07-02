var HttpClient = function() {
    this.baseUrl = "https://irleaguemanager.net/api/";
    // this.baseUrl = "http://localhost:5000/";
    this.get = function (aUrl, aCallback) {
        var anHttpRequest = new XMLHttpRequest();
        anHttpRequest.onreadystatechange = function () {
            if (anHttpRequest.readyState == 4)
                aCallback(anHttpRequest.status, anHttpRequest.statusText, anHttpRequest.responseText);
        };

        anHttpRequest.open("GET", aUrl, true);
        anHttpRequest.send(null);
    };

    this.fetchData = async function(endpoint) {
        var url = this.baseUrl + endpoint;
        return await new Promise(resolve => {
            this.get(url, (status, statusText, text) => {
                if (status != 200 && status != 201)
                {
                    console.warn("Failed to fetch result data from iRLeagueApi: " + status + " " + statusText + " " + text);
                    return;
                }
                let data = JSON.parse(text);
                resolve((status, data));
            })
        })
    }
}