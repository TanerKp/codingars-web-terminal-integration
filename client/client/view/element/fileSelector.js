export function fileSelectorViewElement() {
    let fileSelector = document.createElement("ul");
    fileSelector.classList.add('coding-ars-file-bar')
    let fileEntries = [];
    fileSelector.controller = {
        activate: (i) => {
            fileEntries[i].controller.activate();
        },
        add: (name, clickCallback) => {
            let fileEntry = document.createElement("li");
            fileEntry.textContent = name;
            fileSelector.appendChild(fileEntry);
            let activate = () => fileEntry.classList.add('active');
            let deactivate = () => fileEntry.classList.remove('active');
            fileEntries.push(fileEntry);
            fileEntry.controller = {activate, deactivate};
            
            fileEntry.addEventListener('click', () => {
                fileEntries.forEach(el => el.controller.deactivate());
                clickCallback(activate);
            })
        }
    }
    return fileSelector;
}