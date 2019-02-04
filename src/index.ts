import Viewer from "viewerjs";
import $ from "jquery";
import { ContextMenu } from "jquery-contextmenu";
import url from "url";

import "viewerjs/dist/viewer.css";
import "jquery-contextmenu/dist/jquery.contextMenu.min.css";
import "./index.css";

interface IUrlToId {
    [key: string]: string;
}

const urlToId = {} as IUrlToId;
const contextmenu = new ContextMenu();
contextmenu.create({
    selector: "img",
    items: {
        url: {
            name: "Copy URL",
            callback(e: any, key: any, current: any) {
                const imageUrl = new URL(
                    `img?_id=${urlToId[current.$trigger.attr("src")]}`,
                    location.origin
                ).href;

                copyTextToClipboard(imageUrl);
            }
        }
    }
});

const path = url.parse(location.href, true).query.path;
let fetchUrl: string;
if (path) {
    fetchUrl = `/img?path=${encodeURIComponent(path as string)}`;
} else {
    fetchUrl = "/img";
}

fetch(fetchUrl)
.then((r) => r.json()).then((r) => {
    const mainArea = document.getElementById("App") as HTMLDivElement;
    const $mainArea = $(mainArea);
    r.forEach((el: any) => {
        if (typeof el === "string") {
            const $img = $(`
            <div class="thumbnail-wrapper">
                <img class="thumbnail captioned" src="./folder.svg">
                <div class="caption">${/([^/]+)$/.exec(el)![1]}</div>
            </div>`);
            $img.click(() => {
                location.href = `/?path=${encodeURIComponent(el)}`;
            });

            $mainArea.append($img);
        } else {
            urlToId[el.url] = el._id;

            const $img = $(`
            <div class="thumbnail-wrapper">
                <img class="thumbnail uncaptioned" src="${el.url}" alt="${/([^/]+)$/.exec(el.path)![1]}">
            </div>`);
            $mainArea.append($img);
        }
    });

    const gallery = new Viewer(mainArea, {
        className: "gallery",
        filter(img: HTMLImageElement) {
            return !/\.svg$/.test(img.src);
        }
    });
});

function copyTextToClipboard(text: string) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand("copy");
    } catch (err) {
        console.error("Fallback: Oops, unable to copy", err);
    }

    document.body.removeChild(textArea);
}
