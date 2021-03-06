/* @Deprecated.
This is the Old Data Manager Module.
This Module is not used anymore. It keeps track of all Available Steam Apps in a List in Memory.
This List needs to be updated regularly using Cron Jobs and hence is resource intensive. This List was used to search for a Game using its name.
The new Data Manager Module searches the Steam Store Directly by a name and hence this list is no longer necessary.
Should the new Data Manager fail, we can fall back to this old one.*/

console.log("A Deprecated Module is being Loaded!");

const steamHandler = require("./steamApiHandler");

//List of All Apps with their names mapped against their appids in Steam Store.
const appData = {
  apps: [],
  available: false,
  updatedOn: "Never",
};

//List of All Supported Currencies by Steam.
const currencyData = {
  currencies: {
    AE: "United Arab Emirates Dirham",
    AR: "Argentine Peso",
    AU: "Australian Dollars",
    BR: "Brazilian Reals",
    CA: "Canadian Dollars",
    CH: "Swiss Francs",
    CL: "Chilean Peso",
    CN: "Chinese Renminbi (yuan)",
    CO: "Colombian Peso",
    CR: "Costa Rican Colón",
    EU: "European Union Euro",
    GB: "United Kingdom Pound",
    HK: "Hong Kong Dollar",
    IL: "Israeli New Shekel",
    ID: "Indonesian Rupiah",
    IN: "Indian Rupee",
    JP: "Japanese Yen",
    KR: "South Korean Won",
    KW: "Kuwaiti Dinar",
    KZ: "Kazakhstani Tenge",
    MX: "Mexican Peso",
    MY: "Malaysian Ringgit",
    NO: "Norwegian Krone",
    NZ: "New Zealand Dollar",
    PE: "Peruvian Sol",
    PH: "Philippine Peso",
    PL: "Polish Złoty",
    QA: "Qatari Riyal",
    RU: "Russian Rouble",
    SA: "Saudi Riyal",
    SG: "Singapore Dollar",
    TH: "Thai Baht",
    TR: "Turkish Lira",
    TW: "New Taiwan Dollar",
    UA: "Ukrainian Hryvnia",
    US: "United States Dollar",
    UY: "Uruguayan Peso",
    VN: "Vietnamese Dong",
    ZA: "South African Rand",
  },
  currencyUserMapping: {},
};

const manager = {
  //Methods to check the List is Available or Not. List becomes Unavailable when it is being Updated.
  getListAvailability: function () {
    return appData.available;
  },

  //Method to fetch Currency Name for a Currency Code.
  getCurrency: function (curr) {
    return currencyData.currencies[curr.toUpperCase()];
  },

  //Method to set the User's current Preferred Currency.
  setUserCurrency: function (userid, curr) {
    currencyData.currencyUserMapping[userid] = curr;
  },

  //Method to fetch the User's current Preferred Currency.
  getUserCurrency: function (userid) {
    return currencyData.currencyUserMapping[userid];
  },

  //Method to fetch all suppoeted Currencies.
  getCurrencyList: function () {
    let list = "",
      i = 1;
    for (curr in currencyData.currencies)
      list +=
        "\n**" +
        i++ +
        "**. " +
        curr +
        ": " +
        currencyData.currencies[curr] +
        ".";
    return list;
  },

  //Method to Update the App List.
  updateList: async function (lastappid, limit) {
    appData.available = false;
    try {
      const appList = await steamHandler.getSteamApplist(500000);
      appData.apps = appList;
      appData.updatedOn = new Date();
    } catch (e) {
      console.log("Error when Updating App List: ", e.message);
    } finally {
      appData.available = true;
      console.log("Total nubmer of Apps", appData.apps.length);
      console.log("Data last Updated on:", appData.updatedOn);
    }
  },

  //Method to format an app's details into a Discord Embed Message.
  formatData: function (data, appid) {
    //Check if Any Data was found for the AppID.
    if (!data[appid] || !data[appid].success) {
      return (
        "No Data Found for AppID: `" +
        appid +
        "`.Consider Searching for the App Id first using `search <Game Name>`."
      );
    }

    let finalData = {},
      actualData = data[appid].data;

    //Set the Color.
    finalData.color = "16777215";

    //Set the Title.
    finalData.title = actualData.name.length > 0 ? actualData.name : "N/A";

    //Set the Description.
    finalData.description = (actualData.detailed_description.length > 0
      ? actualData.detailed_description.substr(0, 2000) + "..."
      : "N/A"
    )
      .replace(/\<.*?>/g, " ")
      .replace(/\n+/g, "\n")
      .replace(/(\r\n)+/g, "\n")
      .replace(/\t+/g, " ")
      .replace(/\s+/g, " ");

    //Set the Image if Available.
    if (actualData.header_image) {
      finalData.image = { url: actualData.header_image };
    }

    //Set the URL to Steam Store.
    finalData.url = "http://store.steampowered.com/app/" + appid;

    //Set the Footer to the Game's Release Date.
    finalData.footer = {
      text:
        "**Release Date** " +
        (actualData.release_date
          ? actualData.release_date.date
            ? actualData.release_date.date
            : "N/A"
          : "N/A"),
    };
    finalData.fields = [];

    //Set the Fields [Devs, Publishers, Metacritic Score, Price Info, Platforms, ]
    finalData.fields.push({
      name: "Developers",
      value: actualData.developers || "N/A",
      inline: true,
    });
    finalData.fields.push({
      name: "Publishers",
      value: actualData.publishers || "N/A",
      inline: true,
    });
    if (actualData.metacritic)
      finalData.fields.push({
        name: "Metacritic Score",
        value: actualData.metacritic.score || "N/A",
        inline: true,
      });
    if (actualData.is_free)
      finalData.fields.push({
        name: "Original Price",
        value: "Free",
        inline: true,
      });
    else if (actualData.price_overview) {
      finalData.fields.push({
        name: "Original Price",
        value: actualData.price_overview.initial_formatted || "N/A",
        inline: true,
      });
      finalData.fields.push({
        name: "Discount",
        value: actualData.price_overview.discount_percent
          ? actualData.price_overview.discount_percent + "%"
          : "N/A",
        inline: true,
      });
      finalData.fields.push({
        name: "Current Price",
        value: actualData.price_overview.final_formatted || "N/A",
        inline: true,
      });
    }
    let platforms = "";
    for (platform in actualData.platforms) {
      if (actualData.platforms[platform]) platforms += ", " + platform;
    }
    finalData.fields.push({
      name: "Platforms",
      value: platforms
        .replace(/, (.)/g, (match) => match.toUpperCase())
        .substring(2),
      inline: true,
    });
    return { embed: finalData };
  },

  //Method to Fetch AppIDs for the searched App Name.
  getApps: function (searchText) {
    let appsFound = appData.apps
      .filter(
        (app) =>
          app.name.length <= 100 &&
          app.name.toLowerCase().includes(searchText.toLowerCase())
      )
      .map(
        (app, index) =>
          "**" +
          (index + 1) +
          "**. " +
          app.name +
          " `App ID: " +
          app.appid +
          "`"
      );
    appsFound = appsFound.join("\n");
    return appsFound.length > 0
      ? appsFound.length >= 2000
        ? "Too Many Matches Found. Plese Try Narrowing down yor Search by Entering a few more letters"
        : "I found these Games:\n" + appsFound
      : "No Apps Found with Text: " + searchText;
  },

  //Method to Get App details from Steam. This data is passed on to <formatData> to form an Embed.
  getAppData: async function (appid, userid, channelid) {
    const currency = this.getUserCurrency(userid, channelid)
      ? this.getUserCurrency(userid, channelid)
      : "US";
    let data;
    try {
      data = await steamHandler.getSteamAppData(appid, currency);
      return this.formatData(data, appid);
    } catch (e) {
      console.log(e);
      return "Steam Did not Send Appropriate Data. Please try Again in a while!";
    }
  },
};

//Update the Applist for the First time.
manager.updateList();

module.exports = manager;
