const puppeteer = require("puppeteer");
const { Pool, Client } = require("pg");
require('dotenv').config();

const URL = "https://gdqvods.com/event/agdq-2021";
console.log(URL);

const fetchIt = async () => {
  try {
    const client = new Client({
      user: process.env.PGUSER,
      host: 'localhost',
      database: 'postgres',
      password: process.env.PGPASS,
      port: 5432
    })
    client.connect()
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(URL);
    await page.waitForSelector('.table');
    let element = await page.$('.table > tbody');
    
    let allRunsToSQL = await page.evaluate(() => {
      var runs = document.querySelectorAll('tr');
      let runsList = [];
      for (let i = 1; i < runs.length; i++) {
        let runData = runs[i].querySelectorAll('td');
        let runObject = {};
        runObject.marathonName = "Awesome Games Done Quick 2021 Online"
        if (runData[0].querySelector('a')) runObject.vodUrl = "https:" + runData[0].querySelector('a').getAttribute('href');
        else runObject.vodUrl = '';
        runObject.startTime = runData[1].innerText.trim();
        let gameNameAndYear = runData[2].innerText.trim();
        runObject.gameName = gameNameAndYear.substring(0, gameNameAndYear.length - 7);
        runObject.gameName = runObject.gameName.replaceAll("'", "''");
        runObject.gameYear = gameNameAndYear.substring(gameNameAndYear.length - 5, gameNameAndYear.length - 1)
        runObject.gamePlatform = runData[3].innerText.trim();
        runObject.runCategory = runData[4].innerText.trim();
        runObject.runCategory = runObject.runCategory.replaceAll("'", "''");
        runObject.runners = runData[5].innerText.trim();
        runObject.runners = runObject.runners.replaceAll("'", "''");
        runObject.runTime = runData[6].innerText.trim();
        runsList.push(runObject)
      }
      return runsList;
    });
    for (let i = 0; i < allRunsToSQL.length; i++) {
      client.query(`INSERT INTO runs (marathonname, vodurl, gamename, gameyear, gameplatform, runcategory, runners, time) VALUES (
        '${allRunsToSQL[i].marathonName}', 
        '${allRunsToSQL[i].vodUrl}',
        '${allRunsToSQL[i].gameName}',
        '${allRunsToSQL[i].gameYear}',
        '${allRunsToSQL[i].gamePlatform}',
        '${allRunsToSQL[i].runCategory}',
        '${allRunsToSQL[i].runners}',
        '${allRunsToSQL[i].runTime}')`, 
        (err, res) => {
          if (err) console.log(err, i);
          if (i == allRunsToSQL.length - 1) client.end();
        }
      )
    }
    
    await browser.close();
  } catch (err) {
    throw err;
  }
}

fetchIt();