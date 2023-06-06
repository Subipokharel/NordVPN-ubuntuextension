###################################################################################
###### This script downloads the country flags from https://flagcdn.com.    #######
## Also runs [nordvpn countries] to get which country flags it needs to download ##
###################################################################################

import requests, json, os, subprocess

# Icons are downloaded to below file
folder_name = "./icons/country/"

# Create Folder
if not (os.path.exists(folder_name)):
    print("Create Folder")
    os.makedirs(folder_name)

# Run command to return a list of contries
def getCountries():
    try:
        cmdCountries = ['nordvpn', 'countries']
        proc = subprocess.Popen( cmdCountries, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        outCountry, err = proc.communicate(timeout=15)
    except:
        print("Error Getting countries")
    outCountry = ' '.join((outCountry.decode("utf-8").strip("\r-\r  \r\r-\r  \r")).split()).split(" ")
    outCountry.sort()
    return outCountry

# Request JSON for country and country code. Ex - {"Albania" : "al"}...
def country_codes():
    response = requests.get("https://flagcdn.com/en/codes.json")
    if response.status_code == 200:
        json_return = json.loads(response.text)
    return json_return

# Request to download country flags
def download_flags(country_code_list):
    try:
        for key, country_code in country_code_list.items():
            url = f"https://flagcdn.com/{country_code}.svg"
            response = requests.get(url)
            if response.status_code == 200:
                new_file = key.replace(" ","_").lower()
                file_name = f"{folder_name}{new_file}.svg"
                with open(file_name, "wb") as file:
                    file.write(response.content)
            else:
                print("ERROR : Failed to get -> " + url)
    except Exception as e:
        print(e)

# Rename files
def rename_file():
    list_of_files = {"czechia":"czech_republic"}
    for key, value in list_of_files.items():
        file_to_rename = f"{folder_name}{key}.svg"
        if os.path.exists(file_to_rename):
            print(f"File exists. Rename from {folder_name}{key}.svg -> {folder_name}{value}.svg")
            os.rename(f"{folder_name}{key}.svg", f"{folder_name}{value}.svg")
        else:
            print(f"{file_to_rename} not found.")

def main():
    country_names = getCountries()
    # Get countries and their countrycode
    get_list = country_codes()
    # Add countries to a dictionary
    new_dict = {}
    for country_name in country_names:
        try:
            country_name = country_name.replace("_"," ")
            for key, value in get_list.items():
                if(value.lower() == country_name.lower()):
                    new_dict[value]=key
                    break
        except Exception as err:
            print(f"ERROR: {err}")
    # Call function to download the flag
    download_flags(new_dict)
    # Rename files that are not standard - Ex: Czechia to czech_republic
    rename_file()

if __name__== "__main__":
    main()