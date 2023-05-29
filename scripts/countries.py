import subprocess, json

def getCountries():
    try:
        cmdCountries = ['nordvpn', 'countries']
        proc = subprocess.Popen( cmdCountries, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        outCountry, err = proc.communicate(timeout=15)
    except:
        print("Error")

    outCountry = ' '.join((outCountry.decode("utf-8").strip("\r-\r  \r\r-\r  \r")).split()).split(" ")
    return outCountry

def getCity(countryName):
    try:
        commandCities = ['nordvpn', 'cities', countryName]
        proc = subprocess.Popen( commandCities, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        outCity, err = proc.communicate(timeout=15)
    except:
        print("Error")
        
    outCity = ' '.join((outCity.decode("utf-8").strip("\r-\r  \r\r-\r  \r")).split()).split(" ")
    return outCity

def saveToJSON(dictionary):
    json_object = json.dumps(dictionary, indent=4)
    # Writing to sample.json
    with open("./scripts/nordvpncountry.json", "w") as outfile:
        outfile.write(json_object)

def main():
    dict = {}
    # Get name of countries
    nameOfCountries = getCountries()
    # Get name of cities
    for country in nameOfCountries:
        cities = getCity(country)
        dict.update({country : cities})
    # Save file as json
    saveToJSON(dict)

if __name__== "__main__":
    main()