export function loaderViewElement () {
    // <div class="lds-ring"><div></div><div></div><div></div><div></div></div>
    let loader = document.createElement("div");
    loader.classList.add("lds-ring");
    loader.innerHTML = "<div></div><div></div><div></div><div></div>"
    return loader;
}