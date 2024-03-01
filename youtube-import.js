
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const PLAYLIST_ID_SERMON = "PLzCVCPy03Qq1ySW_mrIsXdrrDw35NBRyE";
const PLAYLIST_ID_QT = "PLzCVCPy03Qq2itb1HzvL5CV-TwTCRfFRA";

const baseurl = 'https://www.googleapis.com/youtube/v3/playlistItems';
const params = {
    key: GOOGLE_API_KEY,
    playlistId: PLAYLIST_ID_SERMON,
    maxResults: 20,
    part: "snippet"
};

const queryString = new URLSearchParams(params).toString();  // url에 쓰기 적합한 querySting으로 return 해준다. 
const requrl = `${baseurl}?${queryString}`;

const getData = async() => {
  const res = await fetch(requrl);
  const data = await res.json();

  let items = data?.["items"];
  if (items) {
    console.log("items ok");
    for (const item of items) {
      let snippet = item?.["snippet"];
      if (snippet) {
        
        let date = "";
        let publishedAt = snippet?.["publishedAt"];
        console.log("publishedAt: ");
        if (publishedAt) {
          let publishedDate = new date(publishedAt);
          console.log("  date: " + publishedDate);
        }
        let videoId = snippet?.["resourceId"]?.["videoId"];
        console.log("  videoId: " + videoId);

        let description = snippet?.["description"];
        let array = description.split("\n\n");
        if (array.length == 3) {
          console.log("  title: " + array[1] + ", subtitle: " + array[0]);

        } else {
          throw new Error("An error occured parsing youtube description.");
        }
      }
    }
  }
};

getData();
