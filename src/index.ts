import Viewer from "viewerjs";
import $ from "jquery";
import { ContextMenu } from "jquery-contextmenu";
import m from "mithril";
import "bootstrap";

import "viewerjs/dist/viewer.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "jquery-contextmenu/dist/jquery.contextMenu.min.css";
import "./renderer/index.css";

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

m.mount(document.getElementById("App") as HTMLDivElement, () => {
    let currentTab: "gross" | "micro" | "browse" = "gross";
    let fetchUrl = "/img/random?path=gross";
    let gallery: Viewer | null = null;

    function doFetch(vnode: any) {
        fetch(fetchUrl)
        .then((r) => r.json()).then((r) => {
            const $mainArea = $("#gallery", vnode.dom);
            $mainArea.html("");

            r.forEach((el: any) => {
                if (typeof el === "string") {
                    const $img = $(`
                    <div class="thumbnail-wrapper">
                        <img class="thumbnail captioned" src="./folder.svg">
                        <div class="caption">${/([^/]+)$/.exec(el)![1]}</div>
                    </div>`);
                    $img.click(() => {
                        fetchUrl = `/img?path=${encodeURIComponent(el)}`;
                        m.redraw();
                    });

                    $mainArea.append($img);
                } else {
                    urlToId[el.url] = el._id;
                    console.log(el);

                    const $img = $(`
                    <div class="thumbnail-wrapper">
                        <img class="thumbnail uncaptioned" src="${el.url}" alt="${
                            (el.note || "").replace(/!\[.*\]\(.*\)/g, "").trim()
                            || /([^/]+)$/.exec(el.url)![1]}">
                    </div>`);
                    $mainArea.append($img);
                }
            });

            if (gallery) {
                gallery.destroy();
            }

            gallery = new Viewer($mainArea.get(0), {
                className: "gallery",
                filter(img: HTMLImageElement) {
                    return !/\.svg$/.test(img.src);
                }
            });
        });
    }

    return {
        oncreate(vnode) {
            doFetch(vnode);
        },
        view() {
            return m("div", [
                m("ul.nav.justify-content-center", [
                    m("li.nav-item", [
                        m(`a.nav-link[href=#]${currentTab === "gross" ? ".active" : ""}`, {
                            onclick() {
                                currentTab = "gross";
                                fetchUrl = "/img/random?path=gross";
                            }
                        }, "Gross")
                    ]),
                    m("li.nav-item", [
                        m(`a.nav-link[href=#]${currentTab === "micro" ? ".active" : ""}`, {
                            onclick() {
                                currentTab = "micro";
                                fetchUrl = "/img/random";
                            }
                        }, "Micro")
                    ]),
                    m("li.nav-item", [
                        m(`a.nav-link[href=#]${currentTab === "browse" ? ".active" : ""}`, {
                            onclick() {
                                currentTab = "browse";
                                fetchUrl = "/img";
                            }
                        }, "Browse")
                    ])
                ]),
                m("#gallery")
            ]);
        },
        onupdate(vnode) {
            doFetch(vnode);
        }
    };
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
