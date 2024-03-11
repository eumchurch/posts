const fs = require("fs");
const path = require("path");
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const baseurl = 'https://www.googleapis.com/youtube/v3/playlistItems';
const PLAYLIST_ID_SERMON = "PLzCVCPy03Qq1ySW_mrIsXdrrDw35NBRyE";
const PLAYLIST_ID_QT = "PLzCVCPy03Qq2itb1HzvL5CV-TwTCRfFRA";
const TIMEZONE_OFFSET = 1000 * 60 * 60 * 17;
const A_DAY_OFFSET = 1000 * 60 * 60 * 24;

function convertPostDate(publishedAt, needsSunday) {
  let publishedDate = new Date(publishedAt);
  let publishedKST = new Date(publishedDate.getTime() + TIMEZONE_OFFSET);
  if (needsSunday) {
    publishedKST = new Date(publishedKST.getTime() - publishedKST.getDay() * A_DAY_OFFSET);
  }
  
  let year = publishedKST.getFullYear();
  let month = publishedKST.getMonth() + 1;
  if (month < 10) {
      month = "0" + month;
  }
  let date = publishedKST.getDate();
  if (date < 10) {
      date = "0" + date;
  }
  return year + "-" + month + "-" + date;
}

function createFile(date, title, subtitle, category, youtube, contents) {

  const fm = `---
layout: post
date: ${date}
title: "${title}"
category: "${category}"
subtitle: "${subtitle}"
youtube: "${youtube}"
---

<div class="youtube margin-large">
    <iframe src="https://www.youtube.com/embed/${youtube}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>

`;

  fs.writeFile(path.join("_posts/" + category, date + "-" + category + ".md"), fm + contents, (err) => {
    if (err) {
      console.log(err);
    }
  });
}

async function callApi(playlistId, callBack) {

  const params = {
      key: GOOGLE_API_KEY,
      playlistId: playlistId,
      maxResults: 20,
      part: "snippet"
  };
  const queryString = new URLSearchParams(params).toString();  // url에 쓰기 적합한 querySting으로 return 해준다. 
  const requrl = `${baseurl}?${queryString}`; 

  const res = await fetch(requrl);
  const data = await res.json();

  let items = data?.["items"];

  callBack(items);
}

function getSermons() {
  // 주일설교
  let category = "sermon"
  fs.mkdirSync("_posts/" + category, { recursive: true });

  let items = callApi(PLAYLIST_ID_SERMON, function(items) {
    if (items) {
      for (const item of items) {
        let snippet = item?.["snippet"];
        if (snippet) {
          
          let date = "";
          let title = "";
          let subtitle = "";
          let description = snippet?.["description"];
          let publishedAt = snippet?.["publishedAt"];
          let youtube = snippet?.["resourceId"]?.["videoId"];

          if (publishedAt) {
            date = convertPostDate(publishedAt, true);
          } else {
            throw new Error("An error occured parsing date: " + publishedAt);
          }

          let array = description.split("\n\n");
          if (array.length == 3) {
            title = array[1];
            subtitle = array[0];
            description = array[2].replaceAll("\n", "\n\n");

          } else {
            throw new Error("An error occured parsing youtube description.\n" + description);
          }

          createFile(date, title, subtitle, category, youtube, description);
        }
      }
    }
  });
}

function getQts() {
  // 주일설교
  let category = "qt"
  fs.mkdirSync("_posts/" + category, { recursive: true });

  let items = callApi(PLAYLIST_ID_QT, function(items) {
    if (items) {
      for (const item of items) {
        let snippet = item?.["snippet"];
        if (snippet) {
          
          let date = "";
          let title = snippet?.["title"];
          let publishedAt = snippet?.["publishedAt"];
          let youtube = snippet?.["resourceId"]?.["videoId"];
          
          if (publishedAt) {
            date = convertPostDate(publishedAt, false);
          } else {
            throw new Error("An error occured parsing date: " + publishedAt);
          }
          
          let array = title.split("(");
          if (array.length == 2) {
            array = array[1].split(")");
            if (array.length >= 1) {
              title = array[0];
            } else {
              throw new Error("An error occured parsing youtube title.");
            }

          } else {
            throw new Error("An error occured parsing youtube title.");
          }

          createFile(date, title, "", category, youtube, "");
        }
      }
    }
  });
}

getSermons();
getQts();
