import {JSDOM} from "jsdom"
import fetch from "node-fetch"
import path from "path"
import fs from "fs"

const DIR = path.join(process.env.HOME, "Documents", "/comics/y-the-last-man/")

async function downloadFile(url, dest) {
  let resp
  try{
    resp = await fetch(url)
  } catch {
    throw console.error("unable to download - " + dest);
  }
  var contentType = resp.headers.get("content-type")
  if (contentType.indexOf("jpeg") != -1 ) {
    dest += ".jpg"
  } else if (contentType.get("content-type").indexOf("png") != -1 ){
    dest += ".png"
  } else {
    throw "unsupported image type :("
  }
  if (!fs.existsSync(dest)){ 
    await fs.promises.mkdir(dest, {recursive:true })
   }
  const stream = fs.createWriteStream(dest)
  resp.body.pipe(stream)
}

async function downloadChapter(url, dest) {
    var resp = await fetch(url)
    var text = await resp.text()
    var {window} = await new JSDOM(text);
    var images = window.document.querySelectorAll(".chapter-main>.chapter-container>img")
    images = [... images] // querySelectorAll are host objects and don't implement all array method
    for (var i=0; i<images.length; i++){
      let image = images[i]
      let pageNumber = i;
      let imageUrl = image.getAttribute("src")
      let pageNumberReadable = String(pageNumber).padStart(2,"0")
      await downloadFile(imageUrl, path.join(dest,"page-" + pageNumberReadable))
    }
}

async function downloadAllChapters(url) {
    var resp = await fetch(url)
    var text = await resp.text()
    var {window} = await new JSDOM(text);
    var chapters = window.document.querySelectorAll("#asset_1>.full-select >option")
    chapters = [...chapters]
    var regexp = /chapter-(\d*19)/i
    console.log(chapters.length)
    chapters = chapters.filter(chapter => {
        var chapterUrl = chapter.getAttribute("value")
        return regexp.test(chapterUrl)
    })
    for (var i=0; i<chapters.length; i++){
        var chapter = chapters[i]
        var chapterUrl = chapter.getAttribute("value")
        var chapterNumber = regexp.exec(chapterUrl)[1]
        var c = String(chapterNumber).padStart(2,"0")
        await downloadChapter(chapterUrl, path.join(DIR,"chapter-" + c))
        console.log(` ∨ chapter ${c}`)
    }
}

await downloadAllChapters("https://www.comicextra.com/y-the-last-man-2002/chapter-60/full")
