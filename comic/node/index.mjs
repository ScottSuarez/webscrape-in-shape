import {JSDOM} from "jsdom"
import fetch from "node-fetch"
import path from "path"
import fs from "fs"

const DIR = path.join(process.env.HOME, "Documents", "/comics/sandman/chapter-01")

async function downloadFile(url, dest) {
  const resp = await fetch(url)
  const stream = fs.createWriteStream(dest)
  resp.body.pipe(stream)
}

async function downloadChapter(url) {
    var resp = await fetch(url)
    var text = await resp.text()
    // console.log(JSON.stringify(text))
    var {window} = await new JSDOM(text);
    var images = window.document.querySelectorAll(".chapter-main>.chapter-container>img")
    images = [... images] // querySelectorAll are host objects and don't implement all array method
    var imagesDLCalls = images.map(async(image, pageNumber) => {
        var imageUrl = image.getAttribute("src")
        var pageNumberReadable = String(pageNumber).padStart(2,"0")
        await downloadFile(imageUrl, path.join(DIR,"page-" + pageNumberReadable + "." + imageUrl.split(".").pop()))
    });
    await Promise.all(imagesDLCalls)
}
console.log('hi')
await fs.promises.mkdir(DIR, {recursive:true })
await downloadChapter("https://www.comicextra.com/the-sandman-1989/chapter-1/full")
