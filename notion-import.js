const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const moment = require("moment");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
// or
// import {NotionToMarkdown} from "notion-to-md";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

function escapeCodeBlock(body) {
  const regex = /```([\s\S]*?)```/g
  return body.replace(regex, function(match, htmlBlock) {
    return "{% raw %}\n```" + htmlBlock + "```\n{% endraw %}"
  })
}

// passing notion client to the option
const n2m = new NotionToMarkdown({ notionClient: notion });

(async () => {
  // ensure directory exists
  fs.mkdirSync("ministry", { recursive: true });
  fs.mkdirSync("bulletin", { recursive: true });
  fs.mkdirSync("introduction", { recursive: true });
  
  let rootDirectory = "_posts"
  fs.mkdirSync(rootDirectory, { recursive: true });
  fs.mkdirSync(rootDirectory+"/images")

  const databaseId = process.env.DATABASE_ID;
  // TODO has_more
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "공개",
      checkbox: {
        equals: true,
      },
    },
  });
  for (const r of response.results) {
    // console.log(r)
    const id = r.id;
    // date
    let date = moment(r.created_time).format("YYYY-MM-DD");
    let pdate = r.properties?.["date"]?.["date"]?.["start"];
    if (pdate) {
      date = moment(pdate).format("YYYY-MM-DD");
    }
    // title
    let title = id;
    let ptitle = r.properties?.["title"]?.["title"];
    if (ptitle?.length > 0) {
      title = ptitle[0]?.["plain_text"];
    }
    // subtitle
    let subtitle = "";
    let psubtitle = r.properties?.["subtitle"]?.["title"];
    if (psubtitle?.length > 0) {
      subtitle = psubtitle[0]?.["plain_text"];
    }
    // author
    let author = "";
    let pauthor = r.properties?.["author"]?.["rich_text"];
    if (pauthor?.length > 0) {
      author = pauthor[0]?.["plain_text"];
    }
    // tags
    let tags = [];
    let ptags = r.properties?.["tags"];
    if (ptags) {
      tags = [ptags.toString()];
      // for (const t of ptags) {
      //   const n = t?.["name"];
      //   if (n) {
      //     tags.push(n);
      //   }
      // }
    }
    // categories
    let cats = [];
    let pcats = r.properties?.["category"];
    if (pcats) {
      cats = [String(pcats)];
      // for (const t of pcats) {
      //   const n = t?.["name"];
      //   if (n) {
      //     cats.push(n);
      //   }
      // }
    }

    // frontmatter
    let fmtags = "";
    let fmcats = "";
    if (tags.length > 0) {
      fmtags += "\ntags: [";
      for (const t of tags) {
        fmtags += t + ", ";
      }
      fmtags += "]";
    }
    if (cats.length > 0) {
      fmcats += "\ncategories: [";
      for (const t of cats) {
        fmcats += t + ", ";
      }
      fmcats += "]";
    }
    const fm = `---
layout: post
date: ${date}
title: "${title}"${fmtags}${fmcats}
subtitle: "${subtitle}"
author: "${author}"
---

`;
    const mdblocks = await n2m.pageToMarkdown(id);
    let md = n2m.toMarkdownString(mdblocks)["parent"];
    md = escapeCodeBlock(md);

    const ftitle = `${date}-${title.replaceAll(" ", "-")}`;

    let index = 0;
    let edited_md = md.replace(
      /!\[(.*?)\]\((.*?)\)/g,
      function (match, p1, p2, p3) {
        const dirname = path.join(rootDirectory+"/images", ftitle);
        if (!fs.existsSync(dirname)) {
          fs.mkdirSync(dirname, { recursive: true });
        }
        const filename = path.join(dirname, `${index}.png`);

        axios({
          method: "get",
          url: p2,
          responseType: "stream",
        })
          .then(function (response) {
            let file = fs.createWriteStream(`${filename}`);
            response.data.pipe(file);
          })
          .catch(function (error) {
            console.log(error);
          });

        let res;
        if (p1 === "") res = "";
        else res = `_${p1}_`;

        return `![${index++}](/${filename})${res}`;
      }
    );

    //writing to file
    fs.writeFile(path.join(rootDirectory, ftitle+".md"), fm + edited_md, (err) => {
      if (err) {
        console.log(err);
      }
    });
  }
})();