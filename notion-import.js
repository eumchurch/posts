const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const moment = require("moment");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

function escapeCodeBlock(body) {
  const regex = /```([\s\S]*?)```/g
  return body.replace(regex, function(match, htmlBlock) {
    return "{% raw %}\n```" + htmlBlock + "```\n{% endraw %}"
  })
}

function saveImage(ftitle, index, url) {
  const dirname = path.join("images", ftitle);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
  const filename = path.join(dirname, `${index}.png`);
  axios({
    method: "get",
    url: url,
    responseType: "stream",
    })
    .then(function (response) {
      let file = fs.createWriteStream(`${filename}`);
      response.data.pipe(file);
    })
    .catch(function (error) {
      console.log(error);
    });

  return filename;
}

// passing notion client to the option
const n2m = new NotionToMarkdown({ notionClient: notion });

(async () => {
  // ensure directory exists
  fs.mkdirSync("images", { recursive: true });
  fs.mkdirSync("_posts/ministry", { recursive: true });
  fs.mkdirSync("_posts/bulletin", { recursive: true });
  fs.mkdirSync("_posts/introduction", { recursive: true });

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
    let psubtitle = r.properties?.["subtitle"]?.["rich_text"];
    if (psubtitle?.length > 0) {
      subtitle = psubtitle[0]?.["plain_text"];
    }
    // endpoint
    let endpoint = title;
    let pendpoint = r.properties?.["endpoint"]?.["rich_text"];
    if (pendpoint?.length > 0) {
      endpoint = pendpoint[0]?.["plain_text"];
    }
    // author
    let author = "";
    let pauthor = r.properties?.["author"]?.["rich_text"];
    if (pauthor?.length > 0) {
      author = pauthor[0]?.["plain_text"];
    }
    // tags
    let tags = [];
    let ptags = r.properties?.["tags"]?.["multi_select"];
    if (ptags) {
      for (const t of ptags) {
        tags.push(t?.["name"]);
      }
    }
    // categories
    let cat = "";
    let pcats = r.properties?.["category"]?.["select"];
    if (pcats) {
      cat = pcats?.["name"];
    }

    const ftitle = `${date}-${endpoint.replaceAll(" ", "-")}`;

    // thumbnail
    let thumbnail = "";
    let pthumbnail = r.properties?.["thumbnail"]?.["files"][0];
    if (pthumbnail) {
      let url = pthumbnail?.["file"]?.["url"];
      let filename = "/posts/" + saveImage(ftitle, 0, url);
      thumbnail = filename;
    }

    // frontmatter
    let fmtags = "";
    if (tags.length > 0) {
      fmtags += "\ntags: [";
      for (const t of tags) {
        fmtags += t + ", ";
      }
      fmtags += "]";
    }

    let fm = `---
layout: post
date: ${date}
title: "${title}"${fmtags}
category: "${cat}"`;

    if (subtitle.length > 0) fm = fm + `
subtitle: "${subtitle}"`;
    if (author.length > 0) fm = fm + `
author: "${author}"`;
    if (thumbnail.length > 0) fm = fm + `
thumbnail: "${thumbnail}"`;
    
    fm = fm + `
---
`;

    
    
    const mdblocks = await n2m.pageToMarkdown(id);
    let md = n2m.toMarkdownString(mdblocks)["parent"];
    md = escapeCodeBlock(md);
    
    if (title === "가족 초청 예배") {
      console.log(md);
    }
    
    let index = 1;
    let edited_md = md.replace(
      /!\[(.*?)\]\((.*?)\)/g,
      function (match, p1, p2) {
        let filename = "/posts/" + saveImage(ftitle, index, p2);
        
        if (title === "가족 초청 예배") {
          console.log(match);
          console.log(p1);
          console.log(p2);
        }
        
        index++;

        let caption = "";
        if (p1 === "") res = "";
        else caption = `${p1}`;

        let imgSource = `<img src="${filename}" style="width: 100%">`;
        let captionSource = "";
        if (caption.length > 0) captionSource = `<br/><font class="caption">${caption}</font>`;

        return imgSource + captionSource;
      }
    );

    if (title === "가족 초청 예배") {
      console.log("---");
      console.log(edited_md);
      console.log("---");
    }
    edited_md = edited_md.replace(
      /\[(.*?)\]\(https:\/\/youtu\.be\/(.*?)\)/g,
      function (match, p1, p2) {
        return `<div class="youtube margin-large">
    <iframe src="https://www.youtube.com/embed/${p2}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>`;
      }
    );

    //writing to file
    fs.writeFile(path.join("_posts/" + cat, ftitle + ".md"), fm + edited_md, (err) => {
      if (err) {
        console.log(err);
      }
    });
  }
})();
